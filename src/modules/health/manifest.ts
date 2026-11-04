import type { ModuleManifest } from '../../app/contracts/module';
import { NOTIFICATION_OPENERS } from '../notifications/api';
import { HEALTH_SCANNER, HEALTH_REPAIRS } from './api';

export const healthManifest: ModuleManifest = {
	id: 'health', order: 85, icon: 'heart-pulse',
	titleKey: 'health.title', descriptionKey: 'health.description',
	platforms: { desktop: true, mobile: true }, defaultEnabled: true,
	activation: 'layout-ready', provides: [HEALTH_SCANNER, HEALTH_REPAIRS], contributes: [NOTIFICATION_OPENERS],
	load: () => import('./module'),
};
