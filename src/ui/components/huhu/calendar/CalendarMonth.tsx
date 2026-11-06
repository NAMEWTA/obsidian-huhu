// Independently implemented against Notebook Navigator's calendar behaviour; no upstream code copied.
import { useId, useState, useRef, useLayoutEffect, type ReactNode } from 'react';
import { useOwnerWindow } from '../../../react/hooks';
import { DateLib } from '@daypicker/react';
import { toPickerDate } from '../date/date-value';
import { ProductCalendar } from './ProductCalendar';
import { BookOpen, Check, ChevronLeft, ChevronRight, LocateFixed, MoreHorizontal } from 'lucide-react';
import { addDays, addMonths, type Period, type WeekStart } from '../../../../shared/periodic-paths';
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
	const lib = new DateLib({ timeZone: 'UTC', weekStartsOn: weekStart });
	const value = toPickerDate(calendarIso(anchor));
	const start = lib.startOfWeek(weeks < 6 ? value : lib.startOfMonth(value));
	const end = weeks < 6 ? lib.addDays(start, Math.max(1, weeks) * 7 - 1) : lib.endOfWeek(lib.endOfMonth(value));
	return Array.from({ length: Math.ceil((lib.differenceInCalendarDays(end, start) + 1) / 7) }, (_, row) =>
		Array.from({ length: 7 }, (_, column) => lib.addDays(start, row * 7 + column)),
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
			<ContextMenuTrigger asChild>
				<div className="min-w-0">{children}</div>
			</ContextMenuTrigger>
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
	const title = useId();
	const shift = (delta: number) =>
		onAnchor(weeks < 6 ? addDays(anchor, delta * weeks * 7) : addMonths(anchor, delta));
	const ownerWindow = useOwnerWindow(),
		container = useRef<HTMLElement>(null);
	const [available, setAvailable] = useState(0),
		[hit, setHit] = useState(32),
		[fullOpen, setFullOpen] = useState(false);
	useLayoutEffect(() => {
		const node = container.current;
		if (!node) return;
		const measure = () => {
			setAvailable(node.getBoundingClientRect().width);
			setHit(
				Number.parseFloat(ownerWindow.getComputedStyle(node).getPropertyValue('--hu-hit')) ||
					(ownerWindow.matchMedia('(pointer:coarse)').matches ? 44 : 32),
			);
		};
		measure();
		const Observer = (ownerWindow as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
		const observer = Observer ? new Observer(measure) : null;
		observer?.observe(node);
		const media = ownerWindow.matchMedia('(pointer:coarse)');
		media.addEventListener('change', measure);
		return () => {
			observer?.disconnect();
			media.removeEventListener('change', measure);
		};
	}, [ownerWindow]);
	const needsPopup = available > 0 && available < 7 * hit + (weekNumbers ? 24 : 0);
	const calendar = (
		<ProductCalendar
			month={anchor}
			onMonthChange={onAnchor}
			selected={selected}
			onSelectDate={onSelect}
			weekStart={weekStart}
			weeks={weeks}
			weekNumbers={weekNumbers}
			weekNumberLayout={needsPopup ? 'caption' : 'column'}
			compact={!needsPopup}
			onDayHover={onHover}
			onDayLeave={onLeave}
			onDayClick={(iso, event) => {
				onLeave?.();
				if (event.metaKey || event.ctrlKey || event.button === 1) {
					if (day(iso).note === 'existing') onNote?.('day', iso, 'tab');
					else onSelect(iso);
				}
			}}
			dayLabel={(iso) => {
				const state = day(iso);
				return [
					iso,
					t('calendarUnified.view'),
					state.active && t('calendarUnified.currentNote'),
					state.note === 'existing' && t('calendarUnified.hasNote'),
					state.tasks > 0 &&
						t(state.openTasks ? 'calendarUnified.openTasks' : 'calendarUnified.doneTasks', {
							count: state.openTasks || state.tasks,
						}),
				]
					.filter(Boolean)
					.join(' · ');
			}}
			decorateDayButton={(iso, button) => (
				<CalendarDateMenu
					onAgenda={() => onSelect(iso)}
					onOpen={onLeave}
					status={day(iso).note}
					canSplit={canSplit}
					onNote={(action) => onNote?.('day', iso, action)}
				>
					{button}
				</CalendarDateMenu>
			)}
			renderDayContent={(iso) => {
				const state = day(iso);
				return (
					<span aria-hidden className="pointer-events-none flex h-2 items-center justify-center gap-1">
						{state.note === 'existing' && <span className="h-1 w-2 rounded-sm bg-[var(--hu-fg-3)]" />}
						{state.tasks > 0 &&
							(state.openTasks ? (
								<span className="size-1.5 rounded-full bg-[var(--hu-accent)]" />
							) : (
								<Check className="size-2.5" />
							))}
					</span>
				);
			}}
		/>
	);
	return (
		<section
			ref={container}
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
										onAnchor(
											calendarDate(
												`${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`,
											),
										);
										setYearOpen(false);
									}}
								>
									{calendarDate(
										`${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`,
									).toLocaleDateString(locale(), { month: 'short' })}
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
			{needsPopup ? (
				<Popover open={fullOpen} onOpenChange={setFullOpen}>
					<PopoverTrigger asChild>
						<Button variant="secondary" aria-label={t('calendarUnified.view')}>
							{t('calendarUnified.view')}
						</Button>
					</PopoverTrigger>
					<PopoverContent
						side="bottom"
						align="center"
						collisionPadding={4}
						className="w-[312px] max-w-[calc(100vw-8px)] p-px"
					>
						{calendar}
					</PopoverContent>
				</Popover>
			) : (
				calendar
			)}
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
