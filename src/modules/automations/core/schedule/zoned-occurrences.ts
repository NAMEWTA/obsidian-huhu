import { parseSchedule } from './automation-schedule-parsing';

const minute = 60_000,
	day = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();
function wallTime(at: number, zone: string): number {
	let formatter = formatters.get(zone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		});
		formatters.set(zone, formatter);
	}
	const parts = Object.fromEntries(formatter.formatToParts(at).map((part) => [part.type, part.value]));
	return Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		Number(parts.hour),
		Number(parts.minute),
	);
}

/** Enumerate wall-clock slots and resolve both offsets at a DST fold. Gaps are skipped. */
export function zonedOccurrence(
	expression: string,
	start: number,
	anchor: number,
	zone: string,
	direction: 1 | -1,
): number | null {
	const rule = parseSchedule(expression);
	const wall = wallTime(Math.max(anchor, start), zone);
	const firstDay = Math.floor(wall / day) * day;
	const hours =
		rule.kind === 'cron'
			? [...rule.hours]
			: rule.freq === 'HOURLY'
				? Array.from({ length: 24 }, (_, i) => i)
				: [rule.byHour];
	const minutes = rule.kind === 'cron' ? [...rule.minutes] : [rule.byMinute];
	const slots = hours
		.flatMap((hour) => minutes.map((m) => (hour * 60 + m) * minute))
		.sort((a, b) => direction * (a - b));
	for (let i = 0; i < 9 * 366; i++) {
		const dateMs = firstDay + i * direction * day,
			date = new Date(dateMs);
		if (dateMs + 2 * day < start && direction < 0) return null;
		if (rule.kind === 'cron') {
			if (!rule.months.has(date.getUTCMonth() + 1)) continue;
			const dom = rule.daysOfMonth.has(date.getUTCDate()),
				dow = rule.daysOfWeek.has(date.getUTCDay());
			if (!(rule.dayOfMonthRestricted && rule.dayOfWeekRestricted ? dom || dow : dom && dow)) continue;
		} else if (
			rule.freq === 'WEEKLY' &&
			!rule.byDay.includes(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][date.getUTCDay()]!)
		)
			continue;
		const offsets = [
			...new Set([-day, 0, day, 2 * day].map((delta) => wallTime(dateMs + delta, zone) - (dateMs + delta))),
		];
		let nearest: number | null = null;
		for (const slot of slots) {
			const target = dateMs + slot;
			for (const offset of offsets) {
				const candidate = target - offset;
				if (candidate < start || (direction > 0 ? candidate <= anchor : candidate > anchor)) continue;
				if (nearest !== null && direction * (candidate - nearest) >= 0) continue;
				if (wallTime(candidate, zone) === target) nearest = candidate;
			}
		}
		if (nearest !== null) return nearest;
	}
	return null;
}

export type AutomationWallTimeReason = 'invalid-date-time' | 'invalid-zone' | 'nonexistent-time' | 'ambiguous-time';
/** Stable input-only error codes; UI callers translate them. The scheduler keeps its existing earlier policy. */
export class AutomationWallTimeError extends Error {
	constructor(readonly reason: AutomationWallTimeReason) {
		super(reason);
		this.name = 'AutomationWallTimeError';
	}
}

/** Resolve a selected wall-clock minute. Gaps are invalid; folds choose the earliest instant unless rejected. */
export function resolveWallTime(stamp: string, zone: string, options?: { disambiguation: 'reject' }): number {
	const normalized = stamp.replace(' ', 'T');
	const target = Date.parse(`${normalized}:00Z`);
	const strict = options?.disambiguation === 'reject';
	if (
		!Number.isFinite(target) ||
		(strict &&
			(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized) ||
				new Date(target).toISOString().slice(0, 16) !== normalized))
	) {
		if (strict) throw new AutomationWallTimeError('invalid-date-time');
		throw new Error('Invalid wall time');
	}
	let candidates: number[];
	try {
		candidates = [...new Set([-day, 0, day].map((delta) => wallTime(target + delta, zone) - (target + delta)))]
			.map((offset) => target - offset)
			.filter((at) => wallTime(at, zone) === target);
	} catch (cause) {
		if (strict && cause instanceof RangeError) throw new AutomationWallTimeError('invalid-zone');
		throw cause;
	}
	if (!candidates.length) {
		if (strict) throw new AutomationWallTimeError('nonexistent-time');
		throw new Error('Invalid wall time');
	}
	if (strict && candidates.length > 1) throw new AutomationWallTimeError('ambiguous-time');
	return Math.min(...candidates);
}
