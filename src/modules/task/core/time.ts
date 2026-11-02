import { TaskError, type Task, type TaskDue } from './model';

export function validDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const at = Date.parse(`${value}T12:00:00Z`);
	return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === value;
}
export function validTime(value: string): boolean {
	return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timezone: string): Intl.DateTimeFormat {
	let value = formatters.get(timezone);
	if (!value) {
		try {
			value = new Intl.DateTimeFormat('en-CA', {
				timeZone: timezone,
				calendar: 'iso8601',
				numberingSystem: 'latn',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hourCycle: 'h23',
			});
		} catch {
			throw new TaskError('invalid-input', 'Invalid IANA timezone');
		}
		if (formatters.size > 64) formatters.clear();
		formatters.set(timezone, value);
	}
	return value;
}
export function validateTimezone(timezone: string): void {
	if (typeof timezone !== 'string' || !timezone || timezone.length > 100)
		throw new TaskError('invalid-input', 'Timezone required');
	formatter(timezone);
}
export function zonedStamp(at: number, timezone: string): string {
	if (!Number.isFinite(at)) throw new TaskError('invalid-input', 'Invalid instant');
	const parts = formatter(timezone).formatToParts(at);
	const get = (key: string) => parts.find((part) => part.type === key)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}
/** Gaps are rejected; folds choose the earlier occurrence. Callers can always supply an explicit instant for reminders. */
export function wallTime(date: string, time: string, timezone: string): number {
	if (!validDate(date) || !validTime(time)) throw new TaskError('invalid-input', 'Invalid local date/time');
	validateTimezone(timezone);
	const target = Date.parse(`${date}T${time}:00Z`),
		offsets = new Set<number>();
	for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
		const sample = target + hours * 3_600_000;
		const local = Date.parse(`${zonedStamp(sample, timezone).replace(' ', 'T')}:00Z`);
		offsets.add(local - sample);
	}
	const candidates = [...offsets]
		.map((offset) => target - offset)
		.filter((at) => zonedStamp(at, timezone) === `${date} ${time}`)
		.sort((a, b) => a - b);
	if (!candidates.length) throw new TaskError('invalid-input', 'Local time does not exist in this timezone');
	return candidates[0]!;
}
export function addDays(date: string, days: number): string {
	if (!validDate(date)) throw new TaskError('invalid-input', 'Invalid date');
	const at = new Date(`${date}T12:00:00Z`);
	at.setUTCDate(at.getUTCDate() + days);
	return at.toISOString().slice(0, 10);
}
/** Minute precision is inclusive; a date-only deadline is the end of that local civil day. */
export function deadline(due: TaskDue | undefined, timezone: string): number | undefined {
	if (!due) return undefined;
	if (due.time) return wallTime(due.date, due.time, timezone) + 59_999;
	return wallTime(due.date, '23:59', timezone) + 59_999;
}
export function isOverdue(task: Pick<Task, 'status' | 'due' | 'timezone'>, now: number): boolean {
	const end = deadline(task.due, task.timezone);
	return task.status === 'open' && end !== undefined && now > end;
}
export function effectiveDate(task: Task, now: number): string | undefined {
	const planned = task.planDate ?? task.due?.date;
	if (!isOverdue(task, now)) return planned;
	const today = zonedStamp(now, task.timezone).slice(0, 10);
	return planned && planned > today ? planned : today;
}
export function overdueDays(task: Task, now: number): number {
	if (!isOverdue(task, now) || !task.due) return 0;
	return Math.max(
		0,
		Math.round(
			(Date.parse(`${zonedStamp(now, task.timezone).slice(0, 10)}T12:00:00Z`) -
				Date.parse(`${task.due.date}T12:00:00Z`)) /
				86_400_000,
		),
	);
}
