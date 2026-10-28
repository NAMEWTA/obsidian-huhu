import { expect, test, vi } from 'vitest';
import { SpaceService } from '../../src/modules/agent/services/spaces/space-service';
import { createSpaceWorkspaceStore } from '../../src/modules/agent/services/workspace-store';
import { emptyRecords } from '../../src/modules/agent/services/spaces/records';
import { runLegacyMigration } from '../../src/modules/agent/services/migrations/legacy-workbench';
import { PATHS, ROOT, VAULT, deps, legacyVault } from './fixtures';
import type { FaultStorage } from './fault-storage';

const clock = { setTimeout: () => 1, clearTimeout: () => {} } as unknown as Pick<Window, 'setTimeout' | 'clearTimeout'>;
function open(storage: FaultStorage) {
	const spaces = new SpaceService({
		storage,
		instanceId: 'x',
		report: vi.fn(),
		directories: {
			inspectVault: async () => VAULT,
			assertVault: async () => {},
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: ROOT }),
			chooseExternalDirectory: async () => undefined,
			resolveDirectory: async () => ({ cwd: ROOT.canonicalPath }),
		},
		owners: {
			acquire: async () => ({
				instanceId: 'x',
				port: 1,
				lost: new AbortController().signal,
				assertHeld: async () => {},
				close: async () => {},
			}),
		},
	});
	const layouts = createSpaceWorkspaceStore(spaces, clock, vi.fn());
	/** What the Browser port's `list()` sees: browser tabs of the selected Space's layout. */
	const browserList = () => {
		const selected = spaces.store.getState().records.selectedSpaceId;
		return Object.values(layouts.readLayoutNow!(selected).view.tabs).flatMap((tab) =>
			tab.kind === 'browser' ? [tab] : [],
		);
	};
	return { spaces, layouts, browserList };
}

test('imported legacy browser tabs are reachable through the Browser port without guessing: the Import Space is selected on a fresh upgrade', async () => {
	const storage = legacyVault();
	await runLegacyMigration(deps(storage));
	const { spaces, layouts, browserList } = open(storage);
	await Promise.all([spaces.ready, layouts.ready]);
	expect(browserList()).toMatchObject([
		{ id: 'w', pageId: 'pg1', url: 'https://example.com/', profileId: 'default' },
	]);
	// Editing through the Browser path keeps the group references of the imported layout intact.
	await layouts.editLayout!(spaces.store.getState().records.selectedSpaceId, (v) => ({
		...v,
		tabs: { ...v.tabs, w: { ...v.tabs['w']!, zoom: 1.25 } as never },
	}));
	await spaces.flush();
	expect(browserList()[0]).toMatchObject({ zoom: 1.25 });
});

test('when another Space is already selected the imported tabs stay in the Import Space and appear when it is selected; the selection is never changed', async () => {
	const storage = legacyVault();
	const existing = emptyRecords(VAULT);
	existing.spaces['mine'] = {
		id: 'mine',
		name: 'Mine',
		archived: false,
		createdAt: 1,
		updatedAt: 1,
		directory: { kind: 'vault', relativePath: '', target: ROOT },
	};
	existing.selectedSpaceId = 'mine';
	storage.files.set(PATHS.records, JSON.stringify(existing));
	await runLegacyMigration(deps(storage));
	const { spaces, layouts, browserList } = open(storage);
	await Promise.all([spaces.ready, layouts.ready]);
	expect(spaces.store.getState().records.selectedSpaceId).toBe('mine');
	expect(browserList()).toEqual([]);
	const importId = Object.keys(spaces.store.getState().records.spaces).find((id) => id !== 'mine')!;
	expect(
		Object.values(layouts.readLayoutNow!(importId).view.tabs).filter((tab) => tab.kind === 'browser'),
	).toHaveLength(1);
});
