import type { RecoveryOwner, RecoveryStorage, StagedWrite } from '../../../../shared/storage/recovery-contracts';
import { RecoveryError } from '../../../../shared/storage/recovery-contracts';
import { runRecoveryTransaction, sha256, type RecoveryGate } from '../../../../shared/storage/recovery-transaction';
import { agentWorkbenchPath } from '../../../../shared/storage/vault-layout';
import {
	addImportSpace,
	classifyAnnotations,
	inspectLegacyLayout,
	legacySpaceId,
	type LayoutCounts,
	type LegacyLayoutStatus,
} from '../../core/migrations/legacy-layout';
import type { SpaceRecord, VaultBinding, VaultDirectoryBinding } from '../../core/space/model';
import type { WriterOwnerPort } from '../../core/space/ports';
import { emptyRecords, isWorkbenchRecords, type WorkbenchRecords } from '../spaces/records';

/** Every file the legacy workbench migration may read, copy or replace for one device. */
export function legacyPaths(deviceId: string) {
	const records = agentWorkbenchPath(deviceId); // validates the device id
	const dir = `.huhu/terminal-agent/${deviceId}`;
	return {
		dir,
		workspace: `${dir}/workspace.json`,
		workspaceBackup: `${dir}/workspace.json.backup`,
		history: `${dir}/history.json`,
		stats: `${dir}/stats.json`,
		workspaceStats: `${dir}/workspace-stats.json`,
		registry: `${dir}/automation-sessions.json`,
		/** Retired account-wide index. Binary, never read, never migrated; only its presence is reported. */
		accountIndex: `${dir}/index.sqlite`,
		records,
		recordsBackup: `${records}.backup`,
		state: `${dir}/legacy-import.json`,
		/** Last refusal or failure, written outside the transaction so the settings tab can explain it. */
		problem: `${dir}/legacy-import-status.json`,
	} as const;
}
export type LegacyPaths = ReturnType<typeof legacyPaths>;

export type SourceKind = 'workspace' | 'history' | 'stats' | 'workspaceStats' | 'automationSessions' | 'accountIndex';
export interface SourceState {
	readonly path: string;
	readonly state: 'absent' | 'present';
	/** sha256 of the exact source bytes; absent for binary or missing sources. */
	readonly digest?: string;
	/** True when a verified recovery copy was saved with the journal. */
	readonly copied: boolean;
	/** Why nothing was converted from this source. */
	readonly note?: 'kept-in-place' | 'retired-never-migrated' | 'damaged-kept' | 'newer-version-kept' | 'from-backup';
}
export interface LegacyImportState {
	readonly version: 1;
	readonly operationId: string;
	readonly completedAt: number;
	readonly deviceId: string;
	readonly vaultId: string;
	readonly sources: Record<SourceKind, SourceState>;
	readonly layout: {
		readonly status: LegacyLayoutStatus;
		readonly counts: LayoutCounts;
		readonly spaceId?: string;
		readonly spaceCreated: boolean;
	};
	readonly annotations: { readonly total: number; readonly attributable: number; readonly unattributable: number };
	/** Legacy automation and shortcut definitions are never bound to the import Space (LOG-030). */
	readonly unboundBusinessKept: true;
}

export type LegacyRefusal =
	'records-unreadable' | 'records-unsupported' | 'records-scope-mismatch' | 'records-invalid' | 'records-backup-only';
export type LegacyMigrationResult =
	| { readonly status: 'nothing-to-migrate' }
	| { readonly status: 'already-migrated'; readonly state: LegacyImportState }
	/** The legacy file changed after cutover (an old writer wrote again). Reported, never imported twice. */
	| { readonly status: 'source-changed'; readonly state: LegacyImportState }
	| { readonly status: 'migrated'; readonly state: LegacyImportState }
	| { readonly status: 'busy'; readonly busy: readonly string[] }
	| { readonly status: 'refused'; readonly reason: LegacyRefusal };

