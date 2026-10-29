import type { CapturedManagedCreate } from '../core/control/context';
import { spaceBoundCwd } from './agent-runtime';
import { lifecycleClock, observeLifecycle, SHUTDOWN_OBSERVE_MS } from './terminal/clock';
import { NATIVE_TERMINATION_OBSERVE_MS, type TerminationEvidence } from '../../../shared/native/host';
import { terminationConfirmed } from '../../../shared/native/termination';
import type { BrowserPageHandle, BrowserViewState } from '../../browser/api';
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
import type { SpaceService, SessionAdmission } from './spaces/space-service';
import { isNeverStartedImport } from './spaces/records';
import type {
	ActivityCompletionHint,
	ManagedSeenRequest,
	ManagedSeenOptions,
	ManagedSeenResult,
	ManagedAttachResult,
	ManagedCreateRequest,
	ManagedCreateResult,
	ManagedInteractiveCreateRequest,
	ManagedRuntimeRef,
	ManagedSessionSummary,
	ManagedSessionTarget,
	ManagedSnapshot,
	ManagedStopOptions,
	StopResult,
	ArchiveScope,
	ArchivePlan,
	ArchiveResult,
	ArchiveRow,
} from '../core/workspace/managed-runtime';
import {
	ManagedLaunchError,
	managedFailure,
	normalizeManagedFailure as normalizeLaunchFailure,
} from './launch/managed-errors';
import type { ForegroundIntent } from './launch/foreground-intent';
import { getAgent } from '../core/launch/catalog';
import { SpaceError } from '../core/space/errors';
import { newPaneId, paneLeaves } from '../core/workspace/pane-identity';
import {
	WorkspacePanes,
	PaneCommandError,
	type CapturedPane,
	type PaneOperationContext,
	type PaneOperationResult,
} from './workspace-service-panes';

/** In-page confirmation; the optional wording replaces the "end session" texts of the shared dialog. */
export type ConfirmFn = (message: string, options?: { title?: string; action?: string }) => Promise<boolean>;
/** Stage 5 supplies this port from browser/api.ts; no browser implementation is imported here. */
export interface WorkspaceBrowserHost {
	resolveInput(input: string): string | null;
	createPage(options: { url?: string; profileId?: string }): {
		id: string;
		url: string;
		title: string;
		profileId: string;
	};
	getPage?(id: string): BrowserPageHandle | undefined;
	disposePage(id: string): void;
}
function normalizeManagedFailure(cause: unknown) {
	if (cause instanceof PaneCommandError && cause.code === 'CAPACITY_EXCEEDED')
		return { ...managedFailure('CAPABILITY_UNAVAILABLE', 'pane-capacity'), nextAction: 'inspect-runtime' as const };
	return normalizeLaunchFailure(cause);
}

/**
 * An interactive launch may name a narrower start directory (a saved quick command). It must lie inside the
 * directory the chosen Space authorizes; otherwise the launch is refused before any Session record is written.
 */
export type CwdScope = { readonly vaultRoot: string; readonly platform: NodeJS.Platform };
export type InteractiveLaunchRequest = ManagedInteractiveCreateRequest & {
	readonly cwd?: string;
	/** The real vault root and platform `cwd` was canonicalised against; the whole-vault default maps to the Space. */
	readonly cwdScope?: CwdScope;
};

