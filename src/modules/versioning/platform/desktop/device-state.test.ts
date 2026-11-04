import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { nativeVaultStorage } from '../../../../host/desktop/vault-storage';
import { EMPTY_DEVICE_STATE } from '../../core/ports';
import { SyncDeviceStore, syncStatePath } from './device-state';
import { desktopGitHost } from './host';

test('device state lives in the vault per device and repository; a missing file reads as the empty state', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-sync-state-'));
	try {
		const original = { ...EMPTY_DEVICE_STATE, paused: 'manual' as const, lastPull: 42 };
		const storage = nativeVaultStorage(root), first = new SyncDeviceStore(storage, root, 'device-a');
		expect(await first.load(root)).toEqual(EMPTY_DEVICE_STATE);
		const file = syncStatePath(root, root, 'device-a'); expect(file).toMatch(/^\.huhu\/sync\/device-a\/[a-f\d]{64}\.json$/);
		expect(await first.save(root, EMPTY_DEVICE_STATE, original)).toEqual(original);
		expect(JSON.parse(await readFile(path.join(root, file), 'utf8'))).toEqual(original);
		expect(await new SyncDeviceStore(storage, root, 'device-a').load(root)).toEqual(original);
		expect(await new SyncDeviceStore(storage, root, 'device-b').load(root)).toEqual(EMPTY_DEVICE_STATE);
		const external = { ...original, lastPush: 52 }; await writeFile(path.join(root, file), JSON.stringify(external));
		const saved = await first.save(root, original, { ...original, paused: '' });
		expect(saved).toEqual({ ...external, paused: '' });
		expect(await first.save(root, saved, { ...saved, lastPull: 99 })).toEqual({ ...external, paused: '', lastPull: 99 });
	} finally { await rm(root, { recursive: true, force: true }); }
});

test('the actual Git host accepts a vault-root junction and still rejects a repository outside it', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-sync-alias-'));
	try {
		const real = path.join(root, 'real'), alias = path.join(root, 'alias');
		await mkdir(real); await symlink(real, alias, process.platform === 'win32' ? 'junction' : 'dir');
		execFileSync('git', ['init', '-q'], { cwd: real, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
		const host = desktopGitHost(alias, 'device'), place = await host.place('git', '');
		expect(await host.loadDevice(place.cwd)).toEqual(EMPTY_DEVICE_STATE);
		await host.saveDevice(place.cwd, EMPTY_DEVICE_STATE, { ...EMPTY_DEVICE_STATE, paused: 'manual' });
		expect(JSON.parse(await readFile(path.join(real, syncStatePath(real, real, 'device')), 'utf8')).paused).toBe('manual');
		await expect(host.loadDevice(root)).rejects.toThrow('invalid-repository');
	} finally { await rm(root, { recursive: true, force: true }); }
});

test('a failed device-state write is reported and never claimed as persisted', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-sync-failure-'));
	try {
		const storage = nativeVaultStorage(root);
		const store = new SyncDeviceStore(storage, root, 'device');
		await store.load(root);
		storage.write = async () => { throw new Error('disk'); };
		await expect(store.save(root, EMPTY_DEVICE_STATE, { ...EMPTY_DEVICE_STATE, paused: 'manual' })).rejects.toThrow('disk');
	} finally { await rm(root, { recursive: true, force: true }); }
});