export interface LegacyMigrationDeps {
	readonly storage: RecoveryStorage;
	readonly deviceId: string;
	readonly vault: VaultBinding;
	readonly directories: {
		bindVaultDirectory(vault: VaultBinding, relativePath: string): Promise<VaultDirectoryBinding>;
	};
	/** Cross-window writer exclusion: a second HUHU window holding the Space writer makes the migration BUSY. */
	readonly writerOwners?: WriterOwnerPort;
	readonly instanceId: string;
	/** Already localized name of the import Space. */
	readonly spaceName: string;
	readonly now?: () => number;
	readonly newId?: () => string;
	readonly gate?: RecoveryGate;
	/** Extra owners that must also be quiet (live runtime owners when run after start; none before). */
	readonly extraOwners?: readonly RecoveryOwner[];
}

export function parseLegacyImportState(text: string): LegacyImportState | undefined {
	try {
		const v: unknown = JSON.parse(text);
		if (!v || typeof v !== 'object') return undefined;
		const s = v as Partial<LegacyImportState>;
		return s.version === 1 && typeof s.operationId === 'string' && s.sources && s.layout && s.annotations
			? (s as LegacyImportState)
			: undefined;
	} catch {
		return undefined;
	}
}
export async function readLegacyImportState(
	storage: Pick<RecoveryStorage, 'exists' | 'read'>,
	deviceId: string,
): Promise<LegacyImportState | undefined> {
	const path = legacyPaths(deviceId).state;
	return (await storage.exists(path)) ? parseLegacyImportState(await storage.read(path)) : undefined;
}

const SOURCE_FILES: ReadonlyArray<readonly [SourceKind, keyof LegacyPaths, SourceState['note']]> = [
	['workspace', 'workspace', undefined],
	['history', 'history', 'kept-in-place'],
	['stats', 'stats', 'kept-in-place'],
	['workspaceStats', 'workspaceStats', 'kept-in-place'],
	['automationSessions', 'registry', 'kept-in-place'],
];

function legacyOwner(deps: LegacyMigrationDeps, paths: LegacyPaths): RecoveryOwner {
	const owned = new Set<string>(Object.values(paths).filter((p) => p !== paths.dir && p !== paths.problem));
	let lease: { close(): Promise<void> } | undefined;
	return {
		id: 'agent-legacy',
		owns: (path) => owned.has(path),
		preflight: async () => ({ busy: [] }),
		// Before the first module loads nothing in this process writes these files; another window is excluded by the lease.
		quiesce: async () => {
			if (deps.writerOwners && !lease) lease = await deps.writerOwners.acquire(deps.vault, deps.instanceId);
		},
		drain: async () => {},
		adopt: async () => {},
		release: async () => {
			const held = lease;
			lease = undefined;
			await held?.close();
		},
	};
}

interface Plan {
	readonly writes: StagedWrite[];
	readonly copies: string[];
	readonly state?: LegacyImportState;
	readonly refused?: LegacyRefusal;
	readonly existing?: { readonly state: LegacyImportState; readonly changed: boolean };
}

