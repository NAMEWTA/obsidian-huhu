import { lifecycleClock } from './clock';
import {
	CoordinationError,
	type ActivityWaitOptions,
	type ActivityWaitResult,
	type PreparedActivityWait,
} from '../../core/control/terminal-coordination';
import { CONTROL_WAIT_STATES } from '../../../../shared/native/control-wire';
import {
	ACTIVITY_LIMITS,
	activitySummaryAllowed,
	type ActivityMark,
	type ActivityReason,
	type RuntimeActivitySnapshot,
	type ActivityCompletion,
	type RuntimeActivityBinding,
	type ActivitySourceMeta,
	type ActivitySourceBinding,
	type ActivityBlocking,
	type ActivityCapabilities,
	type ActivityFact,
	type ActivityObservation,
	type ActivityAdoption,
	type ActivityJoin,
	type ActivitySeenUpdate,
} from '../../core/workspace/managed-runtime';
import { t } from '../../../../shared/i18n';
import { SerializeAddon } from '@xterm/addon-serialize';
import { Terminal as Model, type IMarker } from '@xterm/headless';
import type { AgentId } from '../../core/launch/types';
import { encodeNamedKeys, KittyFlags, type KeyboardModes } from '../../core/terminal/keyboard';
import { pasteSequence } from '../../core/terminal/paste';
import { parseOsc133, parseOsc633, parseOsc7, PromptHistory, type ShellMark } from '../../core/terminal/shell-marks';
import {
	DEFAULT_SCREEN_PROFILE,
	screenGridAllowed,
	type ScreenGeometryResult,
	type ScreenGrid,
	type ScreenMark,
	type ScreenProfile,
	type ScreenReadRequest,
	type ScreenReadResult,
	type ScreenSink,
	type ScreenStream,
	type ScreenUsage,
	type ScreenViewLease,
} from '../../core/terminal/frames-screen';
import { SessionScreen, SessionScreenBudget } from './session-screen';
import { NativeEditorError, editorBodyBytes } from '../../../../shared/native/input';
import type {
	NativeEditorBinding,
	NativeEditorRegistration,
	NativeEditorSubmission,
} from '../../../../shared/native/input';
import type { ControlExecutionContext } from '../../core/control/context';
import { NATIVE_OUTPUT_LIMITS, NativeReplyError } from '../../../../shared/native/host';
import type {
	NativeInputFailure,
	NativeReplyFailure,
	NativeInputLimits,
	NativeInputOptions,
	NativeInputSubmission,
	NativeResizeSubmission,
} from '../../../../shared/native/input';

export type ConnectionState = 'starting' | 'connected' | 'disconnected' | 'exited' | 'failed';
export type Activity =
	'unknown' | 'running' | 'waiting' | 'permission' | 'done' | 'failed' | 'interrupted' | 'idle' | 'exited';
export type SessionKind = 'shell' | 'agent' | 'preset' | 'automation' | 'script';

/** Output for automation observers: text as it arrives, then the exit. */
export type SessionEvent = { kind: 'data'; text: string } | { kind: 'exit'; code: number } | { kind: 'disconnected' };

export interface SessionPort {
	readonly inputAdmission?: 1;
	readonly outputAbandon?: 1;
	abandonOutput?(sid: number): void;
	readonly inputLimits?: Readonly<NativeInputLimits>;
	input(sid: number, data: string | Uint8Array): void;
	reply?(sid: number, data: string | Uint8Array): void;
	resize(sid: number, cols: number, rows: number): void;
	acknowledge(sid: number, bytes: number): void;
	end(sid: number, force: boolean): void;
	submitInput?(sid: number, data: string | Uint8Array, options?: NativeInputOptions): NativeInputSubmission;
	submitResize?(sid: number, cols: number, rows: number, options?: NativeInputOptions): NativeResizeSubmission;
	resourceLimit?(reason: string): void;
	outputEvidence?(): 'drained' | 'truncated' | 'unknown';
}

export interface SessionInputSubmission extends NativeInputSubmission {
	readonly runtimeId: string;
}
export type SessionInputDiagnostic = Readonly<
	(NativeInputFailure | { op: number; state: 'unknown'; reason: 'legacy-unconfirmed' }) & {
		runtimeId: string;
		message: string;
	}
>;
export type SessionReplyDiagnostic = Readonly<NativeReplyFailure & { runtimeId: string; sid: number; message: string }>;
export type SessionResizeDiagnostic = Readonly<{
	runtimeId: string;
	requestSequence: number;
	op?: number;
	geometry: ScreenGrid;
	state: 'none' | 'unknown';
	reason: NativeInputFailure['reason'];
	message: string;
}>;
export interface SessionPasteOptions extends NativeInputOptions {
	readonly appendEnter?: boolean;
}

export interface SessionColors {
	foreground: string;
	background: string;
	cursor: string;
}

export interface SessionInit {
	home?: string;
	id: string;
	sid: number;
	kind: SessionKind;
	title: string;
	cwd: string;
	agentId?: AgentId;
	accountId?: string;
	automated?: boolean;
	cols: number;
	rows: number;
	scrollback: number;
	platform: string;
	colors: () => SessionColors;
	screenProfile?: ScreenProfile;
	screenBudget?: SessionScreenBudget;
}

interface Subscriber {
	listener: (text: string) => void;
	ready: boolean;
	backlog: string[];
	backlogBytes: number;
	initial?: string;
	release(): void;
}

