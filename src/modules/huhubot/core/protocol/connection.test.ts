import fixtures from '../../../../../contracts/hap/v0.1/fixtures/golden.json';
import { expect, it, vi } from 'vitest';
import { BotRpcError, HapConnection, type HapTransport } from './connection';
import { HapDecoder, encodeHapFrame, type HapMessage } from './codec';
import { methodValidation } from './method-validation';
import type { HostInvoke, HostReadRequest, HostReceipt, RecoveryStatus, SourceSnapshot } from '../../api';

class Peer implements HapTransport {
	data: (bytes: Uint8Array) => void = () => undefined;
	ended: (reason: Error) => void = () => undefined;
	messages: HapMessage[] = [];
	onData(listener: (bytes: Uint8Array) => void): () => void {
		this.data = listener;
		return () => {
			this.data = () => undefined;
		};
	}
	onClose(listener: (reason: Error) => void): () => void {
		this.ended = listener;
		return () => {
			this.ended = () => undefined;
		};
	}
	send(bytes: Uint8Array): Promise<void> {
		for (const payload of new HapDecoder().push(bytes))
			this.messages.push(...(Array.isArray(payload) ? payload : [payload]));
		return Promise.resolve();
	}
	close(): void {
		this.ended(new Error('EOF'));
	}
	reply(id: string, result: object): void {
		this.data(encodeHapFrame({ jsonrpc: '2.0', id, result: result as never }));
	}
}
const hello = {
	protocolVersion: '0.1',
	buildVersion: '0.1.0-dev',
	schemaVersion: 1,
	profile: { profileId: 'p1', commandEpoch: '1', revision: '1', createdAt: '2026-10-25T00:00:00Z' },
	capabilities: ['service.health', 'service.status', 'host.attach'],
	limits: { maxFrameBytes: 1048576, maxBatchItems: 8 },
};

it('gates calls on hello, associates replies, and fails pending calls on EOF', async () => {
	const peer = new Peer();
	const connection = new HapConnection(peer, {
		after: (ms, run) => {
			const timer = setTimeout(run, ms);
			return () => clearTimeout(timer);
		},
	});
	await expect(connection.request('service.health', {})).rejects.toThrow('HELLO_REQUIRED');
	const connecting = connection.connect({ name: 'test', version: '1' });
	peer.reply('c:1', hello);
	const client = await connecting;
	expect(client.hello.profile.profileId).toBe('p1');
	const health = client.service.health({});
	peer.reply('c:2', { status: 'ok' });
	await expect(health).resolves.toEqual({ status: 'ok' });
	const pending = client.service.status({});
	peer.close();
	await expect(pending).rejects.toThrow('EOF');
	expect(client.state).toBe('closed');
});

class ManualTimers {
	callbacks = new Set<() => void>();
	private deadlines = new Map<() => void, number>();
	private now = 0;
	after(ms: number, run: () => void): () => void {
		const callback = () => { this.callbacks.delete(callback); this.deadlines.delete(callback); run(); };
		this.callbacks.add(callback); this.deadlines.set(callback, this.now + ms);
		return () => {
			this.callbacks.delete(callback); this.deadlines.delete(callback);
		};
	}
	fire(): void {
		if (this.deadlines.size) this.advance(Math.min(...this.deadlines.values()) - this.now);
	}
	advance(ms: number): void {
		this.now += ms;
		for (const [callback, deadline] of [...this.deadlines]) if (deadline <= this.now) callback();
	}
}
async function ready(limits = {}) {
	const peer = new Peer();
	const timers = new ManualTimers();
	const connection = new HapConnection(peer, timers, limits);
	const connecting = connection.connect({ name: 'test', version: '1' });
	peer.reply('c:1', hello);
	return { peer, timers, connection, client: await connecting };
}

