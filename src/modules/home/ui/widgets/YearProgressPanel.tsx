// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/year-progress-widget.ts
import { Progress } from '../../../../ui/components/progress';
import { t } from '../../../../shared/i18n';
import { useWindowClock } from './use-record-clock';

/** The share of the year gone: the number, a bar, and (from the medium size) the day count beside it. */
export function YearProgressPanel({ win }: { win: Window }) {
	const now = useWindowClock(win),
		year = now.getFullYear(),
		start = new Date(year, 0, 1).getTime(),
		total = new Date(year + 1, 0, 1).getTime() - start,
		elapsed = now.getTime() - start;
	const percent = Math.max(0, Math.min(100, Math.round((elapsed / total) * 1000) / 10)),
		days = Math.round(total / 86400000),
		day = Math.floor(elapsed / 86400000) + 1,
		left = Math.max(0, days - day);
	return (
		<div className="flex h-full min-h-0 flex-col justify-center gap-2" data-year-progress>
			<div className="flex items-baseline justify-between gap-2">
				<span className="leading-none font-semibold tabular-nums [font-size:clamp(1.875rem,min(10cqw,22cqh),3.5rem)]">{percent.toFixed(1)}%</span>
				<span className="text-xs text-muted-foreground tabular-nums">{year}</span>
			</div>
			<Progress value={percent} aria-label={`${year} ${percent.toFixed(1)}%`} className="h-2" />
			<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
				<span className="truncate tabular-nums">{t('yearProgress.remaining', { days: left })}</span>
				<span className="hidden shrink-0 tabular-nums @min-[24rem]:inline">
					{t('yearProgress.dayOfYear', { day, total: days })}
				</span>
			</div>
		</div>
	);
}