async function plan(
	deps: LegacyMigrationDeps,
	paths: LegacyPaths,
	read: (p: string) => Promise<string | null>,
	exists: (p: string) => Promise<boolean>,
	operationId: string,
): Promise<Plan> {
	const now = (deps.now ?? Date.now)();
	const texts = new Map<SourceKind, string | null>();
	for (const [kind, key] of SOURCE_FILES) texts.set(kind, await read(paths[key]));
	const backupText = await read(paths.workspaceBackup);
	const accountIndex = await exists(paths.accountIndex);
	const workspaceText = texts.get('workspace') ?? null;
	const workspaceDigest = workspaceText === null ? undefined : await sha256(workspaceText);
	const existingText = await read(paths.state);
	const existing = existingText === null ? undefined : parseLegacyImportState(existingText);
	if (existingText !== null && !existing) {
		// A damaged marker is not proof either way: keep everything and let the caller report it.
		throw new RecoveryError('STAGE_INVALID', 'import-state-unreadable', { path: paths.state });
	}
	if (existing) {
		return {
			writes: [],
			copies: [],
			existing: { state: existing, changed: existing.sources.workspace.digest !== workspaceDigest },
		};
	}
	// Primary damaged but a valid backup exists: the old store would have used the backup, so do we.
	let inspection = inspectLegacyLayout(workspaceText);
	let usedBackup = false,
		sourceText = workspaceText;
	// JsonStore reads the backup for a damaged primary and also for a missing one.
	if ((inspection.status === 'corrupt' || inspection.status === 'absent') && backupText !== null) {
		const fromBackup = inspectLegacyLayout(backupText);
		if (fromBackup.status === 'importable' || fromBackup.status === 'empty') {
			inspection = fromBackup;
			usedBackup = true;
			sourceText = backupText;
		}
	}
	const history = texts.get('history') ?? null;
	let annotations = { total: 0, attributable: 0, unattributable: 0 };
	if (history !== null) {
		try {
			annotations = classifyAnnotations(JSON.parse(history));
		} catch {
			/* damaged annotation file is kept as is */
		}
	}
	const anything = SOURCE_FILES.some(([kind]) => texts.get(kind) !== null) || backupText !== null || accountIndex;
	if (!anything) return { writes: [], copies: [] };

	// Records base: a missing file is the only case that may start from empty.
	const recordsText = await read(paths.records);
	let records: WorkbenchRecords;
	if (recordsText === null) {
		if (await exists(paths.recordsBackup)) return { writes: [], copies: [], refused: 'records-backup-only' };
		records = emptyRecords(deps.vault);
	} else {
		let decoded: unknown;
		try {
			decoded = JSON.parse(recordsText);
		} catch {
			return { writes: [], copies: [], refused: 'records-unreadable' };
		}
		if (!decoded || typeof decoded !== 'object' || (decoded as { version?: unknown }).version !== 2)
			return { writes: [], copies: [], refused: 'records-unsupported' };
		const r = decoded as Partial<WorkbenchRecords>;
		if (
			r.vaultId !== deps.vault.vaultId ||
			r.deviceId !== deps.vault.deviceId ||
			r.physicalRoot?.dev !== deps.vault.root.dev ||
			r.physicalRoot?.ino !== deps.vault.root.ino ||
			r.physicalRoot?.canonicalPath !== deps.vault.root.canonicalPath
		)
			return { writes: [], copies: [], refused: 'records-scope-mismatch' };
		if (!isWorkbenchRecords(decoded)) return { writes: [], copies: [], refused: 'records-invalid' };
		records = decoded;
	}

	let spaceId: string | undefined,
		spaceCreated = false;
	const writes: StagedWrite[] = [];
	if (inspection.status === 'importable' && inspection.layout && sourceText !== null) {
		spaceId = legacySpaceId(await sha256(sourceText));
		const directory = await deps.directories.bindVaultDirectory(deps.vault, '');
		const added = addImportSpace(records, {
			spaceId,
			name: deps.spaceName,
			directory,
			layout: inspection.layout,
			now,
		});
		spaceCreated = added.created;
		if (added.created) {
			if (!isWorkbenchRecords(added.records))
				throw new RecoveryError('STAGE_INVALID', 'records-invalid-after-import');
			// Verify before commit: the staged Space must carry exactly the source counts.
			const staged = added.records;
			const stagedCounts = JSON.stringify(inspectLegacyLayout(JSON.stringify(staged.layouts[spaceId])).counts);
			if (stagedCounts !== JSON.stringify(inspection.counts) || Object.hasOwn(staged.spaces, spaceId) === false)
				throw new RecoveryError('STAGE_INVALID', 'count-mismatch', { spaceId });
			writes.push({ path: paths.records, content: JSON.stringify(staged) });
		}
	}
	const note = (status: LegacyLayoutStatus): SourceState['note'] =>
		usedBackup
			? 'from-backup'
			: status === 'corrupt'
				? 'damaged-kept'
				: status === 'unsupported-version'
					? 'newer-version-kept'
					: undefined;
	const sources = {} as Record<SourceKind, SourceState>;
	const copies: string[] = [];
	for (const [kind, key, fixed] of SOURCE_FILES) {
		const text = texts.get(kind) ?? null;
		const path = paths[key];
		if (text !== null) copies.push(path);
		sources[kind] = {
			path,
			state: text === null ? 'absent' : 'present',
			copied: text !== null,
			...(text === null ? {} : { digest: await sha256(text) }),
			...(kind === 'workspace'
				? note(inspection.status)
					? { note: note(inspection.status) }
					: {}
				: fixed && text !== null
					? { note: fixed }
					: {}),
		};
	}
	if (backupText !== null) copies.push(paths.workspaceBackup);
	sources.accountIndex = {
		path: paths.accountIndex,
		state: accountIndex ? 'present' : 'absent',
		copied: false,
		...(accountIndex ? { note: 'retired-never-migrated' as const } : {}),
	};
	const state: LegacyImportState = {
		version: 1,
		operationId,
		completedAt: now,
		deviceId: deps.deviceId,
		vaultId: deps.vault.vaultId,
		sources,
		layout: { status: inspection.status, counts: inspection.counts, ...(spaceId ? { spaceId } : {}), spaceCreated },
		annotations,
		unboundBusinessKept: true,
	};
	writes.push({ path: paths.state, content: JSON.stringify(state) });
	return { writes, copies, state };
}

