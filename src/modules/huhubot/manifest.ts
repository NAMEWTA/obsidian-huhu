import type { ModuleManifest } from '../../app/contracts/module';
import { BOT_RUNTIME } from './api';

export const huhubotManifest: ModuleManifest = {
	id: 'huhubot',
	order: 100,
	icon: 'bot',
	titleKey: 'modules.huhubot',
	descriptionKey: 'modules.huhubotDesc',
	platforms: { desktop: true, mobile: false },
	defaultEnabled: true,
	activation: 'on-demand',
	provides: [BOT_RUNTIME],
	load: () => import('./module'),
};
