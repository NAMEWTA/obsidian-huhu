// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/lunar-widget.ts
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../../../ui/components/badge';
import { getLanguage, t } from '../../../../shared/i18n';
import type { HolidayInfo } from '../../platform/calendar/holiday-service';
import { IconButton } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import { loadLunar, lunarCompute } from './lunar-model';
import { useWindowClock } from './use-record-clock';

type BadgeKind = 'holiday' | 'work' | 'weekend' | 'festival';
const BADGE_VARIANT = {
	holiday: 'destructive',
	work: 'outline',
	weekend: 'secondary',
	festival: 'secondary',
} as const satisfies Record<BadgeKind, 'destructive' | 'outline' | 'secondary'>;

/** The lunar date large, the stem-branch line under it, and the almanac at the bottom (all of it from the medium size). */
export function LunarPanel({
	holidays,
	win,
	fortune,
}: {
	holidays: Record<string, HolidayInfo>;
	win: Window;
	fortune: () => void;
}) {
	const now = useWindowClock(win);
	const [lunar, setLunar] = useState(lunarCompute);
	useEffect(() => {
		let live = true;
		if (!lunar)
			void loadLunar().then(
				() => {
					if (live) setLunar(lunarCompute);
				},
				() => undefined,
			);
		return () => {
			live = false;
		};
	}, [lunar]);
	if (!lunar) return null;
	let data;
	try {
		data = lunar.computeLunarData(now, holidays);
	} catch {
		return null;
	}
	const zh = getLanguage() === 'zh',
		comma = data.almanac.indexOf('，'),
		almanac = zh ? (comma < 0 ? [data.almanac] : [data.almanac.slice(0, comma + 1), data.almanac.slice(comma + 1)]) : [];
	const badges = [
		data.holiday?.holiday ? { kind: 'holiday' as const, text: data.holiday.name || t('lunar.holiday') } : null,
		data.holiday?.type === 3 ? { kind: 'work' as const, text: t('lunar.makeupWork') } : null,
		!data.holiday && [0, 6].includes(now.getDay()) ? { kind: 'weekend' as const, text: t('lunar.weekend') } : null,
		...data.festivals.slice(0, 2).map((text) => ({ kind: 'festival' as const, text })),
	].filter((item) => item !== null);
	return (
		<div className="flex h-full min-h-0 flex-col justify-between gap-2" data-lunar>
			<WidgetActions>
				<IconButton label={t('fortune.title')} onClick={fortune}>
					<Sparkles />
				</IconButton>
			</WidgetActions>
			<div className="flex min-w-0 flex-col gap-1">
				<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
					<span className="leading-none font-semibold [font-size:clamp(1.5rem,min(9cqw,24cqh),3rem)]">{data.lunarDate}</span>
					{badges.map((badge, i) => (
						<Badge key={i} variant={BADGE_VARIANT[badge.kind]} data-lunar-badge={badge.kind}>
							{badge.text}
						</Badge>
					))}
				</div>
				<p className="m-0 truncate text-xs text-muted-foreground [@container(min-height:12.5rem)]:text-sm" data-lunar-meta>
					{t('lunar.year', { value: data.ganZhiYear })} · {data.zodiac}
					<span className="hidden @min-[24rem]:inline">
						{' · '}
						{t('lunar.monthDay', { month: data.ganZhiMonth, day: data.ganZhiDay })}
					</span>
					{data.jieQi && <span className="ml-2 font-medium text-foreground">{data.jieQi}</span>}
				</p>
			</div>
			{almanac.length > 0 && (
				<div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground" data-lunar-almanac>
					{almanac.map((line) => (
						<p
							key={line}
							className="m-0 truncate [@container(min-height:12.5rem)]:whitespace-normal"
							title={line}
						>
							{line}
						</p>
					))}
				</div>
			)}
		</div>
	);
}
