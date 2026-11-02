import type {
	NativeInputLimits,
	NativeInputSubmission,
	NativeResizeSubmission,
	NativeInputOptions,
	NativeInputFailure,
	NativeReplyFailure,
	NativeEditorBinding,
	NativeSpawnEnvironment,
} from './input';
import type { NativeEditorLaunch, EditorMessage } from './control-wire.generated';
export type {
	NativeEditorLaunch,
	NativeEditorRecipe,
	NativeEditorIdentity,
	NativeEditorRegistration,
	NativeEditorOutcome,
} from './control-wire.generated';
export type {
	NativeEditorBinding,
	NativeEditorSubmission,
	NativeEditorInputOptions,
	NativeEditorQueuedResult,
	NativeEditorFinishedResult,
	NativeEditorCloseNotice,
	NativeEditorFailure,
	NativeSpawnEnvironment,
} from './input';
export { NATIVE_EDITOR_LIMITS, NativeEditorError } from './input';
export type {
	NativeInputLimits,
	NativeInputSubmission,
	NativeResizeSubmission,
	NativeInputOptions,
	NativeInputFailure,
	NativeReplyFailure,
	NativeInputQueuedResult,
	NativeInputFinishedResult,
	NativeResizeQueuedResult,
	NativeResizeFinishedResult,
} from './input';
export { NATIVE_INPUT_LIMITS, NATIVE_INPUT_TIMEOUT_MS, NATIVE_OUTPUT_LIMITS } from './input';
import type { NativeTerminationNotice } from './termination';
import type {
	ControlMessage,
	ControlScope,
	ControlRequestMessage,
	ControlRegisteredMessage,
	ControlProgress,
	ControlResponse,
	ControlCancelMessage,
	ControlErrorCode,
} from './control-wire.generated';
export type { RootEvidence, TerminationEvidence, TerminationReason, NativeTerminationNotice } from './termination';
export { NATIVE_TERMINATION_TIMEOUT_MS, NATIVE_TERMINATION_OBSERVE_MS } from './termination';

export type NativeCapability = 'pty' | 'history' | 'cookies' | 'control';

/** Immutable observation; exited/not-started prove no helper process remains, not successful cleanup. */
export interface NativeHelperTermination {
	readonly state: 'exited' | 'not-started' | 'unconfirmed';
	readonly code: number | null;
	readonly signal: string | null;
	/** Local escalation was requested; this does not infer which event caused exit. */
	readonly forced: boolean;
	readonly stdioClosed: boolean;
	readonly diagnostic: string;
}

/** Disposal failed. The non-rejecting fence may later confirm physical exit after an observation timeout. */
export class NativeShutdownError extends Error {
	readonly outcome: Readonly<NativeHelperTermination>;
	constructor(message: string, outcome: NativeHelperTermination, readonly termination: Promise<Readonly<NativeHelperTermination>>) {
		super(message);
		this.name = 'NativeShutdownError';
		this.outcome = Object.freeze({ ...outcome });
	}
}