export interface WorkspaceLaunchPort {
	/** Capture configuration before admission waits; returned port has the same behavior and frozen settings. */
	capture?(): WorkspaceLaunchPort;
	foreground?(): ForegroundIntent;
	show?(runtimeId: string): Promise<void>;
	shell(options: {
		shell?: ShellChoice;
		cwd?: string;
		beforeSpawn?: () => Promise<void>;
		runtime?: ManagedRuntimeRef;
		interactive?: boolean;
		intent?: ForegroundIntent;
	}): Promise<TerminalSession | undefined>;
	agent(
		id: AgentId,
		options: {
			cwd?: string;
			accountId?: string;
			prompt?: string;
			beforeSpawn?: () => Promise<void>;
			runtime?: ManagedRuntimeRef;
			interactive?: boolean;
			intent?: ForegroundIntent;
		},
	): Promise<TerminalSession | undefined>;
	resume(
		info: ResumeInfo,
		title: string,
		beforeSpawn?: () => Promise<void>,
		context?: { runtime?: ManagedRuntimeRef; interactive?: boolean; intent?: ForegroundIntent },
	): Promise<TerminalSession | undefined>;
	account(id: AgentId): string;
	report(error: unknown): void;
}
/** Local presentation capability. It is not native foreground or a seen/paint receipt. */
export interface FocusPresentationSnapshot {
	readonly navigationGeneration: number;
	readonly request?: Readonly<{
		id: number;
		phase: 'selecting' | 'committed' | 'cancelled' | 'consumed';
		target: Readonly<ManagedRuntimeRef>;
		tabId?: string;
		navigationGeneration: number;
	}>;
}
interface FocusContext {
	intent?: ForegroundIntent;
	transferred: boolean;
	released?: boolean;
}
interface FocusOwner {
	id: number;
	target: ManagedRuntimeRef;
	tabId?: string;
	context: FocusContext;
	expectedRevision: number;
	navigationGeneration: number;
	phase: 'selecting' | 'committed';
	deadline?: number;
	monotonicDeadline?: number;
	consumed?: boolean;
}
export class WorkspaceService {
	readonly store;
	readonly panes: WorkspacePanes;
	private off: () => void;
	private visible = new Map<object, Set<string>>();
	private disposed = false;
	private restoring = new Set<string>();
	private menuListeners = new Set<() => void>();
	private presentationRevision = 0;
	private focusId = 0;
	private focusOwner?: FocusOwner;
	private focusTimer?: unknown;
	private focusClock = lifecycleClock();
	private focusListeners = new Set<() => void>();
	private paneFocusPreparations = new Set<number>();
	private focusSnapshot: FocusPresentationSnapshot = Object.freeze({ navigationGeneration: 0 });
	private focusNavigation = '';
	private attaching = new Map<string, Promise<string>>();
	private managedListeners = new Set<() => void>();
	private managedSnapshot: ManagedSnapshot = { revision: 0, sessions: [] };
	private managedOff: (() => void)[] = [];
	private checkpointed = new Map<string, string>();
	private checkpointTail: Promise<void> = Promise.resolve();
	private checkpointFailures: unknown[] = [];
	private archiveSettlements = new Set<Promise<unknown>>();
	private draining?: Promise<void>;
	private drainObservation?: Promise<void>;
	private disposing?: Promise<void>;
	private closing = false;
	private identities = new Map<string, { spaceId: string; persistentSessionId: string }>();
	constructor(
		readonly persistence: WorkspaceStore,
		private sessions: TerminalSessions,
		private launch: WorkspaceLaunchPort,
		private browser: () => WorkspaceBrowserHost | undefined = () => undefined,
		readonly spaces?: SpaceService,
		private readonly retainsPersistence = false,
	) {
		this.store = persistence.store;
		this.panes = new WorkspacePanes({
			persistence,
			spaces,
			summary: (target) => this.getManaged(target),
			session: (id) => this.sessions.get(id),
			terminalTab: (session) => this.terminalTab(session),
			attached: (id) => this.sessions.markAttached(id),
			closed: () => this.closing || this.disposed,
			foreground: () => this.launch.foreground?.(),
			focus: (pane, context) => this.focusPanePresentation(pane, context),
		});
		this.off = sessions.subscribe(() => {
			this.sync();
			this.refreshManaged();
			this.checkpointSettled();
		});
		this.managedOff.push(
			this.store.subscribe(() => {
				this.refreshManaged();
				this.refreshFocusPresentation();
			}),
		);
		if (spaces)
			this.managedOff.push(
				spaces.store.subscribe(() => {
					this.refreshManaged();
					this.refreshFocusPresentation();
				}),
			);
		this.focusNavigation = this.navigationTuple();
		this.refreshManaged();
	}
	private navigationTuple(): string {
		const state = this.store.getState(),
			tab = activeTab(state);
		return JSON.stringify([
			this.spaces?.store.getState().records.selectedSpaceId,
			state.activeGroupId,
			tab?.id,
			tab?.kind === 'terminal' ? tab.focusedSessionId : undefined,
		]);
	}
	private refreshFocusPresentation(): void {
		const tuple = this.navigationTuple();
		let generation = this.focusSnapshot.navigationGeneration;
		if (tuple !== this.focusNavigation) {
			this.focusNavigation = tuple;
			generation++;
		}
		const owner = this.focusOwner;
		if (owner && owner.expectedRevision !== this.presentationRevision) {
			this.finishFocus(owner, 'cancelled', generation);
			return;
		}
		if (owner) owner.navigationGeneration = generation;
		const request = owner
			? Object.freeze({
					id: owner.id,
					phase: owner.phase,
					target: Object.freeze({ ...owner.target }),
					tabId: owner.tabId,
					navigationGeneration: generation,
				})
			: this.focusSnapshot.request;
		if (
			generation === this.focusSnapshot.navigationGeneration &&
			JSON.stringify(request) === JSON.stringify(this.focusSnapshot.request)
		)
			return;
		this.focusSnapshot = Object.freeze({ navigationGeneration: generation, request });
		this.notifyFocus();
	}
	private notifyFocus(): void {
		for (const listener of [...this.focusListeners]) if (this.focusListeners.has(listener)) listener();
	}
	/** One subscription per successfully leased View, removed before the View releases that lease. */
	subscribeFocusPresentation = (listener: () => void): (() => void) => {
		this.focusListeners.add(listener);
		return () => {
			this.focusListeners.delete(listener);
		};
	};
	getFocusPresentation = (): FocusPresentationSnapshot => {
		this.refreshFocusPresentation();
		return this.focusSnapshot;
	};
	private beginFocus(target: ManagedRuntimeRef, context: FocusContext, revision: number): FocusOwner | undefined {
		if (revision !== this.presentationRevision || (context.intent && !context.intent.valid())) return undefined;
		if (this.focusOwner) this.finishFocus(this.focusOwner, 'cancelled');
		const owner: FocusOwner = {
			id: ++this.focusId,
			target: { ...target },
			context,
			expectedRevision: revision,
			phase: 'selecting',
			navigationGeneration: this.getFocusPresentation().navigationGeneration,
		};
		this.focusOwner = owner;
		this.refreshFocusPresentation();
		return owner;
	}
	private focusCurrent(owner: FocusOwner): boolean {
		return (
			this.focusOwner === owner &&
			!this.closing &&
			!this.disposed &&
			owner.expectedRevision === this.presentationRevision &&
			(owner.monotonicDeadline === undefined || performance.now() < owner.monotonicDeadline) &&
			(!owner.context.intent || owner.context.intent.valid())
		);
	}
	private advancePresentation(owner?: FocusOwner): boolean {
		if (owner && !this.focusCurrent(owner)) return false;
		this.presentationRevision++;
		if (owner) owner.expectedRevision++;
		return true;
	}
	private releaseFocusContext(context: FocusContext): void {
		if (context.released) return;
		context.released = true;
		context.intent?.dispose();
	}
	private finishFocus(
		owner: FocusOwner,
		phase: 'cancelled' | 'consumed',
		generation = this.focusSnapshot.navigationGeneration,
	): void {
		if (phase === 'consumed') owner.consumed = true;
		if (this.focusOwner !== owner) return;
		if (this.focusTimer !== undefined) this.focusClock.clearTimeout(this.focusTimer);
		this.focusTimer = undefined;
		this.focusOwner = undefined;
		this.releaseFocusContext(owner.context);
		this.focusSnapshot = Object.freeze({
			navigationGeneration: generation,
			request: Object.freeze({
				id: owner.id,
				phase,
				target: Object.freeze({ ...owner.target }),
				tabId: owner.tabId,
				navigationGeneration: owner.navigationGeneration,
			}),
		});
		this.notifyFocus();
	}
	/** Exact synchronous View call only. UI retains responsibility for its live View/term/textarea identity. */
	presentManagedFocus(
		captured: FocusPresentationSnapshot,
		runtimeId: string,
		textarea: HTMLElement,
		focus: () => void,
		mode: 'normal' | 'committed',
	): boolean {
		const current = this.getFocusPresentation();
		if (captured !== current || this.closing || this.disposed || !textarea.isConnected) return false;
		const tab = this.active;
		if (tab?.kind !== 'terminal' || tab.focusedSessionId !== runtimeId || !tab.sessionIds.includes(runtimeId))
			return false;
		if (mode === 'normal') {
			if (
				this.focusOwner ||
				this.paneFocusPreparations.size ||
				(current.request && current.navigationGeneration <= current.request.navigationGeneration)
			)
				return false;
			focus();
			return true;
		}
		const owner = this.focusOwner;
		if (
			!owner ||
			owner.phase !== 'committed' ||
			current.request?.id !== owner.id ||
			owner.tabId !== tab.id ||
			tab.panes[runtimeId]?.spaceId !== owner.target.spaceId ||
			tab.panes[runtimeId]?.persistentSessionId !== owner.target.sessionId ||
			owner.target.runtimeId !== runtimeId ||
			this.spaces?.store.getState().records.selectedSpaceId !== owner.target.spaceId
		)
			return false;
		if (!this.focusCurrent(owner) || owner.deadline === undefined || Date.now() >= owner.deadline) {
			this.finishFocus(owner, 'cancelled');
			return false;
		}
		try {
			this.sessions.checkManaged(owner.target);
		} catch {
			this.finishFocus(owner, 'cancelled');
			return false;
		}
		let accepted = false;
		try {
			accepted = owner.context.intent?.commitFocus?.(textarea, focus) ?? false;
			return accepted;
		} catch (error) {
			this.finishFocus(owner, 'cancelled');
			throw error;
		} finally {
			// Another live View can share this runtime in another leaf. Its rejected target must
			// not spend the valid original leaf's one capability or renew the deadline.
			if (accepted) this.finishFocus(owner, 'consumed');
			else if (!this.focusCurrent(owner)) this.finishFocus(owner, 'cancelled');
		}
	}
	private commitPresentation(owner: FocusOwner, tabId: string, deadline = Date.now() + 1000): boolean {
		if (!this.focusCurrent(owner)) return false;
		owner.tabId = tabId;
		owner.phase = 'committed';
		owner.deadline = Math.min(Date.now() + 1000, deadline);
		owner.context.transferred = true;
		const remaining =
			owner.monotonicDeadline === undefined
				? owner.deadline - Date.now()
				: owner.monotonicDeadline - performance.now();
		this.focusTimer = this.focusClock.setTimeout(
			() => this.finishFocus(owner, 'cancelled'),
			Math.max(0, remaining),
		);
		this.refreshFocusPresentation();
		return this.focusSnapshot.request?.id === owner.id && this.focusSnapshot.request.phase !== 'cancelled';
	}
	private focusPanePresentation(pane: CapturedPane, options: PaneOperationContext): Promise<PaneOperationResult> {
		const context: FocusContext = { intent: options.intent, transferred: false };
		const target = { spaceId: pane.spaceId, sessionId: pane.sessionId, runtimeId: pane.runtimeId ?? pane.leafKey };
		const owner = this.beginFocus(target, context, this.presentationRevision);
		if (!owner) {
			this.releaseFocusContext(context);
			return Promise.resolve({
				effect: 'none',
				layoutPublished: false,
				persisted: false,
				revision: 0,
				pane,
				focused: false,
				error: new PaneCommandError('CAPABILITY_UNAVAILABLE', 'display-intent-changed'),
			});
		}
		this.paneFocusPreparations.add(owner.id);
		let layout: PaneOperationResult = {
			effect: 'none',
			layoutPublished: false,
			persisted: false,
			revision: 0,
			pane,
			focused: false,
		};
		let cancelled = false,
			selecting = false,
			selected = false;
		const check = () => {
			if (cancelled || options.signal?.aborted) throw new PaneCommandError('WAIT_CANCELLED', 'focus-cancelled');
			if (options.deadline !== undefined && performance.now() >= options.deadline)
				throw new PaneCommandError('WAIT_TIMEOUT', 'focus-timeout');
			if (!this.focusCurrent(owner))
				throw new PaneCommandError('CAPABILITY_UNAVAILABLE', 'display-intent-changed');
			options.validate?.();
		};
		const facts = (effect: PaneOperationResult['effect'], error?: unknown): PaneOperationResult => ({
			...layout,
			effect: owner.consumed
				? 'completed'
				: effect === 'none' && owner.phase === 'committed'
					? 'partial'
					: effect,
			pane,
			focused: owner.consumed === true,
			focusRequestId: owner.id,
			layoutPublished: layout.layoutPublished || selected,
			persisted: layout.persisted || selected,
			...(error === undefined ? {} : { error }),
		});
		const work = (async (): Promise<PaneOperationResult> => {
			try {
				check();
				layout = await this.persistence.editLayout!(
					pane.spaceId,
					(view) => {
						const tab = view.tabs[pane.tabId];
						if (tab?.kind !== 'terminal' || tab.panes[pane.leafKey]?.paneId !== pane.paneId)
							throw new PaneCommandError('TARGET_NOT_FOUND', 'missing-pane');
						return activateTab(
							{ ...view, tabs: { ...view.tabs, [tab.id]: { ...tab, focusedSessionId: pane.leafKey } } },
							tab.id,
						);
					},
					{ ...options, validate: check },
				);
				if (layout.error) return { ...layout, pane, focused: false, focusRequestId: owner.id };
				check();
				if (this.spaces!.store.getState().records.selectedSpaceId !== pane.spaceId) {
					this.advancePresentation(owner);
					selecting = true;
					await this.spaces!.select(pane.spaceId);
					selecting = false;
					selected = true;
					check();
				}
				const runtime = this.getManaged(pane)?.runtime;
				if (!runtime || runtime.runtimeId !== pane.leafKey || runtime.phase !== 'connected')
					return facts(
						layout.layoutPublished || selected ? 'partial' : 'none',
						new PaneCommandError('SOURCE_UNAVAILABLE', 'terminal-not-running'),
					);
				this.sessions.checkManaged(target);
				const consumed = new Promise<boolean>((resolve, reject) => {
					let poll: unknown,
						finished = false;
					const fail = (error: unknown) => {
						if (finished) return;
						finished = true;
						off();
						if (poll !== undefined) this.focusClock.clearTimeout(poll);
						reject(
							error instanceof Error
								? error
								: new Error('Pane focus observation failed', { cause: error }),
						);
					};
					const observe = () => {
						if (finished) return;
						try {
							let value: boolean | undefined;
							if (owner.consumed) value = true;
							else {
								const request = this.getFocusPresentation().request;
								if (request?.id !== owner.id || request.phase === 'cancelled') value = false;
								else {
									try {
										check();
									} catch {
										this.finishFocus(owner, 'cancelled');
										value = false;
									}
								}
							}
							if (value !== undefined) {
								finished = true;
								off();
								if (poll !== undefined) this.focusClock.clearTimeout(poll);
								resolve(value);
							} else if (poll === undefined)
								poll = this.focusClock.setTimeout(() => {
									poll = undefined;
									observe();
								}, 16);
						} catch (error) {
							fail(error);
						}
					};
					const off = this.subscribeFocusPresentation(observe);
					try {
						owner.monotonicDeadline = Math.min(performance.now() + 1000, options.deadline ?? Infinity);
						const remaining = Math.max(0, owner.monotonicDeadline - performance.now());
						this.commitPresentation(owner, pane.tabId, Date.now() + Math.min(1000, remaining));
						observe();
					} catch (error) {
						fail(error);
					}
				});
				if (!(await consumed))
					return facts('partial', new PaneCommandError('CAPABILITY_UNAVAILABLE', 'focus-not-consumed'));
				return { ...facts('completed'), focused: true };
			} catch (error) {
				return facts(
					selecting ? 'unknown' : layout.persisted || layout.layoutPublished || selected ? 'partial' : 'none',
					error,
				);
			} finally {
				try {
					if (this.focusOwner === owner) this.finishFocus(owner, 'cancelled');
				} finally {
					try {
						this.releaseFocusContext(context);
					} finally {
						this.paneFocusPreparations.delete(owner.id);
					}
				}
				const request = this.focusSnapshot.request;
				// Late selection can publish after its observer ends. Keep automatic focus revoked at that exact navigation.
				if (request?.id === owner.id && request.phase === 'cancelled') {
					this.focusSnapshot = Object.freeze({
						...this.focusSnapshot,
						request: Object.freeze({
							...request,
							navigationGeneration: this.focusSnapshot.navigationGeneration,
						}),
					});
					this.notifyFocus();
				}
			}
		})().catch((error) =>
			facts(
				selecting ? 'unknown' : layout.persisted || layout.layoutPublished || selected ? 'partial' : 'none',
				error,
			),
		);
		return new Promise((resolve) => {
			let finished = false,
				timer: unknown;
			const finish = (result: PaneOperationResult) => {
				if (finished) return;
				finished = true;
				options.signal?.removeEventListener('abort', stop);
				if (timer !== undefined) this.focusClock.clearTimeout(timer);
				resolve(result);
			};
			const stop = () => {
				if (owner.consumed) return;
				cancelled = true;
				let error: unknown = new PaneCommandError(
					options.signal?.aborted ? 'WAIT_CANCELLED' : 'WAIT_TIMEOUT',
					'focus-observation-ended',
				);
				try {
					this.finishFocus(owner, 'cancelled');
				} catch (cause) {
					error = cause;
				}
				finish(
					facts(
						selecting || layout.effect === 'unknown'
							? 'unknown'
							: layout.persisted || layout.layoutPublished || selected
								? 'partial'
								: 'none',
						error,
					),
				);
			};
			options.signal?.addEventListener('abort', stop, { once: true });
			if (options.deadline !== undefined)
				timer = this.focusClock.setTimeout(stop, Math.max(0, options.deadline - performance.now()));
			void work.then(finish);
			if (options.signal?.aborted) stop();
		});
	}
	private refreshManaged(): void {
		if (!this.spaces || this.disposed) return;
		const records = this.spaces.store.getState().records;
		const summaries: ManagedSessionSummary[] = Object.values(records.sessions).map((record) => {
			const target = { spaceId: record.spaceId, sessionId: record.id };
			const entry = this.sessions.managedFor(target);
			let runtime = this.sessions.managedSummary(target);
			const activity = runtime?.activityDetail;
			if (activity?.completion && runtime && record.lastAttempt?.runtimeId === runtime.runtimeId) {
				const ref = { ...target, runtimeId: runtime.runtimeId };
				const accepted = this.spaces!.stageActivityHint(ref, {
					...activity.completion,
					seenThrough: Math.min(activity.seenThrough, activity.completion.activitySequence),
				});
				const failure = this.spaces!.activityHintError(ref);
				if ((!accepted || failure) && !runtime.error)
					runtime = Object.freeze({
						...runtime,
						error: normalizeManagedFailure(
							failure ?? new SpaceError('PERSISTENCE_FAILED', 'activity-hint-capacity'),
						),
					});
			}
			const layout =
				records.selectedSpaceId === record.spaceId ? this.store.getState() : records.layouts[record.spaceId];
			const attached =
				!!runtime &&
				Object.values(layout?.tabs ?? {}).some(
					(tab) => tab.kind === 'terminal' && tab.sessionIds.includes(runtime.runtimeId),
				);
			return {
				...target,
				kind: record.kind,
				title: this.sessions.get(runtime?.runtimeId ?? '')?.title ?? record.title,
				archived: !!record.archived || !!records.spaces[record.spaceId]?.archived,
				restore:
					!runtime ||
					!['launch-pending', 'connected'].includes(runtime.phase) ||
					runtime.stop?.outcome === 'confirmed'
						? (() => {
								// Only a fresh metadata-only import proves there was no HUHU attempt.
								// Adopted provenance leaves an older unknown runtime history unknown.
								const imported = isNeverStartedImport(record) && !!record.agentId;
								const confirmed =
									!!record.lastAttempt?.termination &&
									terminationConfirmed(record.lastAttempt.termination);
								return {
									state: imported || confirmed ? ('ended' as const) : ('unconfirmed' as const),
									canRequestContinue:
										!record.archived &&
										!records.spaces[record.spaceId]?.archived &&
										(imported || confirmed),
								};
							})()
						: undefined,
				createdAt: record.createdAt,
				agentId: record.agentId,
				accountId: record.accountId,
				runtime,
				completionHint: record.completionHint ? Object.freeze({ ...record.completionHint }) : undefined,
				viewState: !runtime
					? 'restored'
					: attached
						? 'attached'
						: entry?.everAttached
							? 'detached'
							: 'background',
			};
		});
		if (JSON.stringify(summaries) === JSON.stringify(this.managedSnapshot.sessions)) return;
		this.managedSnapshot = Object.freeze({
			revision: this.managedSnapshot.revision + 1,
			sessions: Object.freeze(
				summaries.map((summary) =>
					Object.freeze({
						...summary,
						restore: summary.restore ? Object.freeze({ ...summary.restore }) : undefined,
					}),
				),
			),
		});
		for (const listener of [...this.managedListeners]) listener();
	}
	/** Cached immutable projection; reading/subscribing never activates native resources. */
	getManagedSnapshot = (): ManagedSnapshot => this.managedSnapshot;
	subscribeManaged = (listener: () => void): (() => void) => {
		this.managedListeners.add(listener);
		return () => {
			this.managedListeners.delete(listener);
		};
	};
	getManaged(target: ManagedSessionTarget): ManagedSessionSummary | undefined {
		return this.managedSnapshot.sessions.find(
			(session) => session.sessionId === target.sessionId && session.spaceId === target.spaceId,
		);
	}
	listManaged(spaceId: string): readonly ManagedSessionSummary[] {
		return this.managedSnapshot.sessions.filter((session) => session.spaceId === spaceId);
	}
	/** Strict programmatic entry: explicit Space, background by default, no dialogs. */
	/** Capture synchronously, before the router waits for scope and execution admission. */
	captureManagedCreate(request: ManagedCreateRequest): CapturedManagedCreate {
		const launch = this.launch.capture?.() ?? this.launch;
		const captured: ManagedCreateRequest = Object.freeze(
			request.kind === 'agent'
				? { ...request, accountId: request.accountId ?? launch.account(request.agentId) }
				: { ...request },
		);
		const revision = this.presentationRevision;
		const context: FocusContext = {
			intent: captured.foreground ? launch.foreground?.() : undefined,
			transferred: false,
		};
		let handed = false,
			released = false,
			observationError: Error | undefined;
		const observationFailed = (error: unknown) => {
			observationError ??= new Error(
				error instanceof Error ? error.message.slice(0, 200) : 'Reservation observation failed',
			);
		};
		return {
			get observationError() {
				return observationError;
			},
			execute: (onReserved) => {
				if (handed || released)
					return Promise.resolve({
						status: 'failed',
						effect: 'none',
						error: managedFailure('STALE_RUNTIME', 'capture-used'),
					});
				handed = true;
				const reserved = (ref: ManagedRuntimeRef) => {
					try {
						const result = onReserved?.(Object.freeze({ ...ref }));
						if (result) void result.catch(observationFailed);
					} catch (error) {
						observationFailed(error);
					}
				};
				return this.createManagedWithContext(captured, false, {
					launch,
					revision,
					context,
					onReserved: reserved,
				});
			},
			dispose: () => {
				if (handed || released) return;
				released = true;
				this.releaseFocusContext(context);
			},
		};
	}
	/** Save the business name first, then project the latest saved value into the current runtime. */
	async renameManaged(target: ManagedSessionTarget, title: string): Promise<ManagedSessionSummary> {
		const captured = { ...target };
		if (this.disposed || this.closing || !this.spaces)
			throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'), 'none');
		await this.spaces.renameSession(captured, title);
		const record = this.spaces.store.getState().records.sessions[captured.sessionId];
		if (!record || record.spaceId !== captured.spaceId) throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
		if (!this.disposed) this.sessions.renameManaged(record);
		this.refreshManaged();
		const summary = this.getManaged(captured);
		if (!summary) throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
		return summary;
	}
	createManaged(request: ManagedCreateRequest): Promise<ManagedCreateResult> {
		return this.createManagedWithContext(request, false);
	}
	/** GUI entry: approval permission is independent of foreground/background display. */
	createManagedInteractive(request: InteractiveLaunchRequest): Promise<ManagedCreateResult> {
		return this.createManagedWithContext({ ...request, foreground: request.foreground ?? true }, true);
	}
	private async createManagedWithContext(
		request: InteractiveLaunchRequest,
		interactive: boolean,
		captured?: {
			launch: WorkspaceLaunchPort;
			revision: number;
			context: FocusContext;
			onReserved?: (target: ManagedRuntimeRef) => void;
		},
	): Promise<ManagedCreateResult> {
		const launch = captured?.launch ?? this.launch.capture?.() ?? this.launch;
		let ref: ManagedRuntimeRef | undefined;
		let launched = false;
		let revision = captured?.revision ?? this.presentationRevision;
		let intent = captured
			? captured.context.intent
			: request.foreground && request.spaceId
				? launch.foreground?.()
				: undefined;
		const context: FocusContext = captured?.context ?? { intent, transferred: false };
		try {
			if (this.disposed || this.closing)
				throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'), 'none');
			if (!this.spaces)
				throw new ManagedLaunchError(managedFailure('CAPABILITY_UNAVAILABLE', 'space-unavailable'), 'none');
			const title =
				request.title?.trim() ||
				(request.kind === 'agent' ? getAgent(request.agentId).title : t('agent.workspace.newTerminal'));
			if (title.length > 200 || Array.from(title).some((char) => char.charCodeAt(0) < 32))
				throw new SpaceError('INVALID_ARGUMENT', 'invalid-name');
			const accountId =
				request.kind === 'agent' ? (request.accountId ?? launch.account(request.agentId)) : undefined;
			const space = await this.spaces.requireSpace(request.spaceId, { interactive });
			if (!space) return { status: 'cancelled', effect: 'none', reason: 'space-selection' };
			if (!request.spaceId && request.foreground) {
				revision = this.presentationRevision;
				intent = launch.foreground?.();
				context.intent = intent;
			}
			let startCwd: string | undefined;
			if (request.cwd) {
				const spaceCwd = await this.spaces.resolveSpaceCwd(space.id);
				// The Space directory's own spelling tells the path flavour; no process or window global is needed.
				startCwd = spaceBoundCwd(
					spaceCwd,
					request.cwd,
					request.cwdScope?.vaultRoot ?? '',
					request.cwdScope?.platform ?? (/^(?:[A-Za-z]:|\\\\)/.test(spaceCwd) ? 'win32' : 'linux'),
				);
				if (!startCwd) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'cwd-outside-space');
			}
			const admission = await this.spaces.prepareSession(space.id, {
				kind: request.kind,
				title,
				agentId: request.kind === 'agent' ? request.agentId : undefined,
				accountId,
				shell: request.kind === 'shell' ? request.shell : undefined,
			});
			// There is deliberately no await between verified commit and publishing this identity.
			ref = this.sessions.reserveManaged(admission.record, request.title?.trim());
			captured?.onReserved?.(ref);
			const options = {
				cwd: startCwd ?? admission.cwd,
				beforeSpawn: admission.beforeSpawn,
				runtime: ref,
				interactive,
				intent,
			};
			const session =
				request.kind === 'shell'
					? await launch.shell({ ...options, shell: request.shell })
					: await launch.agent(request.agentId, { ...options, accountId: admission.record.accountId });
			if (!session) {
				this.failLaunch(ref, undefined, true);
				return {
					status: 'cancelled',
					effect: 'partial',
					reason: 'permission-confirmation',
					session: this.getManaged(ref),
				};
			}
			this.sessions.checkManaged(ref);
			if (session.id !== ref.runtimeId)
				throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'reservation-mismatch'));
			if (this.disposed) {
				this.sessions.remove(session.id);
				throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'));
			}
			if (session.connection === 'failed') {
				if (
					this.sessions.managedFor(ref)?.stage === 'spawn-sent' &&
					normalizeManagedFailure(session.failureCause).code === 'EFFECT_UNKNOWN'
				)
					throw new ManagedLaunchError(managedFailure('EFFECT_UNKNOWN', 'spawn-result-lost'), 'unknown');
				throw session.failureCause instanceof Error ? session.failureCause : new Error(session.error);
			}
			if (session.connection === 'disconnected')
				throw new ManagedLaunchError(managedFailure('EFFECT_UNKNOWN', 'spawn-result-lost'), 'unknown');
			launched = true;
			if (request.title?.trim())
				session.rename(this.spaces.store.getState().records.sessions[ref.sessionId]?.title ?? title);
			if (request.foreground && revision === this.presentationRevision && (!intent || intent.valid())) {
				const attached = await this.attachWithContext(
					ref,
					{
						expectedRuntimeId: ref.runtimeId,
						groupId: request.groupId,
					},
					context,
				);
				if (attached.status === 'failed' && attached.error.reason !== 'display-intent-changed')
					throw new ManagedLaunchError(attached.error);
				if (
					attached.status === 'attached' &&
					this.active?.id === attached.tabId &&
					(!intent || intent.valid())
				) {
					try {
						await launch.show?.(session.id);
					} catch {
						throw new ManagedLaunchError(managedFailure('CAPABILITY_UNAVAILABLE', 'display-unavailable'));
					}
				}
			}
			this.refreshManaged();
			const summary = this.getManaged(ref)!;
			return { status: 'created', effect: 'completed', session: { ...summary, runtime: summary.runtime! } };
		} catch (cause) {
			const error = normalizeManagedFailure(cause);
			if (ref && !launched && !this.disposed) this.failLaunch(ref, error);
			const effect =
				cause instanceof ManagedLaunchError
					? cause.effect === 'completed'
						? 'partial'
						: cause.effect
					: ref
						? 'partial'
						: error.code === 'PERSISTENCE_FAILED'
							? 'unknown'
							: 'none';
			return { status: 'failed', effect, error, session: ref ? this.getManaged(ref) : undefined };
		} finally {
			if (!context.transferred) this.releaseFocusContext(context);
		}
	}
	/** Attach an existing generation only. Pending and restored records never spawn as a side effect. */
	async attachManaged(
		target: ManagedSessionTarget,
		options: { expectedRuntimeId?: string; focus?: boolean; groupId?: string } = {},
	): Promise<ManagedAttachResult> {
		const context: FocusContext = {
			intent: (options.focus ?? true) ? this.launch.foreground?.() : undefined,
			transferred: false,
		};
		return this.attachWithContext(target, options, context);
	}
	private async attachWithContext(
		target: ManagedSessionTarget,
		options: { expectedRuntimeId?: string; focus?: boolean; groupId?: string },
		context: FocusContext,
	): Promise<ManagedAttachResult> {
		const captured = { ...target },
			focus = options.focus ?? true,
			revision = this.presentationRevision;
		let owner: FocusOwner | undefined;
		try {
			const summary = this.getManaged(captured),
				runtime = summary?.runtime;
			if (!summary)
				return {
					status: 'failed',
					target: captured,
					error: managedFailure('TARGET_NOT_FOUND', 'missing-session'),
				};
			if (options.expectedRuntimeId && options.expectedRuntimeId !== runtime?.runtimeId)
				return {
					status: 'failed',
					target: captured,
					error: managedFailure('STALE_RUNTIME', 'runtime-changed'),
				};
			if (!runtime) return { status: 'not-running', target: captured };
			const ref = { ...captured, runtimeId: runtime.runtimeId };
			if (runtime.phase === 'launch-pending') return { status: 'pending', target: ref };
			const session = this.sessions.get(runtime.runtimeId);
			if (!session) return { status: 'not-running', target: captured };
			if (this.disposed || this.closing)
				return { status: 'failed', target: captured, error: managedFailure('MODULE_INACTIVE', 'module-off') };
			if (focus) owner = this.beginFocus(ref, context, revision);
			const key = runtime.runtimeId;
			let operation = this.attaching.get(key);
			if (!operation) {
				operation = this.ensureManagedPane(ref, session, options.groupId);
				this.attaching.set(key, operation);
			}
			let tabId: string;
			try {
				tabId = await operation;
			} finally {
				if (this.attaching.get(key) === operation) this.attaching.delete(key);
			}
			this.sessions.checkManaged(ref);
			if (!focus || !owner || !this.focusCurrent(owner))
				return { status: 'attached', target: ref, tabId, focused: false };
			if (this.spaces && this.spaces.store.getState().records.selectedSpaceId !== captured.spaceId) {
				await this.persistence.flush();
				if (!this.focusCurrent(owner)) return { status: 'attached', target: ref, tabId, focused: false };
				await this.selectSpaceForPresentation(captured.spaceId, owner);
				if (!this.focusCurrent(owner)) return { status: 'attached', target: ref, tabId, focused: false };
			}
			if (this.disposed || this.closing)
				return { status: 'failed', target: captured, error: managedFailure('MODULE_INACTIVE', 'module-off') };
			this.sessions.checkManaged(ref);
			const tab = this.store.getState().tabs[tabId];
			if (tab?.kind !== 'terminal' || !tab.sessionIds.includes(ref.runtimeId))
				return { status: 'attached', target: ref, tabId, focused: false };
			this.focusSessionForPresentation(ref.runtimeId, owner);
			const focused = this.commitPresentation(owner, tabId);
			return { status: 'attached', target: ref, tabId, focused };
		} catch (cause) {
			return { status: 'failed', target: captured, error: normalizeManagedFailure(cause) };
		} finally {
			if (owner && !context.transferred) this.finishFocus(owner, 'cancelled');
			if (!context.transferred) this.releaseFocusContext(context);
		}
	}
	/** Only pane creation is shared. Every caller retains its own foreground permission. */
	private async ensureManagedPane(
		ref: ManagedRuntimeRef,
		session: TerminalSession,
		groupId?: string,
	): Promise<string> {
		this.sessions.checkManaged(ref);
		if (this.spaces && this.persistence.readLayoutNow && this.persistence.editLayout) {
			const result = await this.panes.attach(ref, { groupId });
			if (result.error || !result.pane)
				throw new ManagedLaunchError(
					normalizeManagedFailure(result.error ?? new Error('Missing attached Pane')),
					result.effect,
				);
			return result.pane.tabId;
		}
		if (this.spaces && this.spaces.store.getState().records.selectedSpaceId !== ref.spaceId) {
			const tab = this.terminalTab(session);
			let tabId = tab.id;
			await this.spaces.updateLayout(ref.spaceId, (layout) => {
				this.sessions.checkManaged(ref);
				const found = Object.values(layout.tabs).find(
					(t) => t.kind === 'terminal' && t.sessionIds.includes(ref.runtimeId),
				);
				if (found) {
					tabId = found.id;
					return layout;
				}
				return openTab(layout, undefined, tab);
			});
			this.sessions.markAttached(ref.runtimeId);
			return tabId;
		}
		const attached = this.attach(session, groupId, undefined, false);
		if (!attached) throw new ManagedLaunchError(managedFailure('CAPABILITY_UNAVAILABLE', 'pane-capacity'), 'none');
		return attached;
	}
	/** B calls this only after real rendering; this boundary independently checks identity and layout. */
	async markManagedSeen(request: ManagedSeenRequest, options: ManagedSeenOptions = {}): Promise<ManagedSeenResult> {
		const target = { ...request.target },
			at = { ...request.at },
			view = { ...request.view };
		const rejected = (
			reason: 'stale-runtime' | 'invalid-mark' | 'not-presented' | 'missing-record',
		): ManagedSeenResult => ({ status: 'rejected', target, persisted: false, reason });
		const record = this.spaces?.store.getState().records.sessions[target.sessionId];
		if (!record || record.spaceId !== target.spaceId) return rejected('missing-record');
		if (at.runtimeId !== target.runtimeId || record.lastAttempt?.runtimeId !== target.runtimeId)
			return rejected('stale-runtime');
		if (!Number.isSafeInteger(at.activitySequence) || at.activitySequence < 0) return rejected('invalid-mark');
		const tab = this.store.getState().tabs[view.tabId];
		if (
			this.disposed ||
			this.closing ||
			this.spaces?.store.getState().records.selectedSpaceId !== target.spaceId ||
			!this.isVisible(view.tabId) ||
			this.active?.id !== view.tabId ||
			tab?.kind !== 'terminal' ||
			tab.focusedSessionId !== view.paneSessionId ||
			!tab.sessionIds.includes(view.paneSessionId) ||
			tab.panes[view.paneSessionId]?.persistentSessionId !== target.sessionId
		)
			return rejected('not-presented');
		let seenThrough: number,
			status: 'updated' | 'unchanged',
			mode: 'runtime' | 'restored-hint',
			hint: ActivityCompletionHint | undefined;
		try {
			if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'activity-wait-cancelled');
			const entry = this.sessions.managedFor(target),
				session = this.sessions.get(target.runtimeId);
			if (entry && entry.ref.runtimeId !== target.runtimeId) return rejected('stale-runtime');
			if (session && entry) {
				if (view.paneSessionId !== session.id) return rejected('not-presented');
				const update = session.markActivitySeen(at);
				if (update.status === 'rejected') return rejected(update.reason);
				seenThrough = update.seenThrough;
				status = update.status;
				mode = 'runtime';
				const snapshot = session.getActivitySnapshot();
				if (snapshot.completion)
					hint = {
						...snapshot.completion,
						seenThrough: Math.min(seenThrough, snapshot.completion.activitySequence),
					};
			} else {
				hint = record.completionHint;
				if (!hint || hint.runtimeId !== at.runtimeId) return rejected('stale-runtime');
				if (at.activitySequence > hint.activitySequence) return rejected('invalid-mark');
				seenThrough = Math.max(hint.seenThrough, at.activitySequence);
				status = seenThrough === hint.seenThrough ? 'unchanged' : 'updated';
				mode = 'restored-hint';
				hint = { ...hint, seenThrough };
			}
			if (hint) await this.spaces.observeActivityHint(target, hint, options);
			return { status, target, at, seenThrough, mode, persisted: true };
		} catch (cause) {
			return {
				status: 'failed',
				target,
				at,
				persisted: false,
				effect: options.signal?.aborted ? 'partial' : 'unknown',
				error: normalizeManagedFailure(cause),
			};
		}
	}

	private failLaunch(ref: ManagedRuntimeRef, error?: ReturnType<typeof managedFailure>, cancelled = false): void {
		if (this.sessions.managedFor(ref)?.ref.runtimeId === ref.runtimeId)
			this.sessions.failManaged(ref, error, cancelled);
	}
	/** Display a persistent record only. The placeholder is never registered with TerminalSessions. */
	async openManagedRecord(
		target: ManagedSessionTarget,
	): Promise<
		| { status: 'opened'; target: ManagedSessionTarget; tabId: string }
		| { status: 'failed'; target: ManagedSessionTarget; error: ReturnType<typeof managedFailure> }
	> {
		const captured = { ...target },
			revision = this.presentationRevision,
			intent = this.launch.foreground?.();
		const context: FocusContext = { intent, transferred: false };
		try {
			if (!this.spaces || this.closing || this.disposed)
				throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'));
			await this.spaces.ready;
			const record = this.spaces.store.getState().records.sessions[captured.sessionId];
			if (!record || record.spaceId !== captured.spaceId)
				throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
			const runtime = this.getManaged(captured)?.runtime;
			if (runtime?.phase === 'launch-pending')
				throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'attempt-pending'));
			if (runtime && this.sessions.get(runtime.runtimeId)?.running) {
				if (revision !== this.presentationRevision || (intent && !intent.valid()))
					throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'display-intent-changed'));
				const attached = await this.attachWithContext(
					captured,
					{ expectedRuntimeId: runtime.runtimeId },
					context,
				);
				if (attached.status === 'attached')
					return { status: 'opened', target: captured, tabId: attached.tabId };
				throw new ManagedLaunchError(
					attached.status === 'failed'
						? attached.error
						: managedFailure('SOURCE_UNAVAILABLE', 'attempt-pending'),
				);
			}
			await this.persistence.flush();
			if (revision !== this.presentationRevision || (intent && !intent.valid()))
				throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'display-intent-changed'));
			let expectedRevision = revision;
			if (this.spaces.store.getState().records.selectedSpaceId !== record.spaceId) {
				await this.selectSpace(record.spaceId);
				expectedRevision++;
			}
			if (
				this.closing ||
				this.disposed ||
				expectedRevision !== this.presentationRevision ||
				(intent && !intent.valid())
			)
				throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'display-intent-changed'));
			const state = this.store.getState();
			const existing = Object.values(state.tabs).find(
				(tab): tab is TerminalTabData =>
					tab.kind === 'terminal' &&
					Object.values(tab.panes).some(
						(info) => info.persistentSessionId === record.id && info.spaceId === record.spaceId,
					),
			);
			if (existing) {
				// An authoritative attempt may deliberately have cleared an older Pane's resume source.
				const bind = (info: ResumeInfo): ResumeInfo =>
					info.persistentSessionId === record.id && info.spaceId === record.spaceId
						? {
								...info,
								agentId: record.agentId,
								accountId: record.accountId,
								shell: record.shell,
								nativeSessionId: record.nativeSessionId,
								transcriptPath: record.transcriptPath,
							}
						: info;
				this.update((layout) => ({
					...layout,
					tabs: {
						...layout.tabs,
						[existing.id]: {
							...existing,
							panes: Object.fromEntries(
								Object.entries(existing.panes).map(([id, info]) => [id, bind(info)]),
							),
							resume: existing.resume ? bind(existing.resume) : undefined,
						},
					},
				}));
				this.activate(existing.id);
				return { status: 'opened', target: captured, tabId: existing.id };
			}
			const id = record.lastAttempt?.runtimeId ?? `restored-${record.id}`;
			const info: ResumeInfo = {
				spaceId: record.spaceId,
				persistentSessionId: record.id,
				cwd: '',
				shell: record.shell,
				agentId: record.agentId,
				accountId: record.accountId,
				nativeSessionId: record.nativeSessionId,
				transcriptPath: record.transcriptPath,
			};
			const tab: TerminalTabData = {
				kind: 'terminal',
				id: `tab-${crypto.randomUUID()}`,
				title: record.title,
				agentId: record.agentId,
				sessionIds: [id],
				focusedSessionId: id,
				paneLayout: { kind: 'pane', session: id },
				panes: { [id]: info },
				resume: info,
				state: 'unknown',
				unread: false,
				createdAt: record.createdAt,
				updatedAt: record.createdAt,
			};
			this.update((layout) => openTab(layout, undefined, tab));
			return { status: 'opened', target: captured, tabId: tab.id };
		} catch (cause) {
			return { status: 'failed', target: captured, error: normalizeManagedFailure(cause) };
		} finally {
			if (!context.transferred) this.releaseFocusContext(context);
		}
	}

	/** Starts one stop effect synchronously; cancellation and timeout apply only to this observer. */
	stopManaged(ref: ManagedRuntimeRef, options: ManagedStopOptions = {}): Promise<StopResult> {
		try {
			this.sessions.requestManagedStop(ref, options.force);
		} catch (cause) {
			return Promise.resolve(this.stopFailure(ref, normalizeManagedFailure(cause)));
		}
		return this.waitManagedStop(ref, options);
	}
	async waitManagedStop(
		ref: ManagedRuntimeRef,
		options: Omit<ManagedStopOptions, 'force'> = {},
	): Promise<StopResult> {
		try {
			this.sessions.checkManaged(ref);
			const initial = this.sessions.stopObservation(ref);
			const deadline = Math.min(
				initial.deadline,
				Date.now() + Math.max(0, options.timeoutMs ?? NATIVE_TERMINATION_OBSERVE_MS),
			);
			let waitError: 'WAIT_TIMEOUT' | 'WAIT_CANCELLED' | undefined;
			if (!initial.settled)
				waitError = await new Promise((resolve) => {
					let timer: unknown;
					let off: (() => void) | undefined;
					let finished = false;
					const done = (error?: 'WAIT_TIMEOUT' | 'WAIT_CANCELLED') => {
						if (finished) return;
						finished = true;
						if (timer !== undefined) this.sessions.clock.clearTimeout(timer);
						off?.();
						options.signal?.removeEventListener('abort', abort);
						resolve(error);
					};
					const abort = () => done('WAIT_CANCELLED');
					const check = () => {
						try {
							if (this.sessions.stopObservation(ref).settled) done();
						} catch {
							done();
						}
					};
					off = this.sessions.subscribe(check);
					options.signal?.addEventListener('abort', abort, { once: true });
					timer = this.sessions.clock.setTimeout(
						() => {
							this.sessions.settleManagedDeadline(ref);
							done('WAIT_TIMEOUT');
						},
						Math.max(0, deadline - Date.now()),
					);
					if (options.signal?.aborted) abort();
					else check();
				});
			const observed = this.sessions.stopObservation(ref);
			if (waitError)
				return {
					target: ref,
					status: 'pending',
					effect: 'unknown',
					termination: observed.evidence,
					persisted: false,
					error: managedFailure(
						waitError,
						waitError === 'WAIT_CANCELLED' ? 'wait-cancelled' : 'wait-timeout',
					),
				};
			let persisted = false;
			try {
				const checkpoint =
					this.spaces?.checkpointAttempt(
						ref,
						observed.evidence,
						observed.requestedAt,
						this.resumeCheckpoint(ref.runtimeId),
					) ?? Promise.resolve();
				const receipt = await observeCheckpoint(checkpoint, deadline, options.signal);
				if (receipt)
					return {
						target: ref,
						status: 'pending',
						effect: 'partial',
						termination: observed.evidence,
						persisted: false,
						error: managedFailure(
							receipt,
							receipt === 'WAIT_CANCELLED' ? 'wait-cancelled' : 'wait-timeout',
						),
					};
				persisted = !!this.spaces;
			} catch (cause) {
				return {
					target: ref,
					status: 'failed',
					effect: 'partial',
					termination: observed.evidence,
					persisted,
					error: normalizeManagedFailure(cause),
				};
			}
			return {
				target: ref,
				status: observed.settled && terminationConfirmed(observed.evidence) ? 'stopped' : 'pending',
				effect: observed.settled && terminationConfirmed(observed.evidence) ? 'completed' : 'unknown',
				termination: observed.evidence,
				persisted,
				...(waitError
					? {
							error: managedFailure(
								waitError,
								waitError === 'WAIT_CANCELLED' ? 'wait-cancelled' : 'wait-timeout',
							),
						}
					: {}),
			};
		} catch (cause) {
			return this.stopFailure(ref, normalizeManagedFailure(cause));
		}
	}
	private stopFailure(ref: ManagedRuntimeRef, error: ReturnType<typeof managedFailure>): StopResult {
		return {
			target: ref,
			status: 'failed',
			effect: 'none',
			persisted: false,
			termination: unknownTermination(),
			error,
		};
	}
	previewArchive(scope: ArchiveScope): Promise<ArchivePlan> {
		if (this.disposed || this.closing || !this.spaces)
			return Promise.reject(new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off')));
		return this.spaces.inspectArchive(scope);
	}
	async archiveManaged(
		plan: ArchivePlan,
		options: { timeoutMs?: number; signal?: AbortSignal } = {},
	): Promise<ArchiveResult> {
		const captured = structuredClone(plan),
			rows = new Map<string, ArchiveRow>();
		const deadline = Date.now() + Math.max(0, options.timeoutMs ?? NATIVE_TERMINATION_OBSERVE_MS);
		const started = new Set<string>(),
			startFailures = new Map<string, ReturnType<typeof managedFailure>>();
		let active = true,
			primaryStarted = false;
		const guard = () => {
			if (!active || options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'wait-cancelled');
			if (Date.now() >= deadline) throw new SpaceError('WAIT_TIMEOUT', 'wait-timeout');
			if (this.closing || this.disposed) throw new SpaceError('SOURCE_UNAVAILABLE', 'module-closing');
		};
		const resultRows = () => structuredClone([...rows.values()]);
		const failed = (cause: unknown): ArchiveResult => {
			const error = normalizeManagedFailure(cause);
			return {
				scope: captured.scope,
				status: error.code === 'WAIT_CANCELLED' || error.code === 'WAIT_TIMEOUT' ? 'incomplete' : 'failed',
				effect: primaryStarted ? 'unknown' : rows.size || started.size ? 'partial' : 'none',
				rows: resultRows(),
				error,
			};
		};
		const operation = (async (): Promise<ArchiveResult> => {
			let permit: Awaited<ReturnType<SpaceService['acquireArchive']>> | undefined;
			try {
				if (!this.spaces) throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'));
				guard();
				permit = await this.spaces.acquireArchive(captured, guard);
				guard();
				for (const member of permit.plan.members) {
					const entry = this.sessions.managedFor(member);
					rows.set(member.sessionId, {
						target: member,
						status: 'incomplete',
						effect: 'unknown',
						persisted: false,
					});
					if (entry && entry.ref.runtimeId === member.runtimeId) {
						try {
							this.sessions.requestManagedStop(entry.ref);
							started.add(member.sessionId);
						} catch (cause) {
							startFailures.set(member.sessionId, normalizeManagedFailure(cause));
						}
					}
				}
				await Promise.all(
					permit.plan.members.map(async (member) => {
						let row: ArchiveRow;
						const failure = startFailures.get(member.sessionId),
							entry = this.sessions.managedFor(member);
						if (failure)
							row = {
								target: member,
								status: 'failed',
								effect: 'unknown',
								persisted: false,
								error: failure,
							};
						else if (entry && entry.ref.runtimeId === member.runtimeId) {
							const stopped = await this.waitManagedStop(entry.ref, {
								...options,
								timeoutMs: Math.max(0, deadline - Date.now()),
							});
							row = {
								target: member,
								status:
									stopped.status === 'stopped'
										? 'stopped'
										: stopped.status === 'failed'
											? 'failed'
											: 'incomplete',
								effect: stopped.effect,
								termination: stopped.termination,
								persisted: stopped.persisted,
								error: stopped.error,
							};
						} else {
							const record = this.spaces!.store.getState().records.sessions[member.sessionId]!;
							const neverStartedImport = isNeverStartedImport(record);
							let evidence = neverStartedImport ? notStarted() : record.lastAttempt?.termination;
							if (!evidence && member.runtimeId && this.spaces!.admittedThisActivation(member.runtimeId))
								evidence = notStarted();
							row = {
								target: member,
								status: evidence && terminationConfirmed(evidence) ? 'not-running' : 'incomplete',
								effect: evidence && terminationConfirmed(evidence) ? 'completed' : 'unknown',
								termination: evidence,
								persisted: neverStartedImport,
							};
							rows.set(member.sessionId, row);
							if (evidence && member.runtimeId) {
								try {
									await this.spaces!.checkpointAttempt(
										{ ...member, runtimeId: member.runtimeId },
										evidence,
									);
									row = { ...row, persisted: true };
								} catch (cause) {
									row = {
										...row,
										status: 'failed',
										effect: 'partial',
										error: normalizeManagedFailure(cause),
									};
								}
							}
						}
						rows.set(member.sessionId, row);
					}),
				);
				guard();
				if (
					[...rows.values()].some(
						(row) => !row.persisted || !row.termination || !terminationConfirmed(row.termination),
					)
				)
					return {
						scope: captured.scope,
						status: 'incomplete',
						effect: rows.size ? 'partial' : 'none',
						rows: resultRows(),
					};
				await this.persistence.flush();
				guard();
				await this.spaces.commitArchive(permit, guard, () => {
					primaryStarted = true;
				});
				return { scope: captured.scope, status: 'archived', effect: 'completed', rows: resultRows() };
			} catch (cause) {
				return failed(cause);
			} finally {
				if (permit) this.spaces?.releaseArchive(permit);
			}
		})();
		this.archiveSettlements.add(operation);
		void operation.then((result) => {
			this.archiveSettlements.delete(operation);
			for (const error of [result.error, ...result.rows.map((row) => row.error)])
				if (error && (error.code === 'PERSISTENCE_FAILED' || error.code === 'OWNER_CONFLICT'))
					this.checkpointFailures.push(new ManagedLaunchError(error, result.effect));
		});
		try {
			return await observeLifecycle(
				operation,
				deadline,
				(reason) => new SpaceError(reason, reason === 'WAIT_CANCELLED' ? 'wait-cancelled' : 'wait-timeout'),
				options.signal,
			);
		} catch (cause) {
			active = false;
			return failed(cause);
		}
	}
	private resumeCheckpoint(runtimeId: string): { nativeSessionId?: string; transcriptPath?: string } | undefined {
		const session = this.sessions.get(runtimeId);
		return session
			? { nativeSessionId: session.nativeSessionId, transcriptPath: session.transcriptPath }
			: undefined;
	}

	private checkpointSettled(): void {
		if (!this.spaces || this.disposed) return;
		for (const summary of this.managedSnapshot.sessions) {
			const runtime = summary.runtime;
			if (!runtime?.termination || runtime.termination.cleanup.state === 'pending') continue;
			const ref = { spaceId: summary.spaceId, sessionId: summary.sessionId, runtimeId: runtime.runtimeId };
			const resume = this.resumeCheckpoint(ref.runtimeId);
			const fingerprint = JSON.stringify({ termination: runtime.termination, resume });
			if (this.checkpointed.get(ref.runtimeId) === fingerprint) continue;
			this.checkpointed.set(ref.runtimeId, fingerprint);
			this.checkpointTail = this.checkpointTail
				.then(() =>
					this.spaces!.checkpointAttempt(ref, runtime.termination!, runtime.stop?.requestedAt, resume),
				)
				.catch((cause) => {
					this.checkpointed.delete(ref.runtimeId);
					this.checkpointFailures.push(cause);
					this.launch.report(cause);
				});
		}
	}
	/** Close admission synchronously, then keep native output alive until all outcomes are checkpointed. */
	quiesce(): void {
		this.closing = true;
		if (this.focusOwner) this.finishFocus(this.focusOwner, 'cancelled');
		this.spaces?.quiesceLaunches();
		this.sessions.quiesce();
	}
	drainManaged(): Promise<void> {
		this.quiesce();
		this.draining ??= (async () => {
			const results = await Promise.all(
				this.managedSnapshot.sessions.flatMap((row) =>
					row.runtime
						? [
								this.waitManagedStop({
									spaceId: row.spaceId,
									sessionId: row.sessionId,
									runtimeId: row.runtime.runtimeId,
								}),
							]
						: [],
				),
			);
			await this.checkpointTail;
			await Promise.all([...this.archiveSettlements]);
			await this.persistence.flush();
			await this.spaces?.flush();
			const failures = results.filter((result) => result.status !== 'stopped' || !result.persisted);
			if (failures.length || this.checkpointFailures.length)
				throw new AggregateError(
					[...failures, ...this.checkpointFailures],
					t('agent.managed.shutdownIncomplete'),
				);
		})();
		this.drainObservation ??= observeLifecycle(
			this.draining,
			Date.now() + SHUTDOWN_OBSERVE_MS,
			() =>
				new AggregateError(
					[managedFailure('WAIT_TIMEOUT', 'wait-timeout')],
					t('agent.managed.shutdownIncomplete'),
				),
		);
		return this.drainObservation;
	}

	get browserAvailable(): boolean {
		return !!this.browser();
	}
	get active(): WorkspaceTab | undefined {
		return activeTab(this.store.getState());
	}
	private update(fn: (state: WorkspaceState) => WorkspaceState, layoutMutation = true): void {
		if (this.disposed || this.closing) return;
		if (layoutMutation && this.persistence.updateLayout) this.persistence.updateLayout(fn);
		else this.store.setState(fn, true);
	}
	private metadata(session: TerminalSession, shell?: ShellChoice): ResumeInfo {
		const ref = this.sessions.managedRef?.(session.id);
		const record = ref ? this.spaces?.store.getState().records.sessions[ref.sessionId] : undefined;
		return {
			...(ref ? { spaceId: ref.spaceId, persistentSessionId: ref.sessionId } : this.identities.get(session.id)),
			cwd: session.startCwd,
			agentId: record ? record.agentId : session.agentId,
			accountId: record
				? record.accountId
				: (session.accountId ?? (session.agentId ? this.launch.account(session.agentId) : undefined)),
			shell: record ? record.shell : shell,
			nativeSessionId: session.nativeSessionId ?? record?.nativeSessionId,
			transcriptPath: session.transcriptPath ?? record?.transcriptPath,
		};
	}
	private terminalTab(session: TerminalSession, shell?: ShellChoice): TerminalTabData {
		const info = this.metadata(session, shell);
		return {
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
	}

	attach(session: TerminalSession, groupId?: string, shell?: ShellChoice, focus = true): string | undefined {
		try {
			return this.attachDisplay(session, groupId, shell, focus);
		} catch (cause) {
			if (!(cause instanceof PaneCommandError) || cause.code !== 'CAPACITY_EXCEEDED') throw cause;
			this.report(cause);
			return undefined;
		}
	}
	private attachDisplay(
		session: TerminalSession,
		groupId: string | undefined,
		shell: ShellChoice | undefined,
		focus: boolean,
	): string {
		const found = Object.values(this.store.getState().tabs).find(
			(tab) => tab.kind === 'terminal' && tab.sessionIds.includes(session.id),
		);
		if (found) {
			this.sessions.markAttached?.(session.id);
			if (focus) this.focusSession(session.id);
			return found.id;
		}
		const tab = this.terminalTab(session, shell);
		const info = tab.panes[session.id]!;
		if (this.spaces && info.spaceId && info.spaceId !== this.spaces.store.getState().records.selectedSpaceId) {
			const existing = this.persistence.readLayoutNow?.(info.spaceId).view;
			const displayed =
				existing &&
				Object.values(existing.tabs).find(
					(row) => row.kind === 'terminal' && row.sessionIds.includes(session.id),
				);
			if (displayed) {
				this.sessions.markAttached?.(session.id);
				return displayed.id;
			}
			this.persistence.assertPaneCapacity?.(1);
			if (this.persistence.editLayout) {
				void this.persistence
					.editLayout(info.spaceId, (layout) => {
						const existing = Object.values(layout.tabs).find(
							(row) => row.kind === 'terminal' && row.sessionIds.includes(session.id),
						);
						return existing ? layout : openTab(layout, undefined, tab);
					})
					.then((result) => {
						if (result.error) this.report(result.error);
						else this.sessions.markAttached?.(session.id);
					});
				return tab.id;
			}
			void this.spaces
				.updateLayout(info.spaceId, (layout) => openTab(layout, undefined, tab))
				.then(() => {
					this.sessions.markAttached?.(session.id);
				})
				.catch((error) => this.report(error));
			return tab.id;
		}
		this.persistence.assertPaneCapacity?.(1);
		this.update((s) => {
			const next = openTab(s, groupId, tab);
			return focus
				? next
				: {
						...next,
						activeGroupId: s.activeGroupId,
						groups: next.groups.map((group) => {
							const previous = s.groups.find((item) => item.id === group.id);
							return previous
								? { ...group, activeTabId: previous.activeTabId, recentTabIds: previous.recentTabIds }
								: group;
						}),
					};
		});
		this.sessions.markAttached?.(session.id);
		if (focus) this.sessions.focus(session.id);
		return tab.id;
	}
	async newTerminal(
		options: { groupId?: string; shell?: ShellChoice; cwd?: string; cwdScope?: CwdScope; spaceId?: string } = {},
	): Promise<string | undefined> {
		if (this.spaces)
			return this.legacyManagedResult(
				await this.createManagedInteractive({
					kind: 'shell',
					spaceId: options.spaceId,
					groupId: options.groupId,
					shell: options.shell,
					cwd: options.cwd,
					cwdScope: options.cwdScope,
				}),
			);
		const captured = options.spaceId;
		await this.persistence.ready;
		if (this.disposed) return undefined;
		const admission = await this.admit(captured, {
			kind: 'shell',
			title: t('agent.workspace.newTerminal'),
			shell: options.shell,
		});
		if (this.spaces && !admission) return undefined;
		const session = await this.launch.shell({
			...options,
			cwd: admission?.cwd ?? options.cwd,
			beforeSpawn: admission?.beforeSpawn,
		});
		if (!session) return undefined;
		if (this.disposed) {
			this.sessions.remove(session.id);
			return undefined;
		}
		this.bindIdentity(session, admission);
		this.attach(session, options.groupId, options.shell);
		return session.id;
	}
	async newAgent(
		id: AgentId,
		options: { groupId?: string; cwd?: string; cwdScope?: CwdScope; prompt?: string; spaceId?: string } = {},
	): Promise<string | undefined> {
		if (this.spaces) {
			const result = await this.createManagedInteractive({
				kind: 'agent',
				agentId: id,
				spaceId: options.spaceId,
				groupId: options.groupId,
				cwd: options.cwd,
				cwdScope: options.cwdScope,
			});
			return this.legacyManagedResult(result);
		}
		const captured = options.spaceId;
		await this.persistence.ready;
		if (this.disposed) return undefined;
		const admission = await this.admit(captured, {
			kind: 'agent',
			title: id,
			agentId: id,
			accountId: this.launch.account(id),
		});
		if (this.spaces && !admission) return undefined;
		const session = await this.launch.agent(id, {
			...options,
			accountId: admission?.record.accountId,
			cwd: admission?.cwd ?? options.cwd,
			beforeSpawn: admission?.beforeSpawn,
		});
		if (!session) return undefined;
		if (this.disposed) {
			this.sessions.remove(session.id);
			return undefined;
		}
		this.bindIdentity(session, admission);
		this.attach(session, options.groupId);
		return session.id;
	}
	private legacyManagedResult(result: ManagedCreateResult): string | undefined {
		if (result.status === 'cancelled') return undefined;
		if (result.status === 'created') return result.session.runtime.runtimeId;
		if (result.session?.runtime && this.sessions.get(result.session.runtime.runtimeId))
			return result.session.runtime.runtimeId;
		throw new ManagedLaunchError(result.error, result.effect);
	}

	private bindIdentity(session: TerminalSession, admission?: SessionAdmission): void {
		if (admission && !this.sessions.managedRef?.(session.id))
			this.identities.set(session.id, {
				spaceId: admission.record.spaceId,
				persistentSessionId: admission.record.id,
			});
	}
	private async admit(
		spaceId: string | undefined,
		input: Parameters<SpaceService['prepareSession']>[1],
		existingSessionId?: string,
	): Promise<SessionAdmission | undefined> {
		if (!this.spaces) return undefined;
		const space = await this.spaces.requireSpace(spaceId, { interactive: true });
		if (!space || this.disposed) return undefined;
		if (!spaceId) await this.selectSpace(space.id);
		return this.spaces.prepareSession(space.id, input, existingSessionId);
	}
	async selectSpace(spaceId: string): Promise<void> {
		return this.selectSpaceForPresentation(spaceId);
	}
	private async selectSpaceForPresentation(spaceId: string, owner?: FocusOwner): Promise<void> {
		if (this.closing || this.disposed)
			throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'), 'none');
		if (!this.advancePresentation(owner)) return;
		if (!this.spaces) return;
		await this.persistence.flush();
		if (owner && !this.focusCurrent(owner)) return;
		await this.spaces.select(spaceId);
		this.sync();
	}
	newBrowser(input?: string, options: { groupId?: string; profileId?: string } = {}): void {
		this.presentationRevision++;
		const host = this.browser();
		if (!host) throw new Error(t('agent.workspace.browserDisabled'));
		const page = host.createPage({
			url: input
				? (host.resolveInput(input) ??
					(() => {
						throw new Error(t('browser.browser_invalid_url'));
					})())
				: undefined,
			profileId: options.profileId,
		});
		const tab: BrowserTabData = {
			kind: 'browser',
			id: `tab-${crypto.randomUUID()}`,
			pageId: page.id,
			title: page.title,
			url: page.url,
			profileId: page.profileId,
			zoom: 1,
			createdAt: Date.now(),
		};
		this.update((s) => openTab(s, options.groupId, tab));
	}
	/**
	 * Show a page (the board or usage) as a tab. A page that is already open is activated instead of opened
	 * again, so repeated clicks never stack tabs.
	 */
	openPage(page: PageKind, options: { resourceId?: string; groupId?: string } = {}): string | undefined {
		this.presentationRevision++;
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
	updateBrowser(tabId: string, state: BrowserViewState): void {
		this.update((s) => {
			const tab = s.tabs[tabId];
			if (tab?.kind !== 'browser') return s;
			const next = {
				...tab,
				url: state.url,
				title:
					state.title ||
					(state.url === 'about:blank' ? t('browser.newTab') : new URL(state.url).hostname || state.url),
				profileId: state.profileId ?? 'default',
				zoom: state.zoom,
				faviconUrl: state.favicon,
			};
			return JSON.stringify(next) === JSON.stringify(tab) ? s : { ...s, tabs: { ...s.tabs, [tabId]: next } };
		});
	}
	activate(tabId: string): void {
		this.activateForPresentation(tabId);
	}
	private activateForPresentation(tabId: string, owner?: FocusOwner): void {
		if (!this.advancePresentation(owner)) return;
		this.update((s) => activateTab(s, tabId));
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind === 'terminal') this.sessions.focus(tab.focusedSessionId);
	}
	focusSession(id: string): void {
		this.focusSessionForPresentation(id);
	}
	private focusSessionForPresentation(id: string, owner?: FocusOwner): void {
		const tab = Object.values(this.store.getState().tabs).find(
			(t): t is TerminalTabData => t.kind === 'terminal' && t.sessionIds.includes(id),
		);
		// A mounted view can echo the active pane's focus while Space selection is publishing.
		// This reconciles the native input target without revoking the caller's unchanged display intent.
		if (tab?.focusedSessionId === id && this.active?.id === tab.id && !tab.unread) {
			this.sessions.focus(id);
			return;
		}
		if (!this.advancePresentation(owner)) return;
		if (!tab) return;
		if (tab.focusedSessionId !== id)
			this.update((s) => ({ ...s, tabs: { ...s.tabs, [tab.id]: { ...tab, focusedSessionId: id } } }));
		if (this.active?.id !== tab.id || tab.unread) this.activateForPresentation(tab.id, owner);
		if (!owner || this.focusCurrent(owner)) this.sessions.focus(id);
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
		}, false);
	}
	refreshStates(): void {
		this.sync();
	}
	async close(tabId: string, confirm: ConfirmFn): Promise<void> {
		this.presentationRevision++;
		const tab = this.store.getState().tabs[tabId];
		if (!tab) return;
		if (tab.kind === 'browser') {
			const count =
				this.browser()
					?.getPage?.(tab.pageId)
					?.store.getState()
					.downloads.filter((d) => d.state === 'progressing').length ?? 0;
			if (count && !(await confirm(t('browser.closeDownloads', { count })))) return;
		}

		this.update((s) => closeTab(s, tabId));
		if (tab.kind === 'browser') this.browser()?.disposePage(tab.pageId);
	}
	async end(tabId: string, confirm: (message: string) => Promise<boolean>): Promise<void> {
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind !== 'terminal') return;
		const captured = tab.sessionIds.map((id) => ({
			id,
			session: this.sessions.get(id),
			ref: this.sessions.managedRef(id),
		}));
		if (!captured.some((row) => row.session?.running)) return;
		if (!(await confirm(t('agent.endConfirm', { title: tab.customTitle || tab.title })))) return;
		const current = this.store.getState().tabs[tabId];
		if (
			this.closing ||
			this.disposed ||
			current?.kind !== 'terminal' ||
			current.sessionIds.join(',') !== tab.sessionIds.join(',') ||
			captured.some((row) => this.sessions.get(row.id) !== row.session)
		)
			throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'runtime-changed'), 'none');
		const waiting = captured.flatMap((row) => {
			if (row.ref) return [this.stopManaged(row.ref)];
			row.session?.closeInput();
			this.sessions.end(row.id);
			return [];
		});
		const results = await Promise.all(waiting);
		const incomplete = results.find((result) => result.status !== 'stopped' || !result.persisted);
		if (incomplete)
			throw new ManagedLaunchError(
				incomplete.error ?? managedFailure('EFFECT_UNKNOWN', 'cleanup-unconfirmed'),
				incomplete.effect,
			);
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
		this.persistence.assertPaneCapacity?.(1);
		this.presentationRevision++;
		const origin = tab.panes[id];
		if (this.spaces && !origin?.spaceId) throw new SpaceError('TARGET_REQUIRED', 'space-required');
		const launch = this.launch.capture?.() ?? this.launch,
			revision = this.presentationRevision;
		const intent = launch.foreground?.();
		let admission: SessionAdmission | undefined, runtime: ManagedRuntimeRef | undefined;
		try {
			admission = await this.admit(origin?.spaceId, { kind: 'shell', title: t('agent.workspace.newTerminal') });
			runtime = admission ? this.sessions.reserveManaged(admission.record) : undefined;
		} catch (cause) {
			intent?.dispose();
			throw cause;
		}
		if (this.spaces && !admission) {
			intent?.dispose();
			return;
		}
		let session: TerminalSession | undefined;
		try {
			session = await launch.shell({
				cwd: admission?.cwd ?? this.sessions.get(id)?.cwd,
				beforeSpawn: admission?.beforeSpawn,
				runtime,
				interactive: true,
				intent,
			});
		} catch (cause) {
			if (runtime) this.failLaunch(runtime, normalizeManagedFailure(cause));
			throw cause;
		} finally {
			intent?.dispose();
		}
		if (!session) {
			if (runtime) this.failLaunch(runtime, undefined, true);
			return;
		}
		if (runtime && session.connection === 'failed') {
			this.failLaunch(runtime, normalizeManagedFailure(session.failureCause));
			return;
		}
		this.bindIdentity(session, admission);
		const current = this.store.getState().tabs[tab.id];
		if (
			this.disposed ||
			current?.kind !== 'terminal' ||
			!current.sessionIds.includes(id) ||
			revision !== this.presentationRevision ||
			(intent && !intent.valid()) ||
			!canSplit(this.paneTabs(current), id)
		) {
			if (this.disposed) this.sessions.remove(session.id);
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
		this.presentationRevision++;
		const tab = Object.values(this.store.getState().tabs).find(
			(t): t is TerminalTabData => t.kind === 'terminal' && t.sessionIds.includes(id),
		);
		if (!tab) return;
		if (tab.sessionIds.length === 1) return this.close(tab.id, confirm);
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
	}
	resizePane(tabId: string, path: readonly ('first' | 'second')[], ratio: number): void {
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind !== 'terminal') return;
		const pane = setRatio(this.paneTabs(tab), tab.id, path, ratio).tabs[0]!;
		this.update((s) => ({ ...s, tabs: { ...s.tabs, [tabId]: { ...tab, paneLayout: pane.root } } }));
	}
	async restore(tabId: string, sessionId?: string, restart = false): Promise<void> {
		if (this.closing || this.disposed)
			throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'), 'none');
		this.presentationRevision++;
		const tab = this.store.getState().tabs[tabId];
		if (tab?.kind !== 'terminal') return;
		const oldId = sessionId ?? tab.focusedSessionId,
			key = `${tabId}:${oldId}`;
		if (this.restoring.has(key)) return;
		const savedInfo = tab.panes[oldId] ?? tab.resume;
		if (!savedInfo) return;
		const savedRecord = savedInfo.persistentSessionId
			? this.spaces?.store.getState().records.sessions[savedInfo.persistentSessionId]
			: undefined;
		const info: ResumeInfo = savedRecord
			? {
					...savedInfo,
					shell: savedRecord.shell,
					agentId: savedRecord.agentId,
					accountId: savedRecord.accountId,
					nativeSessionId: savedRecord.nativeSessionId,
					transcriptPath: savedRecord.transcriptPath,
				}
			: savedInfo;
		const launch = this.launch.capture?.() ?? this.launch,
			revision = this.presentationRevision;
		const intent = launch.foreground?.();
		let runtime: ManagedRuntimeRef | undefined;
		this.restoring.add(key);
		try {
			if (info.spaceId && info.persistentSessionId) {
				const target = { spaceId: info.spaceId, sessionId: info.persistentSessionId };
				const currentRuntime = this.getManaged(target)?.runtime;
				if (
					currentRuntime?.phase === 'launch-pending' ||
					(currentRuntime && this.sessions.get(currentRuntime.runtimeId)?.running)
				) {
					await this.attachManaged(target, { expectedRuntimeId: currentRuntime.runtimeId });
					return;
				}
			}
			if (this.spaces && (!info.spaceId || !info.persistentSessionId))
				throw new SpaceError('TARGET_REQUIRED', 'space-required');
			if (!restart && info.agentId && !info.nativeSessionId)
				throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'resume-source-unavailable'), 'none');
			const admission = await this.admit(
				info.spaceId,
				{
					kind: info.agentId ? 'agent' : 'shell',
					title: tab.customTitle || tab.title,
					agentId: info.agentId,
					accountId: info.accountId,
					shell: info.shell,
					nativeSessionId: restart ? undefined : info.nativeSessionId,
					transcriptPath: restart ? undefined : info.transcriptPath,
				},
				info.persistentSessionId,
			);
			if (this.spaces && !admission) return;
			runtime = admission ? this.sessions.reserveManaged(admission.record, info.customTitle) : undefined;
			const bound = admission
				? {
						...info,
						shell: admission.record.shell,
						agentId: admission.record.agentId,
						accountId: admission.record.accountId,
						cwd: admission.cwd,
						beforeSpawn: admission.beforeSpawn,
						runtime,
						interactive: true,
						intent,
					}
				: info;
			const session =
				!restart && info.nativeSessionId && info.agentId
					? admission
						? await launch.resume(bound, tab.customTitle || tab.title, admission.beforeSpawn, {
								runtime,
								interactive: true,
								intent,
							})
						: await launch.resume(bound, tab.customTitle || tab.title)
					: info.agentId
						? await launch.agent(info.agentId, bound)
						: await launch.shell(bound);
			if (!session) {
				if (runtime) this.failLaunch(runtime, undefined, true);
				return;
			}
			if (runtime && session.connection === 'failed') {
				this.failLaunch(runtime, normalizeManagedFailure(session.failureCause));
				return;
			}
			this.bindIdentity(session, admission);
			const current = this.store.getState().tabs[tabId];
			if (
				this.disposed ||
				current?.kind !== 'terminal' ||
				!current.sessionIds.includes(oldId) ||
				revision !== this.presentationRevision ||
				(intent && !intent.valid())
			) {
				if (this.disposed) this.sessions.remove(session.id);
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
						panes: {
							...panes,
							[session.id]: {
								...panes[session.id]!,
								paneId:
									s.tabs[tabId]?.kind === 'terminal' ? s.tabs[tabId].panes[oldId]?.paneId : undefined,
							},
						},
						resume: undefined,
						state: sessionState(session),
						unread: false,
					},
				},
			}));
			this.sessions.remove(oldId);
			this.activate(tabId);
		} catch (cause) {
			if (runtime && !this.disposed) this.failLaunch(runtime, normalizeManagedFailure(cause));
			throw cause;
		} finally {
			intent?.dispose();
			this.restoring.delete(key);
		}
	}
	reopen(id?: string): void {
		const tab = id
			? this.store.getState().closedTabs.find((tab) => tab.id === id)
			: this.store.getState().closedTabs[0];
		if (!tab) return;
		try {
			if (!this.store.getState().tabs[tab.id] && tab.kind === 'terminal')
				this.persistence.assertPaneCapacity?.(paneLeaves(tab.paneLayout).length);
			this.presentationRevision++;
			this.update((s) => {
				if (s.tabs[tab.id]) return activateTab(s, tab.id);
				let reopened = tab;
				if (tab.kind === 'terminal') {
					const displayed = Object.values(s.tabs).filter(
						(row): row is TerminalTabData => row.kind === 'terminal',
					);
					if (
						displayed.some((row) =>
							row.sessionIds.some(
								(key) =>
									tab.sessionIds.includes(key) ||
									Object.values(tab.panes).some(
										(info) =>
											info.persistentSessionId &&
											info.persistentSessionId === row.panes[key]?.persistentSessionId &&
											info.spaceId === row.panes[key]?.spaceId,
									),
							),
						)
					) {
						this.report(new SpaceError('TARGET_AMBIGUOUS', 'session-already-displayed'));
						return s;
					}
					const used = new Set(
						[...displayed.flatMap((row) => Object.values(row.panes)), ...Object.values(tab.panes)].flatMap(
							(info) => (info.paneId ? [info.paneId] : []),
						),
					);
					const panes = Object.fromEntries(
						Object.entries(tab.panes).map(([key, info]) => [key, { ...info, paneId: newPaneId(used) }]),
					);
					reopened = { ...tab, panes, resume: panes[tab.focusedSessionId], unread: false };
				}
				return openTab(
					{ ...s, closedTabs: s.closedTabs.filter((closed) => closed.id !== tab.id) },
					s.activeGroupId,
					reopened,
				);
			});
		} catch (cause) {
			this.report(cause);
		}
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
	dispose(): Promise<void> {
		if (this.disposing) return this.disposing;
		this.disposed = true;
		if (this.focusOwner) this.finishFocus(this.focusOwner, 'cancelled');
		this.focusListeners.clear();
		this.off();
		this.visible.clear();
		this.menuListeners.clear();
		this.managedOff.forEach((off) => off());
		this.managedListeners.clear();
		this.disposing = (async () => {
			await this.checkpointTail;
			await Promise.all([...this.archiveSettlements]);
			if (this.retainsPersistence) await this.persistence.flush();
			else await this.persistence.dispose();
		})();
		return this.disposing;
	}
}

function unknownTermination(): TerminationEvidence {
	return {
		root: { state: 'unknown', code: null, signal: null },
		cleanup: { state: 'unknown', scope: 'root-only', reason: 'scope-unverified', remainingKnown: null },
		output: 'unknown',
	};
}
function notStarted(): TerminationEvidence {
	return {
		root: { state: 'not-started', code: null, signal: null },
		cleanup: { state: 'confirmed', scope: 'not-started', remainingKnown: 0 },
		output: 'drained',
	};
}

/** Ending observation never cancels or retries an already accepted disk write. Strict drain still owns it. */
async function observeCheckpoint(
	write: Promise<void>,
	deadline: number,
	signal?: AbortSignal,
): Promise<'WAIT_TIMEOUT' | 'WAIT_CANCELLED' | undefined> {
	try {
		await observeLifecycle(
			write,
			deadline,
			(reason) => new SpaceError(reason, reason === 'WAIT_CANCELLED' ? 'wait-cancelled' : 'wait-timeout'),
			signal,
		);
		return undefined;
	} catch (cause) {
		if (cause instanceof SpaceError && (cause.code === 'WAIT_TIMEOUT' || cause.code === 'WAIT_CANCELLED'))
			return cause.code;
		throw cause;
	}
}
