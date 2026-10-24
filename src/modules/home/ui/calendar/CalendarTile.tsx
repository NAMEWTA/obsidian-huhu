import { CalendarCheck, Maximize2, RotateCw } from 'lucide-react';
import type { App } from 'obsidian';
import { useLayoutEffect, useState } from 'react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { calendarDate } from '../../../../ui/components/huhu/calendar/CalendarMonth';
import { cn } from '../../../../ui/lib/utils';
import { t, getLanguage } from '../../../../shared/i18n';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import type { CalendarTaskFilter, CalendarSnapshot } from '../../api';
import { IconButton } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import type { DashboardRenderContext } from '../renderer/render-context';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
import { CalendarDayPanel } from './CalendarDayPanel';
import { InlineLinks } from './CalendarLinks';
import { byDayTaskTime, taskDayTime } from './calendar-layout';
import { HomeCalendarMonth } from './HomeCalendarMonth';

export interface CalendarTileProps {
	app: App;
	context: DashboardRenderContext;
	byDay: Map<string, VaultTask[]>;
	date: Date;
	loaded: boolean;
	error: boolean;
	started: boolean;
	selected: string;
	status?: CalendarSnapshot['status'];
	filter?: CalendarTaskFilter;
	filtered?: boolean;
	boardPath?: string;
	onShift(this: void, delta: number): void;
	onAnchor?(this: void, date: Date): void;
	onFilter?(this: void, filter: CalendarTaskFilter): void;
	onToday(this: void): void;
	onLoad(this: void): void;
	onFull(this: void): void;
	onDay(this: void, iso: string): void;
	onSelect(this: void, iso: string): void;
	onOpenDaily(this: void, iso: string): void;
	onToggle(this: void, task: VaultTask, checked: boolean): Promise<void>;
	onAdd(this: void, iso: string, title: string, time?: string): Promise<void>;
	onRemind?(this: void, task: VaultTask, iso: string): void;
	onOpenNote?(this: void, file: ContentFile, line?: number, task?: VaultTask): void;
	onHover(this: void, iso: string, anchor: HTMLElement): void;
	onLeave(this: void): void;
}
function useRoom(): [(node: HTMLElement | null) => void, { wide: boolean; short: boolean; small: boolean }] {
	const [node, setNode] = useState<HTMLElement | null>(null),
		[room, setRoom] = useState({ wide: false, short: false, small: false });
	useLayoutEffect(() => {
		const win = node?.ownerDocument.defaultView;
		if (!node || !win) return;
		const measure = () => {
			const rect = node.getBoundingClientRect(),
				rem = parseFloat(win.getComputedStyle(node.ownerDocument.documentElement).fontSize) || 16;
			setRoom({
				wide: rect.width >= 40 * rem && rect.height >= 16 * rem,
				short: rect.height > 0 && rect.height < 12.5 * rem,
				small: rect.width < 20 * rem && rect.height > 0 && rect.height < 12.5 * rem,
			});
		};
		measure();
		const observer = new win.ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, [node]);
	return [setNode, room];
}

/** The same controlled month and agenda, arranged for S/M/L/XL without changing the selected day's meaning. */
export function CalendarTile(props: CalendarTileProps) {
	const [bodyRef, room] = useRoom();
	const date = calendarDate(props.selected),
		locale = getLanguage() === 'zh' ? 'zh-CN' : 'en';
	const status = props.status ?? (props.error ? 'error' : props.loaded ? 'ready' : 'loading');
	const feedback =
		status === 'error' || status === 'unavailable' ? (
			<div role="alert" className="mt-1 text-xs text-muted-foreground">
				{t(status === 'error' ? 'calendarUnified.failed' : 'calendarUnified.unavailable')}
				<Button variant="ghost" size="sm" onClick={props.onLoad}>
					{t('calendarUnified.retry')}
				</Button>
			</div>
		) : status === 'idle' || status === 'loading' ? (
			<p role="status" className="m-0 text-xs text-muted-foreground">
				{t('calendarUnified.loading')}
			</p>
		) : null;
	const choose = (iso: string) => {
		props.onSelect(iso);
		if (!room.wide) props.onDay(iso);
	};
	return (
		<div ref={bodyRef} className="flex h-full min-h-0 gap-3" data-calendar-tile data-wide={room.wide || undefined}>
			<WidgetActions>
				<IconButton label={t('calendar.today')} onClick={props.onToday}>
					<CalendarCheck />
				</IconButton>
				<IconButton label={t('calendar.fullscreen')} onClick={props.onFull}>
					<Maximize2 />
				</IconButton>
			</WidgetActions>
			{!props.started ? (
				<EmptyState
					className="w-full gap-2 p-0"
					title={t('calendar.mobileManualLoad')}
					action={
						<Button size="sm" variant="outline" aria-label={t('calendar.refresh')} onClick={props.onLoad}>
							<RotateCw />
							{t('calendar.refresh')}
						</Button>
					}
				/>
			) : (
				<>
					{room.short && (
						<section
							className="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto"
							data-calendar-panel="today"
							aria-label={t('calendarUnified.agenda')}
						>
							<Button
								variant="ghost"
								className="h-auto min-h-8 flex-col items-start gap-0 px-1 py-1 text-left"
								onClick={() => choose(props.selected)}
								aria-label={t('calendarUnified.view')}
							>
								<span className="text-xs text-primary">
									{date.toLocaleDateString(locale, { weekday: 'long' })}
								</span>
								<span className="text-3xl font-semibold leading-none tabular-nums">
									{date.getDate()}
								</span>
								<span className="text-xs font-normal text-muted-foreground">
									{date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
								</span>
							</Button>
							{feedback}
							{props.loaded && !props.byDay.get(props.selected)?.length && (
								<p className="m-0 text-xs text-muted-foreground">
									{t(props.filtered ? 'calendarUnified.filteredEmpty' : 'calendarUnified.empty')}
								</p>
							)}
							{props.loaded && (
								<ul className="m-0 list-none space-y-1 p-0">
									{(props.byDay.get(props.selected) ?? [])
										.slice()
										.sort(byDayTaskTime(props.selected))
										.slice(0, 2)
										.map((task) => (
											<li
												key={`${task.path}:${task.line}`}
												className={cn(
													'flex gap-1 text-xs',
													task.checked && 'text-muted-foreground line-through',
												)}
											>
												<span className="shrink-0 tabular-nums text-muted-foreground">
													{taskDayTime(task, props.selected) ?? '·'}
												</span>
												<span className="truncate">
													<InlineLinks
														text={task.text}
														app={props.app}
														context={props.context}
													/>
												</span>
											</li>
										))}
								</ul>
							)}
							<Input
								type="date"
								className="mt-auto min-h-8 w-full min-w-0 text-xs"
								aria-label={t('calendarUnified.chooseMonth')}
								value={props.selected}
								onChange={(event) => {
									const iso = event.currentTarget.value;
									if (iso) {
										props.onAnchor?.(calendarDate(iso));
										choose(iso);
									}
								}}
							/>
						</section>
					)}
					{!room.small && (
						<div
							className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto', room.short && 'w-[55%] flex-none')}
							data-calendar-panel="month"
						>
							<HomeCalendarMonth
								anchor={props.date}
								selected={props.selected}
								byDay={props.byDay}
								weeks={room.short ? 1 : undefined}
								showMonthCover={room.wide}
								onAnchor={(next) => {
									props.onLeave();
									if (props.onAnchor) props.onAnchor(next);
									else props.onShift(next.getTime() < props.date.getTime() ? -1 : 1);
								}}
								onSelect={choose}
								onToday={props.onToday}
								onHover={props.onHover}
								onLeave={props.onLeave}
							/>
							{!room.short && feedback}
						</div>
					)}
					{room.wide && (
						<CalendarDayPanel
							key={props.selected}
							boardPath={props.boardPath}
							className="flex min-h-0 w-[45%] max-w-[26rem] flex-col gap-2 overflow-hidden border-l border-border pl-3"
							iso={props.selected}
							tasks={props.byDay.get(props.selected) ?? []}
							loaded={props.loaded}
							status={props.status}
							filtered={props.filtered}
							app={props.app}
							context={props.context}
							onToggle={props.onToggle}
							onAdd={props.onAdd}
							onRemind={props.onRemind}
							onOpenDaily={props.onOpenDaily}
							onOpenNote={props.onOpenNote}
						/>
					)}
				</>
			)}
		</div>
	);
}
