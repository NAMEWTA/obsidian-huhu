/** Task dates and notification dates deliberately have separate meanings. */
export interface TaskRecurrence {
	expression: string;
	start: number;
	timezone: string;
	end?: string;
}
export interface TaskDraft {
	text: string;
	date?: string;
	time?: string;
	reminder?: string;
	recurrence?: TaskRecurrence;
}
export const taskTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function validTaskDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T12:00:00Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function taskDraftError(draft: TaskDraft): 'title' | 'date' | 'time' | 'reminder' | 'recurrence' | undefined {
	if (!draft.text.trim() || /[\r\n]/.test(draft.text)) return 'title';
	if (draft.date && !validTaskDate(draft.date)) return 'date';
	if (draft.time && (!draft.date || !taskTimePattern.test(draft.time))) return 'time';
	if (
		draft.reminder &&
		(!draft.date ||
			!validTaskDate(draft.reminder.slice(0, 10)) ||
			!taskTimePattern.test(draft.reminder.slice(11)) ||
			draft.reminder[10] !== ' ' ||
			draft.reminder > `${draft.date} ${draft.time || '23:59'}`)
	)
		return 'reminder';
	if (
		draft.recurrence &&
		(!draft.date ||
			!Number.isFinite(draft.recurrence.start) ||
			!draft.recurrence.expression.trim() ||
			!draft.recurrence.timezone ||
			(draft.recurrence.end && (!validTaskDate(draft.recurrence.end) || draft.recurrence.end < draft.date)))
	)
		return 'recurrence';
	return undefined;
}
