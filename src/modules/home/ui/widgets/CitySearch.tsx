import { useEffect, useState } from 'react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { useOwnerDocument } from '../../../../ui/react/contexts';
import { registerMessages } from '../../../../shared/i18n';
import { messages } from '../../../../shared/i18n/lazy/analytics';
import { useT } from '../../../../ui/react/hooks';
import type { WeatherConfig } from '../../core/board/types/model';
import { weatherLocationKey, weatherLocationLabel } from '../../core/board/weather-locations';
import { geocodeCity, type GeocodeResult } from '../../platform/widgets/weather-service';

registerMessages(messages);

type SearchState = { query: string; status: 'loading' | 'ready' | 'error'; cities: GeocodeResult[] };

/** Search is only a draft. Only choosing a candidate persists its name and coordinates together. */
export function CitySearch({
	current,
	search = geocodeCity,
	onSelect,
}: {
	current: WeatherConfig | null;
	search?: (query: string) => Promise<GeocodeResult[]>;
	onSelect: (location: WeatherConfig) => Promise<void>;
}) {
	const t = useT(),
		doc = useOwnerDocument();
	const [query, setQuery] = useState(''),
		[retry, setRetry] = useState(0);
	const [state, setState] = useState<SearchState>({ query: '', status: 'ready', cities: [] });
	const [saving, setSaving] = useState(false),
		[saveError, setSaveError] = useState(false);
	const [manual, setManual] = useState({ cityName: '', latitude: '', longitude: '' }),
		[invalid, setInvalid] = useState(false);
	const term = query.trim();
	const enough = [...term].length >= 2;
	useEffect(() => {
		const win = doc.defaultView;
		if (!enough || !win) return;
		let active = true;
		const timer = win.setTimeout(() => {
			setState({ query: term, status: 'loading', cities: [] });
			void search(term).then(
				(cities) => {
					if (active) setState({ query: term, status: 'ready', cities });
				},
				() => {
					if (active) setState({ query: term, status: 'error', cities: [] });
				},
			);
		}, 300);
		return () => {
			active = false;
			win.clearTimeout(timer);
		};
	}, [doc, enough, term, retry, search]);
	const status = state.query === term ? state.status : 'loading';
	const cities = enough && state.query === term && status === 'ready' ? state.cities : [];
	return (
		<div className="space-y-3">
			<p className="text-sm" data-weather-current>
				{t('weather.currentLocation', {
					location: current ? weatherLocationLabel(current) : t('weather.noLocation'),
				})}
			</p>
			<div className="flex gap-2">
				<Input
					aria-label={t('home.dashboard.city')}
					placeholder={t('settings.widgetWeatherCityPlaceholder')}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					disabled={saving}
				/>
				{query && (
					<Button type="button" variant="outline" disabled={saving} onClick={() => setQuery('')}>
						{t('weather.clearSearch')}
					</Button>
				)}
			</div>
			<p className="text-xs text-muted-foreground">{t('weather.searchHint')}</p>
			{enough && status === 'loading' && <p role="status">{t('weather.searching')}</p>}
			{enough && status === 'error' && (
				<div role="alert" className="space-y-2 text-sm text-destructive">
					<p>{t('weather.searchFailed')}</p>
					<Button type="button" variant="outline" onClick={() => setRetry((value) => value + 1)}>
						{t('weather.retry')}
					</Button>
				</div>
			)}
			{enough && status === 'ready' && !cities.length && <p role="status">{t('weather.noResults')}</p>}
			<div className="grid gap-1">
				{cities.map((city) => {
					const location: WeatherConfig = {
						cityName: city.name,
						latitude: city.latitude,
						longitude: city.longitude,
						...(city.country ? { country: city.country } : {}),
						...(city.admin1 ? { admin1: city.admin1 } : {}),
						...(city.admin2 ? { admin2: city.admin2 } : {}),
						...(city.timezone ? { timezone: city.timezone } : {}),
					};
					const selected = !!current && weatherLocationKey(current) === weatherLocationKey(location);
					return (
						<Button
							key={weatherLocationKey(location)}
							type="button"
							variant={selected ? 'secondary' : 'ghost'}
							className="h-auto justify-start whitespace-normal text-left"
							aria-pressed={selected}
							disabled={saving}
							onClick={() => {
								setSaving(true);
								setSaveError(false);
								void onSelect(location)
									.catch(() => setSaveError(true))
									.finally(() => setSaving(false));
							}}
						>
							{weatherLocationLabel(location)}
						</Button>
					);
				})}
			</div>
			<details className="rounded-md border border-border p-3 text-sm">
				<summary className="min-h-8 cursor-pointer">{t('weather.coordinates')}</summary>
				<div className="mt-2 grid gap-2">
					{(['cityName', 'latitude', 'longitude'] as const).map((field) => (
						<Input
							key={field}
							aria-label={t(field === 'cityName' ? 'weather.locationName' : `weather.${field}`)}
							placeholder={t(field === 'cityName' ? 'weather.locationName' : `weather.${field}`)}
							value={manual[field]}
							onChange={(e) => setManual({ ...manual, [field]: e.target.value })}
						/>
					))}
					<Button
						variant="outline"
						disabled={saving}
						onClick={() => {
							const latitude = Number(manual.latitude),
								longitude = Number(manual.longitude);
							if (
								!manual.cityName.trim() ||
								!manual.latitude.trim() ||
								!manual.longitude.trim() ||
								!Number.isFinite(latitude) ||
								Math.abs(latitude) > 90 ||
								!Number.isFinite(longitude) ||
								Math.abs(longitude) > 180
							) {
								setInvalid(true);
								return;
							}
							setInvalid(false);
							setSaving(true);
							void onSelect({ cityName: manual.cityName.trim(), latitude, longitude })
								.catch(() => setSaveError(true))
								.finally(() => setSaving(false));
						}}
					>
						{t('weather.useCoordinates')}
					</Button>
					{invalid && (
						<p role="alert" className="text-destructive">
							{t('weather.invalidCoordinates')}
						</p>
					)}
				</div>
			</details>
			{saving && <p role="status">{t('weather.saving')}</p>}
			{saveError && (
				<p role="alert" className="text-sm text-destructive">
					{t('settings.writeFailed')}
				</p>
			)}
		</div>
	);
}
