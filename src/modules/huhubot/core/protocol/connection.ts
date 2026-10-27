import type {
	BotClient,
	BotConnectionState,
	BotErrorData,
	BotHost,
	BotMethod,
	BotMethodMap,
	CallOptions,
	HelloResult,
	HostLease,
	SourceIdentity,
} from '../../api';
import {
	encodeHapFrame,
	HapDecoder,
	HapProtocolError,
	HAP_VERSION,
	type HapMessage,
	type HapRequest,
	type HapResponse,
	type JsonValue,
} from './codec';
import { methodValidation } from './method-validation';

/** The owner supplies and closes the transport. send resolves only when its bounded writer accepts the frame. */
export interface HapTransport {
	send(bytes: Uint8Array): Promise<void>;
	onData(listener: (bytes: Uint8Array) => void): () => void;
	onClose(listener: (reason: Error) => void): () => void;
	close(): void;
}
export interface ProtocolTimers {
	after(ms: number, run: () => void): () => void;
}
export interface ConnectionLimits {
	maxPending?: number;
	maxHostRequests?: number;
	requestTimeoutMs?: number;
}
interface Pending {
	method: BotMethod;
	resolve(value: unknown): void;
	reject(error: Error): void;
	cleanup(): void;
}
interface ReverseRequest { controller: AbortController; replied: boolean }
interface AbandonedRequest { method: BotMethod; cleanup(): void }
const ASSOCIATION_TTL_MS = 30_000;
const MAX_ABANDONED_REQUESTS = 32;
const MAX_SERVER_ASSOCIATIONS = 64;
export class BotRpcError extends Error {
	constructor(
		readonly code: number,
		readonly data: BotErrorData,
	) {
		super(`${data.kind}: ${data.reason}`);
		this.name = 'BotRpcError';
	}
}