/**
 * One-shot, re-entrant, restart-safe legacy workbench import. Run it once per start, after `recoverPending`
 * and before any owner of these files is constructed. It only ever adds: the legacy files stay in place and a
 * recovery copy of every source plus any replaced file is saved with the journal.
 */
export async function runLegacyMigration(deps: LegacyMigrationDeps): Promise<LegacyMigrationResult> {
	const paths = legacyPaths(deps.deviceId);
	const read = async (p: string) => ((await deps.storage.exists(p)) ? deps.storage.read(p) : null);
	let outcome: Plan | undefined;
	const operationId = (deps.newId ?? (() => crypto.randomUUID()))();
	// Fast path without any lock: a finished import whose source did not change needs no writer at all.
	const marker = await readLegacyImportState(deps.storage, deps.deviceId);
	if (marker) {
		const current = await read(paths.workspace);
		const changed = marker.sources.workspace.digest !== (current === null ? undefined : await sha256(current));
		return { status: changed ? 'source-changed' : 'already-migrated', state: marker };
	}
	try {
		const result = await runRecoveryTransaction({
			storage: deps.storage,
			owners: [legacyOwner(deps, paths), ...(deps.extraOwners ?? [])],
			operation: 'legacy-workbench-import',
			gate: deps.gate,
			now: deps.now,
			newId: () => operationId,
			stage: async (r) => {
				outcome = await plan(deps, paths, r, (p) => deps.storage.exists(p), operationId);
				return { writes: outcome.writes, copies: outcome.copies };
			},
		});
		if (outcome?.refused) return { status: 'refused', reason: outcome.refused };
		if (outcome?.existing)
			return {
				status: outcome.existing.changed ? 'source-changed' : 'already-migrated',
				state: outcome.existing.state,
			};
		if (result.noop || !outcome?.state) return { status: 'nothing-to-migrate' };
		return { status: 'migrated', state: outcome.state };
	} catch (error) {
		if (
			error instanceof RecoveryError &&
			error.code === 'QUIESCE_FAILED' &&
			(error.cause as { code?: string } | undefined)?.code === 'OWNER_CONFLICT'
		)
			return { status: 'busy', busy: ['workbench-writer'] };
		if (error instanceof RecoveryError && error.code === 'BUSY')
			return { status: 'busy', busy: [...((error.detail.busy as string[] | undefined) ?? [])] };
		throw error;
	}
}

