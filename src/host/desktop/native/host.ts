import { setTimeout as scheduleNativeTimeout, clearTimeout as cancelNativeTimeout } from 'node:timers';
import type { NativeInputOptions, NativeInputSubmission, NativeResizeSubmission, NativeEditorBinding, NativeEditorSubmission } from '../../../shared/native/input';
import { NativeControlError, NativeReleaseError, NativeReplyError, NativeSpawnError, NativeShutdownError } from '../../../shared/native/host';
import { NativeEditorError } from '../../../shared/native/input';
import { CONTROL_LIMITS, encodeEditorLaunch, type ControlInputReceipt, type ControlTarget, type NativeEditorLaunch, type EditorMessage, type ControlMessage, type ControlScope, type ControlRegisteredMessage, type ControlRequestMessage, type ControlProgress, type ControlResponse, type ControlCancelMessage, controlDescriptor } from '../../../shared/native/control-wire';
import {
	NATIVE_TERMINATION_OBSERVE_MS,
	parseTerminationNotice,
	terminationConfirmed,
	type NativeTerminationNotice,
} from '../../../shared/native/termination';
import { waitForNative } from '../../../shared/native/abort';
import type {
	NativeCapability,
	NativeConnection,
	NativeEvents,
	NativeHostAccess,
	NativeLease,
	NativeSpawnOptions,
	NativeTransport,
	NativeControlEvents, NativeControlRegistration, NativeControlCall, NativeControlFrame,
} from '../../../shared/native/host';

interface Running {
	editorLaunch?: NativeEditorLaunch;
	editorId?: string;
	editor?: NativeEditorBinding;
	spawning?: boolean;
	spawnSettled?: 'before-exit' | 'after-exit';
	replySettled?: boolean;
	outputBytes: number;
	failedNone?: boolean;
	exited: Promise<void>;
	exit(): void;
	notice?: NativeTerminationNotice;
	numericExit?: boolean;
	stopError?: unknown;
	stopAt?: number;
}
interface Owner {
	capability: NativeCapability;
	events: Partial<NativeEvents>;
	abort: AbortController;
	sessions: Set<number>;
	running: Map<number, Running>;
	releasing?: Promise<void>;
	released: boolean;
	/** The bounded observation has settled; revoking admission alone cannot close a sibling's drain. */
	releaseObserved: boolean;
	failure?: Error;
}
interface Generation {
	owners: Set<Owner>;
	starting: Promise<void>;
	helper?: NativeTransport;
	failure?: Error;
	closing?: Promise<void>;
	nextSid: number;
	control?: ControlRegistrationState;
}
function shutdownErrors(error: unknown, seen = new Set<unknown>()): NativeShutdownError[] {
	if (seen.has(error)) return [];
	seen.add(error);
	return error instanceof NativeShutdownError ? [error] : error instanceof AggregateError ? error.errors.flatMap(value => shutdownErrors(value, seen)) : [];
}
function containsError(container: unknown, error: unknown, seen = new Set<unknown>()): boolean {
	if (container === error) return true;
	if (seen.has(container)) return false;
	seen.add(container);
	return container instanceof AggregateError && container.errors.some(value => containsError(value, error, seen));
}
interface ControlCallState {
	handle: NativeControlCall; abort: AbortController; admitted: boolean;
	final?: NativeControlFrame; ioDone: boolean; nativeDone: boolean;
	progress?: NativeControlFrame; latest?: NativeControlFrame;
	effect: ControlProgress['effect']; frames: Set<NativeControlFrame>;
	input?: Readonly<{ target: ControlTarget; receipt: ControlInputReceipt }>;
}
interface ControlRegistrationState {
	owner: Owner; controlId: string; phase: 'registering' | 'active' | 'closing' | 'closed';
	events: NativeControlEvents; calls: Map<string, ControlCallState>;
	route?: ControlRegisteredMessage; api: NativeControlRegistration;
	ready: Promise<NativeControlRegistration>; resolveReady(value: NativeControlRegistration): void; rejectReady(error: Error): void;
	closing?: Promise<void>; resolveClose?(): void; rejectClose?(error: Error): void;
	timer?: ReturnType<typeof scheduleNativeTimeout>; closeTimer?: ReturnType<typeof scheduleNativeTimeout>;
	removeAbort?(): void; diagnostics: string[]; frames: Set<NativeControlFrame>; ackClosed: boolean; peak: number;
}

/** One process shared by independent capability owners. A crashed generation is never revived. */
export class NativeHost implements NativeHostAccess {
	private current?: Generation;
	private stopped = false;
	private stopping?: Promise<void>;
	private lastClosing?: Promise<void>;
	private readonly leases = new WeakMap<NativeLease, { generation: Generation; owner: Owner }>();
	private readonly calls = new WeakMap<NativeControlCall, { registration: ControlRegistrationState; call: ControlCallState }>();
	constructor(private readonly start: (events: NativeEvents) => Promise<NativeTransport>) {}