/** One exclusively reserved encoded frame; settlement is local callback + returned/drain, never remote delivery. */
export interface NativeControlFrame {
	readonly handed: boolean;
	readonly settled: Promise<void>;
	send(): boolean;
	/** B transport only: reuses an unsent pending progress permit and promise. Failure retains the prior observation. */
	replace?(message: ControlMessage): boolean;
	/** Cancels only before physical handoff. */
	cancel(): boolean;
}
export class NativeControlError extends Error {
	constructor(
		readonly code: ControlErrorCode,
		message: string,
		readonly effect: 'none' | 'unknown' = 'none',
	) {
		super(message);
		this.name = 'NativeControlError';
	}
}
export interface NativeControlCall {
	readonly wire: Readonly<ControlRequestMessage>;
	/** Observation cancellation only; admitted business must retain its own lifetime. */
	readonly signal: AbortSignal;
}
export interface NativeControlEvents {
	/** Called synchronously so business capture precedes any asynchronous scope lookup. */
	forward(call: NativeControlCall): void;
	cancel?(call: NativeControlCall, reason: ControlCancelMessage['reason']): void;
	closed(reason: string): void;
}
export interface NativeControlRegistration {
	readonly route: Readonly<ControlRegisteredMessage>;
	/** Uses the original PTY lease identity, host, generation and live owners. */
	current(capturedPtyLease: NativeLease): boolean;
	/** Once, synchronously, before business effects. False is no admission. */
	admit(call: NativeControlCall): boolean;
	/** Bounded latest observation; failure never revokes admitted business. */
	progress(call: NativeControlCall, value: Readonly<ControlProgress>): boolean;
	/** One business terminal result. The call remains charged until native settlement too. */
	result(call: NativeControlCall, value: Readonly<ControlResponse>): Promise<void>;
	/** Revokes TS admission synchronously; rejection may leave physical cleanup unconfirmed. */
	close(): Promise<void>;
}

export interface NativeEvents {
	/** Strict metadata from this captured generation; Host routes only to the original enrolled PTY owner. */
	editor?(message: EditorMessage): void;
	/** Strictly decoded control message from the captured helper generation. */
	control?(message: ControlMessage): void;
	/** Negotiated final reply I/O fence; independent of root exit and cleanup evidence. */
	replySettled?(session: number): void;
	/** Failed legacy/manual user submissions are observable without changing their void signatures. */
	inputFailure?(session: number, result: Readonly<NativeInputFailure>): void;
	/** One device reply failed; distinct from user input and never replayed. */
	replyFailure?(session: number, result: Readonly<NativeReplyFailure>): void;
	termination?(session: number, notice: Readonly<NativeTerminationNotice>): void;
	output(session: number, bytes: Uint8Array): void;
	exit(session: number, code: number | null, signal: string | null): void;
	closed(reason: string): void;
}

export interface NativeSpawnOptions {
	/** Explicit enrollment only; native reserves the existing Session slot before creating a per-run capability. */
	editor?: NativeEditorLaunch;
	file: string;
	args: string[];
	cwd?: string;
	env: Record<string, string>;
	cols: number;
	rows: number;
}

export type NativeSpawnFailure =
	| { readonly code: 'program-rejected' | 'directory-unavailable' | 'pty-unavailable'; readonly effect: 'none' }
	| { readonly code: 'session-conflict' | 'unconfirmed'; readonly effect: 'unknown' };

/** Only validated native rejection evidence can prove that no child was started. */
export class NativeSpawnError extends Error {
	constructor(
		message: string,
		readonly failure: NativeSpawnFailure,
	) {
		super(message);
	}
}

/** Local synchronous failure: none proves rejection; unknown cannot prove non-delivery. */
export class NativeReplyError extends Error {
	constructor(readonly failure: NativeReplyFailure) {
		super(`Native parser reply ${failure.state}: ${failure.reason}`);
	}
}

