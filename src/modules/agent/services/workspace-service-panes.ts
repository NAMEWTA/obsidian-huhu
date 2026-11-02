import { groupOf, activeTab, closeTab, openTab } from '../core/workspace/ops';
import { paneLeaves, projectPaneIdentities, validPaneId, newPaneId, PaneIdentityError, type PaneIdentity, PaneCommandError, MAX_INDEXED_PANES } from '../core/workspace/pane-identity';
import type { TerminalTabData, WorkspaceState, ResumeInfo } from '../core/workspace/model';
import type { LayoutNode, SplitDirection } from '../core/terminal/layout';
import type { ManagedSessionSummary } from '../core/workspace/managed-runtime';
import type { TerminalSession } from './terminal/session';
import { SpaceError } from '../core/space/errors';
import type { SpaceService } from './spaces/space-service';
import type { WorkspaceStore, WorkspaceLayoutEditContext, WorkspaceLayoutEditResult, WorkspaceLayoutSnapshot } from './workspace-store';
import type { ForegroundIntent } from './launch/foreground-intent';
import { lifecycleClock } from './terminal/clock';

export interface PaneTarget { readonly paneId: string; readonly spaceId?: string; readonly runtimeId?: string }
export interface PaneSessionTarget { readonly spaceId: string; readonly sessionId: string; readonly runtimeId?: string }
export interface PaneOperationContext extends WorkspaceLayoutEditContext { readonly intent?: ForegroundIntent }
export interface PaneDescriptor extends PaneIdentity {
	readonly sessionId?: string;
	readonly runtimeId?: string;
	readonly groupId?: string;
	readonly title: string;
	readonly state: string;
	readonly selected: boolean;
	/** Layout selection only; actual terminal input focus requires the separate consumed receipt. */
	readonly focused: boolean;
}
export interface CapturedPane extends PaneDescriptor {
	readonly paneId: string;
	readonly spaceId: string;
	readonly sessionId: string;
	readonly sessionRuntimeId?: string;
}
export interface PaneListing { readonly revision: number; readonly panes: readonly PaneDescriptor[] }
export interface PaneOperationResult extends WorkspaceLayoutEditResult {
	readonly pane?: PaneDescriptor;
	readonly insertedPane?: PaneDescriptor;
	readonly focused?: boolean;
	readonly focusRequestId?: number;
}
export { PaneCommandError } from '../core/workspace/pane-identity';
export interface PaneWorkspacePort {
	readonly persistence: WorkspaceStore;
	readonly spaces?: SpaceService;
	summary(target: { spaceId: string; sessionId: string }): ManagedSessionSummary | undefined;
	session(runtimeId: string): TerminalSession | undefined;
	terminalTab(session: TerminalSession): TerminalTabData;
	attached(runtimeId: string): void;
	closed(): boolean;
	foreground?(): ForegroundIntent | undefined;
	focus?(pane: CapturedPane, context: PaneOperationContext): Promise<PaneOperationResult>;
}
export type CapturedPaneSession = PaneSessionTarget & { readonly summary: ManagedSessionSummary; readonly observedRuntimeId?: string };
export interface CapturedPaneFocus {
	readonly pane: CapturedPane;
	execute(context?: PaneOperationContext): Promise<PaneOperationResult>;
	dispose(): void;
}
const NONE: WorkspaceLayoutEditResult = { effect: 'none', layoutPublished: false, persisted: false, revision: 0 };