	async acquire(
		capability: NativeCapability,
		events: Partial<NativeEvents> = {},
		signal?: AbortSignal,
	): Promise<NativeLease> {
		signal?.throwIfAborted();
		while (this.current?.closing) {
			const closing = this.current;
			try { await waitForNative(closing.closing!, signal); }
			catch (error) {
				if (signal?.aborted || this.current === closing) throw error;
				// The prior caller still receives its failure; confirmed physical exit permits a new acquisition.
			}
		}
		if (this.stopped) throw new Error('The native host is closed');
		signal?.throwIfAborted();
		const generation = this.current ?? this.createGeneration();
		return this.acquireOwner(generation, capability, events, signal);
	}
	private async acquireOwner(generation: Generation, capability: NativeCapability, events: Partial<NativeEvents>, signal?: AbortSignal, captured?: Owner): Promise<NativeLease> {
		const checkCaptured = () => {
			signal?.throwIfAborted();
			if (captured && (this.current !== generation || captured.released || !generation.owners.has(captured)))
				throw new NativeControlError('CONNECTION_UNAVAILABLE', 'The captured PTY generation is no longer current');
			if (captured) this.active(generation, captured, 'pty');
		};
		checkCaptured();
		const owner: Owner = {
			capability,
			events,
			abort: new AbortController(),
			sessions: new Set(),
			running: new Map(),
			released: false,
			releaseObserved: false,
		};
		generation.owners.add(owner);
		let rejectCancelled: (error: unknown) => void = () => {};
		const cancelled = new Promise<never>((_resolve, reject) => {
			rejectCancelled = reject;
		});
		const cancel = () => {
			rejectCancelled(
				signal?.reason instanceof Error ? signal.reason : new Error('Native acquisition cancelled'),
			);
			void this.release(generation, owner).catch((error) => console.error('[HUHU native]', error));
		};
		signal?.addEventListener('abort', cancel, { once: true });
		try {
			await Promise.race([generation.starting, cancelled]);
			this.active(generation, owner);
			checkCaptured();
			if (capability === 'control' && generation.helper?.localControl !== 1)
				throw new NativeControlError('CAPABILITY_UNAVAILABLE', 'The helper does not support local control');
			const lease: NativeLease = {
				value: this.connection(generation, owner),
				allocateSessionId: () => {
					this.active(generation, owner, 'pty');
					if (generation.nextSid >= 0xffffffff) throw new Error('Native session numbers exhausted');
					const sid = ++generation.nextSid;
					owner.sessions.add(sid);
					return sid;
				},
				release: () => this.release(generation, owner),
				...(capability === 'pty' ? { acquireControl: (controlEvents: Partial<NativeEvents> = {}, controlSignal?: AbortSignal) => this.acquireOwner(generation, 'control', controlEvents, controlSignal, owner) } : {}),
				...(capability === 'control' ? { registerControl: (scope: Readonly<ControlScope>, controlEvents: NativeControlEvents, options?: Readonly<{ signal?: AbortSignal }>) => this.registerControl(generation, owner, scope, controlEvents, options?.signal) } : {}),
			};
			this.leases.set(lease, { generation, owner });
			return lease;
		} catch (error) {
			if (signal?.aborted)
				void this.release(generation, owner).catch((error) => console.error('[HUHU native]', error));
			else {
				try { await this.release(generation, owner); }
				catch (cleanup) {
					if (containsError(error, cleanup)) throw error;
					throw new AggregateError([error, cleanup], 'Native acquisition and cleanup failed', { cause: error });
				}
			}
			throw error;
		} finally {
			signal?.removeEventListener('abort', cancel);
		}
	}

	private createGeneration(): Generation {
		const generation: Generation = { owners: new Set(), starting: Promise.resolve(), nextSid: 0 };
		this.current = generation;
		this.lastClosing = undefined;
		generation.starting = Promise.resolve()
			.then(async () => {
				const helper = await this.start({
					editor: message => this.editorMessage(generation, message),
					control: message => this.controlMessage(generation, message),
					replySettled: (sid) => {
						for (const owner of generation.owners) {
							const running = owner.running.get(sid);
							if (running?.spawning && generation.helper?.replySettlement === 1) {
								running.spawnSettled = running.numericExit ? 'after-exit' : 'before-exit';
								continue;
							}
							if (
								!running ||
								generation.helper?.replySettlement !== 1 ||
								(!running.numericExit && !running.failedNone) ||
								running.replySettled
							)
								continue;
							running.replySettled = true;
							this.notify(() => owner.events.replySettled?.(sid));
							this.finishDrain(generation, owner, sid, running);
						}
					},
					replyFailure: (sid, result) => {
						for (const owner of generation.owners)
							if (owner.sessions.has(sid) && !owner.running.get(sid)?.replySettled)
								this.notify(() => owner.events.replyFailure?.(sid, result));
					},
					inputFailure: (sid, result) => {
						for (const owner of generation.owners)
							if (owner.sessions.has(sid)) this.notify(() => owner.events.inputFailure?.(sid, result));
					},
					output: (sid, bytes) => {
						for (const owner of generation.owners)
							if (owner.sessions.has(sid)) {
								const running = owner.running.get(sid);
								if (running) running.outputBytes += bytes.byteLength;
								this.notify(() => owner.events.output?.(sid, bytes));
							}
					},
					exit: (sid, code, signal) => {
						for (const owner of generation.owners)
							if (owner.sessions.has(sid)) {
								const running = owner.running.get(sid);
								if (running) {
									running.numericExit = true;
									if (
										(generation.helper?.terminalTermination !== 1 ||
											(running.notice && running.notice.evidence.cleanup.state !== 'pending')) &&
										this.ioDrained(generation, running)
									)
										running.exit();
								}
								this.notify(() => owner.events.exit?.(sid, code, signal));
								this.retire(generation, owner);
							}
					},
					termination: (sid, value) => {
						for (const owner of generation.owners) {
							const running = owner.running.get(sid);
							if (!running) continue;
							const notice = parseTerminationNotice(
								{ ...value, type: 'terminal-termination', sid },
								{
									sid,
									platform: process.platform,
									lastSequence: running.notice?.sequence ?? 0,
									capability: generation.helper?.terminalTermination,
								},
							);
							if (!notice) continue;
							running.notice = notice;
							if (
								notice.evidence.cleanup.state !== 'pending' &&
								running.numericExit &&
								this.ioDrained(generation, running)
							)
								running.exit();
							this.notify(() => owner.events.termination?.(sid, notice));
							this.retire(generation, owner);
						}
					},
					closed: (reason) => this.failed(generation, new Error(reason)),
				});
				generation.helper = helper;
				if (!helper.alive) throw new Error('The native helper disconnected during startup');
				if (!generation.owners.size || generation.failure || this.stopped)
					void this.shutdown(generation).catch((error) => console.error('[HUHU native]', error));
			})
			.catch((error: unknown) => {
				this.failed(generation, error instanceof Error ? error : new Error(String(error)));
				throw error;
			});
		void generation.starting.catch(() => undefined);
		return generation;
	}

