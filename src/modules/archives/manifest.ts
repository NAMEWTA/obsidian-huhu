import type { ModuleManifest } from '../../app/contracts/module';
import { AUTOMATION_SOURCES } from '../automations/api';
import { ARCHIVES_WORKBENCH, ARCHIVES_CATALOG, ARCHIVES_QUERY, ARCHIVES_COMMANDS, ARCHIVE_RESOURCES } from './api';

export const archivesManifest: ModuleManifest = {
	id: 'archives',
	order: 40,
	icon: 'contact-round',
	titleKey: 'contacts.title',
	descriptionKey: 'contacts.description',
	platforms: { desktop: true, mobile: true },
	defaultEnabled: true,
	activation: 'startup',
	provides: [ARCHIVES_WORKBENCH, ARCHIVES_CATALOG, ARCHIVES_QUERY, ARCHIVES_COMMANDS, ARCHIVE_RESOURCES],
	contributes: [AUTOMATION_SOURCES],
	load: () => import('./module'),
};
