import { getLanguage } from '../../../shared/i18n';

/** Localised long form of a `YYYY-MM-DD` day (weekday included) so the whole date can be read and wrapped. */
export function longDate(day: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
	if (!match) return day;
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return new Intl.DateTimeFormat(getLanguage() === 'zh' ? 'zh-CN' : 'en', { dateStyle: 'full', timeZone: 'UTC' }).format(date);
}
