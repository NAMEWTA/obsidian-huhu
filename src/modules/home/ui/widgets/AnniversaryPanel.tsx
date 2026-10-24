// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/anniversary-widget.ts
import { Settings } from 'lucide-react';
import { IconButton } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import { formatElapsed, parseAnniversaryDate } from '../../core/anniversaries/calendar';
import { civilDate } from '../../core/anniversaries/civil-date';
import { resolveWidgetLabel } from '../../core/board/default-widget-label';
import type { AnniversaryConfig } from '../../core/board/types';
import { t } from '../../../../shared/i18n';
import { useWindowClock } from './use-record-clock';
import { useLunarLookup } from './use-record-lunar';
export function AnniversaryPanel({ config, win, edit }: { config: AnniversaryConfig; win: Window; edit?: () => void }) {
	const now = useWindowClock(win);
	const start = parseAnniversaryDate(config.startDate);
	const lunar = config.calendar === 'lunar';
	const { lookup, failed } = useLunarLookup(lunar);
	let date = '';
	if (!start) date = t('anniversary.invalidDate');
	else if (lunar && !lookup) date = t(failed ? 'anniversary.conversionError' : 'anniversary.loading');
	else {
		try {
			const solar = civilDate(start);
			date =
				lunar && lookup
					? t('anniversary.lunarWithSolar', {
							lunar: t('anniversary.lunarDateValue', lookup.displayDate(solar)),
							solar,
						})
					: solar;
		} catch {
			date = t('anniversary.conversionError');
		}
	}
	return (
		<div className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-0.5 text-center" data-anniversary>
			{edit && (
				<WidgetActions>
					<IconButton label={t('anniversary.editTitle')} onClick={edit}>
						<Settings />
					</IconButton>
				</WidgetActions>
			)}
			<div className="max-w-full truncate px-1 text-sm text-muted-foreground">
				{resolveWidgetLabel(config, 'anniversary') || t('anniversary.unnamed')}
			</div>
			<div className="max-w-full truncate leading-tight font-semibold tabular-nums [font-size:clamp(1.5rem,min(8cqw,18cqh),3rem)]">
				{start ? formatElapsed(start, now, config.precision) : '--'}
			</div>
			<div className="max-w-full truncate text-xs text-muted-foreground">{date}</div>
		</div>
	);
}
