import { lifecycleClock } from '../terminal/clock';
import { NativeControlError } from '../../../../shared/native/host';
import { t } from '../../../../shared/i18n';
import { NamedKeyError } from '../../core/terminal/keyboard';
import { CONTROL_LIMITS } from '../../../../shared/native/control-wire';
import type { ControlExecutionContext } from '../../core/control/context';
import {
	CoordinationError,
	type ActivityWaitResult,
	type TerminalWaitOutcome,
	type TerminalWrittenInput,
} from '../../core/control/terminal-coordination';
import type { ManagedRuntimeRef } from '../../core/workspace/managed-runtime';

/** Call synchronously at the first request capture, before scope/admission awaits. */
export function captureControlExecutionContext(
	signal: AbortSignal,
	timeoutMs: number = CONTROL_LIMITS.defaultTimeoutMs,
): Readonly<ControlExecutionContext> {
	if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > CONTROL_LIMITS.maxTimeoutMs)
		throw new CoordinationError('INVALID_ARGUMENT');
	return Object.freeze({ signal, deadline: performance.now() + timeoutMs });
}

/** Ends only this logical preparation observation; the original port still owns any physical I/O. */
export function observeControlPreparation<T>(
	context: Readonly<ControlExecutionContext>,
	work: () => Promise<T>,
): Promise<T> {
	return new Promise((resolve, reject) => {
		let finished = false;
		const clock = lifecycleClock();
		let timer: unknown;
		const stop = () => {
			if (finished) return false;
			finished = true;
			clock.clearTimeout(timer);
			context.signal.removeEventListener('abort', abort);
			return true;
		};
		const fail = (code: 'WAIT_CANCELLED' | 'WAIT_TIMEOUT') => {
			if (stop())
				reject(
					new NativeControlError(
						code,
						t(
							code === 'WAIT_TIMEOUT'
								? 'agent.coordination.observationTimeout'
								: 'agent.coordination.observationCancelled',
						),
						'none',
					),
				);
		};
		const abort = () => fail('WAIT_CANCELLED');
		const remaining = context.deadline - performance.now();
		if (context.signal.aborted) {
			fail('WAIT_CANCELLED');
			return;
		}
		if (remaining <= 0) {
			fail('WAIT_TIMEOUT');
			return;
		}
		context.signal.addEventListener('abort', abort, { once: true });
		timer = clock.setTimeout(() => fail('WAIT_TIMEOUT'), remaining);
		try {
			void work().then(
				(value) => {
					if (context.signal.aborted) {
						fail('WAIT_CANCELLED');
						return;
					}
					if (performance.now() >= context.deadline) {
						fail('WAIT_TIMEOUT');
						return;
					}
					if (stop()) resolve(value);
				},
				(error) => {
					if (stop())
						reject(error instanceof Error ? error : new Error(t('agent.control.failed'), { cause: error }));
				},
			);
		} catch (error) {
			if (stop()) reject(error instanceof Error ? error : new Error(t('agent.control.failed'), { cause: error }));
		}
	});
}

/** Observation never changes the known effect of an already confirmed native input. */
export function terminalWaitOutcome(
	target: Readonly<ManagedRuntimeRef>,
	wait: Readonly<ActivityWaitResult>,
	input?: TerminalWrittenInput,
): Readonly<TerminalWaitOutcome> {
	if (
		target.runtimeId !== wait.baseline.at.runtimeId ||
		target.runtimeId !== wait.at.runtimeId ||
		(input && input.runtimeId !== target.runtimeId)
	)
		throw new CoordinationError('STALE_RUNTIME');
	const error =
		wait.status === 'matched'
			? undefined
			: wait.status === 'timeout'
				? 'WAIT_TIMEOUT'
				: wait.status === 'cancelled'
					? 'WAIT_CANCELLED'
					: 'SOURCE_UNAVAILABLE';
	return Object.freeze({
		target: Object.freeze({ ...target }),
		wait,
		phase: wait.status === 'matched' ? 'state-matched' : input ? 'input-submitted' : 'failed',
		effect: input ? 'completed' : 'none',
		...(input ? { input: Object.freeze({ ...input }) } : {}),
		...(error ? { error } : {}),
	});
}

import {
	CONTROL_WAIT_STATES,
	ControlProtocolError,
	controlJsonBytes,
	type ControlInputReceipt,
	type ControlJson,
	type ControlProgress,
	type ControlRequest,
	type ControlTarget,
	type ControlWaitState,
	type ControlErrorCode,
} from '../../../../shared/native/control-wire';
import {
	NativeEditorError,
	type NativeEditorFinishedResult,
	type NativeInputFinishedResult,
} from '../../../../shared/native/input';
import type { TerminalSession } from '../terminal/session';
import type { ActivityWaitBaseline, PreparedActivityWait } from '../../core/control/terminal-coordination';

