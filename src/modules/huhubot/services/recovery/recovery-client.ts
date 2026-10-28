import type { BotClient, BotErrorData, BotMethod, BotMethodMap, CallOptions, RecoveryStatus, RunReceipt } from '../../api';
import { BotRpcError } from '../../core/protocol/connection';
import { methodValidation } from '../../core/protocol/method-validation';
import type { EventClient } from '../events/event-client';

type ResumeCommand = BotMethodMap['runs.resume']['params'];
type SafeError = Pick<BotErrorData, 'kind' | 'reason'>;
export interface RecoveryView {
	runId: string;
	recovery?: RecoveryStatus;
	readState: 'idle' | 'reading' | 'ready' | 'paused' | 'closed';
	error?: SafeError;
	command: { state: 'idle' | 'sending' | 'accepted' | 'rejected' | 'uncertain'; params?: ResumeCommand; receipt?: RunReceipt; error?: SafeError };
}
function local(reason: string, kind: BotErrorData['kind'] = 'INVALID_ARGUMENT'): BotRpcError {
	return new BotRpcError(-32000, { kind, reason, retryable: false, correlationId: 'recovery-client' });
}
function safe(error: unknown): SafeError {
	return error instanceof BotRpcError ? { kind: error.data.kind, reason: error.data.reason } : { kind: 'HOST_UNAVAILABLE', reason: 'RECOVERY_CONNECTION_UNAVAILABLE' };
}
function immutable<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) immutable(child); Object.freeze(value); }
	return value;
}
function sameCommand(left: ResumeCommand, right: ResumeCommand): boolean {
	const key = (value: ResumeCommand) => JSON.stringify(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
	return key(left) === key(right);
}

/** One Run's explicit recovery commands. Disposing this consumer never cancels the Run or owns its process. */
export class RecoveryClient {
	private disposed = false;
	private generation = 0;
	private readSerial = 0;
	private reader?: AbortController;
	private unsubscribeClose?: () => void;
	private readonly controllers = new Set<AbortController>();
	private readonly listeners = new Set<() => void>();
	private readonly profileId: string;
	private readonly commandEpoch: string;
	private view: RecoveryView;
	private prepared?: ResumeCommand;
	private unresolved = false;
	private pending?: Promise<RunReceipt>;
	private readonly operations = new Set<Promise<unknown>>();
	constructor(private bot: BotClient | undefined, private readonly runId: string, private readonly events: Pick<EventClient, 'reanchor'>) {
		if (!bot || !runId) throw local('RECOVERY_RUN_INVALID');
		this.profileId = bot.hello.profile.profileId;
		this.commandEpoch = bot.hello.profile.commandEpoch;
		this.view = { runId, readState: 'idle', command: { state: 'idle' } }; this.bindClose();
	}
	getSnapshot(): RecoveryView { return immutable(this.view); }
	subscribe(listener: () => void): () => void {
		if (this.disposed) return () => {};
		if (this.listeners.size >= 256) throw local('RECOVERY_LISTENER_LIMIT', 'RESOURCE_LIMIT');
		this.listeners.add(listener); return () => { this.listeners.delete(listener); };
	}
	private notify(): void { for (const listener of [...this.listeners]) { try { listener(); } catch { /* One view cannot prevent request cleanup. */ } } }
	private scope(options: CallOptions = {}) {
		const controller = new AbortController(), abort = () => controller.abort();
		if (options.signal?.aborted) controller.abort(); else options.signal?.addEventListener('abort', abort, { once: true });
		this.controllers.add(controller);
		return { controller, options: { ...options, signal: controller.signal }, release: () => { this.controllers.delete(controller); options.signal?.removeEventListener('abort', abort); } };
	}
	private requireBot(method: BotMethod): BotClient {
		if (this.disposed || !this.bot || this.bot.state !== 'ready') throw local('RECOVERY_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE');
		if (this.bot.hello.profile.profileId !== this.profileId) throw local('RECOVERY_PROFILE_CHANGED', 'CAPABILITY_DENIED');
		if (this.bot.hello.profile.commandEpoch !== this.commandEpoch) throw local('RECOVERY_COMMAND_EPOCH_CHANGED', 'CAPABILITY_DENIED');
		if (!this.bot.hello.capabilities.includes(method)) throw local('RECOVERY_METHOD_UNAVAILABLE', 'CAPABILITY_DENIED');
		return this.bot;
	}
	private track<T>(operation: Promise<T>): Promise<T> {
		this.operations.add(operation); void operation.then(() => this.operations.delete(operation), () => this.operations.delete(operation)); return operation;
	}
	/** A newer inspection supersedes the old read; neither a late qualification nor local cancellation resumes work. */
	inspect(options?: CallOptions): Promise<RecoveryStatus> {
		let bot: BotClient;
		try { bot = this.requireBot('runs.recovery'); } catch (error) { return Promise.reject(error instanceof Error ? error : local('RECOVERY_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE')); }
		const serial = ++this.readSerial, generation = this.generation, scope = this.scope(options);
		this.reader?.abort(); this.reader = scope.controller;
		const belongs = () => !this.disposed && generation === this.generation && bot === this.bot && serial === this.readSerial;
		this.view = { ...this.view, readState: 'reading', recovery: undefined, error: undefined }; this.notify();
		const operation = bot.runs.recovery({ profileId: this.profileId, id: this.runId }, scope.options).then(async status => {
			if (!belongs() || scope.controller.signal.aborted) throw local('RECOVERY_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE');
			if (status.runId !== this.runId) throw local('RECOVERY_STATUS_MISMATCH', 'CONFLICT');
			this.view = { ...this.view, readState: 'ready', recovery: structuredClone(status) }; this.notify();
			if (status.state === 'blocked') await this.reanchor(belongs);
			if (!belongs() || scope.controller.signal.aborted) throw local('RECOVERY_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE');
			return status;
		}).catch(async (error: unknown) => {
			if (belongs()) {
				this.view = { ...this.view, readState: 'paused', recovery: undefined, error: safe(error) }; this.notify();
				if (error instanceof BotRpcError && (error.data.kind === 'CAPABILITY_DENIED' || error.data.kind === 'RECOVERY_BLOCKED')) await this.reanchor(belongs);
			} throw error;
		}).finally(() => { scope.release(); if (this.reader === scope.controller) this.reader = undefined; });
		return this.track(operation);
	}
	/** One explicit action captures exact server CAS/generation. A second click shares this same pending command. */
	resume(command: ResumeCommand, options?: CallOptions): Promise<RunReceipt> {
		try {
			const bot = this.requireBot('runs.resume');
			if (!methodValidation.validate('runs.resume', 'params', command)) throw local('RECOVERY_COMMAND_INVALID');
			if (command.id !== this.runId) throw local('RECOVERY_RUN_MISMATCH');
			if (command.profileId !== this.profileId) throw local('RECOVERY_PROFILE_CHANGED', 'CAPABILITY_DENIED');
			if (command.commandEpoch !== bot.hello.profile.commandEpoch) throw local('RECOVERY_COMMAND_EPOCH_CHANGED', 'CAPABILITY_DENIED');
			if (this.pending) {
				if (!this.prepared || !sameCommand(command, this.prepared)) throw local('RECOVERY_COMMAND_PENDING', 'CONFLICT');
				return this.pending;
			}
			if (this.unresolved && (!this.prepared || !sameCommand(command, this.prepared))) throw local('RECOVERY_OUTCOME_UNKNOWN', 'CONFLICT');
			if (this.prepared && sameCommand(command, this.prepared)) return this.dispatch(bot, this.prepared, options);
			const status = this.view.recovery;
			if (!status || status.state !== 'ready') throw local('RECOVERY_NOT_READY', 'RECOVERY_BLOCKED');
			if (command.expectedRevision !== status.revision || command.recoveryGeneration !== status.generation) throw local('RECOVERY_QUALIFICATION_STALE', 'CONFLICT');
			this.prepared = structuredClone(command);
			return this.dispatch(bot, this.prepared, options);
		} catch (error) { return Promise.reject(error instanceof Error ? error : local('RECOVERY_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE')); }
	}
	/** Explicit reconciliation/retry uses the original identity, CAS and generation, even after a newer qualification read. */
	retry(options?: CallOptions): Promise<RunReceipt> {
		if (this.pending) return this.pending;
		try {
			const bot = this.requireBot('runs.resume'), command = this.prepared;
			if (!command) throw local('RECOVERY_RETRY_UNAVAILABLE');
			if (command.commandEpoch !== bot.hello.profile.commandEpoch) throw local('RECOVERY_COMMAND_EPOCH_CHANGED', 'CAPABILITY_DENIED');
			return this.dispatch(bot, command, options);
		} catch (error) { return Promise.reject(error instanceof Error ? error : local('RECOVERY_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE')); }
	}
	private dispatch(bot: BotClient, command: ResumeCommand, options?: CallOptions): Promise<RunReceipt> {
		const generation = this.generation, scope = this.scope(options);
		const belongs = () => !this.disposed && generation === this.generation && bot === this.bot;
		this.view = { ...this.view, error: undefined, command: { state: 'sending', params: structuredClone(command) } }; this.notify();
		const operation = Promise.resolve().then(async () => {
			let receipt: RunReceipt;
			try {
				if (!belongs() || scope.controller.signal.aborted) throw local('RECOVERY_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE');
				receipt = await bot.runs.resume(structuredClone(command), scope.options);
			} catch (error) {
				if (belongs()) {
					this.unresolved = !(error instanceof BotRpcError);
					this.view = { ...this.view, recovery: undefined, command: { state: this.unresolved ? 'uncertain' : 'rejected', params: structuredClone(command), error: safe(error) } }; this.notify();
					if (error instanceof BotRpcError && (error.data.kind === 'CAPABILITY_DENIED' || error.data.kind === 'RECOVERY_BLOCKED')) await this.reanchor(belongs);
				} throw error;
			}
			// An RPC already settled by a receipt stays accepted if the caller aborts in the same turn.
			if (!belongs()) throw local('RECOVERY_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE');
			if (receipt.runId !== this.runId || receipt.commandId !== command.commandId) {
				const error = local('RECOVERY_RECEIPT_MISMATCH', 'CONFLICT'); this.unresolved = true;
				this.view = { ...this.view, recovery: undefined, command: { state: 'uncertain', params: structuredClone(command), error: safe(error) } }; this.notify(); throw error;
			}
			this.unresolved = false;
			this.view = { ...this.view, recovery: undefined, command: { state: 'accepted', params: structuredClone(command), receipt: structuredClone(receipt) } }; this.notify();
			// A projection failure cannot turn a durable acceptance back into an unknown business outcome.
			await this.reanchor(belongs);
			return receipt;
		}).finally(() => { scope.release(); if (this.pending === operation) this.pending = undefined; });
		this.pending = this.track(operation); return operation;
	}
	private async reanchor(belongs: () => boolean): Promise<void> {
		if (!belongs()) return;
		try { await this.events.reanchor(this.runId); }
		catch (error) { if (belongs()) { this.view = { ...this.view, error: safe(error) }; this.notify(); } }
	}
	/** Reconnecting this same controller preserves the original uncertain command. The module reconnects its shared EventClient separately. */
	setClient(bot: BotClient | undefined): void {
		if (this.disposed) return;
		this.unsubscribeClose?.(); this.unsubscribeClose = undefined;
		this.generation++; this.readSerial++;
		for (const controller of this.controllers) controller.abort(); this.reader = undefined; this.pending = undefined;
		if (this.view.command.state === 'sending') {
			this.unresolved = true;
			this.view = { ...this.view, command: { ...this.view.command, state: 'uncertain', error: { kind: 'HOST_UNAVAILABLE', reason: 'RECOVERY_CONNECTION_UNAVAILABLE' } } };
		}
		this.bot = bot; this.view = { ...this.view, recovery: undefined, readState: 'paused' }; this.bindClose(); this.notify();
	}
	private bindClose(): void {
		const bot = this.bot; if (!bot) return;
		this.unsubscribeClose = bot.onClose(() => { if (this.bot === bot) this.setClient(undefined); });
	}
	dispose(): void {
		if (this.disposed) return;
		this.setClient(undefined); this.disposed = true; this.view = { ...this.view, readState: 'closed' }; this.notify(); this.listeners.clear();
	}
	async drained(): Promise<void> { await Promise.allSettled(this.operations); }
}