function activeHostLease(lease: HostLease): boolean {
	// A schema-valid RFC3339 leap second can still produce NaN in Date.parse.
	const expiresAt = Date.parse(lease.expiresAt);
	return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function sourceOnLease(source: SourceIdentity, lease: HostLease): boolean {
	return source.workspaceId === lease.workspaceId && source.hostConnectionId === lease.hostConnectionId &&
		source.hostLeaseId === lease.leaseId && source.hostLeaseEpoch === lease.leaseEpoch;
}
function sameJson(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
	if (Array.isArray(left) !== Array.isArray(right)) return false;
	const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
	return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
}

function positiveInteger(value: number, maximum: number): number {
	if (!Number.isInteger(value) || value < 1 || value > maximum) throw new HapProtocolError('INVALID_CLIENT_LIMIT');
	return value;
}

/** A single connection; reconnecting requires a new transport and never replays pending commands. */
export class HapConnection {
	private readonly decoder = new HapDecoder();
	private readonly pending = new Map<string, Pending>();
	private readonly reverse = new Map<string, ReverseRequest>();
	private readonly abandoned = new Map<string, AbandonedRequest>();
	private readonly settledServerIds = new Map<string, () => void>();
	private readonly seenServerIds = new Set<string>();
	private readonly unsubscribe: Array<() => void> = [];
	private readonly closeListeners = new Set<() => void>();
	private readonly maxPending: number;
	private readonly maxHostRequests: number;
	private readonly requestTimeoutMs: number;
	private serial = 0;
	private host?: BotHost;
	private hostLease?: HostLease;
	private helloResult?: HelloResult;
	private connectionState: BotConnectionState = 'connecting';
	private handshakeStarted = false;

	constructor(
		private readonly transport: HapTransport,
		private readonly timers: ProtocolTimers,
		limits: ConnectionLimits = {},
	) {
		this.maxPending = positiveInteger(limits.maxPending ?? 64, 1024);
		this.maxHostRequests = positiveInteger(limits.maxHostRequests ?? 8, 64);
		this.requestTimeoutMs = positiveInteger(limits.requestTimeoutMs ?? 10_000, 300_000);
		this.unsubscribe.push(transport.onData((bytes) => this.receive(bytes)));
		this.unsubscribe.push(transport.onClose((reason) => this.finish(reason)));
	}

	get state(): BotConnectionState {
		return this.connectionState;
	}

	async connect(client: { name: string; version: string }, options?: CallOptions): Promise<BotClient> {
		if (this.handshakeStarted) throw new HapProtocolError('HELLO_ALREADY_STARTED');
		this.handshakeStarted = true;
		try {
			const result = await this.request('protocol.hello', { protocolVersion: HAP_VERSION, client }, options);
			if (this.connectionState === 'closed') throw new HapProtocolError('CONNECTION_CLOSED');
			this.helloResult = result;
			this.connectionState = 'ready';
			return this.client();
		} catch (error) {
			this.close();
			throw error;
		}
	}

	request<M extends BotMethod>(
		method: M,
		params: BotMethodMap[M]['params'],
		options: CallOptions = {},
	): Promise<BotMethodMap[M]['result']> {
		if (this.connectionState === 'closed') return Promise.reject(new HapProtocolError('CONNECTION_CLOSED'));
		if (method !== 'protocol.hello' && this.connectionState !== 'ready')
			return Promise.reject(new HapProtocolError('HELLO_REQUIRED'));
		if (this.pending.size >= this.maxPending) return Promise.reject(new HapProtocolError('PENDING_LIMIT'));
		if (options.signal?.aborted) return Promise.reject(new HapProtocolError('REQUEST_ABORTED'));
		if (!methodValidation.validate(method, 'params', params))
			return Promise.reject(new HapProtocolError('INVALID_METHOD_PARAMS'));
		let timeoutMs: number;
		try {
			timeoutMs = positiveInteger(options.timeoutMs ?? this.requestTimeoutMs, 300_000);
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error('INVALID_TIMEOUT'));
		}
		const id = `c:${++this.serial}`;
		let frame: Uint8Array;
		try {
			frame = encodeHapFrame({ jsonrpc: '2.0', id, method, params: params as unknown as HapRequest['params'] });
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error('INVALID_REQUEST'));
		}
		return new Promise<unknown>((resolve, reject) => {
			const fail = (reason: string) => {
				const pending = this.pending.get(id);
				if (!pending) return;
				this.pending.delete(id);
				pending.cleanup();
				reject(new HapProtocolError(reason));
				if (this.abandoned.size >= MAX_ABANDONED_REQUESTS) { this.finish(new HapProtocolError('RESPONSE_ASSOCIATION_LIMIT')); return; }
				const cleanup = this.timers.after(ASSOCIATION_TTL_MS, () => this.abandoned.delete(id));
				this.abandoned.set(id, { method, cleanup });
			};
			const abort = () => fail('REQUEST_ABORTED');
			const cancelTimer = this.timers.after(timeoutMs, () => fail('REQUEST_TIMEOUT'));
			this.pending.set(id, {
				method,
				resolve,
				reject,
				cleanup: () => {
					cancelTimer();
					options.signal?.removeEventListener('abort', abort);
				},
			});
			options.signal?.addEventListener('abort', abort, { once: true });
			try {
				void this.transport
					.send(frame)
					.catch((error: unknown) =>
						this.finish(error instanceof Error ? error : new Error('TRANSPORT_WRITE_FAILED')),
					);
			} catch {
				this.finish(new Error('TRANSPORT_WRITE_FAILED'));
			}
		}) as Promise<BotMethodMap[M]['result']>;
	}

	private client(): BotClient {
		const currentState = () => this.state;
		const groups: Record<string, Record<string, (params: never, options?: CallOptions) => Promise<unknown>>> = {};
		const methods = {
			service: ['health', 'status', 'diagnostics', 'shutdown'],
			agents: ['create', 'list', 'get', 'update', 'disable', 'deletePreview', 'delete'],
			models: ['list', 'test', 'bind'],
			sessions: [
				'create',
				'list',
				'get',
				'history',
				'archive',
				'updateMembers',
				'setCoordinator',
				'deletePreview',
				'delete',
			],
			runs: ['start', 'get', 'subscribe', 'cancel', 'recovery', 'resume'],
			collaboration: ['budget', 'configureBudget', 'configurationHash', 'discover', 'message', 'delegate', 'get', 'list', 'reply', 'cancel', 'proposeCreate', 'confirmProposal'],
			effects: ['get', 'reconcile'],
			grants: ['list', 'create', 'revoke'],
			approvals: ['list', 'get', 'resolve'],
			memory: ['list', 'get', 'pin', 'correct', 'forget', 'setAutoMaintenance', 'proposeGlobal', 'resolveGlobal'],
			profile: ['deletePreview', 'delete', 'status'],
			portable: ['export', 'importPreview', 'import'],
			host: ['attach', 'detach'],
		};
		for (const [group, names] of Object.entries(methods)) {
			const entries: Record<string, (params: never, options?: CallOptions) => Promise<unknown>> = {};
			for (const name of names)
				entries[name] = (params, options) => this.request(`${group}.${name}` as BotMethod, params, options);
			groups[group] = entries;
		}
		return {
			...groups,
			hello: this.helloResult,
			get state() {
				return currentState();
			},
			onClose: (listener: () => void) => {
				if (this.connectionState === 'closed') { listener(); return () => undefined; }
				if (this.closeListeners.size >= 1024) throw new HapProtocolError('CLOSE_LISTENER_LIMIT');
				this.closeListeners.add(listener);
				return () => { this.closeListeners.delete(listener); };
			},
			setHost: (host: BotHost | undefined) => {
				if (this.host === host) return;
				if (this.connectionState === 'closed' && host) throw new HapProtocolError('CONNECTION_CLOSED');
				for (const entry of this.reverse.values()) entry.controller.abort();
				try {
					this.host?.leaseChanged?.(undefined);
					this.host = host;
					host?.leaseChanged?.(this.hostLease);
				} catch { this.finish(new HapProtocolError('HOST_LIFECYCLE_FAILED')); }
			},
			close: () => this.close(),
		} as BotClient;
	}

	private receive(bytes: Uint8Array): void {
		if (this.connectionState === 'closed') return;
		try {
			for (const payload of this.decoder.push(bytes))
				for (const message of Array.isArray(payload) ? payload : [payload]) this.message(message);
		} catch (error) {
			this.finish(error instanceof Error ? error : new HapProtocolError('INVALID_FRAME'));
		}
	}

	private message(message: HapMessage): void {
		if ('method' in message) {
			if (message.method === '$/cancelRequest') {
				if (!methodValidation.validateCancelNotification(message)) throw new HapProtocolError('INVALID_CANCEL_NOTIFICATION');
				const entry = this.reverse.get(message.params.requestId);
				if (entry) entry.controller.abort();
				else if (!this.settledServerIds.has(message.params.requestId)) throw new HapProtocolError('UNKNOWN_CANCEL_ID');
				return;
			}
			if (message.id === undefined) return;
			if (!message.id.startsWith('s:')) throw new HapProtocolError('WRONG_ID_DIRECTION');
			if (this.seenServerIds.has(message.id)) throw new HapProtocolError('DUPLICATE_SERVER_ID');
			if (this.seenServerIds.size >= 4096) throw new HapProtocolError('SERVER_ID_LIMIT');
			this.seenServerIds.add(message.id);
			void this.handleHost(message).catch((error: unknown) => this.finish(error instanceof Error ? error : new HapProtocolError('HOST_REQUEST_FAILED')));
			return;
		}
		if (message.id === null) throw new HapProtocolError('PEER_PROTOCOL_ERROR');
		if (!message.id.startsWith('c:')) throw new HapProtocolError('WRONG_ID_DIRECTION');
		const pending = this.pending.get(message.id);
		if (!pending) {
			const abandoned = this.abandoned.get(message.id);
			if (!abandoned) throw new HapProtocolError('UNKNOWN_RESPONSE_ID');
			abandoned.cleanup(); this.abandoned.delete(message.id);
			if (!message.error && !methodValidation.validate(abandoned.method, 'result', message.result)) throw new HapProtocolError('INVALID_METHOD_RESULT');
			return; // Exactly one known late reply; an unknown/second reply is a protocol failure.
		}
		this.pending.delete(message.id);
		pending.cleanup();
		if (message.error) pending.reject(new BotRpcError(message.error.code, message.error.data));
		else {
			if (!methodValidation.validate(pending.method, 'result', message.result)) {
				const error = new HapProtocolError(
					pending.method === 'protocol.hello' ? 'PROTOCOL_INCOMPATIBLE' : 'INVALID_METHOD_RESULT',
				);
				pending.reject(error);
				this.finish(error);
				return;
			}
			if (
				pending.method === 'host.attach' &&
				methodValidation.validate('host.attach', 'result', message.result)
			) {
				if (!activeHostLease(message.result)) {
					const error = new HapProtocolError('INVALID_HOST_LEASE');
					pending.reject(error);
					this.finish(error);
					return;
				}
				for (const entry of this.reverse.values()) entry.controller.abort();
				this.hostLease = message.result;
				try { this.host?.leaseChanged?.(message.result); }
				catch {
					const error = new HapProtocolError('HOST_LIFECYCLE_FAILED');
					pending.reject(error); this.finish(error); return;
				}
			} else if (pending.method === 'host.detach') {
				for (const entry of this.reverse.values()) entry.controller.abort();
				this.hostLease = undefined;
				try { this.host?.leaseChanged?.(undefined); }
				catch {
					const error = new HapProtocolError('HOST_LIFECYCLE_FAILED');
					pending.reject(error); this.finish(error); return;
				}
			}
			pending.resolve(message.result);
		}
	}

	private async handleHost(message: HapRequest & { id?: string }): Promise<void> {
		const id = message.id;
		if (!id) return;
		if (this.reverse.size + this.settledServerIds.size >= MAX_SERVER_ASSOCIATIONS) { this.finish(new HapProtocolError('HOST_ASSOCIATION_LIMIT')); return; }
		const overloaded = this.reverse.size >= this.maxHostRequests;
		const entry: ReverseRequest = { controller: new AbortController(), replied: false };
		const controller = entry.controller;
		this.reverse.set(id, entry);
		const reply = async (response: HapResponse) => {
			if (entry.replied) return;
			entry.replied = true;
			await this.sendReply(response);
		};
		const reject = (kind: BotErrorData['kind'], reason: string) => reply({
				jsonrpc: '2.0',
				id,
				error: { code: -32000, message: reason, data: { kind, reason, retryable: false, correlationId: id } },
			});
		let operation: Promise<unknown> | undefined;
		let cancelTimer: (() => void) | undefined;
		let rejectAbort: (() => void) | undefined;
		try {
		if (this.connectionState !== 'ready') {
			await reject('PROTOCOL_INCOMPATIBLE', 'HELLO_REQUIRED');
			return;
		}
		if (!this.host || (message.method !== 'host.invoke' && message.method !== 'host.queryReceipt' && message.method !== 'host.read' && message.method !== 'host.search' && message.method !== 'host.prepareWrite' && message.method !== 'host.checkWrite')) {
			await reject('HOST_UNAVAILABLE', 'HOST_UNAVAILABLE');
			return;
		}
		if (overloaded) {
			await reject('STREAM_SLOW_CONSUMER', 'HOST_REQUEST_LIMIT');
			return;
		}
		const method = message.method;
		const host = this.host;
		if ((method === 'host.read' && !host.read) || (method === 'host.search' && !host.search) ||
			(method === 'host.prepareWrite' && !host.prepareWrite) || (method === 'host.checkWrite' && !host.checkWrite)) {
			await reject('HOST_UNAVAILABLE', 'HOST_UNAVAILABLE'); return;
		}
		const params = message.params;
		if (!methodValidation.validate(method, 'params', params)) {
			await reject('INVALID_ARGUMENT', 'INVALID_HOST_PARAMS');
			return;
		}
		const capability = method === 'host.read' ? 'note.read' : method === 'host.search' ? 'note.search' :
			'capability' in params && typeof params.capability === 'string' ? params.capability : 'note.write';
		const lease = this.hostLease;
		if (
			!lease ||
			params.leaseId !== lease.leaseId ||
			params.workspaceId !== lease.workspaceId ||
			!activeHostLease(lease) ||
			!lease.capabilities.includes(capability) || params.hostConnectionId !== lease.hostConnectionId || params.leaseEpoch !== lease.leaseEpoch
		) {
			await reject('CAPABILITY_DENIED', 'INVALID_HOST_LEASE');
			return;
		}
		if ('profileId' in params && (params.profileId !== this.helloResult?.profile.profileId || params.commandEpoch !== this.helloResult.profile.commandEpoch)) {
			await reject('CAPABILITY_DENIED', 'NOTE_PROFILE_MISMATCH'); return;
		}
		if ((method === 'host.invoke' && methodValidation.validate('host.invoke', 'params', params) && !params.preview.binding) ||
			(method === 'host.queryReceipt' && methodValidation.validate('host.queryReceipt', 'params', params) && !params.preview.binding) ||
			(method === 'host.checkWrite' && methodValidation.validate('host.checkWrite', 'params', params) && !params.preview.binding)) {
			await reject('CAPABILITY_DENIED', 'NOTE_BINDING_MISMATCH'); return;
		}
		if ((method === 'host.read' && methodValidation.validate('host.read', 'params', params) && !sourceOnLease(params.source, lease)) ||
			(method === 'host.search' && methodValidation.validate('host.search', 'params', params) &&
				[...params.sources, ...params.scopes].some((source) => !sourceOnLease(source, lease)))) {
			await reject('CAPABILITY_DENIED', 'SOURCE_SCOPE_MISMATCH'); return;
		}
			const deadline = new Promise<never>((_resolve, fail) => {
				cancelTimer = this.timers.after(this.requestTimeoutMs, () => {
					controller.abort();
					fail(new HapProtocolError('HOST_REQUEST_TIMEOUT'));
				});
				rejectAbort = () => fail(new HapProtocolError('HOST_REQUEST_ABORTED'));
				controller.signal.addEventListener('abort', rejectAbort, { once: true });
			});
			operation = method === 'host.invoke' && methodValidation.validate('host.invoke', 'params', params)
				? host.invoke(params, controller.signal)
				: method === 'host.queryReceipt' && methodValidation.validate('host.queryReceipt', 'params', params)
					? host.queryReceipt(params, controller.signal)
					: method === 'host.read' && methodValidation.validate('host.read', 'params', params) && host.read
						? host.read(params, controller.signal)
						: method === 'host.search' && methodValidation.validate('host.search', 'params', params) && host.search
							? host.search(params, controller.signal)
							: method === 'host.prepareWrite' && methodValidation.validate('host.prepareWrite', 'params', params) && host.prepareWrite
								? host.prepareWrite(params, controller.signal)
								: method === 'host.checkWrite' && methodValidation.validate('host.checkWrite', 'params', params) && host.checkWrite
									? host.checkWrite(params, controller.signal) : Promise.reject(new HapProtocolError('INVALID_HOST_PARAMS'));
			const result = await Promise.race([operation, deadline]);
			if (this.hostLease !== lease || this.host !== host || controller.signal.aborted || !activeHostLease(lease)) {
				await reject('CAPABILITY_DENIED', 'INVALID_HOST_LEASE'); return;
			}
			let valid = methodValidation.validate(method, 'result', result);
			if (method === 'host.invoke' || method === 'host.queryReceipt')
				valid = valid && methodValidation.validate(method, 'result', result) && 'effectId' in params && result.effectId === params.effectId &&
					'fingerprint' in params && result.fingerprint === params.fingerprint && !!result.fingerprint && (result.status !== 'committed' || !!result.receiptId);
			else if (method === 'host.prepareWrite' && methodValidation.validate('host.prepareWrite', 'params', params) && methodValidation.validate('host.prepareWrite', 'result', result))
				valid = valid && sameJson(result.target, params.target) && sameJson(result.tool, params.tool) && sameJson(result.lease, lease) && result.contentHash === result.binding.contentHash &&
					result.binding.profileId === params.profileId && result.binding.commandEpoch === params.commandEpoch && result.binding.targetResourceId === params.target.resourceId &&
					result.binding.leaseId === lease.leaseId && result.binding.hostConnectionId === lease.hostConnectionId && result.binding.leaseEpoch === lease.leaseEpoch;
			else if (method === 'host.read' && methodValidation.validate('host.read', 'params', params) && methodValidation.validate('host.read', 'result', result))
				valid = valid && sameJson(result.source, params.source) && new TextEncoder().encode(result.text).length <= params.maxBytes;
			else if (method === 'host.search' && methodValidation.validate('host.search', 'params', params) && methodValidation.validate('host.search', 'result', result))
				valid = valid && result.matches.length <= params.limit && result.matches.reduce((total, match) => total + new TextEncoder().encode(match.text).length, 0) <= params.maxBytes &&
					result.matches.every((match) => sourceOnLease(match.source, lease) && match.range.end - match.range.start === match.text.length &&
						(!match.source.range || (match.range.start >= match.source.range.start && match.range.end <= match.source.range.end)) &&
						(params.sources.some((source) => sameJson(source, match.source)) || params.scopes.some((scope) =>
							match.source.scopeResourceIds.includes(scope.resourceId) && match.source.originClientId === scope.originClientId && match.source.originViewId === scope.originViewId)));
			if (!valid) {
				await reject('INVALID_ARGUMENT', 'INVALID_HOST_RESULT');
				return;
			}
			await reply({ jsonrpc: '2.0', id, result: result as JsonValue });
		} catch (error) {
			const safeReasons = ['SOURCE_CHANGED', 'SOURCE_SNAPSHOT_INVALID', 'SOURCE_SCOPE_INVALID', 'SOURCE_SCOPE_MISMATCH', 'SOURCE_REQUEST_ABORTED', 'SOURCE_READ_FAILED',
				'SOURCE_CACHE_LIMIT', 'SOURCE_SIZE_LIMIT', 'SOURCE_CURSOR_LIMIT', 'SOURCE_CURSOR_INVALID', 'SOURCE_TASK_LIMIT', 'INVALID_HOST_LEASE', 'SOURCE_LEASE_UNAVAILABLE',
				'NOTE_TARGET_INVALID', 'NOTE_BINDING_MISMATCH', 'NOTE_PROFILE_MISMATCH', 'NOTE_RECEIPT_INVALID', 'EFFECT_FINGERPRINT_MISMATCH', 'NOTE_TARGET_EXISTS', 'UNSAVED_EDITOR_CHANGES',
				'HOST_REQUEST_ABORTED', 'HOST_LEASE_MISMATCH', 'HOST_OFFLINE', 'NOTE_TASK_LIMIT', 'NOTE_SIZE_LIMIT', 'RECEIPT_WRITE_FAILED'];
			if (error instanceof BotRpcError && safeReasons.includes(error.data.reason)) {
				await reject(error.data.kind, error.data.reason); return;
			}
			await reject(
				'HOST_UNAVAILABLE',
				controller.signal.aborted ? 'HOST_REQUEST_ABORTED' : 'HOST_REQUEST_FAILED',
			);
		} finally {
			cancelTimer?.();
			if (rejectAbort) controller.signal.removeEventListener('abort', rejectAbort);
			const settle = () => {
				if (this.reverse.get(id) !== entry) return;
				this.reverse.delete(id);
				if (this.connectionState !== 'closed') this.settledServerIds.set(id, this.timers.after(ASSOCIATION_TTL_MS, () => this.settledServerIds.delete(id)));
			};
			// Logical cancel replies once. An uncancelable Host/Vault promise still owns its slot until real settlement.
			if (operation) void operation.then(settle, settle); else settle();
		}
	}

	private async sendReply(message: HapResponse): Promise<void> {
		if (this.connectionState === 'closed') return;
		try {
			await this.transport.send(encodeHapFrame(message));
		} catch (error) {
			this.finish(error instanceof Error ? error : new Error('TRANSPORT_WRITE_FAILED'));
		}
	}

	private finish(reason: Error): void {
		if (this.connectionState === 'closed') return;
		try {
			this.decoder.finish();
		} catch (error) {
			reason = error instanceof Error ? error : reason;
		}
		this.connectionState = 'closed';
		for (const pending of this.pending.values()) {
			pending.cleanup();
			pending.reject(reason);
		}
		this.pending.clear();
		for (const entry of this.reverse.values()) entry.controller.abort();
		this.reverse.clear();
		for (const request of this.abandoned.values()) request.cleanup();
		this.abandoned.clear();
		for (const cleanup of this.settledServerIds.values()) cleanup();
		this.settledServerIds.clear();
		this.seenServerIds.clear();
		this.hostLease = undefined;
		try { this.host?.leaseChanged?.(undefined); } catch { /* A Host callback cannot prevent transport cleanup. */ }
		this.host = undefined;
		for (const listener of this.closeListeners) {
			try { listener(); } catch { /* One subscriber cannot prevent EOF cleanup. */ }
		}
		this.closeListeners.clear();
		for (const unsubscribe of this.unsubscribe) unsubscribe();
		this.transport.close();
	}

	close(): void {
		this.finish(new HapProtocolError('CONNECTION_CLOSED'));
	}
}