	private failed(generation: Generation, error: Error): void {
		if (generation.failure || generation.closing) return;
		generation.failure = error;
		if (generation.control) this.finishControl(generation, generation.control, error);
		for (const owner of generation.owners) {
			owner.failure = error;
			owner.abort.abort(error);
			for (const running of owner.running.values()) running.exit();
			this.notify(() => owner.events.closed?.(error.message));
		}
		void this.shutdown(generation).catch((error) => console.error('[HUHU native]', error));
	}

	private notify(callback: () => void): void {
		try {
			callback();
		} catch (error) {
			console.error('[HUHU native consumer]', error);
		}
	}
	private editorMessage(generation: Generation, message: EditorMessage): void {
		for (const owner of generation.owners) {
			const running = owner.running.get(message.sid);
			if (!running?.editorLaunch || generation.failure || (running.editorId && running.editorId !== message.editorId)) continue;
			if (message.type === 'editor-ready') {
				if (owner.released || running.numericExit || running.failedNone || message.identity.runtimeId !== running.editorLaunch.identity.runtimeId ||
					message.profileId !== running.editorLaunch.recipe.profileId) continue;
				running.editorId = message.editorId;
			} else if (!running.editorId && message.type === 'editor-closed') running.editorId = message.editorId;
			else if (!running.editorId) continue;
			this.notify(() => owner.events.editor?.(message));
		}
	}

	private active(generation: Generation, owner: Owner, capability?: NativeCapability): NativeTransport {
		if (owner.failure) throw owner.failure;
		if (owner.released || this.stopped) throw new Error('The native capability lease is closed');
		if (capability && owner.capability !== capability) throw new Error('The native capability is not leased');
		if (generation.failure) throw generation.failure;
		if (!generation.helper?.alive || generation.closing) throw new Error('The native helper is disconnected');
		return generation.helper;
	}

