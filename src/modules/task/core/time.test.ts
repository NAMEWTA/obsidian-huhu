import { expect, test } from 'vitest';
import { wallTime, TaskWallTimeError } from './time';

test('interactive strict resolution rejects NY gaps and folds with stable reasons, preserving earlier default', () => {
	for (const [date, time, reason] of [
		['2026-03-08', '02:30', 'nonexistent-time'],
		['2026-11-01', '01:30', 'ambiguous-time'],
	] as const) {
		try {
			wallTime(date, time, 'America/New_York', { disambiguation: 'reject' });
			throw Error('accepted');
		} catch (error) {
			expect(error).toBeInstanceOf(TaskWallTimeError);
			expect((error as TaskWallTimeError).reason).toBe(reason);
		}
	}
	expect(new Date(wallTime('2026-11-01', '01:30', 'America/New_York')).toISOString()).toBe(
		'2026-11-01T05:30:00.000Z',
	);
});
test('strict controls keep exact valid epochs and reject invalid zones/date syntax', () => {
	expect(wallTime('2026-03-08', '02:30', 'UTC', { disambiguation: 'reject' })).toBe(
		Date.parse('2026-03-08T02:30:00Z'),
	);
	expect(wallTime('2026-11-01', '01:30', 'Asia/Shanghai', { disambiguation: 'reject' })).toBe(
		Date.parse('2026-10-31T17:30:00Z'),
	);
	expect(() => wallTime('2026-02-30', '10:00', 'UTC', { disambiguation: 'reject' })).toThrow(TaskWallTimeError);
	expect(() => wallTime('2026-01-01', '10:00', 'invalid/zone', { disambiguation: 'reject' })).toThrow(
		TaskWallTimeError,
	);
});
