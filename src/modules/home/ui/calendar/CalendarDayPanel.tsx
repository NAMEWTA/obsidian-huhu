import { useRef, useState } from 'react';
import { Notice, Platform, type App } from 'obsidian';
import { TaskComposer } from '../../../../ui/components/huhu/calendar/TaskComposer';
import { removeTaskDialog } from '../tasks/task-remove-page';
import { CalendarAgenda } from '../../../../ui/components/huhu/calendar/CalendarAgenda';
import { calendarDate } from '../../../../ui/components/huhu/calendar/CalendarMonth';
import { t } from '../../../../shared/i18n';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
import type { CalendarSnapshot } from '../../../task/api';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { homeServices } from '../../services/instances';
import type { DashboardRenderContext } from '../renderer/render-context';
import { byDayTaskTime, taskDayTime } from './calendar-layout';
import { useCalendarData, usePeriodicNotes, usePeriodicPreviews } from './use-calendar';

/** Wide board agenda, using the same presentation as the navigator's selected day. */
export function CalendarDayPanel(props: {
	iso: string;
	tasks: readonly VaultTask[];
	loaded: boolean;
	app: App;
	context: DashboardRenderContext;
	className: string;
	status?: CalendarSnapshot['status'];
	filtered?: boolean;
	boardPath?: string;
	onToggle(this: void, task: VaultTask, checked: boolean): Promise<void>;
	onAdd(this: void, iso: string, title: string, time?: string): Promise<void>;
	onRemind?(this: void, task: VaultTask, iso: string): void;
	onRemove?(this: void, task: VaultTask): Promise<void>;
	onOpenDaily(this: void, iso: string): void;
	onOpenNote?(this: void, file: ContentFile, line?: number, task?: VaultTask): void;
}) {
	const { periodic } = usePeriodicNotes();
	const root = useRef<HTMLDivElement>(null);
	const earlierLive = useCalendarData(props.app, { filter: 'all', to: props.iso });
	const earlier = earlierLive.snapshot.tasks.flatMap((task) => {
		const date = task.scheduled ?? task.due ?? task.start;
		const file =
			date && date < props.iso && !task.checked ? contentFiles(props.app).getFileByPath(task.path) : undefined;
		return file ? [{ ...task, file }] : [];
	});
	const note =
		usePeriodicPreviews([props.iso], 'day', true).get(props.iso) ??
		periodic?.inspect('day', calendarDate(props.iso));
	const [feedback, setFeedback] = useState<{ date: string; text: string }>();
	const message = feedback?.date === props.iso ? feedback.text : '';
	const setMessage = (text: string) => setFeedback({ date: props.iso, text });
	const idOf = (task: VaultTask) => `${task.path}:${task.line}:${task.id ?? ''}`;
	const taskOf = (id: string) => [...props.tasks, ...earlier].find((task) => idOf(task) === id);
	return (
		<div ref={root} className={props.className} data-calendar-panel="day" data-day={props.iso}>
			<CalendarAgenda
				key={props.iso}
				date={props.iso}
				earlierTasks={earlier.map((task) => ({
					id: idOf(task),
					date: task.scheduled ?? task.due ?? task.start,
					text: task.text,
					checked: task.checked,
					source: task.path,
					time: task.scheduledTime ?? task.time,
					reminder: task.reminder,
					recurring: !!task.seriesId,
				}))}
				status={props.status ?? (props.loaded ? 'ready' : 'loading')}
				filtered={props.filtered}
				tasks={[...props.tasks].sort(byDayTaskTime(props.iso)).map((task) => ({
					id: idOf(task),
					text: task.text,
					checked: task.checked,
					source: task.path,
					time: taskDayTime(task, props.iso),
					reminder: task.reminder,
					recurring: !!task.seriesId,
				}))}
				note={note}
				message={message}
				canSplit={!Platform.isPhone}
				onNote={(action) => {
					if (!periodic) {
						new Notice(t('calendarUnified.periodicUnavailable'));
						return;
					}
					void periodic
						.open('day', calendarDate(props.iso), {
							create: action === 'create' || action === 'diary',
							newTab: action === 'tab' || action === 'diary',
							split: action === 'split',
							ownerWindow: props.context.root.ownerDocument.defaultView ?? undefined,
						})
						.then((opened) => {
							if (!opened) setMessage(t('calendarUnified.cancelled'));
						})
						.catch(() => setMessage(t('calendarUnified.error.write-failed')));
				}}
				onToggle={async (id, checked) => {
					const task = taskOf(id);
					if (task) await props.onToggle(task, checked);
				}}
				onEdit={(id) => {
					const task = taskOf(id);
					if (task && root.current) void homeServices.calendar?.openEditor?.({ task, owner: root.current });
				}}
				composer={
					homeServices.calendar && (
						<TaskComposer
							add={async (text) => {
								const result = await homeServices.calendar!.createTask({
									text,
									date: props.iso,
								});
								if ('code' in result) throw new Error(t(`calendarUnified.error.${result.code}`));
								return true;
							}}
							options={(text, onSaved) => {
								if (root.current)
									void homeServices.calendar?.openEditor?.({
										date: props.iso,
										text,
										owner: root.current,
										onSaved,
									});
							}}
						/>
					)
				}
				onRemove={(id) => {
					const task = taskOf(id);
					if (task && root.current && homeServices.calendar)
						removeTaskDialog(root.current, task, homeServices.calendar);
					else if (task && props.onRemove) return props.onRemove(task);
					return Promise.resolve();
				}}
				onAdd={async (text, time) => {
					await props.onAdd(props.iso, text, time);
					return true;
				}}
				onOpenSource={(id) => {
					const task = taskOf(id);
					if (task) {
						if (homeServices.calendar)
							void homeServices.calendar
								.openSource(task, props.context.root.ownerDocument.defaultView ?? undefined)
								.catch(() => setMessage(t('calendarUnified.error.source-missing')));
						else props.onOpenNote?.(task.file, task.line, task);
					}
				}}
				onRemind={
					homeServices.calendar?.openEditor || props.onRemind
						? (id) => {
								const task = taskOf(id);
								if (task && root.current && homeServices.calendar?.openEditor)
									void homeServices.calendar.openEditor({ task, owner: root.current });
								else if (task) props.onRemind?.(task, props.iso);
							}
						: undefined
				}
				onRetry={() => {
					void homeServices.calendar?.refresh({});
				}}
			/>
		</div>
	);
}
