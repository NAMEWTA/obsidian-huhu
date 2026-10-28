import { RecoveryError, type RecoveryAccess, type RecoveryOwner } from '../../../../shared/storage/recovery-contracts';
import { BackupError } from '../../core/backup/model';
import { OWNER, SECTION_OWNER } from '../../core/backup/paths';
import type { PlannedWrite } from './plan';

/**
 * A module that is switched off has no live writer in this process: its files are plain data and are read and replaced
 * offline. The offline owner closes nothing (there is nothing to close), owns exactly the listed paths and adopts
 * nothing; the module reads the restored files when it next starts. Used only when no live owner is registered.
 */
export function offlineOwner(id: string, paths: Iterable<string>): RecoveryOwner {
	const owned = new Set(paths);
	return {
		id: `${id}:offline`,
		owns: (path) => owned.has(path),
		preflight: async () => ({ busy: [] }),
		quiesce: async () => {},
		drain: async () => {},
		adopt: async () => {},
		release: async () => {},
	};
}

/** Offline owners for every planned path whose live owner is not registered. Settings must always be live. */
export function offlineOwnersFor(recovery: RecoveryAccess, writes: readonly PlannedWrite[]): RecoveryOwner[] {
	const paths = new Map<string, Set<string>>();
	const add = (id: string, path: string) => paths.set(id, (paths.get(id) ?? new Set<string>()).add(path));
	for (const write of writes) {
		// A `.backup` sidecar has no live writer of its own: every owner is closed during the transaction anyway.
		const id = write.sidecar
			? 'backup-sidecar'
			: write.role === 'archive'
				? 'backup-archive'
				: write.role === 'shared'
					? OWNER.definitions
					: SECTION_OWNER[write.section];
		if (id === OWNER.settings) {
			if (!recovery.has(OWNER.settings)) throw new BackupError('source-unavailable', { owner: OWNER.settings });
			continue;
		}
		if (id === 'backup-archive' || id === 'backup-sidecar' || !recovery.has(id)) add(id, write.path);
	}
	return [...paths].map(([id, set]) => offlineOwner(id, set));
}

/** Maps the shared protocol's refusal to the stable codes the UI knows. */
export function toBackupError(error: unknown): BackupError {
	if (error instanceof BackupError) return error;
	if (error instanceof RecoveryError) {
		const detail = { ...error.detail, recoveryCode: error.code };
		switch (error.code) {
			case 'BUSY':
				return new BackupError('busy', detail, { cause: error });
			case 'QUIESCE_FAILED':
				return new BackupError('quiesce-failed', detail, { cause: error });
			case 'DRAIN_FAILED':
				return new BackupError('drain-failed', detail, { cause: error });
			case 'SOURCE_DRIFT':
				return new BackupError('source-drift', detail, { cause: error });
			case 'RECOVERY_PENDING':
				return new BackupError('recovery-pending', detail, { cause: error });
			case 'WRITE_FAILED':
				return new BackupError('write-failed', detail, { cause: error });
			case 'ADOPT_FAILED':
				return new BackupError('adopt-failed', detail, { cause: error });
			case 'UNRECOVERABLE':
			case 'JOURNAL_UNREADABLE':
				return new BackupError('unrecoverable', detail, { cause: error });
			default:
				return new BackupError('preflight-failed', detail, { cause: error });
		}
	}
	return new BackupError('unexpected', {}, { cause: error });
}
