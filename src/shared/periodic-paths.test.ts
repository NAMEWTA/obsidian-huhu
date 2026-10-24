import { expect, test } from 'vitest';
import {
	DEFAULT_PERIODIC_ROOT,
	identifyPeriodicNote,
	normalizePeriodicRoot,
	PERIOD_FOLDERS,
	PERIODS,
	periodicNotePath,
	startOfPeriod,
	weekOfYear,
	type WeekStart,
} from './periodic-paths';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const ROOT = '日志';

test('the folder structure is fixed', () => {
	expect(PERIOD_FOLDERS).toEqual({ day: '日记', week: '周记', month: '月记', quarter: '季记', year: '年记' });
	expect(DEFAULT_PERIODIC_ROOT).toBe('huhu/日志');
});

test('daily, weekly, monthly, quarterly and yearly paths', () => {
	const date = day(2026, 10, 17);
	expect(periodicNotePath(ROOT, 'day', date, 1)).toBe('日志/日记/2026/10/2026-10-17.md');
	expect(periodicNotePath(ROOT, 'week', date, 1)).toBe('日志/周记/2026/2026-W42.md');
	expect(periodicNotePath(ROOT, 'month', date, 1)).toBe('日志/月记/2026/2026-10.md');
	expect(periodicNotePath(ROOT, 'quarter', date, 1)).toBe('日志/季记/2026/2026-Q4.md');
	expect(periodicNotePath(ROOT, 'year', date, 1)).toBe('日志/年记/2026.md');
});

test('single digits are padded and the root may be nested', () => {
	expect(periodicNotePath('My/Journal', 'day', day(2026, 1, 5), 1)).toBe('My/Journal/日记/2026/01/2026-01-05.md');
	expect(periodicNotePath('My/Journal', 'week', day(2026, 1, 5), 1)).toBe('My/Journal/周记/2026/2026-W02.md');
});

test('quarter boundaries', () => {
	const quarters: Array<[Date, number]> = [[day(2026, 1, 1), 1], [day(2026, 3, 31), 1], [day(2026, 4, 1), 2], [day(2026, 6, 30), 2], [day(2026, 7, 1), 3], [day(2026, 9, 30), 3], [day(2026, 10, 1), 4], [day(2026, 12, 31), 4]];
	for (const [date, quarter] of quarters) expect(periodicNotePath(ROOT, 'quarter', date, 1)).toBe(`日志/季记/2026/2026-Q${quarter}.md`);
});

test('a week across the new year belongs to its ISO week-year when weeks start on Monday', () => {
	// 2026 has 53 ISO weeks: Thursday 31 December 2026 is in 2026-W53, and 1 January 2027 (a Friday) still is.
	expect(periodicNotePath(ROOT, 'week', day(2026, 12, 31), 1)).toBe('日志/周记/2026/2026-W53.md');
	expect(periodicNotePath(ROOT, 'week', day(2027, 1, 1), 1)).toBe('日志/周记/2026/2026-W53.md');
	expect(periodicNotePath(ROOT, 'week', day(2027, 1, 4), 1)).toBe('日志/周记/2027/2027-W01.md');
	// 30 December 2024 (Monday) starts 2025-W01.
	expect(periodicNotePath(ROOT, 'week', day(2024, 12, 30), 1)).toBe('日志/周记/2025/2025-W01.md');
	expect(periodicNotePath(ROOT, 'week', day(2021, 1, 3), 1)).toBe('日志/周记/2020/2020-W53.md');
});

test('Sunday-first weeks put the week that contains 1 January in the new year', () => {
	// The week of Sun 27 Dec 2026 - Sat 2 Jan 2027 contains 1 January 2027.
	expect(periodicNotePath(ROOT, 'week', day(2026, 12, 31), 0)).toBe('日志/周记/2027/2027-W01.md');
	expect(periodicNotePath(ROOT, 'week', day(2026, 12, 26), 0)).toBe('日志/周记/2026/2026-W52.md');
	expect(weekOfYear(day(2026, 1, 1), 0)).toEqual({ week: 1, year: 2026 });
	expect(weekOfYear(day(2025, 12, 28), 0)).toEqual({ week: 1, year: 2026 });
});