/** Read-only verification of a finished import: records, layout counts and unchanged sources. Throws on any mismatch. */
export async function verifyLegacyImport(storage: RecoveryStorage, deviceId: string): Promise<LegacyImportState> {
	const paths = legacyPaths(deviceId);
	const state = await readLegacyImportState(storage, deviceId);
	if (!state) throw new RecoveryError('STAGE_INVALID', 'no-import-state');
	if (state.layout.spaceId) {
		const records: unknown = JSON.parse(await storage.read(paths.records));
		if (!isWorkbenchRecords(records)) throw new RecoveryError('STAGE_INVALID', 'records-invalid');
		const space: SpaceRecord | undefined = records.spaces[state.layout.spaceId];
		const layout = records.layouts[state.layout.spaceId];
		if (
			!space ||
			!layout ||
			JSON.stringify(inspectLegacyLayout(JSON.stringify(layout)).counts) !== JSON.stringify(state.layout.counts)
		)
			throw new RecoveryError('STAGE_INVALID', 'import-space-mismatch');
	}
	return state;
}

export type LegacyProblem =
	| { readonly kind: 'refused'; readonly reason: LegacyRefusal }
	| { readonly kind: 'busy' }
	| { readonly kind: 'failed'; readonly code: string }
	| { readonly kind: 'marker-unreadable' }
	| { readonly kind: 'pending' };
export interface LegacyImportView {
	/** Absent when the import has not completed. */
	readonly state?: LegacyImportState;
	/** The legacy layout file differs from the one imported (an older writer wrote it again). */
	readonly sourceChanged: boolean;
	readonly problem?: LegacyProblem;
}

/** Best-effort, outside the transaction: remembers why the import did not complete (undefined clears it). */
export async function recordLegacyProblem(
	storage: RecoveryStorage,
	deviceId: string,
	problem: LegacyProblem | undefined,
): Promise<void> {
	const path = legacyPaths(deviceId).problem;
	try {
		if (!problem) {
			if (await storage.exists(path)) await storage.remove(path);
			return;
		}
		await storage.write(path, JSON.stringify({ version: 1, problem }));
	} catch {
		/* The report is advisory; the import itself is unaffected. */
	}
}

/**
 * Read-only report for the settings page: never writes, never imports. Without a completed import it explains why
 * (last refusal/failure, unreadable marker) whenever legacy data exists, instead of claiming there is none.
 */
export async function inspectLegacyImport(
	storage: Pick<RecoveryStorage, 'exists' | 'read'>,
	deviceId: string,
): Promise<LegacyImportView | undefined> {
	const paths = legacyPaths(deviceId);
	if (await storage.exists(paths.state)) {
		const state = parseLegacyImportState(await storage.read(paths.state));
		if (!state) return { sourceChanged: false, problem: { kind: 'marker-unreadable' } };
		const text = (await storage.exists(paths.workspace)) ? await storage.read(paths.workspace) : null;
		return {
			state,
			sourceChanged: state.sources.workspace.digest !== (text === null ? undefined : await sha256(text)),
		};
	}
	if (!((await storage.exists(paths.workspace)) || (await storage.exists(paths.workspaceBackup)))) return undefined;
	let problem: LegacyProblem = { kind: 'pending' };
	if (await storage.exists(paths.problem)) {
		try {
			const saved = (JSON.parse(await storage.read(paths.problem)) as { problem?: LegacyProblem }).problem;
			if (saved && typeof saved.kind === 'string') problem = saved;
		} catch {
			/* a damaged status file only falls back to "pending" */
		}
	}
	return { sourceChanged: false, problem };
}
