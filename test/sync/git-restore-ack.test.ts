import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import type { RestoreReceipt } from '../../src/modules/versioning/core/restore';
import { syncStatePath } from '../../src/modules/versioning/platform/desktop/device-state';
import { gitEnvironment } from '../../src/modules/versioning/platform/desktop/git-environment';
import { desktopGitHost } from '../../src/modules/versioning/platform/desktop/host';
import { SyncService, type SyncDependencies } from '../../src/modules/versioning/services/sync-service';
import { syncSettings, type SyncSettings } from '../../src/modules/versioning/settings';
import type { SettingsHandle } from '../../src/shared/settings/store';

const base = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'huhu-restore-ack-')));
const services: SyncService[] = [];
let counter = 0;
afterEach(async () => { for (const service of services.splice(0)) await service.dispose(); });
afterAll(() => rmSync(base, { recursive: true, force: true }));

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>(done => { resolve = done; });
	return { promise, resolve };
}

function git(cwd: string, ...args: string[]): string {
	return execFileSync('git', args, { cwd, encoding: 'utf8', env: gitEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function receipt(id = 'interrupted-restore'): RestoreReceipt {
	return { id, path: 'note.md', sourceId: 'history-version', sourceLabel: 'Historical version', mode: 'replace-current',
		stage: 'needs-review', createdAt: 1, updatedAt: 2, beforeObject: 'before', beforeDiskObject: 'disk', afterObject: 'after', repositoryBaseline: 'baseline' };
}

async function fixture() {
	const cwd = path.join(base, String(++counter)); mkdirSync(cwd);
	git(cwd, 'init', '-qb', 'main');
	git(cwd, 'config', 'user.name', 'Restore test'); git(cwd, 'config', 'user.email', 'restore@example.test');
	git(cwd, 'config', 'commit.gpgsign', 'false'); git(cwd, 'config', 'core.autocrlf', 'false');
	writeFileSync(path.join(cwd, 'note.md'), 'Original note\n');
	git(cwd, 'add', '--', 'note.md'); git(cwd, 'commit', '-qm', 'initial');
	let pending: readonly RestoreReceipt[] = [receipt()];
	const confirm = vi.fn(async (_receipts: readonly RestoreReceipt[]) => true);
	const acknowledge = vi.fn(async (ids: readonly string[]) => { pending = pending.filter(item => !ids.includes(item.id)); });
	const review = { pending: () => pending, confirm, acknowledge } satisfies NonNullable<SyncDependencies['restoreReview']>;
	const host = desktopGitHost(cwd, 'ack-device');
	const saveDevice = vi.spyOn(host, 'saveDevice');
	const service = new SyncService({
		host, settings: { get: () => syncSettings.defaults() } as unknown as SettingsHandle<SyncSettings>,
		dialogs: { confirmUpstream: async () => true }, notify() {}, describe: () => '', restoreReview: review,
	});
	services.push(service);
	await service.connect();
	const gate = service.restoreGate();
	await gate.run('initial-hold', () => gate.hold('initial-hold'));
	saveDevice.mockClear();
	return {
		cwd, service, gate, confirm, acknowledge, saveDevice,
		setPending(next: readonly RestoreReceipt[]) { pending = next; },
		pending: () => pending,
		persisted: () => JSON.parse(readFileSync(path.join(cwd, syncStatePath(cwd, cwd, 'ack-device')), 'utf8')) as Record<string, unknown>,
	};
}

describe('restore acknowledgement with real device state and repository queue', { timeout: 30_000 }, () => {
	test('cancelling review does not acknowledge journals, persist state, or change HEAD/index', async () => {
		const f = await fixture();
		f.confirm.mockResolvedValueOnce(false);
		const device = f.persisted(), head = git(f.cwd, 'rev-parse', 'HEAD'), index = readFileSync(path.join(f.cwd, '.git/index'));
		await f.service.acknowledgeRestore();
		expect(f.confirm).toHaveBeenCalledExactlyOnceWith([receipt()]);
		expect(f.acknowledge).not.toHaveBeenCalled();
		expect(f.saveDevice).not.toHaveBeenCalled();
		expect(f.persisted()).toEqual(device);
		expect(f.service.snapshot.device.restoreHold).toBe('initial-hold');
		expect(git(f.cwd, 'rev-parse', 'HEAD')).toBe(head);
		expect(readFileSync(path.join(f.cwd, '.git/index'))).toEqual(index);
	});

	test('confirmation does not hold the queue and a newer restore prevents an older confirmation from clearing it', async () => {
		const f = await fixture(), decision = deferred<boolean>();
		f.confirm.mockImplementationOnce(() => decision.promise);
		const acknowledging = f.service.acknowledgeRestore();
		expect(f.confirm).toHaveBeenCalledOnce();
		// These two queued operations must complete while the review remains unanswered.
		await f.service.setPaused(true);
		await f.gate.run('new-restore', () => f.gate.hold('new-restore'));
		const rejected = expect(acknowledging).rejects.toThrow('versioning.restore.review-changed');
		decision.resolve(true); await rejected;
		expect(f.acknowledge).not.toHaveBeenCalled();
		expect(f.service.snapshot.device).toMatchObject({ paused: 'manual', restoreHold: 'new-restore' });
		expect(f.persisted()).toMatchObject({ paused: 'manual', restoreHold: 'new-restore' });
	});

	test.each(['added', 'updated', 'stage'] as const)('rechecks the pending receipt signature after obtaining the queue: %s', async change => {
		const f = await fixture(), entered = deferred<void>(), release = deferred<void>();
		const blocked = f.gate.run('unrelated-work', async () => { entered.resolve(); await release.promise; });
		await entered.promise;
		const acknowledging = f.service.acknowledgeRestore();
		await Promise.resolve();
		if (change === 'added') f.setPending([receipt(), receipt('another-restore')]);
		else if (change === 'updated') f.setPending([{ ...receipt(), updatedAt: 3 }]);
		else f.setPending([{ ...receipt(), stage: 'applying' }]);
		const rejected = expect(acknowledging).rejects.toThrow('versioning.restore.review-changed');
		release.resolve(); await blocked; await rejected;
		expect(f.acknowledge).not.toHaveBeenCalled();
		expect(f.saveDevice).not.toHaveBeenCalled();
		expect(f.service.snapshot.device.restoreHold).toBe('initial-hold');
		expect(f.persisted().restoreHold).toBe('initial-hold');
	});

	test('successful review acknowledges the captured receipts, clears only the hold, and preserves manual pause after restart', async () => {
		const f = await fixture();
		await f.service.setPaused(true); f.saveDevice.mockClear();
		const head = git(f.cwd, 'rev-parse', 'HEAD'), index = readFileSync(path.join(f.cwd, '.git/index'));
		await f.service.acknowledgeRestore();
		expect(f.confirm).toHaveBeenCalledExactlyOnceWith([receipt()]);
		expect(f.acknowledge).toHaveBeenCalledExactlyOnceWith(['interrupted-restore']);
		expect(f.acknowledge.mock.invocationCallOrder[0]).toBeLessThan(f.saveDevice.mock.invocationCallOrder[0]!);
		expect(f.pending()).toEqual([]);
		expect(f.service.snapshot.device.restoreHold).toBeUndefined();
		expect(f.service.snapshot.device.paused).toBe('manual');
		expect(f.persisted().restoreHold).toBeUndefined();
		expect(f.persisted().paused).toBe('manual');
		expect(git(f.cwd, 'rev-parse', 'HEAD')).toBe(head);
		expect(readFileSync(path.join(f.cwd, '.git/index'))).toEqual(index);
		await f.service.connect();
		expect(f.service.snapshot.device.restoreHold).toBeUndefined();
		expect(f.service.snapshot.device.paused).toBe('manual');
	});

	test('a verified restore with no pending journals clears the hold without a second review prompt', async () => {
		const f = await fixture(); f.setPending([]);
		await f.service.acknowledgeRestore();
		expect(f.confirm).not.toHaveBeenCalled();
		expect(f.service.snapshot.device.restoreHold).toBeUndefined();
		expect(f.persisted().restoreHold).toBeUndefined();
	});

	test('a failed journal acknowledgement keeps the persisted automatic-write hold intact', async () => {
		const f = await fixture();
		f.acknowledge.mockRejectedValueOnce(new Error('checkpoint write failed'));
		await expect(f.service.acknowledgeRestore()).rejects.toThrow('checkpoint write failed');
		expect(f.saveDevice).not.toHaveBeenCalled();
		expect(f.service.snapshot.device.restoreHold).toBe('initial-hold');
		expect(f.persisted().restoreHold).toBe('initial-hold');
	});
});
