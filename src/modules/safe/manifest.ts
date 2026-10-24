import type { ModuleManifest } from '../../app/contracts/module';

export const safeManifest: ModuleManifest = {
	id: 'safe',
	order: 65,
	icon: 'vault',
	titleKey: 'workbench.safe',
	descriptionKey: 'modules.safeDesc',
	platforms: { desktop: true, mobile: false },
	defaultEnabled: true,
	activation: 'on-demand',
	load: () => import('./module'),
};
