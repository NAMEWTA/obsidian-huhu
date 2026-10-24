// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/calendar-grid.ts
import { Button } from '../../../../ui/components/button';
import { widgetClasses } from '../theme/widget-classes';
import { IconButton } from '../board/controls';
import { X } from 'lucide-react';
import { Platform, type App } from 'obsidian';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';

import { useRef, useState } from 'react';
import { startOfWeek } from '../../../../shared/periodic-paths';
import { periodicDayState, useCalendarData, usePeriodicNotes } from './use-calendar';
import { useDayPreview } from './DayPreview';
import { HomeCalendarMonth } from './HomeCalendarMonth';
import { homeServices } from '../../services/instances';
import { CalendarDayPanel } from './CalendarDayPanel';
import type { CalendarViewContext } from './CalendarPanel';
import { filterTasksByDay, toIsoDate, type VaultTask } from '../../platform/calendar/alltasks-scan';
import { t } from '../../../../shared/i18n';
import type { DashboardRenderContext } from '../renderer/render-context';
import type { DashboardSettingsAccess } from '../settings-access';
import { MonthGrid, WeekTimeGrid } from './CalendarGrids';
import { CalendarNav } from './CalendarNav';
import { monthLabel, weekLabel, parseIso } from './calendar-layout';
import { readCalendarTaskFilter, writeCalendarTaskFilter } from './calendar-preferences';

export interface CalendarModalCallbacks {
	settingsAccess?: DashboardSettingsAccess;
	onToggle: (task: VaultTask, checked: boolean) => Promise<void> | void;
	onOpenNote?: (file: ContentFile, line?: number, task?: VaultTask) => void;
	/** Open the "New automation" dialog as a reminder for a task of a day; absent while automations are off. */
	onRemind?: (task: VaultTask, iso: string) => void;
}
interface CommonProps {
	app: App;
	context: DashboardRenderContext;
	actions: CalendarModalCallbacks;
}
export function CalendarModalPanel({
	app,
	context,
	actions,
	byDay: initialByDay,
	initialView,
	initialPosition,
	boardPath,
	initialWeekStart,
	openDay,
	close,
}: CommonProps & {
	byDay: Map<string, VaultTask[]>;
	initialView: 'month' | 'week';
	close?: () => void;
	initialWeekStart?: Date;
	initialPosition?: CalendarViewContext;
	boardPath?: string;
	openDay: (iso: string, tasks: VaultTask[], focus: boolean) => void;
}) {
	const [view, setView] = useState(initialView);
	const [anchor, setAnchor] = useState(() => initialPosition?.anchor ?? initialWeekStart ?? new Date());
	const [selected, setSelected] = useState(
		() => initialPosition?.selected ?? toIsoDate(initialWeekStart ?? new Date()),
	);
	const live = useCalendarData(app, {
		boardPath,
		filter: homeServices.calendar?.defaultScope().filter ?? 'all',
		from: toIsoDate(new Date(anchor.getFullYear(), anchor.getMonth(), -6)),
		to: toIsoDate(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 7)),
	});
	const { periodic } = usePeriodicNotes();
	const weekStart = periodic?.weekStart() ?? 1;
	const byDay = live.calendar ? live.byDay : initialByDay;
	const week = startOfWeek(anchor, weekStart);
	const [fallbackFilter, setFilter] = useState(() => readCalendarTaskFilter(actions.settingsAccess));
	const filter = live.calendar ? live.snapshot.filter : fallbackFilter;
	const [, refresh] = useState(0);
	const pending = useRef(new Set<VaultTask>());
	const preview = useDayPreview(
		app,
		context,
		`${anchor.getTime()}:${week.getTime()}:${view}:${filter}:${selected}:${live.snapshot.revision}`,
	);
	const [message, setMessage] = useState('');
	const shift = (delta: number) =>
		setAnchor((date) =>
			view === 'week'
				? new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta * 7)
				: new Date(date.getFullYear(), date.getMonth() + delta, 1),
		);

	const days = filterTasksByDay(byDay, filter, toIsoDate(new Date()));
	const choose = (iso: string) => {
		preview.close();
		setSelected(iso);
		setAnchor(parseIso(iso));
		openDay(iso, days.get(iso) ?? [], false);
	};
	const opts = {
		compact: false,
		weekStart,
		selected,
		canSplit: !Platform.isPhone,
		onPeriodNote: (
			iso: string,
			action: import('../../../../ui/components/huhu/calendar/CalendarMonth').CalendarNoteAction,
		) => {
			preview.close();
			void periodic
				?.open('day', parseIso(iso), {
					create: action === 'create' || action === 'diary',
					newTab: action === 'tab' || action === 'diary',
					split: action === 'split',
					ownerWindow: context.root.ownerDocument.defaultView ?? undefined,
				})
				.then((ok) => {
					if (!ok) setMessage(t('calendarUnified.cancelled'));
				})
				.catch(() => setMessage(t('calendarUnified.error.write-failed')));
		},
		dayState: (iso: string) => periodicDayState(periodic, iso),
		app,
		onOpenNote: actions.onOpenNote,
		onToggle: (task: VaultTask, next: boolean) => {
			if (pending.current.has(task)) return;
			pending.current.add(task);
			void Promise.resolve()
				.then(() => actions.onToggle(task, next))
				.then(() => {
					task.checked = next;
					refresh((n) => n + 1);
				})
				.catch(() => setMessage(t('calendarUnified.error.write-failed')))
				.finally(() => pending.current.delete(task));
		},
		onDayHover: (iso: string, anchor: HTMLElement) => preview.hover(anchor, iso, days.get(iso) ?? []),
		onDayLeave: preview.close,
		onBarClick: choose,
		onDayNumClick: choose,
	};
	return (
		<div
			className={widgetClasses('dashboard-modal dashboard-calendar-fullscreen-inner h-auto min-h-full')}
			onKeyDown={(event) => {
				if ((event.target as HTMLElement).closest('input,textarea,[role=combobox]')) return;
				if (event.key === 'ArrowLeft') shift(-1);
				if (event.key === 'ArrowRight') shift(1);
			}}
		>
			<CalendarNav
				view={view}
				label={view === 'week' ? weekLabel(week) : monthLabel(anchor.getFullYear(), anchor.getMonth())}
				filter={filter}
				onShift={shift}
				onView={setView}
				onToday={() => {
					const now = new Date();
					setAnchor(now);
					setSelected(toIsoDate(now));
				}}
				picker={
					<HomeCalendarMonth
						anchor={anchor}
						selected={selected}
						byDay={days}
						onAnchor={setAnchor}
						onSelect={(iso) => {
							setSelected(iso);
							setAnchor(parseIso(iso));
							openDay(iso, days.get(iso) ?? [], false);
						}}
						onToday={() => {
							const now = new Date();
							setAnchor(now);
							setSelected(toIsoDate(now));
						}}
					/>
				}
				onFilter={(value) => {
					if (live.calendar) {
						void live.calendar.setFilter(value);
						return;
					}
					void writeCalendarTaskFilter(actions.settingsAccess, value).then((saved) => {
						if (saved) setFilter(value);
					});
				}}
				end={
					<IconButton label={t('common.close')} onClick={close}>
						<X />
					</IconButton>
				}
			/>
			<div
				className={widgetClasses(
					'dashboard-modal-body dashboard-calendar-fullscreen-body flex-none overflow-visible',
				)}
			>
				{message && (
					<p role="alert" className="m-0 text-xs text-destructive">
						{message}
					</p>
				)}
				{live.calendar && (live.snapshot.status === 'error' || live.snapshot.status === 'unavailable') && (
					<div role="alert" className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
						{t('calendarUnified.failed')}
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								void live.reload();
							}}
						>
							{t('calendarUnified.retry')}
						</Button>
					</div>
				)}
				{view === 'week' ? (
					<WeekTimeGrid weekStart={week} byDay={days} opts={opts} context={context} />
				) : (
					<MonthGrid
						year={anchor.getFullYear()}
						month={anchor.getMonth()}
						byDay={days}
						opts={opts}
						context={context}
					/>
				)}
			</div>
			{preview.content}
		</div>
	);
}

