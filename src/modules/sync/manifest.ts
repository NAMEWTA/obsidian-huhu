import type { ModuleManifest } from '../../app/contracts/module';
import { SYNC_WORKBENCH } from './api';

/** Desktop Git tools are available by default; remote operations and automatic schedules remain opt-in. */
export const syncManifest: ModuleManifest = {
	id: 'sync',
	order: 90,
	icon: 'git-branch',
	titleKey: 'workbench.sync',
	descriptionKey: 'modules.syncDesc',
	platforms: { desktop: true, mobile: false },
	defaultEnabled: true,
	activation: 'layout-ready',
	provides: [SYNC_WORKBENCH],
	load: () => import('./module'),
};
