import { expect, test, vi } from 'vitest';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { DirectoryPort, WriterLease, WriterOwnerPort } from '../../core/space/ports';
import type { VaultBinding } from '../../core/space/model';
import { SpaceService } from './space-service';

const vault: VaultBinding = {
	vaultId: 'v',
	deviceId: 'd',
	rootPath: '/vault',
	root: { canonicalPath: '/vault', dev: '1', ino: '2' },
};
export function spaceFixture() {
	const files = new Map<string, string>();
	const lost = new AbortController();
	const lease: WriterLease = {
		instanceId: 'i',
		port: 12345,
		lost: lost.signal,
		assertHeld: vi.fn(async () => {
			if (lost.signal.aborted) throw new Error('lost');
		}),
		close: vi.fn(async () => {}),
	};
	const owners: WriterOwnerPort = { acquire: vi.fn(async () => lease) };
	const directories: DirectoryPort = {
		inspectVault: vi.fn(async () => vault),
		assertVault: vi.fn(async () => {}),
		bindVaultDirectory: vi.fn(async (_v, relativePath) => ({
			kind: 'vault' as const,
			relativePath,
			target: vault.root,
		})),
		chooseExternalDirectory: vi.fn(async () => undefined),
		resolveDirectory: vi.fn(async () => ({ cwd: '/vault' })),
	};
	const storage: TextStorage = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p)!,
		mkdir: vi.fn(async () => {}),
		write: vi.fn(async (p, text) => {
			files.set(p, text);
		}),
	};
	const service = new SpaceService({ storage, directories, owners, instanceId: 'i', report: vi.fn() });
	return { service, files, storage, directories, owners, lease, lost };
}

test('read-only initialization has no writer; same cwd/name create distinct persistent identities and exact resolver never guesses', async () => {
	const f = spaceFixture();
	await f.service.ready;
	expect(f.owners.acquire).not.toHaveBeenCalled();
	expect(f.storage.write).not.toHaveBeenCalled();
	const a = await f.service.create({ name: 'same', relativePath: '' });
	const b = await f.service.create({ name: 'same', relativePath: '' });
	expect(a.id).not.toBe(b.id);
	expect(() => f.service.resolve()).toThrow('TARGET_REQUIRED');
	expect(() => f.service.resolve({ name: 'same' })).toThrow('TARGET_AMBIGUOUS');
	await f.service.rename(a.id, 'new');
	expect(f.service.resolve({ spaceId: a.id })).toMatchObject({ id: a.id, name: 'new' });
	expect(Object.keys(f.service.store.getState().records.layouts)).toEqual([a.id, b.id]);
	await f.service.dispose();
});

test('failed metadata commit rejects before launch admission and keeps the previous valid primary', async () => {
	const f = spaceFixture();
	const a = await f.service.create({ name: 'a', relativePath: '' });
	const before = f.files.get(f.service.path);
	f.storage.write = vi.fn(async () => {
		throw new Error('full');
	});
	await expect(f.service.prepareSession(a.id, { kind: 'shell', title: 'shell' })).rejects.toMatchObject({
		code: 'PERSISTENCE_FAILED',
	});
	expect(f.files.get(f.service.path)).toBe(before);
	expect(Object.keys(f.service.store.getState().records.sessions)).toHaveLength(0);
	await expect(f.service.flush()).rejects.toBeDefined();
	await expect(f.service.dispose()).rejects.toBeDefined();
	expect(f.lease.close).toHaveBeenCalledOnce();
});

test('external chooser receipts are single-use, service-owned, cancellation/late choice do not mint grants', async () => {
	const f = spaceFixture();
	await f.service.ready;
	await expect(f.service.create({ name: 'bad', externalReceipt: 'forged' })).rejects.toMatchObject({
		code: 'DIRECTORY_NOT_AUTHORIZED',
	});
	vi.mocked(f.directories.chooseExternalDirectory).mockResolvedValue({
		selectedPath: '/outside',
		target: { canonicalPath: '/outside', dev: '1', ino: '3' },
		deviceId: 'd',
		vaultRoot: vault.root,
	});
	const receipt = await f.service.chooseExternal();
	expect(Object.keys(f.service.store.getState().records.grants)).toHaveLength(0);
	await f.service.create({ name: 'external', externalReceipt: receipt!.receipt });
	await expect(f.service.create({ name: 'replay', externalReceipt: receipt!.receipt })).rejects.toMatchObject({
		code: 'DIRECTORY_NOT_AUTHORIZED',
	});
	const cancel = new AbortController();
	cancel.abort();
	expect(await f.service.chooseExternal(cancel.signal)).toBeUndefined();
	expect(Object.keys(f.service.store.getState().records.grants)).toHaveLength(1);
	await f.service.dispose();
});

