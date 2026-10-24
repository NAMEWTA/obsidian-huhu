// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import '../../../../scripts/navigator-test-moment';
import { expect, test } from 'vitest';
import { PERIOD_NAME_FORMATS, periodicNotePath } from '../../../shared/periodic-paths';
import { formatDate } from './moment-format';
import { addPeriods, defaultPeriodRules, identifyPeriodNote, monthGrid, normalizePeriodRules, parentOf, parentPeriod, startOfPeriod, stepPeriod, type PeriodRules } from './periodic';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const ROOT = '日志';

function rules(enabled: Partial<Record<keyof PeriodRules, boolean>> = {}): PeriodRules {
	const base = defaultPeriodRules();
	for (const period of ['day', 'week', 'month', 'quarter', 'year'] as const) base[period] = { ...base[period], enabled: enabled[period] ?? true };
	return base;
}

test('period starts', () => {
	const date = day(2026, 10, 15);
	expect(startOfPeriod('day', date, 1)).toEqual(day(2026, 10, 15));
	expect(startOfPeriod('week', date, 1)).toEqual(day(2026, 10, 12));
	expect(startOfPeriod('week', date, 0)).toEqual(day(2026, 10, 11));
	expect(startOfPeriod('month', date, 1)).toEqual(day(2026, 10, 1));
	expect(startOfPeriod('quarter', date, 1)).toEqual(day(2026, 10, 1));
	expect(startOfPeriod('quarter', day(2026, 8, 31), 1)).toEqual(day(2026, 7, 1));
	expect(startOfPeriod('year', date, 1)).toEqual(day(2026, 1, 1));
});

test('adding periods', () => {
	expect(addPeriods('day', day(2026, 12, 31), 1)).toEqual(day(2027, 1, 1));
	expect(addPeriods('week', day(2026, 10, 12), -1)).toEqual(day(2026, 10, 5));
	expect(addPeriods('month', day(2026, 1, 1), -1)).toEqual(day(2025, 12, 1));
	expect(addPeriods('quarter', day(2026, 10, 1), 1)).toEqual(day(2027, 1, 1));
	expect(addPeriods('year', day(2026, 1, 1), 2)).toEqual(day(2028, 1, 1));
});

test('the week of a note follows the first day of the week and agrees with Moment', () => {
	for (const weekStart of [0, 1, 6] as const) {
		for (let offset = 0; offset < 800; offset += 3) {
			const date = new Date(2024, 11, 20 + offset);
			const [year, week] = formatDate(date, 'gggg-[W]ww', { weekStart, locale: 'en' }).split('-W');
			expect(periodicNotePath(ROOT, 'week', date, weekStart)).toBe(`日志/周记/${year}/${year}-W${week}.md`);
		}
	}
});

test('{{date}} in a period template is written in the same name the note has', () => {
	const date = day(2026, 10, 17);
	expect(formatDate(date, PERIOD_NAME_FORMATS.day, { locale: 'en' })).toBe('2026-10-17');
	expect(formatDate(date, PERIOD_NAME_FORMATS.week, { locale: 'en', weekStart: 1 })).toBe('2026-W42');
	expect(formatDate(date, PERIOD_NAME_FORMATS.month, { locale: 'en' })).toBe('2026-10');
	expect(formatDate(date, PERIOD_NAME_FORMATS.quarter, { locale: 'en' })).toBe('2026-Q4');
	expect(formatDate(date, PERIOD_NAME_FORMATS.year, { locale: 'en' })).toBe('2026');
	for (const period of ['day', 'week', 'month', 'quarter', 'year'] as const) {
		expect(periodicNotePath(ROOT, period, date, 1)).toMatch(new RegExp(`/${formatDate(date, PERIOD_NAME_FORMATS[period], { locale: 'en', weekStart: 1 })}\\.md$`));
	}
});

test('identifies the period a note belongs to, from the exact path only', () => {
	const set = rules();
	expect(identifyPeriodNote(ROOT, '日志/日记/2026/10/2026-10-15.md', set, 1)).toEqual({ period: 'day', start: day(2026, 10, 15) });
	expect(identifyPeriodNote(ROOT, '日志/周记/2026/2026-W42.md', set, 1)).toEqual({ period: 'week', start: day(2026, 10, 12) });
	expect(identifyPeriodNote(ROOT, '日志/月记/2026/2026-10.md', set, 1)).toEqual({ period: 'month', start: day(2026, 10, 1) });
	expect(identifyPeriodNote(ROOT, '日志/季记/2026/2026-Q4.md', set, 1)).toEqual({ period: 'quarter', start: day(2026, 10, 1) });
	expect(identifyPeriodNote(ROOT, '日志/年记/2026.md', set, 1)).toEqual({ period: 'year', start: day(2026, 1, 1) });
	expect(identifyPeriodNote(ROOT, '日志/日记/2026/10/2026-10-15 Trip.md', set, 1)).toBeUndefined();
	expect(identifyPeriodNote(ROOT, 'Other/日记/2026/10/2026-10-15.md', set, 1)).toBeUndefined();
	expect(identifyPeriodNote(ROOT, '日志/日记/2026/10/2026-10-15.txt', set, 1)).toBeUndefined();
	// a note written by an older setting (any other place or pattern) is simply not a periodic note
	expect(identifyPeriodNote(ROOT, 'Daily/2026-10-15.md', set, 1)).toBeUndefined();
});

