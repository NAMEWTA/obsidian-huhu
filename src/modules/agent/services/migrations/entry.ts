import type { App } from 'obsidian';
import type { RecoveryAccess } from '../../../../shared/storage/recovery-contracts';
import type { SharedWorkspaceOwner } from '../../../../app/contracts/shared-workspace';
import type { AgentController } from '../controller';

/**
 * The only recovery-owner module `module.ts` imports. It is a thin set of async entry points whose heavy
 * dependencies are loaded one `import()` deeper, so they stay out of the Agent activation closure.
 */

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
