import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../ui/components/popover';
import { Button } from '../../../../ui/components/button';
import { ToggleGroup, ToggleGroupItem } from '../../../../ui/components/toggle-group';
import { t } from '../../../../shared/i18n/index';
import type { CalendarTaskFilter } from '../../core/calendar/task-filter';
import { CALENDAR_TASK_FILTERS } from '../../platform/calendar/alltasks-scan';
import { Choice, IconButton } from '../board/controls';

/** The navigation row of the calendar section and of the full-screen calendar: period, month/week, today, filter. */
export function CalendarNav({
	view,
	label,
	filter,
	onShift,
	onView,
	onToday,
	onFilter,
	end,
	picker,
}: {
	view: 'month' | 'week';
	label: string;
	filter: CalendarTaskFilter;
	onShift(this: void, delta: number): void;
	onView(this: void, view: 'month' | 'week'): void;
	onToday(this: void): void;
	onFilter(this: void, filter: CalendarTaskFilter): void;
	/** Whatever closes the surface, kept at the end of the row. */
	end?: React.ReactNode;
	picker?: React.ReactNode;
}) {
	return (
		<div className="mb-3 flex shrink-0 flex-wrap items-center gap-2" data-calendar-nav>
			<div className="flex items-center gap-1">
				<IconButton
					label={t(view === 'week' ? 'calendar.previousWeek' : 'calendar.previousMonth')}
					onClick={() => onShift(-1)}
				>
					<ChevronLeft />
				</IconButton>
				{picker ? <Popover><PopoverTrigger asChild><Button variant="ghost" className="min-h-8 min-w-28 px-1 text-sm font-medium" aria-label={t('calendarUnified.chooseMonth')}>{label}</Button></PopoverTrigger><PopoverContent className="w-80 p-2">{picker}</PopoverContent></Popover> : <span className="min-w-28 text-center text-sm font-medium" aria-live="polite">{label}</span>}
				<IconButton label={t(view === 'week' ? 'calendar.nextWeek' : 'calendar.nextMonth')} onClick={() => onShift(1)}>
					<ChevronRight />
				</IconButton>
			</div>
			<ToggleGroup
				type="single"
				variant="outline"
				size="sm"
				value={view}
				onValueChange={(next) => next && onView(next as 'month' | 'week')}
				aria-label={t('calendar.viewMonth') + ' / ' + t('calendar.viewWeek')}
			>
				<ToggleGroupItem value="month" aria-label={t('calendar.viewMonth')}>
					<CalendarDays />
				</ToggleGroupItem>
				<ToggleGroupItem value="week" aria-label={t('calendar.viewWeek')}>
					<CalendarRange />
				</ToggleGroupItem>
			</ToggleGroup>
			<Button variant="outline" size="sm" onClick={onToday}>
				{t('calendar.today')}
			</Button>
			<Choice
				className="h-8 w-auto min-w-24 text-sm data-[size=sm]:h-8"
				label={t('calendar.filter')}
				value={filter}
				options={CALENDAR_TASK_FILTERS.map((value) => ({ value, label: t(`calendar.filter.${value}`) }))}
				onChange={(value) => onFilter(value as CalendarTaskFilter)}
			/>
			{end && <div className="ml-auto flex items-center gap-1">{end}</div>}
		</div>
	);
}
