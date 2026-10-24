import type { DashboardData, DashboardSettings } from './types/model';
import { widgetPresentationKey } from './widget-members';
import { legacyWeatherLocation, readWeatherLocation } from './weather-locations';
import { dropItems, renameItems } from './grid';

/** Pair nearest clocks and weather tiles once. Keep clock geometry and every unmatched location. */
export function mergeClockWeather(data: DashboardData, settings: DashboardSettings): DashboardData {
	const weather = data.widgets?.filter((m) => m.provider === 'home' && m.kind === 'weather') ?? [];
	if (!weather.length) return data;
	const widgets = data.widgets!.map((m) => ({ ...m })),
		clocks = widgets.filter((m) => m.provider === 'home' && m.kind === 'clock' && !m.weather);
	const removed = new Set<string>(),
		renamed = new Map<string, string>(),
		gone = new Set<string>();
	const cell = (kind: (typeof widgets)[number]) =>
		data.grid?.lg.find((g) => g.i === `widget:${widgetPresentationKey(kind)}`);
	for (const old of weather) {
		const source = widgets.find((m) => m.memberId === old.memberId)!,
			position = cell(source);
		clocks.sort((a, b) => {
			const distance = (m: typeof a) => {
				const p = cell(m);
				return p && position ? Math.hypot(p.x - position.x, p.y - position.y) : Number.MAX_SAFE_INTEGER;
			};
			return distance(a) - distance(b);
		});
		const clock = clocks.shift(),
			location =
				source.weather === undefined ? readWeatherLocation(legacyWeatherLocation(settings)) : source.weather;
		if (clock) {
			clock.weather = location;
			removed.add(source.memberId);
			gone.add(`widget:${widgetPresentationKey(source)}`);
		} else {
			const before = `widget:${widgetPresentationKey(source)}`;
			source.kind = 'clock';
			source.instanceId = `weather-${source.memberId}`;
			source.weather = location;
			renamed.set(before, `widget:${widgetPresentationKey(source)}`);
		}
	}
	return {
		...data,
		widgets: widgets.filter((m) => !removed.has(m.memberId)),
		grid: data.grid && renameItems(dropItems(data.grid, gone), (id) => renamed.get(id) ?? id),
	};
}
