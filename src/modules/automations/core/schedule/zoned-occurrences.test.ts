import { describe, expect, test } from 'vitest';
import { resolveWallTime, zonedOccurrence } from './zoned-occurrences';

describe('strict wall-clock automation input', () => {
	test('rejects New York gap and fold without changing default fold or scheduler occurrences', () => {
		const strict = { disambiguation: 'reject' as const };
		expect(() => resolveWallTime('2026-03-08T02:30', 'America/New_York', strict)).toThrowError(
			expect.objectContaining({ reason: 'nonexistent-time' }),
		);
		expect(() => resolveWallTime('2026-11-01T01:30', 'America/New_York', strict)).toThrowError(
			expect.objectContaining({ reason: 'ambiguous-time' }),
		);
		expect(resolveWallTime('2026-11-01T01:30', 'America/New_York')).toBe(Date.parse('2026-11-01T05:30:00Z'));
		const start = Date.parse('2026-01-01T00:00:00Z');
		expect(zonedOccurrence('30 1 * * *', start, Date.parse('2026-11-01T05:30:00Z'), 'America/New_York', 1)).toBe(
			Date.parse('2026-11-01T06:30:00Z'),
		);
		expect(zonedOccurrence('30 2 * * *', start, Date.parse('2026-03-08T00:00:00Z'), 'America/New_York', 1)).toBe(
			Date.parse('2026-03-09T06:30:00Z'),
		);
	});
	test('preserves exact UTC and Shanghai instants and stable invalid input reasons', () => {
		const strict = { disambiguation: 'reject' as const };
		expect(resolveWallTime('2026-03-08T02:30', 'UTC', strict)).toBe(Date.parse('2026-03-08T02:30:00Z'));
		expect(resolveWallTime('2026-11-01 01:30', 'Asia/Shanghai', strict)).toBe(Date.parse('2026-10-31T17:30:00Z'));
		expect(() => resolveWallTime('2026-02-30T09:00', 'UTC', strict)).toThrowError(
			expect.objectContaining({ reason: 'invalid-date-time' }),
		);
		expect(() => resolveWallTime('2026-01-01T09:00', 'Invalid/Zone', strict)).toThrowError(
			expect.objectContaining({ reason: 'invalid-zone' }),
		);
	});
});
