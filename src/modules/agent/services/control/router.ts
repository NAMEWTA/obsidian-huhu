import { t } from '../../../../shared/i18n';
import {
	CONTROL_ERROR_EXITS,
	ControlProtocolError,
	controlJsonBytes,
	type ControlRequest,
	type ControlResponse,
	type ControlTarget,
	type ControlErrorCode,
	type ControlProgress,
	type ControlInputReceipt,
	type ControlJson,
} from '../../../../shared/native/control-wire';
import {
	NativeControlError,
	type NativeControlCall,
	type NativeControlRegistration,
} from '../../../../shared/native/host';
import { captureControlExecutionContext, observeControlPreparation } from './terminal-coordination';
import { CoordinationError } from '../../core/control/terminal-coordination';
import type { ActivityWaitBaseline } from '../../core/control/terminal-coordination';
import type { ControlExecutionContext } from '../../core/control/context';
import type { ControlScope } from '../../core/control/context';
import { SpaceError } from '../../core/space/errors';
import { ManagedLaunchError } from '../launch/managed-errors';
import { paneControlError, type ControlCommands, type PreparedControlCommand } from './commands';
import { PaneCommandError } from '../workspace-service-panes';

export type ControlCommandPort = Pick<ControlCommands, 'spaces' | 'capture' | 'close'>;

/** Each call is owned by B's private handle; this class only delegates existing business operations. */
export class ControlRouter {
	private closed = false;
	private readonly pending = new Set<Promise<void>>();
	private readonly captures = new Set<() => void>();
	private latestError?: Error;
	constructor(private readonly commands: ControlCommandPort) {}
	get observationError(): Error | undefined {
		return this.latestError;
	}
	/** Captures in the ACK/forward stack even if the registration Promise has not returned yet. */
	capture(
		call: NativeControlCall,
		scope: Readonly<ControlScope>,
	): { execute(registration: NativeControlRegistration): void; dispose(): void } {
		let execution: Readonly<ControlExecutionContext> | undefined;
		let prepared: PreparedControlCommand | undefined,
			failure: Error | undefined,
			handed = false;
		try {
			execution = captureControlExecutionContext(call.signal, call.wire.request.timeoutMs);
			prepared = this.commands.capture(call.wire.request, execution);
		} catch (error) {
			failure = error instanceof Error ? error : new Error(t('agent.control.unavailable'), { cause: error });
		}
		const release = () => {
			this.captures.delete(release);
			prepared?.dispose();
		};
		this.captures.add(release);
		return {
			execute: (registration) => {
				if (handed) return;
				handed = true;
				const task = this.execute(call, registration, scope, prepared, failure, execution);
				this.pending.add(task);
				void task.then(
					() => {
						this.pending.delete(task);
						release();
					},
					(error: unknown) => {
						this.pending.delete(task);
						release();
						this.remember(error);
					},
				);
			},
			dispose: () => {
				if (handed) return;
				handed = true;
				release();
			},
		};
	}
	/** Local tools share exactly the captured business adapter; no broker or alternate runtime manager. */
	async invokeLocal(
		request: Readonly<ControlRequest>,
		scope: Readonly<ControlScope>,
		context: Readonly<ControlExecutionContext>,
		after?: Readonly<ActivityWaitBaseline>,
		progress: (value: ControlProgress) => void = () => {},
	) {
		const prepared = this.commands.capture(request, context, after);
		try {
			if (this.closed) throw new NativeControlError('MODULE_INACTIVE', t('agent.managed.moduleInactive'));
			await observeControlPreparation(context, () => this.commands.spaces.assertControlScope(scope));
			await observeControlPreparation(context, () => prepared.preflight(scope));
			if (context.signal.aborted)
				throw new NativeControlError('WAIT_CANCELLED', t('agent.coordination.observationCancelled'));
			if (performance.now() >= context.deadline)
				throw new NativeControlError('WAIT_TIMEOUT', t('agent.coordination.observationTimeout'));
			return { ...(await prepared.run(progress)), target: prepared.target };
		} finally {
			prepared.dispose();
		}
	}

	forward(call: NativeControlCall, registration: NativeControlRegistration, scope: Readonly<ControlScope>): void {
		this.capture(call, scope).execute(registration);
	}

