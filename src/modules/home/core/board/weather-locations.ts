import type { DashboardData, DashboardSettings, WeatherConfig } from './types/model';

/** Invalid saved locations are explicit, so they cannot silently display the legacy city. */
export function readWeatherLocation(value: unknown): WeatherConfig | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const raw = value as Record<string, unknown>;
	if (
		typeof raw.cityName !== 'string' ||
		!raw.cityName.trim() ||
		typeof raw.latitude !== 'number' ||
		!Number.isFinite(raw.latitude) ||
		Math.abs(raw.latitude) > 90 ||
		typeof raw.longitude !== 'number' ||
		!Number.isFinite(raw.longitude) ||
		Math.abs(raw.longitude) > 180
	)
		return null;
	const location: WeatherConfig = { cityName: raw.cityName.trim(), latitude: raw.latitude, longitude: raw.longitude };
	for (const key of ['country', 'admin1', 'admin2', 'timezone'] as const)
		if (typeof raw[key] === 'string' && raw[key].trim()) location[key] = raw[key].trim();
	if (location.timezone) {
		try {
			new Intl.DateTimeFormat('en', { timeZone: location.timezone });
		} catch {
			delete location.timezone;
		}
	}
	return location;
}

export function legacyWeatherLocation(
	settings: Pick<DashboardSettings, 'widgetWeatherCity' | 'widgetWeatherLat' | 'widgetWeatherLon'>,
): WeatherConfig {
	return {
		cityName: settings.widgetWeatherCity,
		latitude: settings.widgetWeatherLat,
		longitude: settings.widgetWeatherLon,
	};
}

/** Commit compatibility defaults only with an explicit member/layout edit, never while reading an old board. */
export function freezeLegacyWeatherLocations(data: DashboardData, settings: DashboardSettings): DashboardData {
	if (
		!data.widgets?.some(
			(member) => member.provider === 'home' && member.kind === 'weather' && member.weather === undefined,
		)
	)
		return data;
	const location = readWeatherLocation(legacyWeatherLocation(settings));
	return {
		...data,
		widgets: data.widgets.map((member) =>
			member.provider === 'home' && member.kind === 'weather' && member.weather === undefined
				? { ...member, weather: location ? { ...location } : null }
				: member,
		),
	};
}

/** Compatibility reads inherit the old location until an explicit member/layout edit saves it. */
export function weatherInstanceLocation(
	data: DashboardData | null,
	settings: DashboardSettings,
	instanceId = 'default',
): WeatherConfig | null {
	const member = data?.widgets?.find(
		(item) =>
			item.provider === 'home' && ['clock', 'weather'].includes(item.kind) && item.instanceId === instanceId,
	);
	if (!member) return null;
	return member.weather === undefined
		? member.kind === 'weather'
			? readWeatherLocation(legacyWeatherLocation(settings))
			: null
		: member.weather;
}

export const weatherLocationKey = (location: WeatherConfig): string => `${location.latitude},${location.longitude}`;

export const weatherLocationLabel = (location: WeatherConfig): string =>
	[...new Set([location.cityName, location.admin2, location.admin1, location.country].filter(Boolean))].join(' · ');
