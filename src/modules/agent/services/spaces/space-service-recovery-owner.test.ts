import { describe, expect, test, vi } from 'vitest';
import { FaultStorage } from '../../../../../test/agent-migrations/fault-storage';
import { RecoveryHost } from '../../../../app/recovery';
import { recoverPending } from '../../../../shared/storage/recovery-transaction';
import { agentWorkbenchPath } from '../../../../shared/storage/vault-layout';
import type { VaultBinding } from '../../core/space/model';
import { openTab } from '../../core/workspace/ops';
import type { BrowserTabData } from '../../core/workspace/model';
import { spaceWorkspaceOwner } from '../migrations/agent-owners';
import { createSpaceWorkspaceStore } from '../workspace-store';
import { emptyRecords, isWorkbenchRecords, type WorkbenchRecords } from './records';
import { SpaceService } from './space-service';

const vault: VaultBinding = {
	vaultId: 'vault',
	deviceId: 'device',
	rootPath: '/vault',
	root: { canonicalPath: '/vault', dev: '1', ino: '2' },
};
const path = agentWorkbenchPath('device');
const clock = { setTimeout: () => 1, clearTimeout: () => {} } as unknown as Pick<Window, 'setTimeout' | 'clearTimeout'>;
const browserTab = (id: string): BrowserTabData => ({
	kind: 'browser',
	id,
	title: id,
	pageId: `page-${id}`,
	url: 'https://example.com/',
	profileId: 'default',
	zoom: 1,
	createdAt: 1,
});

function live(storage: FaultStorage) {
	const report = vi.fn();
	const spaces = new SpaceService({
		storage,
		instanceId: 'live',
		report,
		directories: {
			inspectVault: async () => vault,
			assertVault: async () => {},
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: vault.root }),
			chooseExternalDirectory: async () => undefined,
			resolveDirectory: async () => ({ cwd: '/vault' }),
		},
		owners: {
			acquire: async () => ({
				instanceId: 'live',
				port: 1,
				lost: new AbortController().signal,
				assertHeld: async () => {},
				close: async () => {},
			}),
		},
	});
	const layouts = createSpaceWorkspaceStore(spaces, clock, report);
	const host = new RecoveryHost(storage);
	host.register(spaceWorkspaceOwner('device', spaces, layouts));
	return { spaces, layouts, host, report };
}
const stored = (storage: FaultStorage) => JSON.parse(storage.files.get(path)!) as WorkbenchRecords;
const withSpace = (name: string, id: string, tab?: string): WorkbenchRecords => {
	const records = emptyRecords(vault);
	records.spaces[id] = {
		id,
		name,
		archived: false,
		createdAt: 1,
		updatedAt: 1,
		directory: { kind: 'vault', relativePath: '', target: vault.root },
	};
	records.selectedSpaceId = id;
	if (tab)
		records.layouts[id] = openTab(
			records.layouts[id] ?? { version: 1, tabs: {}, groups: [], closedTabs: [] },
			undefined,
			browserTab(tab),
		);
	return records;
};
const restoreTo = (records: WorkbenchRecords, after?: () => Promise<void>) => ({
	operation: 'restore-workbench',
	newId: () => 'r1',
	stage: async () => {
		await after?.();
		return { writes: [{ path, content: JSON.stringify(records) }] };
	},
});

async function seeded() {
	const storage = new FaultStorage();
	const first = live(storage);
	await first.spaces.ready;
	const a = await first.spaces.create({ name: 'A', relativePath: '' });
	await first.layouts.ready;
	await first.layouts.editLayout!(a.id, (v) => openTab(v, undefined, browserTab('old')));
	await first.spaces.flush();
	return { storage, first, a };
}