/** `#rrggbb` (or `#rgb`) as the `rgb:rrrr/gggg/bbbb` form used in OSC color replies. */
export function oscColor(hex: string): string | undefined {
	let value = hex.trim().replace(/^#/, '');
	if (/^[0-9a-f]{3}$/i.test(value))
		value = value
			.split('')
			.map((c) => c + c)
			.join('');
	if (!/^[0-9a-f]{6}/i.test(value)) return undefined;
	const part = (at: number) =>
		value
			.slice(at, at + 2)
			.repeat(2)
			.toLowerCase();
	return `rgb:${part(0)}/${part(2)}/${part(4)}`;
}

/**
 * One terminal session. Its headless model is authoritative: every output byte is parsed here first,
 * device queries are answered from here (so hidden and automation sessions never stall), and visible
 * views replay a snapshot of it before following live output.
 */
export class TerminalSession {
	readonly home?: string;
	readonly id: string;
	readonly sid: number;
	readonly kind: SessionKind;
	readonly agentId?: AgentId;
	readonly accountId?: string;
	readonly automated: boolean;
	readonly createdAt = Date.now();
	readonly startCwd: string;
	cwd: string;
	connection: ConnectionState = 'starting';
	activity: Activity;
	activityAt = Date.now();
	nativeSessionId?: string;
	lastMessage = '';
	generatedTitle = '';
	appliedGeneratedTitle = '';
	transcriptPath?: string;
	exitCode?: number;
	exitEvidence?: { readonly code: number | null; readonly signal: string | null; readonly confirmed: boolean };
	failureCause?: unknown;
	error?: string;
	pid?: number;
	private autoTitle: string;
	private userTitle = '';
	private readonly model: Model;
	private readonly screen: SessionScreen;
	private readonly serializer = new SerializeAddon();
	private readonly decoder = new TextDecoder('utf-8');
	private readonly subscribers = new Set<Subscriber>();
	private readonly observers = new Set<(event: SessionEvent) => void>();
	private readonly changes = new Set<() => void>();
	private readonly kitty = new KittyFlags();
	private win32 = false;
	private readonly marks: Array<{ marker: IMarker; exitCode?: number }> = [];
	private port?: SessionPort;
	private readonly activityClock = lifecycleClock();
	private activitySequence = 0;
	private activityRevision = 0;
	private activityOpen = true;
	private activityReason: ActivityReason = 'not-observed';
	private activityUncertainty?: 'hook-error' | 'source-mismatch';
	private activityDetail?: RuntimeActivitySnapshot;
	private activitySeen = 0;
	private activityCompletion?: ActivityCompletion;
	private activityRuntime?: RuntimeActivityBinding;
	private activitySources: Array<{
		meta: ActivitySourceMeta;
		binding: ActivitySourceBinding;
		closed: boolean;
		gapPending: boolean;
		reason?: ActivityReason;
		sequence: number;
		delivery?: string;
		blockId?: string;
		blocking: ActivityBlocking;
		fact?: ActivityFact;
		timer?: unknown;
		capabilities: ActivityCapabilities;
	}> = [];
	private activityListeners = new Set<(value: RuntimeActivitySnapshot) => void>();
	private notifyingActivity = false;
	private pendingActivityNotice = false;
	private activityNoticeScheduled = false;
	private activityBatch = false;
	private activityBatchChanged = false;

	private editor?: NativeEditorBinding;
	private editorRegistration?: NativeEditorRegistration;
	private editorClosed = false;
	/** The native handle belongs to this original lease/SID, never a later lookup. */
	bindEditor(binding: NativeEditorBinding, profileId?: string): void {
		if (this.editor || binding.sid !== this.sid || binding.identity.runtimeId !== this.id) return;
		this.editor = binding;
		void binding.ready.then(
			(registration) => {
				if (
					this.disposed ||
					this.editorClosed ||
					this.editor !== binding ||
					!binding.active ||
					registration.sid !== this.sid ||
					registration.identity.runtimeId !== this.id ||
					registration.provider !== 'pi' ||
					(profileId !== undefined && registration.profileId !== profileId)
				)
					return;
				this.editorRegistration = registration;
				this.changed();
			},
			() => {
				if (this.editor === binding) {
					this.editorRegistration = undefined;
					this.changed();
				}
			},
		);
		const close = () => {
			if (this.editor === binding) {
				this.editorClosed = true;
				this.editorRegistration = undefined;
				this.changed();
			}
		};
		void binding.closed.then(close, close);
	}
	getEditorReadiness(): Readonly<{
		status: 'ready' | 'unsupported' | 'not-ready' | 'blocked' | 'source-changed';
		sourceInstance?: string;
		bindingId?: string;
		programEpoch?: string;
	}> {
		const binding = this.editor,
			registration = this.editorRegistration;
		if (!binding || this.agentId !== 'pi') return { status: 'unsupported' };
		if (this.disposed || this.editorClosed || !binding.active || this.connection !== 'connected' || !registration)
			return { status: 'not-ready' };
		const snapshot = this.getActivitySnapshot();
		if (snapshot.blocking.state === 'blocked' || snapshot.state === 'permission') return { status: 'blocked' };
		if (snapshot.source.health !== 'current' || snapshot.state === 'unknown' || snapshot.state === 'waiting')
			return { status: 'not-ready' };
		const sources = snapshot.sources.filter((source) => source.health === 'current');
		const source = sources[0];
		if (
			sources.length !== 1 ||
			!source ||
			source.bindingId !== snapshot.source.bindingId ||
			source.meta.provider !== 'pi' ||
			source.meta.lifetime.kind !== 'registration' ||
			source.meta.lifetime.sourceInstance !== registration.sourceInstance
		)
			return { status: 'source-changed' };
		return {
			status: 'ready',
			sourceInstance: registration.sourceInstance,
			bindingId: source.bindingId,
			programEpoch: source.programEpoch,
		};
	}

	submitPrompt(text: string, context: Readonly<ControlExecutionContext>): NativeEditorSubmission {
		const fail = (
			reason: 'cancelled' | 'expired' | 'invalid' | 'unsupported' | 'not-ready' | 'blocked' | 'source-changed',
		): never => {
			throw new NativeEditorError({ state: 'none', effect: 'none', reason });
		};
		if (context.signal.aborted) return fail('cancelled');
		const remaining = context.deadline - performance.now();
		if (!Number.isFinite(remaining) || remaining <= 0) return fail('expired');
		if (!text || !editorBodyBytes(text)) return fail('invalid');
		const ready = this.getEditorReadiness();
		if (ready.status !== 'ready' || !ready.sourceInstance)
			return fail(ready.status === 'ready' ? 'not-ready' : ready.status);
		// No await between the actual source join and the captured handle's admission.
		return this.editor!.submit(text, {
			sourceInstance: ready.sourceInstance,
			remainingMs: Math.min(10_000, Math.ceil(remaining)),
			signal: context.signal,
		});
	}

	/** Immutable current evidence; reading never prepares a provider or creates a runtime. */
	getActivitySnapshot(): RuntimeActivitySnapshot {
		if (!this.activityDetail) this.publishActivity(false, false);
		return this.activityDetail!;
	}
	/** Independent/resumed observation; never submits input or changes the runtime's seen watermark. */
	waitActivity(options: Omit<ActivityWaitOptions, 'afterInput'>): Promise<Readonly<ActivityWaitResult>> {
		return this.captureActivityWait(options).finished;
	}
	/** One bounded observer of this exact runtime. Capture before input and activate after its receipt. */
	captureActivityWait(options: ActivityWaitOptions): PreparedActivityWait {
		if (!Number.isFinite(options.context.deadline) || !CONTROL_WAIT_STATES.includes(options.state))
			throw new CoordinationError('INVALID_ARGUMENT');
		const { signal, deadline } = options.context;
		const condition = options.state;
		const afterInput = options.afterInput === true;
		const requireNew = afterInput || options.after !== undefined;
		if (this.activityListeners.size >= ACTIVITY_LIMITS.listeners) throw new CoordinationError('CAPACITY_EXCEEDED');
		let latest = this.getActivitySnapshot();
		if (options.after && options.after.at.runtimeId !== this.id) throw new CoordinationError('STALE_RUNTIME');
		if (
			options.after &&
			(!Number.isSafeInteger(options.after.at.activitySequence) ||
				options.after.at.activitySequence < 0 ||
				options.after.at.activitySequence > latest.at.activitySequence)
		)
			throw new CoordinationError('INVALID_ARGUMENT');
		let evaluate!: () => void;
		const joined = this.disposed
			? undefined
			: this.observeActivity((value) => {
					latest = value;
					evaluate();
				});
		if (joined) latest = joined.snapshot;
		// The Session returns an arrow disposer; retaining/binding its join would pin the initial full snapshot.
		const release = joined?.dispose.bind(undefined);
		const original = latest.sources.filter((value) => value.health !== 'unavailable');
		const source = original.length === 1 ? original[0] : undefined;
		const capturedBaseline = options.after ?? {
			at: latest.at,
			initialState: latest.state,
			initialWorking: latest.state === 'working',
			...(source
				? { source: Object.freeze({ bindingId: source.bindingId, programEpoch: source.programEpoch }) }
				: {}),
		};
		const baseline = Object.freeze({
			...capturedBaseline,
			at: Object.freeze({ ...capturedBaseline.at }),
			...(capturedBaseline.source ? { source: Object.freeze({ ...capturedBaseline.source }) } : {}),
		});
		let resolve!: (value: Readonly<ActivityWaitResult>) => void;
		const finished = new Promise<Readonly<ActivityWaitResult>>((done) => {
			resolve = done;
		});
		let settled = false;
		let active = !afterInput;
		let timer: unknown;
		const finish = (status: ActivityWaitResult['status'], reason?: ActivityWaitResult['reason']) => {
			if (settled) return;
			settled = true;
			release?.();
			if (timer !== undefined) this.activityClock.clearTimeout(timer);
			signal.removeEventListener('abort', abort);
			resolve(
				Object.freeze({
					status,
					condition,
					baseline,
					at: latest.at,
					state: latest.state,
					blocking: latest.blocking,
					source: Object.freeze({
						health: latest.source.health,
						...(latest.source.reason ? { reason: latest.source.reason } : {}),
					}),
					observedAt: latest.observedAt,
					...(reason ? { reason } : {}),
				}),
			);
		};
		const abort = () => {
			const reason: unknown = signal.reason;
			finish(
				reason && typeof reason === 'object' && 'code' in reason && reason.code === 'WAIT_TIMEOUT'
					? 'timeout'
					: 'cancelled',
			);
		};
		evaluate = () => {
			if (settled) return;
			const current = this.getActivitySnapshot();
			if (current.revision > latest.revision) latest = current;
			if (signal.aborted) return abort();
			if (performance.now() >= deadline) return finish('timeout');
			if (latest.at.runtimeId !== baseline.at.runtimeId) return finish('unavailable', 'stale-runtime');
			const reason = latest.source.reason;
			if (!this.activityOpen || this.disposed) return finish('unavailable', reason ?? 'closed');
			const sources = latest.sources.filter((value) => value.health !== 'unavailable');
			if (
				baseline.source &&
				(sources.length !== 1 ||
					sources[0]!.bindingId !== baseline.source.bindingId ||
					sources[0]!.programEpoch !== baseline.source.programEpoch)
			)
				return finish('unavailable', 'source-changed');
			if (
				reason &&
				[
					'transport-lost',
					'runtime-ended',
					'stop-requested',
					'program-changed',
					'source-mismatch',
					'closed',
					'disabled',
					'unsupported',
				].includes(reason)
			)
				return finish('unavailable', reason ?? 'closed');
			if (!baseline.source && (sources.length || condition !== 'unknown' || requireNew))
				return finish('unavailable', sources.length ? 'source-changed' : (reason ?? 'not-observed'));
			if (!active || (requireNew && latest.at.activitySequence <= baseline.at.activitySequence)) return;
			if (condition === 'blocked' ? latest.blocking.state === 'blocked' : latest.state === condition)
				finish('matched');
		};
		signal.addEventListener('abort', abort, { once: true });
		timer = this.activityClock.setTimeout(() => finish('timeout'), Math.max(0, deadline - performance.now()));
		if (this.disposed) finish('unavailable', 'closed');
		else evaluate();
		return {
			baseline,
			finished,
			activate: () => {
				active = true;
				evaluate();
			},
			dispose: abort,
		};
	}
	/** Registers and captures the initial snapshot in one synchronous segment. */
	observeActivity(listener: (value: RuntimeActivitySnapshot) => void): ActivityJoin {
		if (this.disposed || this.activityListeners.size >= ACTIVITY_LIMITS.listeners)
			throw new Error(t('agent.activityEvidence.capacity'));
		const snapshot = this.getActivitySnapshot();
		this.activityListeners.add(listener);
		return {
			snapshot,
			dispose: () => {
				this.activityListeners.delete(listener);
			},
		};
	}
	/** Internal captured runtime authority. Closing it cannot close another Session instance. */
	bindActivityRuntime(): RuntimeActivityBinding {
		if (this.activityRuntime) return this.activityRuntime;
		this.activityRuntime = Object.freeze({
			runtimeId: this.id,
			active: () => this.activityOpen && !this.disposed,
			bindSource: (meta: ActivitySourceMeta) => this.bindActivitySource(meta),
			invalidate: (reason: ActivityReason) => this.invalidateActivity(reason),
			close: () => this.invalidateActivity('closed'),
		});
		return this.activityRuntime;
	}
	invalidateActivity(reason: ActivityReason): void {
		if (!this.activityOpen) return;
		if (reason === 'hook-error' || reason === 'source-mismatch') {
			if (this.activityUncertainty === reason) return;
			this.activityUncertainty ??= reason;
			for (const source of this.activitySources) {
				source.reason = reason;
				if (source.timer !== undefined) this.activityClock.clearTimeout(source.timer);
			}
			this.publishActivity(true);
			return;
		}
		this.activityOpen = false;
		this.activityReason = reason;
		for (const source of this.activitySources) {
			if (source.timer !== undefined) this.activityClock.clearTimeout(source.timer);
			source.reason = reason;
		}
		this.publishActivity(true);
	}
	markActivitySeen(at: ActivityMark): ActivitySeenUpdate {
		if (at.runtimeId !== this.id) return { status: 'rejected', reason: 'stale-runtime' };
		if (
			!Number.isSafeInteger(at.activitySequence) ||
			at.activitySequence < 0 ||
			at.activitySequence > this.activitySequence
		)
			return { status: 'rejected', reason: 'invalid-mark' };
		const status = at.activitySequence > this.activitySeen ? 'updated' : 'unchanged';
		if (status === 'updated') {
			this.activitySeen = at.activitySequence;
			this.publishActivity(false);
		}
		return { status, at: Object.freeze({ ...at }), seenThrough: this.activitySeen };
	}
	private bindActivitySource(meta: ActivitySourceMeta): ActivitySourceBinding | undefined {
		if (!this.activityOpen || this.disposed) return;
		if (this.activitySources.length >= ACTIVITY_LIMITS.sources) {
			this.activityReason = 'capacity';
			this.publishActivity(true);
			return;
		}
		if (!activitySummaryAllowed(meta, { deliveryId: 'registration', event: 'registration' })) return;
		if (meta.lifetime.kind === 'registration' && !['pi', 'opencode'].includes(meta.provider)) return;
		const sourceInstance = meta.lifetime.kind === 'registration' ? meta.lifetime.sourceInstance : undefined;
		if (
			sourceInstance &&
			this.activitySources.some(
				(s) => s.meta.lifetime.kind === 'registration' && s.meta.lifetime.sourceInstance === sourceInstance,
			)
		)
			return;
		const frozenMeta = Object.freeze({ ...meta, lifetime: Object.freeze({ ...meta.lifetime }) });
		const bindingId = `${this.id}:source:${this.activitySources.length + 1}`;
		const programEpoch = `${this.id}:program:1`;
		const source: (typeof this.activitySources)[number] = {
			meta: frozenMeta,
			binding: undefined as unknown as ActivitySourceBinding,
			closed: false,
			gapPending: false,
			sequence: 0,
			blocking: Object.freeze({ state: 'unknown' }),
			capabilities: Object.freeze({ activity: 'unknown', blocking: 'unknown', foreground: 'unknown' }),
		};
		const active = () =>
			this.activityOpen && !this.disposed && !source.closed && (!source.reason || source.reason === 'expired');
		const invalidate = (reason: ActivityReason) => {
			if (source.reason === reason || source.closed) return;
			source.reason = reason;
			if (source.timer !== undefined) this.activityClock.clearTimeout(source.timer);
			this.publishActivity(true);
		};
		const observe = (value: ActivityObservation, ordered = false): ActivityAdoption => {
			if (!active())
				return {
					status: 'rejected',
					reason: this.activityOpen ? (source.reason ?? 'closed') : this.activityReason,
				};
			if (source.gapPending && !ordered) return { status: 'rejected', reason: 'sequence-gap' };
			if (source.reason && source.reason !== 'expired') return { status: 'rejected', reason: source.reason };
			if (!activitySummaryAllowed(source.meta, value, { runtimeId: this.id, bindingId, programEpoch })) {
				invalidate('capacity');
				return { status: 'rejected', reason: 'capacity' };
			}
			const registered = source.meta.lifetime.kind === 'registration';
			if (registered) {
				if (value.sourceSequence === undefined) {
					invalidate('sequence-gap');
					return { status: 'rejected', reason: 'sequence-gap' };
				}
				if (value.sourceSequence <= source.sequence)
					return { status: 'duplicate', at: this.getActivitySnapshot().at };
				if (value.sourceSequence !== source.sequence + 1) {
					invalidate('sequence-gap');
					return { status: 'rejected', reason: 'sequence-gap' };
				}
				source.sequence = value.sourceSequence;
			} else if (value.sourceSequence !== undefined) {
				invalidate('invalid-observation');
				return { status: 'rejected', reason: 'invalid-observation' };
			} else if (source.delivery === value.deliveryId)
				return { status: 'duplicate', at: this.getActivitySnapshot().at };
			source.delivery = value.deliveryId;
			source.reason = undefined;
			if (value.event === 'HookError') {
				invalidate('hook-error');
				return { status: 'rejected', reason: 'hook-error' };
			}
			const b = value.blocking;
			if (registered && b?.state === 'blocked') {
				if (source.blockId && source.blockId !== b.blockId) {
					invalidate('source-mismatch');
					return { status: 'rejected', reason: 'source-mismatch' };
				}
				source.blockId = b.blockId;
				source.blocking = Object.freeze({ state: 'blocked', reason: b.reason });
			} else if (
				registered &&
				b?.state === 'clear' &&
				source.meta.provider === 'pi' &&
				value.event === 'ui_prompt_end' &&
				source.blockId === b.blockId
			) {
				source.blockId = undefined;
				source.blocking = Object.freeze({ state: 'clear' });
			}
			const factBlocking: ActivityBlocking = !registered
				? b?.state === 'blocked'
					? Object.freeze({ state: 'blocked', reason: b.reason })
					: (source.fact?.blocking ?? source.blocking)
				: source.blocking;
			source.fact = Object.freeze({
				state: value.state ?? source.fact?.state ?? 'unknown',
				observedAt: Date.now(),
				...(value.eventAt === undefined ? {} : { eventAt: value.eventAt }),
				event: value.event,
				blocking: factBlocking,
			});
			source.capabilities = Object.freeze({
				activity: registered ? (value.capabilities?.activity ?? 'observed') : 'unknown',
				blocking: registered ? (value.capabilities?.blocking ?? (b ? 'observed' : 'unknown')) : 'unknown',
				foreground: 'unknown',
			});
			const candidates = this.activitySources.filter((s) => !s.closed);
			if (
				registered &&
				candidates.length === 1 &&
				value.completion === 'turn-finished' &&
				value.state === 'done' &&
				((source.meta.provider === 'pi' && value.event === 'agent_settled') ||
					(source.meta.provider === 'opencode' && value.event === 'Stop')) &&
				!source.blockId &&
				this.activityReason !== 'capacity' &&
				!this.activityUncertainty
			)
				this.activityCompletion = Object.freeze({
					runtimeId: this.id,
					activitySequence: this.activitySequence + 1,
					observedAt: Date.now(),
				});
			if (
				registered &&
				candidates.length === 1 &&
				this.activityReason !== 'capacity' &&
				!this.activityUncertainty
			) {
				if (value.title) this.generatedTitle = value.title;
				if (value.resume?.nativeSessionId) this.nativeSessionId = value.resume.nativeSessionId;
				if (value.resume?.transcriptPath) this.transcriptPath = value.resume.transcriptPath;
			}
			if (source.timer !== undefined) this.activityClock.clearTimeout(source.timer);
			if (registered && (value.event === 'session_shutdown' || value.event === 'adapter_closed')) {
				source.closed = true;
				source.reason = 'closed';
			} else
				source.timer = this.activityClock.setTimeout(() => invalidate('expired'), ACTIVITY_LIMITS.freshnessMs);
			const at = Object.freeze({
				runtimeId: this.id,
				activitySequence: Math.min(Number.MAX_SAFE_INTEGER, this.activitySequence + 1),
			});
			this.publishActivity(true);
			return { status: 'accepted', at };
		};
		const observeOrdered = (values: readonly ActivityObservation[], gapPending: boolean): ActivityAdoption => {
			if (!active())
				return {
					status: 'rejected',
					reason: this.activityOpen ? (source.reason ?? 'closed') : this.activityReason,
				};
			const arrayInput: unknown = values;
			if (
				source.meta.lifetime.kind !== 'registration' ||
				!Array.isArray(arrayInput) ||
				typeof gapPending !== 'boolean' ||
				values.length > ACTIVITY_LIMITS.reorder ||
				(gapPending ? values.length !== 0 : values.length === 0)
			) {
				invalidate('invalid-observation');
				return { status: 'rejected', reason: 'invalid-observation' };
			}
			if (gapPending) {
				if (source.gapPending) return { status: 'duplicate', at: this.getActivitySnapshot().at };
				source.gapPending = true;
				const at = Object.freeze({
					runtimeId: this.id,
					activitySequence: Math.min(Number.MAX_SAFE_INTEGER, this.activitySequence + 1),
				});
				this.publishActivity(true);
				return { status: 'accepted', at };
			}
			// Preflight the complete bounded batch before adopting even its first fact.
			for (const value of values) {
				if (!activitySummaryAllowed(source.meta, value, { runtimeId: this.id, bindingId, programEpoch })) {
					invalidate('capacity');
					return { status: 'rejected', reason: 'capacity' };
				}
			}
			if (values.every((value) => value.sourceSequence! <= source.sequence))
				return { status: 'duplicate', at: this.getActivitySnapshot().at };
			if (values.some((value, index) => value.sourceSequence !== source.sequence + index + 1)) {
				invalidate('sequence-gap');
				return { status: 'rejected', reason: 'sequence-gap' };
			}
			if (this.activitySequence > Number.MAX_SAFE_INTEGER - values.length) {
				invalidate('capacity');
				return { status: 'rejected', reason: 'capacity' };
			}
			const batch = values.map((value) =>
				Object.freeze({
					...value,
					...(value.blocking ? { blocking: Object.freeze({ ...value.blocking }) } : {}),
					...(value.capabilities ? { capabilities: Object.freeze({ ...value.capabilities }) } : {}),
					...(value.resume ? { resume: Object.freeze({ ...value.resume }) } : {}),
				}),
			);
			this.activityBatch = true;
			let result: ActivityAdoption = { status: 'rejected', reason: 'closed' };
			try {
				source.gapPending = false;
				for (const value of batch) {
					result = observe(value, true);
					if (result.status === 'rejected') break;
				}
				return result;
			} finally {
				this.activityBatch = false;
				const changed = this.activityBatchChanged;
				this.activityBatchChanged = false;
				this.flushActivityNotice();
				if (changed) this.changed();
			}
		};
		source.binding = Object.freeze({
			bindingId,
			programEpoch,
			active,
			observe,
			observeOrdered,
			invalidate,
			close: () => {
				if (!source.closed) {
					source.closed = true;
					source.reason = 'closed';
					if (source.timer !== undefined) this.activityClock.clearTimeout(source.timer);
					this.publishActivity(true);
				}
			},
		});
		this.activitySources.push(source);
		this.publishActivity(true);
		return source.binding;
	}
	private publishActivity(advance: boolean, changed = true): void {
		if (advance && this.activitySequence < Number.MAX_SAFE_INTEGER) this.activitySequence++;
		else if (advance) {
			this.activityOpen = false;
			this.activityReason = 'capacity';
		}
		const candidates = this.activitySources.filter((s) => !s.closed);
		const current =
			this.activityOpen &&
			!this.activityUncertainty &&
			this.activityReason !== 'capacity' &&
			candidates.length === 1 &&
			!candidates[0]!.reason &&
			!candidates[0]!.gapPending &&
			!!candidates[0]!.fact &&
			candidates[0]!.capabilities.activity === 'observed' &&
			candidates[0]!.meta.lifetime.kind === 'registration'
				? candidates[0]
				: undefined;
		const reason: ActivityReason = !this.activityOpen
			? this.activityReason
			: this.activityReason === 'capacity'
				? 'capacity'
				: (this.activityUncertainty ??
					(candidates.length > 1
						? 'source-mismatch'
						: (candidates[0]?.reason ??
							(candidates[0]?.gapPending ? 'sequence-gap' : undefined) ??
							(candidates[0]?.meta.lifetime.kind === 'unproven'
								? 'legacy-unattributed'
								: 'not-observed'))));
		const support: ActivityCapabilities =
			current?.capabilities ??
			Object.freeze({
				activity:
					!this.activityOpen && ['disabled', 'unsupported'].includes(this.activityReason)
						? 'unavailable'
						: 'unknown',
				blocking:
					!this.activityOpen && ['disabled', 'unsupported'].includes(this.activityReason)
						? 'unavailable'
						: 'unknown',
				foreground: 'unknown',
			});
		this.activityDetail = Object.freeze({
			at: Object.freeze({ runtimeId: this.id, activitySequence: this.activitySequence }),
			revision: ++this.activityRevision,
			state: current?.fact?.state ?? 'unknown',
			observedAt: advance ? Date.now() : (this.activityDetail?.observedAt ?? Date.now()),
			source: Object.freeze({
				health: current
					? 'current'
					: !this.activityOpen && ['disabled', 'unsupported'].includes(this.activityReason)
						? 'unavailable'
						: 'unknown',
				...(current ? { bindingId: current.binding.bindingId } : { reason }),
				capabilities: support,
			}),
			sources: Object.freeze(
				this.activitySources.map((s) =>
					Object.freeze({
						bindingId: s.binding.bindingId,
						programEpoch: s.binding.programEpoch,
						meta: s.meta,
						health: s.closed
							? 'unavailable'
							: s.meta.lifetime.kind === 'registration' &&
								  !!s.fact &&
								  !s.reason &&
								  !s.gapPending &&
								  this.activityOpen
								? 'current'
								: 'unknown',
						...(s.reason || s.gapPending
							? { reason: s.reason ?? ('sequence-gap' as const) }
							: s.meta.lifetime.kind === 'unproven'
								? { reason: 'legacy-unattributed' as const }
								: {}),
						capabilities: s.gapPending
							? Object.freeze({
									activity: 'unknown' as const,
									blocking: 'unknown' as const,
									foreground: 'unknown' as const,
								})
							: s.capabilities,
						...(s.fact ? { lastFact: s.fact } : {}),
					}),
				),
			),
			...(candidates.length === 1 && candidates[0]?.fact ? { lastFact: candidates[0].fact } : {}),
			blocking: current?.blocking ?? Object.freeze({ state: 'unknown' }),
			promptEvidence: Object.freeze({ foreground: 'unknown', inputReady: this.inputReady() }),
			...(this.activityCompletion ? { completion: this.activityCompletion } : {}),
			seenThrough: this.activitySeen,
			unreadCompletion: !!this.activityCompletion && this.activityCompletion.activitySequence > this.activitySeen,
		});
		if (this.activityDetail.state !== 'unknown') {
			this.activity = this.activityDetail.state === 'working' ? 'running' : this.activityDetail.state;
			this.activityAt = this.activityDetail.observedAt;
		}
		this.pendingActivityNotice = true;
		if (this.activityBatch) {
			this.activityBatchChanged ||= changed;
			return;
		}
		this.flushActivityNotice();
		if (changed) this.changed();
	}
	/** Reentrant seen feedback keeps one latest notice, without a synchronous notification loop. */
	private flushActivityNotice(): void {
		if (this.notifyingActivity || !this.pendingActivityNotice || this.disposed) return;
		this.notifyingActivity = true;
		this.pendingActivityNotice = false;
		const value = this.activityDetail!;
		try {
			for (const listener of [...this.activityListeners]) {
				if (!this.activityListeners.has(listener)) continue;
				try {
					listener(value);
				} catch {
					this.activityListeners.delete(listener);
				}
			}
		} finally {
			this.notifyingActivity = false;
		}
		if (this.pendingActivityNotice && !this.activityNoticeScheduled) {
			this.activityNoticeScheduled = true;
			queueMicrotask(() => {
				this.activityNoticeScheduled = false;
				this.flushActivityNotice();
			});
		}
	}

	private disposed = false;
	private userInputClosed = false;
	private exitPending = false;
	inputDiagnostic?: SessionInputDiagnostic;
	resizeDiagnostic?: SessionResizeDiagnostic;
	replyDiagnostic?: SessionReplyDiagnostic;
	private resizeRequestSequence = 0;
	private readonly platform: string;
	private readonly colors: () => SessionColors;

	constructor(init: SessionInit) {
		const configuredProfile = init.screenProfile ?? DEFAULT_SCREEN_PROFILE;
		for (const [key, value] of Object.entries(configuredProfile))
			if (
				!Number.isSafeInteger(value) ||
				value <= 0 ||
				value > DEFAULT_SCREEN_PROFILE[key as keyof ScreenProfile]
			)
				throw new Error('Invalid screen resource profile');
		if (configuredProfile.parseBatchBytes < 2) throw new Error('Invalid screen parse batch');
		if (
			!screenGridAllowed(
				{ cols: init.cols, rows: init.rows },
				init.scrollback,
				init.screenProfile ?? DEFAULT_SCREEN_PROFILE,
			)
		)
			throw new Error('Screen geometry exceeds resource limits');
		this.home = init.home;
		this.id = init.id;
		this.sid = init.sid;
		this.kind = init.kind;
		this.agentId = init.agentId;
		this.accountId = init.accountId;
		this.automated = init.automated === true;
		this.autoTitle = init.title;
		this.cwd = this.startCwd = init.cwd;
		this.platform = init.platform;
		this.colors = init.colors;
		this.activity = init.agentId ? 'unknown' : 'idle';
		const budget = init.screenBudget ?? new SessionScreenBudget();
		const profile = init.screenProfile ?? DEFAULT_SCREEN_PROFILE;
		const initialBytes =
			65536 +
			init.rows * init.cols * 320 +
			(init.scrollback + init.rows * 2) * 8 +
			4 * NATIVE_OUTPUT_LIMITS.sessionUnacknowledgedBytes;
		if (initialBytes > profile.maxRuntimeBytes || !budget.reserve(this, initialBytes, profile.maxAgentBytes))
			throw new Error('Screen allocation exceeds resource limits');
		// Size reports in characters (XTWINOPS 18) come from the model itself.
		this.model = new Model({
			cols: init.cols,
			rows: init.rows,
			scrollback: init.scrollback,
			allowProposedApi: true,
			screenReaderMode: true,
			windowOptions: { getWinSizeChars: true },
		});
		this.model.loadAddon(this.serializer);
		this.installHandlers();
		try {
			this.screen = new SessionScreen(
				this.id,
				this.model,
				(reason) => {
					this.closeInput();
					this.error = t('agent.screen.resourceLimit');
					const port = this.port,
						sid = this.sid;
					if (port?.outputAbandon === 1 && port.abandonOutput)
						this.screen.barrier(() => {
							this.screen.abandon();
							try {
								port.abandonOutput!(sid);
							} catch {
								/* Truncated local display does not prove native receipt. */
							}
						});
					try {
						port?.resourceLimit?.(reason);
					} catch {
						/* Keep a resource fault observable when stop dispatch fails. */
					}
					this.changed();
				},
				init.screenProfile,
				budget,
				this,
			);
		} catch (error) {
			this.model.dispose();
			budget.release(this);
			throw error;
		}
	}

	private installHandlers(): void {
		const model = this.model;
		// Replies the headless parser produces itself (DA, CPR, DSR, DECRQM, DECRQSS).
		model.onData((data) => this.reply(data));
		model.onBinary((data) => this.reply(data));
		model.onTitleChange((title) => {
			if (!title || title === this.autoTitle) return;
			this.autoTitle = title.slice(0, 200);
			this.changed();
		});
		model.buffer.onBufferChange((buffer) => {
			this.kitty.screen = buffer.type === 'alternate' ? 'alt' : 'main';
		});
		// Kitty keyboard protocol: push, pop, set and query the enhancement flags.
		model.parser.registerCsiHandler({ prefix: '>', final: 'u' }, (params) => {
			this.kitty.push(Number(params[0] ?? 0) || 0);
			return true;
		});
		model.parser.registerCsiHandler({ prefix: '<', final: 'u' }, (params) => {
			this.kitty.pop(Number(params[0] ?? 1) || 1);
			return true;
		});
		model.parser.registerCsiHandler({ prefix: '=', final: 'u' }, (params) => {
			this.kitty.set(Number(params[0] ?? 0) || 0, Number(params[1] ?? 1) || 1);
			return true;
		});
		model.parser.registerCsiHandler({ prefix: '?', final: 'u' }, () => {
			this.reply(this.kitty.report());
			return true;
		});
		// Private mode the model does not track for us: win32-input-mode (9001).
		const privateMode = (enabled: boolean) => (params: (number | number[])[]) => {
			for (const param of params) {
				if (param === 9001) this.win32 = enabled;
			}
			return false;
		};
		model.parser.registerCsiHandler({ prefix: '?', final: 'h' }, privateMode(true));
		model.parser.registerCsiHandler({ prefix: '?', final: 'l' }, privateMode(false));
		// Soft and hard resets clear keyboard enhancements.
		model.parser.registerEscHandler({ final: 'c' }, () => {
			this.kitty.reset();
			this.win32 = false;
			return false;
		});
		// Foreground, background and cursor color queries follow the view's theme.
		for (const [ident, key] of [
			[10, 'foreground'],
			[11, 'background'],
			[12, 'cursor'],
		] as const) {
			model.parser.registerOscHandler(ident, (data) => {
				if (data !== '?') return false;
				const color = oscColor(this.colors()[key]);
				if (color) this.reply(`\x1b]${ident};${color}\x1b\\`);
				return true;
			});
		}
		model.parser.registerOscHandler(133, (data) => this.mark(parseOsc133(data)));
		model.parser.registerOscHandler(633, (data) => this.mark(parseOsc633(data)));
		model.parser.registerOscHandler(7, (data) => this.mark(parseOsc7(data, this.platform)));
	}

	private mark(mark: ShellMark | undefined): boolean {
		if (!mark) return false;
		if (mark.kind === 'cwd') {
			if (mark.cwd && mark.cwd !== this.cwd) {
				this.cwd = mark.cwd;
				this.changed();
			}
		} else if (mark.kind === 'prompt-start') {
			const marker = this.model.registerMarker(0);
			if (marker) {
				this.marks.push({ marker });
				marker.onDispose(() => {
					const index = this.marks.findIndex((entry) => entry.marker === marker);
					if (index >= 0) this.marks.splice(index, 1);
				});
			}
		} else if (mark.kind === 'command-finished') {
			const last = this.marks[this.marks.length - 1];
			if (last && last.exitCode === undefined) last.exitCode = mark.exitCode ?? 0;
		}
		return true;
	}

	private reply(data: string): void {
		if (this.disposed || (this.connection !== 'connected' && !this.exitPending) || !this.port) return;
		const port = this.port,
			sid = this.sid;
		try {
			(port.reply ?? port.input).call(port, sid, data);
		} catch (error) {
			this.replyFailure(
				error instanceof NativeReplyError ? error.failure : { state: 'unknown', reason: 'transport-lost' },
			);
		}
	}

	/** A lost device reply stays visible; neither later replies nor user input repair it. */
	replyFailure(value: NativeReplyFailure): void {
		if (this.disposed || this.replyDiagnostic) return;
		const message = t(value.state === 'none' ? 'agent.screen.replyNone' : 'agent.screen.replyUnknown');
		this.replyDiagnostic = Object.freeze({ ...value, runtimeId: this.id, sid: this.sid, message });
		this.error = message;
		this.closeInput();
		if (!this.running) return;
		const port = this.port,
			sid = this.sid;
		try {
			if (port?.resourceLimit) port.resourceLimit('reply-failure');
			else port?.end(sid, true);
		} catch {
			// The original diagnostic remains; requesting cleanup does not prove it completed.
		}
	}

	private changed(): void {
		if (this.activityDetail && this.activityDetail.promptEvidence.inputReady !== this.inputReady())
			this.publishActivity(false, false);
		for (const listener of [...this.changes]) {
			try {
				listener();
			} catch {
				this.changes.delete(listener);
			}
		}
	}

	/** Connected to the helper (the process started). */
	bindPort(port: SessionPort): void {
		this.port = port;
	}
	adopt(pid: number | null): void {
		this.pid = pid ?? undefined;
		// A process can exit before native's spawned reply arrives.
		if (!this.disposed && this.connection === 'starting') this.connection = 'connected';
		this.changed();
	}
	attach(port: SessionPort, pid: number | null): void {
		this.bindPort(port);
		this.adopt(pid);
	}

	fail(cause: unknown, effectUnknown = false): void {
		if (this.connection === 'exited' || this.connection === 'disconnected' || this.disposed) return;
		this.invalidateActivity(effectUnknown ? 'transport-lost' : 'runtime-ended');
		const message = effectUnknown
			? t('agent.managed.effectUnknown')
			: cause instanceof Error
				? cause.message
				: String(cause);
		this.failureCause = cause;
		this.connection = effectUnknown ? 'disconnected' : 'failed';
		this.error = message;
		this.activity = 'exited';
		this.writeLocal(`\r\n\x1b[31m${message}\x1b[0m\r\n`);
		if (effectUnknown) this.screen.barrier(() => this.emit({ kind: 'disconnected' }));
		this.changed();
	}

	get title(): string {
		return this.userTitle || this.autoTitle;
	}
	get renamed(): boolean {
		return !!this.userTitle;
	}
	setGeneratedTitle(title: string): void {
		if (!title || this.autoTitle === title) return;
		this.autoTitle = title;
		this.appliedGeneratedTitle = title;
		this.changed();
	}
	rename(title: string): void {
		this.userTitle = title.trim().slice(0, 200);
		this.changed();
	}

	get running(): boolean {
		return !this.disposed && (this.connection === 'connected' || this.connection === 'starting');
	}

	get keyboard(): KeyboardModes {
		return { kitty: this.kitty.current, win32: this.win32 };
	}
	get bracketedPaste(): boolean {
		return this.model.modes.bracketedPasteMode;
	}
	/** The CLI is waiting for typed input: it enabled bracketed paste. */
	inputReady(): boolean {
		return !this.userInputClosed && this.connection === 'connected' && this.model.modes.bracketedPasteMode;
	}
	get cols(): number {
		return this.model.cols;
	}
	get rows(): number {
		return this.model.rows;
	}

	/** Output bytes from the helper. */
	receive(bytes: Uint8Array): void {
		if (this.disposed) return;
		const size = bytes.length;
		const port = this.port,
			sid = this.sid;
		this.screen.receive(
			bytes,
			(raw) => this.decoder.decode(raw, { stream: true }),
			() => port?.acknowledge(sid, size),
			(text) => {
				if (!text) return;
				this.fanout(text);
				for (const observer of [...this.observers]) {
					try {
						observer({ kind: 'data', text });
					} catch {
						this.observers.delete(observer);
					}
				}
			},
		);
	}

	private fanout(text: string): void {
		for (const subscriber of this.subscribers) {
			if (!subscriber.ready) {
				if (subscriber.backlogBytes + text.length * 2 > this.screen.profile.maxObserverBytes) {
					this.subscribers.delete(subscriber);
					subscriber.release();
					continue;
				}
				if (subscriber.backlog.length >= 64) subscriber.backlog = [subscriber.backlog.join('')];
				subscriber.backlog.push(text);
				subscriber.backlogBytes += text.length * 2;
				continue;
			}
			try {
				subscriber.listener(text);
			} catch {
				this.subscribers.delete(subscriber);
				subscriber.release();
			}
		}
	}
	private writeLocal(text: string): void {
		this.screen.write(text, undefined, 0, () => this.fanout(text));
	}

	/** Join a bounded parsed projection. Native ACK and replies never wait for this observer. */
	openScreen(options: Readonly<{ after?: ScreenMark }>, sink: ScreenSink): ScreenStream {
		return this.screen.open(options, sink);
	}
	readScreen(request: ScreenReadRequest): Promise<ScreenReadResult> {
		return this.screen.read(request);
	}
	getScreenUsage(): Readonly<ScreenUsage> {
		return this.screen.usage();
	}
	getScreenProfile(): Readonly<ScreenProfile> {
		return this.screen.profile;
	}
	/** @internal Lifecycle owners wait for the final parsed screen before releasing its model. */
	whenParsed(): Promise<void> {
		return this.screen.settled();
	}
	registerView(viewId: string): ScreenViewLease {
		return this.screen.registerView(viewId);
	}
	setViewVisible(lease: ScreenViewLease, visible: boolean): void {
		this.screen.setViewVisible(lease, visible);
	}
	/** Only an explicit current GUI focus intent may grant size ownership. */
	setViewFocused(lease: ScreenViewLease, focused: boolean): boolean {
		return this.screen.setViewFocused(lease, focused);
	}
	unregisterView(lease: ScreenViewLease): void {
		this.screen.unregisterView(lease);
	}
	requestViewSize(lease: ScreenViewLease, grid: ScreenGrid): Promise<ScreenGeometryResult> {
		const target = { ...grid };
		return this.screen.requestSize(lease, target, () => {
			const requestSequence = ++this.resizeRequestSequence;
			const current = () => !this.disposed && requestSequence === this.resizeRequestSequence;
			const failed = (
				value: { state: 'none' | 'unknown'; reason: NativeInputFailure['reason'] },
				op?: number,
			) => {
				if (!current()) return;
				const message = t(value.state === 'none' ? 'agent.screen.sizeRejected' : 'agent.screen.sizeUnknown');
				this.resizeDiagnostic = Object.freeze({
					...value,
					runtimeId: this.id,
					requestSequence,
					...(op ? { op } : {}),
					geometry: Object.freeze({ ...target }),
					message,
				});
				this.error = message;
				this.changed();
			};
			const unconfirmed = (reason: 'closed' | 'unsupported' | 'transport-lost') => {
				this.screen.observeNativeGeometry(0)({ op: 0, state: 'unknown', reason });
				failed({ state: 'unknown', reason });
			};
			if (this.connection !== 'connected') {
				unconfirmed('closed');
				return 'unknown';
			}
			const port = this.port,
				sid = this.sid;
			if (!port?.submitResize) {
				try {
					port?.resize(sid, target.cols, target.rows);
					unconfirmed('unsupported');
					return 'unsupported';
				} catch {
					unconfirmed('transport-lost');
					return 'unknown';
				}
			}
			let result: NativeResizeSubmission;
			try {
				result = port.submitResize(sid, target.cols, target.rows);
			} catch {
				unconfirmed('transport-lost');
				return 'unknown';
			}
			const update = this.screen.observeNativeGeometry(result.op);
			let terminal = false;
			const accept = (
				value: Awaited<NativeResizeSubmission['finished']> | Awaited<NativeResizeSubmission['queued']>,
			) => {
				if (!current() || terminal || value.op !== result.op) return;
				terminal = value.state !== 'queued';
				update(value);
				if (value.state === 'none' || value.state === 'unknown') failed(value, result.op);
				else if (value.state === 'applied' && this.resizeDiagnostic) {
					if (this.error === this.resizeDiagnostic.message) this.error = undefined;
					this.resizeDiagnostic = undefined;
					this.changed();
				}
			};
			const rejected = () => accept({ op: result.op, state: 'unknown', reason: 'transport-lost' });
			void result.queued.then(accept, rejected);
			void result.finished.then(accept, rejected);
			return 'requested';
		});
	}

	exit(code: number | null, signal: string | null): void {
		this.invalidateActivity(code === null && signal === null ? 'transport-lost' : 'runtime-ended');
		if (this.connection === 'exited' || this.disposed || this.exitPending) return;
		this.exitEvidence = { code, signal, confirmed: code !== null || signal !== null };
		this.closeInput();
		this.exitPending = true;
		this.connection = code === null && signal === null ? 'disconnected' : 'exited';
		if (code !== null || signal !== null) this.exitCode = code ?? -1;
		if (code === null && signal === null) {
			this.error = t('agent.managed.disconnected');
			this.screen.finalize(
				() => '',
				() => undefined,
				`\r\n\x1b[2m[${this.error}]\x1b[0m\r\n`,
				'unknown',
				() => {
					this.connection = 'disconnected';
					this.exitPending = false;
					this.activity = 'exited';
					this.emit({ kind: 'disconnected' });
					this.changed();
				},
			);
			return;
		}
		const evidence = this.port?.outputEvidence?.(),
			exitCode = code ?? -1;
		this.screen.finalize(
			() => this.decoder.decode(),
			(text) => {
				this.fanout(text);
				this.emit({ kind: 'data', text });
			},
			`\r\n\x1b[2m[${signal ? `Process ended: ${signal}` : `Process exited: ${exitCode}`}]\x1b[0m\r\n`,
			evidence === 'drained' ? 'complete' : (evidence ?? 'unknown'),
			() => {
				this.connection = 'exited';
				this.exitPending = false;
				this.activity = 'exited';
				this.activityAt = Date.now();
				this.exitCode = exitCode;
				this.emit({ kind: 'exit', code: exitCode });
				this.changed();
			},
		);
	}

	private emit(event: SessionEvent): void {
		for (const observer of [...this.observers]) {
			try {
				observer(event);
			} catch {
				this.observers.delete(observer);
			}
		}
	}

	/** The helper went away; the process is gone with it. */
	disconnect(reason: string): void {
		this.invalidateActivity('transport-lost');
		if (!this.running) return;
		this.closeInput();
		this.error = reason;
		this.screen.setOutput('unknown');
		this.writeLocal(`\r\n\x1b[31m[Terminal helper stopped: ${reason}]\x1b[0m\r\n`);
		this.screen.barrier(() => {
			if (this.connection === 'exited') return;
			this.connection = 'disconnected';
			this.activity = 'exited';
			this.emit({ kind: 'disconnected' });
			this.changed();
		});
	}

	setActivity(activity: Activity, data: Record<string, unknown> = {}): void {
		if (!this.running) return;
		const nativeId = data.session_id ?? data.sessionId;
		const message = data.last_assistant_message ?? data.lastMessage ?? data.message ?? data.prompt;
		if (typeof message === 'string') this.lastMessage = message.slice(0, 2000);
		const title = data.session_title ?? data.title;
		if (typeof title === 'string') this.generatedTitle = title.slice(0, 200);
		if (typeof nativeId === 'string') this.nativeSessionId = nativeId;
		if (typeof data.transcript_path === 'string') this.transcriptPath = data.transcript_path;
		this.activityAt = Date.now();
		this.activity = activity;
		this.changed();
	}

	input(data: string | Uint8Array): void {
		if (!data.length) return;
		if (this.port?.inputAdmission === 1) {
			this.submitInput(data);
			return;
		}
		if (this.disposed || this.userInputClosed || this.connection !== 'connected') {
			this.inputFailure({ op: 0, state: 'none', reason: 'closed' });
			return;
		}
		if (
			data.length > this.screen.profile.maxLocalInputBytes ||
			(typeof data === 'string' ? new TextEncoder().encode(data).length : data.length) >
				this.screen.profile.maxLocalInputBytes
		) {
			this.inputFailure({ op: 0, state: 'none', reason: 'invalid' });
			return;
		}
		try {
			this.port?.input(this.sid, data);
			this.inputFailure({ op: 0, state: 'unknown', reason: 'legacy-unconfirmed' });
		} catch {
			this.inputFailure({ op: 0, state: 'unknown', reason: 'transport-lost' });
		}
	}
	/** A whole input operation. Only the captured native receipt can prove queued/written. */
	submitInput(data: string | Uint8Array, options?: NativeInputOptions): SessionInputSubmission {
		const none = (reason: Extract<NativeInputFailure, { state: 'none' }>['reason']): SessionInputSubmission => {
			const result = { op: 0, state: 'none', reason } as const;
			this.inputFailure(result);
			return {
				runtimeId: this.id,
				op: 0,
				queued: Promise.resolve(result),
				finished: Promise.resolve(result),
				cancel: () => undefined,
			};
		};
		if (this.disposed || this.userInputClosed || this.connection !== 'connected') return none('closed');
		if (options?.signal?.aborted) return none('cancelled');
		const port = this.port;
		if (port?.inputAdmission !== 1 || !port.inputLimits || !port.submitInput) return none('unsupported');
		const limit = Math.min(this.screen.profile.maxLocalInputBytes, port.inputLimits.operationBytes);
		if (
			!data.length ||
			data.length > limit ||
			(typeof data === 'string' ? new TextEncoder().encode(data).length : data.length) > limit
		)
			return none('invalid');
		try {
			const submission = port.submitInput(this.sid, data, options);
			void submission.queued.then((value) => {
				if (value.state !== 'queued') this.inputFailure(value);
			});
			void submission.finished.then((value) => {
				if (value.state !== 'written') this.inputFailure(value);
			});
			return {
				runtimeId: this.id,
				op: submission.op,
				queued: submission.queued,
				finished: submission.finished,
				cancel: () => submission.cancel(),
			};
		} catch {
			const value: NativeInputFailure = { op: 0, state: 'unknown', reason: 'transport-lost' };
			this.inputFailure(value);
			return {
				runtimeId: this.id,
				op: 0,
				queued: Promise.resolve(value),
				finished: Promise.resolve(value),
				cancel: () => undefined,
			};
		}
	}
	submitPaste(text: string, options?: SessionPasteOptions): SessionInputSubmission {
		if (text.length > this.screen.profile.maxLocalInputBytes) return this.submitInput(text, options);
		return this.submitInput(pasteSequence(text, this.bracketedPaste) + (options?.appendEnter ? '\r' : ''), options);
	}
	/** Named raw keys use the live parser modes and the same whole-operation input owner as the GUI. */
	submitKeys(keys: string, options?: NativeInputOptions): SessionInputSubmission {
		return this.submitInput(
			encodeNamedKeys(keys, {
				...this.keyboard,
				applicationCursorKeys: this.model.modes.applicationCursorKeysMode,
			}),
			options,
		);
	}
	/** @internal Captured native void-entry diagnostics retain their actual operation effect. */
	inputFailure(value: NativeInputFailure | { op: number; state: 'unknown'; reason: 'legacy-unconfirmed' }): void {
		if (this.inputDiagnostic?.state === value.state && this.inputDiagnostic.reason === value.reason) return;
		const message =
			value.state === 'unknown'
				? t('agent.screen.inputUnknown')
				: value.reason === 'unsupported'
					? t('agent.screen.inputUnsupported')
					: value.reason === 'closed'
						? t('agent.screen.inputClosed')
						: t('agent.screen.inputNone', {
								reason: t(
									value.reason === 'capacity'
										? 'agent.screen.reasonCapacity'
										: value.reason === 'cancelled'
											? 'agent.screen.reasonCancelled'
											: 'agent.screen.reasonInvalid',
								),
							});
		this.inputDiagnostic = Object.freeze({ ...value, runtimeId: this.id, message });
		this.error = message;
		this.changed();
	}

	/** Paste as one block: sanitized and bracketed when the application asked for it. */
	paste(text: string): void {
		if (text.length > this.screen.profile.maxLocalInputBytes) {
			this.inputFailure({ op: 0, state: 'none', reason: 'invalid' });
			return;
		}
		this.input(pasteSequence(text, this.bracketedPaste));
	}

	resize(cols: number, rows: number): void {
		cols = Math.max(2, Math.floor(cols));
		rows = Math.max(1, Math.floor(rows));
		if (cols === this.model.cols && rows === this.model.rows) return;
		if (
			!this.screen.legacySizeAllowed() ||
			!screenGridAllowed({ cols, rows }, this.model.options.scrollback ?? 0, this.screen.profile)
		) {
			this.error = t('agent.screen.sizeRejected');
			this.changed();
			return;
		}
		this.screen.mutate(
			() => {
				this.model.resize(cols, rows);
				if (this.connection === 'connected') this.port?.resize(this.sid, cols, rows);
			},
			'resize',
			undefined,
			this.screen.geometryReserve({ cols, rows }),
			() => {
				this.error = t('agent.screen.sizeRejected');
				this.changed();
			},
		);
	}

	closeInput(): void {
		if (this.activityOpen) this.invalidateActivity('stop-requested');
		this.userInputClosed = true;
		this.changed();
	}

	/** Hang up (or kill with `force`). */
	end(force = false): void {
		this.closeInput();
		if (this.connection === 'connected') this.port?.end(this.sid, force);
	}

	/** Snapshot first, then live output, with nothing lost or repeated in between. */
	subscribe(listener: (text: string) => void): () => void {
		const reservation = this.screen.registerLegacy();
		if (!reservation) throw new Error(t('agent.screen.unavailable'));
		const subscriber: Subscriber = {
			listener,
			ready: false,
			backlog: [],
			backlogBytes: 0,
			release: () => {
				subscriber.initial = undefined;
				subscriber.backlog.length = 0;
				subscriber.backlogBytes = 0;
				reservation.dispose();
			},
		};
		const cancel = () => {
			this.subscribers.delete(subscriber);
			subscriber.backlog.length = 0;
			subscriber.backlogBytes = 0;
			subscriber.release();
		};
		this.subscribers.add(subscriber);
		this.screen.barrier(() => {
			if (!this.subscribers.has(subscriber)) return;
			if (!reservation.capture()) {
				cancel();
				this.error = t('agent.screen.unavailable');
				this.changed();
				return;
			}
			try {
				subscriber.initial = this.serializer.serialize({ scrollback: this.model.options.scrollback ?? 1000 });
				reservation.captured();
			} catch {
				cancel();
				this.error = t('agent.screen.unavailable');
				this.changed();
				return;
			}
			// This snapshot covers everything parsed before this exact barrier watermark.
			subscriber.backlog.length = 0;
			subscriber.backlogBytes = 0;
			queueMicrotask(() => {
				if (!this.subscribers.has(subscriber) || this.disposed) return;
				try {
					const initial = subscriber.initial ?? '';
					subscriber.initial = undefined;
					listener(initial);
					for (const text of subscriber.backlog) {
						if (!this.subscribers.has(subscriber)) return;
						listener(text);
					}
					subscriber.backlog.length = 0;
					subscriber.backlogBytes = 0;
					subscriber.ready = true;
				} catch {
					cancel();
				} finally {
					reservation.ready();
				}
			});
		});
		return cancel;
	}

	snapshot(): string {
		const reservation = this.screen.registerLegacy();
		if (!reservation) throw new Error(t('agent.screen.unavailable'));
		try {
			if (!reservation.capture()) throw new Error(t('agent.screen.unavailable'));
			return this.serializer.serialize({ scrollback: this.model.options.scrollback ?? 1000 });
		} finally {
			reservation.dispose();
		}
	}
	/** Plain text of the last `lines` rows (automation output, previews). */
	text(lines = 200): string {
		const buffer = this.model.buffer.active;
		const out: string[] = [];
		for (let y = Math.max(0, buffer.length - lines); y < buffer.length; y++)
			out.push(buffer.getLine(y)?.translateToString(true) ?? '');
		return out.join('\n').replace(/\n+$/, '');
	}

	observe(listener: (event: SessionEvent) => void): () => void {
		this.observers.add(listener);
		return () => this.observers.delete(listener);
	}

	onChange(listener: () => void): () => void {
		this.changes.add(listener);
		return () => this.changes.delete(listener);
	}

	/** Prompt lines (buffer rows) for navigation, with each command's result. */
	prompts(): PromptHistory {
		const history = new PromptHistory();
		for (const { marker, exitCode } of this.marks) {
			if (marker.isDisposed || marker.line < 0) continue;
			history.prompt(marker.line);
			if (exitCode !== undefined) history.finished(exitCode);
		}
		return history;
	}

	reset(): void {
		// RIS resets both the authoritative parser and every attached renderer.
		this.writeLocal('\x1bc');
	}

	clearScrollback(): void {
		this.screen.mutate(
			() => this.model.clear(),
			'clear',
			() => this.fanout('\x1b[3J'),
		);
	}

	setScrollback(lines: number): void {
		if (!screenGridAllowed({ cols: this.cols, rows: this.rows }, lines, this.screen.profile)) {
			this.error = t('agent.screen.retentionRejected');
			this.changed();
			return;
		}
		this.screen.mutate(
			() => {
				this.model.options.scrollback = lines;
			},
			'resize',
			undefined,
			this.screen.geometryReserve({ cols: this.cols, rows: this.rows }, lines),
			() => {
				this.error = t('agent.screen.retentionRejected');
				this.changed();
			},
		);
	}

	dispose(): void {
		this.invalidateActivity('closed');
		this.activityListeners.clear();
		if (this.disposed) return;
		this.disposed = true;
		for (const subscriber of this.subscribers) subscriber.release();
		this.subscribers.clear();
		this.observers.clear();
		this.changes.clear();
		this.screen.dispose();
		this.model.dispose();
	}
}
