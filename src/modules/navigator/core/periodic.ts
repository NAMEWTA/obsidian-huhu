// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { addDays, addMonths, startOfWeek, type WeekStart } from './moment-format';
import { identifyPeriodicNote, PERIODS, startOfPeriod, type Period, type PeriodicRef } from '../../../shared/periodic-paths';

export { PERIODS, startOfPeriod };
export type { Period, PeriodicRef };

/** Whether the notes of one period are in use and which template fills them; where they live is fixed (`shared/periodic-paths`). */
export interface PeriodRule {
	enabled: boolean;
	/** Template note path; empty means none (the folder template of the target folder applies). */
	template: string;
}

export type PeriodRules = Record<Period, PeriodRule>;

/** Daily, weekly and monthly notes are on by default; quarterly and yearly notes are opt-in. */
export function defaultPeriodRules(): PeriodRules {
	const rule = (enabled: boolean): PeriodRule => ({ enabled, template: '' });
	return { day: rule(true), week: rule(true), month: rule(true), quarter: rule(false), year: rule(false) };
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Fill gaps in saved rules with defaults and drop unusable values. */
export function normalizePeriodRules(value: unknown): PeriodRules {
	const rules = defaultPeriodRules();
	if (!isRecord(value)) return rules;
	for (const period of PERIODS) {
		const saved = value[period];
		if (!isRecord(saved)) continue;
		rules[period] = {
			enabled: typeof saved['enabled'] === 'boolean' ? saved['enabled'] : rules[period].enabled,
			template: typeof saved['template'] === 'string' ? saved['template'].trim().slice(0, 300) : '',
		};
	}
	return rules;
}

/** The same position `count` periods later (or earlier when negative); callers pass a period start. */
export function addPeriods(period: Period, date: Date, count: number): Date {
	switch (period) {
		case 'day': return addDays(date, count);
		case 'week': return addDays(date, count * 7);
		case 'month': return addMonths(date, count);
		case 'quarter': return addMonths(date, count * 3);
		default: return addMonths(date, count * 12);
	}
}

/** Which enabled period a note path belongs to, and which one: the path must equal the exact path the fixed layout generates. */
export function identifyPeriodNote(root: string, path: string, rules: PeriodRules, weekStart: WeekStart): PeriodicRef | undefined {
	const ref = identifyPeriodicNote(root, path, weekStart);
	return ref && rules[ref.period].enabled ? ref : undefined;
}

const PARENT: Record<Period, Period | undefined> = { day: 'week', week: 'month', month: 'quarter', quarter: 'year', year: undefined };

/** The period above `period` that is enabled: the weekly note of a day, the monthly of a week, ... skipping disabled ones. */
export function parentPeriod(period: Period, rules: PeriodRules): Period | undefined {
	for (let next = PARENT[period]; next; next = PARENT[next]) if (rules[next].enabled) return next;
	return undefined;
}

/** The note one period after (`delta` 1) or before (`delta` -1) a period note, as a period start. */
export function stepPeriod(ref: PeriodicRef, delta: number): PeriodicRef {
	return { period: ref.period, start: addPeriods(ref.period, ref.start, delta) };
}

/** The parent period note of `ref`; a week that spans two months belongs to the month of its first day. */
export function parentOf(ref: PeriodicRef, rules: PeriodRules, weekStart: WeekStart): PeriodicRef | undefined {
	const period = parentPeriod(ref.period, rules);
	return period ? { period, start: startOfPeriod(period, ref.start, weekStart) } : undefined;
}

/** The weeks (starting on `weekStart`) that cover the month containing `month`: four to six rows of seven days. */
export function monthGrid(month: Date, weekStart: WeekStart): Date[][] {
	const first = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1), weekStart);
	const weeks = Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => addDays(first, week * 7 + day)));
	return weeks.filter((week) => week.some((date) => date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()));
}
