import { expect, test } from 'vitest';
import { HEATMAP_DAYS, heatmapDays } from './heatmap';
const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 17, 15, 30);
const session = (daysAgo: number, tokens: number) => ({
	modifiedAtMs: Date.UTC(2026, 9, 17, 3) - daysAgo * DAY,
	usage: { input: tokens, output: 0 },
});
test('26 weeks of consecutive days ending today, with a total over the window only', () => {
	const { days, total } = heatmapDays([session(0, 5), session(181, 7), session(182, 1000)], now);
	expect(days).toHaveLength(HEATMAP_DAYS);
	expect(days[0]?.date).toBe('2026-04-19');
	expect(days.at(-1)?.date).toBe('2026-10-17');
	expect(new Set(days.map((day) => day.date)).size).toBe(HEATMAP_DAYS);
	expect(total).toBe(12);
	expect(days.at(-1)?.count).toBe(5);
	expect(days[0]?.count).toBe(7);
});
test('days without usage are level 0 and the used days spread over levels 1 to 4 by quartile', () => {
	const sessions = [1, 2, 3, 4, 5, 6, 7, 800].map((tokens, index) => session(index + 1, tokens));
	const { days } = heatmapDays(sessions, now);
	expect(days.filter((day) => day.count === 0).every((day) => day.level === 0)).toBe(true);
	const used = days.filter((day) => day.count).sort((a, b) => a.count - b.count);
	expect(used.map((day) => day.count)).toEqual([1, 2, 3, 4, 5, 6, 7, 800]);
	expect(used.map((day) => day.level)).toEqual([1, 1, 1, 2, 2, 3, 3, 4]);
});
test('sessions on one day add up and token fields are input plus output', () => {
	const { days } = heatmapDays(
		[
			{ modifiedAtMs: now - 1000, usage: { input: 10, output: 5 } },
			{ modifiedAtMs: now - 2000, usage: { input: 1, output: 1 } },
		],
		now,
	);
	expect(days.at(-1)).toEqual({ date: '2026-10-17', count: 17, level: 1 });
});
test('no sessions still yields an all-empty grid', () => {
	const { days, total } = heatmapDays([], now);
	expect(total).toBe(0);
	expect(days.every((day) => day.level === 0)).toBe(true);
});
