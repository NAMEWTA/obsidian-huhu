// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/calendar-grid.ts
import { CalendarDateMenu } from '../../../../ui/components/huhu/calendar/CalendarMonth';
import { cn } from '../../../../ui/lib/utils';
import { Checkbox } from '../../../../ui/components/checkbox';
import { widgetClasses } from '../theme/widget-classes';
import { useLayoutEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { IconButton } from '../board/controls';
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
import { COMPACT_MAX_PER_DAY, TIMEGRID_HOUR_PX, byDayTaskTime, clampBarToWeek, hhmmToMin, monthDayLabel, packBarLanes, parseIso, taskDayTime, weekdayLabels, type BarEntry, type MonthGridOptions } from './calendar-layout';
interface GridProps {
	byDay: Map<string, VaultTask[]>;
	opts: MonthGridOptions;
	context: DashboardRenderContext;
}
/** A separate native button keeps source navigation outside checkbox and inline-link controls. */
function TaskSourceButton({ task, open }: { task: VaultTask; open: NonNullable<MonthGridOptions['onOpenNote']> }) {
	return <IconButton size="icon-sm" className="shrink-0" label={`${t('calendarUnified.source')} · ${task.text}`} onClick={(event) => { event.stopPropagation(); open(task.file, task.line, task); }}><ExternalLink className="size-3" /></IconButton>;
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
						event.preventDefault(); event.stopPropagation();
						action(iso);
					}
				},
			}
		: {};
}
function dateTrigger(iso: string, opts: MonthGridOptions, action?: (iso: string) => void, tasks: readonly VaultTask[] = []) {
	const note = opts.dayState?.(iso), existing = note?.status === 'existing', today = iso === toIsoDate(new Date());
	const openTasks = tasks.filter((task) => !task.checked).length;
	const label = [iso, t('calendarUnified.view'), today && t('calendarUnified.today'), note?.active && t('calendarUnified.currentNote'), existing && t('calendarUnified.hasNote'), tasks.length > 0 && t(openTasks ? 'calendarUnified.openTasks' : 'calendarUnified.doneTasks', { count: openTasks || tasks.length })].filter(Boolean).join(' · ');
	const choose = (modified: boolean) => {
		opts.onDayLeave?.();
		if (modified && existing && opts.onPeriodNote) opts.onPeriodNote(iso, 'tab');
		else (action ?? opts.onDayClick)?.(iso);
	};
	return { ...dayTrigger(iso, action),
		'aria-label': label,
		'aria-current': today ? 'date' as const : undefined,
		'aria-pressed': opts.selected === undefined ? undefined : opts.selected === iso,
		title: t(existing ? 'calendarUnified.dateShortcuts' : 'calendarUnified.view'),
		onClick: (event: React.MouseEvent) => { event.stopPropagation(); choose(event.ctrlKey || event.metaKey); },
		onAuxClick: (event: React.MouseEvent) => { if (event.button === 1) { event.preventDefault(); event.stopPropagation(); choose(true); } },
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
				`dashboard-calendar-event${task.checked ? ' is-done' : ''}${multi ? ' is-multi' : ''}${task.priority ? ` prio-${task.priority}` : ''}${overdue ? ' is-overdue' : ''}${!opts.compact && opts.onOpenNote ? ' is-jumpable' : ''}`,
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
					<InlineLinks text={task.text} app={opts.app} context={context} />
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
function DayCell({
	date,
	month,
	tasks,
	stateTasks = tasks,
	opts,
	context,
}: Omit<GridProps, 'byDay'> & { date: Date; month: number; tasks: VaultTask[]; stateTasks?: readonly VaultTask[] }) {
	const iso = toIsoDate(date),
		today = toIsoDate(new Date()),
		sorted = tasks.slice().sort(byDayTaskTime(iso)),
		shown = opts.compact ? sorted.slice(0, COMPACT_MAX_PER_DAY) : sorted;
	const note = opts.dayState?.(iso);
	const hover = opts.dotMode || !opts.compact,
		click = !!(opts.compact || opts.dotMode) && !!opts.onDayClick;
	return (
		<div
			data-date={iso} data-selected={opts.selected === iso || undefined} data-has-note={note?.status === 'existing' || undefined} data-active-note={note?.active || undefined}
			className={cn(opts.selected === iso && 'ring-1 ring-inset ring-primary/60', note?.active && 'outline-dashed outline-1 outline-foreground/50', widgetClasses(
				`dashboard-calendar-cell${date.getMonth() === month ? '' : ' is-outside'}${iso === today ? ' is-today' : ''}${tasks.length ? ' has-tasks' : ''}${click ? ' is-clickable' : ''}`,
			))}
			onClick={() => {
				if (click) opts.onDayClick?.(iso);
			}}
			onMouseEnter={(event) => {
				if (hover) opts.onDayHover?.(iso, event.currentTarget);
			}}
			onMouseLeave={() => {
				if (hover) opts.onDayLeave?.();
			}}
			onFocus={(event) => {
				if (hover) opts.onDayHover?.(iso, event.currentTarget);
			}}
			onBlur={() => {
				if (hover) opts.onDayLeave?.();
			}}
		>
			<CalendarDateMenu status={note?.status ?? 'unavailable'} canSplit={opts.canSplit} onOpen={opts.onDayLeave} onAgenda={() => (opts.onDayNumClick ?? opts.onDayClick)?.(iso)} onNote={(action) => opts.onPeriodNote?.(iso, action)}><button type="button"
				className={cn('min-h-8 min-w-8 bg-transparent [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11', widgetClasses(
					`dashboard-calendar-cell-num${!opts.compact && !opts.dotMode && opts.onDayNumClick ? ' is-clickable' : ''}`,
				))}
				{...dateTrigger(iso, opts, !opts.compact && !opts.dotMode ? opts.onDayNumClick : undefined, stateTasks)}
			>
				{date.getDate()}
				{note?.status === 'existing' && <span aria-label={t('calendarUnified.hasNote')} className="ml-1 inline-block h-1 w-2 rounded-sm bg-muted-foreground" />}
			</button></CalendarDateMenu>
			{opts.dotMode ? (
				tasks.length > 0 && (
					<div
						className={widgetClasses(
							`dashboard-calendar-cell-dot${tasks.every((task) => task.checked) ? ' is-done' : ''}`,
						)}
					/>
				)
			) : (
				<div className={widgetClasses('dashboard-calendar-cell-list')}>
					{shown.map((task) => (
						<DayTask
							key={task.path + ':' + task.line}
							task={task}
							iso={iso}
							opts={opts}
							context={context}
						/>
					))}
					{opts.compact && sorted.length > COMPACT_MAX_PER_DAY && (
						<div className={widgetClasses('dashboard-calendar-more')}>
							{t('calendar.moreCount', { count: sorted.length - COMPACT_MAX_PER_DAY })}
						</div>
					)}
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
				`dashboard-calendar-bar${task.checked ? ' is-done' : ''}${task.priority ? ` prio-${task.priority}` : ''}${bar.contLeft ? ' is-cont-left' : ''}${bar.contRight ? ' is-cont-right' : ''}`,
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
				<InlineLinks text={task.text} app={opts.app} context={context} />
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
	const leading = (new Date(year, month, 1).getDay() - (opts.weekStart ?? 1) + 7) % 7,
		rows = Math.ceil((leading + new Date(year, month + 1, 0).getDate()) / 7),
		days = daysFrom(new Date(year, month, 1 - leading), rows * 7),
		bars = !opts.compact && !opts.dotMode;
	return (
		<div className={widgetClasses(`dashboard-calendar${bars ? ' is-full' : ' is-compact'}`)} style={{ minWidth: !opts.compact && opts.onOpenNote ? 'calc(7 * (var(--nd-hit-size) + 72px))' : undefined }}>
			<div className={widgetClasses('dashboard-calendar-weekdays')}>
				{weekdayLabels(opts.weekStart).map((label) => (
					<div key={label} className={widgetClasses('dashboard-calendar-weekday')}>
						{label}
					</div>
				))}
			</div>
			<div className={widgetClasses(`dashboard-calendar-body${bars ? ' dashboard-calendar-body--bars' : ''}`)}>
				{!bars
					? days.map(({ date, iso }) => (
							<DayCell
								key={iso}
								date={date}
								month={month}
								tasks={byDay.get(iso) ?? []}
								opts={opts}
								context={context}
							/>
						))
					: Array.from({ length: rows }, (_, index) => {
							const week = days.slice(index * 7, index * 7 + 7),
								spans = new Map<VaultTask, BarEntry>();
							for (const { iso, date } of week)
								for (const task of byDay.get(iso) ?? []) {
									if (spans.has(task)) continue;
									const span = calendarSpan(task);
									if (span && span.start !== span.end)
										spans.set(task, clampBarToWeek(task, span, date, opts.weekStart));
								}
							const packed = packBarLanes(Array.from(spans.values())),
								degraded = new Map(
									packed.filter((bar) => bar.lane === -1).map((bar) => [bar.task, bar.firstIso]),
								);
							return (
								<div key={week[0]!.iso} className={widgetClasses('dashboard-calendar-week')}>
									<div
										className={widgetClasses('dashboard-calendar-barlayer')}
										style={{
											gridTemplateRows: `repeat(${Math.max(0, ...packed.map((bar) => bar.lane + 1))}, 20px)`,
										}}
									>
										{packed
											.filter((bar) => bar.lane !== -1)
											.map((bar) => (
												<TaskBar
													key={bar.task.path + ':' + bar.task.line}
													bar={bar}
													opts={opts}
													context={context}
												/>
											))}
									</div>
									<div className={widgetClasses('dashboard-calendar-week-days')}>
										{week.map(({ date, iso }) => (
											<DayCell
												key={iso}
												date={date}
												month={month}
												stateTasks={byDay.get(iso) ?? []}
												tasks={(byDay.get(iso) ?? []).filter(
													(task) => !spans.has(task) || degraded.get(task) === iso,
												)}
												opts={opts}
												context={context}
											/>
										))}
									</div>
								</div>
							);
						})}
			</div>
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
			<div className={widgetClasses('dashboard-calgrid')} style={{ minWidth: opts.onOpenNote ? 'calc(52px + 7 * (var(--nd-hit-size) + 64px))' : undefined }}>
			<div className={widgetClasses('dashboard-calgrid-head')}>
				<div className={widgetClasses('dashboard-calgrid-corner')} />
				{days.map(({ date, iso }, index) => {
					const note = opts.dayState?.(iso);
					return <CalendarDateMenu key={iso} status={note?.status ?? 'unavailable'} canSplit={opts.canSplit} onOpen={opts.onDayLeave} onAgenda={() => opts.onDayNumClick?.(iso)} onNote={(action) => opts.onPeriodNote?.(iso, action)}><button type="button"
						data-date={iso} data-selected={opts.selected === iso || undefined} data-has-note={note?.status === 'existing' || undefined} data-active-note={note?.active || undefined}
						className={cn('min-h-8 bg-transparent [@media(pointer:coarse)]:min-h-11', opts.selected === iso && 'ring-1 ring-inset ring-primary', note?.active && 'outline-dashed outline-1 outline-foreground/50', widgetClasses(`dashboard-calgrid-dayhead${iso === today ? ' is-today' : ''}${opts.onDayNumClick ? ' is-clickable' : ''}`))}
						onMouseEnter={(event) => opts.onDayHover?.(iso, event.currentTarget)} onMouseLeave={opts.onDayLeave} onBlur={opts.onDayLeave}
						{...dateTrigger(iso, opts, opts.onDayNumClick, byDay.get(iso) ?? [])}>
						<span className={widgetClasses('dashboard-calgrid-dayhead-wd')}>{labels[index]}</span>
						<span className={widgetClasses('dashboard-calgrid-dayhead-date')}>{date.getMonth() + 1}/{date.getDate()}{note?.status === 'existing' && <span aria-label={t('calendarUnified.hasNote')} className="ml-1 inline-block h-1 w-2 rounded-sm bg-muted-foreground" />}</span>
					</button></CalendarDateMenu>;
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
								<button type="button"
									key={task.path + ':' + task.line}
									className={cn('text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', widgetClasses(
										`dashboard-calgrid-allday-chip${task.checked ? ' is-done' : ''}${opts.onOpenNote ? ' is-jumpable' : ''}`,
									))}
									aria-label={`${t('calendarUnified.source')} · ${task.text}`} disabled={!opts.onOpenNote}
									onClick={() => opts.onOpenNote?.(task.file, task.line, task)}
								>
									{task.text}
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
									className={cn('flex items-start gap-1', widgetClasses(
										`dashboard-calgrid-event${task.checked ? ' is-done' : ''}${task.priority ? ` prio-${task.priority}` : ''}${opts.onOpenNote ? ' is-jumpable' : ''}`,
									))}
									style={{
										top: Math.round((start * TIMEGRID_HOUR_PX) / 60),
										height: Math.max(Math.round(((end - start) * TIMEGRID_HOUR_PX) / 60), 20),
										minHeight: opts.onOpenNote ? 'calc(var(--nd-hit-size) + 8px)' : undefined,
									}}
									onClick={(event) => {
										if (!(event.target as HTMLElement).closest('input, [role="checkbox"], a'))
											opts.onOpenNote?.(task.file, task.line, task);
									}}
								>
									<div className="min-w-0 flex-1">
									<div className={widgetClasses('dashboard-calgrid-event-time')}>{time}</div>
									<div className={widgetClasses('dashboard-calgrid-event-title')}>
										<InlineLinks text={task.text} app={opts.app} context={context} />
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
