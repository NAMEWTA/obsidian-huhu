import type { SettingsHandle } from '../../../shared/settings/store';
import type { ContactsSettings } from '../../../shared/contacts-settings';
import type { ArchiveRecord } from '../core/model';
import type { ArchivesCatalog, ArchivesCommands, ArchivesQuery } from '../api';
import type { ArchiveDraftOwner } from './form-drafts';
import type { ContactsController } from '../platform/controller';

/** What the archives page needs from its module. */
export interface ContactsHost {
	readonly controller: ContactsController;
	readonly drafts: ArchiveDraftOwner;
	readonly archives: { catalog: ArchivesCatalog; commands: ArchivesCommands; query: ArchivesQuery };
	/** Settings namespace `archives` (folder, card columns). */
	readonly settings: SettingsHandle<ContactsSettings>;
	/** New reminder automation for a record; absent while automations are off. */
	readonly newReminder?: (record: ArchiveRecord) => void;
}
