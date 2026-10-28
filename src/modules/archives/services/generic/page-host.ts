import type { SettingsHandle } from '../../../../shared/settings/store';
import type { ContactsSettings } from '../../../../shared/contacts-settings';
import type { EntitySummary } from '../../core/schema/model';
import type { ArchivesApplication } from './application';
export interface GenericArchivesHost {
	readonly application: ArchivesApplication;
	readonly settings: SettingsHandle<ContactsSettings>;
	readonly newReminder?: (record: EntitySummary) => void;
}