/** Original layout owner only. Capture is synchronous and never follows a later display or runtime. */
export class WorkspacePanes {
	private readonly paneCaptures = new WeakSet<object>();
	private readonly sessionCaptures = new WeakSet<object>();
	constructor(private readonly port: PaneWorkspacePort) {}
	private context(input: PaneOperationContext = {}): PaneOperationContext {
		return Object.freeze({ ...input, deadline: input.deadline ?? performance.now() + 30_000 });
	}
	private check(context: PaneOperationContext): void {
		if (this.port.closed()) throw new PaneCommandError('MODULE_INACTIVE', 'module-off');
		if (!this.port.spaces || !this.port.persistence.readLayoutNow || !this.port.persistence.editLayout)
			throw new PaneCommandError('CAPABILITY_UNAVAILABLE', 'layout-owner-unavailable');
		if (context.signal?.aborted) throw new PaneCommandError('WAIT_CANCELLED', 'cancelled', { cause: context.signal.reason });
		if (context.deadline !== undefined && (!Number.isFinite(context.deadline) || performance.now() >= context.deadline))
			throw new PaneCommandError('WAIT_TIMEOUT', 'deadline');
		context.validate?.();
	}
	private describe(snapshot: WorkspaceLayoutSnapshot): PaneDescriptor[] {
		const { view, baseline, spaceId } = snapshot;
		return projectPaneIdentities(view, spaceId === undefined ? { kind: 'shared' } : { kind: 'space', spaceId }, baseline).map(identity => {
			const tab = view.tabs[identity.tabId] as TerminalTabData, info = tab.panes[identity.leafKey]!;
			const summary = spaceId && info.persistentSessionId ? this.port.summary({ spaceId, sessionId: info.persistentSessionId }) : undefined;
			const selected = this.port.spaces!.store.getState().records.selectedSpaceId === spaceId;
			return {
				...identity,
				...(info.spaceId && info.spaceId !== spaceId ? { issue: 'unaddressable' as const } : {}),
				sessionId: summary?.sessionId,
				runtimeId: summary?.runtime?.runtimeId === identity.leafKey ? identity.leafKey : undefined,
				groupId: groupOf(view, tab.id)?.id,
				title: info.customTitle || tab.customTitle || summary?.title || tab.title,
				state: summary?.runtime?.runtimeId === identity.leafKey ? summary.runtime.phase : 'restored',
				selected, focused: selected && activeTab(view)?.id === tab.id && tab.focusedSessionId === identity.leafKey,
			};
		});
	}
	private index(candidate?: { spaceId: string; view: WorkspaceState }): PaneListing {
		this.check({});
		const spaces = Object.values(this.port.spaces!.store.getState().records.spaces);
		if (spaces.length > 1000) throw new PaneCommandError('CAPACITY_EXCEEDED', 'pane-scan-capacity');
		let revision = 0;
		const panes: PaneDescriptor[] = [];
		for (const key of [undefined, ...spaces.filter(space => !space.archived).map(space => space.id)]) {
			const current = this.port.persistence.readLayoutNow!(key);
			const snapshot = candidate && candidate.spaceId === key ? { ...current, view: candidate.view } : current;
			revision = Math.max(revision, snapshot.revision);
			try { panes.push(...this.describe(snapshot)); }
			catch (error) {
				if (error instanceof PaneIdentityError) throw new PaneCommandError(error.reason === 'capacity' ? 'CAPACITY_EXCEEDED' : 'SOURCE_UNAVAILABLE', error.reason, { cause: error });
				throw error;
			}
			if (panes.length > MAX_INDEXED_PANES) throw new PaneCommandError('CAPACITY_EXCEEDED', 'pane-scan-capacity');
		}
		if (panes.some(pane => pane.issue === 'capacity')) throw new PaneCommandError('CAPACITY_EXCEEDED', 'pane-identity-capacity');
		const counts = new Map<string, number>();
		for (const pane of panes) if (pane.paneId) counts.set(pane.paneId, (counts.get(pane.paneId) ?? 0) + 1);
		return { revision, panes: panes.map(pane => pane.paneId && counts.get(pane.paneId)! > 1 ? { ...pane, issue: 'duplicate-id' } : pane) };
	}
	/** A caller must complete original readiness first; capture itself performs no asynchronous work. */
	capture(target: PaneTarget): CapturedPane {
		if (!validPaneId(target.paneId)) throw new PaneCommandError('INVALID_ARGUMENT', 'invalid-pane-id');
		const matches = this.index().panes.filter(pane => pane.paneId === target.paneId);
		if (matches.length > 1 || matches.some(pane => pane.issue === 'duplicate-id')) throw new PaneCommandError('TARGET_AMBIGUOUS', 'ambiguous-pane');
		const pane = matches[0];
		if (!pane) throw new PaneCommandError('TARGET_NOT_FOUND', 'missing-pane');
		if (pane.issue || !pane.spaceId || !pane.sessionId) throw new PaneCommandError('SOURCE_UNAVAILABLE', pane.issue ?? 'unmanaged-pane');
		if (target.spaceId && target.spaceId !== pane.spaceId) throw new PaneCommandError('SCOPE_MISMATCH', 'pane-space-mismatch');
		if (target.runtimeId && target.runtimeId !== pane.runtimeId) throw new PaneCommandError('STALE_RUNTIME', 'runtime-changed');
		const summary = this.port.summary({ spaceId: pane.spaceId, sessionId: pane.sessionId });
		const captured = Object.freeze({ ...pane, path: Object.freeze([...pane.path]), paneId: pane.paneId!, spaceId: pane.spaceId, sessionId: pane.sessionId, sessionRuntimeId: summary?.runtime?.runtimeId });
		this.paneCaptures.add(captured); return captured;
	}
	private capturedPane(target: PaneTarget): CapturedPane {
		if (this.paneCaptures.has(target)) { const captured = target as CapturedPane; this.current(captured); return captured; }
		if (Object.hasOwn(target, 'sessionRuntimeId')) throw new PaneCommandError('INVALID_ARGUMENT', 'foreign-pane-capture');
		return this.capture(target);
	}
	private current(captured: CapturedPane, view?: WorkspaceState): CapturedPane {
		const now = this.capture({ paneId: captured.paneId });
		if (now.spaceId !== captured.spaceId || now.tabId !== captured.tabId || now.leafKey !== captured.leafKey
			|| now.sessionId !== captured.sessionId || now.sessionRuntimeId !== captured.sessionRuntimeId)
			throw new PaneCommandError('STALE_RUNTIME', 'pane-changed');
		if (view) {
			const tab = view.tabs[now.tabId];
			if (tab?.kind !== 'terminal' || tab.panes[now.leafKey]?.paneId !== captured.paneId)
				throw new PaneCommandError('TARGET_NOT_FOUND', 'missing-pane');
		}
		return now;
	}
	captureSession(target: PaneSessionTarget): CapturedPaneSession {
		this.check({}); this.port.spaces!.resolve({ spaceId: target.spaceId });
		const summary = this.port.summary(target);
		if (!summary) throw new PaneCommandError('TARGET_NOT_FOUND', 'missing-session');
		if (summary.archived) throw new PaneCommandError('SOURCE_UNAVAILABLE', 'archived-session');
		if (target.runtimeId && target.runtimeId !== summary.runtime?.runtimeId) throw new PaneCommandError('STALE_RUNTIME', 'runtime-changed');
		if (summary.runtime?.phase === 'launch-pending') throw new PaneCommandError('CAPABILITY_UNAVAILABLE', 'launch-pending');
		const captured = Object.freeze({ spaceId: target.spaceId, sessionId: target.sessionId, runtimeId: target.runtimeId,
			summary: Object.freeze({ ...summary, runtime: summary.runtime ? Object.freeze({ ...summary.runtime }) : undefined }), observedRuntimeId: summary.runtime?.runtimeId });
		this.sessionCaptures.add(captured); return captured;
	}
	private capturedSession(target: PaneSessionTarget): CapturedPaneSession {
		if (this.sessionCaptures.has(target)) { const captured = target as CapturedPaneSession; this.currentSession(captured); return captured; }
		if (Object.hasOwn(target, 'observedRuntimeId')) throw new PaneCommandError('INVALID_ARGUMENT', 'foreign-session-capture');
		return this.captureSession(target);
	}
	private currentSession(captured: CapturedPaneSession): void {
		this.port.spaces!.resolve({ spaceId: captured.spaceId });
		const now = this.port.summary(captured);
		if (!now) throw new PaneCommandError('TARGET_NOT_FOUND', 'missing-session');
		if (now.runtime?.runtimeId !== captured.observedRuntimeId) throw new PaneCommandError('STALE_RUNTIME', 'runtime-changed');
		if (now.archived) throw new PaneCommandError('SOURCE_UNAVAILABLE', 'archived-session');
	}
	private tab(captured: CapturedPaneSession): TerminalTabData {
		const runtime = this.port.summary(captured)?.runtime;
		const live = runtime && (runtime.phase === 'connected' || runtime.phase === 'disconnected') ? this.port.session(runtime.runtimeId) : undefined;
		if (live) return this.port.terminalTab(live);
		const record = this.port.spaces!.store.getState().records.sessions[captured.sessionId]!;
		const leafKey = record.lastAttempt?.runtimeId ?? `restored-${record.id}`;
		const info: ResumeInfo = { spaceId: record.spaceId, persistentSessionId: record.id, cwd: '', shell: record.shell, agentId: record.agentId, accountId: record.accountId, nativeSessionId: record.nativeSessionId, transcriptPath: record.transcriptPath };
		return { kind: 'terminal', id: `tab-${crypto.randomUUID()}`, title: record.title, createdAt: Date.now(), updatedAt: Date.now(), state: 'unknown', unread: false, sessionIds: [leafKey], focusedSessionId: leafKey, paneLayout: { kind: 'pane', session: leafKey }, panes: { [leafKey]: info }, resume: info };
	}
	private descriptor(view: WorkspaceState, spaceId: string, tabId: string, leafKey: string): PaneDescriptor {
		const snapshot = this.port.persistence.readLayoutNow!(spaceId);
		const pane = this.describe({ ...snapshot, view }).find(row => row.tabId === tabId && row.leafKey === leafKey);
		if (!pane?.paneId || pane.issue) throw new PaneCommandError('SOURCE_UNAVAILABLE', pane?.issue ?? 'missing-pane');
		return Object.freeze(pane);
	}
	private failed(error: unknown): PaneOperationResult { return { ...NONE, error }; }
	private async ready(context: PaneOperationContext): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			const clock = lifecycleClock();
			let finished = false, timer: unknown;
			const finish = (error?: unknown) => {
				if (finished) return; finished = true;
				context.signal?.removeEventListener('abort', stop); if (timer !== undefined) clock.clearTimeout(timer);
				if (error !== undefined) reject(error instanceof Error ? error : new Error('Pane preparation failed', { cause: error })); else resolve();
			};
			const stop = () => { try { this.check(context); } catch (error) { finish(error); } };
			context.signal?.addEventListener('abort', stop, { once: true });
			if (context.deadline !== undefined) timer = clock.setTimeout(stop, Math.max(0, context.deadline - performance.now()));
			void this.port.persistence.ready.then(() => { stop(); finish(); }, finish); stop();
		});
	}
	async list(spaceId = this.port.spaces?.store.getState().records.selectedSpaceId, input: PaneOperationContext = {}): Promise<PaneListing> {
		const context = this.context(input); await this.ready(context); this.check(context);
		if (!spaceId) throw new PaneCommandError('TARGET_REQUIRED', 'space-required');
		this.port.spaces!.resolve({ spaceId });
		const index = this.index();
		this.check(context);
		return { revision: index.revision, panes: index.panes.filter(pane => pane.spaceId === spaceId) };
	}
	async attach(target: PaneSessionTarget, input: PaneOperationContext & { readonly groupId?: string } = {}): Promise<PaneOperationResult> {
		const context = this.context(input), groupId = input.groupId;
		try {
			this.check(context); const captured = this.capturedSession(target);
			let pane: PaneDescriptor | undefined;
			const result = await this.port.persistence.editLayout!(captured.spaceId, view => {
				if (groupId !== undefined && !view.groups.some(group => group.id === groupId))
					throw new SpaceError('TARGET_NOT_FOUND', 'missing-group');
				const found = Object.values(view.tabs).flatMap(tab => tab.kind === 'terminal' ? tab.sessionIds.filter(key => tab.panes[key]?.spaceId === captured.spaceId && tab.panes[key]?.persistentSessionId === captured.sessionId).map(key => ({ tab, key })) : []);
				if (found.length > 1) throw new PaneCommandError('TARGET_AMBIGUOUS', 'duplicate-session-display');
				if (found[0]) {
					const { tab, key } = found[0];
					pane = this.descriptor(view, captured.spaceId, tab.id, key);
					const runtime = this.port.summary(captured)?.runtime;
					if (!runtime || runtime.runtimeId === key) return view;
					const created = this.tab(captured), added = created.sessionIds[0]!;
					const replace = (node: LayoutNode): LayoutNode => node.kind === 'pane'
						? node.session === key ? { ...node, session: added } : node
						: { ...node, first: replace(node.first), second: replace(node.second) };
					const info = { ...created.panes[added]!, paneId: pane.paneId };
					const panes = { ...tab.panes }; delete panes[key]; panes[added] = info;
					const candidate = { ...view, tabs: { ...view.tabs, [tab.id]: { ...tab, panes,
						paneLayout: replace(tab.paneLayout), sessionIds: tab.sessionIds.map(id => id === key ? added : id),
						focusedSessionId: tab.focusedSessionId === key ? added : tab.focusedSessionId,
						resume: tab.focusedSessionId === key ? info : tab.resume,
					} } };
					pane = this.descriptor(candidate, captured.spaceId, tab.id, added); return candidate;
				}
				const tab = this.tab(captured), key = tab.sessionIds[0]!;
				tab.panes[key] = { ...tab.panes[key]!, paneId: newPaneId(new Set(this.index().panes.flatMap(row => row.paneId ? [row.paneId] : []))) };
				const next = openTab(view, groupId, tab);
				const candidate = !view.groups.length && this.port.spaces!.store.getState().records.selectedSpaceId !== captured.spaceId ? next
					: { ...next, activeGroupId: view.activeGroupId, groups: next.groups.map(group => {
					const previous = view.groups.find(row => row.id === group.id);
					return previous ? { ...group, activeTabId: previous.activeTabId, recentTabIds: previous.recentTabIds } : group;
				}) };
				// This owner publishes synchronously after the transform: include the new candidate in the same global scan.
				this.index({ spaceId: captured.spaceId, view: candidate });
				pane = this.descriptor(candidate, captured.spaceId, tab.id, key); return candidate;
			}, { ...context, validate: () => { this.check(context); this.currentSession(captured); } });
			if (!result.error && pane?.runtimeId) this.port.attached(pane.runtimeId);
			return { ...result, pane };
		} catch (error) { return this.failed(error); }
	}
	async split(target: PaneTarget, inserted: PaneSessionTarget, direction: SplitDirection, input: PaneOperationContext = {}): Promise<PaneOperationResult> {
		const context = this.context(input);
		try {
			this.check(context); const captured = this.capturedPane(target), session = this.capturedSession(inserted);
			if (captured.spaceId !== session.spaceId) throw new PaneCommandError('SCOPE_MISMATCH', 'split-space-mismatch');
			if (direction !== 'row' && direction !== 'column') throw new PaneCommandError('INVALID_ARGUMENT', 'invalid-direction');
			let added: PaneDescriptor | undefined;
			const result = await this.port.persistence.editLayout!(captured.spaceId, view => {
				this.current(captured, view); const source = view.tabs[captured.tabId] as TerminalTabData;
				if (source.sessionIds.length >= 4) throw new PaneCommandError('CAPACITY_EXCEEDED', 'split-limit');
				if (Object.values(view.tabs).some(tab => tab.kind === 'terminal' && Object.values(tab.panes).some(info => info.persistentSessionId === session.sessionId && info.spaceId === session.spaceId))) throw new PaneCommandError('INVALID_ARGUMENT', 'session-already-displayed');
				const created = this.tab(session), key = created.sessionIds[0]!;
				const info = { ...created.panes[key]!, paneId: newPaneId(new Set(this.index().panes.flatMap(row => row.paneId ? [row.paneId] : []))) };
				const replace = (node: LayoutNode): LayoutNode => node.kind === 'pane'
					? node.session === captured.leafKey ? { kind: 'split', direction, ratio: 0.5, first: node, second: { kind: 'pane', session: key } } : node
					: { ...node, first: replace(node.first), second: replace(node.second) };
				const candidate = { ...view, tabs: { ...view.tabs, [source.id]: { ...source, sessionIds: [...source.sessionIds, key], paneLayout: replace(source.paneLayout), panes: { ...source.panes, [key]: info } } } };
				this.index({ spaceId: captured.spaceId, view: candidate });
				added = this.descriptor(candidate, captured.spaceId, source.id, key); return candidate;
			}, { ...context, validate: () => { this.check(context); this.current(captured); this.currentSession(session); } });
			if (!result.error && added?.runtimeId) this.port.attached(added.runtimeId);
			return { ...result, pane: captured, insertedPane: added };
		} catch (error) { return this.failed(error); }
	}
	async resize(target: PaneTarget, ratio: number, input: PaneOperationContext = {}): Promise<PaneOperationResult> {
		const context = this.context(input);
		try {
			this.check(context); const captured = this.capturedPane(target);
			if (!Number.isFinite(ratio) || ratio < 0.15 || ratio > 0.85) throw new PaneCommandError('INVALID_ARGUMENT', 'invalid-ratio');
			const result = await this.port.persistence.editLayout!(captured.spaceId, view => {
				this.current(captured, view); const tab = view.tabs[captured.tabId] as TerminalTabData;
				const path = paneLeaves(tab.paneLayout).find(leaf => leaf.leafKey === captured.leafKey)!.path;
				if (!path.length) return view;
				const update = (node: LayoutNode, depth: number): LayoutNode => {
					if (node.kind !== 'split') return node;
					if (depth === path.length - 1) return { ...node, ratio: path[depth] === 'second' ? 1 - ratio : ratio };
					return path[depth] === 'first' ? { ...node, first: update(node.first, depth + 1) } : { ...node, second: update(node.second, depth + 1) };
				};
				return { ...view, tabs: { ...view.tabs, [tab.id]: { ...tab, paneLayout: update(tab.paneLayout, 0) } } };
			}, { ...context, validate: () => { this.check(context); this.current(captured); } });
			return { ...result, pane: captured };
		} catch (error) { return this.failed(error); }
	}
	async close(target: PaneTarget, input: PaneOperationContext = {}): Promise<PaneOperationResult> {
		const context = this.context(input);
		try {
			this.check(context); const captured = this.capturedPane(target);
			const result = await this.port.persistence.editLayout!(captured.spaceId, view => {
				this.current(captured, view); const tab = view.tabs[captured.tabId] as TerminalTabData;
				if (tab.sessionIds.length === 1) return closeTab(view, tab.id);
				const remove = (node: LayoutNode): LayoutNode | undefined => {
					if (node.kind === 'pane') return node.session === captured.leafKey ? undefined : node;
					const first = remove(node.first), second = remove(node.second);
					return first && second ? { ...node, first, second } : first ?? second;
				};
				const panes = { ...tab.panes }; delete panes[captured.leafKey];
				const ids = tab.sessionIds.filter(key => key !== captured.leafKey);
				return { ...view, tabs: { ...view.tabs, [tab.id]: { ...tab, paneLayout: remove(tab.paneLayout)!, panes, sessionIds: ids, focusedSessionId: tab.focusedSessionId === captured.leafKey ? ids[0]! : tab.focusedSessionId } } };
			}, { ...context, validate: () => { this.check(context); this.current(captured); } });
			return { ...result, pane: captured };
		} catch (error) { return this.failed(error); }
	}
	captureFocus(target: PaneTarget, input: Pick<PaneOperationContext, 'intent'> = {}): CapturedPaneFocus {
		const pane = this.capturedPane(target);
		const intent = Object.hasOwn(input, 'intent') ? input.intent : this.port.foreground?.();
		let released = false, used = false;
		const release = () => { if (!released) { released = true; intent?.dispose(); } };
		const owned = intent ? {
			valid: () => !released && intent.valid(), dispose: release,
			...(intent.commitFocus ? { commitFocus: (element: HTMLElement, focus: () => void) => !released && intent.commitFocus!(element, focus) } : {}),
			...(intent.allowWithin ? { allowWithin: (element: HTMLElement) => intent.allowWithin!(element) } : {}),
		} : undefined;
		return {
			pane,
			execute: async (options = {}) => {
				if (released || used) return this.failed(new PaneCommandError('INVALID_ARGUMENT', 'focus-capture-used'));
				used = true; const context = this.context(options);
				try {
					this.check(context); this.current(pane);
					if (!this.port.focus) throw new PaneCommandError('CAPABILITY_UNAVAILABLE', 'focus-unavailable');
					return await this.port.focus(pane, { ...context, intent: owned, validate: () => { this.check(context); this.current(pane); } });
				} catch (error) { release(); return this.failed(error); }
			},
			dispose: () => { if (!used) release(); },
		};
	}
	async focus(target: PaneTarget, input: PaneOperationContext = {}): Promise<PaneOperationResult> {
		try { return await this.captureFocus(target, input).execute(input); }
		catch (error) { return this.failed(error); }
	}
}
