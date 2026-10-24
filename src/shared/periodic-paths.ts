/**
 * Fixed vault layout of periodic notes (the journal archive). One pure module decides where the daily, weekly,
 * monthly, quarterly and yearly notes live and what they are called, so the notes navigator and the dashboard
 * calendar always agree. Folder names are Chinese on purpose: they are the user's vault structure, not interface
 * text, and do not follow the interface language.
 *
 *   <root>/日记/YYYY/MM/YYYY-MM-DD.md
 *   <root>/周记/gggg/gggg-Www.md      (week-year and week number follow the first day of the week)
 *   <root>/月记/YYYY/YYYY-MM.md
 *   <root>/季记/YYYY/YYYY-Qq.md
 *   <root>/年记/YYYY.md
 */

import { JOURNAL_ROOT } from './storage/vault-layout';

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';
export const PERIODS: readonly Period[] = ['day', 'week', 'month', 'quarter', 'year'];

/** First day of the week: 0 = Sunday ... 6 = Saturday. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Folder of each period under the root. */
export const PERIOD_FOLDERS: Readonly<Record<Period, string>> = { day: '日记', week: '周记', month: '月记', quarter: '季记', year: '年记' };

/** Moment-style name of a period's note (also what `{{date}}` writes in a period template). */
export const PERIOD_NAME_FORMATS: Readonly<Record<Period, string>> = {
	day: 'YYYY-MM-DD',
	week: 'gggg-[W]ww',
	month: 'YYYY-MM',
	quarter: 'YYYY-[Q]Q',
	year: 'YYYY',
};

export const DEFAULT_PERIODIC_ROOT = JOURNAL_ROOT;

// ---- Calendar arithmetic -------------------------------------------------------------------------------

const DAY = 86_400_000;