test('disabled periods are not identified', () => {
	const set = rules({ week: false });
	expect(identifyPeriodNote(ROOT, '日志/周记/2026/2026-W42.md', set, 1)).toBeUndefined();
	expect(identifyPeriodNote(ROOT, '日志/日记/2026/10/2026-10-15.md', set, 1)?.period).toBe('day');
});

test('next, previous and parent periods', () => {
	const set = rules();
	const ref = { period: 'day' as const, start: day(2026, 10, 15) };
	expect(stepPeriod(ref, 1).start).toEqual(day(2026, 10, 16));
	expect(stepPeriod(ref, -1).start).toEqual(day(2026, 10, 14));
	expect(parentOf(ref, set, 1)).toEqual({ period: 'week', start: day(2026, 10, 12) });
	expect(parentOf({ period: 'week', start: day(2026, 9, 28) }, set, 1)).toEqual({ period: 'month', start: day(2026, 9, 1) });
	expect(parentOf({ period: 'month', start: day(2026, 10, 1) }, set, 1)).toEqual({ period: 'quarter', start: day(2026, 10, 1) });
	expect(parentOf({ period: 'quarter', start: day(2026, 10, 1) }, set, 1)).toEqual({ period: 'year', start: day(2026, 1, 1) });
	expect(parentOf({ period: 'year', start: day(2026, 1, 1) }, set, 1)).toBeUndefined();
});

test('the parent of a day follows the first day of the week', () => {
	const set = rules();
	const wednesday = { period: 'day' as const, start: day(2026, 10, 14) };
	expect(parentOf(wednesday, set, 1)).toEqual({ period: 'week', start: day(2026, 10, 12) });
	expect(parentOf(wednesday, set, 0)).toEqual({ period: 'week', start: day(2026, 10, 11) });
	expect(parentOf(wednesday, set, 6)).toEqual({ period: 'week', start: day(2026, 10, 10) });
});

test('parent skips periods that are switched off', () => {
	const set = rules({ week: false, month: false });
	expect(parentPeriod('day', set)).toBe('quarter');
	set.quarter.enabled = false;
	set.year.enabled = false;
	expect(parentPeriod('day', set)).toBeUndefined();
});

test('month grid covers the month in whole weeks starting on the week start', () => {
	const grid = monthGrid(day(2026, 10, 15), 1);
	expect(grid).toHaveLength(5);
	expect(grid[0]![0]).toEqual(day(2026, 9, 28));
	expect(grid[4]![6]).toEqual(day(2026, 11, 1));
	expect(monthGrid(day(2026, 10, 15), 0)[0]![0]).toEqual(day(2026, 9, 27));
	// August 2026 starts on a Saturday: six Monday-first weeks
	const long = monthGrid(day(2026, 8, 1), 1);
	expect(long).toHaveLength(6);
	expect(long[5]![6]).toEqual(day(2026, 9, 6));
	// February 2027 fits in four weeks exactly
	expect(monthGrid(day(2027, 2, 1), 1)).toHaveLength(4);
});

test('daily, weekly and monthly notes are on by default; quarterly and yearly notes are opt-in', () => {
	const set = defaultPeriodRules();
	expect(Object.fromEntries(Object.entries(set).map(([period, rule]) => [period, rule.enabled]))).toEqual({ day: true, week: true, month: true, quarter: false, year: false });
	expect(normalizePeriodRules(undefined)).toEqual(set);
});

test('saved rules keep only the switch and the template', () => {
	const set = normalizePeriodRules({ day: { enabled: false, folder: '/Daily/', format: 'YYYY', template: ' T/day.md ' }, week: 5, year: { enabled: 'yes' }, month: { enabled: true, template: 7 } });
	expect(set.day).toEqual({ enabled: false, template: 'T/day.md' });
	expect(set.week).toEqual(defaultPeriodRules().week);
	expect(set.year.enabled).toBe(false);
	expect(set.month).toEqual({ enabled: true, template: '' });
});
