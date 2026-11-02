import type { ModuleManifest } from '../../app/contracts/module';
import { VERSIONING_WORKBENCH, VERSION_HISTORY, NOTE_HISTORY_PANEL } from './api';

/** Desktop Git tools are available by default; remote operations and automatic schedules remain opt-in. */
export const versioningManifest: ModuleManifest = {
	id: 'versioning',
	order: 90,
	icon: 'git-branch',
	titleKey: 'workbench.sync',
	descriptionKey: 'modules.syncDesc',
	platforms: { desktop: true, mobile: false },
	defaultEnabled: true,
	activation: 'layout-ready',
	provides: [VERSIONING_WORKBENCH, VERSION_HISTORY, NOTE_HISTORY_PANEL],
	load: () => import('./module'),
};