	private controlDiagnostic(state: ControlRegistrationState, error: unknown): void {
		if (state.diagnostics.length < 16) state.diagnostics.push((error instanceof Error ? error.message : 'Control callback failed').slice(0, 256));
	}
	private completedInput(call: ControlCallState, value: ControlProgress, requireInputPhase = true): ControlCallState['input'] {
		const operation = call.handle.wire.request.operation;
		const kind = operation === 'agent.prompt' ? 'adapter-applied' : operation === 'terminal.send-text' || operation === 'terminal.send-keys' ? 'pty-written' : undefined;
		if (!kind || value.effect !== 'completed' || (requireInputPhase && value.phase !== 'input-submitted') || !value.target?.sessionId || !value.target.runtimeId) return;
		const data = value.data;
		if (!data || typeof data !== 'object' || Array.isArray(data)) return;
		const receipt = Object.getOwnPropertyDescriptor(data, 'receipt');
		const raw: unknown = receipt && 'value' in receipt ? receipt.value : undefined;
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
		let fields = 0;
		for (const key in raw) { if (++fields > 2 || !Object.hasOwn(raw, key) || (key !== 'kind' && key !== 'op')) return; }
		const rawKind: unknown = Object.getOwnPropertyDescriptor(raw, 'kind')?.value;
		const op: unknown = Object.getOwnPropertyDescriptor(raw, 'op')?.value;
		if (fields !== 2 || rawKind !== kind || typeof op !== 'number' || !Number.isInteger(op) || op < 1 || op > 0xffff_ffff) return;
		for (const [key, expected] of Object.entries(call.handle.wire.request.target ?? {}))
			if (value.target[key as keyof ControlTarget] !== expected) return;
		return Object.freeze({ target: Object.freeze({ ...value.target }), receipt: Object.freeze({ kind, op }) });
	}
	private sameCompletedInput(call: ControlCallState, value: ControlProgress): boolean {
		if (!call.input) return true;
		const observed = this.completedInput(call, value, false);
		return !!observed && observed.receipt.kind === call.input.receipt.kind && observed.receipt.op === call.input.receipt.op &&
			(['vaultId', 'instanceId', 'spaceId', 'sessionId', 'runtimeId', 'paneId'] as const).every(key => observed.target[key] === call.input!.target[key]);
	}
	private controlFrame(generation: Generation, state: ControlRegistrationState, message: ControlMessage): NativeControlFrame {
		const helper = generation.helper;
		if (generation.failure || !helper?.alive || !helper.prepareControl || state.phase === 'closed')
			throw new NativeControlError('CONNECTION_UNAVAILABLE', 'Captured native control is disconnected');
		return helper.prepareControl(message, () => generation.control === state && state.phase !== 'closed' && !generation.failure);
	}
	private trackControlFrame(generation: Generation, state: ControlRegistrationState, frame: NativeControlFrame, call?: ControlCallState): void {
		const frames = call?.frames ?? state.frames; frames.add(frame);
		void frame.settled.then(() => {
			frames.delete(frame); if (call) this.finishControlCall(generation, state, call); else this.finishControlClose(generation, state);
		}, error => {
			frames.delete(frame); this.controlDiagnostic(state, error);
			if (call) this.finishControlCall(generation, state, call); else this.finishControlClose(generation, state);
		});
	}
	private async registerControl(generation: Generation, owner: Owner, scope: Readonly<ControlScope>, events: NativeControlEvents, signal?: AbortSignal): Promise<NativeControlRegistration> {
		signal?.throwIfAborted(); this.active(generation, owner, 'control');
		if (this.current !== generation) throw new NativeControlError('CONNECTION_UNAVAILABLE', 'Control generation is stale');
		if (generation.control) throw new NativeControlError('BUSY', 'Native control registration is still active or closing');
		let resolveReady!: (api: NativeControlRegistration) => void, rejectReady!: (error: Error) => void;
		const ready = new Promise<NativeControlRegistration>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
		void ready.catch(() => undefined);
		const state: ControlRegistrationState = {
			owner, controlId: crypto.randomUUID(), phase: 'registering', events, calls: new Map(),
			ready, resolveReady, rejectReady, api: undefined as unknown as NativeControlRegistration,
			diagnostics: [], frames: new Set(), ackClosed: false, peak: 0,
		};
		const getCall = (handle: NativeControlCall) => {
			const owned = this.calls.get(handle);
			return owned?.registration === state && state.calls.get(handle.wire.bridgeId) === owned.call ? owned.call : undefined;
		};
		state.api = {
			get route() { return state.route!; },
			current: lease => {
				const captured = this.leases.get(lease);
				return !!captured && captured.generation === generation && captured.owner.capability === 'pty' &&
					this.current === generation && generation.control === state && state.phase === 'active' &&
					!this.stopped && !generation.failure && !generation.closing && !!generation.helper?.alive &&
					!owner.released && !owner.failure && generation.owners.has(owner) &&
					!captured.owner.released && !captured.owner.failure && generation.owners.has(captured.owner);
			},
			admit: handle => {
				const call = getCall(handle);
				if (!call || call.admitted || call.final || call.abort.signal.aborted || state.phase !== 'active' || owner.released || generation.failure) return false;
				try {
					const frame = this.controlFrame(generation, state, { type: 'control-admitted', controlId: state.controlId, bridgeId: handle.wire.bridgeId, progress: { phase: 'admitted', effect: 'none' } });
					this.trackControlFrame(generation, state, frame, call);
					// Claim once before write: a synchronous stream callback may reenter the host.
					call.admitted = true;
					if (!frame.send()) { frame.cancel(); return false; }
					return !call.abort.signal.aborted && state.phase === 'active' && !owner.released && !generation.failure && generation.helper?.alive === true;
				} catch (error) { this.controlDiagnostic(state, error); return false; }
			},
			progress: (handle, value) => {
				const call = getCall(handle);
				if (!call || call.final || state.phase !== 'active' || call.abort.signal.aborted || (call.effect !== 'none' && value.effect === 'none') || !this.sameCompletedInput(call, value)) return false;
				if (controlDescriptor().operations[handle.wire.request.operation].readOnly && value.effect !== 'none') return false;
				try {
					if (call.latest) {
						const replaced = call.latest.replace?.({ type: 'control-progress', controlId: state.controlId, bridgeId: handle.wire.bridgeId, progress: value }) ?? false;
						if (replaced) { call.effect = value.effect; call.input ??= this.completedInput(call, value); }
						return replaced;
					}
					const frame = this.controlFrame(generation, state, { type: 'control-progress', controlId: state.controlId, bridgeId: handle.wire.bridgeId, progress: value });
					this.trackControlFrame(generation, state, frame, call); call.effect = value.effect; call.input ??= this.completedInput(call, value);
					if (call.progress) call.latest = frame;
					else this.startControlProgress(generation, state, call, frame);
					return true;
				} catch (error) { this.controlDiagnostic(state, error); return false; }
			},
			result: async (handle, value) => {
				const call = getCall(handle);
				if (!call || call.final || state.phase === 'closed') throw new NativeControlError('INVALID_ARGUMENT', 'Invalid, stale or already completed native control call');
				if (value.requestId !== handle.wire.request.requestId || value.operation !== handle.wire.request.operation || (call.effect !== 'none' && value.effect === 'none'))
					throw new NativeControlError('INVALID_ARGUMENT', 'Native control result does not match its captured call');
				if (!this.sameCompletedInput(call, value)) throw new NativeControlError('INVALID_ARGUMENT', 'Native input receipt or target cannot be discarded');
				if (controlDescriptor().operations[handle.wire.request.operation].readOnly && value.effect !== 'none') throw new NativeControlError('INVALID_ARGUMENT', 'Read-only observations have no input effect');
				const frame = this.controlFrame(generation, state, { type: 'control-result', controlId: state.controlId, bridgeId: handle.wire.bridgeId, response: value });
				call.final = frame; call.latest?.cancel(); call.latest = undefined;
				this.trackControlFrame(generation, state, frame, call);
				if (!frame.send()) { frame.cancel(); throw new NativeControlError('CONNECTION_UNAVAILABLE', 'Native control result was not handed off'); }
				await frame.settled; call.ioDone = true; this.finishControlCall(generation, state, call);
			},
			close: () => this.closeControl(generation, state),
		};
		generation.control = state;
		const cancel = () => { void this.closeControl(generation, state).catch(error => this.controlDiagnostic(state, error)); };
		signal?.addEventListener('abort', cancel, { once: true });
		state.removeAbort = () => signal?.removeEventListener('abort', cancel);
		state.timer = scheduleNativeTimeout(() => {
			state.rejectReady(new NativeControlError('EFFECT_UNKNOWN', 'Native control registration was not confirmed', 'unknown'));
			cancel();
		}, CONTROL_LIMITS.handshakeMs);
		try {
			const frame = this.controlFrame(generation, state, { type: 'control-register', controlId: state.controlId, scope });
			this.trackControlFrame(generation, state, frame); if (!frame.send()) throw new NativeControlError('CONNECTION_UNAVAILABLE', 'Native registration was not handed off');
		} catch (error) { this.finishControl(generation, state, error instanceof Error ? error : new Error(String(error))); }
		return ready;
	}
	private startControlProgress(generation: Generation, state: ControlRegistrationState, call: ControlCallState, frame: NativeControlFrame): void {
		call.progress = frame; if (!frame.send()) frame.cancel();
		const advance = () => {
			if (call.progress !== frame) return;
			call.progress = undefined; const latest = call.latest; call.latest = undefined;
			if (latest) {
				if (!call.final && state.phase === 'active' && !call.abort.signal.aborted) this.startControlProgress(generation, state, call, latest);
				else latest.cancel();
			}
		};
		void frame.settled.then(advance, advance);
	}
	private controlMessage(generation: Generation, message: ControlMessage): void {
		const state = generation.control;
		if (!state || state.controlId !== message.controlId || state.phase === 'closed') return;
		switch (message.type) {
			case 'control-registered':
				if (state.phase === 'registering') {
					state.route = message; state.phase = 'active';
					if (state.timer) cancelNativeTimeout(state.timer); state.resolveReady(state.api);
				}
				return;
			case 'control-unregistered':
				if (state.phase === 'closing') { state.ackClosed = true; this.finishControlClose(generation, state); }
				return;
			case 'control-error':
				if (state.phase === 'registering') this.finishControl(generation, state, new NativeControlError(message.error.code, message.error.message, message.error.code === 'EFFECT_UNKNOWN' ? 'unknown' : 'none'));
				else this.controlDiagnostic(state, message.error.message);
				return;
			case 'control-request': {
				if (state.calls.has(message.bridgeId) || state.calls.size >= CONTROL_LIMITS.pending)
					throw new Error('Native control pending identity or capacity violation');
				const ordinary = (wire: ControlRequestMessage) => controlDescriptor().operations[wire.request.operation].transport === 'ordinary';
				if (ordinary(message) && [...state.calls.values()].filter(c => ordinary(c.handle.wire)).length >= CONTROL_LIMITS.ordinaryPending)
					throw new Error('Native ordinary control capacity violation');
				const abort = new AbortController(), handle: NativeControlCall = Object.freeze({ wire: message, signal: abort.signal }),
					call: ControlCallState = { handle, abort, admitted: false, ioDone: false, nativeDone: false, effect: 'none', frames: new Set() };
				state.calls.set(message.bridgeId, call); this.calls.set(handle, { registration: state, call }); state.peak = Math.max(state.peak, state.calls.size);
				if (state.phase !== 'active' || state.owner.released) {
					void this.rejectControlCall(state, call, new NativeControlError('MODULE_INACTIVE', 'Native control admission is closed')); return;
				}
				try { state.events.forward(handle); }
				catch (error) { this.controlDiagnostic(state, error); void this.rejectControlCall(state, call, new NativeControlError(call.admitted ? 'EFFECT_UNKNOWN' : 'CONNECTION_UNAVAILABLE', 'Control callback failed', call.admitted ? 'unknown' : 'none')); }
				return;
			}
			case 'control-cancel': {
				const call = state.calls.get(message.bridgeId); if (call) this.cancelControlCall(state, call, message.reason); return;
			}
			case 'control-settled': {
				const call = state.calls.get(message.bridgeId); if (call) { call.nativeDone = true; this.finishControlCall(generation, state, call); } return;
			}
			default: throw new Error('Invalid control message direction for host');
		}
	}
	private async rejectControlCall(state: ControlRegistrationState, call: ControlCallState, error: NativeControlError): Promise<void> {
		try { await state.api.result(call.handle, { protocolVersion: 1, requestId: call.handle.wire.request.requestId, operation: call.handle.wire.request.operation, ok: false, phase: 'failed', effect: controlDescriptor().operations[call.handle.wire.request.operation].readOnly ? 'none' : call.input ? 'completed' : error.effect,
			...(call.input ? { target: call.input.target, data: { receipt: call.input.receipt } } : {}),
			error: { code: (call.input || controlDescriptor().operations[call.handle.wire.request.operation].readOnly) && error.code === 'EFFECT_UNKNOWN' ? 'CONNECTION_UNAVAILABLE' : error.code, message: error.message } } as ControlResponse); }
		catch (failure) { this.controlDiagnostic(state, failure); }
	}
	private cancelControlCall(state: ControlRegistrationState, call: ControlCallState, reason: ControlCancelMessage['reason']): void {
		if (call.abort.signal.aborted) return;
		call.abort.abort(new NativeControlError(reason === 'timeout' ? 'WAIT_TIMEOUT' : 'WAIT_CANCELLED', 'Control observation ended', call.admitted && !controlDescriptor().operations[call.handle.wire.request.operation].readOnly ? 'unknown' : 'none'));
		call.latest?.cancel(); call.latest = undefined;
		try { state.events.cancel?.(call.handle, reason); } catch (error) { this.controlDiagnostic(state, error); }
	}
	private finishControlCall(generation: Generation, state: ControlRegistrationState, call: ControlCallState): void {
		if (!call.ioDone || !call.nativeDone || call.frames.size) return;
		state.calls.delete(call.handle.wire.bridgeId); this.calls.delete(call.handle); this.finishControlClose(generation, state);
	}
	private closeControl(generation: Generation, state: ControlRegistrationState): Promise<void> {
		if (state.closing) return state.closing;
		if (state.phase === 'closed') return Promise.resolve();
		state.closing = new Promise<void>((resolve, reject) => { state.resolveClose = resolve; state.rejectClose = reject; });
		void state.closing.catch(() => undefined);
		state.phase = 'closing'; state.removeAbort?.(); if (state.timer) cancelNativeTimeout(state.timer);
		state.rejectReady(new NativeControlError('CONNECTION_UNAVAILABLE', 'Native control registration was closed'));
		for (const call of state.calls.values()) this.cancelControlCall(state, call, 'closed');
		state.closeTimer = scheduleNativeTimeout(() => state.rejectClose?.(new NativeControlError('EFFECT_UNKNOWN', 'Native control cleanup was not confirmed', 'unknown')), CONTROL_LIMITS.handshakeMs);
		try {
			const frame = this.controlFrame(generation, state, { type: 'control-unregister', controlId: state.controlId });
			this.trackControlFrame(generation, state, frame); if (!frame.send()) throw new Error('Unregister was not handed off');
		} catch (error) { this.controlDiagnostic(state, error); state.rejectClose?.(new NativeControlError('EFFECT_UNKNOWN', 'Native control cleanup could not be observed', 'unknown')); }
		return state.closing;
	}
	private finishControlClose(generation: Generation, state: ControlRegistrationState): void {
		if (state.phase === 'closing' && state.ackClosed && !state.calls.size && !state.frames.size) this.finishControl(generation, state);
	}
	private finishControl(generation: Generation, state: ControlRegistrationState, error?: Error): void {
		if (state.phase === 'closed') return;
		state.phase = 'closed'; state.removeAbort?.();
		if (state.timer) cancelNativeTimeout(state.timer); if (state.closeTimer) cancelNativeTimeout(state.closeTimer);
		for (const call of state.calls.values()) { this.cancelControlCall(state, call, 'closed'); call.latest?.cancel(); this.calls.delete(call.handle); }
		state.calls.clear(); state.rejectReady(error ?? new NativeControlError('CONNECTION_UNAVAILABLE', 'Native control closed'));
		if (error) state.rejectClose?.(error); else state.resolveClose?.();
		if (generation.control === state) generation.control = undefined;
		this.notify(() => state.events.closed(error?.message ?? 'closed'));
		this.retire(generation, state.owner);
		if ([...generation.owners].every(candidate => candidate.released && candidate.releaseObserved))
			void this.shutdown(generation).catch(failure => console.error('[HUHU native]', failure));
	}
	get controlStats(): Readonly<{ calls: number; peak: number; phase?: string; diagnostics: number; frames: number }> {
		const state = this.current?.control;
		return { calls: state?.calls.size ?? 0, peak: state?.peak ?? 0, phase: state?.phase, diagnostics: state?.diagnostics.length ?? 0, frames: state ? [...state.calls.values()].reduce((n, call) => n + call.frames.size, 0) : 0 };
	}

