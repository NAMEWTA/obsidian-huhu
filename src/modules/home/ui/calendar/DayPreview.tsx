import type { App } from 'obsidian';
import { useRef } from 'react';
import { useCalendarPreview } from '../../../../ui/components/huhu/calendar/CalendarPreview';
import { calendarDate } from '../../../../ui/components/huhu/calendar/CalendarMonth';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import type { DashboardRenderContext } from '../renderer/render-context';
import { byDayTaskTime, taskDayTime } from './calendar-layout';
import { usePeriodicNotes } from './use-calendar';

/** Board adapter for the shared note-and-agenda preview. */
export function useDayPreview(_app: App, _context: DashboardRenderContext, resetKey?: string) {
	const hovered = useRef<readonly VaultTask[]>([]);
	const { periodic, revision } = usePeriodicNotes();
	const preview = useCalendarPreview(async (iso) => {
		const tasks = hovered.current;
		const note = await periodic?.preview('day', calendarDate(iso));
		return { date: iso, title: note?.title, summary: note?.summary, image: note?.image, noteExists: note?.status === 'existing',
			tasks: [...tasks].sort(byDayTaskTime(iso)).map((task) => ({ id: `${task.path}:${task.line}:${task.id ?? ''}`, text: task.text, checked: task.checked, time: taskDayTime(task, iso) })) };
	}, `${resetKey ?? ''}:${revision}`);
	return { content: preview.content, close: preview.close,
		hover(anchor: HTMLElement, iso: string, tasks: VaultTask[]) { hovered.current = tasks; preview.hover(iso, anchor); } };
}