test('owner loss rejects writes and final launch validation without reacquiring', async () => {
	const f = spaceFixture();
	const a = await f.service.create({ name: 'a', relativePath: '' });
	const admission = await f.service.prepareSession(a.id, { kind: 'shell', title: 'shell' });
	f.lost.abort();
	await expect(admission.beforeSpawn()).rejects.toMatchObject({ code: 'OWNER_CONFLICT' });
	await expect(f.service.rename(a.id, 'bad')).rejects.toMatchObject({ code: 'OWNER_CONFLICT' });
	expect(f.owners.acquire).toHaveBeenCalledOnce();
	await expect(f.service.dispose()).rejects.toBeDefined();
});

test('dispose closes admission immediately but drains accepted write and readback before listener close', async () => {
	const f = spaceFixture();
	let release!: () => void;
	const blocked = new Promise<void>((resolve) => {
		release = resolve;
	});
	let started!: () => void;
	const entered = new Promise<void>((resolve) => {
		started = resolve;
	});
	const write = f.storage.write;
	f.storage.write = async (p, value) => {
		started();
		await blocked;
		await write(p, value);
	};
	const pending = f.service.create({ name: 'a', relativePath: '' });
	await entered;
	const closing = f.service.dispose();
	await expect(f.service.rename('x', 'new')).rejects.toMatchObject({ code: 'OWNER_CONFLICT' });
	expect(f.lease.close).not.toHaveBeenCalled();
	release();
	await pending;
	await closing;
	expect(f.lease.close).toHaveBeenCalledOnce();
});

test('future primary versions cannot fall back to an older backup or acquire a writer', async () => {
	const f = spaceFixture();
	await f.service.create({ name: 'saved', relativePath: '' });
	await f.service.dispose();
	f.files.set(f.service.path + '.backup', f.files.get(f.service.path)!);
	const future = '{"version":3,"preserve":"future"}';
	f.files.set(f.service.path, future);
	vi.mocked(f.storage.write).mockClear();
	vi.mocked(f.owners.acquire).mockClear();
	const second = new SpaceService({
		storage: f.storage,
		directories: f.directories,
		owners: f.owners,
		instanceId: 'second',
		report: vi.fn(),
	});
	await expect(second.ready).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED', reason: 'unsupported-version' });
	await expect(second.create({ name: 'bad', relativePath: '' })).rejects.toBeDefined();
	expect(f.storage.write).not.toHaveBeenCalled();
	expect(f.owners.acquire).not.toHaveBeenCalled();
	expect(f.files.get(f.service.path)).toBe(future);
	await expect(second.dispose()).rejects.toBeDefined();
});

test('backup recovery is read-only until a permit; recovery corrupt/backup/mkdir/readback stay inside the owner lifetime', async () => {
	const f = spaceFixture();
	const a = await f.service.create({ name: 'saved', relativePath: '' });
	await f.service.dispose();
	f.files.set(f.service.path + '.backup', f.files.get(f.service.path)!);
	f.files.set(f.service.path, '{broken');
	vi.mocked(f.storage.write).mockClear();
	const second = new SpaceService({
		storage: f.storage,
		directories: f.directories,
		owners: f.owners,
		instanceId: 'second',
		report: vi.fn(),
	});
	await second.ready;
	expect(f.storage.write).not.toHaveBeenCalled();
	expect(f.files.get(f.service.path)).toBe('{broken');
	await second.rename(a.id, 'recovered');
	expect(f.files.get(f.service.path + '.corrupt')).toBe('{broken');
	expect(JSON.parse(f.files.get(f.service.path)!).spaces[a.id].name).toBe('recovered');
	await second.dispose();
});

