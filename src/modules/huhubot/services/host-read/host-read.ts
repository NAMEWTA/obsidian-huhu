import { isHostLeaseRenewal } from '../../core/protocol/host-lease';
import type { HostLease, HostReadRequest, HostReadResult, HostSearchRequest, HostSearchResult, SourceIdentity } from '../../api';
import { BotRpcError, type ProtocolTimers } from '../../core/protocol/connection';
import { methodValidation } from '../../core/protocol/method-validation';
import { truncateUtf8, type HostSources } from '../../platform/obsidian/sources/port';

function denied(reason: string): BotRpcError {
	return new BotRpcError(-32000, { kind: 'CAPABILITY_DENIED', reason, retryable: false, correlationId: 'host-read' });
}

/** Coordinates only the current trusted Host session; persistent Grants remain the Go boundary. */
export class HostReadService {
	private lease?: HostLease;
	private readonly operations = new Set<AbortController>();
	private active = 0;
	private disposed = false;
	constructor(private readonly sources: HostSources, private readonly timers: ProtocolTimers) {}
	readonly setLease = (lease: HostLease | undefined): void => {
		if (isHostLeaseRenewal(this.lease, lease)) {
			this.sources.setLease(lease);
			this.lease!.expiresAt = lease!.expiresAt; return;
		}
		for (const controller of this.operations) controller.abort();
		this.lease = undefined;
		if (this.disposed && lease) { this.sources.setLease(undefined); throw denied('INVALID_HOST_LEASE'); }
		this.sources.setLease(lease);
		this.lease = lease ? structuredClone(lease) : undefined;
	};
	private check(request: HostReadRequest | HostSearchRequest, capability: string): HostLease {
		const lease = this.lease, expiry = lease ? Date.parse(lease.expiresAt) : NaN;
		if (this.disposed || !lease || !Number.isFinite(expiry) || expiry <= Date.now() || request.leaseId !== lease.leaseId ||
			request.hostConnectionId !== lease.hostConnectionId || request.leaseEpoch !== lease.leaseEpoch ||
			request.workspaceId !== lease.workspaceId || !lease.capabilities.includes(capability)) throw denied('INVALID_HOST_LEASE');
		const identities: SourceIdentity[] = 'source' in request ? [request.source] : [...request.sources, ...request.scopes];
		if (identities.some((source) => source.workspaceId !== lease.workspaceId || source.hostConnectionId !== lease.hostConnectionId ||
			source.hostLeaseId !== lease.leaseId || source.hostLeaseEpoch !== lease.leaseEpoch)) throw denied('SOURCE_SCOPE_MISMATCH');
		return lease;
	}
	private async execute<T>(request: HostReadRequest | HostSearchRequest, capability: string, signal: AbortSignal,
		run: (signal: AbortSignal) => Promise<T>): Promise<T> {
		const lease = this.check(request, capability);
		if (signal.aborted) throw denied('SOURCE_REQUEST_ABORTED');
		if (this.active >= 8) throw denied('SOURCE_TASK_LIMIT');
		this.active++;
		const controller = new AbortController(); this.operations.add(controller);
		const abort = () => controller.abort(); signal.addEventListener('abort', abort, { once: true });
		const cancel = this.timers.after(3000, abort);
		let rejectAbort: (() => void) | undefined;
		const aborted = new Promise<never>((_resolve, reject) => {
			rejectAbort = () => reject(denied('SOURCE_REQUEST_ABORTED'));
			controller.signal.addEventListener('abort', rejectAbort, { once: true });
		});
		try {
			const operation = Promise.resolve().then(() => run(controller.signal)).finally(() => { this.active--; });
			const result = await Promise.race([operation, aborted]);
			if (this.lease !== lease || controller.signal.aborted) throw denied('INVALID_HOST_LEASE');
			this.check(request, capability);
			return result;
		} finally {
			cancel(); signal.removeEventListener('abort', abort);
			if (rejectAbort) controller.signal.removeEventListener('abort', rejectAbort);
			this.operations.delete(controller);
		}
	}
	readonly read = async (request: HostReadRequest, signal: AbortSignal): Promise<HostReadResult> => {
		if (!methodValidation.validate('host.read', 'params', request)) throw denied('INVALID_HOST_PARAMS');
		return this.execute(request, 'note.read', signal, async (active) => {
			const content = await this.sources.readSnapshot(request.source, active);
			const text = truncateUtf8(content.text, request.maxBytes);
			const result: HostReadResult = { source: content.source, text, format: 'text/markdown', truncated: text !== content.text };
			if (!methodValidation.validate('host.read', 'result', result)) throw denied('INVALID_HOST_RESULT');
			return result;
		});
	};
	readonly search = async (request: HostSearchRequest, signal: AbortSignal): Promise<HostSearchResult> => {
		if (!methodValidation.validate('host.search', 'params', request) || (!request.sources.length && !request.scopes.length)) throw denied('INVALID_HOST_PARAMS');
		return this.execute(request, 'note.search', signal, async (active) => {
			const result = await this.sources.searchSnapshots(request, active);
			if (!methodValidation.validate('host.search', 'result', result)) throw denied('INVALID_HOST_RESULT');
			return result;
		});
	};
	dispose(): void { this.setLease(undefined); this.disposed = true; }
}
