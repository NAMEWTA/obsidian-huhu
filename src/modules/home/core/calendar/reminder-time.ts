/** `YYYY-MM-DD` and an optional `HH:MM` as a local time; undefined when either part is not a real date or time. */
function localMoment(date: string, time: string): number | undefined {
	const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date),
		clock = /^(\d{2}):(\d{2})$/.exec(time);
	if (!day || !clock) return undefined;
	const [year, month, dayOfMonth, hour, minute] = [day[1], day[2], day[3], clock[1], clock[2]].map(Number) as [
		number,
		number,
		number,
		number,
		number,
	];
	const moment = new Date(year, month - 1, dayOfMonth, hour, minute);
	return moment.getFullYear() === year && moment.getMonth() === month - 1 && moment.getDate() === dayOfMonth && hour < 24 && minute < 60
		? moment.getTime()
		: undefined;
}

/**
 * When a reminder for a to-do of `date` (at `time`, 09:00 for a task without one) should fire. A moment that
 * has already passed gives undefined: the reminder then starts from the form's own default, an hour from now.
 */
export function reminderMoment(date: string, time: string | undefined, now: number): number | undefined {
	const moment = localMoment(date, time || '09:00');
	return moment !== undefined && moment > now ? moment : undefined;
}

/** The moment of a board to-do's `YYYY-MM-DD( HH:MM)` reminder value. */
export function reminderMomentOf(reminder: string | undefined, now: number): number | undefined {
	const match = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?$/.exec(reminder?.trim() ?? '');
	return match?.[1] ? reminderMoment(match[1], match[2], now) : undefined;
}
