import { TaskError, type Task, type TaskFields, type TaskSchedule, type TaskSeries, type TaskState } from './model';
import { deadline, zonedStamp, addDays, validDate } from './time';

export function occurrenceId(seriesId: string, at: number): string {
	return `occ:${seriesId}:${at}`;
}
export function occurrenceAllowed(series: TaskSeries, at: number): boolean {
	return (
		!series.stopped &&
		(series.until === undefined || at < series.until) &&
		(!series.rule.end || zonedStamp(at, series.template.timezone).slice(0, 10) <= series.rule.end)
	);
}
export function nextOccurrence(series: TaskSeries, engine: TaskSchedule, after: number): number | null {
	const next = engine.next(series.rule, series.template.timezone, after);
	if (next === null) return null;
	if (!Number.isSafeInteger(next) || next <= after) throw new TaskError('invalid-input', 'Schedule must advance');
	return occurrenceAllowed(series, next) ? next : null;
}
/** Future instances inherit a template, not another occurrence's completion or edited fields. */
export function occurrenceFields(series: TaskSeries, at: number): TaskFields {
	const template = series.template,
		date = zonedStamp(at, template.timezone).slice(0, 10);
	const fields = structuredClone(template);
	if (!template.due) throw new TaskError('corrupt-store', 'Recurring template has no due date');
	fields.due = { date, ...(template.due.time ? { time: zonedStamp(at, template.timezone).slice(11) } : {}) };
	if (template.planDate) {
		const delta = Math.round(
			(Date.parse(`${template.planDate}T12:00:00Z`) - Date.parse(`${template.due.date}T12:00:00Z`)) / 86_400_000,
		);
		fields.planDate = addDays(date, delta);
	}
	if (template.reminderAt !== undefined) {
		const lead = deadline(template.due, template.timezone)! - template.reminderAt;
		fields.reminderAt = deadline(fields.due, fields.timezone)! - lead;
	}
	return fields;
}
export function makeOccurrence(series: TaskSeries, at: number, now: number, id = occurrenceId(series.id, at)): Task {
	return {
		...occurrenceFields(series, at),
		id,
		revision: 1,
		status: 'open',
		createdAt: now,
		updatedAt: now,
		deviceId: series.deviceId,
		seriesId: series.id,
		occurrenceAt: at,
	};
}
/** Bounded catch-up: persist missed instances and only the nearest future open instance. */
export function reconcileOccurrences(state: TaskState, engine: TaskSchedule, now: number, limit = 200): number {
	let created = 0;
	for (const series of Object.values(state.series)) {
		if (series.stopped || series.nextAt === null) continue;
		engine.validate(series.rule, series.template.timezone);
		const future = Object.values(state.tasks)
			.filter((task) => task.seriesId === series.id && task.status === 'open' && (task.occurrenceAt ?? 0) > now)
			.reduce((nearest, task) => Math.min(nearest, task.occurrenceAt!), Infinity);
		// A manually materialized distant preview must not suppress missed or nearer instances.
		const nextReminder = occurrenceFields(series, series.nextAt).reminderAt;
		if (future <= series.nextAt && (nextReminder === undefined || nextReminder > now)) continue;
		while (series.nextAt !== null && created < limit) {
			const at = series.nextAt;
			if (!occurrenceAllowed(series, at)) {
				series.nextAt = null;
				break;
			}
			const id = occurrenceId(series.id, at);
			if (!Object.hasOwn(state.tasks, id)) {
				state.tasks[id] = makeOccurrence(series, at, now);
				state.events.push({ kind: 'occurrence', at: now, taskId: id, seriesId: series.id });
				created++;
			}
			series.nextAt = nextOccurrence(series, engine, at);
			series.updatedAt = now;
			// Advancing the runtime cursor is not an edit of the series' user-facing revision.
			if (
				at > now &&
				(series.nextAt === null || (occurrenceFields(series, series.nextAt).reminderAt ?? Infinity) > now)
			)
				break;
		}
		if (created >= limit) break;
	}
	return created;
}
export function catchupPending(state: TaskState, now: number): boolean {
	return Object.values(state.series).some(
		(series) => !series.stopped && series.nextAt !== null && series.nextAt <= now,
	);
}
/** Read-only, bounded projections. No createdAt is invented for a task which has not been stored. */
export function previewOccurrences(
	state: TaskState,
	engine: TaskSchedule | undefined,
	from: string,
	to: string,
	limit = 500,
): Task[] {
	if (!validDate(from) || !validDate(to) || from > to || !Number.isSafeInteger(limit) || limit < 1 || limit > 500)
		throw new TaskError('invalid-input');
	if (!engine) return [];
	const known = new Set(Object.values(state.tasks).map((task) => `${task.seriesId}:${task.occurrenceAt}`));
	const result: Task[] = [];
	for (const series of Object.values(state.series)) {
		if (series.stopped || series.nextAt === null) continue;
		let cursor = Math.max(series.rule.start - 1, Date.parse(`${from}T00:00:00Z`) - 86_400_000);
		for (let attempts = 0; attempts < limit && result.length < limit; attempts++) {
			const at = nextOccurrence(series, engine, cursor);
			if (at === null) break;
			cursor = at;
			const date = zonedStamp(at, series.template.timezone).slice(0, 10);
			if (date > to) break;
			if (date < from || known.has(`${series.id}:${at}`)) continue;
			result.push(makeOccurrence(series, at, 0));
		}
	}
	return result;
}
