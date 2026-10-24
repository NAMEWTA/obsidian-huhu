// Independently implemented against Notebook Navigator's calendar behaviour; no upstream code copied.
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, LocateFixed, MoreHorizontal } from 'lucide-react';
import {
	addDays,
	addMonths,
	startOfWeek,
	weekOfYear,
	type Period,
	type WeekStart,
} from '../../../../shared/periodic-paths';
import { getLanguage, t } from '../../../../shared/i18n';
import { Button } from '../../button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../../context-menu';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../../dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover';
import { cn } from '../../../lib/utils';

export const calendarIso = (date: Date) =>
	`${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const calendarDate = (iso: string) => {
	const [year, month, day] = iso.split('-').map(Number);
	const date = new Date(2000, 0, 1);
	date.setFullYear(year!, month! - 1, day);
	return date;
};
export function calendarRows(anchor: Date, weekStart: WeekStart, weeks = 6): Date[][] {
	const first =
		weeks < 6
			? startOfWeek(anchor, weekStart)
			: startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1), weekStart);
	const count =
		weeks < 6
			? Math.max(1, weeks)
			: Math.ceil(
					(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate() +
						((new Date(anchor.getFullYear(), anchor.getMonth(), 1).getDay() - weekStart + 7) % 7)) /
						7,
				);
	return Array.from({ length: count }, (_, row) =>
		Array.from({ length: 7 }, (_, column) => addDays(first, row * 7 + column)),
	);
}
export interface CalendarDayState {
	note: 'existing' | 'missing' | 'disabled' | 'unavailable';
	active?: boolean;
	tasks: number;
	openTasks: number;
	image?: string;
}
export interface CalendarPeriodAction {
	period: Period;
	status: CalendarDayState['note'];
	active?: boolean;
}
export type CalendarNoteAction = 'open' | 'create' | 'tab' | 'split' | 'diary';
export interface CalendarMonthProps {
	anchor: Date;
	selected: string;
	weekStart: WeekStart;
	weekNumbers?: boolean;
	weeks?: number;
	day(this: void, iso: string): CalendarDayState;
	onAnchor(this: void, date: Date): void;
	onSelect(this: void, iso: string): void;
	onToday(this: void): void;
	onNote?(this: void, period: Period, iso: string, action: CalendarNoteAction): void;
	periods?: readonly CalendarPeriodAction[];
	showPeriodActions?: boolean;
	canSplit?: boolean;
	onLocate?: () => void;
	onHover?(this: void, iso: string, anchor: HTMLElement): void;
	onLeave?(this: void): void;
	monthImage?: string;
	className?: string;
	footer?: ReactNode;
}
const target = 'min-h-8 min-w-8 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11';
const locale = () => (getLanguage() === 'zh' ? 'zh-CN' : 'en');
const periodLabel = (period: Period) => t(`calendarUnified.period.${period}`);

/** The same explicit period menu in sidebars, boards and agendas. Titles always navigate the calendar. */
export function CalendarNoteMenu({
	period,
	status,
	active,
	onAction,
	canSplit,
	label,
}: CalendarPeriodAction & {
	onAction(this: void, action: CalendarNoteAction): void;
	canSplit?: boolean;
	label?: string;
}) {
	const unavailable = status === 'disabled' || status === 'unavailable';
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						'min-h-8 gap-1 px-2 text-xs [@media(pointer:coarse)]:min-h-11',
						active && 'underline decoration-primary decoration-2 underline-offset-4',
					)}
					aria-label={`${label ?? periodLabel(period)} · ${t('calendarUnified.more')}`}
					title={
						unavailable
							? t(
									status === 'disabled'
										? 'calendarUnified.disabled'
										: 'calendarUnified.periodicUnavailable',
								)
							: undefined
					}
				>
					{status === 'existing' && <BookOpen aria-hidden className="size-3" />}
					{label ?? periodLabel(period)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>{periodLabel(period)}</DropdownMenuLabel>
				{unavailable ? (
					<DropdownMenuItem disabled>
						{t(status === 'disabled' ? 'calendarUnified.disabled' : 'calendarUnified.periodicUnavailable')}
					</DropdownMenuItem>
				) : status === 'existing' ? (
					<>
						<DropdownMenuItem onSelect={() => onAction('open')}>
							{t('calendarUnified.openNote')}
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => onAction('tab')}>
							{t('calendarUnified.newTab')}
						</DropdownMenuItem>
						{canSplit && (
							<DropdownMenuItem onSelect={() => onAction('split')}>
								{t('calendarUnified.split')}
							</DropdownMenuItem>
						)}
					</>
				) : (
					<DropdownMenuItem onSelect={() => onAction('create')}>
						{t('calendarUnified.createNote')}
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** Date context actions also used by the large month/week presentations. */
export function CalendarDateMenu({
	children,
	status,
	onAgenda,
	onNote,
	canSplit,
	onOpen,
}: {
	children: ReactNode;
	status: CalendarDayState['note'];
	canSplit?: boolean;
	onAgenda: () => void;
	onNote?: (action: CalendarNoteAction) => void;
	onOpen?: () => void;
}) {
	return (
		<ContextMenu onOpenChange={onOpen}>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={onAgenda}>{t('calendarUnified.view')}</ContextMenuItem>
				{status === 'existing' ? (
					<>
						<ContextMenuItem onSelect={() => onNote?.('open')}>
							{t('calendarUnified.openNote')}
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => onNote?.('tab')}>
							{t('calendarUnified.newTab')}
						</ContextMenuItem>
						{canSplit && (
							<ContextMenuItem onSelect={() => onNote?.('split')}>
								{t('calendarUnified.split')}
							</ContextMenuItem>
						)}
					</>
				) : (
					<ContextMenuItem disabled={status !== 'missing'} onSelect={() => onNote?.('create')}>
						{t(
							status === 'missing'
								? 'calendarUnified.createNote'
								: status === 'disabled'
									? 'calendarUnified.disabled'
									: 'calendarUnified.periodicUnavailable',
						)}
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function CalendarMonth(props: CalendarMonthProps) {
	const {
		anchor,
		selected,
		weekStart,
		weekNumbers = true,
		weeks = 6,
		day,
		onAnchor,
		onSelect,
		onToday,
		onNote,
		periods,
		canSplit,
		onLocate,
		onHover,
		onLeave,
	} = props;
	const [yearOpen, setYearOpen] = useState(false);
	const [year, setYear] = useState(anchor.getFullYear());
	const [focused, setFocused] = useState(selected);
	const grid = useRef<HTMLDivElement>(null);
	const title = useId();
	const rows = calendarRows(anchor, weekStart, weeks);
	const today = calendarIso(new Date());
	const shown = rows.flat().map(calendarIso);
	const focusDay = shown.includes(focused)
		? focused
		: shown.includes(selected)
			? selected
			: shown.includes(today)
				? today
				: (shown.find((iso) => calendarDate(iso).getMonth() === anchor.getMonth()) ?? shown[0]);
	const shift = (delta: number) =>
		onAnchor(weeks < 6 ? addDays(anchor, delta * weeks * 7) : addMonths(anchor, delta));
	const key = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
		const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[
			event.key
		];
		let next: Date | undefined;
		if (delta !== undefined) next = addDays(date, delta);
		else if (event.key === 'Home') next = startOfWeek(date, weekStart);
		else if (event.key === 'End') next = addDays(startOfWeek(date, weekStart), 6);
		else if (event.key === 'PageUp' || event.key === 'PageDown') {
			const direction = event.key === 'PageUp' ? -1 : 1;
			next = weeks < 6 ? addDays(date, direction * weeks * 7) : addMonths(date, direction);
		}
		if (!next) return;
		event.preventDefault();
		event.stopPropagation();
		onLeave?.();
		const iso = calendarIso(next);
		setFocused(iso);
		if (!shown.includes(iso)) onAnchor(next);
		const win = event.currentTarget.ownerDocument.defaultView;
		win?.requestAnimationFrame(() =>
			grid.current?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)?.focus(),
		);
	};
	const columnClass = weekNumbers ? 'grid-cols-[1.75rem_repeat(7,minmax(0,1fr))]' : 'grid-cols-7';
	return (
		<section
			className={cn('flex min-w-0 flex-col gap-1 text-foreground', props.className)}
			aria-labelledby={title}
			data-calendar-month={`${anchor.getFullYear()}-${anchor.getMonth() + 1}`}
		>
			{props.monthImage && (
				<img
					key={props.monthImage}
					alt=""
					src={props.monthImage}
					className="h-20 w-full shrink-0 rounded-lg object-cover"
					onError={(event) => {
						event.currentTarget.hidden = true;
					}}
				/>
			)}
			<header className="flex shrink-0 items-center gap-0.5">
				<Button
					variant="ghost"
					size="icon-sm"
					className={target}
					aria-label={t('calendarUnified.previous')}
					onClick={() => {
						onLeave?.();
						shift(-1);
					}}
				>
					<ChevronLeft className="size-4" />
				</Button>
				<Popover
					open={yearOpen}
					onOpenChange={(open) => {
						setYearOpen(open);
						if (open) {
							onLeave?.();
							setYear(anchor.getFullYear());
						}
					}}
				>
					<PopoverTrigger asChild>
						<Button
							id={title}
							variant="ghost"
							className="min-h-8 min-w-0 flex-1 truncate px-1 text-sm font-semibold [@media(pointer:coarse)]:min-h-11"
							aria-label={t('calendarUnified.chooseMonth')}
						>
							{anchor.toLocaleDateString(locale(), { year: 'numeric', month: 'long' })}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-64 p-2" align="center">
						<div className="mb-2 flex items-center justify-between">
							<Button
								variant="ghost"
								size="icon-sm"
								className={target}
								aria-label={t('calendarUnified.previous')}
								onClick={() => setYear((value) => value - 1)}
							>
								<ChevronLeft />
							</Button>
							<span className="font-semibold tabular-nums" aria-live="polite">
								{year}
							</span>
							<Button
								variant="ghost"
								size="icon-sm"
								className={target}
								aria-label={t('calendarUnified.next')}
								onClick={() => setYear((value) => value + 1)}
							>
								<ChevronRight />
							</Button>
						</div>
						<div className="grid grid-cols-3 gap-1" data-calendar-year-panel>
							{Array.from({ length: 12 }, (_, month) => (
								<Button
									key={month}
									variant={
										year === anchor.getFullYear() && month === anchor.getMonth()
											? 'secondary'
											: 'ghost'
									}
									className="min-h-8 [@media(pointer:coarse)]:min-h-11"
									onClick={() => {
										onAnchor(new Date(year, month, 1));
										setYearOpen(false);
									}}
								>
									{new Date(year, month, 1).toLocaleDateString(locale(), { month: 'short' })}
								</Button>
							))}
						</div>
					</PopoverContent>
				</Popover>
				<Button
					variant="ghost"
					size="sm"
					className={cn(target, 'px-1.5 text-xs')}
					onClick={() => {
						onLeave?.();
						onToday();
					}}
				>
					{t('calendarUnified.today')}
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					className={target}
					aria-label={t('calendarUnified.next')}
					onClick={() => {
						onLeave?.();
						shift(1);
					}}
				>
					<ChevronRight className="size-4" />
				</Button>
			</header>
			<div
				role="grid"
				ref={grid}
				aria-label={anchor.toLocaleDateString(locale(), { year: 'numeric', month: 'long' })}
				className="grid gap-0.5"
			>
				<div
					role="row"
					className={cn('grid gap-px text-center text-[11px] text-muted-foreground', columnClass)}
				>
					{weekNumbers && <span role="columnheader" aria-label={periodLabel('week')} />}
					{rows[0]!.map((date) => (
						<span role="columnheader" key={date.getDay()} className="py-1">
							{date.toLocaleDateString(locale(), { weekday: 'narrow' })}
						</span>
					))}
				</div>
				{rows.map((row) => {
					const week = weekOfYear(row[3]!, weekStart);
					return (
						<div role="row" key={calendarIso(row[0]!)} className={cn('grid gap-px', columnClass)}>
							{weekNumbers && (
								<span
									role="rowheader"
									className="flex items-center justify-center text-[10px] tabular-nums text-muted-foreground"
									title={t('calendarUnified.week', { week: week.week, year: week.year })}
								>
									{week.week}
								</span>
							)}
							{row.map((date) => {
								const iso = calendarIso(date),
									state = day(iso),
									current = iso === today,
									chosen = iso === selected,
									outside = date.getMonth() !== anchor.getMonth();
								const label = [
									date.toLocaleDateString(locale(), { dateStyle: 'full' }),
									current && t('calendarUnified.today'),
									state.active && t('calendarUnified.currentNote'),
									state.note === 'existing' && t('calendarUnified.hasNote'),
									state.tasks > 0 &&
										t(state.openTasks ? 'calendarUnified.openTasks' : 'calendarUnified.doneTasks', {
											count: state.openTasks || state.tasks,
										}),
								]
									.filter(Boolean)
									.join(' · ');
								return (
									<CalendarDateMenu
										key={iso}
										status={state.note}
										canSplit={canSplit}
										onOpen={onLeave}
										onAgenda={() => onSelect(iso)}
										onNote={(action) => onNote?.('day', iso, action)}
									>
										<button
											type="button"
											role="gridcell"
											tabIndex={iso === focusDay ? 0 : -1}
											aria-label={label}
											title={t(
												state.note === 'existing'
													? 'calendarUnified.dateShortcuts'
													: 'calendarUnified.view',
											)}
											aria-selected={chosen}
											aria-current={current ? 'date' : undefined}
											data-date={iso}
											data-day={iso}
											data-today={current || undefined}
											data-selected={chosen || undefined}
											data-has-note={state.note === 'existing' || undefined}
											data-active-note={state.active || undefined}
											className={cn(
												'relative flex min-h-8 min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border border-transparent bg-transparent px-0 py-0.5 text-xs tabular-nums outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11',
												outside && 'text-muted-foreground',
												(date.getDay() === 0 || date.getDay() === 6) && 'bg-muted/35',
												chosen && 'border-primary/60 bg-accent font-semibold',
												current && 'font-bold',
												state.active && 'border-dashed border-foreground/60',
											)}
											onFocus={() => setFocused(iso)}
											onClick={(event) => {
												onLeave?.();
												if (
													(event.ctrlKey || event.metaKey) &&
													state.note === 'existing' &&
													onNote
												)
													onNote('day', iso, 'tab');
												else onSelect(iso);
											}}
											onAuxClick={(event) => {
												if (event.button === 1) {
													event.preventDefault();
													onLeave?.();
													if (state.note === 'existing') onNote?.('day', iso, 'tab');
													else onSelect(iso);
												}
											}}
											onKeyDown={(event) => key(event, date)}
											onMouseEnter={(event) => onHover?.(iso, event.currentTarget)}
											onMouseLeave={onLeave}
											onBlur={onLeave}
										>
											{state.image && (
												<img
													key={state.image}
													src={state.image}
													alt=""
													className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
													onError={(event) => {
														event.currentTarget.hidden = true;
													}}
												/>
											)}
											<span
												className={cn(
													'relative flex size-5 items-center justify-center rounded-full',
													current && 'bg-primary text-primary-foreground',
												)}
											>
												{date.getDate()}
											</span>
											<span
												aria-hidden
												className="relative flex h-2 items-center justify-center gap-1"
											>
												{state.note === 'existing' && (
													<span className="h-1 w-2 rounded-sm bg-muted-foreground" />
												)}
												{state.tasks > 0 &&
													(state.openTasks ? (
														<span className="size-1.5 rounded-full bg-primary" />
													) : (
														<Check className="size-2.5 text-muted-foreground" />
													))}
											</span>
										</button>
									</CalendarDateMenu>
								);
							})}
						</div>
					);
				})}
			</div>
			{props.showPeriodActions !== false && (
				<div className="flex shrink-0 flex-wrap items-center justify-center gap-px border-t border-border/50 pt-0.5">
					{periods
						?.filter(
							(period) =>
								period.period === 'day' || period.period === 'week' || period.period === 'month',
						)
						.map((period) => (
							<CalendarNoteMenu
								key={period.period}
								{...period}
								onAction={(action) => onNote?.(period.period, selected, action)}
								canSplit={canSplit}
							/>
						))}
					{periods?.some((period) => period.period === 'quarter' || period.period === 'year') && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									className={target}
									aria-label={t('calendarUnified.periodNotes')}
								>
									<MoreHorizontal className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								{periods
									.filter((period) => period.period === 'quarter' || period.period === 'year')
									.map((period) => (
										<div key={period.period}>
											<DropdownMenuLabel>{periodLabel(period.period)}</DropdownMenuLabel>
											<DropdownMenuItem
												disabled={
													period.status === 'disabled' || period.status === 'unavailable'
												}
												onSelect={() =>
													onNote?.(
														period.period,
														selected,
														period.status === 'existing' ? 'open' : 'create',
													)
												}
											>
												{t(
													period.status === 'existing'
														? 'calendarUnified.openNote'
														: period.status === 'missing'
															? 'calendarUnified.createNote'
															: period.status === 'disabled'
																? 'calendarUnified.disabled'
																: 'calendarUnified.periodicUnavailable',
												)}
											</DropdownMenuItem>
											{period.status === 'existing' && (
												<>
													<DropdownMenuItem
														onSelect={() => onNote?.(period.period, selected, 'tab')}
													>
														{t('calendarUnified.newTab')}
													</DropdownMenuItem>
													{canSplit && (
														<DropdownMenuItem
															onSelect={() => onNote?.(period.period, selected, 'split')}
														>
															{t('calendarUnified.split')}
														</DropdownMenuItem>
													)}
												</>
											)}
											<DropdownMenuSeparator />
										</div>
									))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					{onLocate && (
						<Button
							variant="ghost"
							size="icon-sm"
							className={target}
							aria-label={t('calendarUnified.locate')}
							onClick={onLocate}
						>
							<LocateFixed className="size-3.5" />
						</Button>
					)}
				</div>
			)}
			{props.footer}
		</section>
	);
}
