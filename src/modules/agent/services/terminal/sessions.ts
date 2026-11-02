import { t } from '../../../../shared/i18n';
import { lifecycleClock, type LifecycleClock } from './clock';
import type {
	RuntimeHooksPort,
	ManagedFailure,
	ManagedRuntimeRef,
	ManagedRuntimeSummary,
	ManagedStopState,
} from '../../core/workspace/managed-runtime';
import type { SessionRecord } from '../spaces/records';
import { ManagedLaunchError, managedFailure } from '../launch/managed-errors';
import { sessionState } from './status';
import type { AgentId } from '../../core/launch/types';
import type { TerminalSettings } from '../../core/terminal/settings';
import type { HistoryClient } from '../../platform/desktop/server/agent-data-client';
import type {
	NativeConnection,
	NativeHostAccess,
	NativeLease,
	NativeTerminationNotice,
	TerminationEvidence,
} from '../../../../shared/native/host';
import type { NativeEditorLaunch } from '../../../../shared/native/input';
import { NATIVE_TERMINATION_OBSERVE_MS, NativeSpawnError, NativeReplyError } from '../../../../shared/native/host';
import { terminationConfirmed } from '../../../../shared/native/termination';
import { TerminalSession, type Activity, type SessionColors, type SessionKind } from './session';
import { SessionScreenBudget } from './session-screen';

export interface TerminalHost {
	runtimeHooks?: RuntimeHooksPort;
	routeEnvironment?(
		ref: ManagedRuntimeRef,
		capturedPtyLease: NativeLease,
	): Promise<{ readonly env: Readonly<Record<string, string>>; assertCurrent(): void }>;
	native: NativeHostAccess;
	clock?: LifecycleClock;
	prepare?(): Promise<void>;
	/** Variables added to the real user environment for helper and shell processes (login-shell PATH on a desktop-icon launch). */
	environment(signal?: AbortSignal): Promise<Record<string, string>>;
	/** Real user home, used when no environment names one. */
	home?(): string;
	/** `process.platform` of the desktop app. */
	platform: string;
	settings(): TerminalSettings;
	colors(): SessionColors;
	/** Native lifecycle events for an agent session (hooks), returning extra environment. */
	agentHooks?(
		agentId: AgentId,
		env: Record<string, string>,
		activity: (activity: Activity, data: Record<string, unknown>) => void,
	): Promise<{ env: Record<string, string>; close(): void }>;
}

export interface CreateSession {
	/** A verified business admission reserved synchronously before launch preparation. */
	runtime?: ManagedRuntimeRef;
	/** Revalidate a committed Space identity after all preparation, immediately before native spawn. */
	beforeSpawn?: () => Promise<void>;
	signal?: AbortSignal;
	kind: SessionKind;
	title: string;
	file: string;
	args: string[];
	cwd: string;
	env?: Record<string, string>;
	agentId?: AgentId;
	automated?: boolean;
	/** Watch native lifecycle hooks for this agent session (interactive agents). */
	hooks?: boolean;
	cols?: number;
	rows?: number;
	/** Runs before the process starts, so observers see its very first output. */
	prepare?: (session: TerminalSession) => void;
}

interface ManagedEntry {
	readonly ref: ManagedRuntimeRef;
	record: SessionRecord;
	customTitle?: string;
	phase: 'launch-pending' | 'failed' | 'cancelled' | 'disconnected' | 'exited';
	stage: 'reserved' | 'preparing' | 'spawn-sent' | 'adopted';
	error?: ManagedFailure;
	everAttached: boolean;
	stop?: ManagedStopState;
	termination?: TerminationEvidence;
	sequence: number;
	stopSequence?: number;
	deadline?: number;
	timer?: unknown;
	transport?: { helper: NativeConnection; sid: number };
	finalExit?: { code: number | null; signal: string | null };
}

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 32;

/** Activity reported by a CLI's native lifecycle event. */
export function hookActivity(event: string): Activity | undefined {
	if (event === 'UserPromptSubmit' || event === 'BeforeAgent' || event === 'PreToolUse' || event === 'BeforeTool')
		return 'running';
	if (event === 'Notification') return 'waiting';
	if (event === 'PermissionRequest') return 'permission';
	if (event === 'Stop' || event === 'AfterAgent') return 'done';
	if (event === 'StopFailure') return 'failed';
	if (event === 'StopCancelled' || event === 'Interrupt') return 'interrupted';
	if (event === 'SessionStart') return 'idle';
	return undefined;
}

