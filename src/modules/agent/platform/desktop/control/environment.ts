import { t } from '../../../../../shared/i18n';
import type { ControlScope } from '../../../core/control/context';
import type { ManagedRuntimeRef } from '../../../core/workspace/managed-runtime';
import {
	NativeControlError,
	type NativeControlCall,
	type NativeControlRegistration,
	type NativeHostAccess,
	type NativeLease,
} from '../../../../../shared/native/host';
import { CONTROL_ENV, CONTROL_LIMITS, type ControlScope as WireScope } from '../../../../../shared/native/control-wire';

function attempt(work: () => void | Promise<unknown>): Promise<unknown> {
	try {
		return Promise.resolve(work());
	} catch (error) {
		return Promise.reject(
			error instanceof Error ? error : new Error(t('agent.control.unavailable'), { cause: error }),
		);
	}
}

export interface ControlEnvironmentOptions {
	native: NativeHostAccess;
	scope(): Promise<Readonly<ControlScope>>;
	capture(
		call: NativeControlCall,
		scope: Readonly<ControlScope>,
	): { execute(registration: NativeControlRegistration): void; dispose(): void };
	closed(): void;
}
export interface RoutedEnvironment {
	readonly env: Readonly<Record<string, string>>;
	assertCurrent(): void;
}

/** The one boundary between business scope and generated transport scope. */
export function controlWireScope(scope: Readonly<ControlScope>): Readonly<WireScope> {
	return Object.freeze({
		vaultId: scope.vaultId,
		deviceId: scope.deviceId,
		instanceId: scope.instanceId,
		rootPath: scope.rootPath,
		root: Object.freeze({ ...scope.physicalRoot }),
	});
}

/** Owns only a registration/lease; all business use cases remain in the service router. */
export class ControlEnvironment {
	private active?: { lease: NativeLease; registration: NativeControlRegistration; scope: Readonly<ControlScope> };
	private preparing?: Promise<NonNullable<ControlEnvironment['active']>>;
	private closing?: Promise<void>;
	private stopped = false;
	private cleanupFailure?: AggregateError;
	constructor(private readonly options: ControlEnvironmentOptions) {}

	private ensure(pty?: NativeLease): Promise<NonNullable<ControlEnvironment['active']>> {
		if (this.stopped || this.closing)
			return Promise.reject(new NativeControlError('MODULE_INACTIVE', t('agent.control.unavailable')));
		if (this.active) return Promise.resolve(this.active);
		return (this.preparing ??= this.register(pty).catch((error: unknown) => {
			this.preparing = undefined;
			throw error;
		}));
	}
	private async register(pty?: NativeLease): Promise<NonNullable<ControlEnvironment['active']>> {
		const scope = await this.options.scope();
		if (this.stopped) throw new NativeControlError('MODULE_INACTIVE', t('agent.control.unavailable'));
		if (pty && !pty.acquireControl)
			throw new NativeControlError('CAPABILITY_UNAVAILABLE', t('agent.control.unavailable'));
		const lease = pty ? await pty.acquireControl!() : await this.options.native.acquire('control');
		let registration: NativeControlRegistration | undefined;
		const waiting: ReturnType<ControlEnvironmentOptions['capture']>[] = [];
		try {
			if (this.stopped) throw new NativeControlError('MODULE_INACTIVE', t('agent.control.unavailable'));
			if (!lease.registerControl)
				throw new NativeControlError('CAPABILITY_UNAVAILABLE', t('agent.control.unavailable'));
			registration = await lease.registerControl(controlWireScope(scope), {
				forward: (call) => {
					const capture = this.options.capture(call, scope);
					if (registration) capture.execute(registration);
					else if (waiting.length < CONTROL_LIMITS.pending) waiting.push(capture);
					else {
						capture.dispose();
						throw new NativeControlError('CAPACITY_EXCEEDED', t('agent.control.capacity'));
					}
				},
				closed: () => {
					this.stopped = true;
					this.options.closed();
				},
			});
			if (this.stopped) throw new NativeControlError('MODULE_INACTIVE', t('agent.control.unavailable'));
			const active = { lease, registration, scope };
			this.active = active;
			for (const capture of waiting.splice(0)) capture.execute(registration);
			return active;
		} catch (cause) {
			for (const capture of waiting.splice(0)) capture.dispose();
			const cleanup = await Promise.allSettled([
				attempt(() => registration?.close()),
				attempt(() => lease.release()),
			]);
			const errors = cleanup.flatMap((item) => (item.status === 'rejected' ? [item.reason as unknown] : []));
			if (errors.length) {
				this.stopped = true;
				this.cleanupFailure = new AggregateError([cause, ...errors], t('agent.managed.shutdownIncomplete'));
				throw this.cleanupFailure;
			}
			throw cause;
		}
	}
	/** Explicit workbench use only; activation and settings preparation must not call this. */
	async prepare(): Promise<void> {
		await this.ensure();
	}
	async routeEnvironment(ref: ManagedRuntimeRef, pty: NativeLease): Promise<RoutedEnvironment> {
		const captured = Object.freeze({ ...ref }),
			active = await this.ensure(pty);
		const assertCurrent = () => {
			if (this.stopped || this.active !== active || !active.registration.current(pty))
				throw new NativeControlError('CONNECTION_UNAVAILABLE', t('agent.control.unavailable'));
		};
		assertCurrent();
		return Object.freeze({
			env: Object.freeze({
				[CONTROL_ENV.instance]: active.scope.instanceId,
				[CONTROL_ENV.vault]: active.scope.vaultId,
				[CONTROL_ENV.space]: captured.spaceId,
				[CONTROL_ENV.session]: captured.sessionId,
				[CONTROL_ENV.runtime]: captured.runtimeId,
				[CONTROL_ENV.locator]: active.registration.route.locator,
			}),
			assertCurrent,
		});
	}
	close(): Promise<void> {
		if (this.closing) return this.closing;
		this.stopped = true;
		// close() must revoke admission before this method returns, even while lease release waits.
		const active = this.active;
		const unregister = active ? attempt(() => active.registration.close()) : undefined;
		this.closing = (async () => {
			const pending = this.preparing ? await this.preparing.catch(() => undefined) : undefined;
			const current = active ?? pending;
			const results = await Promise.allSettled([
				unregister ?? attempt(() => current?.registration.close()),
				attempt(() => current?.lease.release()),
			]);
			const errors = results.flatMap((result) =>
				result.status === 'rejected' ? [result.reason as unknown] : [],
			);
			if (this.cleanupFailure) errors.push(this.cleanupFailure);
			if (errors.length) throw new AggregateError(errors, t('agent.managed.shutdownIncomplete'));
			this.active = undefined;
			this.preparing = undefined;
		})();
		return this.closing;
	}
}
