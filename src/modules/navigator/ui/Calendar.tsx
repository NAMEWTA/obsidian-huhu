// Independently modelled on Notebook Navigator; date selection follows HUHU's shared agenda semantics.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
	CalendarMonth,
	calendarDate,
	calendarIso,
	type CalendarNoteAction,
} from '../../../ui/components/huhu/calendar/CalendarMonth';
import { TaskComposer } from '../../../ui/components/huhu/calendar/TaskComposer';
import { CalendarAgenda } from '../../../ui/components/huhu/calendar/CalendarAgenda';
import { useCalendarPreview } from '../../../ui/components/huhu/calendar/CalendarPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/components/dialog';
import { useOwnerDocument } from '../../../ui/react/contexts';
import { t } from '../../../shared/i18n';
import { startOfPeriod, type Period } from '../../../shared/periodic-paths';
import type { CalendarSnapshot, CalendarTask } from '../../task/api';
import type { PeriodicNotePreview } from '../api';
import { useEnv, useIndexVersion, useNavigatorSettings, usePreviewVersion } from './hooks';

const empty: CalendarSnapshot = {
	status: 'unavailable',
	tasks: [],
	byDay: new Map(),
	unfilteredCount: 0,
	filter: 'all',
	revision: 0,
};
const positions = new WeakMap<object, { anchor: string; selected: string }>();
const taskId = (task: CalendarTask) => `${task.path}:${task.line}:${task.id ?? ''}`;

