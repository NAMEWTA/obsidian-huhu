export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year' | '30' | 'all' | 'custom';
export interface AnalyticsRange {
	start: string;
	end: string;
	previousStart: string;
	previousEnd: string;
}
export const localDay = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const day = (value: string) => new Date(value + 'T12:00:00');
export function analyticsRange(
	period: AnalyticsPeriod,
	anchor: string,
	earliest: string,
	custom?: { start: string; end: string },
): AnalyticsRange {
	const date = day(anchor),
		y = date.getFullYear(),
		m = date.getMonth();
	let start = date,
		end = day(anchor),
		previousStart: Date | undefined,
		previousEnd: Date | undefined;
	if (period === 'all') start = day(earliest);
	if (period === 'custom' && custom) {
		start = day(custom.start);
		end = day(custom.end < custom.start ? custom.start : custom.end);
	}
	if (period === '30') start = new Date(y, m, date.getDate() - 29, 12);
	if (period === 'week') {
		start = new Date(y, m, date.getDate() - ((date.getDay() + 6) % 7), 12);
		end = new Date(start);
		end.setDate(end.getDate() + 6);
	}
	if (period === 'month') {
		start = new Date(y, m, 1, 12);
		end = new Date(y, m + 1, 0, 12);
		previousStart = new Date(y, m - 1, 1, 12);
		previousEnd = new Date(y, m, 0, 12);
	}
	if (period === 'year') {
		start = new Date(y, 0, 1, 12);
		end = new Date(y, 11, 31, 12);
		previousStart = new Date(y - 1, 0, 1, 12);
		previousEnd = new Date(y - 1, 11, 31, 12);
	}
	const days =
		Math.round(
			(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
				Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
				86400000,
		) + 1;
	previousEnd ??= new Date(start);
	if (!previousStart) {
		previousEnd.setDate(previousEnd.getDate() - 1);
		previousStart = new Date(previousEnd);
		previousStart.setDate(previousStart.getDate() - days + 1);
	}
	return {
		start: localDay(start),
		end: localDay(end),
		previousStart: localDay(previousStart),
		previousEnd: localDay(previousEnd),
	};
}
export function shiftAnalytics(period: AnalyticsPeriod, anchor: string, delta: number): string {
	const date = day(anchor);
	if (period === 'month') {
		date.setDate(1);
		date.setMonth(date.getMonth() + delta);
	} else if (period === 'year') {
		date.setMonth(0, 1);
		date.setFullYear(date.getFullYear() + delta);
	} else date.setDate(date.getDate() + delta * (period === 'week' ? 7 : period === '30' ? 30 : 1));
	return localDay(date);
}
export function analyticsDays(range: Pick<AnalyticsRange, 'start' | 'end'>): string[] {
	const dates: string[] = [],
		cursor = day(range.start);
	while (localDay(cursor) <= range.end) {
		dates.push(localDay(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}
	return dates;
}