test('a late external choice after cancellation or disposal is ignored without minting a receipt or grant', async () => {
	const f = spaceFixture();
	let release!: (value: {
		selectedPath: string;
		target: typeof vault.root;
		deviceId: string;
		vaultRoot: typeof vault.root;
	}) => void;
	vi.mocked(f.directories.chooseExternalDirectory).mockImplementation(
		() =>
			new Promise((resolve) => {
				release = resolve;
			}),
	);
	await f.service.ready;
	const abort = new AbortController();
	const choosing = f.service.chooseExternal(abort.signal);
	await Promise.resolve();
	abort.abort();
	await f.service.dispose();
	release({ selectedPath: '/outside', target: vault.root, deviceId: 'd', vaultRoot: vault.root });
	expect(await choosing).toBeUndefined();
	expect(Object.keys(f.service.store.getState().records.grants)).toHaveLength(0);
	expect(f.owners.acquire).not.toHaveBeenCalled();
});

test('revoking a saved grant invalidates an already committed launch admission', async () => {
	const f = spaceFixture();
	vi.mocked(f.directories.chooseExternalDirectory).mockResolvedValue({
		selectedPath: '/external',
		target: { canonicalPath: '/external', dev: '1', ino: '3' },
		deviceId: 'd',
		vaultRoot: vault.root,
	});
	const receipt = await f.service.chooseExternal();
	const space = await f.service.create({ name: 'external', externalReceipt: receipt!.receipt });
	const admitted = await f.service.prepareSession(space.id, { kind: 'shell', title: 'shell' });
	if (space.directory.kind !== 'external') throw new Error('expected external');
	await f.service.revokeGrant(space.directory.grantId);
	await expect(admitted.beforeSpawn()).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED' });
	await f.service.dispose();
});

test('T06 activity hints coalesce behind one actual writer and timeout only observes', async () => {
	const f = spaceFixture();
	const space = await f.service.create({ name: 'hints', relativePath: '' });
	const admission = await f.service.prepareSession(space.id, { kind: 'agent', agentId: 'pi', title: 'pi' });
	const target = { spaceId: space.id, sessionId: admission.record.id, runtimeId: admission.runtimeId };
	let release!: () => void, entered!: () => void;
	const gate = new Promise<void>((r) => (release = r)),
		started = new Promise<void>((r) => (entered = r));
	const original = f.storage.write;
	let hold = true;
	f.storage.write = async (p, text) => {
		if (hold) {
			hold = false;
			entered();
			await gate;
		}
		await original(p, text);
	};
	try {
		expect(
			f.service.stageActivityHint(target, {
				runtimeId: target.runtimeId,
				activitySequence: 1,
				observedAt: 1,
				seenThrough: 0,
			}),
		).toBe(true);
		await started;
		for (let n = 2; n <= 1000; n++)
			expect(
				f.service.stageActivityHint(target, {
					runtimeId: target.runtimeId,
					activitySequence: n,
					observedAt: n,
					seenThrough: 0,
				}),
			).toBe(true);
		const final = { runtimeId: target.runtimeId, activitySequence: 1000, observedAt: 1000, seenThrough: 999 };
		await expect(f.service.observeActivityHint(target, final, { timeoutMs: 1 })).rejects.toMatchObject({
			code: 'WAIT_TIMEOUT',
		});
		expect(f.service.activityHintUsage()).toMatchObject({ inFlight: 1, dirtyTargets: 1, waiters: 0 });
		expect(f.lease.close).not.toHaveBeenCalled();
		release();
		await f.service.flush();
		expect(f.service.store.getState().records.sessions[target.sessionId]?.completionHint).toEqual(final);
		expect(f.service.activityHintUsage()).toMatchObject({ inFlight: 0, dirtyTargets: 0, waiters: 0 });
	} finally {
		release();
		await f.service.dispose();
	}
});

