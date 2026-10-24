// Renders with grubersjoe/react-activity-calendar (MIT), the same library as the agent usage page; the grid is the library's.
import { useCallback, useSyncExternalStore } from 'react';
import { ActivityCalendar, type Activity, type ThemeInput } from 'react-activity-calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { useOwnerDocument } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import { habitFormatDate } from '../../core/habit/model';
import type { HabitService } from '../../platform/habit/habit-service';
import { useBox } from '../widgets/use-box';

/** Five levels from the muted surface to the chart colour; CSS variables, so every Obsidian theme recolours the grid. */
const LEVELS = [
	'var(--muted)',
	...[25, 45, 70, 100].map((share) => `color-mix(in oklab, var(--chart-2) ${share}%, var(--muted))`),
];
const THEME: ThemeInput = { light: LEVELS, dark: LEVELS };
const BLOCK = 11;
const MARGIN = 3;
/** The weekday labels take about this much of the width. */
const LABELS = 32;

const schemeOf = (doc: Document): 'light' | 'dark' => (doc.body.classList.contains('theme-dark') ? 'dark' : 'light');
/** Obsidian's colour scheme, not the operating system's: the library only knows the latter. */
function useObsidianScheme(doc: Document): 'light' | 'dark' {
	return useSyncExternalStore(
		useCallback(
			(notify) => {
				const Observer = doc.defaultView?.MutationObserver;
				if (!Observer) return () => undefined;
				const observer = new Observer(notify);
				observer.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
				return () => observer.disconnect();
			},
			[doc],
		),
		() => schemeOf(doc),
	);
}

/** Days with check-ins as a calendar heat map: the more of today's habits done, the darker the day. */
export function HabitHeatmap({ service }: { service: HabitService }) {
	const t = useT(),
		doc = useOwnerDocument(),
		scheme = useObsidianScheme(doc),
		[ref, box] = useBox<HTMLDivElement>();
	const habits = service.getHabits().length;
	// Whole weeks that fit, the partial current one included; at least eight so a narrow tile still reads as a calendar.
	const weeks = Math.max(8, Math.min(26, Math.floor((box.width - LABELS) / (BLOCK + MARGIN)) - 1));
	// The widget re-renders on every change of the records, so the series is simply read again.
	const today = new Date(),
		span = weeks * 7 - ((6 - ((today.getDay() + 6) % 7)) % 7),
		series = service.getHeatmapDays('all', span),
		start = new Date(today);
	start.setDate(today.getDate() - (span - 1));
	const days: Activity[] = series.map((count, index) => {
		const day = new Date(start);
		day.setDate(start.getDate() + index);
		const level = count <= 0 || habits === 0 ? 0 : Math.min(4, Math.ceil((count / habits) * 4));
		return { date: habitFormatDate(day), count, level };
	});
	return (
		<div ref={ref} className="min-w-0 text-muted-foreground" data-habit-heatmap>
			{box.width > 0 && (
				<ActivityCalendar
					data={days}
					theme={THEME}
					colorScheme={scheme}
					weekStart={1}
					blockSize={BLOCK}
					blockMargin={MARGIN}
					blockRadius={2}
					fontSize={11}
					maxLevel={4}
					showColorLegend={false}
					showTotalCount={false}
					showWeekdayLabels={['mon', 'wed', 'fri']}
					labels={{
						months: t('habit.heatmapMonths').split(','),
						weekdays: t('habit.heatmapWeekdays').split(','),
					}}
					renderBlock={(block, day) => (
						<Tooltip>
							<TooltipTrigger asChild>{block}</TooltipTrigger>
							<TooltipContent>{t('habit.heatmapTip', { date: day.date, count: day.count })}</TooltipContent>
						</Tooltip>
					)}
				/>
			)}
		</div>
	);
}
