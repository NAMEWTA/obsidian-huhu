/** Date syntax accepted by the source scanner and rejected inside a newly composed task title. */
export const COLLAPSED_REGEX = /\s*<!--collapsed-->\s*$/;
/** HUHU reminder at the end of the task, with an optional time. */
export const REMINDER_REGEX = /\s*⏰\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*$/;
export const DUE_FIELD_REGEX = /\s*\[due::\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s*\]/i;
export const CALENDAR_REGEX = /\s*📅\s*(\d{4}-\d{2}-\d{2})/;
export const START_FIELD_REGEX = /\s*\[start::\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s*\]/i;
export const START_EMOJI_REGEX = /\s*🛫\s*(\d{4}-\d{2}-\d{2})/;
export const END_FIELD_REGEX = /\s*\[end::\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s*\]/i;
export const END_EMOJI_REGEX = /\s*🛬\s*(\d{4}-\d{2}-\d{2})/;
export const SCHEDULED_FIELD_REGEX = /\s*\[scheduled::\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s*\]/i;
export const SCHEDULED_EMOJI_REGEX = /\s*⏳\s*(\d{4}-\d{2}-\d{2})/;
export const COMPLETION_FIELD_REGEX = /\s*\[completion::\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s*\]/i;
export const COMPLETION_EMOJI_REGEX = /\s*✅\s*(\d{4}-\d{2}-\d{2})/;

const datePatterns = [DUE_FIELD_REGEX, CALENDAR_REGEX, START_FIELD_REGEX, START_EMOJI_REGEX,
	END_FIELD_REGEX, END_EMOJI_REGEX, SCHEDULED_FIELD_REGEX, SCHEDULED_EMOJI_REGEX,
	COMPLETION_FIELD_REGEX, COMPLETION_EMOJI_REGEX, REMINDER_REGEX];

/** Ordinary dates, times and words remain title text; only scanner-recognized fields conflict with the controls. */
export function hasCalendarDateProtocol(text: string): boolean {
	const visible = text.replace(COLLAPSED_REGEX, '');
	return datePatterns.some((pattern) => pattern.test(visible));
}
