/** Calendar read model. The task aggregate (not a calendar row or file line) owns mutations. */
export type CalendarTaskFilter = 'all' | 'due' | 'start' | 'active' | 'open' | 'completed' | 'overdue';
export interface CalendarTask {
	id?: string;
	revision?: number;
	virtual?: boolean;
	seriesId?: string;
	seriesRevision?: number;
	occurrenceAt?: number;
	path: string;
	line: number;
	originalLine: string;
	checked: boolean;
	text: string;
	due?: string;
	time?: string;
	scheduled?: string;
	scheduledTime?: string;
	reminder?: string;
	completion?: string;
	completionTime?: string;
	start?: string;
	end?: string;
	endTime?: string;
	priority?: 'high' | 'medium' | 'low';
	ctime: number;
	mtime: number;
	timezone?: string;
	overdue?: boolean;
	overdueDays?: number;
}
export interface CalendarScope {
	filter?: CalendarTaskFilter;
	from?: string;
	to?: string;
}
export interface CalendarSnapshot {
	status: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
	tasks: readonly CalendarTask[];
	byDay: ReadonlyMap<string, readonly CalendarTask[]>;
	unfilteredCount: number;
	filter: CalendarTaskFilter;
	revision: number;
	error?: string;
}
export interface CalendarTaskInput {
	date: string;
	text: string;
	time?: string;
	reminder?: string;
	signal?: AbortSignal;
}
export interface CalendarFailure {
	status: 'failed' | 'unavailable' | 'cancelled';
	code: 'invalid-input' | 'source-missing' | 'conflict' | 'write-failed' | 'stopped';
	message?: string;
}
export type CalendarMutationResult = { status: 'updated' } | CalendarFailure;
export type CalendarCreateResult = { status: 'created'; task: CalendarTask } | CalendarFailure;
export function matchesTaskCalendarFilter(task: CalendarTask, filter: CalendarTaskFilter): boolean {
	switch (filter) {
		case 'all':
			return true;
		case 'due':
			return !!task.due;
		case 'start':
			return !!task.scheduled;
		case 'active':
		case 'open':
			return !task.checked;
		case 'completed':
			return task.checked;
		case 'overdue':
			return task.overdue === true;
	}
}
export function calendarTaskTime(task: CalendarTask, date: string): string | undefined {
	if (task.completion === date) return task.completionTime;
	if (task.due === date) return task.time;
	if (task.reminder?.slice(0, 10) === date) return task.reminder.slice(11);
	return task.scheduledTime;
}