	private connection(generation: Generation, owner: Owner): NativeConnection {
		const pty = (sid: number) => {
			const helper = this.active(generation, owner, 'pty');
			if (!owner.sessions.has(sid)) throw new Error('The terminal belongs to another native owner');
			if (owner.running.get(sid)?.failedNone)
				throw new Error('The failed terminal only retains a captured drain');
			return helper;
		};
		const drain = (sid: number) => {
			if (owner.capability !== 'pty' || !owner.sessions.has(sid) || !generation.owners.has(owner))
				throw new Error('The terminal drain belongs to another native owner');
			if (owner.failure || generation.failure || !generation.helper?.alive)
				throw new Error('The captured native stream is disconnected');
			return generation.helper;
		};
		const request = async <T>(
			type: 'history' | 'cookies',
			op: string,
			payload: Record<string, unknown>,
			signal?: AbortSignal,
		): Promise<T> => {
			const helper = this.active(generation, owner, type);
			signal?.throwIfAborted();
			const abort = new AbortController();
			const cancel = () => abort.abort(signal?.reason);
			const close = () => abort.abort(owner.abort.signal.reason);
			signal?.addEventListener('abort', cancel, { once: true });
			owner.abort.signal.addEventListener('abort', close, { once: true });
			try {
				return await helper.request<T>(type, op, payload, abort.signal);
			} finally {
				signal?.removeEventListener('abort', cancel);
				owner.abort.signal.removeEventListener('abort', close);
			}
		};
		return {
			get editorTransactions() { return owner.capability === 'pty' ? generation.helper?.editorTransactions : undefined; },
			editorBinding: sid => {
				const helper = pty(sid), running = owner.running.get(sid);
				if (!running?.editorLaunch || helper.editorTransactions !== 1 || !helper.editorBinding) return;
				if (running.editor) return running.editor;
				const native = helper.editorBinding(sid);
				if (!native || native.sid !== sid || native.identity.runtimeId !== running.editorLaunch.identity.runtimeId) return;
				let revoked = false;
				const current = () => !revoked && this.current === generation && !owner.released && !owner.failure &&
					!generation.failure && !generation.closing && helper.alive && !running.numericExit && !running.failedNone && owner.running.get(sid) === running;
				const rejected = (): NativeEditorSubmission => {
					const result = { op: 0, state: 'none' as const, effect: 'none' as const, reason: 'closed' as const };
					return { op: 0, queued: Promise.resolve(result), finished: Promise.resolve(result), settled: Promise.resolve(), cancel() {} };
				};
				running.editor = { sid, identity: native.identity, ready: native.ready, closed: native.closed,
					get active() { return current() && native.active; },
					submit: (text, options) => current() ? native.submit(text, options) : rejected(),
					close: () => { revoked = true; return native.close(); },
				};
				return running.editor;
			},
			spawnEnvironment: overrides => {
				const helper = this.active(generation, owner, 'pty');
				if (this.current !== generation || !generation.owners.has(owner) || !helper.spawnEnvironment)
					throw new NativeEditorError({ state: 'none', effect: 'none', reason: 'unsupported' });
				return helper.spawnEnvironment(overrides);
			},
			get alive() {
				return !owner.released && !owner.failure && !generation.failure && !!generation.helper?.alive;
			},
			get version() {
				return generation.helper?.version ?? '';
			},
			get outputAbandon() {
				return generation.helper?.outputAbandon;
			},
			...(generation.helper?.outputAbandon === 1 && generation.helper.abandonOutput
				? {
						abandonOutput: (sid: number) => {
							const helper = drain(sid);
							helper.abandonOutput!(sid);
							const running = owner.running.get(sid);
							if (running) {
								running.outputBytes = 0;
								this.finishDrain(generation, owner, sid, running);
							}
						},
					}
				: {}),
			get inputAdmission() {
				return generation.helper?.inputAdmission;
			},
			get inputLimits() {
				return generation.helper?.inputLimits;
			},
			get replySettlement() {
				return generation.helper?.replySettlement;
			},
			get terminalTermination() {
				return generation.helper?.terminalTermination;
			},
			...(generation.helper?.terminalTermination === 1
				? {
						requestStop: (sid: number, options: Readonly<{ requestId: string; force: boolean }>) => {
							const helper = pty(sid);
							if (!helper.requestStop) throw new Error('Native termination requests are unavailable');
							const running = owner.running.get(sid);
							if (running) running.stopAt ??= performance.now();
							helper.requestStop(sid, options);
						},
					}
				: {}),
			spawnSession: async (sid: number, options: NativeSpawnOptions) => {
				const helper = pty(sid);
				if (owner.running.has(sid))
					throw new NativeSpawnError('Native session already exists', {
						code: 'session-conflict',
						effect: 'unknown',
					});
				let exit = () => {};
				const exited = new Promise<void>((resolve) => {
					exit = resolve;
				});
				const running: Running = { exited, exit, outputBytes: 0, spawning: true,
					...(options.editor ? { editorLaunch: encodeEditorLaunch(options.editor).value } : {}),
				};
				owner.running.set(sid, running);
				let pid: number | null;
				try {
					pid = await helper.spawnSession(sid, running.editorLaunch ? { ...options, editor: running.editorLaunch } : options);
					this.finishSpawn(generation, owner, sid, running);
				} catch (error) {
					this.finishSpawn(
						generation,
						owner,
						sid,
						running,
						error instanceof NativeSpawnError && error.failure.effect === 'none',
					);
					throw error;
				}
				if (owner.released || owner.failure) {
					if (
						!running.numericExit ||
						!running.notice ||
						!terminationConfirmed(running.notice.evidence) ||
						!this.ioDrained(generation, running)
					)
						helper.end(sid, true);
					this.active(generation, owner);
				}
				return pid;
			},
			submitInput: (
				sid: number,
				data: string | Uint8Array,
				options?: NativeInputOptions,
			): NativeInputSubmission => {
				const helper = pty(sid);
				if (helper.submitInput) return helper.submitInput(sid, data, options);
				const result = { op: 0, state: 'none' as const, reason: 'unsupported' as const };
				return { op: 0, queued: Promise.resolve(result), finished: Promise.resolve(result), cancel() {} };
			},
			submitResize: (
				sid: number,
				cols: number,
				rows: number,
				options?: NativeInputOptions,
			): NativeResizeSubmission => {
				const helper = pty(sid);
				if (helper.submitResize) return helper.submitResize(sid, cols, rows, options);
				const result = { op: 0, state: 'none' as const, reason: 'unsupported' as const };
				return { op: 0, queued: Promise.resolve(result), finished: Promise.resolve(result), cancel() {} };
			},
			input: (sid, data) => pty(sid).input(sid, data),
			resize: (sid, cols, rows) => pty(sid).resize(sid, cols, rows),
			reply: (sid, data) => {
				if (owner.capability !== 'pty' || !owner.sessions.has(sid) || !generation.owners.has(owner))
					throw new NativeReplyError({ state: 'none', reason: 'closed' });
				if (owner.failure || generation.failure || !generation.helper?.alive)
					throw new NativeReplyError({ state: 'none', reason: 'closed' });
				const helper = drain(sid);
				(helper.reply ?? helper.input).call(helper, sid, data);
			},
			acknowledge: (sid, bytes) => {
				if (!Number.isSafeInteger(bytes) || bytes <= 0) return;
				drain(sid).acknowledge(sid, bytes);
				const running = owner.running.get(sid);
				if (running) {
					running.outputBytes = Math.max(0, running.outputBytes - bytes);
					this.finishDrain(generation, owner, sid, running);
				}
			},
			end: (sid, force) => {
				const helper = pty(sid),
					running = owner.running.get(sid);
				if (running) running.stopAt ??= performance.now();
				helper.end(sid, force);
			},
			history: (op, payload, signal) => request('history', op, payload, signal),
			request,
		};
	}

