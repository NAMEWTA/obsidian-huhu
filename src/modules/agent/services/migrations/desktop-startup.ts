import type { RecoveryStorage } from '../../../../shared/storage/recovery-contracts';
import type { RecoveryGate } from '../../../../shared/storage/recovery-transaction';
import { recordLegacyProblem, runLegacyMigration, type LegacyMigrationResult } from './legacy-workbench';
import { createDesktopSpacePorts } from '../../platform/desktop/spaces/ports';

export interface DesktopMigrationOptions {
	readonly storage: RecoveryStorage;
	readonly gate: RecoveryGate;
	readonly vaultRoot: string;
	readonly vaultId: string;
	readonly deviceId: string;
	readonly win: Window;
	/** Already localized. */
	readonly spaceName: string;
	readonly instanceId?: string;
}

/**
 * Pre-start legacy import on a desktop vault. It binds the vault root through the same physical-directory port the
 * Space owner uses and takes the same cross-window writer lease, so a second window makes it BUSY, not racy.
 */
export async function runDesktopLegacyMigration(options: DesktopMigrationOptions): Promise<LegacyMigrationResult> {
	const ports = createDesktopSpacePorts({
		vaultRoot: options.vaultRoot,
		vaultId: options.vaultId,
		deviceId: options.deviceId,
		win: options.win,
	});
	try {
		const vault = await ports.directories.inspectVault();
		const result = await runLegacyMigration({
			storage: options.storage,
			deviceId: options.deviceId,
			vault,
			directories: ports.directories,
			writerOwners: ports.owners,
			instanceId: options.instanceId ?? crypto.randomUUID(),
			spaceName: options.spaceName,
			gate: options.gate,
		});
		await recordLegacyProblem(
			options.storage,
			options.deviceId,
			result.status === 'refused'
				? { kind: 'refused', reason: result.reason }
				: result.status === 'busy'
					? { kind: 'busy' }
					: undefined,
		);
		return result;
	} catch (error) {
		await recordLegacyProblem(options.storage, options.deviceId, {
			kind: 'failed',
			code: (error as { code?: string }).code ?? 'ERROR',
		});
		throw error;
	}
}
