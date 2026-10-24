import { widgetClasses } from '../theme/widget-classes';
import { Notice, Platform, type App } from 'obsidian';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
import { useLayoutEffect, useState } from 'react';
import { startOfWeek } from '../../../../shared/periodic-paths';
import { Button } from '../../../../ui/components/button';
import type { CalendarTaskFilter } from '../../core/calendar/task-filter';
import type { DashboardSettings } from '../../core/board/types';
import { toIsoDate, type VaultTask } from '../../platform/calendar/alltasks-scan';
import { t } from '../../../../shared/i18n';
import type { DashboardRenderContext } from '../renderer/render-context';
import type { DashboardSettingsAccess } from '../settings-access';
import { MonthGrid, WeekTimeGrid } from './CalendarGrids';
import { CalendarNav } from './CalendarNav';
import { CalendarTile } from './CalendarTile';
import { HomeCalendarMonth } from './HomeCalendarMonth';
import { useDayPreview } from './DayPreview';
import { monthLabel, parseIso, weekLabel } from './calendar-layout';
import { addCalendarTask } from './calendar-add-task';
import { calendarReloaders } from './calendar-reload';
import { periodicDayState, useCalendarData, usePeriodicNotes } from './use-calendar';

export interface CalendarViewContext {
	anchor: Date;
	selected: string;
}
export interface CalendarPanelProps {
	root: HTMLElement;
	context: DashboardRenderContext;
	app: App;
	settings: DashboardSettings;
	settingsAccess?: DashboardSettingsAccess;
	widget?: boolean;
	autoLoad?: boolean;
	onOpenNote?: (file: ContentFile, line?: number, task?: VaultTask) => void;
	onRemind?: (task: VaultTask, iso: string) => void;
	openDay: (
		iso: string,
		tasks: VaultTask[],
		focus: boolean,
		toggle: (task: VaultTask, checked: boolean) => Promise<void>,
	) => void;
	openFull?: (
		byDay: Map<string, VaultTask[]>,
		view: 'month' | 'week',
		weekStart: Date,
		toggle: (task: VaultTask, checked: boolean) => Promise<void>,
		position?: CalendarViewContext,
	) => void;
}
export function CalendarPanel({
	root,
	context,
	app,
	settings,
	settingsAccess,
	widget = false,
	autoLoad,
	onOpenNote,
	onRemind,
	openDay,
	openFull,
}: CalendarPanelProps) {
	const [date, setDate] = useState(new Date()),
		[selected, setSelected] = useState(() => toIsoDate(new Date())),
		[view, setView] = useState<'month' | 'week'>('month');
	const persistedFilter = settings.calendarTaskFilter ?? 'all';
	const [started, setStarted] = useState(!widget || !Platform.isPhone || !!autoLoad);
	const { calendar, snapshot, byDay, reload } = useCalendarData(
		app,
		{
			boardPath: settings.dashboardFile,
			filter: 'all',
			from: toIsoDate(new Date(date.getFullYear(), date.getMonth(), -6)),
			to: toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 7)),
		},
		started,
	);
	const { periodic } = usePeriodicNotes();
	const filter = calendar ? snapshot.filter : persistedFilter;
	const selectedHasUnfilteredTasks = !!calendar
		?.snapshot({ boardPath: settings.dashboardFile, filter: 'all' })
		.byDay.get(selected)?.length;
	const weekStart = periodic?.weekStart() ?? 1;
	const week = startOfWeek(date, weekStart);
	const preview = useDayPreview(app, context, `${date.getTime()}:${view}:${selected}:${snapshot.revision}:${filter}`);
	const closePreview = preview.close;
	useLayoutEffect(() => {
		calendarReloaders.set(root, async () => {
			closePreview();
			if (started) await calendar?.refresh({ boardPath: settings.dashboardFile, filter });
		});
		return () => {
			calendarReloaders.delete(root);
		};
	}, [root, calendar, settings.dashboardFile, filter, started, closePreview]);
	const load = () => {
		setStarted(true);
		void reload();
	};
	const today = () => {
		const now = new Date();
		setDate(now);
		setSelected(toIsoDate(now));
	};
	const choose = (iso: string, focus = false) => {
		setSelected(iso);
		if (!widget) setDate(parseIso(iso));
		openDay(iso, byDay.get(iso) ?? [], focus, toggle);
	};
	const toggle = async (task: VaultTask, checked: boolean) => {
		const result = await calendar?.toggleTask(task, checked);
		if (!result || 'code' in result) {
			new Notice(
				t(result && 'code' in result ? `calendarUnified.error.${result.code}` : 'calendarUnified.unavailable'),
			);
			throw new Error('calendar.toggle-failed');
		}
		if (result.status === 'written-pending-refresh') new Notice(t('calendarUnified.pendingRefresh'));
	};
	const changeFilter = (value: CalendarTaskFilter) => {
		void calendar?.setFilter(value).then((saved) => {
			if (!saved) new Notice(t('settings.writeFailed'));
		});
	};
	const shift = (delta: number) =>
		setDate((value) =>
			view === 'week'
				? new Date(value.getFullYear(), value.getMonth(), value.getDate() + delta * 7)
				: new Date(value.getFullYear(), value.getMonth() + delta, 1),
		);
	const gridOptions = {
		compact: false,
		app,
		weekStart,
		selected,
		canSplit: !Platform.isPhone,
		onPeriodNote: (
			iso: string,
			action: import('../../../../ui/components/huhu/calendar/CalendarMonth').CalendarNoteAction,
		) => {
			closePreview();
			void periodic
				?.open('day', parseIso(iso), {
					create: action === 'create',
					newTab: action === 'tab',
					split: action === 'split',
					ownerWindow: context.root.ownerDocument.defaultView ?? undefined,
				})
				.then((ok) => {
					if (!ok) new Notice(t('calendarUnified.cancelled'));
				})
				.catch(() => new Notice(t('calendarUnified.error.write-failed')));
		},
		dayState: (iso: string) => periodicDayState(periodic, iso),
		onOpenNote,
		onToggle: (task: VaultTask, checked: boolean) => {
			void toggle(task, checked).catch(() => {});
		},
		onBarClick: (iso: string) => choose(iso),
		onDayNumClick: (iso: string) => choose(iso),
		onDayHover: (iso: string, anchor: HTMLElement) => preview.hover(anchor, iso, byDay.get(iso) ?? []),
		onDayLeave: preview.close,
	};
	if (widget)
		return (
			<>
				<CalendarTile
					app={app}
					context={context}
					byDay={byDay}
					date={date}
					selected={selected}
					loaded={snapshot.status === 'ready'}
					error={snapshot.status === 'error' || snapshot.status === 'unavailable'}
					status={snapshot.status}
					started={started}
					onShift={shift}
					onAnchor={setDate}
					onToday={today}
					onLoad={load}
					onFull={() => {
						load();
						openFull?.(byDay, view, startOfWeek(parseIso(selected), weekStart), toggle, {
							anchor: date,
							selected,
						});
					}}
					filter={filter}
					filtered={filter !== 'all' && selectedHasUnfilteredTasks}
					boardPath={settings.dashboardFile}
					onFilter={changeFilter}
					onDay={(iso) => choose(iso)}
					onSelect={setSelected}
					onOpenDaily={(iso) => {
						void periodic?.open('day', parseIso(iso));
					}}
					onToggle={toggle}
					onAdd={async (iso, text, time) => {
						const added = await addCalendarTask(
							app,
							iso,
							text,
							time ?? '',
							settingsAccess,
							settings.dashboardFile,
						);
						if (!added) throw new Error('calendar.create-failed');
					}}
					onRemind={onRemind}
					onOpenNote={onOpenNote}
					onHover={(iso, anchor) => preview.hover(anchor, iso, byDay.get(iso) ?? [])}
					onLeave={preview.close}
				/>
				{preview.content}
			</>
		);
	return (
		<>
			<CalendarNav
				view={view}
				label={view === 'week' ? weekLabel(week) : monthLabel(date.getFullYear(), date.getMonth())}
				filter={filter}
				onShift={shift}
				onView={setView}
				onToday={today}
				onFilter={changeFilter}
				picker={
					<HomeCalendarMonth
						anchor={date}
						selected={selected}
						byDay={byDay}
						onAnchor={setDate}
						onSelect={(iso) => {
							setDate(parseIso(iso));
							choose(iso);
						}}
						onToday={today}
					/>
				}
			/>
			<div className={widgetClasses('dashboard-calendar-section-body')}>
				{snapshot.status === 'error' || snapshot.status === 'unavailable' ? (
					<div role="alert" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
						{t(snapshot.status === 'error' ? 'calendarUnified.failed' : 'calendarUnified.unavailable')}
						<Button variant="outline" size="sm" onClick={load}>
							{t('calendarUnified.retry')}
						</Button>
					</div>
				) : (
					<>
						{snapshot.status === 'loading' && (
							<p role="status" className="m-0 text-xs text-muted-foreground">
								{t('calendarUnified.loading')}
							</p>
						)}
						{view === 'month' ? (
							<MonthGrid
								year={date.getFullYear()}
								month={date.getMonth()}
								byDay={byDay}
								opts={gridOptions}
								context={context}
							/>
						) : (
							<WeekTimeGrid weekStart={week} byDay={byDay} opts={gridOptions} context={context} />
						)}
					</>
				)}
			</div>
			{preview.content}
		</>
	);
}