	private release(generation: Generation, owner: Owner): Promise<void> {
		if (owner.releasing) return owner.releasing;
		owner.released = true;
		owner.abort.abort(new Error('The native capability lease is closed'));
		const control = generation.control?.owner === owner ? generation.control : undefined;
		const controlClosing = control ? this.closeControl(generation, control) : undefined;
		const helper = generation.helper;
		if (helper?.alive)
			for (const [sid, running] of owner.running) {
				if (running.editorLaunch) void (running.editor ?? helper.editorBinding?.(sid))?.close().catch(() => undefined);
				if (running.failedNone || (running.notice && terminationConfirmed(running.notice.evidence))) continue;
				running.stopAt ??= performance.now();
				try {
					if (helper.terminalTermination === 1 && helper.requestStop)
						helper.requestStop(sid, { requestId: `release-${sid}`, force: true });
					else helper.end(sid, true);
				} catch (error) {
					running.stopError = error;
					running.exit();
				}
			}
		owner.releasing = Promise.resolve().then(async () => {
			let timer: ReturnType<typeof scheduleNativeTimeout> | undefined;
			let timedOut = false;
			let failure: { error: unknown } | undefined;
			try {
				await controlClosing;
				let remaining = 0;
				for (const running of owner.running.values())
					remaining = Math.max(
						remaining,
						NATIVE_TERMINATION_OBSERVE_MS - (performance.now() - (running.stopAt ?? performance.now())),
					);
				if (!owner.failure && owner.running.size)
					await Promise.race([
						Promise.all([...owner.running.values()].map((running) => running.exited)),
						new Promise<void>((resolve) => {
							timer = scheduleNativeTimeout(() => {
								timedOut = true;
								resolve();
							}, remaining);
						}),
					]);
				const outcomes = [...owner.running].flatMap(([sid, running]) =>
					running.numericExit &&
					running.notice &&
					terminationConfirmed(running.notice.evidence) &&
					this.ioDrained(generation, running)
						? []
						: [
								{
									sid,
									notice: running.notice,
									reason: owner.failure
										? ('disconnected' as const)
										: timedOut
											? ('timeout' as const)
											: ('cleanup-incomplete' as const),
								},
							],
				);
				if (outcomes.length) {
					const error = new NativeReleaseError(outcomes);
					error.cause = [...owner.running.values()].find((running) => running.stopError)?.stopError;
					throw error;
				}
			} catch (error) {
				failure = { error };
			} finally {
				if (timer !== undefined) cancelNativeTimeout(timer);
				owner.releaseObserved = true;
				this.retire(generation, owner);
			}
			if ([...generation.owners].every((candidate) => candidate.released && candidate.releaseObserved)) {
				try { await this.shutdown(generation); }
				catch (cleanup) {
					if (failure && !containsError(failure.error, cleanup))
						throw new AggregateError([failure.error, cleanup], 'Native release and helper shutdown failed', { cause: failure.error });
					throw failure?.error ?? cleanup;
				}
			}
			if (failure) throw failure.error;
		});
		return owner.releasing;
	}

