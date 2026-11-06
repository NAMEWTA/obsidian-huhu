// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/calendar-grid.ts
import { ProductCalendar } from '../../../../ui/components/huhu/calendar/ProductCalendar';
import { TaskContent } from '../../../../ui/components/huhu/TaskContent';
import { CalendarDateMenu } from '../../../../ui/components/huhu/calendar/CalendarMonth';
import { cn } from '../../../../ui/lib/utils';
import { Button } from '../../../../ui/components/button';
import { Checkbox } from '../../../../ui/components/checkbox';
import { calendarClasses as widgetClasses } from './calendar-styles';
import { useLayoutEffect, useRef, useState } from 'react';
import { startOfWeek } from '../../../../shared/periodic-paths';
import { ExternalLink } from 'lucide-react';
import { IconButton } from './calendar-controls';
import {
	calendarSpan,
	dateBucketOf,
	taskDayKind,
	toIsoDate,
	type VaultTask,
} from '../../platform/calendar/alltasks-scan';
import { t } from '../../../../shared/i18n/index';
import { ObsidianIcon as Icon } from '../../../../ui/components/huhu/ObsidianIcon';
import { InlineLinks } from './CalendarLinks';
import type { DashboardRenderContext } from '../renderer/render-context';
import {
	TIMEGRID_HOUR_PX,
	byDayTaskTime,
	clampBarToWeek,
	hhmmToMin,
	monthDayLabel,
	packBarLanes,
	parseIso,
	taskDayTime,
	weekdayLabels,
	type BarEntry,
	type MonthGridOptions,
} from './calendar-layout';
interface GridProps {
	byDay: Map<string, VaultTask[]>;
	opts: MonthGridOptions;
	context: DashboardRenderContext;
}
/** A separate native button keeps source navigation outside checkbox and inline-link controls. */
function TaskSourceButton({ task, open }: { task: VaultTask; open: NonNullable<MonthGridOptions['onOpenNote']> }) {
	return (
		<IconButton
			size="icon-sm"
			className="shrink-0"
			label={`${t('calendarUnified.source')} · ${task.text}`}
			onClick={(event) => {
				event.stopPropagation();
				open(task.file, task.line, task);
			}}
		>
			<ExternalLink className="size-3" />
		</IconButton>
	);
}
function dayTrigger(iso: string, action?: (iso: string) => void) {
	return action
		? {
				role: 'button' as const,
				tabIndex: 0,
				'aria-label': t('calendar.dayNumAddTask'),
				title: t('calendar.dayNumAddTask'),
				onClick: (event: React.MouseEvent) => {
					event.stopPropagation();
					action(iso);
				},
				onKeyDown: (event: React.KeyboardEvent) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						event.stopPropagation();
						action(iso);
					}
				},
			}
		: {};
}
function dateTrigger(
	iso: string,
	opts: MonthGridOptions,
	action?: (iso: string) => void,
	tasks: readonly VaultTask[] = [],
) {
	const note = opts.dayState?.(iso),
		existing = note?.status === 'existing',
		today = iso === toIsoDate(new Date());
	const openTasks = tasks.filter((task) => !task.checked).length;
	const label = [
		iso,
		t('calendarUnified.view'),
		today && t('calendarUnified.today'),
		note?.active && t('calendarUnified.currentNote'),
		existing && t('calendarUnified.hasNote'),
		tasks.length > 0 &&
			t(openTasks ? 'calendarUnified.openTasks' : 'calendarUnified.doneTasks', {
				count: openTasks || tasks.length,
			}),
	]
		.filter(Boolean)
		.join(' · ');
	const choose = (modified: boolean) => {
		opts.onDayLeave?.();
		if (modified && existing && opts.onPeriodNote) opts.onPeriodNote(iso, 'tab');
		else (action ?? opts.onDayClick)?.(iso);
	};
	return {
		...dayTrigger(iso, action),
		'aria-label': label,
		'aria-current': today ? ('date' as const) : undefined,
		'aria-pressed': opts.selected === undefined ? undefined : opts.selected === iso,
		title: t(existing ? 'calendarUnified.dateShortcuts' : 'calendarUnified.view'),
		onClick: (event: React.MouseEvent) => {
			event.stopPropagation();
			choose(event.ctrlKey || event.metaKey);
		},
		onAuxClick: (event: React.MouseEvent) => {
			if (event.button === 1) {
				event.preventDefault();
				event.stopPropagation();
				choose(true);
			}
		},
	};
}
export function OriginMark({ task, iso }: { task: VaultTask; iso: string }) {
	const kind = taskDayKind(task, iso);
	return kind === 'scheduled' || kind === 'completion' ? (
		<div
			className={widgetClasses(
				`dashboard-calendar-mark dashboard-calendar-mark--${kind === 'scheduled' ? 'scheduled' : 'done'}`,
			)}
			aria-label={t(kind === 'scheduled' ? 'calendar.markerScheduled' : 'calendar.markerDone')}
			title={t(kind === 'scheduled' ? 'calendar.markerScheduled' : 'calendar.markerDone')}
		>
			<Icon name={kind === 'scheduled' ? 'hourglass' : 'check-circle'} />
		</div>
	) : null;
}
function DayTask({ task, iso, opts, context }: Omit<GridProps, 'byDay'> & { task: VaultTask; iso: string }) {
	const multi = !!(task.start && task.end) && taskDayKind(task, iso) === 'span',
		overdue = !task.checked && dateBucketOf(task.due) === 'overdue',
		time = taskDayTime(task, iso);
	return (
		<div
			className={widgetClasses(
				`dashboard-calendar-event${multi ? ' is-multi' : ''}${task.priority ? ` prio-${task.priority}` : ''}${overdue ? ' is-overdue' : ''}${!opts.compact && opts.onOpenNote ? ' is-jumpable' : ''}`,
			)}
			onClick={(event) => {
				if (opts.compact || (event.target as HTMLElement).closest('input, [role="checkbox"], a')) return;
				event.stopPropagation();
				opts.onOpenNote?.(task.file, task.line, task);
			}}
		>
			{!opts.compact && opts.onToggle && (
				<Checkbox
					className={widgetClasses('dashboard-calendar-check')}
					checked={task.checked}
					aria-label={task.text}
					onCheckedChange={(checked) => opts.onToggle?.(task, checked === true)}
					onClick={(event) => {
						event.stopPropagation();
					}}
				/>
			)}
			<div className="min-w-0 flex-1 overflow-hidden">
				{opts.showTimes && time && <div className={widgetClasses('dashboard-calendar-event-time')}>{time}</div>}
				<div className={widgetClasses('dashboard-calendar-event-text')}>
					<TaskContent
						title={<InlineLinks text={task.text} app={opts.app} context={context} />}
						completed={task.checked}
					/>
				</div>
			</div>
			<OriginMark task={task} iso={iso} />
			{!opts.compact && opts.onOpenNote && <TaskSourceButton task={task} open={opts.onOpenNote} />}
			{multi && (
				<div
					className={widgetClasses('dashboard-calendar-multi-mark')}
					aria-label={`${task.start} → ${task.end}`}
				>
					<Icon name="arrow-right-left" />
				</div>
			)}
		</div>
	);
}
function TaskBar({ bar, opts, context }: Omit<GridProps, 'byDay'> & { bar: BarEntry & { lane: number } }) {
	const { task } = bar,
		time = taskDayTime(task, bar.firstIso);
	const range = `${monthDayLabel(parseIso(task.start ?? bar.firstIso))}–${monthDayLabel(parseIso(task.end ?? bar.firstIso))}`;
	const label =
		t('calendar.barLabel', { task: task.text, range }) +
		(bar.contLeft ? ` · ${t('calendar.barContLeft')}` : '') +
		(bar.contRight ? ` · ${t('calendar.barContRight')}` : '');
	return (
		<div
			className={widgetClasses(
				`dashboard-calendar-bar${task.priority ? ` prio-${task.priority}` : ''}${bar.contLeft ? ' is-cont-left' : ''}${bar.contRight ? ' is-cont-right' : ''}`,
			)}
			style={{
				gridColumnStart: bar.fromCol + 1,
				gridColumnEnd: `span ${bar.len}`,
				gridRow: bar.lane + 1,
			}}
			{...dayTrigger(bar.firstIso, opts.onBarClick)}
			aria-label={label}
			title={task.text}
		>
			{time && <div className={widgetClasses('dashboard-calendar-bar-time')}>{time}</div>}
			<div className={widgetClasses('dashboard-calendar-bar-text')}>
				<TaskContent
					title={<InlineLinks text={task.text} app={opts.app} context={context} />}
					completed={task.checked}
				/>
			</div>
		</div>
	);
}
function daysFrom(start: Date, count = 7) {
	return Array.from({ length: count }, (_, index) => {
		const date = new Date(start);
		date.setDate(start.getDate() + index);
		return { date, iso: toIsoDate(date) };
	});
}
export function MonthGrid({ year, month, byDay, opts, context }: GridProps & { year: number; month: number }) {
	const container = useRef<HTMLDivElement>(null),
		[condensed, setCondensed] = useState(opts.compact);
	useLayoutEffect(() => {
		const node = container.current,
			win = node?.ownerDocument.defaultView;
		if (!node || !win) return;
		const measure = () => {
			const width = node.getBoundingClientRect().width;
			if (width <= 0) return;
			const hit = Number.parseFloat(win.getComputedStyle(node).getPropertyValue('--hu-hit')) || 32;
			setCondensed(opts.compact || width < 7 * (hit * 2 + 16));
		};
		measure();
		const Observer = win.ResizeObserver;
		const observer = new Observer(measure);
		observer.observe(node);
		const media = win.matchMedia('(pointer:coarse)');
		media.addEventListener('change', measure);
		return () => {
			observer.disconnect();
			media.removeEventListener('change', measure);
		};
	}, [opts.compact]);
	const bars = !condensed && !opts.dotMode;
	const weekBars = (dates: readonly string[]) => {
		const spans = new Map<VaultTask, BarEntry>();
		for (const iso of dates)
			for (const task of byDay.get(iso) ?? []) {
				if (spans.has(task)) continue;
				const span = calendarSpan(task);
				if (span && span.start !== span.end)
					spans.set(task, clampBarToWeek(task, span, parseIso(iso), opts.weekStart));
			}
		return packBarLanes([...spans.values()]);
	};
	return (
		<div ref={container} className="min-w-0 max-w-full">
			<ProductCalendar
				className="min-w-0"
				compact
				month={new Date(year, month, 1)}
				onMonthChange={(value) => opts.onAnchor?.(value)}
				selected={opts.selected}
				onSelectDate={(iso) => (opts.onDayNumClick ?? opts.onDayClick)?.(iso)}
				weekStart={opts.weekStart}
				onDayClick={(iso, event) => {
					if (event.metaKey || event.ctrlKey || event.button === 1) {
						const note = opts.dayState?.(iso);
						if (note?.status === 'existing') opts.onPeriodNote?.(iso, 'tab');
						else (opts.onDayNumClick ?? opts.onDayClick)?.(iso);
					}
				}}
				onDayHover={opts.onDayHover}
				onDayLeave={opts.onDayLeave}
				decorateDayButton={(iso, button) => (
					<CalendarDateMenu
						status={opts.dayState?.(iso)?.status ?? 'unavailable'}
						canSplit={opts.canSplit}
						onAgenda={() => (opts.onDayNumClick ?? opts.onDayClick)?.(iso)}
						onNote={(action) => opts.onPeriodNote?.(iso, action)}
						onOpen={opts.onDayLeave}
					>
						{button}
					</CalendarDateMenu>
				)}
				dayLabel={(iso) => {
					const note = opts.dayState?.(iso),
						tasks = byDay.get(iso) ?? [];
					return [
						iso,
						t('calendarUnified.view'),
						iso === toIsoDate(new Date()) && t('calendarUnified.today'),
						note?.status === 'existing' && t('calendarUnified.hasNote'),
						note?.active && t('calendarUnified.currentNote'),
						tasks.length &&
							t(
								tasks.some((x) => !x.checked)
									? 'calendarUnified.openTasks'
									: 'calendarUnified.doneTasks',
								{
									count: tasks.some((x) => !x.checked)
										? tasks.filter((x) => !x.checked).length
										: tasks.length,
								},
							),
					]
						.filter(Boolean)
						.join(' · ');
				}}
				renderDayContent={(iso) => {
					const all = [...(byDay.get(iso) ?? [])].sort(byDayTaskTime(iso));
					const week = daysFrom(startOfWeek(parseIso(iso), opts.weekStart ?? 1)).map((x) => x.iso);
					const packed = bars ? weekBars(week) : [];
					const tasks = all.filter(
						(task) =>
							!bars ||
							!packed.some((bar) => bar.task === task && (bar.lane >= 0 || bar.firstIso !== iso)),
					);
					return (
						<div className={condensed ? 'space-y-1' : 'space-y-1 p-1'} data-calendar-cell={iso}>
							{opts.dayState?.(iso)?.status === 'existing' && (
								<span
									aria-label={t('calendarUnified.hasNote')}
									className="block h-1 w-2 rounded-sm bg-[var(--hu-fg-3)]"
								/>
							)}
							{condensed
								? all.length > 0 && (
										<Button
											type="button"
											variant="ghost"
											className="h-[var(--hu-hit)] w-full min-w-0 p-0 text-xs"
											data-calendar-count={iso}
											aria-label={[
												iso,
												t('calendarUnified.view'),
												t('calendarUnified.openTasks', {
													count: all.filter((task) => !task.checked).length,
												}),
												t('calendarUnified.doneTasks', {
													count: all.filter((task) => task.checked).length,
												}),
											].join(' · ')}
											onClick={() => (opts.onDayNumClick ?? opts.onDayClick)?.(iso)}
										>
											{all.length}
										</Button>
									)
								: opts.dotMode
									? all.length > 0 && (
											<span className="block size-1.5 rounded-full bg-[var(--hu-accent)]" />
										)
									: tasks.map((task) => (
											<DayTask
												key={task.id ?? task.path + task.line}
												task={task}
												iso={iso}
												opts={opts}
												context={context}
											/>
										))}
						</div>
					);
				}}
				renderWeekContent={
					bars
						? (dates) => (
								<div className="grid grid-cols-7 gap-1 p-1">
									{weekBars(dates)
										.filter((bar) => bar.lane >= 0)
										.map((bar) => (
											<TaskBar
												key={bar.task.id ?? bar.task.path + bar.task.line}
												bar={bar}
												opts={opts}
												context={context}
											/>
										))}
								</div>
							)
						: undefined
				}
			/>
		</div>
	);
}
export function WeekTimeGrid({ weekStart, byDay, opts, context }: GridProps & { weekStart: Date }) {
	const now = new Date(),
		today = toIsoDate(now),
		labels = weekdayLabels(weekStart.getDay() as import('../../../../shared/periodic-paths').WeekStart),
		days = daysFrom(weekStart),
		scroll = useRef<HTMLDivElement>(null);
	const timed = days.map(({ iso }) =>
		(byDay.get(iso) ?? []).flatMap((task) => {
			const time = taskDayTime(task, iso),
				start = hhmmToMin(time);
			if (start === undefined) return [];
			let end = hhmmToMin(task.endTime) ?? start + 60;
			if (end <= start) end = start + 30;
			return [{ task, time, start, end: Math.min(end, 1440) }];
		}),
	);
	const starts = timed.flat().map((event) => event.start),
		earliest = starts.length ? Math.max(0, Math.min(...starts) - 60) : 420;
	const weekTime = weekStart.getTime();
	useLayoutEffect(() => {
		const element = scroll.current,
			win = element?.ownerDocument.defaultView;
		if (!element || !win) return;
		const id = win.requestAnimationFrame(() => {
			element.scrollTop = Math.round((earliest * TIMEGRID_HOUR_PX) / 60);
		});
		return () => win.cancelAnimationFrame(id);
	}, [weekTime, earliest]);
	return (
		<div className={widgetClasses('dashboard-calgrid')}>
			<div className={widgetClasses('dashboard-calgrid-head')}>
				<div className={widgetClasses('dashboard-calgrid-corner')} />
				{days.map(({ date, iso }, index) => {
					const note = opts.dayState?.(iso);
					return (
						<CalendarDateMenu
							key={iso}
							status={note?.status ?? 'unavailable'}
							canSplit={opts.canSplit}
							onOpen={opts.onDayLeave}
							onAgenda={() => opts.onDayNumClick?.(iso)}
							onNote={(action) => opts.onPeriodNote?.(iso, action)}
						>
							<button
								type="button"
								data-date={iso}
								data-selected={opts.selected === iso || undefined}
								data-has-note={note?.status === 'existing' || undefined}
								data-active-note={note?.active || undefined}
								className={cn(
									'min-h-8 bg-transparent [@media(pointer:coarse)]:min-h-11',
									opts.selected === iso && 'ring-1 ring-inset ring-primary',
									note?.active && 'outline-dashed outline-1 outline-foreground/50',
									widgetClasses(
										`dashboard-calgrid-dayhead${iso === today ? ' is-today' : ''}${opts.onDayNumClick ? ' is-clickable' : ''}`,
									),
								)}
								onMouseEnter={(event) => opts.onDayHover?.(iso, event.currentTarget)}
								onMouseLeave={opts.onDayLeave}
								onBlur={opts.onDayLeave}
								{...dateTrigger(iso, opts, opts.onDayNumClick, byDay.get(iso) ?? [])}
							>
								<span className={widgetClasses('dashboard-calgrid-dayhead-wd')}>{labels[index]}</span>
								<span className={widgetClasses('dashboard-calgrid-dayhead-date')}>
									{date.getMonth() + 1}/{date.getDate()}
									{note?.status === 'existing' && (
										<span
											aria-label={t('calendarUnified.hasNote')}
											className="ml-1 inline-block h-1 w-2 rounded-sm bg-muted-foreground"
										/>
									)}
								</span>
							</button>
						</CalendarDateMenu>
					);
				})}
			</div>
			<div className={widgetClasses('dashboard-calgrid-allday')}>
				<div className={widgetClasses('dashboard-calgrid-allday-corner')}>{t('calendar.allDay')}</div>
				{days.map(({ iso }) => {
					const tasks = (byDay.get(iso) ?? [])
						.filter((task) => !taskDayTime(task, iso))
						.sort(byDayTaskTime(iso));
					return (
						<div key={iso} className={widgetClasses('dashboard-calgrid-allday-cell')}>
							{tasks.slice(0, 3).map((task) => (
								<button
									type="button"
									key={task.path + ':' + task.line}
									className={cn(
										'text-left',
										widgetClasses(
											`dashboard-calgrid-allday-chip${opts.onOpenNote ? ' is-jumpable' : ''}`,
										),
									)}
									aria-label={`${t('calendarUnified.source')} · ${task.text}`}
									disabled={!opts.onOpenNote}
									onClick={() => opts.onOpenNote?.(task.file, task.line, task)}
								>
									<TaskContent title={task.text} completed={task.checked} />
								</button>
							))}
							{tasks.length > 3 && (
								<div className={widgetClasses('dashboard-calgrid-allday-more')}>
									+{tasks.length - 3}
								</div>
							)}
						</div>
					);
				})}
			</div>
			<div ref={scroll} className={widgetClasses('dashboard-calgrid-scroll')}>
				<div className={widgetClasses('dashboard-calgrid-body')}>
					<div className={widgetClasses('dashboard-calgrid-hours')}>
						{Array.from({ length: 24 }, (_, hour) => (
							<div key={hour} className={widgetClasses('dashboard-calgrid-hour')}>
								{String(hour).padStart(2, '0')}:00
							</div>
						))}
					</div>
					{days.map(({ iso }, index) => (
						<div
							key={iso}
							className={widgetClasses(`dashboard-calgrid-daycol${iso === today ? ' is-today' : ''}`)}
						>
							{timed[index]!.map(({ task, time, start, end }) => (
								<div
									key={task.path + ':' + task.line}
									className={cn(
										'flex items-start gap-1',
										widgetClasses(
											`dashboard-calgrid-event${task.priority ? ` prio-${task.priority}` : ''}${opts.onOpenNote ? ' is-jumpable' : ''}`,
										),
									)}
									style={{
										top: Math.round((start * TIMEGRID_HOUR_PX) / 60),
										height: Math.max(Math.round(((end - start) * TIMEGRID_HOUR_PX) / 60), 20),
										minHeight: opts.onOpenNote ? 'calc(var(--hu-hit) + 8px)' : undefined,
									}}
									onClick={(event) => {
										if (!(event.target as HTMLElement).closest('input, [role="checkbox"], a'))
											opts.onOpenNote?.(task.file, task.line, task);
									}}
								>
									<div className="min-w-0 flex-1">
										<div className={widgetClasses('dashboard-calgrid-event-time')}>{time}</div>
										<div className={widgetClasses('dashboard-calgrid-event-title')}>
											<TaskContent
												title={
													<InlineLinks text={task.text} app={opts.app} context={context} />
												}
												completed={task.checked}
											/>
										</div>
										{!opts.compact && opts.onToggle && (
											<Checkbox
												className={widgetClasses('dashboard-calgrid-event-check')}
												checked={task.checked}
												aria-label={task.text}
												onCheckedChange={(checked) => opts.onToggle?.(task, checked === true)}
												onClick={(event) => {
													event.stopPropagation();
												}}
											/>
										)}
									</div>
									{opts.onOpenNote && <TaskSourceButton task={task} open={opts.onOpenNote} />}
								</div>
							))}
						</div>
					))}
					{days.some((day) => day.iso === today) && (
						<div
							className={widgetClasses('dashboard-calgrid-nowline')}
							style={{
								top: Math.round(((now.getHours() * 60 + now.getMinutes()) * TIMEGRID_HOUR_PX) / 60),
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
