import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { AUTOMATION_COMPOSER, AUTOMATION_SOURCES, type AutomationSource } from '../automations/api';
import { remindersAutomationSource } from './contrib/reminders-source';
import { ContactsController } from './platform/controller';
import { archivesSettings } from './settings';
import type { ContactsHost } from './services/page-host';
import type { ArchiveRecord } from './core/model';
import { ARCHIVES_WORKBENCH, ARCHIVE_RESOURCES, type ArchiveResources } from './api';
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
	const host = (): ContactsHost => {
		if (!controller) throw new Error('Archives are not loaded');
		return {
			controller,
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
	const resources: ArchiveResources = {
		async list(query = '') {
			if (!controller) throw new Error('Archives unavailable');
			await controller.ensureLoaded();
			const needle = query.trim().toLocaleLowerCase();
			return [...controller.index.byPath.values()]
				.filter(
					(record) => !needle || `${record.fields.name} ${record.path}`.toLocaleLowerCase().includes(needle),
				)
				.slice(0, 100)
				.map((record) => ({ id: record.id, label: record.fields.name, path: record.path, type: record.kind }));
		},
		async get(id) {
			if (!controller) throw new Error('Archives unavailable');
			await controller.ensureLoaded();
			const matches = [...controller.index.byPath.values()].filter((record) => record.id === id);
			const record = matches.length === 1 ? matches[0] : undefined;
			return record
				? { id: record.id, label: record.fields.name, path: record.path, type: record.kind }
				: undefined;
		},
		async open(id, owner) {
			if (!(await resources.get(id))) throw new Error('Archive reference is missing or ambiguous');
			await context.shell.open({ feature: 'contacts', resourceId: id }, owner);
		},
	};

	return {
		services: [
			[ARCHIVES_WORKBENCH, workbench],
			[ARCHIVE_RESOURCES, resources],
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
			return (await import('./ui/settings-page')).archivesSettingsPage(context.app, controller, settings);
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
		},
	};
}