	private ioDrained(generation: Generation, running: Running): boolean {
		return (
			(generation.helper?.inputAdmission !== 1 || running.outputBytes === 0) &&
			(generation.helper?.replySettlement !== 1 || running.replySettled === true)
		);
	}
	private finishSpawn(generation: Generation, owner: Owner, sid: number, running: Running, failedNone = false): void {
		running.spawning = false;
		if (failedNone) running.failedNone = true;
		// Only a typed no-spawn result can validate settlement that preceded numeric exit.
		// Successful or uncertain adoption must preserve a final fence actually received after exit.
		const settled = running.spawnSettled === 'after-exit' || (failedNone && running.spawnSettled === 'before-exit');
		running.spawnSettled = undefined;
		if (settled) {
			running.replySettled = true;
			this.notify(() => owner.events.replySettled?.(sid));
		}
		this.finishDrain(generation, owner, sid, running);
	}
	private finishDrain(generation: Generation, owner: Owner, sid: number, running: Running): void {
		if (running.failedNone && this.ioDrained(generation, running)) {
			running.exit();
			owner.running.delete(sid);
			owner.sessions.delete(sid);
		} else if (
			running.numericExit &&
			running.notice &&
			running.notice.evidence.cleanup.state !== 'pending' &&
			this.ioDrained(generation, running)
		)
			running.exit();
		this.retire(generation, owner);
	}

