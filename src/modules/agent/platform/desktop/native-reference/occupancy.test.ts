import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
	NativeOccupancy,
	defaultOccupancyDirectory,
	processStartMarker,
	type OccupancyOwner,
	type OccupancyPorts,
} from './occupancy';
import { occupancyIdentity, nativeOccupancyDigest } from './reference';

let dir: string;
beforeEach(async () => {
	dir = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-occupancy-'));
});
afterEach(async () => {
	await fs.rm(dir, { recursive: true, force: true });
});
const ref = occupancyIdentity({ provider: 'codex', nativeSessionId: 'native-1' }, '/home/u/.codex/sessions/a.jsonl');
const owner = (instanceId: string): OccupancyOwner => ({
	instanceId,
	vaultId: 'vault',
	spaceId: 'space',
	sessionId: 'session',
});
/** One simulated HUHU instance: its own pid, and a shared world of which pids are alive. */
function instance(pid: number, world: Map<number, string | undefined>, hostname = 'host'): NativeOccupancy {
	const ports: OccupancyPorts = {
		directory: dir,
		pid,
		hostname,
		now: Date.now,
		processStart: async (value) => (world.has(value) ? world.get(value) : null),
	};
	return new NativeOccupancy(ports);
}

test('two instances racing for one native reference: exactly one acquires, the other gets a conflict', async () => {
	const world = new Map<number, string | undefined>([
		[100, 's100'],
		[200, 's200'],
	]);
	const a = instance(100, world),
		b = instance(200, world);
	const results = await Promise.all([a.acquire(ref, owner('A')), b.acquire(ref, owner('B'))]);
	const acquired = results.filter((result) => result.kind === 'acquired');
	expect(acquired).toHaveLength(1);
	const conflict = results.find((result) => result.kind === 'conflict');
	expect(conflict).toMatchObject({ kind: 'conflict', reason: 'held', self: false });
	if (conflict?.kind === 'conflict') expect(['A', 'B']).toContain(conflict.owner?.instanceId);
	// The lock is outside any vault and holds no secret: only identity and liveness facts.
	const files = await fs.readdir(dir);
	expect(files).toEqual([`${nativeOccupancyDigest(ref)}.lock`]);
});

test('the holder itself is reported as self, and a different reference is not blocked', async () => {
	const world = new Map<number, string | undefined>([[100, 's']]);
	const a = instance(100, world);
	expect((await a.acquire(ref, owner('A'))).kind).toBe('acquired');
	expect(await a.acquire(ref, owner('A'))).toMatchObject({ kind: 'conflict', self: true });
	const other = occupancyIdentity({ provider: 'codex', nativeSessionId: 'native-2' }, '/p/native-2.jsonl');
	expect((await a.acquire(other, owner('A'))).kind).toBe('acquired');
});

test('a stale lock is reclaimed only with evidence that the owner process is gone', async () => {
	const world = new Map<number, string | undefined>([
		[100, 's100'],
		[200, 's200'],
	]);
	const first = await instance(100, world).acquire(ref, owner('A'));
	expect(first.kind).toBe('acquired');
	// Owner alive: never reclaimed.
	expect(await instance(200, world).acquire(ref, owner('B'))).toMatchObject({ kind: 'conflict', reason: 'held' });
	// Owner pid recycled by an unrelated process (different start marker): the original owner is gone.
	world.set(100, 'recycled');
	const reclaimed = await instance(200, world).acquire(ref, owner('B'));
	expect(reclaimed.kind).toBe('acquired');
	// The old owner's late release must not delete the new owner's lock.
	if (first.kind === 'acquired') await first.lease.release();
	expect(await instance(200, world).inspect(ref)).toMatchObject({ instanceId: 'B' });
});

test('an owner that disappeared entirely is reclaimed; an unverifiable owner is not', async () => {
	const world = new Map<number, string | undefined>([
		[100, 's100'],
		[200, 's200'],
		[300, undefined],
	]);
	await instance(100, world).acquire(ref, owner('A'));
	world.delete(100);
	expect((await instance(200, world).acquire(ref, owner('B'))).kind).toBe('acquired');
	// A lock written on another host cannot be proven dead from here.
	const other = occupancyIdentity({ provider: 'codex', nativeSessionId: 'remote' }, '/p/remote.jsonl');
	await instance(300, world, 'other-host').acquire(other, owner('R'));
	world.delete(300);
	expect(await instance(200, world).acquire(other, owner('B'))).toMatchObject({
		kind: 'conflict',
		reason: 'unverified-owner',
	});
	// A start marker that cannot be read leaves a live pid conservatively alive.
	world.set(400, undefined);
	const third = occupancyIdentity({ provider: 'codex', nativeSessionId: 'third' }, '/p/third.jsonl');
	await instance(400, world).acquire(third, owner('T'));
	expect(await instance(200, world).acquire(third, owner('B'))).toMatchObject({ kind: 'conflict', reason: 'held' });
});

test('concurrent reclaim of one stale lock admits only one new owner', async () => {
	const world = new Map<number, string | undefined>([
		[100, 's100'],
		[200, 's200'],
		[300, 's300'],
	]);
	await instance(100, world).acquire(ref, owner('A'));
	world.delete(100);
	const results = await Promise.all([
		instance(200, world).acquire(ref, owner('B')),
		instance(300, world).acquire(ref, owner('C')),
	]);
	expect(results.filter((result) => result.kind === 'acquired')).toHaveLength(1);
});

