import { DateLib, TZDate } from '@daypicker/react';

export type CalendarDate = string;
export type CalendarMonth = string;
export type DateRangeValue = { from: CalendarDate | null; to: CalendarDate | null };
export type DateTimeValue = { date: CalendarDate; time: string; timeZone: string };
export type DateError = 'required' | 'invalid' | 'before-min' | 'after-max';
export type DateBounds = { min?: CalendarDate; max?: CalendarDate; required?: boolean };
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type RangePreset = 'today' | 'next7' | 'month' | 'past30';

export function parseMonth(text: string): CalendarMonth | null {
	return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(text) ? text : null;
}
export function validateMonth(text: string, { min, max, required }: DateBounds = {}): DateError | null {
	if (!text) return required ? 'required' : null;
	if (!parseMonth(text) || (min && !parseMonth(min)) || (max && !parseMonth(max)) || (min && max && min > max))
		return 'invalid';
	if (min && text < min) return 'before-min';
	if (max && text > max) return 'after-max';
	return null;
}

export function parseDate(text: string): CalendarDate | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!match) return null;
	const year = Number(match[1]),
		month = Number(match[2]),
		day = Number(match[3]);
	const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]! ? text : null;
}
export function validateDate(text: string, { min, max, required }: DateBounds = {}): DateError | null {
	if (!text) return required ? 'required' : null;
	if (!parseDate(text) || (min && !parseDate(min)) || (max && !parseDate(max)) || (min && max && min > max))
		return 'invalid';
	if (min && text < min) return 'before-min';
	if (max && text > max) return 'after-max';
	return null;
}
/** DayPicker displays calendar components in a fixed zone; never serialize this adapter as an epoch. */
export function toPickerDate(value: CalendarDate): Date {
	if (!parseDate(value)) throw new RangeError('Invalid calendar date');
	const [year, month, day] = value.split('-').map(Number) as [number, number, number];
	const date = new TZDate(0, 'UTC');
	date.setFullYear(year, month - 1, day);
	date.setHours(12, 0, 0, 0);
	return date;
}
export function fromPickerDate(date: Date): CalendarDate {
	const value = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	if (!parseDate(value)) throw new RangeError('Invalid calendar date');
	return value;
}
const calendarMath = new DateLib({ timeZone: 'UTC' });
export function presetRange(preset: RangePreset, today: CalendarDate): DateRangeValue {
	const date = toPickerDate(today);
	switch (preset) {
		case 'today':
			return { from: today, to: today };
		case 'next7':
			return { from: today, to: fromPickerDate(calendarMath.addDays(date, 6)) };
		case 'past30':
			return { from: fromPickerDate(calendarMath.addDays(date, -29)), to: today };
		case 'month':
			return {
				from: fromPickerDate(calendarMath.startOfMonth(date)),
				to: fromPickerDate(calendarMath.endOfMonth(date)),
			};
	}
}
export function validateTime(time: string): boolean {
	return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}
export function isTimeZone(zone: string): boolean {
	if (!/^[A-Za-z][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)*$/.test(zone)) return false;
	try {
		new Intl.DateTimeFormat('en', { timeZone: zone }).format(0);
		return true;
	} catch {
		return false;
	}
}

export function todayDate(): CalendarDate {
	return fromPickerDate(new Date());
}
