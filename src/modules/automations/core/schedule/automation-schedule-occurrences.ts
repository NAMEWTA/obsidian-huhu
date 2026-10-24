
import { cronDateMatches, cronMatches, floorToMinute, startOfLocalDay } from './automation-cron-occurrence';
import { parseSchedule, type ParsedCron, type ParsedRrule } from './automation-schedule-parsing';

const MINUTE_MS = 60 * 1000;
// Why: valid cron expressions like Feb 29 can have an 8-year gap across non-leap centuries.
const CRON_SCAN_DAYS = 9 * 366;
function scanCron(rule: ParsedCron, anchor: number, direction: 1 | -1, start: number): number | null {
	let day = startOfLocalDay(anchor);
	for (let i = 0; i < CRON_SCAN_DAYS; i++) {
		const next = new Date(day);
		next.setDate(next.getDate() + 1);
		const end = next.getTime();
		if (cronDateMatches(rule, day)) {
			let at = direction === 1 ? Math.max(day, anchor) : Math.min(end - MINUTE_MS, anchor);
			for (; at >= day && at < end; at += direction * MINUTE_MS) {
				if (at >= start && cronMatches(rule, at)) return at;
			}
		}
		if (direction === 1) day = end;
		else {
			const prior = new Date(day);
			prior.setDate(prior.getDate() - 1);
			day = prior.getTime();
			if (end < start) break;
		}
	}
	return null;
}
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
function atLocalTime(dayMs: number, hour: number, minute: number): number {
	const date = new Date(dayMs);
	date.setHours(hour, minute, 0, 0);
	return date.getTime();
}

function dayMatches(rule: ParsedRrule, timestamp: number): boolean {
	if (rule.freq === 'DAILY') {
		return true;
	}
	const code = DAY_CODES[new Date(timestamp).getDay()];
	return code !== undefined && rule.byDay.includes(code);
}

function scanDayCandidates(rule: ParsedRrule, anchor: number, direction: 1 | -1): number | null {
	let day = startOfLocalDay(anchor);
	for (let i = 0; i < 370; i += 1) {
		const candidate = atLocalTime(day, rule.byHour, rule.byMinute);
		if (dayMatches(rule, candidate)) {
			if (direction === 1 && candidate > anchor) {
				return candidate;
			}
			if (direction === -1 && candidate <= anchor) {
				return candidate;
			}
		}
		const nextDay = new Date(day);
		nextDay.setDate(nextDay.getDate() + direction);
		day = nextDay.getTime();
	}
	return null;
}

export function nextAutomationOccurrenceAfter(rrule: string, dtstart: number, after: number): number {
	const rule = parseSchedule(rrule);
	if (rule.kind === 'cron') {
		let candidate = floorToMinute(Math.max(dtstart, after));
		if (candidate <= after) {
			candidate += MINUTE_MS;
		}
		if (candidate < dtstart) {
			candidate = floorToMinute(dtstart);
			if (candidate < dtstart) {
				candidate += MINUTE_MS;
			}
		}
		const found = scanCron(rule, candidate, 1, dtstart);
		if (found !== null) return found;
		throw new Error('Unable to compute next automation run.');
	}
	if (rule.freq === 'HOURLY') {
		let candidate = floorToMinute(Math.max(dtstart, after));
		if (candidate <= after || candidate < dtstart) candidate += MINUTE_MS;
		while (new Date(candidate).getMinutes() !== rule.byMinute) candidate += MINUTE_MS;
		return candidate;
	}
	const candidate = scanDayCandidates(rule, Math.max(dtstart - 1, after), 1);
	if (candidate === null) {
		throw new Error('Unable to compute next automation run.');
	}
	return candidate;
}

export function latestAutomationOccurrenceAtOrBefore(rrule: string, dtstart: number, now: number): number | null {
	if (now < dtstart) {
		return null;
	}
	const rule = parseSchedule(rrule);
	if (rule.kind === 'cron') {
		return scanCron(rule, floorToMinute(now), -1, dtstart);
	}
	if (rule.freq === 'HOURLY') {
		let candidate = floorToMinute(now);
		while (candidate >= dtstart && new Date(candidate).getMinutes() !== rule.byMinute) candidate -= MINUTE_MS;
		return candidate >= dtstart ? candidate : null;
	}
	const candidate = scanDayCandidates(rule, now, -1);
	return candidate !== null && candidate >= dtstart ? candidate : null;
}