/**
 * Every terminal session of one module activation, the helper process behind them and the tab layout
 * that all workbench pages show. Sessions outlive their pages; disposing the module ends them.
 */
export class TerminalSessions {
	private helper?: NativeConnection;
	private lease?: NativeLease;
	private historyLease?: NativeLease;
	private readonly acquiredLeases = new Set<NativeLease>();
	private historyStarting?: Promise<NativeLease>;
	private readonly lifetime = new AbortController();
	private starting?: Promise<NativeConnection>;
	private readonly sessions = new Map<string, TerminalSession>();
	private readonly managed = new Map<string, ManagedEntry>();
	private readonly current = new Map<string, string>();
	private readonly routes = new WeakMap<NativeLease, Map<number, TerminalSession>>();
	private readonly runtimeRoutes = new Map<string, Map<number, TerminalSession>>();
	private ptyGeneration = 0;
	private readonly removing = new Set<string>();
	private readonly hooks = new Map<string, () => void | Promise<void>>();
	private hookSettlements = new Set<Promise<void>>();
	private hookFailures: unknown[] = [];
	private closeHook(id: string): void {
		const close = this.hooks.get(id);
		this.hooks.delete(id);
		if (!close) return;
		let value: Promise<void>;
		try {
			value = Promise.resolve(close());
		} catch (error) {
			value = Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
		const tracked = value
			.catch((error: unknown) => {
				if (this.hookFailures.length < 32) this.hookFailures.push(error);
			})
			.finally(() => this.hookSettlements.delete(tracked));
		this.hookSettlements.add(tracked);
	}
	private async drainHooks(): Promise<void> {
		while (this.hookSettlements.size) await Promise.all([...this.hookSettlements]);
		if (this.hookFailures.length)
			throw new AggregateError(this.hookFailures, t('agent.managed.shutdownIncomplete'));
	}
	private readonly listeners = new Set<() => void>();
	private readonly connectionListeners = new Set<() => void>();
	private connectionRevision = 0;
	private disposed = false;
	private closing = false;
	private disposing?: Promise<void>;
	/** The session that "send to terminal" commands target. */
	private lastFocused?: string;
	private readonly screenBudget = new SessionScreenBudget();

	readonly clock: LifecycleClock;
	constructor(private readonly host: TerminalHost) {
		this.clock = host.clock ?? lifecycleClock();
	}

	private changed(): void {
		for (const listener of [...this.listeners]) {
			try {
				listener();
			} catch {
				this.listeners.delete(listener);
			}
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	list(): TerminalSession[] {
		return [...this.sessions.values()];
	}

	get(id: string): TerminalSession | undefined {
		return this.sessions.get(id);
	}

	/** Reserve only after verified Session commit. No helper, environment or provider work runs here. */
	reserveManaged(record: SessionRecord, customTitle?: string): ManagedRuntimeRef {
		if (this.disposed || this.closing)
			throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'));
		const previous = this.managedFor({ spaceId: record.spaceId, sessionId: record.id });
		if (
			previous &&
			(previous.phase === 'disconnected' ||
				(previous.stage !== 'adopted' && previous.phase === 'launch-pending') ||
				this.get(previous.ref.runtimeId)?.running)
		)
			throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'runtime-active'));
		if (!record.lastAttempt || record.lastAttempt.state !== 'unconfirmed')
			throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'admission-marker-missing'));
		const ref = Object.freeze({
			spaceId: record.spaceId,
			sessionId: record.id,
			runtimeId: record.lastAttempt.runtimeId,
		});
		this.managed.set(ref.runtimeId, {
			ref,
			record,
			customTitle,
			phase: 'launch-pending',
			stage: 'reserved',
			everAttached: false,
			sequence: 0,
		});
		this.current.set(record.id, ref.runtimeId);
		this.changed();
		return ref;
	}
	/** Apply only a title already committed by the persistent owner; never rename a Pane or Tab. */
	renameManaged(record: SessionRecord): void {
		const entry = this.managedFor({ spaceId: record.spaceId, sessionId: record.id });
		if (!entry || record.lastAttempt?.runtimeId !== entry.ref.runtimeId) return;
		entry.record = record;
		entry.customTitle = record.title;
		const session = this.sessions.get(entry.ref.runtimeId);
		if (session) session.rename(record.title);
		else this.changed();
	}
	managedFor(target: { spaceId: string; sessionId: string }): ManagedEntry | undefined {
		const id = this.current.get(target.sessionId),
			entry = id ? this.managed.get(id) : undefined;
		return entry?.ref.spaceId === target.spaceId ? entry : undefined;
	}
	managedRef(runtimeId: string): ManagedRuntimeRef | undefined {
		return this.managed.get(runtimeId)?.ref;
	}
	checkManaged(ref: ManagedRuntimeRef): void {
		if (this.managedFor(ref)?.ref.runtimeId !== ref.runtimeId)
			throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'runtime-changed'));
	}
	failManaged(ref: ManagedRuntimeRef, error?: ManagedFailure, cancelled = false): void {
		this.checkManaged(ref);
		const entry = this.managed.get(ref.runtimeId)!;
		entry.phase = cancelled ? 'cancelled' : error?.code === 'EFFECT_UNKNOWN' ? 'disconnected' : 'failed';
		entry.error = error;
		if (!entry.termination && entry.stage !== 'spawn-sent' && entry.stage !== 'adopted')
			entry.termination = notStarted();
		this.changed();
	}
	markAttached(runtimeId: string): void {
		const entry = this.managed.get(runtimeId);
		if (entry && !entry.everAttached) {
			entry.everAttached = true;
			this.changed();
		}
	}
	managedSummary(target: { spaceId: string; sessionId: string }): ManagedRuntimeSummary | undefined {
		const entry = this.managedFor(target);
		if (!entry) return undefined;
		const session = this.get(entry.ref.runtimeId);
		const phase =
			entry.phase !== 'launch-pending'
				? entry.phase
				: session?.connection === 'starting' || !session
					? 'launch-pending'
					: session.connection;
		return Object.freeze({
			runtimeId: entry.ref.runtimeId,
			phase,
			activity: session ? sessionState(session) : 'unknown',
			activityDetail: session?.getActivitySnapshot(),
			inputReady: !entry.stop && (session?.inputReady() ?? false),
			stop: entry.stop ? Object.freeze({ ...entry.stop }) : undefined,
			termination: entry.termination
				? Object.freeze({
						...entry.termination,
						root: Object.freeze({ ...entry.termination.root }),
						cleanup: Object.freeze({ ...entry.termination.cleanup }),
					})
				: undefined,
			pid: session?.pid,
			exit: session?.exitEvidence ? Object.freeze({ ...session.exitEvidence }) : undefined,
			error: entry.error
				? Object.freeze({ ...entry.error, details: Object.freeze({ ...entry.error.details }) })
				: undefined,
		});
	}

	focus(id: string): void {
		if (!this.sessions.has(id) || this.lastFocused === id) return;
		this.lastFocused = id;
	}

	/** The session commands like "send selection to terminal" go to. */
	get focused(): TerminalSession | undefined {
		const last = this.lastFocused ? this.sessions.get(this.lastFocused) : undefined;
		if (last?.running) return last;
		return this.list()
			.filter((session) => session.running && !session.automated)
			.at(-1);
	}

	/** Acquire the Agent's PTY capability without taking ownership of other consumers. */
	async ensureHelper(): Promise<NativeConnection> {
		if (this.disposed || this.closing) throw new Error('The terminal module is off');
		if (this.helper?.alive) return this.helper;
		this.starting ??= (async () => {
			await this.host.prepare?.();
			if (this.disposed || this.closing) throw new Error('The terminal module is off');
			const generation = ++this.ptyGeneration;
			const route = new Map<number, TerminalSession>();
			const lease = await this.host.native.acquire(
				'pty',
				{
					output: (sid, bytes) => route.get(sid)?.receive(bytes),
					exit: (sid, code, signal) => this.exited(route.get(sid), code, signal),
					termination: (sid, notice) => this.terminated(route.get(sid), notice),
					inputFailure: (sid, failure) => route.get(sid)?.inputFailure(failure),
					replyFailure: (sid, failure) => {
						const session = route.get(sid);
						if (session && this.sessions.get(session.id) === session) session.replyFailure(failure);
					},
					closed: (reason) => {
						if (generation === this.ptyGeneration) {
							this.helper = undefined;
							this.lease = undefined;
						}
						for (const session of route.values()) {
							session.disconnect(reason);
							const entry = this.managed.get(session.id);
							if (entry && (!entry.termination || !terminationConfirmed(entry.termination))) {
								entry.termination = unknownTermination(entry.termination, 'transport-lost');
								this.settleStop(entry, true);
							}
							this.closeHook(session.id);
						}
						this.connectionChanged();
						this.changed();
					},
				},
				this.lifetime.signal,
			);
			this.acquiredLeases.add(lease);
			if (this.disposed) {
				await lease.release();
				throw new Error('The terminal module is off');
			}
			this.routes.set(lease, route);
			this.lease = lease;
			this.helper = lease.value;
			this.connectionChanged();
			return lease.value;
		})().finally(() => {
			this.starting = undefined;
		});
		return this.starting;
	}

	private connectionChanged(): void {
		this.connectionRevision++;
		for (const listener of [...this.connectionListeners]) listener();
	}

	private async ensureHistory(): Promise<NativeLease> {
		if (this.disposed || this.closing) throw new Error('The terminal module is off');
		if (this.historyLease?.value.alive) return this.historyLease;
		this.historyStarting ??= Promise.resolve()
			.then(async () => {
				await this.host.prepare?.();
				return this.host.native.acquire(
					'history',
					{
						closed: () => {
							this.historyLease = undefined;
							this.connectionChanged();
						},
					},
					this.lifetime.signal,
				);
			})
			.then(async (lease) => {
				this.acquiredLeases.add(lease);
				if (this.disposed) {
					await lease.release();
					throw new Error('The terminal module is off');
				}
				this.historyLease = lease;
				this.connectionChanged();
				return lease;
			})
			.finally(() => {
				this.historyStarting = undefined;
			});
		return this.historyStarting;
	}

	private exited(session: TerminalSession | undefined, code: number | null, signal: string | null): void {
		if (!session || this.sessions.get(session.id) !== session) return;
		const entry = this.managed.get(session.id);
		if (entry) {
			entry.finalExit = { code, signal };
			entry.termination ??= {
				root:
					code === null && signal === null
						? { state: 'unknown', code: null, signal: null }
						: { state: 'exited', code, signal },
				cleanup: { state: 'unknown', scope: 'root-only', reason: 'legacy-helper', remainingKnown: null },
				output: 'unknown',
			};
			this.settleStop(entry);
		}
		session.exit(code, signal);
		this.closeHook(session.id);
		if (this.removing.has(session.id))
			void session.whenParsed().then(() => {
				if (this.sessions.get(session.id) === session) this.forget(session);
			});
		this.changed();
	}

	clearStatusHooks(): void {
		for (const id of [...this.hooks.keys()]) {
			this.sessions.get(id)?.invalidateActivity('disabled');
			this.closeHook(id);
		}
	}
	async create(request: CreateSession): Promise<TerminalSession> {
		request = {
			...request,
			args: [...request.args],
			env: request.env && { ...request.env },
			runtime: request.runtime && { ...request.runtime },
		};
		if (this.closing || this.disposed)
			throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'));
		request.signal?.throwIfAborted();
		const entry = request.runtime ? this.managed.get(request.runtime.runtimeId) : undefined;
		if (request.runtime) {
			this.checkManaged(request.runtime);
			if (!entry || entry.stop || entry.stage !== 'reserved')
				throw new ManagedLaunchError(managedFailure('STALE_RUNTIME', 'runtime-active'));
			entry.stage = 'preparing';
		}
		const helper = await this.ensureHelper();
		if (this.disposed || this.closing)
			throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'));
		const lease = this.lease;
		if (!lease) throw new Error('The native helper is disconnected');
		if (entry?.stop) throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'attempt-cancelled'));
		const controlRoute = request.runtime ? await this.host.routeEnvironment?.(request.runtime, lease) : undefined;
		const environment = await this.host.environment(request.signal);
		request.signal?.throwIfAborted();
		if (this.disposed || this.closing) throw new Error('The terminal module is off');
		const settings = this.host.settings();
		if (entry?.stop) throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'attempt-cancelled'));
		const sid = lease.allocateSessionId();
		if (entry) entry.transport = { helper, sid };
		const session = new TerminalSession({
			home: request.env?.HOME ?? environment.HOME ?? this.host.home?.(),
			id: request.runtime?.runtimeId ?? `terminal-${crypto.randomUUID()}`,
			sid,
			kind: request.kind,
			title: request.title,
			cwd: request.cwd,
			agentId: request.agentId,
			accountId: request.env?.HUHU_ACCOUNT_NAME,
			automated: request.automated,
			cols: request.cols ?? DEFAULT_COLS,
			rows: request.rows ?? DEFAULT_ROWS,
			scrollback: settings.scrollback,
			platform: this.host.platform,
			colors: () => this.host.colors(),
			screenBudget: this.screenBudget,
		});
		if (entry?.customTitle) session.rename(entry.customTitle);
		this.sessions.set(session.id, session);
		const route = this.routes.get(lease)!;
		route.set(sid, session);
		this.runtimeRoutes.set(session.id, route);
		session.onChange(() => this.changed());
		session.bindPort({
			...(helper.outputAbandon === 1 && helper.abandonOutput
				? { outputAbandon: 1 as const, abandonOutput: (id: number) => helper.abandonOutput!(id) }
				: {}),
			...(helper.inputAdmission === 1 && helper.inputLimits
				? { inputAdmission: 1 as const, inputLimits: helper.inputLimits }
				: {}),
			...(helper.submitInput
				? {
						submitInput: (
							id: number,
							data: string | Uint8Array,
							options?: import('../../../../shared/native/input').NativeInputOptions,
						) => helper.submitInput!(id, data, options),
					}
				: {}),
			...(helper.submitResize
				? {
						submitResize: (
							id: number,
							cols: number,
							rows: number,
							options?: import('../../../../shared/native/input').NativeInputOptions,
						) => helper.submitResize!(id, cols, rows, options),
					}
				: {}),
			input: (id, data) => {
				if (helper.alive) helper.input(id, data);
			},
			reply: (id, data) => {
				if (helper.reply) helper.reply(id, data);
				else if (helper.alive) helper.input(id, data);
				else throw new NativeReplyError({ state: 'none', reason: 'closed' });
			},
			resize: (id, cols, rows) => {
				if (helper.alive) helper.resize(id, cols, rows);
			},
			acknowledge: (id, bytes) => {
				try {
					helper.acknowledge(id, bytes);
				} catch {
					/* No ACK can be delivered after captured transport loss. */
				}
			},
			end: (id, force) => {
				if (helper.alive) helper.end(id, force);
			},
			outputEvidence: () => entry?.termination?.output ?? 'unknown',
			resourceLimit: () => {
				if (entry && this.managed.get(session.id) === entry) this.requestManagedStop(entry.ref);
				else if (helper.alive) helper.end(sid, true);
			},
		});
		if (request.runtime && !settings.statusHooks) session.invalidateActivity('disabled');
		request.prepare?.(session);
		this.changed();
		let env: Record<string, string> = {
			...environment,
			TERM: 'xterm-256color',
			COLORTERM: 'truecolor',
			TERM_PROGRAM: 'huhu',
			...request.env,
			HUHU_SESSION_ID: session.id,
			...controlRoute?.env,
		};
		let spawning = false;
		const abort = () => {
			if (spawning && helper.alive) helper.end(sid, true);
		};
		request.signal?.addEventListener('abort', abort, { once: true });
		try {
			controlRoute?.assertCurrent();
			if (request.runtime && settings.statusHooks && this.host.runtimeHooks) {
				const binding = session.bindActivityRuntime(),
					abortHooks = new AbortController();
				const abortScope = () => abortHooks.abort();
				request.signal?.addEventListener('abort', abortScope, { once: true });
				if (request.signal?.aborted) abortScope();
				const pending = this.host.runtimeHooks.prepareRuntimeHooks(
					{ target: request.runtime, initialProvider: request.agentId, env, signal: abortHooks.signal },
					binding,
				);
				let closing: Promise<void> | undefined;
				this.hooks.set(session.id, () => {
					binding.close();
					abortScope();
					request.signal?.removeEventListener('abort', abortScope);
					return (closing ??= pending.then((hook) => hook.close()));
				});
				const hook = await pending;
				abortHooks.signal.throwIfAborted();
				env = { ...env, ...hook.env };
			} else if (request.hooks && request.agentId && this.host.agentHooks) {
				const hook = await this.host.agentHooks(request.agentId, env, (activity, data) =>
					session.setActivity(activity, data),
				);
				env = { ...env, ...hook.env };
				this.hooks.set(session.id, () => hook.close());
			}
			// Fold the final captured control fields before any eligibility read; no later loader-env rewrite.
			Object.assign(env, controlRoute?.env);
			env = Object.freeze({ ...env });
			let editor: NativeEditorLaunch | undefined;
			if (
				request.runtime &&
				request.agentId === 'pi' &&
				helper.editorTransactions === 1 &&
				helper.spawnEnvironment &&
				helper.editorBinding
			) {
				try {
					const snapshot = helper.spawnEnvironment(env);
					if (snapshot.completeness !== 'unverified-platform') {
						const [{ verifyPiArtifact }, { installedPiEditorExtension, piEditorArgumentsSupported }] =
							await Promise.all([
								import('../../platform/desktop/agents/program-identity'),
								import('../../platform/desktop/hooks/automation-hooks'),
							]);
						const options = { signal: request.signal, deadline: performance.now() + 15_000 };
						const verified = await verifyPiArtifact({
							file: request.file,
							args: request.args,
							cwd: request.cwd,
							env: snapshot.values,
							...options,
						});
						if (verified.status === 'supported') {
							const extension = await installedPiEditorExtension(snapshot.values, options);
							if (extension && piEditorArgumentsSupported(verified.piArgs, extension, request.cwd))
								editor = {
									identity: { runtimeId: request.runtime.runtimeId },
									provider: 'pi',
									recipe: verified.recipe,
								};
						}
					}
				} catch {
					// Eligibility failure leaves the original manual launch intact. The original signal
					// and all admission/generation guards below still reject a cancelled/stale launch.
				}
			}
			request.signal?.throwIfAborted();
			if (
				this.disposed ||
				this.closing ||
				this.removing.has(session.id) ||
				this.sessions.get(session.id) !== session
			)
				throw new Error('The terminal session is closed');
			await request.beforeSpawn?.();
			request.signal?.throwIfAborted();
			if (
				this.disposed ||
				this.closing ||
				this.removing.has(session.id) ||
				this.sessions.get(session.id) !== session
			)
				throw new Error('The terminal session is closed');
			if (request.runtime) this.checkManaged(request.runtime);
			if (entry?.stop) throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'attempt-cancelled'));
			controlRoute?.assertCurrent();
			if (this.helper !== helper || this.lease !== lease || !helper.alive)
				throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'helper-changed'));
			if (entry) entry.stage = 'spawn-sent';
			spawning = true;
			const pid = await helper.spawnSession(sid, {
				file: request.file,
				args: request.args,
				cwd: request.cwd,
				env,
				...(editor ? { editor } : {}),
				cols: session.cols,
				rows: session.rows,
			});
			if (
				request.signal?.aborted ||
				this.disposed ||
				this.closing ||
				this.removing.has(session.id) ||
				this.sessions.get(session.id) !== session
			) {
				helper.end(sid, true);
				throw new Error('The terminal session is closed');
			}
			if (request.runtime) this.checkManaged(request.runtime);
			if (editor) {
				const binding = helper.editorBinding?.(sid);
				if (binding) session.bindEditor(binding, editor.recipe.profileId);
			}
			session.adopt(pid);
			if (entry?.stop) this.sendStop(entry);
			if (entry) entry.stage = 'adopted';
		} catch (error) {
			this.closeHook(session.id);
			const noEffect = !spawning || (error instanceof NativeSpawnError && error.failure.effect === 'none');
			if (entry && noEffect) entry.termination = notStarted();
			else if (entry && !entry.termination) entry.termination = unknownTermination();
			session.fail(error, !noEffect);
			if (entry) this.settleStop(entry);
		} finally {
			request.signal?.removeEventListener('abort', abort);
		}
		// An accepted early exit cannot be downgraded by a late spawn reply; retain its parsed event order.
		if (session.exitEvidence) await session.whenParsed();
		this.changed();
		return session;
	}

	private terminated(session: TerminalSession | undefined, notice: Readonly<NativeTerminationNotice>): void {
		if (!session || this.sessions.get(session.id) !== session) return;
		const entry = this.managed.get(session.id);
		if (!entry || notice.sequence <= entry.sequence) return;
		entry.sequence = notice.sequence;
		entry.termination = structuredClone(notice.evidence);
		if (notice.evidence.root.state !== 'running') {
			session.invalidateActivity(notice.evidence.root.state === 'unknown' ? 'transport-lost' : 'runtime-ended');
			session.closeInput();
			this.closeHook(session.id);
		}
		// Root exit is only evidence here. C emits the legacy exit after bounded descendant output drain.
		this.settleStop(entry);
		this.changed();
	}
	private settleStop(entry: ManagedEntry, final = false): void {
		if (!entry.stop || !entry.termination || entry.termination.cleanup.state === 'pending') return;
		if (
			!final &&
			!terminationConfirmed(entry.termination) &&
			entry.stopSequence !== undefined &&
			entry.sequence <= entry.stopSequence
		)
			return;
		if (entry.timer !== undefined) {
			this.clock.clearTimeout(entry.timer);
			entry.timer = undefined;
		}
		entry.stop = {
			...entry.stop,
			phase: 'settled',
			outcome: terminationConfirmed(entry.termination)
				? 'confirmed'
				: entry.termination.cleanup.state === 'partial'
					? 'partial'
					: 'unknown',
		};
	}
	private sendStop(entry: ManagedEntry): void {
		const transport = entry.transport;
		if (!entry.stop || !transport || (entry.termination && terminationConfirmed(entry.termination))) return;
		try {
			if (!transport.helper.alive) throw new Error('The captured native stream is disconnected');
			if (transport.helper.terminalTermination === 1 && transport.helper.requestStop)
				transport.helper.requestStop(transport.sid, {
					requestId: entry.stop.requestId,
					force: entry.stop.force,
				});
			else transport.helper.end(transport.sid, entry.stop.force);
		} catch {
			entry.termination = unknownTermination(entry.termination, 'transport-lost');
			this.settleStop(entry, true);
		}
	}
	/** Synchronous input/spawn gate. Reentry keeps request identity and original deadline. */
	requestManagedStop(ref: ManagedRuntimeRef, force = false): void {
		this.checkManaged(ref);
		const entry = this.managed.get(ref.runtimeId)!;
		this.get(ref.runtimeId)?.closeInput();
		this.closeHook(ref.runtimeId);
		if (entry.stop) {
			if (force && !entry.stop.force && !terminationConfirmed(entry.termination ?? unknownTermination())) {
				entry.stop = {
					...entry.stop,
					force: true,
					phase: Date.now() < (entry.deadline ?? 0) ? 'stop-requested' : 'settled',
				};
				entry.stopSequence = entry.sequence;
				if (entry.timer === undefined && entry.stop.phase === 'stop-requested')
					entry.timer = this.clock.setTimeout(
						() => this.settleManagedDeadline(ref),
						Math.max(0, entry.deadline! - Date.now()),
					);
				this.sendStop(entry);
				this.changed();
			}
			return;
		}
		entry.stop = { requestId: crypto.randomUUID(), requestedAt: Date.now(), force, phase: 'stop-requested' };
		entry.deadline = entry.stop.requestedAt + NATIVE_TERMINATION_OBSERVE_MS;
		entry.timer = this.clock.setTimeout(() => this.settleManagedDeadline(ref), NATIVE_TERMINATION_OBSERVE_MS);
		if (entry.stage === 'reserved' || entry.stage === 'preparing') {
			entry.termination = notStarted();
			entry.phase = 'cancelled';
			this.get(ref.runtimeId)?.fail(
				new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'attempt-cancelled')),
			);
		} else if (!entry.termination || !terminationConfirmed(entry.termination)) {
			entry.termination ??= {
				root: { state: 'running', code: null, signal: null },
				cleanup: {
					state: 'pending',
					scope: this.host.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: null,
				},
				output: 'unknown',
			};
			entry.stopSequence = entry.sequence;
			this.sendStop(entry);
		}
		this.settleStop(entry);
		this.changed();
	}
	stopObservation(ref: ManagedRuntimeRef): {
		evidence: TerminationEvidence;
		settled: boolean;
		deadline: number;
		requestedAt?: number;
	} {
		this.checkManaged(ref);
		const entry = this.managed.get(ref.runtimeId)!;
		return {
			evidence: structuredClone(entry.termination ?? unknownTermination()),
			settled: entry.stop
				? entry.stop.phase === 'settled'
				: !!entry.termination && entry.termination.cleanup.state !== 'pending',
			deadline: entry.deadline ?? Date.now() + NATIVE_TERMINATION_OBSERVE_MS,
			requestedAt: entry.stop?.requestedAt,
		};
	}
	settleManagedDeadline(ref: ManagedRuntimeRef): void {
		this.checkManaged(ref);
		const entry = this.managed.get(ref.runtimeId)!;
		if (entry.stop?.phase === 'stop-requested' && Date.now() >= (entry.deadline ?? Infinity)) {
			entry.termination = unknownTermination(entry.termination, 'deadline');
			this.settleStop(entry, true);
			this.changed();
		}
	}
	quiesce(): void {
		this.closing = true;
		for (const entry of this.managed.values())
			if (this.current.get(entry.ref.sessionId) === entry.ref.runtimeId) this.requestManagedStop(entry.ref);
		for (const session of this.sessions.values()) {
			session.closeInput();
			if (!this.managed.has(session.id)) session.end();
		}
	}

	/** Hang up a running session (force kills). The session stays listed until removed. */
	end(id: string, force = false): void {
		this.sessions.get(id)?.end(force);
	}

	/** Forget a session; a running one is ended first. */
	remove(id: string): void {
		const session = this.sessions.get(id),
			entry = this.managed.get(id);
		if (entry && this.current.get(entry.ref.sessionId) === id) this.requestManagedStop(entry.ref);
		if (!session) return;
		if (session.running) {
			this.removing.add(id);
			session.closeInput();
			if (!entry) session.end();
			return;
		}
		this.forget(session);
		this.changed();
	}
	private forget(session: TerminalSession): void {
		const id = session.id;
		const entry = this.managed.get(id);
		// Keep the captured Session's known terminal state after releasing its model.
		// A missing Session alone never proves that a pending or uncertain launch exited.
		if (
			entry?.phase === 'launch-pending' &&
			(session.connection === 'exited' ||
				session.connection === 'failed' ||
				session.connection === 'disconnected')
		)
			entry.phase = session.connection;
		this.removing.delete(id);
		this.closeHook(id);
		this.sessions.delete(id);
		this.runtimeRoutes.get(id)?.delete(session.sid);
		this.runtimeRoutes.delete(id);
		if (this.lastFocused === id) this.lastFocused = undefined;
		session.dispose();
	}

	/** The native history channel through the helper. */
	historyClient(): HistoryClient {
		const revision = () => this.connectionRevision;
		return {
			request: async <T>(op: 'scan' | 'query' | 'read', payload: Record<string, unknown>, signal?: AbortSignal) =>
				(await this.ensureHistory()).value.history<T>(op, payload, signal),
			isConnected: () => !!this.historyLease?.value.alive,
			get connectionRevision() {
				return revision();
			},
			subscribeConnection: (listener) => {
				this.connectionListeners.add(listener);
				return () => this.connectionListeners.delete(listener);
			},
		};
	}

	dispose(): Promise<void> {
		if (this.disposing) return this.disposing;
		this.quiesce();
		this.disposed = true;
		this.lifetime.abort();
		const leases = [...this.acquiredLeases];
		for (const id of [...this.hooks.keys()]) this.closeHook(id);
		this.disposing = (async () => {
			try {
				const results = await Promise.allSettled([
					...leases.filter((lease): lease is NativeLease => !!lease).map((lease) => lease.release()),
					this.drainHooks(),
				]);
				await Promise.all([...this.sessions.values()].map((session) => session.whenParsed()));
				const failures = results.flatMap((result) =>
					result.status === 'rejected' ? [result.reason as unknown] : [],
				);
				if (failures.length) throw new AggregateError(failures, t('agent.managed.shutdownIncomplete'));
			} finally {
				for (const entry of this.managed.values())
					if (entry.timer !== undefined) this.clock.clearTimeout(entry.timer);
				for (const id of [...this.hooks.keys()]) this.closeHook(id);
				for (const session of this.sessions.values()) session.dispose();
				this.sessions.clear();
				for (const route of this.runtimeRoutes.values()) route.clear();
				this.runtimeRoutes.clear();
				this.lease = undefined;
				this.historyLease = undefined;
				this.helper = undefined;
				this.acquiredLeases.clear();
				this.listeners.clear();
				this.connectionListeners.clear();
			}
		})();
		return this.disposing;
	}
}

function notStarted(): TerminationEvidence {
	return {
		root: { state: 'not-started', code: null, signal: null },
		cleanup: { state: 'confirmed', scope: 'not-started', remainingKnown: 0 },
		output: 'drained',
	};
}
function unknownTermination(
	previous?: TerminationEvidence,
	reason: 'transport-lost' | 'deadline' = 'transport-lost',
): TerminationEvidence {
	return {
		root: previous?.root ?? { state: 'unknown', code: null, signal: null },
		cleanup: {
			state: 'unknown',
			scope: previous?.cleanup.scope === 'not-started' ? 'root-only' : (previous?.cleanup.scope ?? 'root-only'),
			reason,
			remainingKnown: previous?.cleanup.remainingKnown ?? null,
		},
		output: previous?.output ?? 'unknown',
	};
}
