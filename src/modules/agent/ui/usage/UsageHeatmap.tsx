// Renders with grubersjoe/react-activity-calendar (MIT); the grid, month labels, legend and layout are the library's.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityCalendar, type ThemeInput } from 'react-activity-calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { useOwnerDocument } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import { heatmapDays } from '../../core/stats/heatmap';

/**
 * Five levels from the muted surface up to the chart colour. They are CSS variables, so Obsidian's light and
 * dark themes (and Minimal) recolour the grid without the component knowing the theme.
 */
const LEVELS = [
	'var(--muted)',
	...[25, 45, 70, 100].map((share) => `color-mix(in oklab, var(--chart-1) ${share}%, var(--muted))`),
];
const THEME: ThemeInput = { light: LEVELS, dark: LEVELS };

const schemeOf = (doc: Document): 'light' | 'dark' => (doc.body.classList.contains('theme-dark') ? 'dark' : 'light');
/** Obsidian's own colour scheme, not the operating system's: the library only knows the latter. */
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

const BLOCK_MARGIN = 3;
/** Blocks start at 11 px and grow with the card until the grid fills it, but never past 18 px. */
const blockSizeFor = (width: number): number => {
	// 27 columns cover 26 weeks plus the partial one, and the weekday labels take about 34 px.
	const fit = Math.floor((width - 34) / 27) - BLOCK_MARGIN;
	return Math.max(11, Math.min(18, fit));
};
function useElementWidth(ref: { current: HTMLElement | null }): number {
	const [width, setWidth] = useState(0);
	useEffect(() => {
		const element = ref.current,
			Observer = element?.ownerDocument.defaultView?.ResizeObserver;
		if (!element || !Observer) return;
		const observer = new Observer((entries) => setWidth(Math.floor(entries[0]?.contentRect.width ?? 0)));
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref]);
	return width;
}

export function UsageHeatmap({
	sessions,
	now,
	format,
	range,
}: {
	sessions: Parameters<typeof heatmapDays>[0];
	now: number;
	format: (value: number) => string;
	range?: { start: string; end: string };
}) {
	const t = useT(),
		doc = useOwnerDocument(),
		scheme = useObsidianScheme(doc);
	const frame = useRef<HTMLDivElement>(null),
		blockSize = blockSizeFor(useElementWidth(frame));
	const { days, total } = useMemo(
		() =>
			heatmapDays(
				sessions,
				range ? Date.parse(range.end + 'T12:00:00Z') : now,
				range ? Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86400000) + 1 : undefined,
			),
		[sessions, now, range],
	);
	const labels = useMemo(
		() => ({
			months: t('agent.stats.heatmapMonths').split(','),
			weekdays: t('agent.stats.heatmapWeekdays').split(','),
			totalCount: range
				? `${format(total)} · ${t('agent.stats.total')}`
				: t('agent.stats.heatmapTotal', { count: format(total) }),
			legend: { less: t('agent.stats.heatmapLess'), more: t('agent.stats.heatmapMore') },
		}),
		[t, total, format, range],
	);
	return (
		<div ref={frame} className="text-muted-foreground" data-usage-heatmap="">
			<ActivityCalendar
				data={days}
				theme={THEME}
				colorScheme={scheme}
				weekStart={1}
				blockSize={blockSize}
				blockMargin={BLOCK_MARGIN}
				blockRadius={2}
				fontSize={12}
				showWeekdayLabels={['mon', 'wed', 'fri']}
				labels={labels}
				// The project tooltip portals into the window the grid is in, which a popout needs.
				renderBlock={(block, day) => (
					<Tooltip>
						<TooltipTrigger asChild>{block}</TooltipTrigger>
						<TooltipContent>
							{day.count
								? t('agent.stats.heatmapTip', { date: day.date, tokens: format(day.count) })
								: t('agent.stats.heatmapTipNone', { date: day.date })}
						</TooltipContent>
					</Tooltip>
				)}
			/>
		</div>
	);
}