it('consumes the initial zero budget and sends a typed CAS configuration through the public client', async () => {
	const { client, peer } = await ready();
	const initial = { revision: '1', policy: { rootTokenLimit: '0', profileTokenLimit: '0', maintenanceTokenLimit: '0', paused: false },
		limits: { maxDepth: 3, maxChildren: 32, rootChildren: 4, profileChildren: 8, maxWakes: 8 } };
	try {
		const reading = client.collaboration.budget({ profileId: 'p1' });
		expect(peer.messages.at(-1)).toMatchObject({ method: 'collaboration.budget', params: { profileId: 'p1' } });
		peer.reply('c:2', initial); await expect(reading).resolves.toEqual(initial);
		const policy = { ...initial.policy, rootTokenLimit: '100', profileTokenLimit: '1000' };
		const changing = client.collaboration.configureBudget({ profileId: 'p1', commandEpoch: '1', commandId: 'command:budget', idempotencyKey: 'idem:budget', expectedRevision: initial.revision, policy });
		expect(peer.messages.at(-1)).toMatchObject({ method: 'collaboration.configureBudget', params: { expectedRevision: '1', policy } });
		peer.reply('c:3', { ...initial, revision: '2', policy });
		await expect(changing).resolves.toMatchObject({ revision: '2', policy }); expect(client.state).toBe('ready');
	} finally { client.close(); }
});
const lease = { leaseId: 'l1', hostConnectionId: 'connection:one', leaseEpoch: '1', workspaceId: 'w1', capabilities: ['note.write'], expiresAt: '2099-10-25T00:00:00Z' };
const invoke = {
	leaseId: 'l1',
	hostConnectionId: 'connection:one', leaseEpoch: '1', profileId: 'p1', commandEpoch: '1',
	workspaceId: 'w1',
	capability: 'note.write',
	effectId: 'e1',
	resource: { resourceId: 'note1' },
	content: 'after', runId: 'run:one', approvalId: 'approval:one', approvalRevision: '1', expiresAt: '2099-01-01T00:00:00Z', fingerprint: `sha256:${'c'.repeat(64)}`,
	preview: { target: { workspaceId: 'w1', resourceId: 'note1', operation: 'update' as const, baseRevision: '1' },
		tool: { name: 'note.write', capability: 'note.write', capabilityVersion: '1', implementationVersion: '1', policyVersion: '1' },
		parametersHash: `sha256:${'a'.repeat(64)}`, previewHash: `sha256:${'b'.repeat(64)}`, diff: '-before\n+after', content: 'after', sourceRefs: [],
		binding: { deviceId: 'device:one', profileId: 'p1', commandEpoch: '1', workspaceId: 'w1', originClientId: 'client:one', originViewId: 'view:one',
			leaseId: 'l1', hostConnectionId: 'connection:one', leaseEpoch: '1', targetResourceId: 'note1', preparationId: `prepare:${'d'.repeat(32)}`,
			baseHash: `sha256:${'a'.repeat(64)}`, contentHash: `sha256:${'b'.repeat(64)}`, targetVersion: '1', capabilityVersion: '1', implementationVersion: '1', policyVersion: '1' } },
} satisfies HostInvoke;
const receiptQuery = { leaseId: 'l1', hostConnectionId: 'connection:one', leaseEpoch: '1', profileId: 'p1', commandEpoch: '1', workspaceId: 'w1',
	effectId: 'e1', fingerprint: invoke.fingerprint, preview: invoke.preview };
const committed: HostReceipt = { effectId: 'e1', status: 'committed', fingerprint: invoke.fingerprint, receiptId: `receipt:${'e'.repeat(32)}` };
const settle = async () => {
	for (let i = 0; i < 5; i++) await Promise.resolve();
};

const capturedSource: SourceSnapshot = { resourceId: 'source:one', kind: 'note', revision: '1', hash: `sha256:${'a'.repeat(64)}`,
	workspaceId: 'w1', originClientId: 'client:one', originViewId: 'view:one', hostConnectionId: 'connection:one',
	hostLeaseId: 'l1', hostLeaseEpoch: '1', scopeResourceIds: [] };
const readRequest: HostReadRequest = { leaseId: 'l1', hostConnectionId: 'connection:one', leaseEpoch: '1', workspaceId: 'w1',
	source: capturedSource, maxBytes: 65536 };

it('routes strict read/search on their own capabilities and aborts a read when its lease is detached', async () => {
	const { peer, client } = await ready();
	let active: AbortSignal | undefined;
	let complete: ((value: { source: SourceSnapshot; text: string; format: 'text/markdown'; truncated: boolean }) => void) | undefined;
	client.setHost({ invoke: async (request) => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'rejected' }),
		queryReceipt: async (request) => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }),
		read: (_request, signal) => { active = signal; return new Promise((resolve) => { complete = resolve; }); },
		search: async () => ({ matches: [{ source: capturedSource, text: 'ok', range: { start: 0, end: 2 } }], truncated: false }) });
	const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.read', 'note.search'] });
	peer.reply('c:2', { ...lease, capabilities: ['note.read', 'note.search'] }); await attaching;
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:search', method: 'host.search', params: { ...readRequest, source: undefined,
		sources: [capturedSource], scopes: [], query: 'ok', limit: 1 } as never }));
	await settle();
	expect(peer.messages.at(-1)).toMatchObject({ id: 's:search', result: { matches: [{ text: 'ok' }] } });
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:read', method: 'host.read', params: readRequest as never }));
	await settle(); expect(active?.aborted).toBe(false);
	const detaching = client.host.detach({ leaseId: 'l1' }); peer.reply('c:3', { detached: true }); await detaching;
	expect(active?.aborted).toBe(true);
	complete?.({ source: capturedSource, text: 'late-private-body', format: 'text/markdown', truncated: false });
	await settle();
	expect(JSON.stringify(peer.messages)).not.toContain('late-private-body');
	client.close();
});

