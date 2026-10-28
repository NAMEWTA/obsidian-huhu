import { describe, expect, test } from 'vitest';
import { RecoveryError } from '../../src/shared/storage/recovery-contracts';
import { RecoveryGate } from '../../src/shared/storage/recovery-transaction';
import { readJournal, recoverPending, sha256 } from '../../src/shared/storage/recovery-transaction';
import { legacySpaceId } from '../../src/modules/agent/core/migrations/legacy-layout';
import {
	isWorkbenchRecords,
	emptyRecords,
	type WorkbenchRecords,
} from '../../src/modules/agent/services/spaces/records';
import {
	readLegacyImportState,
	runLegacyMigration,
	verifyLegacyImport,
	inspectLegacyImport,
	recordLegacyProblem,
} from '../../src/modules/agent/services/migrations/legacy-workbench';
import { DEVICE, PATHS, ROOT, VAULT, deps, legacyLayout, legacyVault, writerOwners } from './fixtures';
import { FaultStorage } from './fault-storage';

const records = (s: FaultStorage) => JSON.parse(s.files.get(PATHS.records)!) as WorkbenchRecords;
const sources = [PATHS.workspace, PATHS.history, PATHS.stats, PATHS.registry, PATHS.accountIndex];
const bytes = (s: FaultStorage, paths: readonly string[]) => paths.map((p) => s.files.get(p) ?? null);

