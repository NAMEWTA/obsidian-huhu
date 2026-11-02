import { SpaceError } from '../../src/modules/agent/core/space/errors';
import type { PhysicalDirectory, VaultBinding } from '../../src/modules/agent/core/space/model';
import type { WriterOwnerPort } from '../../src/modules/agent/core/space/ports';
import type { WorkspaceState } from '../../src/modules/agent/core/workspace/model';
import { legacyPaths, type LegacyMigrationDeps } from '../../src/modules/agent/services/migrations/legacy-workbench';
import { FaultStorage } from './fault-storage';

export const DEVICE = 'device-1';
export const PATHS = legacyPaths(DEVICE);
export const ROOT: PhysicalDirectory = { canonicalPath: '/isolated/test-vault', dev: '10', ino: '20' };
export const VAULT: VaultBinding = { vaultId: 'vault-1', deviceId: DEVICE, rootPath: ROOT.canonicalPath, root: ROOT };

const terminal = (id: string, cwd: string) => ({
	kind: 'terminal' as const,
	id,
	title: id,
	sessionIds: [`${id}-p1`, `${id}-p2`],
	paneLayout: {
		kind: 'split',
		direction: 'row',
		ratio: 0.5,
		first: { kind: 'pane', session: `${id}-p1` },
		second: { kind: 'pane', session: `${id}-p2` },
	},
	focusedSessionId: `${id}-p1`,
	panes: { [`${id}-p1`]: { cwd }, [`${id}-p2`]: { cwd } },
	state: 'idle' as const,
	unread: false,
	createdAt: 1,
	updatedAt: 2,
});
/** A legacy v1 layout: two groups, two terminal tabs (same cwd), one web tab, one page tab, one closed tab. */
export function legacyLayout(): WorkspaceState {
	const a = terminal('a', '/work/same'),
		b = terminal('b', '/work/same');
	return {
		version: 1,
		tabs: {
			a,
			b,
			w: {
				kind: 'browser',
				id: 'w',
				title: 'Docs',
				pageId: 'pg1',
				url: 'https://example.com/',
				profileId: 'default',
				zoom: 1,
				createdAt: 3,
			},
			'tab-page-board': { kind: 'page', id: 'tab-page-board', title: 'Board', page: 'board', createdAt: 4 },
		} as unknown as WorkspaceState['tabs'],
		groups: [
			{ id: 'g1', tabIds: ['a', 'w'], activeTabId: 'a', recentTabIds: ['a'] },
			{ id: 'g2', tabIds: ['b', 'tab-page-board'], activeTabId: 'b', recentTabIds: ['b'] },
		],
		layout: {
			kind: 'split',
			direction: 'row',
			sizes: [50, 50],
			children: [
				{ kind: 'group', groupId: 'g1' },
				{ kind: 'group', groupId: 'g2' },
			],
		},
		activeGroupId: 'g1',
		closedTabs: [terminal('z', '/work/old')],
	} as unknown as WorkspaceState;
}
/** Keys that look like the pre-Space account index have no [agent, account, session] tuple. */
export const HISTORY = JSON.stringify({
	[JSON.stringify(['codex', 'acct', 's1'])]: { title: 'one' },
	[JSON.stringify(['claude', '', 's2'])]: { title: 'two' },
	'bare-legacy-session-id': { title: 'orphan' },
});

export function legacyVault(options: { layout?: unknown; history?: boolean; extras?: boolean } = {}): FaultStorage {
	const storage = new FaultStorage();
	storage.files.set(PATHS.workspace, JSON.stringify(options.layout ?? legacyLayout()));
	if (options.history !== false) storage.files.set(PATHS.history, HISTORY);
	if (options.extras !== false) {
		storage.files.set(PATHS.stats, '{"version":1}');
		storage.files.set(PATHS.registry, '[]');
		// The retired binary index: only its presence is ever observed.
		storage.files.set(PATHS.accountIndex, 'SQLite format 3\0binary');
	}
	return storage;
}

export function deps(storage: FaultStorage, overrides: Partial<LegacyMigrationDeps> = {}): LegacyMigrationDeps {
	let n = 0;
	return {
		storage,
		deviceId: DEVICE,
		vault: VAULT,
		instanceId: 'test-instance',
		spaceName: 'Import Space · Legacy workbench',
		directories: {
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: ROOT }),
		},
		now: () => 1_700_000_000_000,
		newId: () => `op-${++n}`,
		...overrides,
	};
}

/** Writer owner whose lease can be refused (another window) and whose open leases are counted. */
export function writerOwners(conflict = false): WriterOwnerPort & { open: number } {
	const port = {
		open: 0,
		acquire: async () => {
			if (conflict) throw new SpaceError('OWNER_CONFLICT', 'port-in-use');
			port.open++;
			return {
				instanceId: 'x',
				port: 1,
				lost: new AbortController().signal,
				assertHeld: async () => {},
				close: async () => {
					port.open--;
				},
			};
		},
	};
	return port;
}