test('release is idempotent, only by the lock owner, and frees the reference', async () => {
	const world = new Map<number, string | undefined>([
		[100, 's'],
		[200, 't'],
	]);
	const result = await instance(100, world).acquire(ref, owner('A'));
	if (result.kind !== 'acquired') throw new Error('expected lock');
	await result.lease.bind('runtime-1');
	expect(await instance(100, world).inspect(ref)).toMatchObject({ runtimeId: 'runtime-1' });
	await result.lease.release();
	await result.lease.release();
	expect(await instance(100, world).inspect(ref)).toBeUndefined();
	expect((await instance(200, world).acquire(ref, owner('B'))).kind).toBe('acquired');
});

test('a corrupt lock is reported as unreadable and is never overwritten', async () => {
	await fs.writeFile(path.join(dir, `${nativeOccupancyDigest(ref)}.lock`), '{not json');
	const world = new Map<number, string | undefined>([[100, 's']]);
	expect(await instance(100, world).acquire(ref, owner('A'))).toMatchObject({
		kind: 'conflict',
		reason: 'unreadable',
	});
	expect(await fs.readFile(path.join(dir, `${nativeOccupancyDigest(ref)}.lock`), 'utf8')).toBe('{not json');
});

test('the default process probe sees this process alive and an exited child gone', async () => {
	expect(await processStartMarker(process.pid)).not.toBeNull();
	const child = spawn(process.execPath, ['-e', '0'], { stdio: 'ignore' });
	const pid = child.pid!;
	await new Promise((resolve) => child.once('exit', resolve));
	expect(await processStartMarker(pid)).toBeNull();
	if (process.platform === 'linux') expect(await processStartMarker(process.pid)).toMatch(/^\d+$/);
});

test("L8: a crashed writer's stale temporary files are swept, fresh ones are left alone", async () => {
	await fs.mkdir(dir, { recursive: true });
	const stale = path.join(dir, 'x.lock.old.tmp'),
		fresh = path.join(dir, 'x.lock.new.tmp');
	await fs.writeFile(stale, '{}');
	await fs.writeFile(fresh, '{}');
	const old = new Date(Date.now() - 10 * 60_000);
	await fs.utimes(stale, old, old);
	const world = new Map<number, string | undefined>([[100, 's']]);
	expect((await instance(100, world).acquire(ref, owner('A'))).kind).toBe('acquired');
	const left = await fs.readdir(dir);
	expect(left).not.toContain('x.lock.old.tmp');
	expect(left).toContain('x.lock.new.tmp');
});

test('a record of this very process whose HUHU instance was unloaded is reclaimed; a live local instance is not', async () => {
	const live = new Set(['OLD']);
	const same = (id: string) =>
		new NativeOccupancy({
			directory: dir,
			pid: 100,
			hostname: 'host',
			now: Date.now,
			localInstanceLive: (value) => live.has(value),
			processStart: async () => 's100',
		});
	expect((await same('OLD').acquire(ref, owner('OLD'))).kind).toBe('acquired');
	expect(await same('NEW').acquire(ref, owner('NEW'))).toMatchObject({ kind: 'conflict', reason: 'held' });
	live.delete('OLD');
	expect((await same('NEW').acquire(ref, owner('NEW'))).kind).toBe('acquired');
});

test('L3: the lock directory is the OS application-state directory, never a dot folder of the home directory', () => {
	expect(defaultOccupancyDirectory('linux', {}, '/home/u')).toBe('/home/u/.local/state/huhu/native-refs');
	expect(defaultOccupancyDirectory('linux', { XDG_STATE_HOME: '/state' }, '/home/u')).toBe('/state/huhu/native-refs');
	expect(defaultOccupancyDirectory('linux', { XDG_STATE_HOME: 'relative' }, '/home/u')).toBe(
		'/home/u/.local/state/huhu/native-refs',
	);
	expect(defaultOccupancyDirectory('darwin', {}, '/Users/u')).toBe(
		'/Users/u/Library/Application Support/HUHU/native-refs',
	);
	expect(defaultOccupancyDirectory('win32', { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' }, 'C:\\Users\\u')).toBe(
		'C:\\Users\\u\\AppData\\Local\\HUHU\\native-refs',
	);
});

test('N1: a plugin reload (module evaluated again) cannot take a claim the unloaded load has not released', async () => {
	const lockDir = path.join(dir, 'reload');
	const load = async () => {
		vi.resetModules();
		return import('./occupancy');
	};
	const first = await load();
	const unregister = first.registerLocalInstance('LOAD-1');
	const held = await new first.NativeOccupancy(first.defaultOccupancyPorts(lockDir)).acquire(ref, owner('LOAD-1'));
	if (held.kind !== 'acquired') throw new Error('expected the first load to hold the claim');
	// Load 1 shut down without a confirmed end: it keeps its claim and stays registered. Load 2 is a fresh
	// evaluation of the bundle (its own module state) in the SAME process.
	const second = await load();
	expect(second).not.toBe(first);
	second.registerLocalInstance('LOAD-2');
	const refused = await new second.NativeOccupancy(second.defaultOccupancyPorts(lockDir)).acquire(
		ref,
		owner('LOAD-2'),
	);
	expect(refused).toMatchObject({ kind: 'conflict', reason: 'held' });
	// Once load 1 has released after a confirmed exit and unregistered, load 2 may take it.
	await held.lease.release();
	unregister();
	const taken = await new second.NativeOccupancy(second.defaultOccupancyPorts(lockDir)).acquire(ref, owner('LOAD-2'));
	expect(taken.kind).toBe('acquired');
});
