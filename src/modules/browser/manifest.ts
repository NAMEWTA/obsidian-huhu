import type { ModuleManifest } from '../../app/contracts/module';
import { BROWSER_WORKSPACE, BROWSER_OPEN } from './api';

export const browserManifest: ModuleManifest = {
	id: 'browser',
	order: 10,
	icon: 'globe',
	titleKey: 'browser.title',
	descriptionKey: 'browser.description',
	platforms: { desktop: true, mobile: false },
	defaultEnabled: true,
	activation: 'startup',
	provides: [BROWSER_WORKSPACE, BROWSER_OPEN],
	load: () => import('./module'),
};
