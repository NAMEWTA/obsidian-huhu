import type { TextStorage } from './ports';

/**
 * Pure protocol for a cross-owner, restart-safe file replacement (LOG-029, contracts §6).
 *
 * A module publishes a `RecoveryOwner` for the files it really writes; an app-level coordinator runs
 * preflight -> quiesce -> strict drain -> common snapshot -> stage -> recovery copies -> journal ->
 * replace -> adopt -> release. T-15 uses it for the legacy migration; T-16 registers further owners
 * (automations, notifications, settings) without changing this file.
 */

/** Text storage that can also remove a file. Rollback of a previously missing file needs it. */
export interface RecoveryStorage extends TextStorage {
	remove(path: string): Promise<void>;
	/** Direct children of a vault-relative directory (full vault-relative paths); a missing directory lists as empty. Optional: absent on minimal hosts. */
	list?(directory: string): Promise<{ readonly files: readonly string[]; readonly folders: readonly string[] }>;
}

export type RecoveryErrorCode =
	| 'BUSY'
	| 'QUIESCE_FAILED'
	| 'DRAIN_FAILED'
	| 'PATH_NOT_OWNED'
	| 'PATH_INVALID'
	| 'SOURCE_DRIFT'
	| 'STAGE_INVALID'
	| 'WRITE_FAILED'
	| 'ADOPT_FAILED'
	| 'RECOVERY_PENDING'
	| 'UNRECOVERABLE'
	| 'JOURNAL_UNREADABLE';

export class RecoveryError extends Error {
	constructor(
		readonly code: RecoveryErrorCode,
		message: string = code,
		readonly detail: Readonly<Record<string, unknown>> = {},
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = 'RecoveryError';
	}
}

export interface OwnerPreflight {
	/** Human-readable running work that must be stopped by the user first. Never stopped automatically. */
	readonly busy: readonly string[];
}

/**
 * One real persistent owner. Every method must be idempotent for the same token, and `drain` must reject on
 * any persistence failure (a swallowing flush is not a valid implementation).
 */
export interface RecoveryOwner {
	readonly id: string;
	/** Exact whitelist test for vault-relative paths this owner may have replaced. A package never decides paths. */
	owns(path: string): boolean;
	/** Optional: reject a stage that changes more of this owner's files than it may (for example other settings namespaces). */
	validate?(
		changes: ReadonlyArray<{
			readonly path: string;
			readonly before: string | null;
			readonly after: string | null;
		}>,
	): void;
	preflight(): Promise<OwnerPreflight>;
	/** Close every admission (UI, CLI, background, late callbacks). Later writes fail visibly, never silently. */
	quiesce(token: string): Promise<void>;
	/** Await every already admitted write; reject when one failed. */
	drain(token: string): Promise<void>;
	/** After files were replaced: rebuild memory, queues, JsonStore baselines and namespace caches from disk. */
	adopt(token: string, change: { readonly paths: readonly string[] }): Promise<void>;
	/** Reopen admission. Safe to call repeatedly or for a token that never quiesced. */
	release(token: string): Promise<void>;
}

/** What a transaction replaces: `content === null` removes the file. */
export interface StagedWrite {
	readonly path: string;
	readonly content: string | null;
}

export type RecoveryPhase = 'prepared' | 'committing' | 'committed' | 'rolling-back' | 'rolled-back' | 'done';

export interface RecoveryEntry {
	readonly path: string;
	readonly owner: string;
	/** sha256 hex of the bytes before the operation, null when the file did not exist. */
	readonly oldDigest: string | null;
	/** sha256 hex of the bytes after the operation, null when the file is removed. */
	readonly newDigest: string | null;
	readonly oldCopy?: string;
	readonly newCopy?: string;
}

