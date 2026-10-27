import type { BotMethodMap, HostCheckWriteRequest, HostInvoke, HostLease, HostPrepareWriteRequest, HostReceiptQuery } from '../../api';
import { BotRpcError, type ProtocolTimers } from '../../core/protocol/connection';
import { methodValidation } from '../../core/protocol/method-validation';
import type { NoteEffects } from '../../platform/obsidian/note-effects/port';
import { noteFault, record, utf8 } from '../../platform/obsidian/note-effects/primitives';

type WriteMethod = 'host.prepareWrite' | 'host.checkWrite' | 'host.invoke' | 'host.queryReceipt';
const MAX_OPERATIONS = 8;
const MAX_REQUEST_BYTES = 2_097_152;
interface WriteQuota { active: number; bytes: number }
const quotaKey = Symbol.for('huhu.huhubot.note-effects.quota.v1');
function sharedQuota(owner: object): WriteQuota {
	const existing: unknown = Reflect.get(owner, quotaKey);
	if (existing !== undefined) {
		if (!record(existing) || !Number.isInteger(existing.active) || !Number.isInteger(existing.bytes) || Number(existing.active) < 0 || Number(existing.bytes) < 0)
			throw noteFault('HOST_OFFLINE', 'HOST_UNAVAILABLE');
		return existing as unknown as WriteQuota;
	}
	const quota: WriteQuota = { active: 0, bytes: 0 };
	Object.defineProperty(owner, quotaKey, { value: quota }); return quota;
}
const SAFE_REASONS = new Set(['NOTE_TARGET_INVALID', 'NOTE_BINDING_MISMATCH', 'NOTE_PROFILE_MISMATCH', 'NOTE_RECEIPT_INVALID', 'EFFECT_FINGERPRINT_MISMATCH',
	'SOURCE_CHANGED', 'NOTE_TARGET_EXISTS', 'UNSAVED_EDITOR_CHANGES', 'HOST_REQUEST_ABORTED', 'HOST_LEASE_MISMATCH', 'HOST_OFFLINE', 'NOTE_TASK_LIMIT', 'NOTE_SIZE_LIMIT', 'RECEIPT_WRITE_FAILED']);

/** A single trusted Host. A canceled Vault operation retains its quota until the real promise settles. */
export class HostWriteService {
	private lease?: HostLease;
	private readonly quota: WriteQuota;
	private disposed = false;
	private readonly operations = new Map<AbortController, Promise<unknown>>();
	constructor(private readonly effects: NoteEffects, private readonly timers: ProtocolTimers, quotaOwner: object = effects) { this.quota = sharedQuota(quotaOwner); }
	readonly setLease = (lease: HostLease | undefined): void => {
		for (const controller of this.operations.keys()) controller.abort();
		this.lease = undefined;
		if (this.disposed && lease) throw noteFault('HOST_OFFLINE', 'HOST_UNAVAILABLE');
		this.effects.setLease(lease);
		this.lease = lease ? structuredClone(lease) : undefined;
	};
	private check(request: BotMethodMap[WriteMethod]['params']): HostLease {
		const lease = this.lease, expiry = lease ? Date.parse(lease.expiresAt) : NaN;
		if (this.disposed || !lease || !Number.isFinite(expiry) || expiry <= Date.now() || request.workspaceId !== lease.workspaceId ||
			request.leaseId !== lease.leaseId || request.hostConnectionId !== lease.hostConnectionId || request.leaseEpoch !== lease.leaseEpoch || !lease.capabilities.includes('note.write'))
			throw noteFault('HOST_LEASE_MISMATCH', 'HOST_UNAVAILABLE');
		return lease;
	}
	private async execute<M extends WriteMethod>(method: M, request: BotMethodMap[M]['params'], signal: AbortSignal,
		run: (active: AbortSignal) => Promise<BotMethodMap[M]['result']>): Promise<BotMethodMap[M]['result']> {
		if (!methodValidation.validate(method, 'params', request)) throw noteFault('NOTE_BINDING_MISMATCH');
		const input: BotMethodMap[WriteMethod]['params'] = request;
		if ('preview' in input && !input.preview.binding) throw noteFault('NOTE_BINDING_MISMATCH');
		const lease = this.check(request);
		if (signal.aborted) throw noteFault('HOST_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
		const bytes = utf8.encode(JSON.stringify(request)).length;
		if (this.quota.active >= MAX_OPERATIONS || bytes + this.quota.bytes > MAX_REQUEST_BYTES) throw noteFault('NOTE_TASK_LIMIT', 'RESOURCE_LIMIT');
		const controller = new AbortController(); this.quota.bytes += bytes; this.quota.active++;
		const abort = () => controller.abort(); signal.addEventListener('abort', abort, { once: true });
		const cancel = this.timers.after(30_000, abort);
		// The connection owns the bounded logical reply. Do not race/forget the actual Vault promise here.
		const operation = Promise.resolve().then(() => {
			if (controller.signal.aborted) throw noteFault('HOST_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
			return run(controller.signal);
		});
		this.operations.set(controller, operation);
		try {
			const result = await operation;
			if (controller.signal.aborted) throw noteFault('HOST_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
			if (this.lease !== lease) throw noteFault('HOST_LEASE_MISMATCH', 'HOST_UNAVAILABLE');
			this.check(request);
			if (!methodValidation.validate(method, 'result', result)) throw noteFault('NOTE_BINDING_MISMATCH');
			if ('effectId' in input && (!('effectId' in result) || result.effectId !== input.effectId || !('fingerprint' in result) || result.fingerprint !== input.fingerprint))
				throw noteFault('EFFECT_FINGERPRINT_MISMATCH');
			return result;
		} catch (error) {
			if (error instanceof BotRpcError && SAFE_REASONS.has(error.data.reason)) throw error;
			throw noteFault('HOST_OFFLINE', 'HOST_UNAVAILABLE');
		} finally {
			cancel(); signal.removeEventListener('abort', abort);
			this.operations.delete(controller); this.quota.bytes -= bytes; this.quota.active--;
		}
	}
	readonly prepareWrite = (request: HostPrepareWriteRequest, signal: AbortSignal) => this.execute('host.prepareWrite', request, signal, active => this.effects.prepareWrite(request, active));
	readonly checkWrite = (request: HostCheckWriteRequest, signal: AbortSignal) => this.execute('host.checkWrite', request, signal, active => this.effects.checkWrite(request, active));
	readonly invoke = (request: HostInvoke, signal: AbortSignal) => this.execute('host.invoke', request, signal, active => this.effects.invoke(request, active));
	readonly queryReceipt = (request: HostReceiptQuery, signal: AbortSignal) => this.execute('host.queryReceipt', request, signal, active => this.effects.queryReceipt(request, active));
	async drained(): Promise<void> { await Promise.allSettled(this.operations.values()); }
	dispose(): void {
		if (this.disposed) return;
		this.setLease(undefined); this.disposed = true; this.effects.dispose();
	}
}
