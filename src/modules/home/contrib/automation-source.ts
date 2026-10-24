import type { CalendarService } from '../api';
import { zonedTaskStamp } from '../core/calendar/recurrence';
import { taskReminder } from '../core/calendar/task-reminders';
import type { AutomationSchedule } from '../../automations/api';
import { contentFiles } from '../../../host/obsidian/storage/content-files';
import type { App, EventRef } from 'obsidian';
import type { ShellAccess } from '../../../app/contracts/module';
import { AutomationError } from '../../../shared/automation/errors';
import type { AutomationSource } from '../../automations/api';
import type { DashboardSettings } from '../core/board/types/index';
import { DashboardAutomationSource } from '../platform/board/automation';

/** Board cards, countdowns and anniversaries as an automation source (`automations.sources`). */
export function dashboardAutomationSource(options: {
	app: App;
	settings: () => DashboardSettings;
	deviceId: string;
	calendar?: CalendarService & { reconcile(): Promise<void> };
	schedule?: () => AutomationSchedule | undefined;
	saveSettings: () => Promise<void>;
	shell: ShellAccess;
	/** Registers vault listeners for the contributing module's lifetime. */
	registerEvent: (ref: EventRef) => void;
}): AutomationSource {
	const { app, settings, shell } = options;
	const boards = new DashboardAutomationSource(app, settings, options.deviceId, options.saveSettings, () => true);
	const invalidate = (file: { path: string }) => boards.invalidate(file.path);
	options.registerEvent(app.vault.on('modify', invalidate));
	options.registerEvent(app.vault.on('create', invalidate));
	options.registerEvent(app.vault.on('delete', invalidate));
	options.registerEvent(
		app.vault.on('rename', (file, old) => {
			boards.invalidate(old);
			invalidate(file);
		}),
	);
	return {
		kinds: ['dashboard', 'widget'],
		list: async () => {
			await options.calendar?.reconcile();
			const tasks = options.calendar?.snapshot({ filter: 'all' }).tasks ?? [];
			const reminders = tasks.flatMap((task) => {
				const definition = taskReminder(task, options.deviceId, options.schedule?.());
				return definition ? [definition] : [];
			});
			const managed = new Set(tasks.flatMap((task) => (task.automation ? [task.automation.id] : [])));
			return [...(await boards.list()).filter((definition) => !managed.has(definition.id)), ...reminders];
		},
		canNotify: async (definition) => {
			if (!definition.source?.id.startsWith('task:')) return true;
			const tasks = (await options.calendar?.refresh({ filter: 'all' }))?.tasks ?? [];
			const task = tasks.find(
				(item) => item.id === definition.source!.id.slice(5) && item.path === definition.source!.path,
			);
			const current = task && taskReminder(task, options.deviceId, options.schedule?.());
			return (
				!!current &&
				current.enabled &&
				current.revision === definition.revision &&
				definition.action.kind === 'notify' &&
				current.action.kind === 'notify' &&
				definition.action.body === current.action.body
			);
		},
		save: async (definition, remove) => {
			if (!definition.source?.id.startsWith('task:')) return boards.save(definition, remove);
			const task = (await options.calendar?.refresh({ filter: 'all' }))?.tasks.find(
				(item) => item.id === definition.source!.id.slice(5) && item.path === definition.source!.path,
			);
			if (!task || !options.calendar) throw new AutomationError('sourceMissing');
			if (!remove && (definition.action.kind !== 'notify' || definition.schedule.kind !== 'once'))
				throw new AutomationError('invalid');
			const when = definition.schedule.kind === 'once' ? new Date(definition.schedule.at) : undefined;
			const reminder =
				!remove && definition.enabled && when
					? zonedTaskStamp(when.getTime(), task.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
					: undefined;
			const result = await options.calendar.updateTask(task, {
				text: task.text,
				date: task.scheduled ?? task.due,
				time: task.scheduledTime ?? task.time,
				reminder,
				recurrence: task.recurrence,
			});
			if ('code' in result) throw new AutomationError('sourceMissing');
		},
		open: async (source, ownerWindow) => {
			if (source.id.startsWith('task:') && options.calendar) {
				await options.calendar.openSource({ path: source.path, line: 0, id: source.id.slice(5) }, ownerWindow);
				return;
			}
			if (source.kind === 'dashboard' && source.id.startsWith('pipeline:')) {
				const file = await boards.resolvePipelineSource(source);
				await contentFiles(app).open(file.path, ownerWindow);
				return;
			}
			if (source.kind === 'widget') {
				const file = boards.resolveWidgetSource(source);
				await shell.open({ feature: 'dashboard', resourceId: file.path, focusId: source.id }, ownerWindow);
				return;
			}
			const file = contentFiles(app).getFileByPath(source.path);
			if (!file) throw new AutomationError('sourceMissing');
			await shell.open({ feature: 'dashboard', resourceId: file.path }, ownerWindow);
		},
		createTask: (action, runId) => boards.createTask(action, runId),
		taskTargets: () => boards.targets(),
		calendarTargets: () => boards.calendarTargets(),
		pinTargets: () => [...new Set([settings().dashboardFile, ...settings().workspaceFiles])],
		pin: (path, definition) => boards.pinAction(path, definition),
	};
}