describe('legacy workbench import', () => {
	test('a fresh vault is untouched', async () => {
		const storage = new FaultStorage();
		expect(await runLegacyMigration(deps(storage))).toEqual({ status: 'nothing-to-migrate' });
		expect(storage.mutations).toBe(0);
	});

	test('multi-group legacy layout becomes one verifiable Import Space; sources stay and are copied', async () => {
		const storage = legacyVault();
		const before = bytes(storage, sources);
		const result = await runLegacyMigration(deps(storage));
		expect(result.status).toBe('migrated');
		const state = (result as { state: NonNullable<Awaited<ReturnType<typeof readLegacyImportState>>> }).state;
		const digest = await sha256(storage.files.get(PATHS.workspace)!);
		const id = legacySpaceId(digest);
		const r = records(storage);
		expect(isWorkbenchRecords(r)).toBe(true);
		expect(Object.keys(r.spaces)).toEqual([id]);
		expect(r.spaces[id]).toMatchObject({
			name: 'Import Space · Legacy workbench',
			archived: false,
			directory: { kind: 'vault', relativePath: '', target: ROOT },
		});
		expect(r.selectedSpaceId).toBe(id);
		// Counts and identities match the source layout exactly; the layout is stored untouched.
		expect(state.layout.counts).toEqual({
			tabs: 4,
			terminal: 2,
			browser: 1,
			page: 1,
			groups: 2,
			closedTabs: 1,
			panes: 4,
		});
		expect(r.layouts[id]).toEqual(legacyLayout());
		expect(Object.keys(r.layouts[id]!.tabs).sort()).toEqual(['a', 'b', 'tab-page-board', 'w']);
		// Nothing was moved or rewritten: legacy bytes identical, a verified copy of each present source exists.
		expect(bytes(storage, sources)).toEqual(before);
		const journal = (await readJournal(storage))!;
		expect(journal.phase).toBe('done');
		for (const entry of journal.entries.filter((e) => e.oldCopy))
			expect(await sha256(storage.files.get(entry.oldCopy!)!)).toBe(entry.oldDigest);
		for (const p of [PATHS.workspace, PATHS.history, PATHS.stats, PATHS.registry])
			expect(journal.entries.some((e) => e.path === p && e.oldCopy)).toBe(true);
		// The binary account index is reported, never copied, read or migrated.
		expect(state.sources.accountIndex).toMatchObject({
			state: 'present',
			copied: false,
			note: 'retired-never-migrated',
		});
		expect(state.annotations).toEqual({ total: 3, attributable: 2, unattributable: 1 });
		expect(state.unboundBusinessKept).toBe(true);
		await expect(verifyLegacyImport(storage, DEVICE)).resolves.toMatchObject({ layout: { spaceId: id } });
	});

	test('re-entrant by source digest: repeating writes nothing and never imports twice', async () => {
		const storage = legacyVault();
		await runLegacyMigration(deps(storage));
		const done = new Map(storage.files),
			mutations = storage.mutations;
		expect((await runLegacyMigration(deps(storage))).status).toBe('already-migrated');
		expect((await runLegacyMigration(deps(storage.reboot()))).status).toBe('already-migrated');
		expect(storage.mutations).toBe(mutations);
		expect([...storage.files]).toEqual([...done]);
		// An older writer touches workspace.json after cutover: reported, not imported a second time.
		storage.files.set(PATHS.workspace, JSON.stringify({ ...legacyLayout(), closedTabs: [] }));
		const again = await runLegacyMigration(deps(storage));
		expect(again.status).toBe('source-changed');
		expect(Object.keys(records(storage).spaces)).toHaveLength(1);
		expect((await inspectLegacyImport(storage, DEVICE))?.sourceChanged).toBe(true);
	});

	test('a Space that already has the same directory is not merged; existing records and selection are preserved', async () => {
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
		existing.layouts['mine'] = legacyLayout();
		storage.files.set(PATHS.records, JSON.stringify(existing));
		await runLegacyMigration(deps(storage));
		const r = records(storage);
		expect(Object.keys(r.spaces).sort()).toHaveLength(2);
		expect(r.spaces['mine']).toEqual(existing.spaces['mine']);
		expect(r.layouts['mine']).toEqual(existing.layouts['mine']);
		expect(r.selectedSpaceId).toBe('mine');
		// The old valid records are saved as a recovery copy before replacement.
		const journal = (await readJournal(storage))!;
		const entry = journal.entries.find((e) => e.path === PATHS.records)!;
		expect(JSON.parse(storage.files.get(entry.oldCopy!)!)).toEqual(existing);
	});

	test.each([
		['empty layout', { version: 1, tabs: {}, groups: [], closedTabs: [] }, 'empty'],
		['damaged JSON', '{"version":1,"tabs"', 'corrupt'],
		['partial version (no groups)', { version: 1, tabs: {} }, 'corrupt'],
		['newer version', { version: 2, tabs: {}, groups: [], closedTabs: [] }, 'unsupported-version'],
		[
			'tab id mismatch',
			{ version: 1, tabs: { x: { id: 'y', kind: 'terminal' } }, groups: [], closedTabs: [] },
			'corrupt',
		],
	])(
		'%s creates no Space, keeps the file, and never writes a default empty layout',
		async (_name, layout, status) => {
			const storage = legacyVault({ layout: typeof layout === 'string' ? undefined : layout });
			if (typeof layout === 'string') storage.files.set(PATHS.workspace, layout);
			const original = storage.files.get(PATHS.workspace);
			const result = await runLegacyMigration(deps(storage));
			expect(result.status).toBe('migrated');
			expect((result as { state: { layout: { status: string; spaceId?: string } } }).state.layout).toMatchObject({
				status,
			});
			expect((result as { state: { layout: { spaceId?: string } } }).state.layout.spaceId).toBeUndefined();
			expect(storage.files.has(PATHS.records)).toBe(false);
			expect(storage.files.get(PATHS.workspace)).toBe(original);
		},
	);

	test('a damaged primary with a valid backup imports from the backup, as the old store would have read it', async () => {
		const storage = legacyVault();
		storage.files.set(PATHS.workspaceBackup, JSON.stringify(legacyLayout()));
		storage.files.set(PATHS.workspace, '{broken');
		const result = await runLegacyMigration(deps(storage));
		expect(result).toMatchObject({
			status: 'migrated',
			state: { sources: { workspace: { note: 'from-backup' } } },
		});
		expect(Object.keys(records(storage).spaces)).toHaveLength(1);
		expect(storage.files.get(PATHS.workspace)).toBe('{broken');
	});

	test.each([
		['unparseable records', '{nope', 'records-unreadable'],
		['newer records version', JSON.stringify({ version: 3 }), 'records-unsupported'],
		[
			'records of another vault',
			JSON.stringify({ ...emptyRecords({ ...VAULT, vaultId: 'other' }) }),
			'records-scope-mismatch',
		],
		[
			'structurally invalid records',
			JSON.stringify({ ...emptyRecords(VAULT), spaces: { x: { id: 'wrong' } } }),
			'records-invalid',
		],
	])('%s: refuse without writing and without replacing it by an empty default', async (_name, text, reason) => {
		const storage = legacyVault();
		storage.files.set(PATHS.records, text);
		const mutations = storage.mutations;
		expect(await runLegacyMigration(deps(storage))).toEqual({ status: 'refused', reason });
		expect(storage.mutations).toBe(mutations);
		expect(storage.files.get(PATHS.records)).toBe(text);
		expect(storage.files.has(PATHS.state)).toBe(false);
	});

	test('records known only by their backup are not recreated', async () => {
		const storage = legacyVault();
		storage.files.set(PATHS.recordsBackup, JSON.stringify(emptyRecords(VAULT)));
		expect(await runLegacyMigration(deps(storage))).toEqual({ status: 'refused', reason: 'records-backup-only' });
		expect(storage.files.has(PATHS.records)).toBe(false);
	});

	test('another window holding the writer makes the import BUSY: nothing is written, and own leases are released', async () => {
		const storage = legacyVault();
		expect(await runLegacyMigration(deps(storage, { writerOwners: writerOwners(true) }))).toEqual({
			status: 'busy',
			busy: ['workbench-writer'],
		});
		expect(storage.mutations).toBe(0);
		const owners = writerOwners();
		await runLegacyMigration(deps(storage, { writerOwners: owners }));
		expect(owners.open).toBe(0);
		expect(storage.files.has(PATHS.records)).toBe(true);
	});

	test('disk full on the records file rolls back completely and a retry succeeds', async () => {
		const storage = legacyVault();
		storage.failWrite = (p) => p === PATHS.records;
		await expect(runLegacyMigration(deps(storage))).rejects.toBeInstanceOf(RecoveryError);
		expect(storage.files.has(PATHS.records)).toBe(false);
		expect(storage.files.has(PATHS.state)).toBe(false);
		storage.failWrite = undefined;
		expect((await runLegacyMigration(deps(storage))).status).toBe('migrated');
		expect(Object.keys(records(storage).spaces)).toHaveLength(1);
	});

	test('power loss at every mutating step: a new instance recovers to nothing-or-everything and the import completes exactly once', async () => {
		const probe = legacyVault();
		await runLegacyMigration(deps(probe));
		const total = probe.mutations;
		expect(total).toBeGreaterThan(9);
		const outcomes = new Set<string>();
		for (const torn of [false, true]) {
			for (let at = 1; at <= total; at++) {
				const storage = legacyVault();
				storage.crashAt = at;
				storage.torn = torn;
				await runLegacyMigration(deps(storage)).catch(() => undefined);
				const restarted = storage.reboot();
				await recoverPending(restarted);
				const hasRecords = restarted.files.has(PATHS.records),
					hasState = restarted.files.has(PATHS.state);
				// Records and the cutover marker are never split across the crash.
				expect(hasRecords, `step ${at} torn=${torn}`).toBe(hasState);
				outcomes.add(hasRecords ? 'forward' : 'back');
				// Legacy sources are never lost.
				expect(restarted.files.get(PATHS.workspace)).toBe(JSON.stringify(legacyLayout()));
				const again = await runLegacyMigration(deps(restarted));
				expect(['migrated', 'already-migrated']).toContain(again.status);
				expect(Object.keys(records(restarted).spaces)).toHaveLength(1);
				expect((await readJournal(restarted))?.phase).toBe('done');
				expect((await runLegacyMigration(deps(restarted))).status).toBe('already-migrated');
			}
		}
		expect([...outcomes].sort()).toEqual(['back', 'forward']);
	});

	test('a second power loss during recovery still converges without losing the valid old records', async () => {
		const existing = emptyRecords(VAULT);
		const seed = () => {
			const s = legacyVault();
			s.files.set(PATHS.records, JSON.stringify(existing));
			return s;
		};
		const probe = seed();
		await runLegacyMigration(deps(probe));
		for (let at = 8; at <= probe.mutations; at++) {
			const storage = seed();
			storage.crashAt = at;
			await runLegacyMigration(deps(storage)).catch(() => undefined);
			for (let second = 1; second <= 4; second++) {
				const mid = storage.reboot();
				mid.crashAt = second;
				await recoverPending(mid).catch(() => undefined);
			}
			const final = storage.reboot();
			await recoverPending(final);
			const raw = final.files.get(PATHS.records)!;
			expect(isWorkbenchRecords(JSON.parse(raw))).toBe(true);
			expect(
				[JSON.stringify(existing), undefined].includes(raw) || Object.keys(JSON.parse(raw).spaces).length === 1,
			).toBe(true);
		}
	});
});