export function CalendarPanel() {
	const env = useEnv();
	const ownerDocument = useOwnerDocument();
	const { service, periodic } = env;
	const settings = useNavigatorSettings(service);
	useIndexVersion(service);
	usePreviewVersion(env);
	const [anchor, setAnchor] = useState(() => calendarDate(positions.get(service)?.anchor ?? calendarIso(new Date())));
	const [selected, setSelected] = useState(() => positions.get(service)?.selected ?? calendarIso(new Date()));
	const returnFocus = useRef<HTMLElement | null>(null);
	const [showAgenda, setShowAgenda] = useState(false);
	const [loadedNote, setNote] = useState<{ key: string; periodic: typeof periodic; value: PeriodicNotePreview }>();
	const [feedback, setFeedback] = useState<{ date: string; text: string }>();
	const message = feedback?.date === selected ? feedback.text : '';
	const setMessage = (text: string) => setFeedback({ date: selected, text });
	const [periodicVersion, periodicChanged] = useState(0);
	const noteKey = `${selected}:${service.index.version}:${env.previews.version}:${periodicVersion}`;
	const note = loadedNote?.key === noteKey && loadedNote.periodic === periodic ? loadedNote.value : undefined;
	useEffect(() => periodic?.subscribe(() => periodicChanged((value) => value + 1)), [periodic]);
	useEffect(() => {
		positions.set(service, { anchor: calendarIso(anchor), selected });
	}, [service, anchor, selected]);
	const [, capabilitiesChanged] = useState(0);
	const subscribe = useCallback(
		(listener: () => void) =>
			env.watchCalendar?.(() => {
				listener();
				capabilitiesChanged((value) => value + 1);
			}) ?? (() => {}),
		[env, capabilitiesChanged],
	);
	const from = calendarIso(new Date(anchor.getFullYear(), anchor.getMonth(), -6)),
		to = calendarIso(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 7));
	const read = useCallback(() => {
		const calendar = env.calendar?.();
		return calendar?.snapshot({ ...calendar.defaultScope(), from, to }) ?? empty;
	}, [env, from, to]);
	const snapshot = useSyncExternalStore(subscribe, read);
	const calendar = env.calendar?.(),
		scope = calendar?.defaultScope();
	const filter = scope?.filter;
	useEffect(() => {
		if (calendar) void calendar.refresh({ filter });
	}, [calendar, filter]);
	useEffect(() => {
		let live = true;
		void periodic
			?.preview('day', calendarDate(selected))
			.then((value) => {
				if (live) setNote({ key: noteKey, periodic, value });
			})
			.catch(env.report);
		return () => {
			live = false;
		};
	}, [periodic, selected, env, noteKey]);
	const tasks = snapshot.byDay.get(selected) ?? [];
	const earlier = snapshot.tasks.filter((task) => {
		const date = task.scheduled ?? task.due ?? task.start;
		return !task.checked && !!date && date < selected;
	});
	const preview = useCalendarPreview(async (iso) => {
		const info = await periodic?.preview('day', calendarDate(iso));
		return {
			date: iso,
			title: info?.title,
			summary: info?.summary,
			image: info?.image,
			noteExists: info?.status === 'existing',
			tasks: (snapshot.byDay.get(iso) ?? []).map((task) => ({
				id: taskId(task),
				text: task.text,
				checked: task.checked,
				time: calendar?.dayTime(task, iso),
			})),
		};
	}, `${anchor.getTime()}:${noteKey}:${snapshot.revision}`);
	const weekStart = periodic?.weekStart() ?? env.actions?.periodic.config().weekStart ?? 1;
	const active = periodic?.active();
	const select = (iso: string) => {
		returnFocus.current = ownerDocument.activeElement as HTMLElement | null;
		preview.close();
		setSelected(iso);
		setShowAgenda(true);
		setMessage('');
	};
	const openNote = (period: Period, iso: string, action: CalendarNoteAction) => {
		preview.close();
		void periodic
			?.open(period, calendarDate(iso), {
				create: action === 'create' || action === 'diary',
				newTab: action === 'tab' || action === 'diary',
				split: action === 'split',
				ownerWindow: ownerDocument.defaultView ?? undefined,
			})
			.then((ok) => {
				if (!ok) setMessage(t('calendarUnified.cancelled'));
			})
			.catch((error: unknown) => {
				setMessage(t('calendarUnified.error.write-failed'));
				env.report(error);
			});
	};
	const mutate = async (id: string, checked?: boolean) => {
		const task = [...tasks, ...earlier].find((item) => taskId(item) === id);
		if (!calendar || !task) return;
		if (checked === undefined && calendar.openRemoval) {
			await calendar.openRemoval({
				task,
				owner: ownerDocument.activeElement?.closest<HTMLElement>('[role="dialog"]') ?? ownerDocument.body,
			});
			return;
		}
		const result =
			checked === undefined ? await calendar.removeTask(task) : await calendar.toggleTask(task, checked);
		setMessage('code' in result ? t(`calendarUnified.error.${result.code}`) : '');
	};
	return (
		<section
			className="flex max-h-[75%] min-h-16 flex-col gap-2 overflow-y-auto border-t border-sidebar-border px-2 pb-2 pt-1 text-sidebar-foreground"
			data-navigator-calendar
		>
			<CalendarMonth
				showPeriodActions={false}
				anchor={anchor}
				selected={selected}
				weekStart={weekStart}
				weekNumbers={settings.calendarWeekNumbers}
				weeks={settings.calendarWeeks}
				onAnchor={setAnchor}
				onSelect={select}
				onToday={() => {
					setAnchor(new Date());
					select(calendarIso(new Date()));
				}}
				canSplit={env.canSplit}
				onNote={openNote}
				onHover={preview.hover}
				onLeave={preview.close}
				onLocate={
					active
						? () => {
								setAnchor(calendarDate(active.date));
								select(active.date);
							}
						: undefined
				}
				periods={(['day'] as const).map((period) => ({
					period,
					status: periodic?.inspect(period, calendarDate(selected)).status ?? 'unavailable',
					active: periodic?.inspect(period, calendarDate(selected)).active,
				}))}
				day={(iso) => {
					const info = periodic?.inspect('day', calendarDate(iso));
					const dayTasks = snapshot.byDay.get(iso) ?? [];
					const entry = info?.status === 'existing' ? service.index.get(info.path) : undefined;
					if (settings.calendarImages && entry) env.previews.request(entry.path);
					const record = entry ? env.previews.get(entry.path) : undefined;
					return {
						note: info?.status ?? 'unavailable',
						tasks: dayTasks.length,
						openTasks: dayTasks.filter((task) => !task.checked).length,
						active:
							info?.active ||
							(!!active &&
								calendarIso(startOfPeriod(active.period, calendarDate(iso), weekStart)) ===
									active.date),
						image:
							settings.calendarImages && record?.image && record.imageMtime === entry?.mtime
								? env.imageUrl(record.image)
								: undefined,
					};
				}}
			/>
			{showAgenda && (
				<Dialog open onOpenChange={setShowAgenda}>
					<DialogContent
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							if (returnFocus.current?.isConnected) returnFocus.current.focus();
						}}
						className="flex h-[min(36rem,85dvh)] max-w-xl flex-col [&_[data-calendar-agenda]>header]:pr-8"
						aria-describedby={undefined}
					>
						<DialogHeader className="sr-only">
							<DialogTitle>{selected}</DialogTitle>
						</DialogHeader>
						<CalendarAgenda
							key={selected}
							date={selected}
							earlierTasks={earlier.map((task) => ({
								id: taskId(task),
								date: task.scheduled ?? task.due ?? task.start,
								text: task.text,
								checked: task.checked,
								source: task.path,
								time: task.scheduledTime ?? task.time,
								reminder: task.reminder,
								recurring: !!task.seriesId,
							}))}
							tasks={tasks.map((task) => ({
								id: taskId(task),
								text: task.text,
								checked: task.checked,
								source: task.path,
								time: calendar?.dayTime(task, selected),
								reminder: task.reminder,
								recurring: !!task.seriesId,
							}))}
							status={snapshot.status}
							filtered={
								snapshot.filter !== 'all' &&
								!!calendar?.snapshot({ filter: 'all' }).byDay.get(selected)?.length
							}
							note={note ?? periodic?.inspect('day', calendarDate(selected))}
							canSplit={env.canSplit}
							message={message}
							onEdit={(id) => {
								const task = [...tasks, ...earlier].find((item) => taskId(item) === id);
								if (task)
									void calendar?.openEditor?.({
										task,
										owner:
											ownerDocument.activeElement?.closest<HTMLElement>('[role="dialog"]') ??
											ownerDocument.body,
									});
							}}
							composer={
								calendar && (
									<TaskComposer
										add={async (text) => {
											const result = await calendar.createTask({
												text,
												date: selected,
											});
											if ('code' in result)
												throw new Error(t(`calendarUnified.error.${result.code}`));
											return true;
										}}
										options={(text, onSaved) => {
											void calendar.openEditor?.({
												text,
												date: selected,
												onSaved,
												owner:
													ownerDocument.activeElement?.closest<HTMLElement>(
														'[role="dialog"]',
													) ?? ownerDocument.body,
											});
										}}
									/>
								)
							}
							onNote={(action) => openNote('day', selected, action)}
							onRetry={() => {
								if (calendar) void calendar.refresh(scope);
							}}
							onAdd={
								calendar
									? async (text, time) => {
											const result = await calendar.createTask({
												date: selected,
												text,
												time: time || undefined,
											});
											setMessage(
												'code' in result ? t(`calendarUnified.error.${result.code}`) : '',
											);
											return !('code' in result);
										}
									: undefined
							}
							onToggle={calendar ? (id, checked) => mutate(id, checked) : undefined}
							onRemove={calendar ? (id) => mutate(id) : undefined}
							onOpenSource={(id) => {
								const task = [...tasks, ...earlier].find((item) => taskId(item) === id);
								if (calendar && task)
									void calendar
										.openSource(task, ownerDocument.defaultView ?? undefined)
										.catch((error: unknown) => {
											setMessage(t('calendarUnified.error.source-missing'));
											env.report(error);
										});
							}}
							onRemind={(id) => {
								const task = [...tasks, ...earlier].find((item) => taskId(item) === id);
								if (task)
									void calendar?.openEditor?.({
										task,
										owner:
											ownerDocument.activeElement?.closest<HTMLElement>('[role="dialog"]') ??
											ownerDocument.body,
									});
							}}
						/>
					</DialogContent>
				</Dialog>
			)}
			{preview.content}
		</section>
	);
}