describe('live SpaceService as a recovery owner', () => {
	test('writes during quiesce get BUSY (Agent and Browser alike); nothing is accepted then lost; release reopens', async () => {
		const { storage, first, a } = await seeded();
		const errors: unknown[] = [];
		const seenInside = async () => {
			await expect(first.spaces.create({ name: 'late', relativePath: '' })).rejects.toMatchObject({
				code: 'SOURCE_UNAVAILABLE',
				reason: 'recovery-busy',
			});
			// Browser opens/closes/updates go through editLayout/updateLayout of the same store.
			const result = await first.layouts.editLayout!(a.id, (v) => openTab(v, undefined, browserTab('late')));
			expect(result).toMatchObject({ effect: 'none', layoutPublished: false });
			errors.push(result.error);
			first.layouts.updateLayout!((v) => openTab(v, undefined, browserTab('late2')));
			expect(first.layouts.readLayoutNow!(a.id).view.tabs['late']).toBeUndefined();
			expect(first.layouts.readLayoutNow!(a.id).view.tabs['late2']).toBeUndefined();
		};
		await first.host.run(restoreTo(withSpace('B', 'b'), seenInside));
		expect(errors[0]).toMatchObject({ code: 'SOURCE_UNAVAILABLE', reason: 'recovery-busy' });
		// Reopened with the restored baseline.
		const created = await first.spaces.create({ name: 'after', relativePath: '' });
		expect(Object.keys(stored(storage).spaces).sort()).toEqual(['b', created.id].sort());
	});

	test('after adopt no stale in-memory Space or layout is written back', async () => {
		const { storage, first, a } = await seeded();
		await first.host.run(restoreTo(withSpace('B', 'b', 'restored')));
		expect(first.spaces.list().map((s) => s.name)).toEqual(['B']);
		expect(first.layouts.readLayoutNow!('b').view.tabs['restored']).toBeDefined();
		expect(first.layouts.readLayoutNow!(a.id).view.tabs['old']).toBeUndefined();
		// First edits after restore: the restored layout survives, the old Space/tab never returns.
		await first.layouts.editLayout!('b', (v) => openTab(v, undefined, browserTab('new')));
		const c = await first.spaces.create({ name: 'C', relativePath: '' });
		await first.spaces.flush();
		const written = stored(storage);
		expect(isWorkbenchRecords(written)).toBe(true);
		expect(Object.keys(written.spaces).sort()).toEqual(['b', c.id].sort());
		expect(Object.keys(written.layouts['b']!.tabs).sort()).toEqual(['new', 'restored']);
		expect(written.layouts[a.id]).toBeUndefined();
	});

	test('a failed strict drain aborts, releases the owner and rolls nothing forward', async () => {
		const { storage, first, a } = await seeded();
		const before = storage.files.get(path)!;
		// A dirty draft the debounce never flushes, and a disk that refuses the save.
		first.layouts.store.setState((v) => openTab(v, undefined, browserTab('dirty')), true);
		storage.failWrite = (p) => p === path;
		await expect(first.host.run(restoreTo(withSpace('B', 'b')))).rejects.toMatchObject({ code: 'DRAIN_FAILED' });
		storage.failWrite = undefined;
		expect(storage.files.get(path)).toBe(before);
		// Owner released: the same service saves again.
		await first.layouts.editLayout!(a.id, (v) => openTab(v, undefined, browserTab('again')));
		await first.layouts.drainEdits!();
		expect(stored(storage).layouts[a.id]!.tabs['again']).toBeDefined();
	});

	test('a write failure while replacing rolls the file back and the live service keeps its state', async () => {
		const { storage, first, a } = await seeded();
		const before = storage.files.get(path)!;
		storage.failWrite = (p) => p === path;
		await expect(first.host.run(restoreTo(withSpace('B', 'b')))).rejects.toBeDefined();
		storage.failWrite = undefined;
		expect(storage.files.get(path)).toBe(before);
		expect(first.spaces.list().map((s) => s.id)).toEqual([a.id]);
	});

	test('power loss at every step with live owners: a restarted process recovers all-old or all-new and the new service loads it', async () => {
		const probe = await seeded();
		const start = probe.storage.mutations;
		await probe.first.host.run(restoreTo(withSpace('B', 'b', 'restored')));
		const total = probe.storage.mutations - start;
		expect(total).toBeGreaterThan(5);
		const outcomes = new Set<string>();
		for (const torn of [false, true]) {
			for (let at = 1; at <= total; at++) {
				const { storage, first, a } = await seeded();
				storage.crashAt = storage.mutations + at;
				storage.torn = torn;
				await first.host.run(restoreTo(withSpace('B', 'b', 'restored'))).catch(() => undefined);
				const restarted = storage.reboot();
				await recoverPending(restarted);
				const next = live(restarted);
				await next.spaces.ready;
				const ids = next.spaces.list().map((s) => s.id);
				expect([[a.id], ['b']], `step ${at} torn=${torn}`).toContainEqual(ids);
				outcomes.add(ids[0] === 'b' ? 'new' : 'old');
				// The new instance can write and nothing from the other generation leaks in.
				await next.spaces.create({ name: 'post', relativePath: '' });
				await next.spaces.flush();
				const saved = Object.keys(stored(restarted).spaces);
				expect(saved).toHaveLength(2);
				expect(saved).toContain(ids[0]);
			}
		}
		expect([...outcomes].sort()).toEqual(['new', 'old']);
	});
});
