import { useState } from 'react';
import type { DateRange } from '@daypicker/react';
import { enUS } from '@daypicker/react/locale/en-US';
import { zhCN } from '@daypicker/react/locale/zh-CN';
import { useLanguage } from '../../../react/hooks';
import { CalendarBackend } from '../calendar/CalendarBackend';
import {
	fromPickerDate,
	parseDate,
	toPickerDate,
	todayDate,
	type CalendarDate,
	type DateBounds,
	type DateRangeValue,
	type WeekStartsOn,
} from './date-value';

type CalendarBase = DateBounds & {
	weekStartsOn?: WeekStartsOn;
	today?: CalendarDate;
	disabled?: boolean;
	readOnly?: boolean;
};
export type CalendarProps = CalendarBase &
	(
		| { mode?: 'single'; value: CalendarDate | null; onChange: (value: CalendarDate | null) => void }
		| { mode: 'range'; value: DateRangeValue; onChange: (value: DateRangeValue) => void }
	);
/** Picker skin on the shared DayPicker backend. Persistence uses components, never UTC serialization.
 * API/locale: https://daypicker.dev/upgrading and https://daypicker.dev/localization/changing-locale
 */
export function Calendar(props: CalendarProps) {
	const language = useLanguage();
	const reference = props.today ?? todayDate();
	const selectedStart = props.mode === 'range' ? props.value.from : props.value;
	const [month, setMonth] = useState(() =>
		toPickerDate(selectedStart && parseDate(selectedStart) ? selectedStart : reference),
	);
	const [previousStart, setPreviousStart] = useState(selectedStart);
	if (previousStart !== selectedStart) {
		setPreviousStart(selectedStart);
		if (selectedStart && parseDate(selectedStart)) setMonth(toPickerDate(selectedStart));
	}
	const disabled = [
		...(props.disabled || props.readOnly ? [true] : []),
		...(props.min && parseDate(props.min) ? [{ before: toPickerDate(props.min) }] : []),
		...(props.max && parseDate(props.max) ? [{ after: toPickerDate(props.max) }] : []),
	];
	const common = {
		timeZone: 'UTC',
		required: props.required,
		locale: language === 'zh' ? zhCN : enUS,
		lang: language === 'zh' ? 'zh-CN' : 'en-US',
		weekStartsOn: props.weekStartsOn,
		today: toPickerDate(reference),
		month,
		onMonthChange: setMonth,
		disabled,
		showOutsideDays: true,
		className:
			'box-border w-[280px] rounded-[var(--hu-radius-md)] max-w-full border border-[var(--hu-line)] bg-[var(--hu-raised)] p-px [@media(pointer:coarse)]:w-[312px]',
		classNames: {
			months: 'relative flex flex-col',
			month: 'w-full',
			month_caption: 'flex h-11 items-center justify-center text-sm font-semibold',
			nav: 'absolute inset-x-0 top-0 flex h-11 justify-between',
			button_previous:
				'relative size-11 shrink-0 rounded-md text-[var(--hu-fg-2)] hover:bg-[var(--hu-hover)] focus-visible:outline-2 focus-visible:outline-[var(--hu-accent)] disabled:opacity-40',
			button_next:
				'relative size-11 shrink-0 rounded-md text-[var(--hu-fg-2)] hover:bg-[var(--hu-hover)] focus-visible:outline-2 focus-visible:outline-[var(--hu-accent)] disabled:opacity-40',
			chevron: 'mx-auto size-4 fill-current',
			caption_label: 'pointer-events-none',
			month_grid: 'mx-auto table-fixed border-collapse',
			weekdays: '',
			weekday:
				'h-8 w-[34px] p-0 text-center text-xs font-normal text-[var(--hu-fg-3)] [@media(pointer:coarse)]:w-11',
			week: '',
			day: 'relative pointer-events-none [&:has(>button:focus-visible)]:z-[1] [&:last-child>button]:[clip-path:inset(0_-2px_0_0)] [&:last-child>button]:before:absolute [&:last-child>button]:before:inset-y-0 [&:last-child>button]:before:-right-[2px] [&:last-child>button]:before:w-[2px] [&:last-child>button]:before:content-[""] size-[34px] p-0 text-center [@media(pointer:coarse)]:size-11 [&:has(>button:focus-visible)]:outline-2 [&:has(>button:focus-visible)]:outline-offset-2 [&:has(>button:focus-visible)]:outline-[var(--hu-accent)]',
			day_button:
				'pointer-events-auto relative m-0 flex size-[34px] scroll-m-1 [clip-path:inset(0)] min-h-0 min-w-0 items-center justify-center rounded-md p-0 text-sm outline-none hover:bg-[var(--hu-hover)] [@media(pointer:coarse)]:size-11',
			selected:
				'[&:not(.hu-date-range-middle)>button]:bg-[var(--hu-accent)] [&:not(.hu-date-range-middle)>button]:text-[var(--hu-accent-fg)]',
			today: '[&:not([data-selected])>button]:text-[var(--hu-accent-text)] [&>button]:font-semibold [&:not([data-selected])>button]:after:absolute [&:not([data-selected])>button]:after:bottom-[5px] [&:not([data-selected])>button]:after:size-1 [&:not([data-selected])>button]:after:rounded-full [&:not([data-selected])>button]:after:bg-[var(--hu-accent)] [&:not([data-selected])>button]:after:content-[""]',
			outside: 'text-[var(--hu-fg-3)]',
			disabled: 'opacity-40 [&>button]:cursor-not-allowed',
			hidden: 'invisible',
			range_middle:
				'hu-date-range-middle [&>button]:bg-[var(--hu-accent-soft)] [&>button]:text-[var(--hu-fg)] [&>button]:rounded-none',
			range_start: '',
			range_end: '',
		},
	};
	return (
		<div data-slot="calendar">
			{props.mode === 'range' ? (
				<CalendarBackend
					{...common}
					mode="range"
					selected={pickerRange(props.value)}
					onSelect={(range) => {
						if (!props.disabled && !props.readOnly)
							props.onChange({
								from: range?.from ? fromPickerDate(range.from) : null,
								to: range?.to ? fromPickerDate(range.to) : null,
							});
					}}
				/>
			) : (
				<CalendarBackend
					{...common}
					mode="single"
					selected={props.value && parseDate(props.value) ? toPickerDate(props.value) : undefined}
					onSelect={(date) => {
						if (!props.disabled && !props.readOnly) props.onChange(date ? fromPickerDate(date) : null);
					}}
				/>
			)}
		</div>
	);
}
function pickerRange(value: DateRangeValue): DateRange | undefined {
	return value.from && parseDate(value.from)
		? { from: toPickerDate(value.from), to: value.to && parseDate(value.to) ? toPickerDate(value.to) : undefined }
		: undefined;
}