it('rejects forged read source identities and malformed read results before forwarding text', async () => {
	const { peer, client } = await ready();
	let reads = 0;
	client.setHost({ invoke: async (request) => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'rejected' }),
		queryReceipt: async (request) => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }),
		read: async () => { reads++; return { source: { ...capturedSource, resourceId: 'source:forged' }, text: 'private-body', format: 'text/markdown', truncated: false }; } });
	const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.read'] });
	peer.reply('c:2', { ...lease, capabilities: ['note.read'] }); await attaching;
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:forged', method: 'host.read', params: { ...readRequest, source: { ...capturedSource, workspaceId: 'other' } } as never }));
	await settle(); expect(reads).toBe(0);
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:invalid-result', method: 'host.read', params: readRequest as never }));
	await settle(); expect(reads).toBe(1);
	expect(peer.messages.at(-1)).toMatchObject({ id: 's:invalid-result', error: { data: { reason: 'INVALID_HOST_RESULT' } } });
	expect(JSON.stringify(peer.messages)).not.toContain('private-body'); client.close();
});

it('settles attach and closes safely if the Host lease lifecycle callback fails', async () => {
	const { peer, client } = await ready();
	client.setHost({ invoke: async (request) => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'rejected' }),
		queryReceipt: async (request) => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }),
		leaseChanged: (next) => { if (next) throw new Error('private-lifecycle-error'); } });
	let outcome = 'pending';
	void client.host.attach({ workspaceId: 'w1', capabilities: ['note.read'] }).then(() => { outcome = 'resolved'; }, () => { outcome = 'rejected'; });
	peer.reply('c:2', { ...lease, capabilities: ['note.read'] });
	await settle();
	expect(outcome).toBe('rejected');
	expect(client.state).toBe('closed');
	expect(JSON.stringify(peer.messages)).not.toContain('private-lifecycle-error');
});

it('never infers read capability from a write lease and bounds a timed-out read without closing HAP', async () => {
	const { peer, client, timers } = await ready();
	let reads = 0, signal: AbortSignal | undefined;
	client.setHost({ invoke: async (request) => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'rejected' }),
		queryReceipt: async (request) => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }),
		read: (_request, active) => { reads++; signal = active; return new Promise(() => undefined); } });
	const writeOnly = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] }); peer.reply('c:2', lease); await writeOnly;
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:no-read-cap', method: 'host.read', params: readRequest as never }));
	await settle(); expect(reads).toBe(0);
	const readable = client.host.attach({ workspaceId: 'w1', capabilities: ['note.read'] });
	peer.reply('c:3', { ...lease, capabilities: ['note.read'] }); await readable;
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:slow-read', method: 'host.read', params: readRequest as never }));
	await settle(); expect(reads).toBe(1);
	timers.fire(); await settle();
	expect(signal?.aborted).toBe(true); expect(client.state).toBe('ready');
	const health = client.service.health({}); peer.reply('c:4', { status: 'ok' }); await expect(health).resolves.toEqual({ status: 'ok' });
	client.close();
});

it('bounds pending requests, aborts and expires waits without replaying commands', async () => {
	const { peer, timers, client } = await ready({ maxPending: 2 });
	const controller = new AbortController();
	const first = client.service.health({}, { signal: controller.signal });
	const second = client.service.status({});
	await expect(client.service.diagnostics({})).rejects.toThrow('PENDING_LIMIT');
	controller.abort();
	await expect(first).rejects.toThrow('REQUEST_ABORTED');
	const expired = expect(second).rejects.toThrow('REQUEST_TIMEOUT');
	timers.fire();
	await expired;
	expect(timers.callbacks.size).toBe(2); // Known canceled/timed-out IDs retain only bounded 30s late-response associations.
	expect(peer.messages.map((entry) => entry.id)).toEqual(['c:1', 'c:2', 'c:3']);
	peer.reply('c:2', { status: 'ok' });
	const third = client.service.health({});
	peer.reply('c:4', { status: 'ok' });
	await expect(third).resolves.toEqual({ status: 'ok' });
	client.close();
});

it('processes reverse Host requests with their original IDs while ordinary replies keep flowing', async () => {
	const { peer, client } = await ready();
	let finishHost: ((value: HostReceipt) => void) | undefined;
	client.setHost({
		invoke: () =>
			new Promise((resolve) => {
				finishHost = resolve;
			}),
		queryReceipt: (request) => Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'reconciled' }),
	});
	const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] });
	peer.reply('c:2', lease);
	await attaching;
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:invoke1', method: 'host.invoke', params: invoke }));
	const health = client.service.health({});
	peer.reply('c:3', { status: 'ok' });
	await expect(health).resolves.toEqual({ status: 'ok' });
	finishHost?.(committed);
	await settle();
	expect(peer.messages.at(-1)).toEqual({
		jsonrpc: '2.0',
		id: 's:invoke1',
		result: committed,
	});
	peer.data(
		encodeHapFrame({
			jsonrpc: '2.0',
			id: 's:receipt1',
			method: 'host.queryReceipt',
			params: receiptQuery,
		}),
	);
	await settle();
	expect(peer.messages.at(-1)).toEqual({
		jsonrpc: '2.0',
		id: 's:receipt1',
		result: { effectId: 'e1', fingerprint: invoke.fingerprint, status: 'reconciled' },
	});
	client.close();
});

