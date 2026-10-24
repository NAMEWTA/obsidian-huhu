import type { CalendarNoteAction } from '../../../../ui/components/huhu/calendar/CalendarMonth';
import { startOfWeek, type WeekStart } from '../../../../shared/periodic-paths';
import type { App } from 'obsidian';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
import { toIsoDate, type VaultTask } from '../../platform/calendar/alltasks-scan';
import { getLanguage, t } from '../../../../shared/i18n/index';

/** Options controlling how a month grid is rendered and how its tasks behave. */
export interface MonthGridOptions {
	/** Compact mode (in-column): tiny cells, capped task list, tasks non-interactive. */
	compact: boolean;
	weekStart?: WeekStart;
	canSplit?: boolean;
	onPeriodNote?: (iso: string, action: CalendarNoteAction) => void;
	selected?: string;
	dayState?: (iso: string) => { status: 'existing' | 'missing' | 'disabled' | 'unavailable'; active: boolean } | undefined;
	app: App;
	onToggle?: (task: VaultTask, nextChecked: boolean) => void;
	/** Open a task's source note, optionally scrolling to the task's line. */
	onOpenNote?: (file: ContentFile, line?: number, task?: VaultTask) => void;
	/** Compact mode: clicking a day cell opens its agenda. */
	onDayClick?: (iso: string) => void;
	/** Dot mode: show a single dot when the day has tasks (no task text). Implies
	 *  compact-style clickable cells. Typically paired with onDayHover so the
	 *  hidden tasks surface on hover. */
	dotMode?: boolean;
	/** Show each task's time-of-day label (week view). */
	showTimes?: boolean;
	/** The pointer entered a day cell that has tasks (dot mode and full mode).
	 *  `anchor` is the cell element — used by the caller to position a preview
	 *  popup near it. */
	onDayHover?: (iso: string, anchor: HTMLElement) => void;
	/** The pointer left a day cell (or the grid). Caller hides its popup. */
	onDayLeave?: () => void;
	/** Full-screen month mode: a continuous multi-day bar was clicked. Opens the
	 *  day agenda of the bar's first visible day. */
	onBarClick?: (iso: string) => void;
	/** Full-screen mode: the day number (month cells) or day header (week time
	 * grid) was clicked. Opens that day's agenda ready to add tasks. */
	onDayNumClick?: (iso: string) => void;
}

export const COMPACT_MAX_PER_DAY = 3;

export { taskTime, taskDayTime, byDayTaskTime } from '../../core/calendar/agenda';

export function weekdayLabels(weekStart: WeekStart = 1): string[] {
	// Monday-first, to match the alltasks week bucketing.
	const raw = t('calendar.weekdays');
	const labels = raw.split(',').map((s) => s.trim());
	const ordered = labels.length === 7 ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const offset = (weekStart + 6) % 7;
	return [...ordered.slice(offset), ...ordered.slice(0, offset)];
}

export function monthLabel(year: number, month: number): string {
	const names = t('calendar.months')
		.split(',')
		.map((s) => s.trim());
	const fallback = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const name = (names.length === 12 ? names : fallback)[month] ?? fallback[month];
	return `${name} ${year}`;
}

export function monthAbbr(month: number): string {
	const names = t('calendar.months')
		.split(',')
		.map((s) => s.trim());
	const fallback = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return (names.length === 12 ? names : fallback)[month] ?? fallback[month] ?? '';
}

/** Monday-anchored start of the week containing `d` (local time). */
export function mondayOf(d: Date): Date {
	const offset = d.getDay() === 0 ? -6 : 1 - d.getDay();
	const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	m.setDate(m.getDate() + offset);
	return m;
}

/** Friendly range label for a Monday-anchored week, e.g. "Jun 22 – Jun 28, 2026". */
export function weekLabel(weekStart: Date): string {
	const end = new Date(weekStart);
	end.setDate(weekStart.getDate() + 6);
	const s = `${monthAbbr(weekStart.getMonth())} ${weekStart.getDate()}`;
	const e = `${monthAbbr(end.getMonth())} ${end.getDate()}`;
	return `${s} – ${e}, ${end.getFullYear()}`;
}

