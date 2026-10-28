import type { BrowserWorkspace, BrowserPage } from '../../browser/api';
import { t } from '../../../shared/i18n';
import {
	activeTab,
	activateTab,
	closeTab,
	groupOf,
	moveTab,
	nextTab,
	openPage,
	openTab,
	recentTab,
	renameTab,
	resizeGroups,
	splitGroupWithTab,
} from '../core/workspace/ops';
import type {
	BrowserTabData,
	PageKind,
	ResumeInfo,
	TabColor,
	TerminalTabData,
	WorkspaceState,
	WorkspaceTab,
} from '../core/workspace/model';
import {
	canSplit,
	removeSession,
	sessionsOf,
	setRatio,
	split,
	type SplitDirection,
	type TabsState,
} from '../core/terminal/layout';
import type { ShellChoice } from '../core/terminal/settings';
import type { AgentId } from '../core/launch/types';
import type { TerminalSession } from './terminal/session';
import type { TerminalSessions } from './terminal/sessions';
import { sessionState } from './terminal/status';
import type { WorkspaceStore } from './workspace-store';

/** In-page confirmation; the optional wording replaces the "end session" texts of the shared dialog. */
export type ConfirmFn = (message: string, options?: { title?: string; action?: string }) => Promise<boolean>;
/** The browser's public facade is optional; Agent never owns a native browser resource. */
export type WorkspaceBrowserHost = Pick<BrowserWorkspace, 'resolveInput' | 'getState' | 'createSpace' | 'openPage'>;
export interface WorkspaceLaunchPort {
	shell(options: { shell?: ShellChoice; cwd?: string }): Promise<TerminalSession | undefined>;
	agent(
		id: AgentId,
		options: { cwd?: string; accountId?: string; prompt?: string },
	): Promise<TerminalSession | undefined>;
	resume(info: ResumeInfo, title: string): Promise<TerminalSession | undefined>;
	account(id: AgentId): string;
	report(error: unknown): void;
}
export class WorkspaceService {
	readonly store;
	private off: () => void;
	private visible = new Map<object, Set<string>>();
	private disposed = false;
	private restoring = new Set<string>();
	private menuListeners = new Set<() => void>();
	constructor(
		readonly persistence: WorkspaceStore,
		private sessions: TerminalSessions,
		private launch: WorkspaceLaunchPort,
		private browser: () => WorkspaceBrowserHost | undefined = () => undefined,
	) {
		this.store = persistence.store;
		this.off = sessions.subscribe(() => this.sync());
	}
	get browserAvailable(): boolean {
		return !!this.browser();
	}
	get active(): WorkspaceTab | undefined {
		return activeTab(this.store.getState());
	}
	private update(fn: (state: WorkspaceState) => WorkspaceState): void {
		if (!this.disposed) this.store.setState(fn, true);
	}
	private metadata(session: TerminalSession, shell?: ShellChoice): ResumeInfo {
		return {
			cwd: session.startCwd,
			agentId: session.agentId,
			accountId: session.accountId ?? (session.agentId ? this.launch.account(session.agentId) : undefined),
			shell,
			nativeSessionId: session.nativeSessionId,
			transcriptPath: session.transcriptPath,
		};
	}
	attach(session: TerminalSession, groupId?: string, shell?: ShellChoice): string {
		const found = Object.values(this.store.getState().tabs).find(
			(tab) => tab.kind === 'terminal' && tab.sessionIds.includes(session.id),
		);
		if (found) {
			this.activate(found.id);
			return found.id;
		}
		const info = this.metadata(session, shell);
		const tab: TerminalTabData = {
			kind: 'terminal',
			id: `tab-${crypto.randomUUID()}`,
			title: session.title,
			agentId: session.agentId,
			sessionIds: [session.id],
			paneLayout: { kind: 'pane', session: session.id },
			focusedSessionId: session.id,
			panes: { [session.id]: info },
			state: sessionState(session),
			unread: false,
			createdAt: session.createdAt,
			updatedAt: session.activityAt,
		};
		this.update((s) => openTab(s, groupId, tab));
		this.sessions.focus(session.id);
		return tab.id;
	}
	async newTerminal(
		options: { groupId?: string; shell?: ShellChoice; cwd?: string } = {},
	): Promise<string | undefined> {
		await this.persistence.ready;
		if (this.disposed) return undefined;
		const session = await this.launch.shell(options);
		if (!session) return undefined;
		if (this.disposed) {
			this.sessions.remove(session.id);
			return undefined;
		}
		this.attach(session, options.groupId, options.shell);
		return session.id;
	}
	async newAgent(
		id: AgentId,
		options: { groupId?: string; cwd?: string; prompt?: string } = {},
	): Promise<string | undefined> {
		await this.persistence.ready;
		if (this.disposed) return undefined;
		const session = await this.launch.agent(id, options);
		if (!session) return undefined;
		if (this.disposed) {
			this.sessions.remove(session.id);
			return undefined;
		}
		this.attach(session, options.groupId);
		return session.id;
	}
	async newBrowser(
		input?: string,
		options: { groupId?: string; spaceId?: string; pageId?: string } = {},
	): Promise<string | undefined> {
		await this.persistence.ready;
		if (this.disposed) return undefined;
		const host = this.browser();
		if (!host) throw new Error(t('agent.workspace.browserDisabled'));
		const url = input ? host.resolveInput(input) : undefined;
		if (input && !url) throw new Error(t('browser.browser_invalid_url'));
		let space = options.spaceId ? host.getState().spaces.find((item) => item.id === options.spaceId) : undefined;
		if (options.spaceId && !space) throw new Error(t('agent.workspace.browserTargetMissing'));
		if (!space) {
			// Temporary storage requires an explicit consent flow in Browser Workspace.
			if (host.getState().persistence !== 'secure') throw new Error(t('agent.workspace.browserNeedsWorkspace'));
			space = await host.createSpace({ kind: 'task', url: url ?? undefined });
		}
		let page = options.pageId ? space.pages.find((item) => item.id === options.pageId) : space.pages[0];
		if (options.pageId && !page) throw new Error(t('agent.workspace.browserTargetMissing'));
		if (options.spaceId && url) page = await host.openPage({ spaceId: space.id, url });
		if (!page) page = await host.openPage({ spaceId: space.id, url: url ?? undefined });
		if (this.disposed) return undefined;
		const tab: BrowserTabData = {
			kind: 'browser',
			id: `tab-${crypto.randomUUID()}`,
			spaceId: space.id,
			pageId: page.id,
			title: page.title || t('browser.newTab'),
			createdAt: Date.now(),
		};
		this.update((s) => openTab(s, options.groupId, tab));
		return tab.id;
	}
	/**
	 * Show a page (the board or usage) as a tab. A page that is already open is activated instead of opened
	 * again, so repeated clicks never stack tabs.
	 */
	openPage(page: PageKind, options: { resourceId?: string; groupId?: string } = {}): string | undefined {
		let tabId: string | undefined;
		this.update((s) => {
			const opened = openPage(s, options.groupId, {
				page,
				resourceId: options.resourceId,
				createdAt: Date.now(),
			});
			tabId = opened?.tabId;
			return opened?.state ?? s;
		});
		return tabId;
	}
	updateBrowser(tabId: string, state: Pick<BrowserPage, 'title'>): void {
		this.update((s) => {
			const tab = s.tabs[tabId];
			if (tab?.kind !== 'browser') return s;
			const next = { ...tab, title: state.title || t('browser.newTab') };
			return JSON.stringify(next) === JSON.stringify(tab) ? s : { ...s, tabs: { ...s.tabs, [tabId]: next } };
		});
	}
	activate(tabId: string): void {
		this.update((s) => activateTab(s, tabId));
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind === 'terminal') this.sessions.focus(tab.focusedSessionId);
	}
	focusSession(id: string): void {
		const tab = Object.values(this.store.getState().tabs).find(
			(t): t is TerminalTabData => t.kind === 'terminal' && t.sessionIds.includes(id),
		);
		if (!tab) return;
		if (tab.focusedSessionId !== id)
			this.update((s) => ({ ...s, tabs: { ...s.tabs, [tab.id]: { ...tab, focusedSessionId: id } } }));
		if (this.active?.id !== tab.id || tab.unread) this.activate(tab.id);
		this.sessions.focus(id);
	}
	setVisible(owner: object, ids: string[]): void {
		if (ids.length) this.visible.set(owner, new Set(ids));
		else this.visible.delete(owner);
		this.update((s) => {
			const entries = Object.entries(s.tabs).filter(
				([id, tab]) => ids.includes(id) && tab.kind === 'terminal' && tab.unread,
			);
			return entries.length
				? {
						...s,
						tabs: {
							...s.tabs,
							...Object.fromEntries(entries.map(([id, tab]) => [id, { ...tab, unread: false }])),
						},
					}
				: s;
		});
	}
	private isVisible(id: string): boolean {
		return [...this.visible.values()].some((ids) => ids.has(id));
	}
	private sync(): void {
		this.update((s) => {
			let changed = false;
			const tabs = { ...s.tabs };
			for (const tab of Object.values(tabs)) {
				if (tab.kind !== 'terminal') continue;
				const sessions = tab.sessionIds.flatMap((id) => {
					const session = this.sessions.get(id);
					return session ? [session] : [];
				});
				if (!sessions.length) continue;
				const states = sessions.map((session) => sessionState(session));
				const state = (
					['permission', 'waiting', 'working', 'failed', 'interrupted', 'done', 'unknown', 'idle'] as const
				).find((value) => states.includes(value))!;
				const focused = sessions.find((s) => s.id === tab.focusedSessionId) ?? sessions[0]!;
				const panes = { ...tab.panes };
				for (const session of sessions)
					panes[session.id] = {
						...panes[session.id],
						cwd: session.cwd,
						nativeSessionId: session.nativeSessionId ?? panes[session.id]?.nativeSessionId,
						transcriptPath: session.transcriptPath ?? panes[session.id]?.transcriptPath,
					};
				const next = {
					...tab,
					title: tab.agentId ? focused.appliedGeneratedTitle || tab.title : focused.title,
					panes,
					state,
					updatedAt: Math.max(...sessions.map((s) => s.activityAt)),
					unread: tab.unread || (state === 'done' && tab.state !== 'done' && !this.isVisible(tab.id)),
				};
				if (JSON.stringify(next) !== JSON.stringify(tab)) {
					tabs[tab.id] = next;
					changed = true;
				}
			}
			return changed ? { ...s, tabs } : s;
		});
	}
	refreshStates(): void {
		this.sync();
	}
	async close(tabId: string, confirm: ConfirmFn): Promise<void> {
		const tab = this.store.getState().tabs[tabId];
		if (!tab) return;
		if (tab.kind === 'terminal') {
			const running = tab.sessionIds.filter((id) => this.sessions.get(id)?.running);
			if (
				running.length &&
				!(await confirm(t('agent.workspace.closeConfirm', { title: tab.customTitle || tab.title })))
			)
				return;
			// The tab may have been restored or changed while the confirmation was open.
			const current = this.store.getState().tabs[tabId];
			if (current?.kind !== 'terminal') return;
			if (current.sessionIds.join(',') !== tab.sessionIds.join(',')) return this.close(tabId, confirm);
		}
		this.update((s) => closeTab(s, tabId));
		if (tab.kind === 'terminal') tab.sessionIds.forEach((id) => this.sessions.remove(id));
	}
	async end(tabId: string, confirm: (message: string) => Promise<boolean>): Promise<void> {
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind !== 'terminal' || !tab.sessionIds.some((id) => this.sessions.get(id)?.running)) return;
		if (!(await confirm(t('agent.endConfirm', { title: tab.customTitle || tab.title })))) return;
		const current = this.store.getState().tabs[tabId];
		if (this.disposed || current?.kind !== 'terminal') return;
		if (current.sessionIds.join(',') !== tab.sessionIds.join(',')) return this.end(tabId, confirm);
		for (const id of current.sessionIds) if (this.sessions.get(id)?.running) this.sessions.end(id);
	}
	renamePane(tabId: string, sessionId: string, title: string): void {
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind !== 'terminal' || !tab.panes[sessionId]) return;
		this.update((s) => ({
			...s,
			tabs: {
				...s.tabs,
				[tabId]: {
					...tab,
					panes: {
						...tab.panes,
						[sessionId]: { ...tab.panes[sessionId]!, customTitle: title.trim().slice(0, 200) || undefined },
					},
				},
			},
		}));
	}
	equalizePanes(tabId: string): void {
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind !== 'terminal') return;
		const equalize = (node: TerminalTabData['paneLayout']): TerminalTabData['paneLayout'] =>
			node.kind === 'pane'
				? node
				: { ...node, ratio: 0.5, first: equalize(node.first), second: equalize(node.second) };
		this.update((s) => ({ ...s, tabs: { ...s.tabs, [tabId]: { ...tab, paneLayout: equalize(tab.paneLayout) } } }));
	}
	move(
		tabId: string,
		to: { groupId: string; index: number } | { split: 'right' | 'down' | 'left' | 'up'; ofGroupId: string },
	): void {
		this.update((s) =>
			'split' in to
				? splitGroupWithTab(s, tabId, to.ofGroupId, to.split, `group-${crypto.randomUUID()}`)
				: moveTab(s, tabId, to.groupId, to.index),
		);
	}
	rename(tabId: string, title: string): void {
		this.update((s) => renameTab(s, tabId, title));
	}
	decorate(tabId: string, change: { pinned?: boolean; color?: TabColor }): void {
		this.update((s) =>
			s.tabs[tabId] ? { ...s, tabs: { ...s.tabs, [tabId]: { ...s.tabs[tabId], ...change } } } : s,
		);
	}
	resize(path: readonly number[], sizes: number[]): void {
		this.update((s) => resizeGroups(s, path, sizes));
	}
	next(offset = 1): void {
		const id = nextTab(this.store.getState(), offset);
		if (id) this.activate(id);
	}
	recent(): void {
		const id = recentTab(this.store.getState());
		if (id) this.activate(id);
	}
	private paneTabs(tab: TerminalTabData): TabsState {
		return { tabs: [{ id: tab.id, root: tab.paneLayout, focused: tab.focusedSessionId }], active: tab.id };
	}
	async splitPane(id: string, direction: SplitDirection): Promise<void> {
		const tab = Object.values(this.store.getState().tabs).find(
			(t): t is TerminalTabData => t.kind === 'terminal' && t.sessionIds.includes(id),
		);
		if (!tab || !canSplit(this.paneTabs(tab), id)) throw new Error(t('agent.splitLimit'));
		const session = await this.launch.shell({ cwd: this.sessions.get(id)?.cwd });
		if (!session) return;
		const current = this.store.getState().tabs[tab.id];
		if (this.disposed || current?.kind !== 'terminal' || !canSplit(this.paneTabs(current), id)) {
			this.sessions.remove(session.id);
			return;
		}
		const pane = split(this.paneTabs(current), id, direction, session.id).tabs[0]!;
		this.update((s) => ({
			...s,
			tabs: {
				...s.tabs,
				[tab.id]: {
					...current,
					sessionIds: sessionsOf(pane.root),
					paneLayout: pane.root,
					focusedSessionId: pane.focused,
					panes: { ...current.panes, [session.id]: this.metadata(session) },
				},
			},
		}));
		this.activate(tab.id);
	}
	async closePane(id: string, confirm: (message: string) => Promise<boolean>): Promise<void> {
		const tab = Object.values(this.store.getState().tabs).find(
			(t): t is TerminalTabData => t.kind === 'terminal' && t.sessionIds.includes(id),
		);
		if (!tab) return;
		if (tab.sessionIds.length === 1) return this.close(tab.id, confirm);
		const session = this.sessions.get(id);
		if (session?.running && !(await confirm(t('agent.endConfirm', { title: session.title })))) return;
		const current = this.store.getState().tabs[tab.id];
		if (current?.kind !== 'terminal' || !current.sessionIds.includes(id)) return;
		if (current.sessionIds.join(',') !== tab.sessionIds.join(',')) return this.closePane(id, confirm);
		const pane = removeSession(this.paneTabs(current), id).tabs[0]!;
		const panes = { ...current.panes };
		delete panes[id];
		this.update((s) => ({
			...s,
			tabs: {
				...s.tabs,
				[tab.id]: {
					...current,
					paneLayout: pane.root,
					focusedSessionId: pane.focused,
					sessionIds: sessionsOf(pane.root),
					panes,
				},
			},
		}));
		this.sessions.remove(id);
	}
	resizePane(tabId: string, path: readonly ('first' | 'second')[], ratio: number): void {
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind !== 'terminal') return;
		const pane = setRatio(this.paneTabs(tab), tab.id, path, ratio).tabs[0]!;
		this.update((s) => ({ ...s, tabs: { ...s.tabs, [tabId]: { ...tab, paneLayout: pane.root } } }));
	}
	async restore(tabId: string, sessionId?: string, restart = false): Promise<void> {
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind !== 'terminal') return;
		const oldId = sessionId ?? tab.focusedSessionId,
			key = `${tabId}:${oldId}`;
		if (this.restoring.has(key)) return;
		const info = tab.panes[oldId] ?? tab.resume;
		if (!info) return;
		this.restoring.add(key);
		try {
			const session =
				!restart && info.nativeSessionId && info.agentId
					? await this.launch.resume(info, tab.customTitle || tab.title)
					: info.agentId
						? await this.launch.agent(info.agentId, info)
						: await this.launch.shell(info);
			if (!session) return;
			const current = this.store.getState().tabs[tabId];
			if (this.disposed || current?.kind !== 'terminal' || !current.sessionIds.includes(oldId)) {
				this.sessions.remove(session.id);
				return;
			}
			const replace = (node: TerminalTabData['paneLayout']): TerminalTabData['paneLayout'] =>
				node.kind === 'pane'
					? { ...node, session: node.session === oldId ? session.id : node.session }
					: { ...node, first: replace(node.first), second: replace(node.second) };
			const panes = { ...current.panes };
			delete panes[oldId];
			panes[session.id] = {
				...this.metadata(session, info.shell),
				accountId: info.accountId,
				customTitle: info.customTitle,
			};
			this.update((s) => ({
				...s,
				tabs: {
					...s.tabs,
					[tabId]: {
						...current,
						sessionIds: current.sessionIds.map((id) => (id === oldId ? session.id : id)),
						paneLayout: replace(current.paneLayout),
						focusedSessionId: session.id,
						panes,
						resume: undefined,
						state: sessionState(session),
						unread: false,
					},
				},
			}));
			this.sessions.remove(oldId);
			this.activate(tabId);
		} finally {
			this.restoring.delete(key);
		}
	}
	reopen(id?: string): void {
		const tab = id
			? this.store.getState().closedTabs.find((tab) => tab.id === id)
			: this.store.getState().closedTabs[0];
		if (!tab) return;
		this.update((s) =>
			openTab(
				{ ...s, closedTabs: s.closedTabs.filter((closed) => closed.id !== tab.id) },
				s.activeGroupId,
				tab.kind === 'terminal' ? { ...tab, resume: tab.panes[tab.focusedSessionId], unread: false } : tab,
			),
		);
	}
	requestMenu(): void {
		for (const listener of this.menuListeners) listener();
	}
	onMenu(listener: () => void): () => void {
		this.menuListeners.add(listener);
		return () => {
			this.menuListeners.delete(listener);
		};
	}
	group(tabId: string) {
		return groupOf(this.store.getState(), tabId);
	}
	report(error: unknown): void {
		this.launch.report(error);
	}
	async dispose(): Promise<void> {
		this.disposed = true;
		this.off();
		this.visible.clear();
		this.menuListeners.clear();
		await this.persistence.dispose();
	}
}