it('rejects unleased and over-limit Host work, ignores notifications, and aborts active work on close', async () => {
	const { peer, client } = await ready({ maxHostRequests: 1 });
	let activeSignal: AbortSignal | undefined;
	let starts = 0;
	client.setHost({
		invoke: (_request, signal) => {
			starts++;
			activeSignal = signal;
			return new Promise(() => undefined);
		},
		queryReceipt: (request) => Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }),
	});
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:unleased', method: 'host.invoke', params: invoke }));
	await settle();
	expect(peer.messages.at(-1)).toMatchObject({ id: 's:unleased', error: { data: { kind: 'CAPABILITY_DENIED' } } });
	const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] });
	peer.reply('c:2', lease);
	await attaching;
	peer.data(encodeHapFrame({ jsonrpc: '2.0', method: 'host.invoke', params: invoke }));
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:first', method: 'host.invoke', params: invoke }));
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:second', method: 'host.invoke', params: invoke }));
	await settle();
	expect(starts).toBe(1);
	expect(peer.messages.at(-1)).toMatchObject({ id: 's:second', error: { data: { kind: 'STREAM_SLOW_CONSUMER' } } });
	client.close();
	expect(activeSignal?.aborted).toBe(true);
	await settle();
});

it('closes on malformed streams and preserves a truncated EOF failure for every pending call', async () => {
	const { peer, client, timers } = await ready();
	const first = client.service.health({});
	const second = client.service.status({});
	peer.data(Uint8Array.of(0, 0, 0));
	peer.close();
	await expect(first).rejects.toThrow('TRUNCATED_FRAME');
	await expect(second).rejects.toThrow('TRUNCATED_FRAME');
	expect(timers.callbacks.size).toBe(0);
	expect(client.state).toBe('closed');
});

it('returns explicit unavailable-method errors and closes incompatible handshakes', async () => {
	const { peer, client } = await ready();
	const missing = client.agents.get({ profileId: 'p1', id: 'a1' });
	peer.data(
		encodeHapFrame({
			jsonrpc: '2.0',
			id: 'c:2',
			error: {
				code: -32601,
				message: 'unavailable',
				data: {
					kind: 'CAPABILITY_DENIED',
					reason: 'METHOD_NOT_AVAILABLE',
					retryable: false,
					correlationId: 'x',
				},
			},
		}),
	);
	await expect(missing).rejects.toThrow('CAPABILITY_DENIED: METHOD_NOT_AVAILABLE');
	client.close();
	const incompatible = new Peer();
	const connection = new HapConnection(incompatible, new ManualTimers());
	const connecting = connection.connect({ name: 'test', version: '1' });
	incompatible.reply('c:1', { ...hello, protocolVersion: '9' });
	await expect(connecting).rejects.toThrow('PROTOCOL_INCOMPATIBLE');
	expect(connection.state).toBe('closed');
});

it('preserves a malformed-frame reason and rejects wrong-direction IDs for all pending calls', async () => {
	const malformed = await ready();
	const pending = malformed.client.service.health({});
	malformed.peer.data(Uint8Array.of(0, 0, 0, 1, 2));
	await expect(pending).rejects.toThrow('UNKNOWN_KIND');
	expect(malformed.client.state).toBe('closed');
	const direction = await ready();
	const next = direction.client.service.health({});
	direction.peer.reply('s:wrong-direction', { status: 'ok' });
	await expect(next).rejects.toThrow('WRONG_ID_DIRECTION');
	expect(direction.client.state).toBe('closed');
});

it('times out only one Host request, keeps its real quota, and leaves sibling HAP work usable', async () => {
	const { peer, client, timers } = await ready();
	let activeSignal: AbortSignal | undefined;
	client.setHost({
		invoke: (_request, signal) => {
			activeSignal = signal;
			return new Promise(() => undefined);
		},
		queryReceipt: (request) => Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }),
	});
	const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] });
	peer.reply('c:2', lease);
	await attaching;
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:slow', method: 'host.invoke', params: invoke }));
	timers.fire();
	await settle();
	expect(activeSignal?.aborted).toBe(true);
	expect(client.state).toBe('ready');
	expect(peer.messages.at(-1)).toMatchObject({ id: 's:slow', error: { data: { kind: 'HOST_UNAVAILABLE', reason: 'HOST_REQUEST_ABORTED' } } });
	const health = client.service.health({}); peer.reply('c:3', { status: 'ok' }); await expect(health).resolves.toEqual({ status: 'ok' });
	client.close(); expect(timers.callbacks.size).toBe(0);
});