/** Max stacked bar lanes per week row in the full-screen month view; a span
 * that would need a fifth lane degrades to a normal row on its first day.
 * The rendered lane height lives in styles.css (--dashboard-bar-lane). */
export const MAX_BAR_LANES = 4;

export interface BarEntry {
	task: VaultTask;
	/** 0-based column of the bar's first visible day within the week. */
	fromCol: number;
	/** Column span (days) within the week. */
	len: number;
	/** True when the span continues before/after the visible week. */
	contLeft: boolean;
	contRight: boolean;
	/** ISO of the bar's first visible day (click target). */
	firstIso: string;
}

/** Clamp a task's multi-day span to the visible week (columns + continuation). */
export function clampBarToWeek(task: VaultTask, span: { start: string; end: string }, anyVisibleDay: Date, firstDay: WeekStart = 1): BarEntry {
	const monday = startOfWeek(anyVisibleDay, firstDay);
	const weekStartIso = toIsoDate(monday);
	const weekEndIso = toIsoDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6));
	const fromIso = span.start < weekStartIso ? weekStartIso : span.start;
	const endIso = span.end > weekEndIso ? weekEndIso : span.end;
	const dayDiff = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
	const fromCol = dayDiff(weekStartIso, fromIso);
	const len = dayDiff(fromIso, endIso) + 1;
	return {
		task,
		fromCol: Math.max(0, Math.min(6, fromCol)),
		len: Math.max(1, Math.min(7, len)),
		contLeft: span.start < weekStartIso,
		contRight: span.end > weekEndIso,
		firstIso: fromIso,
	};
}

/** Greedy lane packing: earliest-starting (then longest) bars first; each bar
 * takes the first lane whose last bar ends before it starts. Bars beyond
 * MAX_BAR_LANES get lane = -1 (degrade to a normal row on the first day). */
export function packBarLanes(bars: BarEntry[]): Array<BarEntry & { lane: number }> {
	const sorted = bars.slice().sort((a, b) => a.fromCol - b.fromCol || b.len - a.len);
	const laneEnds: number[] = [];
	const out: Array<BarEntry & { lane: number }> = [];
	for (const bar of sorted) {
		let lane = laneEnds.findIndex((end) => end < bar.fromCol);
		if (lane === -1 && laneEnds.length < MAX_BAR_LANES) {
			lane = laneEnds.length;
		}
		if (lane === -1 || lane >= MAX_BAR_LANES) {
			out.push({ ...bar, lane: -1 });
			continue;
		}
		laneEnds[lane] = bar.fromCol + bar.len - 1;
		out.push({ ...bar, lane });
	}
	return out;
}

/** Local Date from an ISO day string. */
export function parseIso(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Compact day label for bar aria-labels: zh "8月24日", else "Aug 24". */
export function monthDayLabel(d: Date): string {
	return getLanguage() === 'zh'
		? `${monthAbbr(d.getMonth())}${d.getDate()}日`
		: `${monthAbbr(d.getMonth())} ${d.getDate()}`;
}

export const TIMEGRID_HOUR_PX = 48;

export function hhmmToMin(s: string | undefined): number | undefined {
	if (!s) return undefined;
	const m = s.match(/^(\d{1,2}):(\d{2})$/);
	return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

/** "10月17日 周五" / "October 17 Fri": the day an agenda belongs to. */
export function dayLabel(iso: string): string {
	const date = parseIso(iso),
		locale = getLanguage() === 'zh' ? 'zh-CN' : undefined;
	return `${date.toLocaleDateString(locale, { month: 'long', day: 'numeric' })} ${date.toLocaleDateString(locale, { weekday: 'short' })}`;
}
