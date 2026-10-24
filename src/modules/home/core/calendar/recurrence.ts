import { taskDraftError, type TaskRecurrence } from '../../../../shared/automation/task';
import type { CalendarTask } from './types';
import type { AutomationSchedule } from '../../../automations/api';

export function zonedTaskStamp(at: number, timezone: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		calendar: 'iso8601',
		numberingSystem: 'latn',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(at);
	const get = (key: string) => parts.find((part) => part.type === key)!.value;
	return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}
export function recurrenceSchedule(recurrence: TaskRecurrence) {
	return {
		kind: 'recurring' as const,
		expression: recurrence.expression,
		start: recurrence.start,
		timezone: recurrence.timezone,
	};
}
/** Stable projections are side-effect free. Stored exceptions (including tombstones) always win. */
export function projectRecurrences(
	tasks: readonly CalendarTask[],
	engine: AutomationSchedule | undefined,
	from: string,
	to: string,
	limit = 500,
): CalendarTask[] {
	if (!engine) return [];
	const result: CalendarTask[] = [];
	const known = new Set(tasks.map((task) => `${task.path}:${task.id}`));
	for (const stored of tasks) {
		const seed = stored.seriesTemplate
			? {
					...stored,
					text: stored.seriesTemplate.text,
					due: stored.seriesTemplate.date,
					time: stored.seriesTemplate.time,
					reminder: stored.seriesTemplate.reminder,
				}
			: stored;
		if (!seed.id || !seed.recurrence || !seed.due) continue;
		const rule = seed.recurrence;
		try {
			if (
				taskDraftError({
					text: seed.text,
					date: seed.due,
					time: seed.time,
					reminder: seed.reminder,
					recurrence: rule,
				})
			)
				continue;
			engine.validate(recurrenceSchedule(rule));
		} catch {
			continue;
		}
		let cursor = Math.max(rule.start, Date.parse(`${from}T00:00:00Z`) - 86400000) - 1;
		let emitted = 0;
		for (let i = 0; i < 50_000 && emitted < limit; i++) {
			const at = engine.next(recurrenceSchedule(rule), cursor);
			if (at === null || at <= cursor) break;
			cursor = at;
			const stamp = zonedTaskStamp(at, rule.timezone),
				date = stamp.slice(0, 10);
			if (date > to || (rule.end && date > rule.end)) break;
			if (date < from || at <= rule.start) continue;
			const id = `series:${seed.id}:${at}`;
			if (known.has(`${seed.path}:${id}`)) continue;
			const reminderOffset = seed.reminder
				? Date.parse(`${seed.due}T${seed.time || '23:59'}:00Z`) -
					Date.parse(`${seed.reminder.replace(' ', 'T')}:00Z`)
				: undefined;
			const deadline = seed.time ? at : engine.wallTime(`${date} 23:59`, rule.timezone);
			emitted++;
			result.push({
				...seed,
				id,
				effectKey: id,
				automation: undefined,
				recurrence: undefined,
				seriesTemplate: undefined,
				timezone: rule.timezone,
				seriesId: seed.id,
				occurrence: at,
				cancelled: undefined,
				checked: false,
				due: date,
				time: seed.time ? stamp.slice(11) : undefined,
				scheduled: undefined,
				scheduledTime: undefined,
				start: undefined,
				end: undefined,
				completion: undefined,
				completionTime: undefined,
				reminder:
					reminderOffset === undefined ? undefined : zonedTaskStamp(deadline - reminderOffset, rule.timezone),
				virtual: true,
			});
		}
	}
	return result;
}

export function nearestSeriesTasks(tasks: readonly CalendarTask[], today: string, now?: number): CalendarTask[] {
	const next = new Map<string, string>();
	const overdue = (task: CalendarTask) =>
		!!task.due && (now === undefined ? task.due < today : taskIsOverdue(task, now));
	const seriesKey = (task: CalendarTask) =>
		task.seriesId || task.recurrence ? `${task.path}:${task.seriesId ?? task.id}` : undefined;
	for (const task of tasks) {
		const series = seriesKey(task);
		if (!series || task.checked || task.cancelled || !task.due || overdue(task)) continue;
		const stamp = `${task.due} ${task.time ?? '23:59'}`;
		if (!next.has(series) || stamp < next.get(series)!) next.set(series, stamp);
	}
	return tasks.filter((task) => {
		const series = seriesKey(task);
		return (
			!series ||
			task.checked ||
			!task.due ||
			overdue(task) ||
			`${task.due} ${task.time ?? '23:59'}` === next.get(series)
		);
	});
}

export function taskIsOverdue(task: CalendarTask, now: number): boolean {
	const date = task.scheduled ?? task.due ?? task.start;
	if (!date) return false;
	let current: string;
	try {
		current = zonedTaskStamp(now, task.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
	} catch {
		current = zonedTaskStamp(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
	}
	return `${date} ${task.scheduledTime ?? task.time ?? '23:59'}` < current;
}
