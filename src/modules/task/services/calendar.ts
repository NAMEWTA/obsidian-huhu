import type {
	TaskService,
	TaskCalendarService,
	TaskViews,
	CalendarScope,
	CalendarTask,
	CalendarSnapshot,
	CalendarFailure,
} from '../api';
import { TaskError, type TaskView, type TaskResult } from '../core/model';
import { calendarTaskTime, matchesTaskCalendarFilter } from '../core/calendar';
import { zonedStamp, wallTime, validDate } from '../core/time';
import { TASK_STORE_PATH } from '../../../shared/storage/vault-layout';
export function calendarRow(task: TaskView, line = 0): CalendarTask {
	const stamp = (at: number | undefined) => (at === undefined ? undefined : zonedStamp(at, task.timezone));
	const completed = stamp(task.completedAt);
	return {
		id: task.id,
		revision: task.revision,
		seriesId: task.seriesId,
		seriesRevision: task.seriesRevision,
		occurrenceAt: task.occurrenceAt,
		virtual: task.virtual,
		path: TASK_STORE_PATH,
		line,
		originalLine: '',
		checked: task.status === 'completed',
		text: task.title,
		due: task.due?.date,
		time: task.due?.time,
		scheduled: task.effectiveDate,
		reminder: stamp(task.reminderAt),
		completion: completed?.slice(0, 10),
		completionTime: completed?.slice(11),
		ctime: task.createdAt,
		mtime: task.updatedAt,
		timezone: task.timezone,
		overdue: task.overdue,
		overdueDays: task.overdueDays,
	};
}
function errorResult(result: Extract<TaskResult, { ok: false }>): CalendarFailure {
	const code = result.error.code;
	return {
		status: code === 'unavailable' ? 'unavailable' : code === 'cancelled' ? 'cancelled' : 'failed',
		code:
			code === 'conflict'
				? 'conflict'
				: code === 'not-found'
					? 'source-missing'
					: code === 'unavailable' || code === 'cancelled'
						? 'stopped'
						: code === 'invalid-input'
							? 'invalid-input'
							: 'write-failed',
		message: result.error.message,
	};
}
/** One view cache invalidated by domain notifications; no Home settings or lifetime dependency. */
export function createTaskCalendar(tasks: TaskService, views: TaskViews): TaskCalendarService & { dispose(): void } {
	let filter: CalendarScope['filter'] = 'all';
	const cache = new Map<string, CalendarSnapshot>(),
		listeners = new Set<() => void>();
	const changed = () => {
		cache.clear();
		for (const listener of listeners) listener();
	};
	const unsubscribe = tasks.subscribe(changed);
	const snapshot = (scope: CalendarScope = {}): CalendarSnapshot => {
		const state = tasks.snapshot(),
			selection = scope.filter ?? filter ?? 'all',
			key = JSON.stringify([selection, scope.from, scope.to]);
		const previous = cache.get(key);
		if (previous) return previous;
		const records: TaskView[] = [];
		for (let offset = 0; ; offset += 500) {
			const page = tasks.query({ filter: 'all', offset, limit: 500 });
			records.push(...page.items);
			if (page.nextOffset === undefined) break;
		}
		if (scope.from && scope.to && validDate(scope.from) && validDate(scope.to))
			records.push(...tasks.preview(scope.from, scope.to));
		const all = records.map(calendarRow),
			rows = all.filter((task) => matchesTaskCalendarFilter(task, selection));
		const byDay = new Map<string, CalendarTask[]>();
		for (const task of rows)
			for (const date of new Set(
				[task.due, task.scheduled, task.reminder?.slice(0, 10), task.completion].filter(
					(date): date is string => !!date,
				),
			)) {
				const list = byDay.get(date) ?? [];
				list.push(task);
				byDay.set(date, list);
			}
		for (const [date, list] of byDay)
			list.sort(
				(a, b) =>
					Number(a.checked) - Number(b.checked) ||
					(calendarTaskTime(a, date) ?? '99:99').localeCompare(calendarTaskTime(b, date) ?? '99:99') ||
					a.id!.localeCompare(b.id!),
			);
		const value: CalendarSnapshot = {
			status: state.status,
			tasks: rows,
			byDay,
			unfilteredCount: all.length,
			filter: selection,
			revision: state.revision,
			error: state.error?.message,
		};
		if (cache.size >= 64) cache.clear();
		cache.set(key, value);
		return value;
	};
	const current = async (row: CalendarTask) => {
		if (!row.id) throw new TaskError('invalid-input');
		if (row.virtual) {
			if (!row.seriesId || row.seriesRevision === undefined || row.occurrenceAt === undefined)
				throw new TaskError('invalid-input');
			const result = await tasks.execute({
				kind: 'materialize',
				commandId: crypto.randomUUID(),
				id: row.seriesId,
				expectedRevision: row.seriesRevision,
				at: row.occurrenceAt,
			});
			if (!result.ok) throw new TaskError(result.error.code, result.error.message, result.error.currentRevision);
			const materialized = tasks.get(result.receipt.taskId!);
			if (!materialized) throw new TaskError('not-found');
			return materialized;
		}
		const task = tasks.get(row.id);
		if (!task) throw new TaskError('not-found');
		if (row.revision !== undefined && row.revision !== task.revision) throw new TaskError('conflict');
		return task;
	};
	const failure = (error: unknown): CalendarFailure =>
		errorResult({
			ok: false,
			error: {
				code: error instanceof TaskError ? error.code : 'write-failed',
				message: error instanceof Error ? error.message : 'Task failed',
			},
		});
	return {
		snapshot,
		defaultScope: () => ({ filter }),
		dayTime: calendarTaskTime,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		async refresh(scope) {
			await tasks.refresh();
			return snapshot(scope);
		},
		async setFilter(value) {
			if (!['all', 'due', 'start', 'active', 'open', 'completed', 'overdue'].includes(value)) return false;
			filter = value;
			changed();
			return true;
		},
		async createTask(input) {
			try {
				const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
				const result = await tasks.execute(
					{
						kind: 'create',
						commandId: crypto.randomUUID(),
						draft: {
							title: input.text,
							description: '',
							timezone,
							relations: [],
							...(input.date
								? { due: { date: input.date, ...(input.time ? { time: input.time } : {}) } }
								: {}),
							...(input.reminder
								? {
										reminderAt: wallTime(
											input.reminder.slice(0, 10),
											input.reminder.slice(11),
											timezone,
										),
									}
								: {}),
						},
					},
					input.signal,
				);
				if (!result.ok) return errorResult(result);
				return { status: 'created', task: calendarRow(tasks.get(result.receipt.taskId!)!) };
			} catch (error) {
				return failure(error);
			}
		},
		async toggleTask(row, checked) {
			try {
				const task = await current(row);
				const result = await tasks.execute({
					kind: checked ? 'complete' : 'reopen',
					commandId: crypto.randomUUID(),
					id: task.id,
					expectedRevision: task.revision,
				});
				return result.ok ? { status: 'updated' } : errorResult(result);
			} catch (error) {
				return failure(error);
			}
		},
		async removeTask(row, following = false) {
			try {
				const task = await current(row),
					series = task.seriesId ? tasks.getSeries(task.seriesId) : undefined;
				const result = await tasks.execute(
					following && series
						? {
								kind: 'cancel-series',
								commandId: crypto.randomUUID(),
								id: series.id,
								expectedRevision: series.revision,
								from: task.occurrenceAt!,
							}
						: {
								kind: 'cancel',
								commandId: crypto.randomUUID(),
								id: task.id,
								expectedRevision: task.revision,
							},
				);
				return result.ok ? { status: 'updated' } : errorResult(result);
			} catch (error) {
				return failure(error);
			}
		},
		async openEditor(request) {
			const task = request.task ? await current(request.task) : undefined;
			await views.edit({
				owner: request.owner,
				id: task?.id,
				draft: {
					...(request.text !== undefined ? { title: request.text } : {}),
					...(request.date ? { due: { date: request.date } } : {}),
				},
				onSaved: request.onSaved,
			});
		},
		async openRemoval({ task, owner }) {
			const stored = await current(task);
			await views.edit({ owner, id: stored.id });
		},
		async openSource(task, owner) {
			if (!task.id) throw new TaskError('not-found');
			if (task.virtual) {
				const seed = tasks
					.query({ filter: 'all', includeCancelled: true, limit: 500 })
					.items.find((item) => item.seriesId === task.seriesId);
				await views.open(seed?.id, owner);
				return;
			}
			await views.open(task.id, owner);
		},
		dispose() {
			unsubscribe();
			listeners.clear();
			cache.clear();
		},
	};
}
