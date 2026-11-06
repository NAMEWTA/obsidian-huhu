import { expect, test } from 'vitest';
import {
	validateDate,
	parseDate,
	toPickerDate,
	fromPickerDate,
	presetRange,
	validateTime,
	isTimeZone,
	parseMonth,
	validateMonth,
} from './date-value';

test('month precision remains a month across parsing and inclusive bounds', () => {
	for (const value of ['0000-01', '2026-02', '9999-12']) expect(parseMonth(value)).toBe(value);
	for (const value of ['2026-2', '2026-00', '2026-13', '2026-02-01', '26-02']) expect(parseMonth(value)).toBeNull();
	expect(validateMonth('', { required: true })).toBe('required');
	expect(validateMonth('')).toBeNull();
	expect(validateMonth('2026-02', { min: '2026-02', max: '2026-02' })).toBeNull();
	expect(validateMonth('2026-01', { min: '2026-02' })).toBe('before-min');
	expect(validateMonth('2026-03', { max: '2026-02' })).toBe('after-max');
	expect(validateMonth('2026-02', { min: '2026-03', max: '2026-02' })).toBe('invalid');
});

test('strict calendar parsing rejects rollover, accepts leap days and does not remap two-digit years', () => {
	expect(parseDate('2026-02-31')).toBeNull();
	expect(parseDate('2026-2-01')).toBeNull();
	expect(parseDate('1900-02-29')).toBeNull();
	expect(parseDate('2000-02-29')).toBe('2000-02-29');
	for (const value of ['0000-02-29', '0034-12-30', '0099-01-01', '2026-11-05'])
		expect(fromPickerDate(toPickerDate(value))).toBe(value);
});

test('empty, required and inclusive bounds have distinct validation results', () => {
	expect(validateDate('')).toBeNull();
	expect(validateDate('', { required: true })).toBe('required');
	expect(validateDate('2026-11-05', { min: '2026-11-05', max: '2026-11-05' })).toBeNull();
	expect(validateDate('2026-11-04', { min: '2026-11-05' })).toBe('before-min');
	expect(validateDate('2026-11-06', { max: '2026-11-05' })).toBe('after-max');
});

test('presets retain inclusive endpoint semantics across leap days and year boundaries', () => {
	expect(presetRange('next7', '2026-12-29')).toEqual({ from: '2026-12-29', to: '2027-01-04' });
	expect(presetRange('past30', '2024-03-01')).toEqual({ from: '2024-02-01', to: '2024-03-01' });
	expect(presetRange('month', '2024-02-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
});

test('wall time syntax and named IANA zones reject rollover and offset strings', () => {
	for (const value of ['00:00', '23:59']) expect(validateTime(value)).toBe(true);
	for (const value of ['24:00', '9:00', '12:60', '12:30:01']) expect(validateTime(value)).toBe(false);
	for (const zone of ['UTC', 'Asia/Shanghai', 'America/New_York']) expect(isTimeZone(zone)).toBe(true);
	for (const zone of ['', 'Invalid/Nowhere', '+08:00']) expect(isTimeZone(zone)).toBe(false);
});

test('fixed-zone calendar adapter and presets preserve dates across host time zones and DST boundaries', () => {
	const previous = process.env.TZ;
	try {
		for (const zone of ['Pacific/Kiritimati', 'America/Adak', 'Asia/Shanghai', 'America/New_York']) {
			process.env.TZ = zone;
			expect(fromPickerDate(toPickerDate('2026-03-08'))).toBe('2026-03-08');
			expect(presetRange('next7', '2026-03-08')).toEqual({ from: '2026-03-08', to: '2026-03-14' });
		}
	} finally {
		if (previous === undefined) delete process.env.TZ;
		else process.env.TZ = previous;
	}
});