describe('old writer refusal', () => {
	test('the retained v1 workspace writer refuses to load or write once the import state exists', async () => {
		const { createWorkspaceStore, LegacyWriterRefused } =
			await import('../../src/modules/agent/services/workspace-store');
		const storage = legacyVault();
		await runLegacyMigration(deps(storage));
		const before = storage.files.get(PATHS.workspace);
		const reports: unknown[] = [];
		const clock = {
			setTimeout: (fn: () => void) => {
				fn();
				return 1;
			},
			clearTimeout: () => {},
		} as unknown as Pick<Window, 'setTimeout' | 'clearTimeout'>;
		const persistence = createWorkspaceStore(storage, DEVICE, clock, (e) => reports.push(e));
		await persistence.ready;
		expect(reports[0]).toBeInstanceOf(LegacyWriterRefused);
		const mutations = storage.mutations;
		persistence.store.setState({ ...persistence.store.getState(), activeGroupId: 'zz' }, true);
		await persistence.flush();
		expect(storage.mutations).toBe(mutations);
		expect(storage.files.get(PATHS.workspace)).toBe(before);
	});

	test('a v1 writer that was already open when the cutover happened writes nothing afterwards', async () => {
		const { createWorkspaceStore, LegacyWriterRefused } =
			await import('../../src/modules/agent/services/workspace-store');
		const storage = legacyVault();
		const reports: unknown[] = [];
		const clock = { setTimeout: () => 1, clearTimeout: () => {} } as unknown as Pick<
			Window,
			'setTimeout' | 'clearTimeout'
		>;
		const persistence = createWorkspaceStore(storage, DEVICE, clock, (e) => reports.push(e));
		await persistence.ready;
		await runLegacyMigration(deps(storage));
		const before = storage.files.get(PATHS.workspace);
		persistence.store.setState({ ...persistence.store.getState(), activeGroupId: 'g2' }, true);
		await persistence.flush();
		expect(reports.at(-1)).toBeInstanceOf(LegacyWriterRefused);
		expect(storage.files.get(PATHS.workspace)).toBe(before);
	});
});

