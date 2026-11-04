import type { DashboardData, DashboardSettings, WeatherConfig } from './types/model';

/** Invalid saved locations are explicit, so they cannot silently display another city. */
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

/** The default city from settings, offered to a new clock. */
export function defaultWeatherLocation(
	settings: Pick<DashboardSettings, 'widgetWeatherCity' | 'widgetWeatherLat' | 'widgetWeatherLon'>,
): WeatherConfig {
	return {
		cityName: settings.widgetWeatherCity,
		latitude: settings.widgetWeatherLat,
		longitude: settings.widgetWeatherLon,
	};
}

/** A clock keeps its own location; absent or invalid means none. */
export function weatherInstanceLocation(
	data: DashboardData | null,
	_settings: DashboardSettings,
	instanceId = 'default',
): WeatherConfig | null {
	const member = data?.widgets?.find(
		(item) => item.provider === 'home' && item.kind === 'clock' && item.instanceId === instanceId,
	);
	return member?.weather ?? null;
}

export const weatherLocationKey = (location: WeatherConfig): string => `${location.latitude},${location.longitude}`;

export const weatherLocationLabel = (location: WeatherConfig): string =>
	[...new Set([location.cityName, location.admin2, location.admin1, location.country].filter(Boolean))].join(' · ');
