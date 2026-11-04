import { bindArchiveFileChanges, draftStoreWithInvalidation } from './services/generic/file-changes';
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { AUTOMATION_COMPOSER, AUTOMATION_SOURCES, type AutomationSource } from '../automations/api';
import { genericRemindersSource } from './contrib/generic-reminders-source';
import { vaultContactsFiles } from './platform/vault-files';
import { archiveDraftStore } from './platform/generic-drafts';
import { archivesSettings } from './settings';
import type { GenericArchivesHost } from './services/generic/page-host';
import type { EntitySummary } from './core/schema/model';
import {
	ARCHIVES_WORKBENCH,
	ARCHIVES_CATALOG,
	ARCHIVES_QUERY,
	ARCHIVES_COMMANDS,
	ARCHIVES_REPAIRS,
	ARCHIVE_RESOURCES,
	type ArchiveResource,
	type ArchiveResources,
} from './api';
import { ArchiveRuntime } from './services/generic/runtime';
import { ArchivesApplication } from './services/generic/application';
import { genericArchivesWorkbench } from './services/generic/workbench';
import { storageWriteQueue } from '../../shared/storage/write-queue';
import { registerMessages } from '../../shared/i18n/index';
import { messages } from './i18n';
import { HEALTH_PROVIDERS, HEALTH_INVALIDATED, HEALTH_REPAIR_OWNERS } from '../health/api';
import { ARCHIVES_HEALTH, BELONGINGS_HEALTH, ARCHIVES_HEALTH_PROVIDERS, createArchivesHealth } from './contrib/health';

import { ArchiveRepairService } from './services/generic/repair';

registerMessages(messages);
/** The generic archive service owns the one metadata index. */
export default function createArchivesModule(context: ModuleContext): ModuleInstance {
	const settings = context.settings.bind('archives', archivesSettings);
	let application: ArchivesApplication | undefined, reminders: AutomationSource | undefined;
	let repairs: ArchiveRepairService | undefined;
	let healthGeneration = 0;
	let health: ReturnType<typeof createArchivesHealth> | undefined;
	const workbench = genericArchivesWorkbench(() => application);
	const host = (): GenericArchivesHost => {
		if (!application) throw new Error('Archives are not loaded');
		return {
			application,
			settings,
			get newReminder() {
				const composer = context.services.peek(AUTOMATION_COMPOSER);
				return composer
					? (record: EntitySummary) => {
							void composer.open({
								action: 'notify',
								source: { kind: 'contacts', path: record.path, id: record.id },
								prefill: { name: record.name },
							});
						}
					: undefined;
			},
		};
	};

	const toResource = (record: EntitySummary): ArchiveResource => ({
		id: record.id,
		label: record.name,
		path: record.path,
		type: record.typeId,
	});
	const resources: ArchiveResources = {
		async list(query = '') {
			if (!application) throw new Error('Archives unavailable');
			const result = await application.query.entities({ search: query.trim() || undefined, limit: 100 });
			return result.items.map(toResource);
		},
		async get(id) {
			if (!application) throw new Error('Archives unavailable');
			const record = await application.query.entity(id);
			return record ? toResource(record) : undefined;
		},
		async open(id, owner) {
			if (!(await resources.get(id))) throw new Error('Archive reference is missing or ambiguous');
			await context.shell.open({ feature: 'contacts', resourceId: id }, owner);
		},
	};

	return {
		get services() {
			const shared = [
				[ARCHIVES_WORKBENCH, workbench],
				[ARCHIVE_RESOURCES, resources],
			] as const;
			return application
				? ([
						...shared,
						[ARCHIVES_CATALOG, application.catalog],
						[ARCHIVES_QUERY, application.query],
						[ARCHIVES_COMMANDS, application.commands],
						...(repairs ? [[ARCHIVES_REPAIRS, repairs]] as const : []),
						...(health ? [[ARCHIVES_HEALTH, health.archives], [BELONGINGS_HEALTH, health.belongings]] as const : []),
					] as const)
				: shared;
		},
		get contributions() {
			return [...(reminders ? [[AUTOMATION_SOURCES, reminders] as const] : []), ...(health ? [[HEALTH_PROVIDERS, ARCHIVES_HEALTH_PROVIDERS] as const, [HEALTH_REPAIR_OWNERS, [{ providerId: 'archives.integrity', service: ARCHIVES_REPAIRS }, { providerId: 'archives.belongings', service: ARCHIVES_REPAIRS }]] as const] : [])];
		},
		pages: { archives: async () => (await import('./ui/generic/workbench-page')).createGenericArchivesPage(host) },
		settingsPage: async () => {
			if (!application) throw new Error('Archives are not loaded');
			const runtime = application.runtime;
			return (await import('./ui/settings-page')).archivesSettingsPage(
				context.app,
				{
					queue: runtime.queue,
					reload: () => runtime.reload(),
					countFolder: async (root) => {
						const preview = await ArchiveRuntime.create(runtime.files, () => root);
						try {
							await preview.ensureLoaded();
							return preview.index.allEntities().length;
						} finally {
							preview.dispose();
						}
					},
				},
				settings,
			);
		},
		async activate(signal) {
			const runtime = await ArchiveRuntime.create(
				vaultContactsFiles(context.app),
				() => settings.get().rootFolder,
				storageWriteQueue(context.app.vault),
				draftStoreWithInvalidation(archiveDraftStore(context.app), context.events, signal),
			);
			if (signal.aborted) {
				runtime.dispose();
				return;
			}
			application = new ArchivesApplication(runtime);
			health = createArchivesHealth({ catalog: application.catalog, query: application.query, available: () => !!application && !runtime.loading, generation: () => healthGeneration });
			repairs = new ArchiveRepairService(runtime, reference => health?.resolve(reference), () => healthGeneration);
			context.lifetime.register(runtime.subscribe(() => { healthGeneration++; context.events.emit(HEALTH_INVALIDATED, { providerIds: ['archives.integrity', 'archives.belongings'] }); }));
			reminders = genericRemindersSource(application.entities, context.shell);
			bindArchiveFileChanges(runtime, context.events, context.lifetime);
			context.lifetime.register(runtime.subscribe(() => context.shell.refresh()));
			// Startup activation must not wait for layout-ready; the read-only loader has its own epoch guard.
			void runtime.ensureLoaded().catch((error) => console.error('[HUHU archives]', error));
		},
		async dispose() {
			health?.dispose(); health = undefined; repairs?.dispose(); repairs = undefined;
			const runtime = application?.runtime;
			runtime?.dispose(); // Revoke first: queued writes must not start during unload.
			if (runtime) await runtime.queue.settled();
			const adapter = context.app.vault?.adapter;
			if (adapter) await storageWriteQueue(adapter).settled();
			application = undefined;
			reminders = undefined;
		},
	};
}
