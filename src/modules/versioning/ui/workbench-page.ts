import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import { SyncPresentation, type SyncPageHost } from './sync-presentation';
import type { WorkbenchMode } from './GitWorkbench';
import { createDiffWorker } from './diff-worker-factory';

const requestedMode = (target: WorkbenchTarget): WorkbenchMode =>
	target.section === 'history' || target.section === 'compare' ? target.section : 'changes';

/** The versioning feature owns one workbench page with changes, history and compare modes. */
export const createSyncPage =
	(host: SyncPageHost): PageCreate =>
	async (context, target) => {
		const surface = new SyncPresentation(
			context,
			{ ...host, createWorker: host.createWorker ?? createDiffWorker },
			requestedMode(target),
		);
		return {
			surface,
			getTarget: () => target,
			navigate: async (next) => {
				target = next;
				surface.showMode(requestedMode(next));
			},
		};
	};
