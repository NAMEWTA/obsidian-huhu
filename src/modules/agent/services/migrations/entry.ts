import type { App } from 'obsidian';
import { registerMessages, t } from '../../../../shared/i18n/index';
import type { RecoveryAccess, RecoveryStorage } from '../../../../shared/storage/recovery-contracts';
import type { RecoveryGate } from '../../../../shared/storage/recovery-transaction';
import type { SharedWorkspaceOwner } from '../../../../app/contracts/shared-workspace';
import type { AgentController } from '../controller';
import type { LegacyImportView, LegacyMigrationResult } from './legacy-workbench';

/**
 * The only migration/recovery module `module.ts` imports. It is a thin set of async entry points whose heavy
 * dependencies are loaded one `import()` deeper, so they stay out of the Agent activation closure.
 */

/** Pre-start desktop legacy import. BUSY or a refused records file leaves all data untouched; retried next start. */
export async function runStartupLegacyMigration(
	app: App,
	host: { readonly storage: RecoveryStorage; readonly gate: RecoveryGate },
): Promise<LegacyMigrationResult> {
	const [{ runDesktopLegacyMigration }, { vaultIdentity }, strings] = await Promise.all([
		import('./desktop-startup'),
		import('../../../../host/obsidian/storage/device-id'),
		import('../../../../shared/i18n/lazy/migration'),
	]);
	registerMessages(strings.messages);
	const identity = vaultIdentity(app);
	return runDesktopLegacyMigration({
		storage: host.storage,
		gate: host.gate,
		vaultRoot: (app.vault.adapter as { getBasePath?: () => string }).getBasePath?.() ?? '',
		vaultId: identity.vaultId,
		deviceId: identity.deviceId,
		win: app.workspace.containerEl.win,
		spaceName: t('agent.migration.spaceName'),
	});
}

/** Space records + layouts as one owner, registered on the app recovery host; returns the owner and its unregister. */
export async function registerSpaceOwner(
	recovery: RecoveryAccess,
	deviceId: string,
	spaces: Parameters<typeof import('./agent-owners').spaceWorkspaceOwner>[1],
	layouts: Parameters<typeof import('./agent-owners').spaceWorkspaceOwner>[2],
): Promise<{ owner: NonNullable<SharedWorkspaceOwner['recoveryOwner']>; unregister: () => void }> {
	const { spaceWorkspaceOwner } = await import('./agent-owners');
	const owner = spaceWorkspaceOwner(deviceId, spaces, layouts);
	return { owner, unregister: recovery.register(owner) };
}

/** History annotations, usage stats, automation-session registry and the running-work BUSY lister of one controller. */
export async function registerLiveOwners(
	recovery: RecoveryAccess,
	app: App,
	live: AgentController,
): Promise<Array<() => void>> {
	const [owners, { vaultIdentity }] = await Promise.all([
		import('./agent-owners'),
		import('../../../../host/obsidian/storage/device-id'),
	]);
	const { deviceId } = vaultIdentity(app);
	return [
		owners.runningWorkOwner(() => live.sessions.list().flatMap((item) => (item.running ? [item.title] : []))),
		owners.historyAnnotationOwner(deviceId, () => live.workspaceHistoryService()),
		owners.usageStatsOwner(deviceId, live.stats, true),
		owners.automationRegistryOwner(deviceId, live.runtime),
	].map((owner) => recovery.register(owner));
}

export async function loadLegacyImport(app: App): Promise<LegacyImportView | undefined> {
	const [{ inspectLegacyImport }, { privateVaultStorage }, { vaultIdentity }] = await Promise.all([
		import('./legacy-workbench'),
		import('../../../../host/obsidian/storage/private-storage'),
		import('../../../../host/obsidian/storage/device-id'),
	]);
	return inspectLegacyImport(privateVaultStorage(app), vaultIdentity(app).deviceId);
}
