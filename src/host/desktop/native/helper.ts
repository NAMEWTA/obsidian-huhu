import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import {
	encodeControl,
	encodeControlBody,
	encodeInput,
	encodeInputPart,
	encodeReply,
	utf8Length,
	controlBytes,
	FrameDecoder,
	FRAME_CONTROL,
	FRAME_OUTPUT,
	HELPER_PROTOCOL,
} from '../../../shared/native/frames';

import type { NativeEvents as HelperEvents, NativeSpawnOptions as SpawnOptions } from '../../../shared/native/host';
import { NativeControlError, NativeReplyError, NativeSpawnError, NativeShutdownError, type NativeHelperTermination, type NativeSpawnFailure, type NativeControlFrame } from '../../../shared/native/host';
import { CONTROL_LIMITS, EDITOR_LIMITS, encodeEditorMessage, encodeEditorLaunch, editorDescriptor,
	encodeHelperControlBody, parseHelperControlBody, type ControlMessage, type EditorMessage,
	type NativeEditorLaunch, type NativeEditorRegistration } from '../../../shared/native/control-wire';
import {
	NATIVE_INPUT_LIMITS,
	NATIVE_INPUT_TIMEOUT_MS,
	parseNativeInputLimits,
	parseNativeInputControl,
	snapshotSpawnEnvironment,
	type NativeSpawnEnvironment,
	editorBodyBytes,
	NativeEditorError,
	type NativeEditorBinding,
	type NativeEditorInputOptions,
	type NativeEditorSubmission,
	type NativeEditorQueuedResult,
	type NativeEditorFinishedResult,
	type NativeEditorCloseNotice,
	type NativeInputLimits,
	type NativeInputSubmission,
	type NativeResizeSubmission,
	type NativeInputOptions,
	type NativeInputFailure,
	type NativeReplyFailure,
	type NativeInputQueuedResult,
	type NativeInputFinishedResult,
	type NativeResizeFinishedResult,
} from '../../../shared/native/input';
import { parseTerminationNotice } from '../../../shared/native/termination';
export type { NativeEvents as HelperEvents, NativeSpawnOptions as SpawnOptions } from '../../../shared/native/host';

interface Pending<T> {
	resolve(value: T): void;
	reject(error: Error): void;
}

const HANDSHAKE_TIMEOUT = 10_000;
const HISTORY_TIMEOUT = 120_000;

function spawnFailure(value: unknown): NativeSpawnFailure {
	if (value && typeof value === 'object' && 'code' in value && 'effect' in value) {
		if (
			value.effect === 'none' &&
			(value.code === 'program-rejected' ||
				value.code === 'directory-unavailable' ||
				value.code === 'pty-unavailable')
		)
			return { code: value.code, effect: 'none' };
		if (value.effect === 'unknown' && value.code === 'session-conflict')
			return { code: value.code, effect: 'unknown' };
	}
	// Protocol 3 helpers predating this optional field cannot prove a failed request had no effect.
	return { code: 'unconfirmed', effect: 'unknown' };
}

interface PendingOperation {
	sid: number;
	op: number;
	kind: 'input' | 'resize';
	data?: Uint8Array;
	bytes: number;
	stage: 'local' | 'begin' | 'parts' | 'queued' | 'started';
	cancelled: boolean;
	queued(value: NativeInputQueuedResult): void;
	finished(value: NativeInputFinishedResult | NativeResizeFinishedResult): void;
	cleanup(): void;
}
interface EditorBindingState {
	sid: number; launch: NativeEditorLaunch; phase: 'pending' | 'ready' | 'closing' | 'closed';
	editorId?: string; failedNone?: boolean; registration?: NativeEditorRegistration; api: NativeEditorBinding;
	ready: Promise<NativeEditorRegistration>; resolveReady(value: NativeEditorRegistration): void; rejectReady(error: Error): void;
	closed: Promise<NativeEditorCloseNotice>; resolveClosed(value: NativeEditorCloseNotice): void;
	frames: Set<NativeControlFrame>; closing?: Promise<void>; resolveClose?(): void; rejectClose?(error: Error): void;
	closeTimer?: number;
}
interface PendingEditor {
	sid: number; op: number; binding: EditorBindingState; bytes: number; data?: Uint8Array;
	stage: 'begin' | 'parts' | 'queued' | 'claimed' | 'dispatched'; begin?: NativeControlFrame;
	frames: Set<NativeControlFrame>; nativeDone: boolean; nativeResult: boolean; finishedDone: boolean; cancelled: boolean;
	terminationError?: Error;
	queued(value: NativeEditorQueuedResult): void; finished(value: NativeEditorFinishedResult): void;
	settle(error?: Error): void; cleanup(): void;
}

/** One native helper process: sessions and history requests over framed stdio. */
export class PtyHelper {
	private readonly decoder = new FrameDecoder({ controlBytes: 4 * 1024 * 1024 - 5, sessionBytes: 64 * 1024 }, parseHelperControlBody);
	private readonly writer: BoundedHelperWriter;
	private readonly operations = new Map<string, PendingOperation>();
	private readonly editors = new Map<number, EditorBindingState>();
	private readonly editorOperations = new Map<string, PendingEditor>();
	private readonly nextOps = new Map<number, number>();
	private readonly replyFailures = new Set<number>();
	private readonly userClosed = new Set<number>();
	private readonly numericExits = new Set<number>();
	private readonly replyCloses = new Map<number, 'pending' | 'queued' | 'handed'>();
	private readonly settledReplies = new Set<number>();
	private replyCloseScheduled = false;
	private readonly confirmed = new Set<number>();
	private readonly outputBytes = new Map<number, number>();
	private readonly sawOutput = new Set<number>();
	private readonly ackPending = new Map<number, number>();
	private ackScheduled = false;
	private flushingACK = false;
	private operationBytes = 0;
	private operationBytesPeak = 0;
	private operationsPeak = 0;
	inputAdmission?: 1;
	outputAbandon?: 1;
	private readonly abandoned = new Set<number>();
	inputLimits?: Readonly<NativeInputLimits>;
	private readonly spawns = new Map<number, Pending<number | null>>();
	private readonly requests = new Map<string, Pending<unknown> & { cleanup(): void }>();
	private hello?: Pending<Record<string, unknown>>;
	private ended = false;
	private stderr = '';
	private readonly terminated: Promise<Readonly<NativeHelperTermination>>;
	private readonly stdioClosed: Promise<void>;
	private exitResult?: { state: 'exited' | 'not-started'; code: number | null; signal: string | null };
	private didCloseStdio = false;
	private forced = false;
	private stopping?: Promise<void>;
	pid = 0;
	version = '';
	terminalTermination?: 1;
	replySettlement?: 1;
	localControl?: 1;
	editorTransactions?: 1;
	private platform = '';
	private readonly terminationSequences = new Map<number, number>();

