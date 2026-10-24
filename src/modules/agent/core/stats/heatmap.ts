const DAY = 86_400_000;
/** The heatmap covers 26 whole weeks. */
export const HEATMAP_DAYS = 182;
export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;
export interface HeatmapDay {
	/** `YYYY-MM-DD` in UTC, the same day key the daily chart uses. */
	date: string;
	count: number;
	level: HeatmapLevel;
}
interface DayUsage {
	modifiedAtMs: number;
	usage: { input: number; output: number };
}
/** Value at fraction `p` of an ascending list. */
const quantile = (sorted: readonly number[], p: number): number =>
	sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
/**
 * One entry per day for the last `HEATMAP_DAYS` days, ending with the day of `now`. Days are bucketed in
 * one pass over the sessions. Levels 1 to 4 are the quartiles of the days that had any usage, so a single
 * huge day cannot flatten the rest of the grid into one colour.
 */
export function heatmapDays(
	sessions: readonly DayUsage[],
	now: number,
	days = HEATMAP_DAYS,
): { days: HeatmapDay[]; total: number } {
	const end = Math.floor(now / DAY) * DAY,
		start = end - (days - 1) * DAY;
	const perDay = new Map<string, number>();
	let total = 0;
	for (const row of sessions) {
		if (row.modifiedAtMs < start || row.modifiedAtMs >= end + DAY) continue;
		const key = new Date(row.modifiedAtMs).toISOString().slice(0, 10),
			count = row.usage.input + row.usage.output;
		perDay.set(key, (perDay.get(key) ?? 0) + count);
		total += count;
	}
	const used = [...perDay.values()].filter((count) => count > 0).sort((a, b) => a - b);
	const [q1, q2, q3] = [0.25, 0.5, 0.75].map((p) => quantile(used, p)) as [number, number, number];
	const level = (count: number): HeatmapLevel =>
		count <= 0 ? 0 : count <= q1 ? 1 : count <= q2 ? 2 : count <= q3 ? 3 : 4;
	return {
		total,
		days: Array.from({ length: days }, (_, index) => {
			const date = new Date(start + index * DAY).toISOString().slice(0, 10),
				count = perDay.get(date) ?? 0;
			return { date, count, level: level(count) };
		}),
	};
}