it.each([
	{ schemaVersion: 99, state: 'not-ready', profile: { revision: 9007199254740992 } },
	{ schemaVersion: 1, state: 'ready', profile: hello.profile },
	{ schemaVersion: 1, state: 'ready', profile: { ...hello.profile, revision: 42 }, hostAttached: false },
	{
		schemaVersion: 1,
		state: 'ready',
		profile: { ...hello.profile, createdAt: '2026-02-30T00:00:00Z' },
		hostAttached: false,
	},
	{ schemaVersion: 1, state: 'ready', profile: hello.profile, hostAttached: false, unknown: true },
])('rejects an invalid method result before delivering it and releases all waits', async (result) => {
	const { peer, client, timers } = await ready();
	const status = client.service.status({});
	const health = client.service.health({});
	const rejectedStatus = expect(status).rejects.toThrow('INVALID_METHOD_RESULT');
	const rejectedHealth = expect(health).rejects.toThrow('INVALID_METHOD_RESULT');
	peer.reply('c:2', result);
	await Promise.all([rejectedStatus, rejectedHealth]);
	expect(client.state).toBe('closed');
	expect(timers.callbacks.size).toBe(0);
});

it('does not hand malformed DTOs to a trusted Host even with a valid lease', async () => {
	const { peer, client } = await ready();
	const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] });
	peer.reply('c:2', lease);
	await attaching;
	let calls = 0;
	client.setHost({
		invoke: (request) => {
			calls++;
			return Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'committed', receiptId: `receipt:${'e'.repeat(32)}` });
		},
		queryReceipt: (request) => {
			calls++;
			return Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'reconciled' });
		},
	});
	peer.data(
		encodeHapFrame({
			jsonrpc: '2.0',
			id: 's:malformed',
			method: 'host.invoke',
			params: {
				...invoke,
				expectedRevision: 42,
				resource: { resourceId: 'note', revision: 42 },
				content: { unexpected: true },
				unknown: true,
			},
		}),
	);
	peer.data(
		encodeHapFrame({
			jsonrpc: '2.0',
			id: 's:query-malformed',
			method: 'host.queryReceipt',
			params: { leaseId: 'l1', workspaceId: 'w1', effectId: 'e1', unknown: true },
		}),
	);
	await settle();
	expect(calls).toBe(0);
	expect(peer.messages.slice(-2)).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: 's:malformed',
				error: expect.objectContaining({
					data: expect.objectContaining({ kind: 'INVALID_ARGUMENT', reason: 'INVALID_HOST_PARAMS' }),
				}),
			}),
			expect.objectContaining({
				id: 's:query-malformed',
				error: expect.objectContaining({
					data: expect.objectContaining({ kind: 'INVALID_ARGUMENT', reason: 'INVALID_HOST_PARAMS' }),
				}),
			}),
		]),
	);
	client.close();
});

it('rejects outgoing method DTOs before creating or sending a pending request', async () => {
	const { peer, client, timers } = await ready();
	const invalid = client.service.health({ unknown: true } as never);
	await expect(invalid).rejects.toThrow('INVALID_METHOD_PARAMS');
	expect(peer.messages).toHaveLength(1);
	expect(timers.callbacks.size).toBe(0);
	client.close();
});

it('does not publish an invalid Host receipt as a committed fact', async () => {
	const { peer, client } = await ready();
	const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] });
	peer.reply('c:2', lease);
	await attaching;
	client.setHost({
		invoke: (request) =>
			Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'committed', receiptId: `receipt:${'e'.repeat(32)}`, revision: '1', unknown: true }),
		queryReceipt: (request) => Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'reconciled' }),
	});
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:bad-receipt', method: 'host.invoke', params: invoke }));
	await settle();
	expect(peer.messages.at(-1)).toMatchObject({
		id: 's:bad-receipt',
		error: { data: { kind: 'INVALID_ARGUMENT', reason: 'INVALID_HOST_RESULT' } },
	});
	expect(peer.messages.at(-1)).not.toHaveProperty('result');
	client.close();
});

it.each([
	{ ...hello, unknown: true },
	{ ...hello, profile: { ...hello.profile, createdAt: '2026-02-30T00:00:00Z' } },
	{ ...hello, limits: { maxFrameBytes: 2_097_152, maxBatchItems: 8 } },
])('rejects an invalid hello before publishing a ready client', async (result) => {
	const peer = new Peer();
	const timers = new ManualTimers();
	const connection = new HapConnection(peer, timers);
	const connecting = connection.connect({ name: 'test', version: '1' });
	const rejected = expect(connecting).rejects.toThrow('PROTOCOL_INCOMPATIBLE');
	peer.reply('c:1', result);
	await rejected;
	expect(connection.state).toBe('closed');
	expect(timers.callbacks.size).toBe(0);
});

