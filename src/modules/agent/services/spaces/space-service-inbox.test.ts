import { expect, test, vi } from 'vitest';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { DirectoryPort, WriterLease, WriterOwnerPort } from '../../core/space/ports';
import type { VaultBinding } from '../../core/space/model';
import { emptyRecords } from './records';
import { SpaceService } from './space-service';

const vault: VaultBinding = { vaultId: 'v', deviceId: 'd', rootPath: '/vault', root: { canonicalPath: '/vault', dev: '1', ino: '2' } };
function fixture() {
	const path = '.huhu/terminal-agent/d/workbench-v2.json';
	const files = new Map<string, string>();
	const storage: TextStorage = {
		exists: async (p) => files.has(p), read: async (p) => files.get(p)!,
		write: vi.fn(async (p, text) => { files.set(p, text); }), mkdir: vi.fn(async () => {}),
	};
	const lease: WriterLease = { instanceId: 'i', port: 1, lost: new AbortController().signal, assertHeld: async () => {}, close: async () => {} };
	const directories: DirectoryPort = {
		inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: vault.root }),
		chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/same-cwd' }),
	};
	const owners: WriterOwnerPort = { acquire: vi.fn(async () => lease) };
	const service = new SpaceService({ storage, directories, owners, instanceId: 'i', report: vi.fn() });
	return { service, storage, files, owners, directories, path };
}
const recipient = (spaceId: string, sessionId: string) => ({ spaceId, sessionId });

async function target(service: SpaceService, name: string) {
	const space = await service.create({ name, relativePath: '' });
	const admission = await service.prepareSession(space.id, { kind: 'agent', title: name, agentId: 'codex' });
	await service.checkpointAttempt({ spaceId: space.id, sessionId: admission.record.id, runtimeId: admission.runtimeId }, {
		root: { state: 'exited', code: 0, signal: null }, cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 }, output: 'drained',
	});
	return { space, sessionId: admission.record.id };
}

test('send/read/ack preserve explicit Space and Session identity, including stopped recipients', async () => {
	const f = fixture();
	const a = await target(f.service, 'A');
	const b = await target(f.service, 'B');
	const first = await f.service.sendInbox({ messageId: 'm-a', recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'A' });
	const second = await f.service.sendInbox({ messageId: 'm-b', recipient: recipient(b.space.id, b.sessionId), source: 'test', body: 'B' });
	expect((await f.service.listInbox({ spaceId: a.space.id, sessionId: a.sessionId })).rows.map((row) => row.messageId)).toEqual(['m-a']);
	const summary = (await f.service.listInbox({ spaceId: a.space.id, sessionId: a.sessionId })).rows[0] as unknown as Record<string, unknown>;
	expect(summary.body).toBeUndefined();
	expect(summary.references).toBeUndefined();
	expect((await f.service.readInbox(second.messageId)).recipient).toEqual(recipient(b.space.id, b.sessionId));
	const ack = await f.service.ackInbox(first.messageId);
	expect(ack.status).toBe('ack-saved');
	const before = vi.mocked(f.storage.write).mock.calls.length;
	expect((await f.service.ackInbox(first.messageId)).status).toBe('already-acked');
	expect(vi.mocked(f.storage.write).mock.calls.length).toBe(before);
	await f.service.dispose();
});

test('duplicate message IDs and archived targets are rejected without replacing old records', async () => {
	const f = fixture();
	const a = await target(f.service, 'A');
	await f.service.sendInbox({ messageId: 'same', recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'original' });
	await expect(f.service.sendInbox({ messageId: 'same', recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'replacement' })).rejects.toMatchObject({ reason: 'message-id-exists' });
	const plan = await f.service.inspectArchive({ kind: 'session', spaceId: a.space.id, sessionId: a.sessionId });
	const permit = await f.service.acquireArchive(plan);
	await f.service.commitArchive(permit);
	await expect(f.service.sendInbox({ messageId: 'archived', recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'blocked' })).rejects.toMatchObject({ reason: 'archived-session' });
	await expect(f.service.readInbox('same')).resolves.toMatchObject({ body: 'original' });
	await f.service.dispose();
});

test('cold duplicate-ack observation reads primary without recovery writes', async () => {
	const f = fixture();
	const a = await target(f.service, 'A');
	await f.service.sendInbox({ messageId: 'cold', recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'body' });
	await f.service.ackInbox('cold');
	await f.service.dispose();
	const writes = vi.mocked(f.storage.write);
	writes.mockClear();
	const second = new SpaceService({ storage: f.storage, directories: f.directories, owners: f.owners, instanceId: 'second', report: vi.fn() });
	await second.ready;
	expect((await second.ackInbox('cold')).status).toBe('already-acked');
	expect(writes).not.toHaveBeenCalled();
	await second.dispose();
});