export interface RecoveryJournal {
	readonly format: 1;
	/** Monotonic across operations; the highest valid slot wins, so a torn write falls back one phase. */
	readonly seq: number;
	readonly operationId: string;
	readonly operation: string;
	readonly phase: RecoveryPhase;
	readonly entries: readonly RecoveryEntry[];
	readonly createdAt: number;
	readonly note?: string;
	/** For `rolling-back`: the phase the rollback started from. A restart keeps the skip-if-not-ours rule of `prepared`. */
	readonly from?: RecoveryPhase;
}

export type RecoveryOutcome =
	| { readonly status: 'none' }
	| { readonly status: 'rolled-back'; readonly operationId: string }
	| { readonly status: 'rolled-forward'; readonly operationId: string };

/** What a module sees of the app recovery host: register its real file owners; run a cross-owner operation. */
export interface RecoveryAccess {
	/** Returns the unregister function. A duplicate owner id is a wiring error and throws. */
	register(owner: RecoveryOwner): () => void;
	run(options: RecoveryRunOptions): Promise<RecoveryResult>;
	/** The vault storage the protocol replaces files in; a backup reads and lists through it (never writes around a transaction). */
	readonly storage: RecoveryStorage;
	/** Whether an owner with this id is registered (a module that is off has none, and its files are handled offline). */
	has(ownerId: string): boolean;
	/** Resolves when no operation is in flight; rejects while an unrecoverable hold is active. */
	settled(): Promise<void>;
}
export interface RecoveryRunOptions {
	readonly operation: string;
	/** Runs after all owners are quiet; `read` returns exact current bytes (null when missing). `copies` are saved unchanged. */
	readonly stage: (
		read: (path: string) => Promise<string | null>,
	) => Promise<{ writes: readonly StagedWrite[]; copies?: readonly string[] }>;
	readonly ownerIds?: readonly string[];
	readonly extraOwners?: readonly RecoveryOwner[];
	readonly newId?: () => string;
	readonly now?: () => number;
}
export interface RecoveryResult {
	readonly operationId: string;
	readonly changed: readonly string[];
	readonly copied: readonly string[];
	readonly noop: boolean;
}

export const RECOVERY_ROOT = '.huhu/recovery/transaction';
export const JOURNAL_SLOTS = [`${RECOVERY_ROOT}/journal.a.json`, `${RECOVERY_ROOT}/journal.b.json`] as const;
export const TERMINAL_PHASES: readonly RecoveryPhase[] = ['rolled-back', 'done'];

export function isRecoveryJournal(value: unknown): value is RecoveryJournal {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	const phases: readonly unknown[] = ['prepared', 'committing', 'committed', 'rolling-back', 'rolled-back', 'done'];
	if (v.format !== 1 || !Number.isSafeInteger(v.seq) || (v.seq as number) < 1) return false;
	if (typeof v.operationId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(v.operationId)) return false;
	if (typeof v.operation !== 'string' || !phases.includes(v.phase) || typeof v.createdAt !== 'number') return false;
	if (v.from !== undefined && !phases.includes(v.from)) return false;
	if (!Array.isArray(v.entries) || v.entries.length > 64) return false;
	const digest = (d: unknown) => d === null || (typeof d === 'string' && /^[0-9a-f]{64}$/.test(d));
	return v.entries.every((e: unknown) => {
		if (!e || typeof e !== 'object') return false;
		const r = e as Record<string, unknown>;
		return (
			typeof r.path === 'string' &&
			isSafeRelativePath(r.path) &&
			typeof r.owner === 'string' &&
			digest(r.oldDigest) &&
			digest(r.newDigest) &&
			(r.oldCopy === undefined || (typeof r.oldCopy === 'string' && isSafeRelativePath(r.oldCopy))) &&
			(r.newCopy === undefined || (typeof r.newCopy === 'string' && isSafeRelativePath(r.newCopy)))
		);
	});
}

/** Vault-relative, no traversal, no absolute or drive paths: a journal path can never leave the vault. */
export function isSafeRelativePath(path: string): boolean {
	return (
		path.length > 0 &&
		path.length < 512 &&
		!path.startsWith('/') &&
		!/[\\\0:]/.test(path) &&
		path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
	);
}