it.each([
	{ ...lease, unknown: true },
	{ ...lease, expiresAt: '2099-01-01T00:00:00+08:00' },
	{ ...lease, capabilities: [42] },
])('rejects a malformed Host attach result before installing its lease', async (result) => {
	const { peer, client, timers } = await ready();
	const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] });
	const rejected = expect(attaching).rejects.toThrow('INVALID_METHOD_RESULT');
	peer.reply('c:2', result);
	await rejected;
	expect(client.state).toBe('closed');
	expect(timers.callbacks.size).toBe(0);
});

it.each(['2016-12-31T23:59:60Z', '2016-12-31T23:59:59Z'])(
	'does not install or dispatch an expired or non-comparable Host lease: %s',
	async (expiresAt) => {
		const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-25T00:00:00Z'));
		const { peer, client, timers } = await ready();
		try {
			const invalidLease = { ...lease, expiresAt };
			expect(methodValidation.validate('host.attach', 'result', invalidLease)).toBe(true);
			if (expiresAt.endsWith(':60Z')) expect(Number.isNaN(Date.parse(expiresAt))).toBe(true);
			let calls = 0;
			client.setHost({
				invoke: (request) => {
					calls++;
					return Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'committed', receiptId: `receipt:${'e'.repeat(32)}` });
				},
				queryReceipt: (request) => {
					calls++;
					return Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'reconciled' });
				},
			});
			const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] });
			peer.reply('c:2', invalidLease);
			let attachError: unknown;
			await attaching.catch((error: unknown) => {
				attachError = error;
			});
			peer.data(
				encodeHapFrame({ jsonrpc: '2.0', id: 's:expired-invoke', method: 'host.invoke', params: invoke }),
			);
			peer.data(
				encodeHapFrame({
					jsonrpc: '2.0',
					id: 's:expired-receipt',
					method: 'host.queryReceipt',
					params: { leaseId: 'l1', workspaceId: 'w1', effectId: 'e1' },
				}),
			);
			await settle();
			expect(calls).toBe(0);
			expect(attachError).toMatchObject({ message: 'HAP protocol error: INVALID_HOST_LEASE' });
			expect(String(attachError)).not.toContain(expiresAt);
			expect(timers.callbacks.size).toBe(0);
			expect(client.state).toBe('closed');
		} finally {
			client.close();
			now.mockRestore();
		}
	},
);

it.each(['host.invoke', 'host.queryReceipt'] as const)(
	'rechecks comparable expiry immediately before dispatching %s',
	async (method) => {
		const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-25T00:00:00Z'));
		const { peer, client, timers } = await ready();
		try {
			const attaching = client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] });
			peer.reply('c:2', { ...lease, expiresAt: '2026-10-25T00:00:01Z' });
			const installed = await attaching;
			let calls = 0;
			client.setHost({
				invoke: (request) => {
					calls++;
					return Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'committed', receiptId: `receipt:${'e'.repeat(32)}` });
				},
				queryReceipt: (request) => {
					calls++;
					return Promise.resolve({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'reconciled' });
				},
			});
			const params = method === 'host.invoke' ? invoke : receiptQuery;
			peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:future', method, params }));
			await settle();
			expect(calls).toBe(1);
			expect(peer.messages.at(-1)).toMatchObject({ id: 's:future', result: { effectId: 'e1' } });
			now.mockReturnValue(Date.parse('2026-10-25T00:00:01Z'));
			peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:expired', method, params }));
			await settle();
			expect(calls).toBe(1);
			expect(peer.messages.at(-1)).toMatchObject({
				id: 's:expired',
				error: { data: { kind: 'CAPABILITY_DENIED', reason: 'INVALID_HOST_LEASE' } },
			});
			installed.expiresAt = '2016-12-31T23:59:60Z';
			peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:non-comparable', method, params }));
			await settle();
			expect(calls).toBe(1);
			expect(peer.messages.at(-1)).toMatchObject({
				id: 's:non-comparable',
				error: { data: { kind: 'CAPABILITY_DENIED', reason: 'INVALID_HOST_LEASE' } },
			});
			timers.advance(30_000); expect(timers.callbacks.size).toBe(0);
		} finally {
			client.close();
			now.mockRestore();
		}
	},
);

it('delivers the shared typed cursor snapshot through BotClient and preserves the connection for the next query', async () => {
	const peer = new Peer();
	const connection = new HapConnection(peer, { after: (ms, run) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } });
	try {
		const opening = connection.connect({ name: 'events', version: '1' }); peer.reply('c:1', hello);
		const client = await opening;
		const pending = client.runs.subscribe({ profileId: 'p1', runId: 'fixture', afterSeq: '0' });
		const frame = structuredClone(fixtures.valid.find((item) => item.name === 'cursor-expired')!.payload) as unknown as { id: string };
		frame.id = 'c:2';
		peer.data(encodeHapFrame(frame as never));
		await expect(pending).rejects.toMatchObject({ name: 'BotRpcError', data: { kind: 'CURSOR_EXPIRED', details: { type: 'run-cursor', snapshotSeq: '1', snapshot: { events: expect.any(Array) } } } });
		expect(client.state).toBe('ready');
		const health = client.service.health({}); peer.reply('c:3', { status: 'ok' });
		await expect(health).resolves.toEqual({ status: 'ok' });
	} finally { connection.close(); }
});