test('fresh primary distinguishes initial empty from a previously present primary that disappears', async () => {
	const f = fixture();
	await f.service.ready;
	expect((await f.service.freshInboxPrimary()).freshness).toBe('fresh');
	const a = await target(f.service, 'A');
	await f.service.sendInbox({ messageId: 'known', recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'body' });
	f.files.delete(f.path);
	const view = await f.service.freshInboxPrimary();
	expect(view.freshness).toBe('unknown');
	expect(view.records).toBeUndefined();
});

test('cancelled send is rejected before owner initialization and cannot write later', async () => {
	const f = fixture();
	const a = await target(f.service, 'A');
	const abort = new AbortController();
	abort.abort();
	await expect(f.service.sendInbox({ messageId: 'cancelled', recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'body' }, { signal: abort.signal })).rejects.toMatchObject({ code: 'WAIT_CANCELLED' });
	expect(f.owners.acquire).toHaveBeenCalledTimes(1); // target setup owns the only permit; cancellation adds no writer
	expect(JSON.parse(f.files.get(f.path)!).inbox).toBeUndefined();
	await f.service.dispose();
});

test('stable pagination keeps a frozen high-water across append and invalidates on in-fence replacement', async () => {
	const f = fixture();
	const a = await target(f.service, 'paged');
	for (const id of ['p1', 'p2', 'p3'])
		await f.service.sendInbox({ messageId: id, recipient: recipient(a.space.id, a.sessionId), source: 'test', body: id });
	const first = await f.service.listInbox({ spaceId: a.space.id, sessionId: a.sessionId, limit: 1 });
	expect(first.rows.map((row) => row.messageId)).toEqual(['p1']);
	expect(first.highWaterSequence).toBe(3);
	await f.service.sendInbox({ messageId: 'outside', recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'outside' });
	const second = await f.service.listInbox({ spaceId: a.space.id, sessionId: a.sessionId, afterSequence: first.nextSequence, highWaterSequence: first.highWaterSequence, generation: first.generation, limit: 10 });
	expect(second.rows.map((row) => row.messageId)).toEqual(['p2', 'p3']);
	expect(second.highWaterSequence).toBe(first.highWaterSequence);
	const primary = JSON.parse(f.files.get(f.path)!);
	primary.inbox.messages[1].body = 'replaced-inside-fence';
	f.files.set(f.path, JSON.stringify(primary));
	await expect(f.service.listInbox({ spaceId: a.space.id, sessionId: a.sessionId, afterSequence: first.nextSequence, highWaterSequence: first.highWaterSequence, generation: first.generation, limit: 10 })).rejects.toMatchObject({ code: 'STALE_RUNTIME', reason: 'inbox-page-stale' });
	await f.service.dispose();
});

test('fence fingerprints stay bounded, cursor resources cap at sixteen, and TTL/dispose clear old pages', async () => {
	const f = fixture();
	const a = await target(f.service, 'bounded');
	for (let index = 0; index < 20; index += 1) {
		await f.service.sendInbox({ messageId: `bounded-${index}`, recipient: recipient(a.space.id, a.sessionId), source: 'test', body: 'x'.repeat(2000) });
		await f.service.listInbox({ spaceId: a.space.id, sessionId: a.sessionId, limit: 1 });
	}
	const internals = f.service as unknown as { inboxFences: Map<string, { fingerprint: string }>; inboxLatestFences: Map<string, unknown> };
	expect(internals.inboxFences.size).toBeLessThanOrEqual(16);
	expect(internals.inboxLatestFences.size).toBeLessThanOrEqual(16);
	for (const fence of internals.inboxFences.values()) expect(fence.fingerprint).toHaveLength(16);
	const page = await f.service.listInbox({ spaceId: a.space.id, sessionId: a.sessionId, limit: 1 });
	vi.useFakeTimers({ now: Date.now() });
	try {
		await vi.advanceTimersByTimeAsync(10_001);
		await expect(f.service.listInbox({ spaceId: a.space.id, sessionId: a.sessionId, highWaterSequence: page.highWaterSequence, generation: page.generation, limit: 1 })).rejects.toMatchObject({ code: 'STALE_RUNTIME' });
	} finally {
		vi.useRealTimers();
	}
	await f.service.dispose();
	expect(internals.inboxFences.size).toBe(0);
	expect(internals.inboxLatestFences.size).toBe(0);
});
