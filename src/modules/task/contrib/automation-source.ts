import type { AutomationSource } from '../../automations/api';
import type { AutomationDefinition } from '../../../shared/automation/types';
import type { TaskService, TaskViews } from '../api';
import type { TaskView } from '../core/model';
import { deadline } from '../core/time';
import { TASK_STORE_PATH } from '../../../shared/storage/vault-layout';
/** Stable notification identity includes the explicitly chosen reminder instant, never today's carry day. */
export function reminderDefinition(task: TaskView, now: number): AutomationDefinition | undefined {
	if (task.status !== 'open' || task.reminderAt === undefined || task.virtual) return undefined;
	const end = deadline(task.due, task.timezone) ?? task.reminderAt + 60_000;
	if (now > end) return undefined;
	return {
		id: `task-reminder:${task.id}:${task.reminderAt}`,
		name: task.title,
		enabled: true,
		deviceId: task.deviceId,
		revision: task.reminderAt,
		schedule: { kind: 'once', at: task.reminderAt },
		action: { kind: 'notify', body: task.title },
		channels: ['in-app'],
		notifyOn: 'always',
		graceMinutes: Math.max(0, Math.ceil((end - task.reminderAt) / 60_000)),
		source: { kind: 'task', path: TASK_STORE_PATH, id: task.id },
		createdAt: task.createdAt,
		updatedAt: task.updatedAt,
	};
}
export function taskAutomationSource(tasks: TaskService, views: TaskViews, now = Date.now): AutomationSource {
	return {
		kinds: ['task'],
		async list() {
			await tasks.refresh();
			await tasks.reconcile();
			if (tasks.snapshot().status !== 'ready') return [];
			const result: AutomationDefinition[] = [];
			for (let offset = 0; ; offset += 500) {
				const page = tasks.query({ filter: 'open', offset, limit: 500 });
				for (const task of page.items) {
					const definition = reminderDefinition(task, now());
					if (definition) result.push(definition);
				}
				if (page.nextOffset === undefined) return result;
			}
		},
		async canNotify(definition) {
			await tasks.refresh();
			if (tasks.snapshot().status !== 'ready') return false;
			const task = definition.source?.kind === 'task' ? tasks.get(definition.source.id) : undefined;
			const current = task ? reminderDefinition(task, now()) : undefined;
			return (
				!!current &&
				current.id === definition.id &&
				current.revision === definition.revision &&
				current.deviceId === definition.deviceId
			);
		},
		async save(definition, remove) {
			const task = definition.source?.kind === 'task' ? tasks.get(definition.source.id) : undefined;
			if (
				!task ||
				definition.action.kind !== 'notify' ||
				definition.schedule.kind !== 'once' ||
				definition.deviceId !== task.deviceId
			)
				throw new Error('Invalid task reminder');
			const result = await tasks.execute({
				kind: 'update',
				commandId: crypto.randomUUID(),
				id: task.id,
				expectedRevision: task.revision,
				fields: {
					title: task.title,
					description: task.description,
					timezone: task.timezone,
					due: task.due,
					planDate: task.planDate,
					relations: task.relations,
					reminderAt: remove || !definition.enabled ? undefined : definition.schedule.at,
				},
			});
			if (!result.ok) throw new Error(result.error.message);
		},
		open: (source, owner) => views.open(source.id, owner),
	};
}