it('notifies BotClient close listeners exactly once and releases unregistered subscribers', async () => {
	const peer = new Peer();
	const connection = new HapConnection(peer, { after: (ms, run) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } });
	const opening = connection.connect({ name: 'events', version: '1' }); peer.reply('c:1', hello);
	const client = await opening;
	const removed = vi.fn(), notified = vi.fn();
	client.onClose(removed)();
	client.onClose(() => { throw new Error('view failed'); });
	client.onClose(notified);
	peer.close(); client.close();
	expect(removed).not.toHaveBeenCalled();
	expect(notified).toHaveBeenCalledTimes(1);
	const late = vi.fn(); client.onClose(late);
	expect(late).toHaveBeenCalledTimes(1);
});

const cancelHost = (peer: Peer, requestId: string) => peer.data(encodeHapFrame({ jsonrpc: '2.0', method: '$/cancelRequest', params: { requestId } }));
async function writeReady(limits = {}) {
	const f = await ready(limits);
	const attaching = f.client.host.attach({ workspaceId: 'w1', capabilities: ['note.write'] }); f.peer.reply('c:2', lease); await attaching;
	return f;
}

it('cancels one reverse write exactly once without breaking a sibling or normal forward replies', async () => {
	const { peer, client } = await writeReady(); let release!: (receipt: HostReceipt) => void, aborted: AbortSignal | undefined;
	client.setHost({ invoke: (request, signal) => {
		if (request.effectId === 'e1') { aborted = signal; return new Promise(resolve => { release = resolve; }); }
		return Promise.resolve({ ...committed, effectId: request.effectId, fingerprint: request.fingerprint });
	}, queryReceipt: async request => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }) });
	try {
		peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:child-b', method: 'host.invoke', params: invoke }));
		cancelHost(peer, 's:child-b'); await settle();
		expect(aborted?.aborted).toBe(true); expect(client.state).toBe('ready');
		expect(peer.messages.filter(message => message.id === 's:child-b')).toEqual([expect.objectContaining({ error: expect.objectContaining({ data: expect.objectContaining({ kind: 'HOST_UNAVAILABLE', reason: 'HOST_REQUEST_ABORTED' }) }) })]);
		peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:child-c', method: 'host.invoke', params: { ...invoke, effectId: 'e2' } })); await settle();
		expect(peer.messages.at(-1)).toMatchObject({ id: 's:child-c', result: { effectId: 'e2', status: 'committed' } });
		const health = client.service.health({}); peer.reply('c:3', { status: 'ok' }); await expect(health).resolves.toEqual({ status: 'ok' });
		release(committed); await settle();
		expect(peer.messages.filter(message => message.id === 's:child-b')).toHaveLength(1);
		expect(client.state).toBe('ready');
	} finally { release?.(committed); client.close(); }
});

it('keeps the real reverse quota beyond cancellation TTL and never emits a very late second standard reply', async () => {
	const { peer, client, timers } = await writeReady({ maxHostRequests: 1 }); let release!: (receipt: HostReceipt) => void;
	client.setHost({ invoke: () => new Promise(resolve => { release = resolve; }), queryReceipt: async request => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }) });
	try {
		peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:uncancelable', method: 'host.invoke', params: invoke }));
		cancelHost(peer, 's:uncancelable'); await settle(); timers.advance(30_001); await settle();
		peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:still-full', method: 'host.queryReceipt', params: receiptQuery })); await settle();
		expect(peer.messages.at(-1)).toMatchObject({ id: 's:still-full', error: { data: { reason: 'HOST_REQUEST_LIMIT' } } });
		release(committed); await settle();
		expect(peer.messages.filter(message => message.id === 's:uncancelable')).toHaveLength(1);
		peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:after-settle', method: 'host.queryReceipt', params: receiptQuery })); await settle();
		expect(peer.messages.at(-1)).toMatchObject({ id: 's:after-settle', result: { status: 'unknown_outcome' } }); expect(client.state).toBe('ready');
	} finally { release?.(committed); client.close(); expect(timers.callbacks.size).toBe(0); }
});

