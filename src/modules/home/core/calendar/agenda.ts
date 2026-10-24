import type { CalendarTask } from './types';

export type CalendarDayKind = 'completion' | 'reminder' | 'scheduled' | 'due' | 'span';
export function taskDayKind(task: CalendarTask, iso: string): CalendarDayKind {
	if (task.completion === iso) return 'completion';
	if (task.scheduled === iso) return 'scheduled';
	if (task.due === iso) return 'due';
	if (task.reminder?.slice(0, 10) === iso) return 'reminder';
	return 'span';
}
export function taskTime(task: CalendarTask): string | undefined {
	return task.scheduledTime ?? task.time;
}
export function taskDayTime(task: CalendarTask, iso: string): string | undefined {
	const kind = taskDayKind(task, iso);
	if (kind === 'scheduled') return task.scheduledTime;
	if (kind === 'completion') return task.completionTime;
	if (kind === 'reminder') return task.reminder?.slice(11, 16) || undefined;
	return task.time;
}
export function byDayTaskTime(iso: string): (a: CalendarTask, b: CalendarTask) => number {
	return (a, b) =>
		Number(a.checked) - Number(b.checked) ||
		(taskDayTime(a, iso) ?? '99:99').localeCompare(taskDayTime(b, iso) ?? '99:99') ||
		a.path.localeCompare(b.path) ||
		a.line - b.line;
}
