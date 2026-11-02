import type { App } from 'obsidian';
import { Platform } from 'obsidian';
import type { RecoveryAccess } from '../../../../shared/storage/recovery-contracts';
import { vaultIdentity } from '../../../../host/obsidian/storage/device-id';
import type { VaultBinding } from '../../core/space/model';
import type { DirectoryPort } from '../../core/space/ports';
import type { BackupActions } from './actions';

/**
 * The only backup module the Agent settings page loads (lazily). Builds the real environment: the recovery host's vault
 * storage and owners, this device's identity, and on desktop a read-only physical directory lookup for Space folders.
 */
export async function loadBackupActions(app: App, recovery: RecoveryAccess): Promise<BackupActions> {
	const { deviceId, vaultId } = vaultIdentity(app);
	let target: VaultBinding | undefined;
	let directories: Pick<DirectoryPort, 'bindVaultDirectory'> | undefined;
	if (Platform.isDesktopApp) {
		const root = (app.vault.adapter as { getBasePath?: () => string }).getBasePath?.();
		if (root) {
			const { createDesktopSpacePorts } = await import('../../platform/desktop/spaces/ports');
			const ports = createDesktopSpacePorts({
				vaultRoot: root,
				vaultId,
				deviceId,
				win: app.workspace.containerEl.win,
			});
			target = await ports.directories.inspectVault();
			directories = ports.directories;
		}
	}
	const { createBackupActions } = await import('./actions');
	return createBackupActions({
		recovery,
		storage: recovery.storage,
		device: deviceId,
		vaultName: app.vault.getName(),
		target,
		directories,
	});
}