test('T06 timed out hint observer preserves writer isolation and later rejection for strict drain', async () => {
	const f = spaceFixture();
	const space = await f.service.create({ name: 'late', relativePath: '' });
	const a = await f.service.prepareSession(space.id, { kind: 'shell', title: 's' }),
		ref = { spaceId: space.id, sessionId: a.record.id, runtimeId: a.runtimeId };
	let fail!: (error: Error) => void, entered!: () => void;
	const started = new Promise<void>((r) => (entered = r)),
		gate = new Promise<void>((_r, reject) => (fail = reject));
	f.storage.write = async () => {
		entered();
		await gate;
	};
	const wait = f.service.observeActivityHint(
		ref,
		{ runtimeId: ref.runtimeId, activitySequence: 1, observedAt: 1, seenThrough: 0 },
		{ timeoutMs: 1 },
	);
	await started;
	await expect(wait).rejects.toMatchObject({ code: 'WAIT_TIMEOUT' });
	const closing = f.service.dispose();
	expect(f.lease.close).not.toHaveBeenCalled();
	fail(new Error('hint disk late failure'));
	await expect(closing).rejects.toBeDefined();
	expect(f.lease.close).toHaveBeenCalledOnce();
	expect(f.service.activityHintError(ref)).toBeInstanceOf(Error);
});

test('T06 stalled writer admits at most 32 dirty targets and 32 observation waiters', async () => {
	const f = spaceFixture(),
		space = await f.service.create({ name: 'bounded', relativePath: '' });
	const refs: Array<{ spaceId: string; sessionId: string; runtimeId: string }> = [];
	for (let n = 0; n < 33; n++) {
		const a = await f.service.prepareSession(space.id, { kind: 'shell', title: String(n) });
		refs.push({ spaceId: space.id, sessionId: a.record.id, runtimeId: a.runtimeId });
	}
	let release!: () => void, entered!: () => void;
	const gate = new Promise<void>((r) => (release = r)),
		started = new Promise<void>((r) => (entered = r)),
		write = f.storage.write;
	let once = true;
	f.storage.write = async (p, text) => {
		if (once) {
			once = false;
			entered();
			await gate;
		}
		await write(p, text);
	};
	const hint = (runtimeId: string) => ({ runtimeId, activitySequence: 1, observedAt: 1, seenThrough: 0 });
	try {
		expect(f.service.stageActivityHint(refs[0]!, hint(refs[0]!.runtimeId))).toBe(true);
		await started;
		for (let n = 1; n < 32; n++) expect(f.service.stageActivityHint(refs[n]!, hint(refs[n]!.runtimeId))).toBe(true);
		expect(f.service.stageActivityHint(refs[32]!, hint(refs[32]!.runtimeId))).toBe(false);
		const controllers = Array.from({ length: 32 }, () => new AbortController());
		const waits = controllers.map((c) =>
			f.service.observeActivityHint(refs[0]!, hint(refs[0]!.runtimeId), { signal: c.signal }).catch((e) => e),
		);
		expect(f.service.activityHintUsage()).toMatchObject({ inFlight: 1, dirtyTargets: 31, waiters: 32 });
		await expect(f.service.observeActivityHint(refs[0]!, hint(refs[0]!.runtimeId))).rejects.toMatchObject({
			reason: 'activity-capacity',
		});
		controllers.forEach((c) => c.abort());
		await Promise.all(waits);
		expect(f.service.activityHintUsage().waiters).toBe(0);
		release();
		await f.service.flush();
	} finally {
		release();
		await f.service.dispose();
	}
});

test('T06 older captured completion merges seen into the newer durable hint without lowering completion', async () => {
	const f = spaceFixture(),
		space = await f.service.create({ name: 'monotone', relativePath: '' });
	const a = await f.service.prepareSession(space.id, { kind: 'shell', title: 's' }),
		ref = { spaceId: space.id, sessionId: a.record.id, runtimeId: a.runtimeId };
	try {
		await f.service.observeActivityHint(ref, {
			runtimeId: ref.runtimeId,
			activitySequence: 5,
			observedAt: 5,
			seenThrough: 0,
		});
		expect(
			f.service.stageActivityHint(ref, {
				runtimeId: ref.runtimeId,
				activitySequence: 3,
				observedAt: 3,
				seenThrough: 3,
			}),
		).toBe(true);
		await f.service.flush();
		expect(f.service.store.getState().records.sessions[ref.sessionId]?.completionHint).toMatchObject({
			activitySequence: 5,
			seenThrough: 3,
			observedAt: 5,
		});
	} finally {
		await f.service.dispose();
	}
});