export interface CoordinationResult {
	readonly phase: ControlProgress['phase'];
	readonly effect: ControlProgress['effect'];
	readonly data?: ControlJson;
	readonly receipt?: ControlInputReceipt;
	readonly continuation?: Readonly<ActivityWaitBaseline>;
	readonly observation?: Readonly<ActivityWaitResult>;
	readonly error?: { readonly code: ControlErrorCode; readonly message: string };
}

/** One captured business action, shared by local tools and the authenticated CLI adapter. */
export function captureTerminalCoordination(
	session: TerminalSession,
	target: Readonly<ManagedRuntimeRef>,
	request: Readonly<ControlRequest>,
	context: Readonly<ControlExecutionContext>,
	resolvedTarget: () => Readonly<ControlTarget>,
	after?: Readonly<ActivityWaitBaseline>,
) {
	if (session.id !== target.runtimeId) throw new CoordinationError('STALE_RUNTIME');
	const operation = request.operation;
	const params = request.params ?? {};
	const state = (operation === 'agent.wait' ? params.state : params.wait) as ControlWaitState | undefined;
	if (state !== undefined && !CONTROL_WAIT_STATES.includes(state))
		throw new ControlProtocolError('Invalid wait state');
	const body = operation === 'terminal.send-keys' ? params.keys : params.text;
	if (operation !== 'agent.wait' && (typeof body !== 'string' || !body))
		throw new ControlProtocolError('Missing input body');
	controlJsonBytes(request, CONTROL_LIMITS.requestBytes);
	let wait: PreparedActivityWait | undefined;
	let disposed = false;
	let receipt: ControlInputReceipt | undefined;
	let lastData: ControlJson | undefined;
	let observation: Readonly<ActivityWaitResult> | undefined;
	const data = (value: unknown): ControlJson => {
		controlJsonBytes(value);
		return value as ControlJson;
	};
	const failure = (
		code: ControlErrorCode,
		effect: ControlProgress['effect'] = receipt ? 'completed' : 'none',
		detail?: unknown,
	): CoordinationResult => ({
		phase: receipt ? 'input-submitted' : code === 'WAIT_CANCELLED' ? 'cancelled' : 'failed',
		effect,
		...(receipt ? { receipt } : {}),
		...(wait && (receipt || operation === 'agent.wait') ? { continuation: wait.baseline } : {}),
		...(observation ? { observation } : {}),
		...(lastData || detail ? { data: lastData ?? data(detail) } : {}),
		error: {
			code,
			message: t(
				code === 'WAIT_TIMEOUT'
					? 'agent.coordination.observationTimeout'
					: code === 'WAIT_CANCELLED'
						? 'agent.coordination.observationCancelled'
						: 'agent.control.failed',
			),
		},
	});
	const ensure = () => {
		if (disposed || context.signal.aborted)
			throw new ControlProtocolError('Observation cancelled', 'WAIT_CANCELLED');
		if (performance.now() >= context.deadline)
			throw new ControlProtocolError('Observation expired', 'WAIT_TIMEOUT');
	};
	function preflight() {
		ensure();
		const snapshot = session.getActivitySnapshot();
		const sample = data({
			receipt: { kind: operation === 'agent.prompt' ? 'adapter-applied' : 'pty-written', op: 4294967295 },
			initialWorking: snapshot.state === 'working',
			wait: {
				status: 'unavailable',
				condition: state ?? 'done',
				baseline: {
					at: snapshot.at,
					source: { bindingId: 'x'.repeat(128), programEpoch: 'x'.repeat(128) },
					initialState: snapshot.state,
					initialWorking: snapshot.state === 'working',
				},
				at: snapshot.at,
				state: 'unknown',
				blocking: { state: 'blocked', reason: 'permission' },
				source: { health: 'unavailable', reason: 'transport-lost' },
				observedAt: Number.MAX_SAFE_INTEGER,
				reason: 'source-changed',
			},
		});
		const progress = { target: resolvedTarget(), phase: 'input-submitted', effect: 'completed', data: sample };
		controlJsonBytes(progress, CONTROL_LIMITS.stageBytes - CONTROL_LIMITS.wrapperBytes);
		controlJsonBytes(
			{
				protocolVersion: 1,
				requestId: request.requestId,
				operation,
				ok: false,
				...progress,
				error: { code: 'SOURCE_UNAVAILABLE', message: 'x'.repeat(2048) },
			},
			CONTROL_LIMITS.responseBytes,
		);
	}
	async function run(progress: (value: ControlProgress) => void): Promise<CoordinationResult> {
		try {
			ensure();
			// Listener admission and source/N capture happen synchronously before any input effect.
			if (operation === 'agent.wait' || state)
				wait = session.captureActivityWait({
					state: state!,
					context,
					after,
					afterInput: operation !== 'agent.wait',
				});
			if (operation !== 'agent.wait') {
				const submission =
					operation === 'agent.prompt'
						? session.submitPrompt(body as string, context)
						: operation === 'terminal.send-keys'
							? session.submitKeys(body as string, { signal: context.signal })
							: session.submitPaste(body as string, { signal: context.signal });
				// A finished unknown is an observation result; only the original owner settles its slot.
				if ('settled' in submission) void submission.settled.catch(() => undefined);
				const result = await observeSubmission(submission, context);
				if (result.state !== 'adapter-applied' && result.state !== 'written') {
					const effect =
						result.state === 'partial' ? 'partial' : result.state === 'unknown' ? 'unknown' : 'none';
					const code: ControlErrorCode =
						effect === 'unknown'
							? 'EFFECT_UNKNOWN'
							: effect === 'partial'
								? 'INPUT_NOT_READY'
								: result.reason === 'cancelled'
									? 'WAIT_CANCELLED'
									: result.reason === 'expired'
										? 'WAIT_TIMEOUT'
										: result.reason === 'capacity'
											? 'CAPACITY_EXCEEDED'
											: result.reason === 'unsupported'
												? 'CAPABILITY_UNAVAILABLE'
												: result.reason === 'blocked'
													? 'AGENT_BLOCKED'
													: 'INPUT_NOT_READY';
					return failure(code, effect, { input: result });
				}
				if (
					!Number.isInteger(result.op) ||
					result.op <= 0 ||
					result.op > 4294967295 ||
					(operation === 'agent.prompt') !== (result.state === 'adapter-applied')
				)
					return failure('EFFECT_UNKNOWN', 'unknown');
				receipt = Object.freeze({
					kind: result.state === 'adapter-applied' ? 'adapter-applied' : 'pty-written',
					op: result.op,
				});
				lastData = data({
					receipt,
					...(wait ? { baseline: wait.baseline, initialWorking: wait.baseline.initialWorking } : {}),
				});
				progress({ target: resolvedTarget(), phase: 'input-submitted', effect: 'completed', data: lastData });
				wait?.activate();
				if (!wait) return { phase: 'input-submitted', effect: 'completed', data: lastData, receipt };
			}
			const result = await wait!.finished;
			observation = result;
			lastData = data({
				...(receipt ? { receipt } : {}),
				wait: result,
				baseline: result.baseline,
				initialWorking: result.baseline.initialWorking,
			});
			if (result.status === 'matched')
				return {
					phase: 'state-matched',
					effect: receipt ? 'completed' : 'none',
					data: lastData,
					receipt,
					continuation: result.baseline,
					observation: result,
				};
			return failure(
				result.status === 'timeout'
					? 'WAIT_TIMEOUT'
					: result.status === 'cancelled'
						? 'WAIT_CANCELLED'
						: 'SOURCE_UNAVAILABLE',
			);
		} catch (error) {
			if (error instanceof NamedKeyError) return failure('INVALID_ARGUMENT');
			if (error instanceof NativeEditorError)
				return failure(
					error.failure.reason === 'capacity'
						? 'CAPACITY_EXCEEDED'
						: error.failure.reason === 'invalid'
							? 'INVALID_ARGUMENT'
							: error.failure.reason === 'blocked'
								? 'AGENT_BLOCKED'
								: error.failure.reason === 'unsupported'
									? 'CAPABILITY_UNAVAILABLE'
									: error.failure.reason === 'cancelled'
										? 'WAIT_CANCELLED'
										: error.failure.reason === 'expired'
											? 'WAIT_TIMEOUT'
											: 'INPUT_NOT_READY',
				);
			if (error instanceof CoordinationError) return failure(error.code);
			if (error instanceof ControlProtocolError) return failure(error.code);
			return failure(
				receipt ? 'SOURCE_UNAVAILABLE' : operation === 'agent.wait' ? 'SOURCE_UNAVAILABLE' : 'EFFECT_UNKNOWN',
				receipt ? 'completed' : operation === 'agent.wait' ? 'none' : 'unknown',
			);
		} finally {
			wait?.dispose();
		}
	}
	return {
		preflight,
		run,
		dispose() {
			disposed = true;
			wait?.dispose();
		},
	};
}

function observeSubmission(
	submission: { readonly finished: Promise<NativeEditorFinishedResult | NativeInputFinishedResult>; cancel(): void },
	context: Readonly<ControlExecutionContext>,
): Promise<NativeEditorFinishedResult | NativeInputFinishedResult> {
	return new Promise((resolve) => {
		const clock = lifecycleClock();
		let done = false;
		const finish = (value: NativeEditorFinishedResult | NativeInputFinishedResult) => {
			if (done) return;
			done = true;
			clock.clearTimeout(timer);
			context.signal.removeEventListener('abort', abort);
			resolve(value);
		};
		const abort = () => {
			submission.cancel();
			queueMicrotask(() => finish({ op: 0, state: 'unknown', reason: 'timeout' }));
		};
		const timer = clock.setTimeout(abort, Math.max(0, context.deadline - performance.now()));
		context.signal.addEventListener('abort', abort, { once: true });
		void submission.finished.then(finish, () => finish({ op: 0, state: 'unknown', reason: 'transport-lost' }));
		if (context.signal.aborted) abort();
	});
}
