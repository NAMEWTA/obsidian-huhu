import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { deviceId } from '../../host/obsidian/storage/device-id';
import { contentFiles } from '../../host/obsidian/storage/content-files';
import { TASK_STORE_PATH } from '../../shared/storage/vault-layout';
import { registerMessages } from '../../shared/i18n';
import { AUTOMATIONS, AUTOMATION_SCHEDULE, AUTOMATION_SOURCES } from '../automations/api';
import { NOTIFICATION_INBOX } from '../notifications/api';
import { HOME_WIDGETS } from '../home/api';
import { ARCHIVE_RESOURCES } from '../archives/api';
import { NAVIGATOR_PANEL } from '../navigator/api';
import { TASKS, TASK_RESOURCES, TASK_VIEWS, TASK_TOOLS, TASK_CALENDAR, type TaskViews } from './api';
import { createTaskRepository } from './platform/repository';
import { createTaskResources } from './platform/resources';
import { createTaskService } from './services/service';
import { createTaskCalendar } from './services/calendar';
import { createTaskTools } from './services/tools';
import { taskAutomationSource } from './contrib/automation-source';
import { taskWidgets } from './contrib/widgets';
import { messages } from './i18n';
registerMessages(messages);
export default function createTaskModule(context: ModuleContext): ModuleInstance {
	const report = (error: unknown) => console.error('[HUHU task]', error),
		files = contentFiles(context.app),
		lifetime = new AbortController();
	let active = false;
	const repository = createTaskRepository({
		async read() {
			const file = files.getFileByPath(TASK_STORE_PATH);
			return file ? files.read(file) : null;
		},
		process: (change) => files.process(TASK_STORE_PATH, change),
	});
	const tasks = createTaskService({
		repository,
		deviceId: deviceId(context.app),
		report,
		remindersAvailable: () => !!context.services.peek(AUTOMATIONS) && !!context.services.peek(NOTIFICATION_INBOX),
		schedule: () => {
			const engine = context.services.peek(AUTOMATION_SCHEDULE);
			return engine
				? {
						validate: (rule, timezone) =>
							engine.validate({
								kind: 'recurring',
								expression: rule.expression,
								start: rule.start,
								timezone,
							}),
						next: (rule, timezone, after) =>
							engine.next(
								{ kind: 'recurring', expression: rule.expression, start: rule.start, timezone },
								after,
							),
					}
				: undefined;
		},
	});
	const resources = createTaskResources(
		context.app,
		() => context.services.peek(ARCHIVE_RESOURCES),
		() => context.services.peek(NAVIGATOR_PANEL),
		() => active,
	);
	const views: TaskViews = {
		async edit(request) {
			if (!active || lifetime.signal.aborted) return;
			const ui = await import('./ui/workbench-page');
			if (active) await ui.editTask(request, tasks, resources, lifetime.signal);
		},
		mount(host, options) {
			let dispose: (() => void) | undefined,
				closed = false;
			const close = () => {
				if (closed) return;
				closed = true;
				dispose?.();
				options?.signal?.removeEventListener('abort', close);
				lifetime.signal.removeEventListener('abort', close);
			};
			if (options?.signal?.aborted || lifetime.signal.aborted) {
				closed = true;
				return close;
			}
			options?.signal?.addEventListener('abort', close, { once: true });
			lifetime.signal.addEventListener('abort', close, { once: true });
			void import('./ui/workbench-page')
				.then((ui) => {
					if (!closed && active) dispose = ui.mountTasks(host, tasks, resources, views, options?.compact);
				})
				.catch(report);
			return close;
		},
		open: (id, owner) => context.shell.open({ feature: 'task', ...(id ? { resourceId: id } : {}) }, owner),
	};
	const calendar = createTaskCalendar(tasks, views),
		tools = createTaskTools(tasks, resources),
		source = taskAutomationSource(tasks, views);
	const widgets = taskWidgets((host, widget) => {
		const close = views.mount(host, { compact: true, signal: widget.signal });
		widget.register(close);
		return close;
	});
	return {
		services: [
			[TASKS, tasks],
			[TASK_RESOURCES, resources],
			[TASK_VIEWS, views],
			[TASK_TOOLS, tools],
			[TASK_CALENDAR, calendar],
		],
		contributions: [
			[HOME_WIDGETS, widgets],
			[AUTOMATION_SOURCES, source],
		],
		pages: { tasks: async () => (await import('./ui/workbench-page')).taskPage(tasks, resources, views) },
		async activate() {
			active = true;
			await tasks.load();
			const wake = () => {
				if (active) {
					tasks.tick();
					void tasks
						.refresh()
						.then(() => tasks.reconcile())
						.catch(report);
				}
			};
			context.lifetime.register(
				files.subscribe((event) => {
					if (!active) return;
					if (event.path === TASK_STORE_PATH || event.oldPath === TASK_STORE_PATH) {
						void tasks.refresh().catch(report);
						return;
					}
					if (event.kind === 'rename' && event.oldPath)
						void tasks.renameResource(event.oldPath, event.path).catch(report);
				}),
			);
			context.lifetime.register(context.services.watch(AUTOMATION_SCHEDULE, wake));
			context.lifetime.register(context.services.watch(AUTOMATIONS, () => tasks.tick()));
			context.lifetime.register(context.services.watch(NOTIFICATION_INBOX, () => tasks.tick()));
			const win = context.app.workspace.containerEl.ownerDocument.defaultView;
			if (win) {
				const timer = win.setInterval(wake, 30_000);
				context.lifetime.register(() => win.clearInterval(timer));
				win.addEventListener('focus', wake);
				context.lifetime.register(() => win.removeEventListener('focus', wake));
			}
			context.commands.add({
				id: 'open-task-domain',
				name: 'Open tasks',
				nameKey: 'task.open',
				callback: () => {
					void views.open();
				},
			});
			context.commands.add({
				id: 'create-task',
				name: 'New task',
				nameKey: 'task.new',
				callback: () => {
					void views.edit({ owner: context.app.workspace.containerEl });
				},
			});
			await tasks.reconcile();
		},
		async dispose() {
			active = false;
			lifetime.abort();
			calendar.dispose();
			await tasks.dispose();
		},
	};
}
