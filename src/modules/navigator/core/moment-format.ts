// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.

import { minDaysInFirstWeek, type WeekStart } from '../../../shared/periodic-paths';

// The calendar arithmetic lives in the shared periodic-paths module so the dashboard and the navigator agree on weeks.
export { addDays, addMonths, dayOfYear, minDaysInFirstWeek, startOfDay, startOfWeek, weekOfYear } from '../../../shared/periodic-paths';
export type { WeekStart };

export interface FormatOptions {
	/** Moment locale (e.g. `en`, `zh-cn`) for names and week rules; the current Moment locale when omitted. */
	locale?: string;
	/** First day of the week for the locale-based week tokens (`w`, `ww`, `gggg`, `e`); the locale's own when omitted. ISO tokens (`W`, `GGGG`) ignore it. */
	weekStart?: WeekStart;
}

/** The part of a Moment object this module uses. */
export interface MomentLike {
	format(format?: string): string;
	toDate(): Date;
	isValid(): boolean;
	locale(name: string): MomentLike;
}

/** The part of the `moment` function this module uses; Obsidian's own `moment` satisfies it. */
export interface MomentApi {
	(input: Date): MomentLike;
	(input: string, format: string, locale: string, strict: boolean): MomentLike;
	locale(): string;
	locale(name: string): string;
	locales(): string[];
	localeData(): { firstDayOfWeek(): number };
	defineLocale(name: string, config: Record<string, unknown>): unknown;
}

let registered: MomentApi | undefined;

/**
 * Formatting and parsing are done by Obsidian's own Moment, so every Moment format the user knows works the same
 * as in the core Daily notes plugin. The platform registers it when the module starts (tests register the real package).
 */
export function registerMoment(api: MomentApi): void {
	registered = api;
}

export function getMoment(): MomentApi {
	if (!registered) throw new Error('Moment is not registered');
	return registered;
}

/** Moment locale to use: the given or current one, with its week rules replaced when a week start is given. */
function localeFor(options: FormatOptions): string {
	const api = getMoment();
	const base = options.locale ?? api.locale();
	if (options.weekStart === undefined) return base;
	const dow = options.weekStart;
	const name = `${base}-huhu-w${dow}`;
	if (!api.locales().includes(name)) {
		// defineLocale makes the new locale current for a moment; put Obsidian's own back at once.
		const current = api.locale();
		api.defineLocale(name, { parentLocale: base, week: { dow, doy: 7 + dow - minDaysInFirstWeek(dow) } });
		api.locale(current);
	}
	return name;
}

/** Format `date` with a Moment format string (`[text]` is copied as written). */
export function formatDate(date: Date, format: string, options: FormatOptions = {}): string {
	return getMoment()(date).locale(localeFor(options)).format(format);
}

/** True when the format uses a token that makes the week count follow ISO 8601 (`W`, `WW`, `GGGG`, `GG`). */
export const usesIsoWeek = (format: string): boolean => /W|GG/.test(format.replace(/\[[^\]]*\]/g, ''));

/**
 * Read a date back from text written with `format` (strict Moment parsing: the whole text must match). A week
 * format yields the first day of that week. The result must format back to exactly the same text, so look-alikes
 * ("2026-02-30") are never accepted.
 */
export function parseDate(text: string, format: string, options: FormatOptions = {}): Date | undefined {
	const locale = localeFor(options);
	const parsed = getMoment()(text, format, locale, true);
	if (!parsed.isValid()) return undefined;
	const date = parsed.toDate();
	return formatDate(date, format, options) === text ? date : undefined;
}
