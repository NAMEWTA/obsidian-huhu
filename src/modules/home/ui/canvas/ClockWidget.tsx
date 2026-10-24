import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { CloudSun, RefreshCw, Settings } from 'lucide-react';
import { getLanguage, registerMessages, t } from '../../../../shared/i18n';
import { messages } from '../../../../shared/i18n/lazy/analytics';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import { Button } from '../../../../ui/components/button';
import type { BoardStore } from '../../services/board-store';
import { useClock } from '../board/hooks';
import { weatherInstanceLocation, weatherLocationKey, weatherLocationLabel } from '../../core/board/weather-locations';
import { getWeatherDescription, getWeatherEmoji } from '../../platform/widgets/weather-service';
import { CitySearch } from '../widgets/CitySearch';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { WidgetActions } from './widget-frame';
registerMessages(messages);
const degrees = (n: number | null | undefined) =>
	typeof n === 'number' && Number.isFinite(n) ? `${Math.round(n)}°` : '—';
export function ClockWidget({ store, entryId = 'default' }: { store: BoardStore; entryId?: string }) {
	const { data, settings, weatherByInstance } = useStore(store.state),
		date = new Date(useClock(1000)),
		doc = useOwnerDocument(),
		visible = useVisible();
	const [configure, setConfigure] = useState(false),
		[details, setDetails] = useState(false);
	const location = weatherInstanceLocation(data, settings, entryId),
		key = location ? weatherLocationKey(location) : '';
	const current = weatherByInstance[entryId],
		weather = current?.locationKey === key ? current.data : null;
	const timezone = location?.timezone || weather?.timezone;
	const locale = getLanguage() === 'zh' ? 'zh-CN' : 'en-GB';
	const search = useCallback((query: string) => store.cities(query), [store]);
	useEffect(() => {
		const win = doc.defaultView;
		if (!win || !visible || !key) return;
		const refresh = () => {
			if (doc.visibilityState !== 'hidden') void store.weather(entryId);
		};
		refresh();
		const timer = win.setInterval(refresh, 1800000);
		doc.addEventListener('visibilitychange', refresh);
		return () => {
			win.clearInterval(timer);
			doc.removeEventListener('visibilitychange', refresh);
		};
	}, [doc, visible, key, store, entryId]);
	return (
		<>
			<WidgetActions>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={t('weather.configure')}
					onClick={() => setConfigure(true)}
				>
					<Settings />
				</Button>
				{location && (
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={t('weather.retry')}
						onClick={() => {
							void store.weather(entryId, true);
						}}
					>
						<RefreshCw />
					</Button>
				)}
			</WidgetActions>
			<div className="flex h-full min-h-0 flex-col justify-center gap-3" data-clock-weather>
				<div className="flex min-w-0 flex-col items-center gap-3 @min-[24rem]:flex-row @min-[24rem]:justify-between @min-[24rem]:gap-6">
					<div className="min-w-0 text-center @min-[24rem]:text-left">
						<time
							dateTime={date.toISOString()}
							className="text-[clamp(2rem,min(18cqw,32cqh),4.5rem)] font-semibold leading-none tracking-tight tabular-nums"
						>
							{date.toLocaleTimeString('en-GB', {
								timeZone: timezone,
								hour: '2-digit',
								minute: '2-digit',
							})}
						</time>
						<p className="mb-0 mt-2 truncate text-xs text-muted-foreground">
							{date.toLocaleDateString(locale, {
								timeZone: timezone,
								month: 'long',
								day: 'numeric',
								weekday: 'long',
							})}
						</p>
					</div>
					<Button
						variant="ghost"
						className="h-auto max-w-full gap-3 px-2 py-1 text-left"
						onClick={() => (location ? setDetails(true) : setConfigure(true))}
					>
						{weather ? (
							<>
								<span className="text-3xl" aria-hidden>
									{getWeatherEmoji(weather.weatherCode)}
								</span>
								<span className="grid min-w-0 gap-1">
									<span className="flex items-baseline gap-2">
										<strong className="text-2xl font-medium tabular-nums">
											{degrees(weather.temperature)}
										</strong>
										<span className="truncate text-xs">{location?.cityName}</span>
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{getWeatherDescription(weather.weatherCode)} · {degrees(weather.dailyMin[0])} /{' '}
										{degrees(weather.dailyMax[0])}
									</span>
								</span>
							</>
						) : (
							<>
								<CloudSun />
								<span className="truncate text-xs">
									{location ? current?.error || t('home.dashboard.loading') : t('weather.configure')}
								</span>
							</>
						)}
					</Button>
				</div>
				{weather && (
					<div className="hidden grid-cols-7 gap-1 text-center text-xs [@container(min-height:14rem)]:grid">
						{weather.dailyDates.map((day, i) => (
							<button
								key={day}
								type="button"
								onClick={() => setDetails(true)}
								className="min-h-16 rounded-md p-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
							>
								<span className="block text-muted-foreground">
									{new Date(`${day}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })}
								</span>
								<span className="my-1 block" aria-hidden>
									{getWeatherEmoji(weather.dailyCodes[i] ?? -1)}
								</span>
								<span className="tabular-nums">{degrees(weather.dailyMax[i])}</span>
							</button>
						))}
					</div>
				)}
				{current?.error && weather && (
					<p role="status" className="m-0 truncate text-xs text-muted-foreground">
						{current.error} ·{' '}
						{t('weather.stale', { time: new Date(weather.fetchedAt).toLocaleTimeString(locale) })}
					</p>
				)}
			</div>
			{configure && (
				<DashboardDialog title={t('weather.configure')} onClose={() => setConfigure(false)}>
					<CitySearch
						current={location}
						search={search}
						onSelect={async (next) => {
							await store.edit((draft) => {
								const member = draft.widgets?.find(
									(m) =>
										m.provider === 'home' &&
										['clock', 'weather'].includes(m.kind) &&
										m.instanceId === entryId,
								);
								if (!member) throw new Error(t('home.widget.instanceMissing'));
								member.weather = next;
							});
							setConfigure(false);
						}}
					/>
				</DashboardDialog>
			)}
			{details && (
				<DashboardDialog
					cancelLabel={t('common.close')}
					title={location ? weatherLocationLabel(location) : t('weather.details')}
					wide
					onClose={() => setDetails(false)}
				>
					{weather ? (
						<>
							<div className="flex flex-wrap items-center gap-4">
								<strong className="text-4xl tabular-nums">{degrees(weather.temperature)}</strong>
								<span>{getWeatherDescription(weather.weatherCode)}</span>
								<span className="text-sm text-muted-foreground">
									{t('weather.feelsLike')} {degrees(weather.feelsLike)} · {t('weather.humidity')}{' '}
									{weather.humidity === null ? '—' : `${weather.humidity}%`} · {t('weather.wind')}{' '}
									{weather.windSpeed === null ? '—' : `${weather.windSpeed} km/h`}
								</span>
							</div>
							<h3 className="mb-0 text-sm">{t('weather.hourly')}</h3>
							{weather.hourly?.length ? (
								<div className="flex gap-2 overflow-x-auto pb-2">
									{weather.hourly.map((h) => (
										<div
											key={h.time}
											className="min-w-20 rounded-md bg-muted/50 p-3 text-center text-xs"
										>
											<span className="block text-muted-foreground">{h.time.slice(11, 16)}</span>
											<span className="my-2 block">
												{h.weatherCode === null ? '—' : getWeatherEmoji(h.weatherCode)}
											</span>
											<strong className="block">{degrees(h.temperature)}</strong>
											<span
												title={t('weather.rain')}
												className="mt-2 block text-muted-foreground"
											>
												{h.precipitation === null ? '—' : `${h.precipitation}%`}
											</span>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">{t('analytics.empty')}</p>
							)}
							<h3 className="mb-0 text-sm">{t('weather.days')}</h3>
							<div className="divide-y divide-border">
								{weather.dailyDates.map((day, i) => (
									<div key={day} className="flex items-center justify-between gap-3 py-3 text-sm">
										<span>{day}</span>
										<span>
											{getWeatherEmoji(weather.dailyCodes[i] ?? -1)}{' '}
											{getWeatherDescription(weather.dailyCodes[i] ?? -1)}
										</span>
										<span className="tabular-nums">
											{degrees(weather.dailyMin[i])} / {degrees(weather.dailyMax[i])}
										</span>
										<span className="text-muted-foreground" title={t('weather.rain')}>
											{weather.dailyPrecipitation?.[i] === undefined
												? '—'
												: `${weather.dailyPrecipitation[i]}%`}
										</span>
									</div>
								))}
							</div>
							<p className="mb-0 text-xs text-muted-foreground">
								{t('weather.source', { source: weather.source || '—' })} ·{' '}
								{t('weather.stale', { time: new Date(weather.fetchedAt).toLocaleString(locale) })}
							</p>
						</>
					) : (
						<p>{current?.error || t('home.dashboard.loading')}</p>
					)}
				</DashboardDialog>
			)}
		</>
	);
}
