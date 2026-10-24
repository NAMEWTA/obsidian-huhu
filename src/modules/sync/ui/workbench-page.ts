import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import { SyncPresentation, type SyncPageHost } from './sync-presentation';

/** `changes` asks for the uncommitted changes to be open (status bar rows and the open command use it). */
const wantsChanges = (target: WorkbenchTarget) => target.section === 'changes';

/** Git sync page: a single Git Graph style view. */
export const createSyncPage = (host: SyncPageHost): PageCreate => async (context, target) => {
	const surface = new SyncPresentation(context, host, wantsChanges(target));
	return {
		surface,
		getTarget: () => target,
		navigate: async (next) => {
			target = next;
			if (wantsChanges(next)) surface.showChanges();
		},
	};
};
