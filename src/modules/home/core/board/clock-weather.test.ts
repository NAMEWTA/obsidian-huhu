import { expect, test } from 'vitest';
import { mergeClockWeather } from './clock-weather';
import { DEFAULT_DASHBOARD_SETTINGS as settings, type DashboardData } from './types/model';
import { parse } from './parser/parse';
import { serialize } from './parser/parse';
import { widgetPresentationKey } from './widget-members';
test('nearest clock inherits the city and geometry; unmatched weather stays an independent instance', () => {
	const data: DashboardData = {
		columns: [],
		quickActions: [],
		widgets: ['c1', 'c2', 'w1', 'w2', 'w3'].map((id, i) => ({
			memberId: id,
			provider: 'home',
			kind: i < 2 ? 'clock' : 'weather',
			instanceId: i === 0 || i === 2 ? 'default' : id,
			...(i > 1 ? { weather: { cityName: id, latitude: i, longitude: i, timezone: 'Asia/Shanghai' } } : {}),
		})),
	};
	data.grid = {
		v: 2,
		lg: data.widgets!.map((m, i) => ({
			i: `widget:${widgetPresentationKey(m)}`,
			x: i === 0 || i === 3 ? 0 : 6,
			y: i < 2 ? 0 : 3,
			w: 3,
			h: 2,
		})),
	};
	data.grid.md = structuredClone(data.grid.lg);
	const next = mergeClockWeather(data, settings);
	expect(next.widgets).toHaveLength(3);
	expect(next.widgets?.map((m) => [m.memberId, m.kind, m.weather?.cityName])).toEqual([
		['c1', 'clock', 'w2'],
		['c2', 'clock', 'w1'],
		['w3', 'clock', 'w3'],
	]);
	expect(next.grid?.lg.find((m) => m.i === 'widget:clock')).toEqual(data.grid.lg[0]);
	expect(next.grid?.lg).toHaveLength(3);
	const read = parse(serialize(next));
	expect(read.widgets?.find((m) => m.memberId === 'c1')?.weather?.timezone).toBe('Asia/Shanghai');
	expect(mergeClockWeather(next, settings)).toBe(next);
	expect(data.widgets?.[0]?.weather).toBeUndefined();
});
