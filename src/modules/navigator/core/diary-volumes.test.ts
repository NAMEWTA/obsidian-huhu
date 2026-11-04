import { expect, test } from 'vitest';
import { monthSpans, splitVolumes, volumeOf, VOLUME_CAPACITY_FALLBACK } from './diary-volumes';

test('volumes close at month boundaries across years without inventing empty months', () => {
	const dates = Object.freeze(['2027-01-03', '2027-01-01', '2026-11-30', '2026-11-01', '2025-12-31']);
	expect(splitVolumes(dates, 3)).toEqual([{ start: 0, end: 4 }, { start: 4, end: 5 }]);
	expect(dates).toEqual(['2027-01-03', '2027-01-01', '2026-11-30', '2026-11-01', '2025-12-31']);
	expect(splitVolumes([], 3)).toEqual([]);
});

test('a full month closes prior partial volumes and splits only its own overflowing entries', () => {
	const dates = ['2027-02-01', '2027-01-31', '2027-01-30', '2027-01-29', '2027-01-28', '2027-01-27', '2026-12-31'];
	expect(splitVolumes(dates, 3)).toEqual([
		{ start: 0, end: 1 }, { start: 1, end: 4 }, { start: 4, end: 7 },
	]);
	expect(splitVolumes(dates.slice(1, 4), 3)).toEqual([{ start: 0, end: 3 }]);
	expect(splitVolumes(dates.slice(1, 6), 3)).toEqual([{ start: 0, end: 3 }, { start: 3, end: 5 }]);
});

test('capacity is floored, clamped and falls back for non-finite values', () => {
	const dates = ['2027-01-31', '2027-01-30', '2027-01-29'];
	for (const capacity of [0, -1, 0.5]) {
		expect(splitVolumes(dates, capacity)).toEqual([{ start: 0, end: 1 }, { start: 1, end: 2 }, { start: 2, end: 3 }]);
	}
	expect(splitVolumes(dates, 2.9)).toEqual([{ start: 0, end: 2 }, { start: 2, end: 3 }]);
	expect(VOLUME_CAPACITY_FALLBACK).toBe(50);
	for (const capacity of [NaN, Infinity, -Infinity, undefined]) {
		expect(splitVolumes(dates, capacity)).toEqual([{ start: 0, end: 3 }]);
	}
});

test('volume lookup uses half-open ranges and rejects invalid entry indices', () => {
	const volumes = [{ start: 0, end: 2 }, { start: 2, end: 4 }];
	expect([0, 1, 2, 3].map((index) => volumeOf(volumes, index))).toEqual([1, 1, 2, 2]);
	for (const index of [-1, 4, 0.5, NaN, Infinity]) expect(volumeOf(volumes, index)).toBe(-1);
	expect(volumeOf([], 0)).toBe(-1);
	expect(monthSpans(['2027-01-01'], [])).toEqual([{ key: '2027-01', n: 1, vols: [], first: 0 }]);
});

test('month spans list only occupied months and all volumes containing their entries', () => {
	const dates = ['2027-01-31', '2027-01-30', '2027-01-29', '2027-01-28', '2027-01-27', '2026-11-30', '2025-12-31'];
	const volumes = Object.freeze([{ start: 0, end: 3 }, { start: 3, end: 6 }, { start: 6, end: 7 }]);
	expect(monthSpans(Object.freeze(dates), volumes)).toEqual([
		{ key: '2027-01', n: 5, vols: [1, 2], first: 0 },
		{ key: '2026-11', n: 1, vols: [2], first: 5 },
		{ key: '2025-12', n: 1, vols: [3], first: 6 },
	]);
	expect(monthSpans([], [])).toEqual([]);
});