describe('review round 4', () => {
	test('L-4: a missing primary with a valid backup is imported from the backup, like JsonStore would read it', async () => {
		const storage = legacyVault();
		storage.files.set(PATHS.workspaceBackup, JSON.stringify(legacyLayout()));
		storage.files.delete(PATHS.workspace);
		const result = await runLegacyMigration(deps(storage));
		expect(result).toMatchObject({
			status: 'migrated',
			state: { layout: { status: 'importable' }, sources: { workspace: { note: 'from-backup' } } },
		});
		expect(Object.keys(records(storage).spaces)).toHaveLength(1);
	});

	test('M-1: a failed committed/done journal write stops start-up (gate held), never reopens, and the next start converges', async () => {
		for (const nth of [3, 4]) {
			const storage = legacyVault(),
				gate = new RecoveryGate();
			let seen = 0;
			storage.failWrite = (p) => p.includes('/journal.') && ++seen === nth;
			await expect(runLegacyMigration(deps(storage, { gate }))).rejects.toMatchObject({ code: 'UNRECOVERABLE' });
			expect(gate.held).toBe(true);
			storage.failWrite = undefined;
			const restarted = storage.reboot();
			await recoverPending(restarted);
			const result = await runLegacyMigration(deps(restarted));
			expect(['migrated', 'already-migrated']).toContain(result.status);
			expect(Object.keys(records(restarted).spaces)).toHaveLength(1);
			expect((await readJournal(restarted))?.phase).toBe('done');
		}
	});

	test('M-2: the report explains refusals and failures instead of claiming there is no legacy data', async () => {
		const storage = legacyVault();
		// Nothing attempted yet.
		expect(await inspectLegacyImport(storage, DEVICE)).toMatchObject({ problem: { kind: 'pending' } });
		await recordLegacyProblem(storage, DEVICE, { kind: 'refused', reason: 'records-scope-mismatch' });
		expect(await inspectLegacyImport(storage, DEVICE)).toMatchObject({
			problem: { kind: 'refused', reason: 'records-scope-mismatch' },
		});
		await recordLegacyProblem(storage, DEVICE, { kind: 'busy' });
		expect((await inspectLegacyImport(storage, DEVICE))?.problem).toEqual({ kind: 'busy' });
		await recordLegacyProblem(storage, DEVICE, undefined);
		expect((await inspectLegacyImport(storage, DEVICE))?.problem).toEqual({ kind: 'pending' });
		// An unreadable marker is reported, not hidden.
		storage.files.set(PATHS.state, '{bad');
		expect(await inspectLegacyImport(storage, DEVICE)).toMatchObject({ problem: { kind: 'marker-unreadable' } });
		// No legacy data and no marker: genuinely nothing.
		expect(await inspectLegacyImport(new FaultStorage(), DEVICE)).toBeUndefined();
		// A finished import reports no problem even with a stale status file.
		const done = legacyVault();
		await runLegacyMigration(deps(done));
		await recordLegacyProblem(done, DEVICE, { kind: 'busy' });
		const view = await inspectLegacyImport(done, DEVICE);
		expect(view?.problem).toBeUndefined();
		expect(view?.state?.layout.spaceId).toBeDefined();
	});

	test('M-3: every journal slot write that lands then throws (or fails read-back) never loses later work and never deletes the records', async () => {
		for (const mode of ['land', 'readback'] as const) {
			for (const nth of [1, 2, 3, 4]) {
				const storage = legacyVault(),
					gate = new RecoveryGate();
				let seen = 0,
					target: string | undefined;
				const hit = (p: string) => p.includes('/journal.') && ++seen === nth && ((target = p), true);
				if (mode === 'land') storage.landThenThrow = hit;
				else {
					storage.afterWrite = (p) => void hit(p);
					storage.failRead = (p) => p === target;
				}
				await expect(runLegacyMigration(deps(storage, { gate }))).rejects.toBeDefined();
				storage.landThenThrow = undefined;
				storage.failRead = undefined;
				storage.afterWrite = undefined;
				if (nth >= 2) expect(gate.held, `${mode} #${nth}`).toBe(true);
				const restarted = storage.reboot();
				await recoverPending(restarted);
				// Either nothing was imported or everything was; the records are never half-deleted.
				expect(restarted.files.has(PATHS.records), `${mode} #${nth}`).toBe(restarted.files.has(PATHS.state));
				const result = await runLegacyMigration(deps(restarted));
				expect(['migrated', 'already-migrated']).toContain(result.status);
				expect(Object.keys(records(restarted).spaces)).toHaveLength(1);
			}
		}
	});
});
