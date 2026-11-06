import { createContext, useContext, useMemo, type ReactNode, type ReactElement, type MouseEvent } from 'react';
import { DateLib } from '@daypicker/react';
import { toPickerDate } from '../date/date-value';
import {
	CalendarBackend,
	Day,
	DayButton,
	Week,
	WeekNumber,
	type DayProps,
	type WeekNumberProps,
	type DayButtonProps,
	type WeekProps,
} from './CalendarBackend';
import { weekOfYear, type WeekStart } from '../../../../shared/periodic-paths';

const WeekContent = createContext<((dates: readonly string[]) => ReactNode) | undefined>(undefined);
const WeekCaption = createContext(false);
function ContentWeek(props: WeekProps) {
	const render = useContext(WeekContent),
		caption = useContext(WeekCaption),
		weekStart = useContext(WeekStartContext);
	const value = weekOfYear(props.week.days[3]!.date, weekStart);
	return (
		<>
			{caption && (
				<tr>
					<th
						colSpan={7}
						scope="rowgroup"
						className="h-6 text-left text-xs font-normal text-[var(--hu-fg-3)]"
						data-week-caption
					>
						{value.year} · {value.week}
					</th>
				</tr>
			)}
			<Week {...props} />
			{render && (
				<tr>
					<td colSpan={props.week.days.length}>
						{render(props.week.days.map((day) => productIso(day.date)))}
					</td>
				</tr>
			)}
		</>
	);
}
const Activation = createContext<((date: string, event: MouseEvent) => void) | undefined>(undefined);
const Decoration = createContext<((date: string, button: ReactElement) => ReactNode) | undefined>(undefined);
const DayLabel = createContext<((date: string) => string) | undefined>(undefined);
const Content = createContext<(date: string) => ReactNode>(() => null);
export const productIso = (date: Date) =>
	`${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function ContentDay(props: DayProps) {
	const render = useContext(Content);
	return (
		<Day {...props}>
			<div
				data-slot="calendar-date-hit"
				className="pointer-events-none w-fit [&:has(button:focus-visible)]:outline-2 [&:has(button:focus-visible)]:outline-offset-2 [&:has(button:focus-visible)]:outline-[var(--hu-accent)]"
			>
				{props.children}
			</div>
			{!props.modifiers.hidden && (
				<div data-slot="calendar-day-content" className="pointer-events-auto min-w-0">
					{render(productIso(props.day.date))}
				</div>
			)}
		</Day>
	);
}
function DecoratedDayButton(props: DayButtonProps) {
	const decorate = useContext(Decoration),
		label = useContext(DayLabel),
		activate = useContext(Activation);
	const button = (
		<DayButton
			{...props}
			data-date={productIso(props.day.date)}
			aria-pressed={props.modifiers.selected === true}
			aria-current={props.modifiers.today ? 'date' : undefined}
			onAuxClick={(event) => {
				if (event.button === 1) activate?.(productIso(props.day.date), event);
			}}
			aria-label={label?.(productIso(props.day.date)) ?? props['aria-label']}
		/>
	);
	return <>{decorate ? decorate(productIso(props.day.date), button) : button}</>;
}
const WeekStartContext = createContext<WeekStart>(1);
function DomainWeekNumber(props: WeekNumberProps) {
	const weekStart = useContext(WeekStartContext),
		value = weekOfYear(props.week.days[3]!.date, weekStart);
	return <WeekNumber {...props}>{value.week}</WeekNumber>;
}
/** A view adapter over public DateLib methods. DayPicker retains date generation, selection and roving focus.
 * https://daypicker.dev/api/interfaces/PropsBase#datelib
 * Month navigation in a strip advances one full window; no dates/focus targets are clipped from the library model.
 */
export function productWindowLibrary(weeks: number, weekStartsOn: WeekStart, anchor: Date) {
	const lib = new DateLib({ timeZone: 'UTC', weekStartsOn });
	if (weeks >= 6) return undefined;
	const start = lib.startOfWeek(toPickerDate(productIso(anchor)));
	const end = lib.endOfWeek(lib.addDays(start, (weeks - 1) * 7));
	const contains = (date: Date) => date >= start && date <= end;
	return {
		isSameMonth: (left: Date, right: Date) =>
			(contains(left) && contains(right)) || lib.isSameDay(lib.startOfWeek(left), lib.startOfWeek(right)),
		startOfMonth: (date: Date) => lib.startOfWeek(date),
		endOfMonth: (date: Date) => lib.endOfWeek(lib.addDays(lib.startOfWeek(date), (weeks - 1) * 7)),
		addMonths: (date: Date, amount: number) => lib.addDays(date, amount * weeks * 7),
	};
}
export interface ProductCalendarProps {
	month: Date;
	onMonthChange(this: void, month: Date): void;
	selected?: string;
	onSelectDate(this: void, date: string): void;
	renderDayContent?(this: void, date: string): ReactNode;
	weekStart?: WeekStart;
	weeks?: number;
	weekNumbers?: boolean;
	compact?: boolean;
	className?: string;
	weekNumberLayout?: 'column' | 'caption';
	renderWeekContent?(this: void, dates: readonly string[]): ReactNode;
	decorateDayButton?(this: void, date: string, button: ReactElement): ReactNode;
	dayLabel?(this: void, date: string): string;
	onDayClick?(this: void, date: string, event: MouseEvent): void;
	onDayHover?(this: void, date: string, anchor: HTMLElement): void;
	onDayLeave?(this: void): void;
}
export function ProductCalendar({
	month,
	onMonthChange,
	selected,
	onSelectDate,
	renderDayContent = () => null,
	weekStart = 1,
	weeks = 6,
	weekNumbers = false,
	compact = false,
	className,
	weekNumberLayout = 'column',
	renderWeekContent,
	decorateDayButton,
	dayLabel,
	onDayClick,
	onDayHover,
	onDayLeave,
}: ProductCalendarProps) {
	const dateLib = useMemo(() => productWindowLibrary(weeks, weekStart, month), [weeks, weekStart, month]);
	const date = toPickerDate;
	return (
		<Activation value={onDayClick}>
			<WeekCaption value={weekNumbers && weekNumberLayout === 'caption'}>
				<WeekContent value={renderWeekContent}>
					<Decoration value={decorateDayButton}>
						<DayLabel value={dayLabel}>
							<Content value={renderDayContent}>
								<WeekStartContext value={weekStart}>
									<CalendarBackend
										mode="single"
										required
										month={toPickerDate(productIso(month))}
										onMonthChange={onMonthChange}
										selected={selected ? date(selected) : undefined}
										onSelect={(value, _day, _modifiers, event) => {
											if (value && !event.metaKey && !event.ctrlKey)
												onSelectDate(productIso(value));
										}}
										onDayClick={(date, _modifiers, event) => onDayClick?.(productIso(date), event)}
										onDayMouseEnter={(date, _modifiers, event) =>
											onDayHover?.(productIso(date), event.currentTarget as HTMLElement)
										}
										onDayMouseLeave={onDayLeave}
										weekStartsOn={weekStart}
										showOutsideDays
										showWeekNumber={weekNumbers && weekNumberLayout === 'column'}
										hideNavigation={compact}
										dateLib={dateLib}
										components={{
											Day: ContentDay,
											DayButton: DecoratedDayButton,
											Week: ContentWeek,
											WeekNumber: DomainWeekNumber,
										}}
										className={className}
										classNames={{
											root: 'min-w-0 max-w-full text-[var(--hu-fg)]',
											months: 'flex min-w-0 flex-col',
											month: 'min-w-0',
											month_caption: compact
												? 'sr-only'
												: 'flex h-11 items-center justify-center text-sm font-semibold',
											nav: 'flex justify-between gap-2',
											button_previous:
												'size-11 rounded-md hover:bg-[var(--hu-hover)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)]',
											button_next:
												'size-11 rounded-md hover:bg-[var(--hu-hover)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)]',
											chevron: 'mx-auto size-4 fill-current',
											month_grid:
												weekNumbers && weekNumberLayout === 'column'
													? 'w-full min-w-[calc(7*var(--hu-hit)+24px)] table-fixed border-collapse'
													: 'w-full min-w-[calc(7*var(--hu-hit))] table-fixed border-collapse',
											weekday: 'h-8 p-0 text-center text-xs text-[var(--hu-fg-3)]',
											week: '',
											week_number: 'w-6 p-0 text-center text-xs text-[var(--hu-fg-3)]',
											week_number_header: 'w-6',
											day: 'pointer-events-none relative min-w-0 p-0 align-top shadow-[inset_0_0_0_1px_var(--hu-line)] [&:has(button:focus-visible)]:z-[1]',
											day_button:
												'pointer-events-auto [clip-path:inset(0)] relative m-0 flex h-[var(--hu-hit)] min-w-[var(--hu-hit)] max-w-full items-center justify-center rounded-md p-0 text-sm hover:bg-[var(--hu-hover)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)]',
											selected:
												'[&_[data-date]]:bg-[var(--hu-accent-soft)] [&_[data-date]]:text-[var(--hu-accent-text)]',
											today: '[&_[data-date]]:font-semibold',
											outside: 'text-[var(--hu-fg-3)]',
										}}
									/>
								</WeekStartContext>
							</Content>
						</DayLabel>
					</Decoration>
				</WeekContent>
			</WeekCaption>
		</Activation>
	);
}