it('accepts response-before-cancel as a no-op for exactly the retained association lifetime', async () => {
	const { peer, client, timers } = await writeReady();
	client.setHost({ invoke: async () => committed, queryReceipt: async request => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }) });
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:finished', method: 'host.invoke', params: invoke })); await settle();
	cancelHost(peer, 's:finished'); await settle(); expect(client.state).toBe('ready');
	expect(peer.messages.filter(message => message.id === 's:finished')).toHaveLength(1);
	timers.advance(30_001);
	const pending = client.service.health({}), rejected = expect(pending).rejects.toThrow('UNKNOWN_CANCEL_ID');
	cancelHost(peer, 's:finished'); await rejected; expect(client.state).toBe('closed'); expect(timers.callbacks.size).toBe(0);
});

it.each([false, true])('bounds settled reverse associations at 64 and expires them (expire=%s)', async expire => {
	const { peer, client, timers } = await writeReady();
	client.setHost({ invoke: async () => committed, queryReceipt: async request => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }) });
	try {
		for (let i = 0; i < 64; i++) { peer.data(encodeHapFrame({ jsonrpc: '2.0', id: `s:query${i}`, method: 'host.queryReceipt', params: receiptQuery })); await settle(); }
		if (expire) timers.advance(30_001);
		peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:query65', method: 'host.queryReceipt', params: receiptQuery })); await settle();
		expect(client.state).toBe(expire ? 'ready' : 'closed');
		if (expire) expect(peer.messages.at(-1)).toMatchObject({ id: 's:query65', result: { status: 'unknown_outcome' } });
	} finally { client.close(); expect(timers.callbacks.size).toBe(0); }
});

it('keeps only one known late forward reply and rejects unknown or duplicate response IDs', async () => {
	const { peer, client } = await ready(); const controller = new AbortController();
	const one = client.service.health({}, { signal: controller.signal }); controller.abort(); await expect(one).rejects.toThrow('REQUEST_ABORTED');
	peer.reply('c:2', { status: 'ok' }); expect(client.state).toBe('ready');
	const sibling = client.service.health({}), rejected = expect(sibling).rejects.toThrow('UNKNOWN_RESPONSE_ID');
	peer.reply('c:2', { status: 'ok' }); await rejected; expect(client.state).toBe('closed');
});

it('expires forward cancellation associations instead of ignoring arbitrarily late frames', async () => {
	const { peer, client, timers } = await ready(); const controller = new AbortController();
	const one = client.service.health({}, { signal: controller.signal }); controller.abort(); await expect(one).rejects.toThrow('REQUEST_ABORTED');
	timers.advance(30_001);
	const sibling = client.service.health({}), rejected = expect(sibling).rejects.toThrow('UNKNOWN_RESPONSE_ID');
	peer.reply('c:2', { status: 'ok' }); await rejected; expect(client.state).toBe('closed'); expect(timers.callbacks.size).toBe(0);
});

it('bounds abandoned forward requests without replaying them or leaking timers', async () => {
	const { client, peer, timers } = await ready();
	for (let i = 0; i < 33; i++) {
		const controller = new AbortController(); const one = client.service.health({}, { signal: controller.signal }); controller.abort(); await expect(one).rejects.toThrow('REQUEST_ABORTED');
	}
	expect(client.state).toBe('closed'); expect(peer.messages).toHaveLength(34); expect(timers.callbacks.size).toBe(0);
});

it('preserves the existing UNSAVED_EDITOR_CHANGES kind and safe reason on the public reverse HAP error', async () => {
	const { client, peer } = await writeReady();
	client.setHost({ invoke: async () => { throw new BotRpcError(-32000, { kind: 'UNSAVED_EDITOR_CHANGES', reason: 'UNSAVED_EDITOR_CHANGES', retryable: false, correlationId: 'local' }); },
		queryReceipt: async request => ({ effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' }) });
	peer.data(encodeHapFrame({ jsonrpc: '2.0', id: 's:dirty', method: 'host.invoke', params: invoke })); await settle();
	expect(peer.messages.at(-1)).toMatchObject({ id: 's:dirty', error: { data: { kind: 'UNSAVED_EDITOR_CHANGES', reason: 'UNSAVED_EDITOR_CHANGES' } } });
	client.close();
});


it('exposes the frozen recovery query and enforces resume CAS before forwarding to the actual HAP boundary', async () => {
	const { peer, client } = await ready();
	const recovery: RecoveryStatus = { runId: 'run:one', rootRunId: 'run:root', revision: '4', state: 'ready', generation: '2', affectedRunIds: ['run:one'] };
	try {
		const reading = client.runs.recovery({ profileId: 'p1', id: 'run:one' });
		peer.reply('c:2', recovery); await expect(reading).resolves.toEqual(recovery);
		await expect(client.runs.resume({ profileId: 'p1', commandEpoch: '1', commandId: 'command:resume', idempotencyKey: 'key:resume', id: 'run:one', recoveryGeneration: '2' } as never)).rejects.toThrow('INVALID_METHOD_PARAMS');
		expect(peer.messages).toHaveLength(2);
	} finally { client.close(); }
});
