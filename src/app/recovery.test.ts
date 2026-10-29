import { useStorageTimers, type StorageTimers } from '../shared/storage/timers';
import { beforeEach, afterEach, describe, expect, test } from 'vitest';
import { FaultStorage } from '../../test/agent-migrations/fault-storage';
import { JsonStore } from '../shared/json-store';
import { defineSettings, f } from '../shared/settings/schema';
import { SettingsStore, type SettingsFile } from '../shared/settings/store';
import { RecoveryError, type RecoveryOwner } from '../shared/storage/recovery-contracts';
import { RecoveryHost, SETTINGS_VAULT_FILE, settingsDeviceFile, settingsOwner } from './recovery';

const noop = (id: string, prefix: string): RecoveryOwner => ({
	id,
	owns: (p) => p.startsWith(prefix),
	preflight: async () => ({ busy: [] }),
	quiesce: async () => {},
	drain: async () => {},
	adopt: async () => {},
	release: async () => {},
});

describe('RecoveryHost', () => {
	test('rejects a duplicate owner id and supports unregistering', () => {
		const host = new RecoveryHost(new FaultStorage());
		const off = host.register(noop('a', '.huhu/a/'));
		expect(() => host.register(noop('a', '.huhu/b/'))).toThrow(RecoveryError);
		off();
		expect(host.ownerIds).toEqual([]);
		host.register(noop('a', '.huhu/b/'));
	});

	test('recoverBeforeStart repairs a half-finished operation before any owner loads; failure holds the gate', async () => {
		const storage = new FaultStorage();
		storage.files.set('.huhu/a/x.json', 'old');
		const host = new RecoveryHost(storage);
		host.register(noop('a', '.huhu/a/'));
		storage.crashAt = 9;
		await host
			.run({
				operation: 'op',
				newId: () => 'o1',
				stage: async () => ({
					writes: [
						{ path: '.huhu/a/x.json', content: 'new' },
						{ path: '.huhu/a/y.json', content: 'new' },
					],
				}),
			})
			.catch(() => undefined);
		const restarted = new RecoveryHost(storage.reboot());
		expect((await restarted.recoverBeforeStart()).status).not.toBe('none');
		const files = [storage.files.get('.huhu/a/x.json') ?? null, storage.files.get('.huhu/a/y.json') ?? null];
		expect([JSON.stringify(['old', null]), JSON.stringify(['new', 'new'])]).toContain(JSON.stringify(files));

		const broken = new FaultStorage();
		broken.files.set('.huhu/recovery/transaction/journal.a.json', '{bad');
		broken.files.set('.huhu/recovery/transaction/journal.b.json', '{bad');
		const blocked = new RecoveryHost(broken);
		await expect(blocked.recoverBeforeStart()).rejects.toMatchObject({ code: 'JOURNAL_UNREADABLE' });
		expect(blocked.gate.held).toBe(true);
	});
});