/** `date` at 00:00 local time. */
export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** `date` moved by whole calendar days; the time of day is kept across daylight-saving changes. */
export function addDays(date: Date, days: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

/** `date` moved by whole months; the day is clamped to the length of the target month. */
export function addMonths(date: Date, months: number): Date {
	const first = new Date(date.getFullYear(), date.getMonth() + months, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
	const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
	first.setDate(Math.min(date.getDate(), length));
	return first;
}

export const dayOfYear = (date: Date): number => Math.round((startOfDay(date).getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / DAY) + 1;

/** Start (00:00) of the week that contains `date`. */
export function startOfWeek(date: Date, weekStart: WeekStart): Date {
	return addDays(startOfDay(date), -((date.getDay() - weekStart + 7) % 7));
}

/** Days in the first week of a year for the rule: Monday-first weeks follow ISO 8601 (4), others count from 1 January (1). */
export const minDaysInFirstWeek = (weekStart: WeekStart): number => (weekStart === 1 ? 4 : 1);

/** Week number and week-year of `date`: week 1 is the first week with at least `minDays` days in the year. */
export function weekOfYear(date: Date, weekStart: WeekStart, minDays = minDaysInFirstWeek(weekStart)): { week: number; year: number } {
	const anchor = addDays(startOfWeek(date, weekStart), 7 - minDays);
	return { week: Math.floor((dayOfYear(anchor) - 1) / 7) + 1, year: anchor.getFullYear() };
}

/** First day of week `week` of week-year `year`. */
function startOfWeekNumber(year: number, week: number, weekStart: WeekStart): Date {
	const anchor = new Date(2000, 0, minDaysInFirstWeek(weekStart));
	anchor.setFullYear(year);
	return addDays(startOfWeek(anchor, weekStart), (week - 1) * 7);
}

/** A local date at 00:00 that also works for years below 100, which `new Date(y, m, d)` would shift into 19xx. */
function makeDate(year: number, month: number, day: number): Date {
	const date = new Date(2000, 0, 1);
	date.setFullYear(year, month - 1, day);
	return date;
}

/** First day of the period that contains `date`. */
export function startOfPeriod(period: Period, date: Date, weekStart: WeekStart): Date {
	switch (period) {
		case 'day': return startOfDay(date);
		case 'week': return startOfWeek(date, weekStart);
		case 'month': return makeDate(date.getFullYear(), date.getMonth() + 1, 1);
		case 'quarter': return makeDate(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 1, 1);
		default: return makeDate(date.getFullYear(), 1, 1);
	}
}

// ---- Root folder -----------------------------------------------------------------------------------------

const ILLEGAL_SEGMENT = /[\\:*?"<>|]/;
const MAX_ROOT_LENGTH = 300;

/**
 * The root folder as a clean vault-relative path. Anything unusable (not a string, empty, a segment that starts with a
 * dot such as `.huhu` or `..`, or one with characters a folder name cannot hold) falls back to the default root.
 */
export function normalizePeriodicRoot(value: unknown): string {
	if (typeof value !== 'string') return DEFAULT_PERIODIC_ROOT;
	const segments = value.trim().split('/').map((segment) => segment.trim()).filter(Boolean);
	if (segments.length === 0 || segments.some((segment) => segment.startsWith('.') || ILLEGAL_SEGMENT.test(segment))) return DEFAULT_PERIODIC_ROOT;
	const root = segments.join('/');
	return root.length > MAX_ROOT_LENGTH ? DEFAULT_PERIODIC_ROOT : root;
}

// ---- Paths ---------------------------------------------------------------------------------------------------

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

/** Vault path of the note of the period that contains `date`. */
export function periodicNotePath(root: string, period: Period, date: Date, weekStart: WeekStart): string {
	const base = `${normalizePeriodicRoot(root)}/${PERIOD_FOLDERS[period]}`;
	const year = pad(date.getFullYear(), 4);
	switch (period) {
		case 'day': return `${base}/${year}/${pad(date.getMonth() + 1)}/${year}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.md`;
		case 'week': {
			const { week, year: weekYear } = weekOfYear(date, weekStart);
			return `${base}/${pad(weekYear, 4)}/${pad(weekYear, 4)}-W${pad(week)}.md`;
		}
		case 'month': return `${base}/${year}/${year}-${pad(date.getMonth() + 1)}.md`;
		case 'quarter': return `${base}/${year}/${year}-Q${Math.floor(date.getMonth() / 3) + 1}.md`;
		default: return `${base}/${year}.md`;
	}
}

/** The period folder (`<root>/日记`, ...) a path would live in; used to tell journal notes apart from other notes. */
export function periodicFolder(root: string, period: Period): string {
	return `${normalizePeriodicRoot(root)}/${PERIOD_FOLDERS[period]}`;
}

export interface PeriodicRef {
	period: Period;
	/** First day of the period (00:00 local time). */
	start: Date;
}

const PATTERNS: Readonly<Record<Period, RegExp>> = {
	day: /^(\d{4})\/(\d{2})\/\d{4}-\d{2}-(\d{2})\.md$/,
	week: /^(\d{4})\/\d{4}-W(\d{2})\.md$/,
	month: /^(\d{4})\/\d{4}-(\d{2})\.md$/,
	quarter: /^(\d{4})\/\d{4}-Q([1-4])\.md$/,
	year: /^(\d{4})\.md$/,
};

function candidateStart(period: Period, match: RegExpMatchArray, weekStart: WeekStart): Date {
	const year = Number(match[1]);
	const second = Number(match[2]);
	switch (period) {
		case 'day': return makeDate(year, second, Number(match[3]));
		case 'week': return startOfWeekNumber(year, second, weekStart);
		case 'month': return makeDate(year, second, 1);
		case 'quarter': return makeDate(year, (second - 1) * 3 + 1, 1);
		default: return makeDate(year, 1, 1);
	}
}

/**
 * Which periodic note a path is. Only the exact path the layout generates counts, so `2026-10-15 旅行.md`, a note in
 * another folder or a date that does not exist (2026-02-30, week 54) is not a periodic note. The week of a weekly note
 * depends on the first day of the week, so it is needed here.
 */
export function identifyPeriodicNote(root: string, path: string, weekStart: WeekStart): PeriodicRef | undefined {
	for (const period of PERIODS) {
		const folder = `${periodicFolder(root, period)}/`;
		if (!path.startsWith(folder)) continue;
		const match = path.slice(folder.length).match(PATTERNS[period]);
		if (!match) continue;
		const start = candidateStart(period, match, weekStart);
		if (periodicNotePath(root, period, start, weekStart) === path) return { period, start };
	}
	return undefined;
}
