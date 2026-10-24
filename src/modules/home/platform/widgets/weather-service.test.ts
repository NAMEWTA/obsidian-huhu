import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { requestUrl } from 'obsidian';
import { fetchWeather, geocodeCity, readWeatherCache } from './weather-service';
vi.mock('obsidian', () => ({ requestUrl: vi.fn() }));
afterEach(() => {
	vi.resetAllMocks();
	vi.useRealTimers();
});
test('Chinese district search splits city qualifiers and requires matching administrative parents', async () => {
	vi.mocked(requestUrl)
		.mockResolvedValueOnce({ json: { results: [] } } as never)
		.mockResolvedValueOnce({
			json: {
				results: [
					{
						name: '南沙',
						latitude: 22.8,
						longitude: 113.5,
						admin1: '广东',
						admin2: '广州市',
						timezone: 'Asia/Shanghai',
					},
					{ name: '南沙', latitude: 30, longitude: 120, admin1: '江苏', admin2: '苏州市' },
				],
			},
		} as never);
	const results = await geocodeCity('广州市南沙区');
	expect(results).toHaveLength(1);
	expect(results[0]).toMatchObject({ admin2: '广州市', timezone: 'Asia/Shanghai' });
});
test('forecast uses seven days, hourly data and null for missing measurements; persists and rereads cache', async () => {
	vi.useFakeTimers({ now: new Date('2026-10-24T01:00:00Z'), toFake: ['Date'] });
	const data = new Map<string, string>(),
		storage = {
			read: async (p: string) => data.get(p)!,
			write: async (p: string, v: string) => {
				data.set(p, v);
			},
			exists: async () => true,
			mkdir: async () => {},
		};
	vi.mocked(requestUrl).mockResolvedValue({
		json: {
			timezone: 'Asia/Shanghai',
			current: { temperature_2m: 25, weather_code: 2 },
			daily: { time: ['2026-10-24'], temperature_2m_max: [28], temperature_2m_min: [20], weather_code: [2] },
			hourly: {
				time: ['2026-10-24T08:00', '2026-10-24T09:00', '2026-10-24T10:00'],
				temperature_2m: [23, 25, 26],
			},
		},
	} as never);
	const config = { cityName: '广州', latitude: 23.1311, longitude: 113.2611 };
	const result = await fetchWeather(config, storage, true);
	expect(result).toMatchObject({
		source: 'Open-Meteo',
		humidity: null,
		windSpeed: null,
		feelsLike: null,
		timezone: 'Asia/Shanghai',
	});
	expect(result.hourly?.map((h) => h.time)).toEqual(['2026-10-24T09:00', '2026-10-24T10:00']);
	expect(requestUrl).toHaveBeenCalledWith(
		expect.objectContaining({ url: expect.stringContaining('forecast_days=7') }),
	);
	expect(await readWeatherCache(config, storage)).toEqual(result);
});
test('Met.no fallback uses local day boundaries and converts metres per second to kilometres per hour', async () => {
	vi.mocked(requestUrl)
		.mockRejectedValueOnce(new Error('offline'))
		.mockResolvedValueOnce({
			json: {
				properties: {
					timeseries: ['2026-10-23T22:00:00Z', '2026-10-24T01:00:00Z'].map((time, i) => ({
						time,
						data: {
							instant: { details: { air_temperature: 20 + i, wind_speed: 5 } },
							next_1_hours: { summary: { symbol_code: 'clearsky_day' } },
						},
					})),
				},
			},
		} as never);
	const result = await fetchWeather(
		{ cityName: '南沙', latitude: 22.81, longitude: 113.51, timezone: 'Asia/Shanghai' },
		undefined,
		true,
	);
	expect(result).toMatchObject({ source: 'Met.no', windSpeed: 18, feelsLike: null });
	expect(result.dailyDates).toEqual(['2026-10-24']);
	expect(result.dailyMin).toEqual([20]);
	expect(result.dailyMax).toEqual([21]);
	expect(
		vi
			.mocked(requestUrl)
			.mock.calls.some(([r]) => String(typeof r === 'string' ? r : r.url).includes('archive-api')),
	).toBe(false);
});

beforeEach(() => { vi.stubGlobal('window', { setTimeout, clearTimeout }); });