/** One shared day panel in the wide widget and the focused modal. */
export function DayAgendaPanel({
	app,
	context,
	actions,
	iso,
	tasks: initialTasks,
	boardPath,
	addTask,
	removeTask,
	close,
}: CommonProps & {
	iso: string;
	tasks: VaultTask[];
	boardPath?: string;
	focusInput?: boolean;
	addTask: (title: string, time: string) => Promise<VaultTask | null>;
	removeTask?: (task: VaultTask) => Promise<boolean>;
	close: () => void;
}) {
	const live = useCalendarData(app, { boardPath, filter: 'all', from: iso, to: iso });
	const tasks = live.calendar ? (live.byDay.get(iso) ?? []) : initialTasks;
	return (
		<div className="relative">
			<Button
				variant="ghost"
				size="icon-sm"
				className="absolute right-0 top-0"
				data-slot="dialog-close"
				aria-label={t('ui.close')}
				onClick={close}
			>
				<X />
			</Button>
			<CalendarDayPanel
				className="flex h-[min(32rem,65dvh)] min-h-0 flex-col [&_[data-calendar-agenda]>header]:pr-8"
				iso={iso}
				tasks={tasks}
				loaded={!live.calendar || live.snapshot.status === 'ready'}
				status={live.calendar ? live.snapshot.status : 'ready'}
				app={app}
				context={context}
				boardPath={boardPath}
				onToggle={async (task, checked) => {
					await actions.onToggle(task, checked);
				}}
				onAdd={async (_iso, text, time) => {
					if (!(await addTask(text, time ?? ''))) throw new Error(t('calendarUnified.error.write-failed'));
				}}
				onRemove={
					removeTask
						? async (task) => {
								await removeTask(task);
							}
						: undefined
				}
				onOpenDaily={() => {}}
				onOpenNote={actions.onOpenNote}
				onRemind={actions.onRemind}
			/>
		</div>
	);
}
