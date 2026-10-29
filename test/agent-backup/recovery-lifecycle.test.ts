import { expect, test, vi } from 'vitest';
import type { App } from 'obsidian';
import { createRecoveryHost } from '../../src/app/recovery';
import { AutomationService, automationRecoveryOwners } from '../../src/modules/automations/core/service';
import { automationRuntimePath } from '../../src/modules/automations/api';
import { buildPackage } from '../../src/modules/agent/core/backup/format';
import { runImport } from '../../src/modules/agent/services/backup/import';
import { useStorageTimers, type StorageTimers } from '../../src/shared/storage/timers';
import { ListStorage } from './world';

const sources = { list: async () => [], save: async () => {}, remove: async () => {}, open: async () => {}, createTask: async () => {} };
const resultOf = (pending: Promise<unknown>) => pending.then(() => 'accepted', (error: unknown) =>
	(error as { code: string }).code);

test.each([false, true])('an old shutdown writer blocks new factory startup, loading and offline restore (module reload=%s)', async (reload) => {
	const disk = new ListStorage(), app = { vault: { adapter: disk } } as unknown as App;
	const old = createRecoveryHost(app), device = 'dev', path = automationRuntimePath(device);
	const service = new AutomationService(disk, path, device, sources, () => undefined, async () => {}, true);
	await service.load();
	let enterDrain!: () => void;
	const draining = new Promise<void>((resolve) => { enterDrain = resolve; });
	for (const owner of automationRecoveryOwners(service, device)) old.register({ ...owner, drain: async (token) => {
		enterDrain(); await owner.drain(token);
	} });
	await service.setExecutionEnabled(false);
	let enter!: () => void, release!: () => void;
	const ready = new Promise<void>((resolve) => { enter = resolve; });
	const barrier = new Promise<void>((resolve) => { release = resolve; });
	const write = disk.write.bind(disk);
	let pause = true;
	disk.write = async (file, text) => {
		if (file === path && pause) { pause = false; enter(); await barrier; }
		await write(file, text);
	};
	const shutdown = service.shutdown();
	await ready;
	const abort = new AbortController();
	const cancelled = old.run({ operation: 'export', signal: abort.signal, stage: async () => ({ writes: [] }) });
	await draining;
	abort.abort();
	await expect(cancelled).rejects.toMatchObject({ code: 'CANCELLED' });
	await expect(old.run({ operation: 'same-host', stage: async () => ({ writes: [] }) })).rejects.toMatchObject({ code: 'RECOVERY_PENDING' });
	if (reload) vi.resetModules();
	const recovery = reload ? await import('../../src/app/recovery') : { createRecoveryHost };
	const imports = reload ? await import('../../src/modules/agent/services/backup/import') : { runImport };
	const timers = reload ? await import('../../src/shared/storage/timers') : { useStorageTimers };
	timers.useStorageTimers(globalThis as unknown as StorageTimers);
	const fresh = recovery.createRecoveryHost(app);
	expect(fresh.storage).not.toBe(old.storage);
	const pkg = await buildPackage({ createdAt: 1, source: { vaultName: 'v', device, devices: [device] }, notes: [], exclusions: [],
		entries: [{ section: 'automation-runtime', device, via: 'offline', text: JSON.stringify({ definitions: [], cursors: {},
			runs: [{ id: 'retained-result', status: 'succeeded', notificationAttempted: true, output: 'valuable result' }] }) }] });
	let outcomes: string[] = [], stages = 0, importedBeforeOld = false;
	try {
		outcomes.push(await resultOf(fresh.recoverBeforeStart()));
		outcomes.push(await resultOf(fresh.settled()));
		outcomes.push(await resultOf(imports.runImport(pkg, { adoptDevice: device }, { recovery: fresh, storage: fresh.storage, device, vaultName: 'v' })));
		importedBeforeOld = JSON.parse(disk.files.get(path)!).runs.some((row: { id: string }) => row.id === 'retained-result');
		outcomes.push(await resultOf(fresh.run({ operation: 'new-host', stage: async () => { stages++; return { writes: [] }; } })));
		const other = recovery.createRecoveryHost({ vault: { adapter: new ListStorage() } } as unknown as App);
		await expect(other.recoverBeforeStart()).resolves.toEqual({ status: 'none' });
		await expect(other.settled()).resolves.toBeUndefined();
		await expect(other.run({ operation: 'independent-vault', stage: async () => ({ writes: [] }) })).resolves.toMatchObject({ noop: true });
	} finally { release(); await shutdown; }
	try {
		expect({ outcomes, oldWriteLostImport: importedBeforeOld && JSON.parse(disk.files.get(path)!).runs.length === 0 }).toEqual({
			outcomes: ['RECOVERY_PENDING', 'RECOVERY_PENDING', 'recovery-pending', 'RECOVERY_PENDING'], oldWriteLostImport: false,
		});
		expect(stages).toBe(0);
		await vi.waitFor(async () => { expect((await fresh.recoverBeforeStart()).status).toBe('none'); });
		await expect(fresh.settled()).resolves.toBeUndefined();
		const restored = await imports.runImport(pkg, { adoptDevice: device }, { recovery: fresh, storage: fresh.storage, device, vaultName: 'v' });
		expect(restored.status).toBe('done');
		expect(JSON.parse(disk.files.get(path)!).runs[0].id).toBe('retained-result');
		await old.settled();
		expect(JSON.parse(disk.files.get(path)!).runs[0].id).toBe('retained-result');
	} finally { timers.useStorageTimers(undefined); }
});
