import { TASK_VIEWS } from '../task/api';
import { FileSystemAdapter, Notice, TFile } from 'obsidian';
import { contentFiles } from '../../host/obsidian/storage/content-files';
import type { AppWithCommands } from '../../host/obsidian/obsidian-internal';
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import type { AutomationTaskDelivery, NoteLink } from '../../shared/automation/types';
import { t } from '../../shared/i18n/index';
import {
	NOTIFICATION_INBOX,
	NOTIFICATION_OPENERS,
	type NotificationOpener,
	type NotificationRequest,
} from '../notifications/api';
import {
	AUTOMATIONS,
	AUTOMATION_SCHEDULE,
	AUTOMATION_COMPOSER,
	AUTOMATION_INVOCATIONS,
	type AutomationComposer,
	type AutomationsService,
	type AutomationInvocations,
} from './api';
import { AutomationError } from '../../shared/automation/errors';
import { createAutomationRuntime, type AutomationRuntime } from './services/runtime';
import { openCalendarSource, openNote } from './services/action-host';
import { registerMessages } from '../../shared/i18n/index';
import { messages } from './i18n';
import { messages as automationStrings } from '../../shared/i18n/lazy/automation';
import { messages as commonStrings } from '../../shared/i18n/lazy/common';
import { nextOccurrence, validateSchedule } from './core/schedule';
import { resolveWallTime } from './core/schedule/zoned-occurrences';
import { automationSettings } from './settings';

registerMessages(automationStrings);
registerMessages(commonStrings);
registerMessages(messages);

/**
 * Automations module. Each activation creates a runtime (definitions, scheduler, run history, timers and
 * vault listeners); turning the module off stops owned runs and releases all of it. Run results go to the
 * notifications inbox, or to a plain notice while notifications are off.
 */
export default function createAutomationsModule(context: ModuleContext): ModuleInstance {
	const { app, shell } = context;
	const preferences = context.settings.bind('automations', automationSettings);
	let runtime: AutomationRuntime | undefined;
	const listeners = new Set<() => void>();
	/** Aborted when the module stops: composer dialogs that are still open close with it. */
	const stopped = new AbortController();
	const report = (error: unknown) => new Notice(error instanceof Error ? error.message : String(error));

	const notify = async (request: NotificationRequest): Promise<void> => {
		const inbox = await context.services.acquire(NOTIFICATION_INBOX);
		if (inbox) return inbox.value.send(request);
		if (request.channels.length)
			new Notice(request.title === request.body ? request.title : `${request.title}\n${request.body}`);
	};

	/** What the list, the detail pages and the editor need; absent while the module is not running. */
	// Typed where it is used (`ui/` is only reachable through import() from here), so the parameters are annotated.
	const viewHost = () =>
		runtime && {
			service: runtime.service,
			store: runtime.store,
			skipDeleteConfirmation: () => preferences.get().skipDeleteConfirmation,
			setSkipDeleteConfirmation: (value: boolean) =>
				preferences.update((draft) => {
					draft.skipDeleteConfirmation = value;
				}),
			refresh: () => runtime!.service.refresh(),
			retry: runtime.retry,
			inbox: () => {
				void shell.open({ feature: 'notifications' }).catch(report);
			},
			openLink: (link: NoteLink) => openNote(app, link.path, link.line),
			openCalendarSource: (delivery: AutomationTaskDelivery, owner?: Window) =>
				openCalendarSource(context.services.peek(TASK_VIEWS), delivery, owner),
			paths: () => [
				{ path: '/', kind: 'folder' as const },
				...contentFiles(app)
					.getFiles()
					.map((file) => ({ path: file.path, kind: 'file' as const })),
				...app.vault
					.getAllLoadedFiles()
					.filter((file) => !!file.path && !(file instanceof TFile))
					.map((file) => ({ path: file.path, kind: 'folder' as const })),
				...contentFiles(app)
					.allDirectories()
					.map((path) => ({ path, kind: 'folder' as const })),
			],
			commands: () =>
				Object.entries((app as AppWithCommands).commands.commands).map(([id, command]) => ({
					id,
					name: command.name ?? id,
				})),
			cwd: app.vault.adapter instanceof FileSystemAdapter ? app.vault.adapter.getBasePath() : '',
		};
	/** The "New automation" dialog other modules open; it renders with the same host as the board page. */
	const composer: AutomationComposer = {
		open: async (request = {}) => {
			const current = runtime;
			if (!current?.service.executionEnabled) {
				new Notice(t('automation.moduleOff'));
				return undefined;
			}
			if (current.service.loadError) {
				new Notice(t('automation.failedLoad'));
				return undefined;
			}
			const host = viewHost();
			if (!host) return undefined;
			try {
				return await (
					await import('./ui/composer/composer-page')
				).openComposer(app, host, request, stopped.signal);
			} catch (error) {
				report(error);
				return undefined;
			}
		},
	};

	const api: AutomationsService = {
		get loadError() {
			return runtime?.service.loadError ?? '';
		},
		activeRuns: () =>
			runtime?.service.state.runs.filter((run) => run.status === 'running' || run.status === 'pending') ?? [],
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		actions: () => runtime?.actions() ?? [],
		runAction: async (id) => {
			if (!runtime) throw new AutomationError('moduleOff');
			await runtime.runAction(id);
		},
		stopAction: async (id) => {
			await runtime?.stopAction(id);
		},
		openAction: async (id) => {
			await runtime?.openAction(id);
		},
		open: () => shell.open({ feature: 'automations' }),
	};
	const opener: NotificationOpener = {
		canOpen: (record) => !!runtime?.opener.canOpen(record),
		open: async (record) => {
			await runtime?.opener.open(record);
		},
	};
	const invocations: AutomationInvocations = {
		invoke: (request, options) => {
			if (!runtime) return Promise.reject(new AutomationError('moduleOff'));
			return runtime.service.invokeAgent(request, options?.signal);
		},
		receipt: (id) => {
			const receipt = runtime?.service.state.runs.find((run) => run.invocation?.request.invocationId === id)
				?.invocation?.receipt;
			return receipt ? structuredClone(receipt) : undefined;
		},
	};

	return {
		services: [
			[AUTOMATIONS, api],
			[AUTOMATION_SCHEDULE, { next: nextOccurrence, validate: validateSchedule, wallTime: resolveWallTime }],
			[AUTOMATION_COMPOSER, composer],
			[AUTOMATION_INVOCATIONS, invocations],
		],
		contributions: [[NOTIFICATION_OPENERS, opener]],
		pages: {
			automations: async () =>
				(await import('./ui/workbench-page')).createAutomationsPage(
					viewHost,
					() => new Error(t('automation.failedLoad')),
				),
		},
		settingsPage: async () =>
			(await import('./ui/settings-page')).automationsSettingsPage({
				tasks: () => {
					void shell.open({ feature: 'automations' }).catch(report);
				},
				inbox: () => {
					void shell.open({ feature: 'notifications' }).catch(report);
				},
			}),
		async activate() {
			try {
				runtime = await createAutomationRuntime(context, notify);
			} catch (error) {
				new Notice(t('automation.failedLoad'));
				throw error;
			}
			context.lifetime.register(
				runtime.service.subscribe(() => {
					for (const listener of [...listeners]) listener();
					shell.refresh();
				}),
			);
		},
		async dispose(reason) {
			const current = runtime;
			runtime = undefined;
			stopped.abort();
			listeners.clear();
			await current?.shutdown(reason);
		},
	};
}