describe('settings owner', () => {
	const agent = defineSettings({
		mode: f.enum(['safe', 'yolo'] as const, { default: 'safe' }),
		width: f.number({ default: 200, scope: 'device', min: 0, max: 9999, integer: true }),
	});
	const other = defineSettings({ flag: f.number({ default: 1, min: 0, max: 9, integer: true }) });
	const timers = {
		set: (cb: () => void, ms: number) => setTimeout(cb, ms),
		clear: (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>),
	};
	const device = 'dev1';

	async function boot(storage: FaultStorage) {
		const stores = {
			vault: new JsonStore<Record<string, unknown> | null>(
				storage,
				SETTINGS_VAULT_FILE,
				(v): v is Record<string, unknown> | null => v === null || (!!v && typeof v === 'object'),
			),
			device: new JsonStore<Record<string, unknown> | null>(
				storage,
				settingsDeviceFile(device),
				(v): v is Record<string, unknown> | null => v === null || (!!v && typeof v === 'object'),
			),
		};
		const store = new SettingsStore(
			{
				load: async (scope) => (await stores[scope].load(null)) as SettingsFile | null,
				save: async (scope, file, base) =>
					(await stores[scope].commit({
						base: base as never,
						value: file as never,
					})) as unknown as SettingsFile,
			},
			{ timers },
		);
		await store.load();
		return { store, agent: store.bind('agent', agent), other: store.bind('other', other) };
	}

	test('restoring the agent namespace keeps other namespaces and survives the next edit', async () => {
		const storage = new FaultStorage();
		storage.files.set(
			SETTINGS_VAULT_FILE,
			JSON.stringify({ version: 1, namespaces: { agent: { mode: 'safe' }, other: { flag: 3 } } }),
		);
		storage.files.set(
			settingsDeviceFile(device),
			JSON.stringify({ version: 1, namespaces: { agent: { width: 300 } } }),
		);
		const { store, agent: handle, other: second } = await boot(storage);
		const host = new RecoveryHost(storage);
		host.register(settingsOwner(store, device, ['agent']));
		const otherBytes = JSON.stringify({ flag: 3 });
		await host.run({
			operation: 'restore-agent',
			newId: () => 'r1',
			stage: async (read) => {
				const vault = JSON.parse((await read(SETTINGS_VAULT_FILE))!) as SettingsFile,
					dev = JSON.parse((await read(settingsDeviceFile(device)))!) as SettingsFile;
				vault.namespaces.agent = { mode: 'yolo' };
				dev.namespaces.agent = { width: 410 };
				return {
					writes: [
						{ path: SETTINGS_VAULT_FILE, content: JSON.stringify(vault) },
						{ path: settingsDeviceFile(device), content: JSON.stringify(dev) },
					],
				};
			},
		});
		expect(handle.get()).toMatchObject({ mode: 'yolo', width: 410 });
		expect(JSON.stringify(second.get())).toBe(otherBytes);
		// A settings change after the restore must not resurrect the stale cached agent values.
		await second.update(
			(d) => {
				d.flag = 4;
			},
			{ persist: 'immediate' },
		);
		const vault = JSON.parse(storage.files.get(SETTINGS_VAULT_FILE)!) as SettingsFile;
		const dev = JSON.parse(storage.files.get(settingsDeviceFile(device))!) as SettingsFile;
		expect(vault.namespaces.agent).toEqual({ mode: 'yolo' });
		expect(dev.namespaces.agent).toEqual({ width: 410 });
		expect(vault.namespaces.other).toEqual({ flag: 4 });
		// Writes are open again after release.
		await handle.update(
			(d) => {
				d.mode = 'safe';
			},
			{ persist: 'immediate' },
		);
	});

	test('a failed settings write makes the strict drain fail: nothing is replaced', async () => {
		const storage = new FaultStorage();
		const { store, agent: handle } = await boot(storage);
		const host = new RecoveryHost(storage);
		host.register(settingsOwner(store, device, ['agent']));
		storage.failWrite = (p) => p === SETTINGS_VAULT_FILE;
		void handle
			.update((d) => {
				d.mode = 'yolo';
			})
			.catch(() => undefined);
		await expect(
			host.run({
				operation: 'r',
				newId: () => 'r2',
				stage: async () => ({ writes: [{ path: SETTINGS_VAULT_FILE, content: '{}' }] }),
			}),
		).rejects.toMatchObject({ code: 'DRAIN_FAILED' });
		storage.failWrite = undefined;
		expect(storage.files.has(SETTINGS_VAULT_FILE)).toBe(false);
	});

	test('a stage that changes a namespace other than the restored ones is rejected and nothing from the stage is applied', async () => {
		const storage = new FaultStorage();
		storage.files.set(
			SETTINGS_VAULT_FILE,
			JSON.stringify({ version: 1, namespaces: { agent: { mode: 'safe' }, other: { flag: 3 } } }),
		);
		storage.files.set(settingsDeviceFile(device), JSON.stringify({ version: 1, namespaces: {} }));
		const { store } = await boot(storage);
		const host = new RecoveryHost(storage);
		host.register(settingsOwner(store, device, ['agent']));
		const stage = (flag: number) => async () => ({
			writes: [
				{
					path: SETTINGS_VAULT_FILE,
					content: JSON.stringify({ version: 1, namespaces: { agent: { mode: 'yolo' }, other: { flag } } }),
				},
			],
		});
		await expect(host.run({ operation: 'r', newId: () => 'v1', stage: stage(4) })).rejects.toMatchObject({
			code: 'STAGE_INVALID',
		});
		// The strict drain may rewrite the same settings; no staged value was applied.
		expect(JSON.parse(storage.files.get(SETTINGS_VAULT_FILE)!).namespaces).toMatchObject({
			agent: { mode: 'safe' },
			other: { flag: 3 },
		});
		await host.run({ operation: 'r', newId: () => 'v2', stage: stage(3) });
		expect(JSON.parse(storage.files.get(SETTINGS_VAULT_FILE)!).namespaces.agent).toEqual({ mode: 'yolo' });
	});
});

