import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { AutomationViewHost } from './panel-contract';
import { AutomationPresentation } from './automation-presentation';

export const createAutomationsPage =
	(host: () => AutomationViewHost | undefined, unavailable: () => Error): PageCreate =>
	async (context, target, state, signal) => {
		const panelHost = host();
		if (!panelHost) throw unavailable();
		signal.throwIfAborted();
		const surface = new AutomationPresentation(context, panelHost, target, state, signal);
		return {
			surface,
			canClose: () => surface.canClose(),
			getTarget: () => surface.getTarget(),
			getState: () => surface.getState(),
			restore: async (value) => {
				await surface.restore(value);
			},
			navigate: async (next, abort) => {
				if (!abort.aborted) await surface.navigate(next, abort);
			},
		};
	};
