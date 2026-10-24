import { expect, test } from 'vitest';
import { analyticsDays, analyticsRange, shiftAnalytics } from './range';
test('calendar ranges use whole periods and compare leap months correctly', () => {
	expect(analyticsRange('month', '2024-03-31', '2023-01-01')).toEqual({
		start: '2024-03-01',
		end: '2024-03-31',
		previousStart: '2024-02-01',
		previousEnd: '2024-02-29',
	});
	expect(analyticsRange('week', '2026-10-25', '2023-01-01')).toMatchObject({
		start: '2026-10-19',
		end: '2026-10-25',
		previousStart: '2026-10-12',
		previousEnd: '2026-10-18',
	});
	expect(analyticsDays(analyticsRange('30', '2026-03-10', '2020-01-01'))).toHaveLength(30);
	expect(shiftAnalytics('month', '2024-03-31', -1)).toBe('2024-02-01');
});
test('custom comparisons use an equal number of inclusive days', () => {
	expect(analyticsRange('custom', '2026-10-24', '2020-01-01', { start: '2024-02-28', end: '2024-03-01' })).toEqual({
		start: '2024-02-28',
		end: '2024-03-01',
		previousStart: '2024-02-25',
		previousEnd: '2024-02-27',
	});
});