	/** Failed observation does not relinquish a live captured scope or its late drain routes. */
	private retire(generation: Generation, owner: Owner): void {
		if (generation.helper?.replySettlement === 1) {
			for (const [sid, running] of owner.running) {
				if (
					running.numericExit &&
					running.notice &&
					terminationConfirmed(running.notice.evidence) &&
					this.ioDrained(generation, running)
				) {
					running.exit();
					owner.running.delete(sid);
					owner.sessions.delete(sid);
				}
			}
		}
		if (!owner.released) return;
		if (generation.control?.owner === owner && generation.control.phase !== 'closed') return;
		if (
			(owner.failure && !generation.helper?.alive) ||
			[...owner.running.values()].every(
				(running) =>
					running.numericExit &&
					running.notice &&
					terminationConfirmed(running.notice.evidence) &&
					this.ioDrained(generation, running),
			)
		)
			generation.owners.delete(owner);
	}

	private shutdown(generation: Generation): Promise<void> {
		generation.closing ??= Promise.resolve().then(async () => {
			let startupError: unknown;
			try {
				await generation.starting;
			} catch (error) {
				startupError = error;
			}
			const retire = () => {
				generation.owners.clear();
				if (this.current === generation) this.current = undefined;
			};
			try {
				if (generation.helper) await generation.helper.dispose();
				else if (shutdownErrors(startupError).some(error => error.outcome.state === 'unconfirmed')) throw startupError;
			} catch (error) {
				const failures = shutdownErrors(error);
				if (failures.length && failures.every(value => value.outcome.state !== 'unconfirmed')) retire();
				else if (failures.length) void Promise.all(failures.map(value => value.termination)).then(outcomes => {
					if (outcomes.every(value => value.state !== 'unconfirmed')) retire();
				});
				throw error;
			}
			retire();
		});
		if (this.current === generation) this.lastClosing = generation.closing;
		return generation.closing;
	}

	dispose(): Promise<void> {
		if (this.stopping) return this.stopping;
		this.stopped = true;
		const generation = this.current;
		if (!generation) return this.stopping = this.lastClosing ?? Promise.resolve();
		let resolve!: () => void, reject!: (error: unknown) => void;
		this.stopping = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
		this.failed(generation, new Error('The native host is closed'));
		void (async () => {
			const outcomes = await Promise.allSettled([...generation.owners].map(owner => this.release(generation, owner)));
			const errors = outcomes.flatMap(value => value.status === 'rejected' ? [value.reason as unknown] : []);
			try { await this.shutdown(generation); }
			catch (error) { if (!errors.some(value => containsError(value, error))) errors.push(error); }
			if (errors.length === 1) throw errors[0];
			if (errors.length) throw new AggregateError(errors, 'Native host cleanup failed');
		})().then(resolve, reject);
		return this.stopping;
	}
}