	private constructor(
		private readonly child: ChildProcessWithoutNullStreams,
		private readonly events: HelperEvents,
		private readonly win: Window,
		private readonly spawnEnv: Readonly<Record<string, string | undefined>>,
	) {
		this.writer = new BoundedHelperWriter(
			child.stdin,
			(error) => this.close(error.message),
			() => {
				this.scheduleACKs();
				this.scheduleReplyCloses();
			},
		);
		let closeStdio!: () => void;
		this.stdioClosed = new Promise<void>(resolve => { closeStdio = resolve; });
		child.once('close', () => { this.didCloseStdio = true; closeStdio(); });
		this.terminated = new Promise((resolve) => {
			child.once('exit', (code, signal) => {
				this.exitResult = { state: 'exited', code: typeof code === 'number' ? code : null, signal: typeof signal === 'string' ? signal : null };
				resolve(this.terminationOutcome());
			});
			child.once('error', () => {
				if (!child.pid) {
					this.exitResult = { state: 'not-started', code: null, signal: null };
					resolve(this.terminationOutcome());
				}
			});
		});
		child.stdout.on('data', (chunk: Buffer) =>
			this.receive(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)),
		);
		child.stderr.on('data', (chunk: Buffer) => {
			this.stderr = (this.stderr + chunk.toString('utf8')).slice(-4000);
		});
		child.on('error', (error) => { this.hello?.reject(error); this.close(error.message); });
		child.on('exit', (code, signal) => this.close(signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`));
		child.stdin.on('error', () => undefined);
	}

	/** Start the helper and complete the protocol handshake. */
	static async start(
		binary: string,
		events: HelperEvents,
		win: Window,
		env: Record<string, string>,
	): Promise<PtyHelper> {
		const capturedEnv = Object.freeze({ ...process.env, ...env });
		const child = spawn(binary, [], {
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
			env: capturedEnv,
		});
		const helper = new PtyHelper(child, events, win, capturedEnv);
		const hello = await new Promise<Record<string, unknown>>((resolve, reject) => {
			const timer = win.setTimeout(
				() => reject(new Error('The terminal helper did not answer the handshake')),
				HANDSHAKE_TIMEOUT,
			);
			helper.hello = {
				resolve: (message) => {
					win.clearTimeout(timer);
					resolve(message);
				},
				reject: (error) => {
					win.clearTimeout(timer);
					reject(error instanceof Error ? error : new Error(String(error)));
				},
			};
			helper.send({
				type: 'hello',
				protocol: HELPER_PROTOCOL,
				capabilities: { inputAdmission: 1, outputAbandon: 1, replySettlement: 1, localControl: 1, editorTransactions: 1 },
			});
		}).catch((error: unknown) => helper.startFailed(error));
		if (hello.accepted !== true || hello.protocol !== HELPER_PROTOCOL) {
			return helper.startFailed(new Error(
				`The terminal helper speaks protocol ${String(hello.protocol)}; this plugin needs ${HELPER_PROTOCOL}. Install the matching release.`,
			));
		}
		helper.pid = typeof hello.pid === 'number' ? hello.pid : 0;
		helper.version = typeof hello.version === 'string' ? hello.version : '';
		helper.platform = typeof hello.platform === 'string' ? hello.platform : '';
		if (hello.capabilities && typeof hello.capabilities === 'object' && 'localControl' in hello.capabilities && hello.capabilities.localControl === 1)
			helper.localControl = 1;
		if (
			hello.capabilities &&
			typeof hello.capabilities === 'object' &&
			'terminalTermination' in hello.capabilities &&
			hello.capabilities.terminalTermination === 1 &&
			helper.platform === process.platform
		)
			helper.terminalTermination = 1;
		if (
			hello.capabilities &&
			typeof hello.capabilities === 'object' &&
			'outputAbandon' in hello.capabilities &&
			hello.capabilities.outputAbandon === 1
		)
			helper.outputAbandon = 1;
		if (
			hello.capabilities &&
			typeof hello.capabilities === 'object' &&
			'replySettlement' in hello.capabilities &&
			hello.capabilities.replySettlement === 1
		)
			helper.replySettlement = 1;
		const limits = parseNativeInputLimits(hello.inputLimits);
		if (
			hello.capabilities &&
			typeof hello.capabilities === 'object' &&
			'inputAdmission' in hello.capabilities &&
			hello.capabilities.inputAdmission === 1 &&
			limits
		) {
			// The peer can reduce our profile, never enlarge any local allocation/admission bound.
			const effective = Object.fromEntries(
				Object.entries(NATIVE_INPUT_LIMITS).map(([key, cap]) => [
					key,
					Math.min(cap, limits[key as keyof NativeInputLimits]),
				]),
			) as unknown as NativeInputLimits;
			if (parseNativeInputLimits(effective)) {
				helper.inputLimits = Object.freeze(effective);
				helper.inputAdmission = 1;
			}
		}
		if (helper.inputAdmission === 1 && hello.capabilities && typeof hello.capabilities === 'object' &&
			'editorTransactions' in hello.capabilities && hello.capabilities.editorTransactions === 1)
			helper.editorTransactions = 1;
		return helper;
	}

	get alive(): boolean {
		return !this.ended;
	}

	spawnEnvironment(overrides: Readonly<Record<string, string>>): NativeSpawnEnvironment {
		return snapshotSpawnEnvironment(this.spawnEnv, overrides, process.platform === 'win32' ? 'windows' : 'unix');
	}

	editorBinding(sid: number): NativeEditorBinding | undefined { return this.editors.get(sid)?.api; }
	private enrollEditor(sid: number, launch: NativeEditorLaunch): EditorBindingState {
		const captured = encodeEditorLaunch(launch).value;
		let resolveReady!: EditorBindingState['resolveReady'], rejectReady!: EditorBindingState['rejectReady'], resolveClosed!: EditorBindingState['resolveClosed'];
		const ready = new Promise<NativeEditorRegistration>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
		void ready.catch(() => undefined);
		const closed = new Promise<NativeEditorCloseNotice>(resolve => { resolveClosed = resolve; });
		const state: EditorBindingState = { sid, launch: captured, phase: 'pending', ready, closed, resolveReady, rejectReady, resolveClosed,
			frames: new Set(), api: undefined as unknown as NativeEditorBinding };
		state.api = { sid, identity: captured.identity, ready, closed,
			get active() { return state.phase === 'ready'; },
			submit: (text, options) => this.submitEditor(state, text, options),
			close: () => this.closeEditor(state),
		};
		this.editors.set(sid, state);
		return state;
	}
	private editorFrame(state: EditorBindingState, message: EditorMessage, pending?: PendingEditor): NativeControlFrame {
		const cap = (message.type === 'editor-begin' ? EDITOR_LIMITS.metadataBytes : EDITOR_LIMITS.receiptBytes) + 5;
		const frame = this.writer.prepare(cap, message.type === 'editor-begin' ? 'editor-lifecycle' : 'editor-receipt',
			`editor:${state.sid}:${'op' in message ? message.op : 'binding'}`, () => {
				const encoded = encodeEditorMessage(message, 'node-to-native');
				return encodeControlBody(encoded.body, cap - 5);
			});
		this.trackEditorFrame(state, frame, pending);
		return frame;
	}
	private trackEditorFrame(state: EditorBindingState, frame: NativeControlFrame, pending?: PendingEditor): void {
		state.frames.add(frame); pending?.frames.add(frame);
		const finish = (error?: Error) => {
			state.frames.delete(frame); pending?.frames.delete(frame);
			if (error && pending && !pending.finishedDone) this.editorFinished(pending, { op: pending.op, state: 'unknown', effect: 'unknown', reason: 'transport-lost' });
			if (pending) this.finishEditorOperation(pending);
			if (this.finishEditorClose(state)) this.retireSession(state.sid);
		};
		void frame.settled.then(() => finish(), error => finish(error instanceof Error ? error : new Error('Editor frame settlement failed')));
	}
	private submitEditor(state: EditorBindingState, text: string | Uint8Array, options: NativeEditorInputOptions): NativeEditorSubmission {
		const sid = state.sid, next = (this.nextOps.get(sid) ?? 0) + 1, op = next <= 0xffff_ffff ? next : 0;
		let queued!: PendingEditor['queued'], finished!: PendingEditor['finished'], settle!: PendingEditor['settle'];
		const queuedPromise = new Promise<NativeEditorQueuedResult>(resolve => { queued = resolve; });
		const finishedPromise = new Promise<NativeEditorFinishedResult>(resolve => { finished = resolve; });
		const settled = new Promise<void>((resolve, reject) => { settle = error => error ? reject(error) : resolve(); });
		void settled.catch(() => undefined);
		let pending: PendingEditor | undefined;
		const handle = { op, queued: queuedPromise, finished: finishedPromise, settled, cancel: () => { if (pending) this.cancelEditorOperation(pending); } };
		const none = (reason: 'closed' | 'not-ready' | 'cancelled' | 'expired' | 'capacity' | 'invalid' | 'source-changed') => {
			const result = { op, state: 'none' as const, effect: 'none' as const, reason }; queued(result); finished(result); settle(); return handle;
		};
		if (this.ended || !op || this.editors.get(sid) !== state || this.userClosed.has(sid) || state.phase === 'closed' || state.phase === 'closing') return none('closed');
		if (state.phase !== 'ready' || !state.editorId || !state.registration) return none('not-ready');
		if (options.signal?.aborted) return none('cancelled');
		if (!Number.isFinite(options.remainingMs) || options.remainingMs <= 0) return none('expired');
		if (options.sourceInstance !== state.registration.sourceInstance) return none('source-changed');
		let bytes: number;
		try { bytes = editorBodyBytes(text); } catch (error) { return none(error instanceof NativeEditorError && error.failure.state === 'none' && error.failure.reason === 'capacity' ? 'capacity' : 'invalid'); }
		const session = [...this.operations.values(), ...this.editorOperations.values()].filter(row => row.sid === sid);
		const limits = this.inputLimits ?? NATIVE_INPUT_LIMITS;
		if (this.operations.size + this.editorOperations.size >= limits.helperQueuedOperations || session.length >= limits.sessionQueuedOperations ||
			this.operationBytes + bytes > Math.min(limits.helperQueuedBytes, EDITOR_LIMITS.nodeRetainedBodyBytes) ||
			session.reduce((sum, row) => sum + row.bytes, 0) + bytes > limits.sessionQueuedBytes) return none('capacity');
		const remainingMs = Math.min(EDITOR_LIMITS.inputDeadlineMs, Math.floor(options.remainingMs));
		if (remainingMs < 1) return none('expired');
		const key = `${sid}:${op}`;
		let timer: number | undefined;
		pending = { sid, op, binding: state, bytes, stage: 'begin', frames: new Set(), nativeDone: false, nativeResult: false, cancelled: false,
			finishedDone: false, queued, finished, settle,
			cleanup: () => { if (timer !== undefined) this.win.clearTimeout(timer); options.signal?.removeEventListener('abort', cancel); },
		};
		const cancel = () => { if (pending) this.cancelEditorOperation(pending); };
		// The original input count/byte permit precedes the sole caller-data snapshot.
		this.operationBytes += bytes; this.nextOps.set(sid, op); this.editorOperations.set(key, pending);
		this.operationBytesPeak = Math.max(this.operationBytesPeak, this.operationBytes);
		this.operationsPeak = Math.max(this.operationsPeak, this.operations.size + this.editorOperations.size);
		try {
			pending.begin = this.editorFrame(state, { type: 'editor-begin', version: 1, sid, editorId: state.editorId, op,
				sourceInstance: options.sourceInstance, totalBytes: bytes, remainingMs }, pending);
			pending.data = typeof text === 'string' ? new TextEncoder().encode(text) : text.slice();
			timer = this.win.setTimeout(() => { if (pending && this.editorOperations.get(key) === pending) this.cancelEditorOperation(pending, true); }, remainingMs);
			options.signal?.addEventListener('abort', cancel, { once: true });
			if (!pending.begin.send()) this.cancelEditorOperation(pending);
		} catch {
			pending.begin?.cancel(); pending.nativeDone = true;
			this.editorFinished(pending, { op, state: 'none', effect: 'none', reason: 'capacity' }); this.finishEditorOperation(pending);
		}
		return handle;
	}
	private cancelEditorOperation(pending: PendingEditor, timeout = false): void {
		if (this.editorOperations.get(`${pending.sid}:${pending.op}`) !== pending || pending.nativeDone || pending.nativeResult || pending.cancelled) return;
		pending.cancelled = true;
		if (pending.begin && !pending.begin.handed && pending.begin.cancel()) {
			pending.nativeDone = true;
			this.editorFinished(pending, { op: pending.op, state: 'none', effect: 'none', reason: timeout ? 'expired' : 'cancelled' });
			this.finishEditorOperation(pending); return;
		}
		try { this.editorFrame(pending.binding, { type: 'editor-cancel', version: 1, sid: pending.sid, editorId: pending.binding.editorId!, op: pending.op }, pending).send(); }
		catch { /* No native receipt means no proof of zero input. The original charge remains. */ }
		if (timeout) this.editorFinished(pending, { op: pending.op, state: 'unknown', effect: 'unknown', reason: 'timeout' });
	}
	private editorFinished(pending: PendingEditor, result: NativeEditorFinishedResult): void {
		if (pending.finishedDone) return;
		pending.finishedDone = true;
		pending.cleanup();
		if (result.state === 'none' || result.state === 'unknown') pending.queued(result);
		else if (result.state === 'partial') pending.queued({ op: pending.op, state: 'unknown', effect: 'unknown', reason: 'unconfirmed' });
		pending.finished(result);
	}
	private finishEditorOperation(pending: PendingEditor, error?: Error): void {
		// Physical exit can precede the local frame callbacks. Keep that fence for their later retry.
		pending.terminationError ??= error;
		if ((!pending.nativeDone && !pending.terminationError) || pending.frames.size || !this.editorOperations.delete(`${pending.sid}:${pending.op}`)) return;
		pending.cleanup(); pending.data = undefined; this.operationBytes -= pending.bytes; pending.settle(pending.terminationError);
		if (this.finishEditorClose(pending.binding)) this.retireSession(pending.sid);
	}
	private closeEditor(state: EditorBindingState): Promise<void> {
		if (state.closing) return state.closing;
		state.closing = new Promise<void>((resolve, reject) => { state.resolveClose = resolve; state.rejectClose = reject; });
		void state.closing.catch(() => undefined);
		if (state.phase !== 'closed') state.phase = 'closing';
		state.rejectReady(new NativeEditorError({ state: 'none', effect: 'none', reason: 'closed' }));
		state.closeTimer = this.win.setTimeout(() => state.rejectClose?.(new NativeEditorError({ state: 'unknown', effect: 'unknown', reason: 'timeout' })), EDITOR_LIMITS.handshakeMs);
		if (state.editorId && state.phase !== 'closed') {
			try { this.editorFrame(state, { type: 'editor-close', version: 1, sid: state.sid, editorId: state.editorId }).send(); }
			catch { state.rejectClose?.(new NativeEditorError({ state: 'unknown', effect: 'unknown', reason: 'transport-lost' })); }
		}
		if (this.finishEditorClose(state)) this.retireSession(state.sid);
		return state.closing;
	}
	private finishEditorClose(state: EditorBindingState): boolean {
		if (state.phase !== 'closed' || state.frames.size || [...this.editorOperations.values()].some(row => row.binding === state)) return false;
		if (state.closeTimer) this.win.clearTimeout(state.closeTimer);
		state.resolveClose?.();
		return true;
	}
	private editorMessage(message: EditorMessage): void {
		const state = this.editors.get(message.sid);
		if (!state || this.editorTransactions !== 1) return;
		if (!editorDescriptor().messages[message.type].directions.includes('native-to-node')) throw new Error('Invalid editor message direction');
		if (state.editorId !== undefined && message.editorId !== state.editorId) return;
		if (message.type === 'editor-ready') {
			if (message.identity.runtimeId !== state.launch.identity.runtimeId || message.profileId !== state.launch.recipe.profileId) return;
			if (state.phase === 'closed' || state.registration) return;
			state.editorId = message.editorId;
			if (state.phase === 'closing') { this.editorFrame(state, { type: 'editor-close', version: 1, sid: state.sid, editorId: message.editorId }).send(); return; }
			state.registration = Object.freeze(message); state.phase = 'ready'; state.resolveReady(message);
		} else if (message.type === 'editor-closed') {
			state.editorId ??= message.editorId; state.phase = 'closed';
			state.rejectReady(new NativeEditorError({ state: 'none', effect: 'none', reason: 'closed' })); state.resolveClosed({ reason: message.reason });
			for (const pending of this.editorOperations.values()) if (pending.binding === state)
				this.editorFinished(pending, { op: pending.op, state: 'unknown', effect: 'unknown', reason: 'adapter-lost' });
			if (this.finishEditorClose(state)) this.retireSession(state.sid);
		} else if ('op' in message) {
			const pending = this.editorOperations.get(`${message.sid}:${message.op}`);
			if (!pending || pending.binding !== state || message.editorId !== state.editorId) return;
			if (message.type === 'editor-state') {
				if (message.state === 'reserved' && pending.stage === 'begin' && pending.data && !pending.cancelled) {
					const parts = Math.ceil(pending.bytes / EDITOR_LIMITS.fragmentBytes);
					if (!this.writer.canEnqueue(pending.bytes + parts * 17, 'user', parts)) { this.cancelEditorOperation(pending); return; }
					pending.stage = 'parts';
					try {
						for (let offset = 0; offset < pending.bytes; offset += EDITOR_LIMITS.fragmentBytes) {
							const end = Math.min(pending.bytes, offset + EDITOR_LIMITS.fragmentBytes);
							const frame = this.writer.prepare(end - offset + 17, 'user', `editor:${state.sid}:${pending.op}`,
								() => encodeInputPart(pending.sid, pending.op, offset, pending.data!.subarray(offset, end)));
							this.trackEditorFrame(state, frame, pending); frame.send();
						}
						pending.data = undefined;
						this.editorFrame(state, { type: 'editor-commit', version: 1, sid: pending.sid, editorId: state.editorId, op: pending.op }, pending).send();
					} catch { this.cancelEditorOperation(pending); }
				} else if (message.state === 'queued' && pending.stage === 'parts') { pending.stage = 'queued'; pending.queued({ op: pending.op, state: 'queued' }); }
				else if (message.state === 'claimed' && pending.stage === 'queued') pending.stage = 'claimed';
				else if (message.state === 'dispatched' && pending.stage === 'claimed') pending.stage = 'dispatched';
			} else if (message.type === 'editor-result') {
				if (pending.nativeResult || ((message.result.state === 'adapter-applied' || message.result.state === 'partial') && pending.stage !== 'dispatched')) return;
				pending.nativeResult = true; this.editorFinished(pending, { op: pending.op, ...message.result });
			} else if (message.type === 'editor-settled' && pending.nativeResult) { pending.nativeDone = true; this.finishEditorOperation(pending); }
		}
		this.events.editor?.(message);
	}

	get streamStats() {
		return {
			...this.writer.stats,
			operations: this.operations.size,
			editorOperations: this.editorOperations.size,
			operationsPeak: this.operationsPeak,
			operationBytes: this.operationBytes,
			operationBytesPeak: this.operationBytesPeak,
			requests: this.requests.size,
			replyClosePending: this.replyCloses.size,
			sessionRoutes: this.terminationSequences.size,
		};
	}
	prepareControl(message: ControlMessage, valid?: () => boolean): NativeControlFrame {
		if (this.ended || this.localControl !== 1)
			throw new NativeControlError('CAPABILITY_UNAVAILABLE', 'Local native control is unavailable');
		const type = Object.getOwnPropertyDescriptor(message, 'type');
		if (!type || !('value' in type)) throw new NativeControlError('INVALID_ARGUMENT', 'Invalid native control message');
		let lane: WriteLane, cap: number;
		switch (type.value) {
			case 'control-result': lane = 'broker-final'; cap = CONTROL_LIMITS.responseBytes + CONTROL_LIMITS.wrapperBytes + 5; break;
			case 'control-admitted':
			case 'control-progress': lane = 'broker-stage'; cap = CONTROL_LIMITS.stageBytes + CONTROL_LIMITS.wrapperBytes + 5; break;
			case 'control-register': lane = 'broker-fixed'; cap = CONTROL_LIMITS.scopeBytes + CONTROL_LIMITS.wrapperBytes + 5; break;
			case 'control-unregister': lane = 'broker-fixed'; cap = CONTROL_LIMITS.registrationBytes + 5; break;
			default: throw new NativeControlError('INVALID_ARGUMENT', 'Invalid native control message direction');
		}
		let known = message;
		return this.writer.prepare(cap, lane, 'bridgeId' in message ? `${message.controlId}:${message.bridgeId}` : message.controlId, replacement => {
			if (replacement && (type.value !== 'control-progress' || replacement.type !== type.value || replacement.controlId !== message.controlId || !('bridgeId' in message) || !('bridgeId' in replacement) || replacement.bridgeId !== message.bridgeId))
				throw new NativeControlError('INVALID_ARGUMENT', 'Pending progress replacement changed its captured route');
			const encoded = encodeHelperControlBody(replacement ?? known);
			const frame = encodeControlBody(encoded.body, cap - 5);
			known = encoded.value;
			return frame;
		}, valid);
	}
	private send(
		message: Record<string, unknown>,
		lane: WriteLane = 'control',
		sid = 0,
		handed?: () => void,
		valid?: () => boolean,
	): boolean {
		const size = controlBytes(message) + 5;
		if (!this.writer.canEnqueue(size, lane)) return false;
		return this.writer.enqueue(encodeControl(message), lane, sid, handed, valid);
	}
	private write(bytes: Uint8Array, lane: WriteLane = 'user', sid = 0, valid?: () => boolean): boolean {
		return !this.ended && this.writer.enqueue(bytes, lane, sid, undefined, valid);
	}

	private receive(chunk: Uint8Array): void {
		try {
			this.decoder.consume(chunk, (frame) => {
				if (
					frame.kind === FRAME_OUTPUT &&
					this.terminationSequences.has(frame.session) &&
					!this.abandoned.has(frame.session)
				) {
					this.sawOutput.add(frame.session);
					this.outputBytes.set(
						frame.session,
						(this.outputBytes.get(frame.session) ?? 0) + frame.bytes.byteLength,
					);
					this.events.output(frame.session, frame.bytes);
				} else if (frame.kind === FRAME_CONTROL) this.control(frame.message);
			});
		} catch (error) {
			this.close(error instanceof Error ? error.message : String(error));
			this.child.kill();
		}
	}

	private control(message: Record<string, unknown>): void {
		if (typeof message.type === 'string' && message.type.startsWith('editor-')) {
			this.editorMessage(message as EditorMessage); return;
		}
		if (typeof message.type === 'string' && message.type.startsWith('control-')) {
			if (this.localControl !== 1) throw new Error('Unnegotiated local control message');
			if (!['control-registered', 'control-unregistered', 'control-request', 'control-cancel', 'control-settled', 'control-error'].includes(message.type))
				throw new Error('Invalid native control message direction');
			this.events.control?.(message as ControlMessage);
			return;
		}
		const sid = typeof message.sid === 'number' ? message.sid : -1;
		switch (message.type) {
			case 'reply-settled': {
				const wire = parseNativeInputControl(message, this.inputLimits ?? NATIVE_INPUT_LIMITS);
				if (
					wire?.type !== 'reply-settled' ||
					this.replySettlement !== 1 ||
					!this.numericExits.has(wire.sid) ||
					this.replyCloses.get(wire.sid) !== 'handed' ||
					this.settledReplies.has(wire.sid)
				)
					return;
				this.settledReplies.add(wire.sid);
				this.events.replySettled?.(wire.sid);
				this.retireSession(wire.sid);
				return;
			}
			case 'reply-failure': {
				const wire = parseNativeInputControl(message, this.inputLimits ?? NATIVE_INPUT_LIMITS);
				if (
					wire?.type !== 'reply-failure' ||
					!this.terminationSequences.has(wire.sid) ||
					this.replyFailures.has(wire.sid) ||
					this.settledReplies.has(wire.sid)
				)
					return;
				this.replyFailures.add(wire.sid);
				this.events.replyFailure?.(wire.sid, { state: wire.state, reason: wire.reason } as NativeReplyFailure);
				return;
			}
			case 'input-state':
			case 'resize-state':
				this.operationState(message);
				return;
			case 'hello':
				this.hello?.resolve(message);
				this.hello = undefined;
				return;
			case 'terminal-termination': {
				const lastSequence = this.terminationSequences.get(sid);
				if (lastSequence === undefined) return;
				const notice = parseTerminationNotice(message, {
					sid,
					platform: this.platform,
					lastSequence,
					capability: this.terminalTermination,
				});
				if (notice) {
					this.terminationSequences.set(sid, notice.sequence);
					if (notice.evidence.cleanup.state === 'confirmed') this.confirmed.add(sid);
					this.events.termination?.(sid, notice);
					this.retireSession(sid);
				}
				return;
			}
			case 'spawned':
				this.spawns.get(sid)?.resolve(typeof message.pid === 'number' ? message.pid : null);
				this.spawns.delete(sid);
				return;
			case 'spawn-failed': {
				if (!this.spawns.has(sid) || !this.terminationSequences.has(sid)) return;
				const failure = spawnFailure(message.failure);
				this.spawns
					.get(sid)
					?.reject(
						new NativeSpawnError(
							typeof message.message === 'string' ? message.message : 'The session could not start',
							failure,
						),
					);
				this.spawns.delete(sid);
				if (failure.effect === 'none') {
					const editor = this.editors.get(sid); if (editor) editor.failedNone = true;
					this.userClosed.add(sid);
					this.numericExits.add(sid);
					this.confirmed.add(sid);
					if (this.replySettlement === 1 && message.replySettled === true && !this.sawOutput.has(sid)) {
						this.settledReplies.add(sid);
						this.events.replySettled?.(sid);
					} else this.closeReplies(sid);
					for (const pending of this.operations.values())
						if (pending.sid === sid)
							this.settle(pending, { op: pending.op, state: 'none', reason: 'closed' });
					this.retireSession(sid);
				}
				return;
			}
			case 'exit':
				if (!this.terminationSequences.has(sid)) return;
				this.userClosed.add(sid);
				this.numericExits.add(sid);
				this.failOperations(sid, 'transport-lost');
				if (this.editors.has(sid)) void this.closeEditor(this.editors.get(sid)!).catch(() => undefined);
				this.events.exit(
					sid,
					typeof message.code === 'number' ? message.code : null,
					typeof message.signal === 'string' ? message.signal : null,
				);
				this.closeReplies(sid);
				this.retireSession(sid);
				return;
			case 'cookies-result':
			case 'history-result': {
				const id = typeof message.rid === 'string' ? message.rid : '';
				const pending = this.requests.get(id);
				if (!pending) return;
				this.requests.delete(id);
				pending.cleanup();
				if (typeof message.error === 'string') pending.reject(new Error(message.error));
				else pending.resolve(message.data);
				return;
			}
			case 'error':
				console.warn('[HUHU terminal helper]', message.message);
		}
	}

	spawnSession(sid: number, options: SpawnOptions): Promise<number | null> {
		if (this.ended) return Promise.reject(new Error('The terminal helper is not running'));
		if (this.terminationSequences.has(sid))
			return Promise.reject(
				new NativeSpawnError('Native session already exists', { code: 'session-conflict', effect: 'unknown' }),
			);
		const none = (message: string) => {
			if (this.replySettlement === 1) this.events.replySettled?.(sid);
			return Promise.reject(new NativeSpawnError(message, { code: 'pty-unavailable', effect: 'none' }));
		};
		if (this.spawns.size >= 32 || this.terminationSequences.size >= 32)
			return none('Native session capacity exceeded');
		if (options.editor && this.editorTransactions !== 1) return none('Native editor transactions are unavailable');
		let editor: EditorBindingState | undefined;
		try {
			controlBytes({ type: 'spawn', sid, ...options });
			if (options.editor) editor = this.enrollEditor(sid, options.editor);
		} catch {
			return none('Native spawn request capacity or DTO rejected');
		}
		return new Promise((resolve, reject) => {
			this.spawns.set(sid, { resolve, reject });
			this.terminationSequences.set(sid, 0);
			if (
				!this.send({
					type: 'spawn',
					sid,
					file: options.file,
					args: options.args,
					cwd: options.cwd ?? null,
					env: options.env,
					cols: options.cols,
					rows: options.rows,
					...(editor ? { editor: editor.launch } : {}),
				})
			) {
				this.spawns.delete(sid);
				this.terminationSequences.delete(sid);
				if (editor) {
					editor.phase = 'closed'; editor.rejectReady(new NativeEditorError({ state: 'none', effect: 'none', reason: 'capacity' }));
					editor.resolveClosed({ reason: 'closed' }); this.editors.delete(sid);
				}
				if (this.replySettlement === 1) this.events.replySettled?.(sid);
				reject(
					new NativeSpawnError('Native request capacity exceeded', {
						code: 'pty-unavailable',
						effect: 'none',
					}),
				);
			}
		});
	}

	abandonOutput(sid: number): void {
		if (this.outputAbandon !== 1 || this.ended || !this.terminationSequences.has(sid))
			throw new Error('Captured output abandonment is unavailable');
		if (!this.send({ type: 'output-abandon', sid }) || this.ended)
			throw new Error('Native output abandonment was not submitted');
		this.abandoned.add(sid);
		this.outputBytes.set(sid, 0);
		this.retireSession(sid);
	}
	reply(sid: number, data: string | Uint8Array): void {
		if (
			!Number.isInteger(sid) ||
			sid <= 0 ||
			sid > 0xffff_ffff ||
			(typeof data !== 'string' && !(data instanceof Uint8Array))
		)
			throw new NativeReplyError({ state: 'none', reason: 'invalid' });
		if (this.ended || this.numericExits.has(sid)) throw new NativeReplyError({ state: 'none', reason: 'closed' });
		if (!this.terminationSequences.has(sid)) throw new NativeReplyError({ state: 'none', reason: 'closed' });
		const limit = this.inputLimits?.replyFrameBytes ?? NATIVE_INPUT_LIMITS.replyFrameBytes;
		if ((typeof data === 'string' ? data.length : data.byteLength) > limit)
			throw new NativeReplyError({ state: 'none', reason: 'capacity' });
		// At most three UTF8 bytes per UTF16 code unit; this bounded scan cannot
		// hit utf8Length's generic capacity exception before our typed decision.
		const bytes = typeof data === 'string' ? utf8Length(data, limit * 3) : data.byteLength;
		if (!bytes) throw new NativeReplyError({ state: 'none', reason: 'invalid' });
		if (bytes > limit) throw new NativeReplyError({ state: 'none', reason: 'capacity' });
		const size = bytes + 9;
		if (
			!this.writer.canEnqueue(size, 'reply') ||
			!this.write(this.inputAdmission === 1 ? encodeReply(sid, data) : encodeInput(sid, data), 'reply', sid)
		)
			throw new NativeReplyError({ state: 'none', reason: 'capacity' });
		if (this.ended) throw new NativeReplyError({ state: 'unknown', reason: 'transport-lost' });
	}
	input(sid: number, data: string | Uint8Array): void {
		if (this.inputAdmission === 1) {
			const submission = this.submitInput(sid, data);
			void submission.finished.then((result) => {
				if (result.state === 'none' || result.state === 'unknown') this.events.inputFailure?.(sid, result);
			});
		} else {
			if (this.userClosed.has(sid) || this.ended) {
				this.events.inputFailure?.(sid, { op: 0, state: 'none', reason: 'closed' });
				return;
			}
			const size = utf8Length(data, NATIVE_INPUT_LIMITS.operationBytes) + 9;
			if (
				!this.writer.canEnqueue(size, 'user') ||
				!this.write(encodeInput(sid, data), 'user', sid, () => !this.userClosed.has(sid))
			)
				this.events.inputFailure?.(sid, { op: 0, state: 'none', reason: 'capacity' });
		}
	}
	resize(sid: number, cols: number, rows: number): void {
		if (this.inputAdmission === 1) {
			const submission = this.submitResize(sid, cols, rows);
			void submission.finished.then((result) => {
				if (result.state === 'none' || result.state === 'unknown') this.events.inputFailure?.(sid, result);
			});
		} else if (
			!this.send(
				{ type: 'resize', sid, cols: Math.max(1, Math.floor(cols)), rows: Math.max(1, Math.floor(rows)) },
				'user',
				sid,
				undefined,
				() => !this.userClosed.has(sid),
			)
		)
			this.events.inputFailure?.(sid, { op: 0, state: 'none', reason: 'capacity' });
	}
	submitInput(sid: number, data: string | Uint8Array, options?: NativeInputOptions): NativeInputSubmission {
		return this.submit(sid, 'input', data, undefined, options) as NativeInputSubmission;
	}
	submitResize(sid: number, cols: number, rows: number, options?: NativeInputOptions): NativeResizeSubmission {
		return this.submit(sid, 'resize', undefined, { cols, rows }, options) as NativeResizeSubmission;
	}
	private submit(
		sid: number,
		kind: 'input' | 'resize',
		data?: string | Uint8Array,
		grid?: { cols: number; rows: number },
		options?: NativeInputOptions,
	): NativeInputSubmission | NativeResizeSubmission {
		const op = (this.nextOps.get(sid) ?? 0) + 1;
		if (this.terminationSequences.has(sid) && op <= 0xffff_ffff) this.nextOps.set(sid, op);
		let resolveQueued!: PendingOperation['queued'], resolveFinished!: PendingOperation['finished'];
		const queued = new Promise<NativeInputQueuedResult>((resolve) => {
			resolveQueued = resolve;
		});
		const finished = new Promise<NativeInputFinishedResult | NativeResizeFinishedResult>((resolve) => {
			resolveFinished = resolve;
		});
		const failure = (reason: NativeInputFailure['reason']) => {
			const result = { op, state: 'none', reason } as NativeInputFailure;
			resolveQueued(result);
			resolveFinished(result);
		};
		const limits = this.inputLimits;
		const handle = { op, queued, finished, cancel: () => cancel() };
		let pending: PendingOperation | undefined;
		const cancel = () => {
			if (!pending || !this.operations.has(`${sid}:${op}`)) return;
			pending.cancelled = true;
			if (pending.stage === 'local') this.settle(pending, { op, state: 'none', reason: 'cancelled' });
			else if (!this.send({ type: 'input-cancel', sid, op }))
				this.settle(pending, { op, state: 'unknown', reason: 'transport-lost' });
		};
		if (this.ended || this.userClosed.has(sid) || !this.terminationSequences.has(sid) || op > 0xffff_ffff) {
			failure('closed');
			return handle as NativeInputSubmission;
		}
		if (this.inputAdmission !== 1 || !limits) {
			failure('unsupported');
			return handle as NativeInputSubmission;
		}
		if (options?.signal?.aborted) {
			failure('cancelled');
			return handle as NativeInputSubmission;
		}
		let bytes = 0;
		try {
			if (data !== undefined) bytes = utf8Length(data, limits.operationBytes);
		} catch {
			failure('capacity');
			return handle as NativeInputSubmission;
		}
		if (
			(kind === 'input' && !bytes) ||
			(kind === 'resize' &&
				(!grid ||
					!Number.isInteger(grid.cols) ||
					grid.cols < 1 ||
					grid.cols > 65535 ||
					!Number.isInteger(grid.rows) ||
					grid.rows < 1 ||
					grid.rows > 65535))
		) {
			failure('invalid');
			return handle as NativeInputSubmission;
		}
		let sessionBytes = 0,
			sessionCount = 0;
		for (const active of [...this.operations.values(), ...this.editorOperations.values()])
			if (active.sid === sid) {
				sessionBytes += active.bytes;
				sessionCount++;
			}
		if (kind === 'input' && Math.ceil(bytes / limits.fragmentBytes) + 2 > 512) {
			failure('capacity');
			return handle as NativeInputSubmission;
		}
		if (
			this.operations.size + this.editorOperations.size >= limits.helperQueuedOperations ||
			sessionCount >= limits.sessionQueuedOperations ||
			this.operationBytes + bytes > limits.helperQueuedBytes ||
			sessionBytes + bytes > limits.sessionQueuedBytes
		) {
			failure('capacity');
			return handle as NativeInputSubmission;
		}
		this.operationBytes += bytes;
		this.operationBytesPeak = Math.max(this.operationBytesPeak, this.operationBytes);
		this.operationsPeak = Math.max(this.operationsPeak, this.operations.size + 1); // Reserve BEFORE copying caller data or encoding UTF8.
		const timer = this.win.setTimeout(() => {
			if (pending) {
				if (pending.stage === 'local') this.settle(pending, { op, state: 'none', reason: 'cancelled' });
				else {
					this.send({ type: 'input-cancel', sid, op });
					this.settle(pending, { op, state: 'unknown', reason: 'timeout' });
				}
			}
		}, NATIVE_INPUT_TIMEOUT_MS);
		pending = {
			sid,
			op,
			kind,
			bytes,
			stage: 'local',
			cancelled: false,
			queued: resolveQueued,
			finished: resolveFinished,
			cleanup: () => {
				this.win.clearTimeout(timer);
				options?.signal?.removeEventListener('abort', cancel);
			},
		};
		if (data !== undefined) pending.data = typeof data === 'string' ? new TextEncoder().encode(data) : data.slice();
		this.operations.set(`${sid}:${op}`, pending);
		options?.signal?.addEventListener('abort', cancel, { once: true });
		const message =
			kind === 'input'
				? { type: 'input-begin', sid, op, totalBytes: bytes }
				: { type: 'resize', sid, op, ...grid };
		if (
			!this.send(
				message,
				'user',
				sid,
				() => {
					if (pending) pending.stage = kind === 'input' ? 'begin' : 'parts';
				},
				() => this.operations.has(`${sid}:${op}`),
			)
		)
			this.settle(pending, { op, state: 'none', reason: 'capacity' });
		return handle as NativeInputSubmission;
	}
	private settle(pending: PendingOperation, result: NativeInputFinishedResult | NativeResizeFinishedResult): void {
		if (!this.operations.delete(`${pending.sid}:${pending.op}`)) return;
		pending.cleanup();
		this.operationBytes -= pending.bytes;
		pending.data = undefined;
		if (result.state === 'none' || result.state === 'unknown') pending.queued(result);
		pending.finished(result);
	}
	private failOperations(sid: number | undefined, reason: 'transport-lost' | 'write-failed'): void {
		for (const pending of this.operations.values())
			if (sid === undefined || pending.sid === sid)
				this.settle(pending, { op: pending.op, state: 'unknown', reason });
	}
	private operationState(message: Record<string, unknown>): void {
		const wire = parseNativeInputControl(message, this.inputLimits ?? NATIVE_INPUT_LIMITS);
		if (!wire || (wire.type !== 'input-state' && wire.type !== 'resize-state')) return;
		const pending = this.operations.get(`${wire.sid}:${wire.op}`);
		if (!pending || (pending.kind === 'input') !== (wire.type === 'input-state')) return;
		if (wire.state === 'reserved') {
			if (pending.kind !== 'input' || pending.stage !== 'begin' || !pending.data || pending.cancelled) return;
			const size = this.inputLimits!.fragmentBytes,
				count = Math.ceil(pending.bytes / size);
			if (!this.writer.canEnqueue(pending.bytes + count * 17 + 128, 'user', count + 1)) {
				pending.cancelled = true;
				this.send({ type: 'input-cancel', sid: wire.sid, op: wire.op });
				return;
			}
			pending.stage = 'parts';
			const valid = () =>
				this.operations.get(`${wire.sid}:${wire.op}`) === pending &&
				!pending.cancelled &&
				!this.userClosed.has(wire.sid);
			for (let offset = 0; offset < pending.bytes; offset += size)
				this.write(
					encodeInputPart(wire.sid, wire.op, offset, pending.data.subarray(offset, offset + size)),
					'user',
					wire.sid,
					valid,
				);
			this.send({ type: 'input-commit', sid: wire.sid, op: wire.op }, 'user', wire.sid, undefined, valid);
		} else if (wire.state === 'queued') {
			if (pending.stage !== 'parts') return;
			pending.stage = 'queued';
			pending.queued({ op: wire.op, state: 'queued' });
		} else if (wire.state === 'started') {
			if (pending.stage === 'queued') pending.stage = 'started';
		} else if (wire.state === 'none') {
			if (pending.stage !== 'started') this.settle(pending, { op: wire.op, state: 'none', reason: wire.reason });
		} else if (wire.state === 'unknown')
			this.settle(pending, { op: wire.op, state: 'unknown', reason: wire.reason });
		else if (wire.state === 'written' && pending.kind === 'input' && pending.stage === 'started')
			this.settle(pending, { op: wire.op, state: 'written' });
		else if (
			(wire.state === 'applied' || wire.state === 'superseded') &&
			pending.kind === 'resize' &&
			pending.stage === 'queued'
		)
			this.settle(pending, { op: wire.op, state: wire.state });
	}

	acknowledge(sid: number, bytes: number): void {
		if (this.ended) throw new Error('The captured ACK stream is closed');
		if (!Number.isSafeInteger(bytes) || bytes <= 0 || !this.terminationSequences.has(sid)) return;
		const count = Math.min(bytes, this.outputBytes.get(sid) ?? 0);
		if (!count) return;
		this.ackPending.set(sid, (this.ackPending.get(sid) ?? 0) + count);
		this.outputBytes.set(sid, Math.max(0, (this.outputBytes.get(sid) ?? 0) - count));
		this.scheduleACKs();
		this.retireSession(sid);
	}
	private scheduleACKs(): void {
		if (!this.ackPending.size || this.ackScheduled) return;
		this.ackScheduled = true;
		queueMicrotask(() => {
			this.ackScheduled = false;
			this.flushACKs();
		});
	}
	private flushACKs(): void {
		if (this.flushingACK) return;
		this.flushingACK = true;
		try {
			for (const [sid, bytes] of this.ackPending) {
				if (!this.send({ type: 'ack', sid, bytes })) break;
				this.ackPending.delete(sid);
			}
		} finally {
			this.flushingACK = false;
		}
	}

	end(sid: number, force = false): void {
		this.userClosed.add(sid);
		if (!this.send({ type: 'end', sid, force })) throw new Error('Native stop capacity exceeded');
	}

	requestStop(sid: number, options: Readonly<{ requestId: string; force: boolean }>): void {
		if (this.terminalTermination !== 1) throw new Error('Native terminal termination evidence is unavailable');
		if (!this.terminationSequences.has(sid)) throw new Error('The native session is unknown');
		if (
			!options.requestId ||
			options.requestId.length > 128 ||
			Array.from(options.requestId).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
		)
			throw new Error('Invalid native stop request');
		this.userClosed.add(sid);
		if (!this.send({ type: 'end', sid, force: options.force, requestId: options.requestId }))
			throw new Error('Native stop capacity exceeded');
	}

	history<T>(op: 'scan' | 'query' | 'read', payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
		return this.request<T>('history', op, payload, signal);
	}

	request<T>(
		type: 'history' | 'cookies',
		op: string,
		payload: Record<string, unknown>,
		signal?: AbortSignal,
	): Promise<T> {
		if (this.ended) return Promise.reject(new Error('The native helper is disconnected'));
		if (this.requests.size >= 16) return Promise.reject(new Error('Native request capacity exceeded'));
		try {
			controlBytes({ type, op, payload });
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
		return new Promise<T>((resolve, reject) => {
			const rid = crypto.randomUUID();
			const cancel = () => {
				if (type === 'history') this.send({ type, op: 'cancel', rid });
				const pending = this.requests.get(rid);
				this.requests.delete(rid);
				pending?.cleanup();
				reject(
					signal?.reason instanceof Error
						? signal.reason
						: new Error(type === 'history' ? 'History request cancelled' : 'Cookie request cancelled'),
				);
			};
			const timer = this.win.setTimeout(cancel, HISTORY_TIMEOUT);
			this.requests.set(rid, {
				resolve: (value) => resolve(value as T),
				reject,
				cleanup: () => {
					this.win.clearTimeout(timer);
					signal?.removeEventListener('abort', cancel);
				},
			});
			signal?.addEventListener('abort', cancel, { once: true });
			if (signal?.aborted) return cancel();
			try {
				if (!this.send({ type, op, rid, payload })) throw new Error('Native request capacity exceeded');
			} catch (error) {
				this.requests.get(rid)?.cleanup();
				this.requests.delete(rid);
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	private closeReplies(sid: number): void {
		if (this.replySettlement !== 1 || this.replyCloses.has(sid)) return;
		this.replyCloses.set(sid, 'pending');
		this.scheduleReplyCloses();
	}
	private scheduleReplyCloses(): void {
		if (this.ended || this.replyCloseScheduled || ![...this.replyCloses.values()].includes('pending')) return;
		this.replyCloseScheduled = true;
		queueMicrotask(() => {
			this.replyCloseScheduled = false;
			if (this.ended) return;
			for (const [sid, state] of this.replyCloses) {
				if (state !== 'pending') continue;
				this.replyCloses.set(sid, 'queued');
				if (
					!this.send({ type: 'reply-close', sid }, 'reply', sid, () => {
						this.replyCloses.set(sid, 'handed');
					})
				) {
					this.replyCloses.set(sid, 'pending');
					break;
				}
			}
		});
	}
	private retireSession(sid: number): void {
		if (
			!this.numericExits.has(sid) ||
			(this.replySettlement === 1 && !this.settledReplies.has(sid)) ||
			(this.terminalTermination === 1 && !this.confirmed.has(sid)) ||
			(this.outputBytes.get(sid) ?? 0) > 0
		)
			return;
		const editor = this.editors.get(sid);
		// A failed-none request without a native ID can close only after the ordinary fences above.
		if (editor?.failedNone && editor.editorId === undefined) {
			editor.phase = 'closed';
			editor.rejectReady(new NativeEditorError({ state: 'none', effect: 'none', reason: 'closed' }));
			editor.resolveClosed({ reason: 'closed' });
		}
		// Preserve the original SID fences until editor closure AND every operation/frame physically settle.
		// Close, operation settlement and local callback+drain all retry this same join.
		if (editor && !this.finishEditorClose(editor)) return;
		this.terminationSequences.delete(sid);
		this.replyCloses.delete(sid);
		this.settledReplies.delete(sid);
		this.replyFailures.delete(sid);
		this.nextOps.delete(sid);
		this.numericExits.delete(sid);
		this.confirmed.delete(sid);
		this.outputBytes.delete(sid);
		this.sawOutput.delete(sid);
		this.userClosed.delete(sid);
		this.abandoned.delete(sid);
		if (editor) this.editors.delete(sid);
	}
	private close(reason: string, draining = false): void {
		if (!draining) {
			this.ackPending.clear();
			this.writer.close();
		}
		if (this.ended) return;
		this.ended = true;
		this.replyCloses.clear();
		this.settledReplies.clear();
		this.failOperations(undefined, 'transport-lost');
		for (const state of this.editors.values()) {
			state.phase = 'closed'; state.rejectReady(new NativeEditorError({ state: 'unknown', effect: 'unknown', reason: 'transport-lost' }));
			state.resolveClosed({ reason: 'transport-lost' });
			state.rejectClose?.(new NativeEditorError({ state: 'unknown', effect: 'unknown', reason: 'transport-lost' }));
			if (state.closeTimer) this.win.clearTimeout(state.closeTimer);
		}
		for (const pending of this.editorOperations.values()) {
			this.editorFinished(pending, { op: pending.op, state: 'unknown', effect: 'unknown', reason: 'transport-lost' });
			void this.terminated.then(() => this.finishEditorOperation(pending, new NativeEditorError({ state: 'unknown', effect: 'unknown', reason: 'transport-lost' })));
		}
		const detail = this.stderr.trim() ? `${reason}: ${this.stderr.trim().split('\n').pop()}` : reason;
		const error = new Error(`The terminal helper stopped (${detail})`);
		this.hello?.reject(error);
		for (const pending of this.spawns.values()) pending.reject(error);
		this.spawns.clear();
		for (const pending of this.requests.values()) {
			pending.cleanup();
			pending.reject(error);
		}
		this.requests.clear();
		this.events.closed(detail);
	}

	private async startFailed(error: unknown): Promise<never> {
		const primary = error instanceof Error ? error : new Error(String(error));
		try { await this.dispose(); }
		catch (cleanup) { throw new AggregateError([primary, cleanup], primary.message, { cause: primary }); }
		throw primary;
	}
	private terminationOutcome(): Readonly<NativeHelperTermination> {
		return Object.freeze({ ...(this.exitResult ?? { state: 'unconfirmed' as const, code: null, signal: null }), forced: this.forced, stdioClosed: this.didCloseStdio, diagnostic: this.stderr.slice(-4000) });
	}
	/** Revoke admission now; success additionally requires normal exit and completed stdio. */
	dispose(): Promise<void> {
		if (this.stopping) return this.stopping;
		this.stopping = new Promise<void>((resolve, reject) => {
			let deadline: number | undefined;
			const kill = this.win.setTimeout(() => {
				if (!this.exitResult) {
					this.forced = true;
					try { this.child.kill(); } catch { /* The physical fence still owns the result. */ }
				}
				deadline = this.win.setTimeout(() => reject(new NativeShutdownError(
					this.exitResult ? 'The native helper stdio did not close after exit' : 'The native helper did not exit after termination',
					this.terminationOutcome(), this.terminated,
				)), 1000);
			}, 4000);
			void Promise.all([this.terminated, this.stdioClosed]).then(() => {
				this.win.clearTimeout(kill);
				if (deadline !== undefined) this.win.clearTimeout(deadline);
				const outcome = this.terminationOutcome();
				if (outcome.state === 'not-started' || (outcome.code === 0 && outcome.signal === null && !outcome.forced)) resolve();
				else reject(new NativeShutdownError('The native helper did not shut down normally', outcome, this.terminated));
			});
		});
		if (!this.ended) {
			this.flushACKs();
			void (async () => {
				while (true) {
					this.flushACKs();
					await this.writer.whenIdle();
					if (!this.ackPending.size) break;
				}
				try {
					this.child.stdin.end();
				} catch {
					/* Process exit still owns final disposal. */
				}
			})();
		}
		this.close('closed', true);
		return this.stopping;
	}
}

type WriteLane = 'control' | 'reply' | 'user' | 'broker-final' | 'broker-stage' | 'broker-fixed' | 'editor-lifecycle' | 'editor-receipt';
interface WriteItem {
	bytes: Uint8Array;
	charge: number;
	lane: WriteLane;
	sid: number | string;
	handed?(): void;
	valid?(): boolean;
	done: boolean;
	blocked: boolean;
	returned: boolean;
	handedToStream?: boolean;
	settled?(error?: Error): void;
	settledError?: Error;
}
interface HelperWritable {
	write(bytes: Uint8Array, callback: (error?: Error | null) => void): boolean;
	on(event: 'drain', callback: () => void): unknown;
}
const WRITE_LIMITS = { user: 4 * 1024 * 1024, reply: 128 * 1024, control: 64 * 1024,
	'broker-final': CONTROL_LIMITS.finalPoolBytes, 'broker-stage': CONTROL_LIMITS.stagePoolBytes,
	'broker-fixed': CONTROL_LIMITS.scopeBytes + CONTROL_LIMITS.wrapperBytes + CONTROL_LIMITS.registrationBytes + 10,
	'editor-lifecycle': EDITOR_LIMITS.lifecyclePoolBytes,
	'editor-receipt': EDITOR_LIMITS.operationReceiptPoolBytes,
} as const;
/** Owns encoded copies through callback AND drain. No false-returned write is ever retried. */
export class BoundedHelperWriter {
	private readonly queues: Record<WriteLane, Map<number | string, WriteItem[]>> = {
		control: new Map(),
		reply: new Map(),
		user: new Map(),
		'broker-final': new Map(), 'broker-stage': new Map(), 'broker-fixed': new Map(),
		'editor-lifecycle': new Map(), 'editor-receipt': new Map(),
	};
	private readonly charged: Record<WriteLane, number> = { control: 0, reply: 0, user: 0, 'broker-final': 0, 'broker-stage': 0, 'broker-fixed': 0, 'editor-lifecycle': 0, 'editor-receipt': 0 };
	private readonly counts: Record<WriteLane, number> = { control: 0, reply: 0, user: 0, 'broker-final': 0, 'broker-stage': 0, 'broker-fixed': 0, 'editor-lifecycle': 0, 'editor-receipt': 0 };
	private readonly inFlight = new Set<WriteItem>();
	private count = 0;
	private peak = 0;
	private blocked?: WriteItem;
	private pumping = false;
	private ended = false;
	private readonly brokerOrder = new Map<string, WriteItem[]>();
	private controlBurst = 0;
	private idle?: { promise: Promise<void>; resolve(): void };
	constructor(
		private readonly stream: HelperWritable,
		private readonly failed: (error: Error) => void,
		private readonly capacity?: () => void,
	) {
		stream.on('drain', () => {
			const item = this.blocked;
			this.blocked = undefined;
			if (item) {
				item.blocked = false;
				this.free(item);
			}
			this.pump();
		});
	}
	get stats(): Readonly<{ bytes: number; peak: number; frames: number }> {
		return {
			bytes: Object.values(this.charged).reduce((a, b) => a + b, 0),
			peak: this.peak,
			frames: this.count,
		};
	}
	canEnqueue(bytes: number, lane: WriteLane, frames = 1): boolean {
		return (
			!this.ended &&
			bytes >= 0 &&
			this.charged[lane] + bytes <= WRITE_LIMITS[lane] &&
			this.counts[lane] + frames <= (lane === 'user' ? 512 : lane === 'broker-final' ? 16 : lane === 'broker-stage' ? 48 : lane === 'broker-fixed' ? 2 : lane === 'editor-lifecycle' ? EDITOR_LIMITS.lifecycleFrames : lane === 'editor-receipt' ? 128 * EDITOR_LIMITS.operationReceiptStates : 128)
		);
	}
	enqueue(bytes: Uint8Array, lane: WriteLane, sid = 0, handed?: () => void, valid?: () => boolean): boolean {
		if (!this.canEnqueue(bytes.byteLength, lane)) return false;
		const item: WriteItem = { bytes, charge: bytes.byteLength, lane, sid, handed, valid, done: false, blocked: false, returned: false };
		const queue = this.queues[lane].get(sid) ?? [];
		queue.push(item);
		this.queues[lane].set(sid, queue);
		this.charged[lane] += bytes.byteLength;
		this.counts[lane]++;
		this.count++;
		this.peak = Math.max(this.peak, this.stats.bytes);
		this.pump();
		return true;
	}
	/** Holds the entire conservative charge before invoking the sole codec, including unqueued latest progress. */
	prepare(cap: number, lane: WriteLane, sid: string, build: (replacement?: ControlMessage) => Uint8Array, valid?: () => boolean): NativeControlFrame {
		if (!this.canEnqueue(cap, lane)) throw new NativeControlError('BUSY', 'Native control frame pool is full');
		let finish!: (error?: Error) => void;
		const settled = new Promise<void>((resolve, reject) => { finish = error => error ? reject(error) : resolve(); });
		void settled.catch(() => undefined);
		const item: WriteItem = { bytes: new Uint8Array(), charge: cap, lane, sid, valid, done: false, blocked: false, returned: false, settled: finish };
		this.charged[lane] += cap; this.counts[lane]++; this.count++; this.inFlight.add(item);
		this.peak = Math.max(this.peak, this.stats.bytes);
		try { item.bytes = build(); if (item.bytes.byteLength > cap) throw new Error('Reserved native frame overflow'); }
		catch (error) { item.done = true; item.returned = true; this.free(item); throw error; }
		let sent = false;
		return {
			get handed() { return item.handedToStream === true; }, settled,
			replace: message => {
				if (sent || item.done || this.ended || lane !== 'broker-stage') return false;
				// The same charged slot owns replacement copies; release the old encoded reference before rebuilding.
				item.bytes = new Uint8Array();
				try { item.bytes = build(message); if (item.bytes.byteLength > cap) throw new Error('Reserved native progress overflow'); }
				catch (error) { item.bytes = build(); throw error; }
				return true;
			},
			send: () => {
				if (sent || item.done || this.ended) return false;
				sent = true;
				const order = this.brokerOrder.get(sid) ?? []; order.push(item); this.brokerOrder.set(sid, order);
				const queue = this.queues[lane].get(sid) ?? []; queue.push(item); this.queues[lane].set(sid, queue); this.pump(); return !this.ended && !item.settledError;
			},
			cancel: () => {
				if (item.handedToStream || item.done) return false;
				const queue = this.queues[lane].get(sid), at = queue?.indexOf(item) ?? -1;
				if (queue && at >= 0) { queue.splice(at, 1); if (!queue.length) this.queues[lane].delete(sid); }
				const order = this.brokerOrder.get(sid), orderAt = order?.indexOf(item) ?? -1;
				if (order && orderAt >= 0) { order.splice(orderAt, 1); if (!order.length) this.brokerOrder.delete(sid); }
				item.settledError = new Error('Native control frame cancelled before handoff'); item.done = true; item.returned = true; this.free(item); return true;
			},
		};
	}
	private take(lane: WriteLane): WriteItem | undefined {
		for (const [sid, queue] of this.queues[lane]) {
			const item = queue[0];
			if (typeof sid === 'string' && this.brokerOrder.get(sid)?.[0] !== item) continue;
			queue.shift(); this.queues[lane].delete(sid);
			if (queue.length) this.queues[lane].set(sid, queue);
			if (typeof sid === 'string') {
				const order = this.brokerOrder.get(sid)!; order.shift(); if (!order.length) this.brokerOrder.delete(sid);
			}
			return item;
		}
		return undefined;
	}
	whenIdle(): Promise<void> {
		if (!this.count) return Promise.resolve();
		if (!this.idle) {
			let resolve!: () => void;
			const promise = new Promise<void>((done) => {
				resolve = done;
			});
			this.idle = { promise, resolve };
		}
		return this.idle.promise;
	}
	private free(item: WriteItem): void {
		if (!item.done || !item.returned || item.blocked || !this.inFlight.delete(item)) return;
		this.charged[item.lane] -= item.charge;
		this.counts[item.lane]--;
		this.count--;
		item.settled?.(item.settledError);
		item.bytes = new Uint8Array();
		this.capacity?.();
		if (!this.count) {
			this.idle?.resolve();
			this.idle = undefined;
		}
	}
	private pump(): void {
		if (this.pumping || this.blocked || this.ended) return;
		this.pumping = true;
		try {
			while (!this.blocked && !this.ended) {
				const wheel: readonly WriteLane[] = [
					'control',
					'control',
					'control',
					'control',
					'reply',
					'reply',
					'user',
					'user',
					'broker-fixed', 'broker-stage', 'broker-final',
					'editor-lifecycle', 'editor-receipt',
				];
				let item: WriteItem | undefined;
				for (let at = 0; at < wheel.length && !item; at++) {
					const lane = wheel[this.controlBurst]!;
					this.controlBurst = (this.controlBurst + 1) % wheel.length;
					item = this.take(lane);
				}
				if (!item) break;
				this.inFlight.add(item);
				if (item.valid && !item.valid()) {
					item.settledError = new Error('Native control frame owner is closed');
					item.done = true;
					item.returned = true;
					this.free(item);
					continue;
				}
				try {
					item.handedToStream = true;
					item.handed?.();
					const accepted = this.stream.write(item.bytes, (error) => {
						if (error) item.settledError = error;
						item.done = true;
						this.free(item);
						if (error && !this.ended) this.failed(error);
					});
					item.returned = true;
					if (this.ended) break;
					item.blocked = !accepted;
					if (!accepted) this.blocked = item;
					this.free(item);
				} catch (error) {
					this.failed(error instanceof Error ? error : new Error(String(error)));
					this.close();
				}
			}
		} finally {
			this.pumping = false;
		}
	}
	close(): void {
		this.ended = true;
		this.blocked = undefined;
		this.brokerOrder.clear();
		for (const item of this.inFlight) item.settled?.(new Error('Native helper writer closed'));
		for (const lane of Object.keys(this.queues) as WriteLane[]) {
			this.queues[lane].clear();
			this.charged[lane] = 0;
			this.counts[lane] = 0;
		}
		this.inFlight.clear();
		this.count = 0;
		this.idle?.resolve();
		this.idle = undefined;
	}
}