test('start of a period', () => {
	const date = day(2026, 10, 17);
	expect(startOfPeriod('day', date, 1)).toEqual(day(2026, 10, 17));
	expect(startOfPeriod('week', date, 1)).toEqual(day(2026, 10, 12));
	expect(startOfPeriod('week', date, 0)).toEqual(day(2026, 10, 11));
	expect(startOfPeriod('month', date, 1)).toEqual(day(2026, 10, 1));
	expect(startOfPeriod('quarter', date, 1)).toEqual(day(2026, 10, 1));
	expect(startOfPeriod('quarter', day(2026, 8, 31), 1)).toEqual(day(2026, 7, 1));
	expect(startOfPeriod('year', date, 1)).toEqual(day(2026, 1, 1));
});

test('identifying a path is the exact inverse of generating it', () => {
	for (const weekStart of [0, 1, 6] as const) {
		for (let offset = 0; offset < 900; offset += 7) {
			const date = new Date(2024, 10, 28 + offset);
			for (const period of PERIODS) {
				const path = periodicNotePath(ROOT, period, date, weekStart);
				const ref = identifyPeriodicNote(ROOT, path, weekStart);
				expect(ref?.period).toBe(period);
				expect(ref?.start).toEqual(startOfPeriod(period, date, weekStart));
				expect(periodicNotePath(ROOT, period, ref!.start, weekStart)).toBe(path);
			}
		}
	}
});

test('identify known notes', () => {
	expect(identifyPeriodicNote(ROOT, '日志/日记/2026/10/2026-10-17.md', 1)).toEqual({ period: 'day', start: day(2026, 10, 17) });
	expect(identifyPeriodicNote(ROOT, '日志/周记/2026/2026-W53.md', 1)).toEqual({ period: 'week', start: day(2026, 12, 28) });
	expect(identifyPeriodicNote(ROOT, '日志/周记/2027/2027-W01.md', 0)).toEqual({ period: 'week', start: day(2026, 12, 27) });
	expect(identifyPeriodicNote(ROOT, '日志/季记/2026/2026-Q4.md', 1)).toEqual({ period: 'quarter', start: day(2026, 10, 1) });
	expect(identifyPeriodicNote(ROOT, '日志/年记/2026.md', 1)).toEqual({ period: 'year', start: day(2026, 1, 1) });
});

test('only exact journal paths are periodic notes', () => {
	const no = (path: string, weekStart: WeekStart = 1) => expect(identifyPeriodicNote(ROOT, path, weekStart)).toBeUndefined();
	no('日志/日记/2026/10/2026-10-17 旅行.md');
	no('日志/日记/2026/10/2026-10-17.txt');
	no('日志/日记/2026/2026-10-17.md');
	no('日志/日记/2026/09/2026-10-17.md');
	no('日志/日记/2026/02/2026-02-30.md');
	no('日志/日记/2026/10/2026-10-17.MD');
	no('日志/周记/2026/2026-W54.md');
	no('日志/周记/2026/2026-W00.md');
	no('日志/周记/2027/2026-W10.md');
	no('日志/月记/2026/2026-13.md');
	no('日志/季记/2026/2026-Q5.md');
	no('日志/年记/2026/2026.md');
	no('2026-10-17.md');
	no('其他/日记/2026/10/2026-10-17.md');
	no('日志/杂项/2026/10/2026-10-17.md');
	// ISO week 53 exists in 2026 but not in 2025
	no('日志/周记/2025/2025-W53.md');
	// a path made for another root is not recognised
	expect(identifyPeriodicNote('Journal', '日志/日记/2026/10/2026-10-17.md', 1)).toBeUndefined();
	expect(identifyPeriodicNote('Journal', 'Journal/日记/2026/10/2026-10-17.md', 1)?.period).toBe('day');
});

test('the root is repaired to a safe vault-relative folder', () => {
	expect(normalizePeriodicRoot('日志')).toBe('日志');
	expect(normalizePeriodicRoot('  /My/Journal/ ')).toBe('My/Journal');
	expect(normalizePeriodicRoot('A//B')).toBe('A/B');
	for (const bad of ['', '   ', '/', '.huhu', 'Notes/.hidden', '..', '../escape', 'a/../b', 'bad:name', 'a\\b', 'x*y', 'x?y', 'x|y', 5, undefined, null]) {
		expect(normalizePeriodicRoot(bad)).toBe(DEFAULT_PERIODIC_ROOT);
	}
	expect(normalizePeriodicRoot('x'.repeat(301))).toBe(DEFAULT_PERIODIC_ROOT);
	// paths are built from a repaired root
	expect(periodicNotePath('.huhu', 'year', day(2026, 1, 1), 1)).toBe('huhu/日志/年记/2026.md');
});