/** A single helper generation. Rejected operations are never automatically replayed. */
export interface NativeConnection {
	/** Bounded pure profile read of this captured generation; never starts a helper or consults later process.env. */
	spawnEnvironment?(overrides: Readonly<Record<string, string>>): NativeSpawnEnvironment;
	readonly editorTransactions?: 1;
	/** Original lease/generation/SID handle only. No capability means no fallback paste/Enter. */
	editorBinding?(sid: number): NativeEditorBinding | undefined;
	readonly alive: boolean;
	readonly version: string;
	readonly terminalTermination?: 1;
	readonly replySettlement?: 1;
	/** Explicitly abandons display; never an ACK, native delivery or cleanup confirmation. */
	readonly outputAbandon?: 1;
	abandonOutput?(sid: number): void;
	readonly inputAdmission?: 1;
	readonly inputLimits?: Readonly<NativeInputLimits>;
	submitInput?(sid: number, data: string | Uint8Array, options?: NativeInputOptions): NativeInputSubmission;
	submitResize?(sid: number, cols: number, rows: number, options?: NativeInputOptions): NativeResizeSubmission;
	requestStop?(sid: number, options: Readonly<{ requestId: string; force: boolean }>): void;
	spawnSession(sid: number, options: NativeSpawnOptions): Promise<number | null>;
	/** Device/parser reply for an already-owned stream; may finish its bounded drain after release. */
	reply?(sid: number, data: string | Uint8Array): void;
	input(sid: number, data: string | Uint8Array): void;
	resize(sid: number, cols: number, rows: number): void;
	acknowledge(sid: number, bytes: number): void;
	end(sid: number, force?: boolean): void;
	history<T>(op: 'scan' | 'query' | 'read', payload: Record<string, unknown>, signal?: AbortSignal): Promise<T>;
	request<T>(
		type: 'history' | 'cookies',
		op: string,
		payload: Record<string, unknown>,
		signal?: AbortSignal,
	): Promise<T>;
}

/** Process adapter owned solely by the host. Disposal waits for process termination. */
export interface NativeTransport extends NativeConnection {
	readonly localControl?: 1;
	/** Reserves its independent lane before codec snapshots/encoding; does not enqueue until send(). */
	prepareControl?(message: ControlMessage, valid?: () => boolean): NativeControlFrame;
	dispose(): void | Promise<void>;
}

export interface NativeLease {
	readonly value: NativeConnection;
	/** Session numbers remain unique while a helper survives module disable/re-enable. */
	allocateSessionId(): number;
	/** PTY-only bound acquisition; never starts or adopts another helper generation. */
	acquireControl?(events?: Partial<NativeEvents>, signal?: AbortSignal): Promise<NativeLease>;
	/** Control-only registration; at most one registering/active/closing registration per helper. */
	registerControl?(
		scope: Readonly<ControlScope>,
		events: NativeControlEvents,
		options?: Readonly<{ signal?: AbortSignal }>,
	): Promise<NativeControlRegistration>;
	/** Reject new operations immediately; end this owner's PTYs and await final host shutdown if last. */
	release(): Promise<void>;
}

/**
 * State of the verified `huhu` command-line tool. Never an exception: a terminal still opens without it, and the state
 * is what a notice or settings row explains. `text` is already localized by the owner of the native dictionary.
 */
export type NativeCliState =
	| { readonly state: 'ready'; readonly path: string; readonly directory: string; readonly text: string }
	| {
			readonly state:
				| 'unsupported' | 'offlineMissing' | 'incompatible' | 'compatMissing' | 'checksumMissing'
				| 'checksumMismatch' | 'downloadFailed' | 'unavailable';
			readonly reason: string;
			readonly text: string;
	  };

/** Acquisition is lazy and abortable. Each lease belongs to one consumer and one helper generation. */
export interface NativeHostAccess {
	acquire(capability: NativeCapability, events?: Partial<NativeEvents>, signal?: AbortSignal): Promise<NativeLease>;
	/**
	 * Install/verify the command-line tool through the same pipeline as the helper. `notify: false` is for a place that
	 * shows the state itself (settings); otherwise a failure raises one localized notice per state and version.
	 */
	cli?(options?: { readonly notify?: boolean }): Promise<NativeCliState>;
}

export interface NativeCookieReader {
	readCookies(
		path: string,
		kind: 'chromium' | 'firefox',
		signal?: AbortSignal,
	): Promise<{ rows: Array<Record<string, unknown>> }>;
}

/** Release rejected because one or more captured PTY scopes were not confirmed quiescent. */
export class NativeReleaseError extends Error {
	constructor(
		readonly outcomes: readonly {
			sid: number;
			notice?: NativeTerminationNotice;
			reason: 'timeout' | 'disconnected' | 'cleanup-incomplete';
		}[],
	) {
		super('Native terminal cleanup was not confirmed');
	}
}