describe('settings owner over a damaged file (T-15 N-3)', () => {
	const owner = (names: readonly string[]) => settingsOwner({} as unknown as SettingsStore, 'dev1', names);
	const path = settingsDeviceFile('dev1');
	const next = JSON.stringify({ version: 1, namespaces: { agent: { fontSize: 15 } } });

	test('an unparseable current file may be replaced by one that carries only the listed namespaces', () => {
		expect(() => owner(['agent']).validate!([{ path, before: '{"namespaces": [', after: next }])).not.toThrow();
		expect(() => owner(['agent']).validate!([{ path, before: '', after: next }])).not.toThrow();
	});

	test('the replacement of a damaged file still cannot smuggle in another namespace or be damaged itself', () => {
		const other = JSON.stringify({ version: 1, namespaces: { agent: {}, browser: { homepage: 'x' } } });
		expect(() => owner(['agent']).validate!([{ path, before: 'garbage', after: other }])).toThrow(
			'namespace-not-restorable:browser',
		);
		expect(() => owner(['agent']).validate!([{ path, before: next, after: 'garbage' }])).toThrow(
			'settings-stage-unparseable',
		);
	});

	test('a parseable file keeps the old rule: other namespaces must be identical', () => {
		const before = JSON.stringify({ version: 1, namespaces: { browser: { a: 1 }, agent: {} } });
		const changed = JSON.stringify({ version: 1, namespaces: { browser: { a: 2 }, agent: { x: 1 } } });
		expect(() => owner(['agent']).validate!([{ path, before, after: changed }])).toThrow(
			'namespace-not-restorable:browser',
		);
	});

	test('a damaged settings file goes through the whole transaction and the damaged bytes stay as a recovery copy', async () => {
		const storage = new FaultStorage();
		storage.files.set(path, '{"namespaces": [');
		const host = new RecoveryHost(storage);
		const calls: string[] = [];
		host.register({
			...owner(['agent']),
			quiesce: async () => void calls.push('quiesce'),
			drain: async () => void calls.push('drain'),
			adopt: async () => void calls.push('adopt'),
			release: async () => void calls.push('release'),
		});
		await host.run({
			operation: 'restore',
			newId: () => 'n3',
			stage: async () => ({ writes: [{ path, content: next }] }),
		});
		expect(storage.files.get(path)).toBe(next);
		expect(storage.files.get('.huhu/recovery/transaction/n3/old-0.txt')).toBe('{"namespaces": [');
		expect(calls).toEqual(['quiesce', 'drain', 'adopt', 'release']);
	});
});

// Supply the same timer dependency that the app host registers before recovery starts.
beforeEach(() => useStorageTimers(globalThis as unknown as StorageTimers));
afterEach(() => useStorageTimers(undefined));

test('settled waits for a normal admitted transaction through final release', async () => {
	const host = new RecoveryHost(new FaultStorage());
	let enter!: () => void, finish!: () => void;
	const ready = new Promise<void>((resolve) => { enter = resolve; });
	const barrier = new Promise<void>((resolve) => { finish = resolve; });
	host.register({ ...noop('normal', '.huhu/normal/'), release: async () => { enter(); await barrier; } });
	const operation = host.run({ operation: 'normal', stage: async () => ({ writes: [] }) });
	await ready;
	const loaded = host.settled();
	finish();
	await operation;
	await expect(loaded).resolves.toBeUndefined();
});

test('settled preserves an unrecoverable journal error while the stable isolation marker is retained', async () => {
	const disk = new FaultStorage(), host = new RecoveryHost(disk);
	host.register(noop('file', '.huhu/data/'));
	let journals = 0;
	disk.failWrite = (path) => path.includes('/journal.') && ++journals === 3;
	await expect(host.run({ operation: 'journal-failure', stage: async () => ({ writes: [{ path: '.huhu/data/file', content: 'new' }] }) })).rejects.toMatchObject({ code: 'UNRECOVERABLE' });
	await expect(host.settled()).rejects.toMatchObject({ code: 'UNRECOVERABLE' });
});
