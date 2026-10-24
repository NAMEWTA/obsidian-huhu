import { expect, test } from 'vitest';
import { reminderMoment, reminderMomentOf } from './reminder-time';

const now = new Date(2026, 9, 22, 10, 0).getTime();
test('a reminder is due at the task time, at 09:00 for a day without one', () => {
	expect(reminderMoment('2026-10-23', '14:30', now)).toBe(new Date(2026, 9, 23, 14, 30).getTime());
	expect(reminderMoment('2026-10-23', undefined, now)).toBe(new Date(2026, 9, 23, 9, 0).getTime());
});
test('a moment that has passed or is not a real date leaves the choice to the form', () => {
	expect(reminderMoment('2026-10-22', '09:00', now)).toBeUndefined();
	expect(reminderMoment('2026-02-30', '09:00', now)).toBeUndefined();
	expect(reminderMoment('nope', '09:00', now)).toBeUndefined();
});
test('the reminder value of a board to-do carries date and optional time', () => {
	expect(reminderMomentOf('2026-10-24 08:15', now)).toBe(new Date(2026, 9, 24, 8, 15).getTime());
	expect(reminderMomentOf('2026-10-24', now)).toBe(new Date(2026, 9, 24, 9, 0).getTime());
	expect(reminderMomentOf(undefined, now)).toBeUndefined();
});
