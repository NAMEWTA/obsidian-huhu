import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { AUTOMATION_COMPOSER, AUTOMATION_SOURCES, type AutomationSource } from '../automations/api';
import { remindersAutomationSource } from './contrib/reminders-source';
import { ContactsController } from './platform/controller';
import { archivesSettings } from './settings';
import type { ContactsHost } from './services/page-host';
import type { ArchiveRecord } from './core/model';
import { ARCHIVES_WORKBENCH, ARCHIVES_CATALOG, ARCHIVES_QUERY, ARCHIVES_COMMANDS } from './api';
import { ArchiveDraftOwner } from './services/form-drafts';
import { archiveServices } from './services/archive-services';
import { archivesWorkbench } from './services/workbench';
import { registerMessages } from '../../shared/i18n/index';
import { messages } from './i18n';

registerMessages(messages);

/** Archives module: the archive index, its vault listeners, the archives page and its settings. */
export default function createArchivesModule(context: ModuleContext): ModuleInstance {
	const settings = context.settings.bind('archives', archivesSettings);
	let controller: ContactsController | undefined;
	let reminders: AutomationSource | undefined;
	let offIndex: (() => void) | undefined;
	const workbench = archivesWorkbench(() => controller);
	const archives = archiveServices(() => controller?.archives);
	const drafts = new ArchiveDraftOwner();
	const host = (): ContactsHost => {
		if (!controller) throw new Error('Archives are not loaded');
		return {
			controller,
			archives,
			drafts,
			settings,
			get newReminder() {
				const composer = context.services.peek(AUTOMATION_COMPOSER);
				return composer
					? (record: ArchiveRecord) => {
							void composer.open({
								action: 'notify',
								source: { kind: 'contacts', path: record.path, id: record.id },
								prefill: { name: record.fields.name },
							});
						}
					: undefined;
			},
		};
	};
	return {
		services: [
			[ARCHIVES_WORKBENCH, workbench],
			[ARCHIVES_CATALOG, archives.catalog],
			[ARCHIVES_QUERY, archives.query],
			[ARCHIVES_COMMANDS, archives.commands],
		],
		/** Read after `activate()`. */
		get contributions() {
			return reminders ? [[AUTOMATION_SOURCES, reminders] as const] : [];
		},
		pages: {
			archives: async () => (await import('./ui/workbench-page')).createArchivesPage(host),
		},
		settingsPage: async () => {
			if (!controller) throw new Error('Archives are not loaded');
			return (await import('./ui/settings-page')).archivesSettingsPage(context.app, controller, settings, archives, drafts);
		},
		activate() {
			controller = new ContactsController(context.app, () => settings.get());
			controller.load();
			// The side panel tree follows the index (records added, renamed, or loaded after the first open).
			offIndex = controller.subscribe(() => workbench.invalidate());
			reminders = remindersAutomationSource(controller, context.shell);
		},
		async dispose() {
			offIndex?.();
			offIndex = undefined;
			if (controller) {
				await controller.queue.settled();
				controller.unload();
			}
			controller = undefined;
			drafts.dispose();
		},
	};
}
