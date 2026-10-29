import { expect, test, vi } from 'vitest';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { DirectoryPort, WriterLease } from '../../core/space/ports';
import { SpaceService } from './space-service';

function fixture() {
	const files = new Map<string, string>(), root = { canonicalPath: '/fixture', dev: '1', ino: '2' };
	const vault = { vaultId: 'fixture', deviceId: 'fixture', rootPath: '/fixture', root };
	const lease: WriterLease = { instanceId: 'fixture', port: 1, lost: new AbortController().signal, assertHeld: async () => {}, close: vi.fn(async () => {}) };
	const directories: DirectoryPort = { inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }),
		chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/fixture' }) };
	const storage: TextStorage = { exists: async path => files.has(path), read: async path => files.get(path)!, mkdir: async () => {}, write: vi.fn(async (path, text) => { files.set(path, text); }) };
	const service = new SpaceService({ storage, directories, owners: { acquire: async () => lease }, instanceId: 'fixture', report: vi.fn() });
	return { service, storage, files, lease };
}

test('launch admission verifies the durable runtime attempt before returning and does not overwrite an unconfirmed attempt', async () => {
	const f = fixture();
	try {
		const space = await f.service.create({ name: 'A', relativePath: '' });
		const admission = await f.service.prepareSession(space.id, { kind: 'shell', title: 'Shell' });
		expect(admission).toMatchObject({ runtimeId: expect.any(String), record: { lastAttempt: { runtimeId: expect.any(String), state: 'unconfirmed' } } });
		const saved = JSON.parse(f.files.get(f.service.path)!);
		expect(saved.sessions[admission.record.id].lastAttempt).toEqual(admission.record.lastAttempt);
		const before = f.files.get(f.service.path);
		await expect(f.service.prepareSession(space.id, { kind: 'shell', title: 'retry' }, admission.record.id)).rejects.toMatchObject({ code: 'EFFECT_UNKNOWN', reason: 'attempt-unconfirmed' });
		expect(f.files.get(f.service.path)).toBe(before);
	} finally { await f.service.dispose(); }
});

test('archive preview is read-only and its queue gate fences in-flight launches without blocking unrelated writes', async () => {
	const f = fixture();
	try {
		const a = await f.service.create({ name: 'A' }), b = await f.service.create({ name: 'B' });
		const admission = await f.service.prepareSession(a.id, { kind: 'shell', title: 'Shell' });
		const writes = vi.mocked(f.storage.write).mock.calls.length;
		const plan = await f.service.inspectArchive({ kind: 'space', spaceId: a.id });
		expect(vi.mocked(f.storage.write).mock.calls).toHaveLength(writes);
		const permit = await f.service.acquireArchive(plan);
		await expect(admission.beforeSpawn()).rejects.toMatchObject({ reason: 'archive-in-progress' });
		await expect(f.service.prepareSession(a.id, { kind: 'shell', title: 'blocked' })).rejects.toMatchObject({ reason: 'archive-in-progress' });
		await f.service.rename(b.id, 'B2');
		await expect(f.service.commitArchive(permit)).rejects.toMatchObject({ reason: 'attempt-unconfirmed' });
		const termination = { root: { state: 'not-started' as const, code: null, signal: null }, cleanup: { state: 'confirmed' as const, scope: 'not-started' as const, remainingKnown: 0 }, output: 'drained' as const };
		await f.service.checkpointAttempt({ spaceId: a.id, sessionId: admission.record.id, runtimeId: admission.runtimeId }, termination);
		await f.service.commitArchive(permit);
		expect(f.service.store.getState().records.spaces[a.id]?.archived).toBe(true);
		expect(f.service.store.getState().records.sessions[admission.record.id]?.archived).not.toBe(true);
		f.service.releaseArchive(permit);
	} finally { await f.service.dispose(); }
});

test('a changed archive scope is rejected before a gate or stop effect', async () => {
	const f = fixture();
	try {
		const a = await f.service.create({ name: 'A' });
		const plan = await f.service.inspectArchive({ kind: 'space', spaceId: a.id });
		const admission = await f.service.prepareSession(a.id, { kind: 'shell', title: 'late' });
		await expect(f.service.acquireArchive(plan)).rejects.toMatchObject({ code: 'STALE_RUNTIME', reason: 'archive-scope-changed' });
		await expect(admission.beforeSpawn()).resolves.toBeUndefined();
	} finally { await f.service.dispose(); }
});

test('cancelling while archive backup writes cannot admit a later archive primary', async () => {
	const f = fixture(); let release!: () => void, enter!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; }), entered = new Promise<void>(resolve => { enter = resolve; });
	let operation: Promise<void> | undefined;
	try {
		const space = await f.service.create({ name: 'archive' }), permit = await f.service.acquireArchive(await f.service.inspectArchive({ kind: 'space', spaceId: space.id }));
		const write = f.storage.write, primary = vi.fn();
		f.storage.write = async (path, text) => { if (path === f.service.path + '.backup') { enter(); await gate; } if (path === f.service.path) primary(); await write(path, text); };
		let cancelled = false;
		operation = f.service.commitArchive(permit, () => { if (cancelled) throw new Error('cancelled-before-primary'); });
		await entered; cancelled = true; release();
		let failure: unknown; await operation.catch(error => { failure = error; });
		expect(failure).toBeDefined(); expect(primary).not.toHaveBeenCalled();
		expect(f.service.store.getState().records.spaces[space.id]?.archived).toBe(false);
		f.service.releaseArchive(permit);
	} finally { release(); await operation?.catch(() => {}); await f.service.dispose().catch(() => {}); }
});