	private async execute(
		call: NativeControlCall,
		registration: NativeControlRegistration,
		scope: Readonly<ControlScope>,
		prepared?: PreparedControlCommand,
		initialFailure?: Error,
		context?: Readonly<ControlExecutionContext>,
	): Promise<void> {
		const request = call.wire.request;
		let target: Readonly<ControlTarget> = prepared?.target ?? request.target ?? {},
			admitted = false;
		let effect: 'none' | 'partial' | 'completed' | 'unknown' = 'none';
		let response: ControlResponse;
		let phase: ControlProgress['phase'] = 'validated';
		let confirmed: { target: Readonly<ControlTarget>; data: ControlJson; receipt: ControlInputReceipt } | undefined;
		const inputKind =
			request.operation === 'agent.prompt'
				? 'adapter-applied'
				: ['terminal.send-text', 'terminal.send-keys'].includes(request.operation)
					? 'pty-written'
					: undefined;
		let correlationLost = false;
		const preserve = (value?: ControlJson): ControlJson | undefined => {
			if (!confirmed) return value;
			const next = inputReceipt(value);
			if (!next || next.kind !== confirmed.receipt.kind || next.op !== confirmed.receipt.op)
				return confirmed.data;
			return { ...(value as Record<string, ControlJson>), receipt: confirmed.receipt as unknown as ControlJson };
		};
		const cancelObservation = () => prepared?.dispose();
		call.signal.addEventListener('abort', cancelObservation, { once: true });
		if (call.signal.aborted) cancelObservation();
		try {
			if (initialFailure) throw initialFailure;
			if (this.closed) throw new NativeControlError('MODULE_INACTIVE', t('agent.managed.moduleInactive'));
			await observeControlPreparation(context!, () => this.commands.spaces.assertControlScope(scope));
			await observeControlPreparation(context!, () => prepared!.preflight(scope));
			target = prepared!.target;
			if (this.closed || call.signal.aborted)
				throw new NativeControlError('WAIT_CANCELLED', t('agent.coordination.observationCancelled'));
			if (!registration.admit(call))
				throw new NativeControlError('WAIT_CANCELLED', t('agent.coordination.observationCancelled'));
			admitted = true;
			phase = 'admitted';
			let result = await prepared!.run((progress) => {
				const candidate = inputReceipt(progress.data);
				if (!confirmed && inputKind && progress.effect === 'completed') {
					if (
						progress.phase !== 'input-submitted' ||
						!progress.target ||
						!sameTarget(progress.target, target) ||
						candidate?.kind !== inputKind
					) {
						correlationLost = true;
						return;
					}
					confirmed = { target: Object.freeze({ ...target }), data: progress.data!, receipt: candidate };
				}
				if (
					confirmed &&
					((progress.target && !sameTarget(progress.target, confirmed.target)) ||
						(candidate &&
							JSON.stringify(inputReceipt(progress.data)) !== JSON.stringify(confirmed.receipt)))
				)
					correlationLost = true;
				if (confirmed)
					progress = {
						...progress,
						target: confirmed.target,
						effect: 'completed',
						data: preserve(progress.data),
					};
				phase = progress.phase;
				if (progress.target) target = Object.freeze({ ...progress.target });
				if (progress.effect !== 'none') effect = progress.effect;
				try {
					registration.progress(call, progress);
				} catch (error) {
					this.remember(error);
				}
			});
			if (request.operation.startsWith('pane.')) target = prepared!.target;
			if (!confirmed && inputKind && result.effect === 'completed') {
				const receipt = inputReceipt(result.data);
				if (receipt?.kind !== inputKind)
					throw new NativeControlError('EFFECT_UNKNOWN', t('agent.managed.effectUnknown'), 'unknown');
				confirmed = { target: Object.freeze({ ...target }), data: result.data!, receipt };
			}
			if (
				confirmed &&
				result.data &&
				inputReceipt(result.data) &&
				JSON.stringify(inputReceipt(result.data)) !== JSON.stringify(confirmed.receipt)
			)
				correlationLost = true;
			if (confirmed && correlationLost)
				result = {
					phase: 'input-submitted',
					effect: 'completed',
					data: confirmed.data,
					error: { code: 'SOURCE_UNAVAILABLE', message: t('agent.control.failed') },
				};
			if (confirmed)
				result = {
					...result,
					effect: 'completed',
					data: preserve(result.data),
					...(result.error?.code === 'EFFECT_UNKNOWN'
						? { error: { ...result.error, code: 'SOURCE_UNAVAILABLE' } }
						: {}),
				};
			phase = result.phase;
			effect = result.effect;
			if (result.error)
				response = {
					...this.failure(
						request,
						target,
						result.error.code,
						result.error.message,
						result.effect,
						result.phase,
					),
					...(result.data === undefined ? {} : { data: result.data }),
				};
			else {
				if (result.effect === 'unknown')
					throw new NativeControlError('EFFECT_UNKNOWN', t('agent.managed.effectUnknown'), 'unknown');
				response = {
					protocolVersion: 1,
					requestId: request.requestId,
					operation: request.operation,
					ok: true,
					target,
					phase: result.phase,
					effect: result.effect,
					...(result.data === undefined ? {} : { data: result.data }),
				};
			}
			controlJsonBytes(response);
		} catch (cause) {
			let code: ControlErrorCode = admitted && prepared?.mutation ? 'EFFECT_UNKNOWN' : 'CONNECTION_UNAVAILABLE',
				message = t('agent.control.failed');
			if (cause instanceof ManagedLaunchError) {
				code = cause.code;
				effect = admitted && prepared?.mutation ? cause.effect : 'none';
				message = t(cause.failure.messageKey);
				const controlCode = cause.failure.details.controlCode;
				if (typeof controlCode === 'string' && Object.hasOwn(CONTROL_ERROR_EXITS, controlCode))
					code = controlCode as ControlErrorCode;
			} else if (cause instanceof NativeControlError) {
				code = cause.code;
				if (cause.effect === 'unknown') effect = 'unknown';
			} else if (cause instanceof CoordinationError) {
				code = cause.code;
			} else if (cause instanceof PaneCommandError) {
				const mapped = paneControlError(cause);
				code = mapped.code;
				message = mapped.message;
			} else if (cause instanceof ControlProtocolError) {
				code = cause.code;
				// The localized, caller-chosen text reaches the receipt; only capacity keeps its fixed message.
				message = code === 'CAPACITY_EXCEEDED' ? t('agent.control.capacity') : cause.message || message;
			} else if (cause instanceof SpaceError) {
				code = cause.code;
				if (code === 'PERSISTENCE_FAILED' && admitted) effect = 'unknown';
			} else effect = admitted && prepared?.mutation ? 'unknown' : effect;
			if (!(code in CONTROL_ERROR_EXITS)) code = 'EFFECT_UNKNOWN';
			if (code === 'EFFECT_UNKNOWN') effect = 'unknown';
			if (confirmed) {
				target = confirmed.target;
				effect = 'completed';
				phase = 'input-submitted';
				if (code === 'EFFECT_UNKNOWN') code = 'SOURCE_UNAVAILABLE';
			}
			response = this.failure(
				request,
				target,
				code,
				message,
				effect,
				code === 'WAIT_CANCELLED' && effect === 'none' ? 'cancelled' : phase,
			);
			if (confirmed) response = { ...response, data: confirmed.data };
		} finally {
			call.signal.removeEventListener('abort', cancelObservation);
			prepared?.dispose();
		}
		try {
			await registration.result(call, response);
		} catch (error) {
			this.remember(error);
		}
	}
	private failure(
		request: ControlRequest,
		target: Readonly<ControlTarget>,
		code: ControlErrorCode,
		message: string,
		effect: 'none' | 'partial' | 'completed' | 'unknown',
		phase: ControlProgress['phase'],
	): ControlResponse {
		const base = {
			protocolVersion: 1 as const,
			requestId: request.requestId,
			operation: request.operation,
			ok: false as const,
			phase,
			effect,
			target,
		};
		const value =
			code === 'EFFECT_UNKNOWN'
				? { ...base, effect: 'unknown' as const, error: { code, message } }
				: { ...base, error: { code, message } };
		try {
			controlJsonBytes(value);
			return value;
		} catch {
			// Never truncate JSON or user identity. A minimal correlated capacity error is still a whole DTO.
			return {
				protocolVersion: 1,
				requestId: request.requestId,
				operation: request.operation,
				ok: false,
				phase,
				effect,
				error: { code: 'CAPACITY_EXCEEDED', message: t('agent.control.capacity') },
			};
		}
	}
	private remember(error: unknown): void {
		this.latestError = new Error(error instanceof Error ? error.message.slice(0, 200) : t('agent.control.failed'));
	}
	close(): Promise<void> {
		this.closed = true;
		for (const release of [...this.captures]) release();
		return Promise.all([...this.pending]).then(() => this.commands.close());
	}
}

function sameTarget(a: Readonly<ControlTarget>, b: Readonly<ControlTarget>): boolean {
	return (['vaultId', 'instanceId', 'spaceId', 'sessionId', 'runtimeId', 'paneId'] as const).every(
		(key) => a[key] === b[key],
	);
}

function inputReceipt(value?: ControlJson): ControlInputReceipt | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value) || !('receipt' in value)) return;
	const receipt = value.receipt;
	if (
		!receipt ||
		typeof receipt !== 'object' ||
		Array.isArray(receipt) ||
		!('kind' in receipt) ||
		!('op' in receipt) ||
		!['adapter-applied', 'pty-written'].includes(receipt.kind as string) ||
		typeof receipt.op !== 'number' ||
		!Number.isInteger(receipt.op) ||
		receipt.op <= 0 ||
		receipt.op > 4294967295
	)
		return;
	return { kind: receipt.kind as ControlInputReceipt['kind'], op: receipt.op };
}
