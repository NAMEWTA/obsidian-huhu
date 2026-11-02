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
	const written = weatherGate<void>();
	const data = new Map<string, string>(),
		storage = {
			read: async (p: string) => data.get(p)!,
			write: async (p: string, v: string) => {
				data.set(p, v);
				written.resolve();
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
	expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('forecast_days=7') }));
	await written.promise;
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
		vi.mocked(requestUrl).mock.calls.some(([r]) => String(typeof r === 'string' ? r : r.url).includes('archive-api')),
	).toBe(false);
});

beforeEach(() => {
	vi.stubGlobal('window', {
		setTimeout: (run: () => void, ms: number) => setTimeout(run, ms),
		clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
	});
});

function weatherGate<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((yes) => {
		resolve = yes;
	});
	return { promise, resolve };
}
const forecast = (temperature: number) => ({
	json: {
		current: { temperature_2m: temperature, weather_code: 0 },
		daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], weather_code: [] },
	},
});
const cachePort = () => ({
	read: vi.fn(async (): Promise<string> => {
		throw new Error('missing');
	}),
	write: vi.fn(async (_path: string, _raw: string) => {}),
	mkdir: vi.fn(async () => {}),
	exists: vi.fn(async () => false),
});

test('a held cache read cannot prevent a successful provider from reaching the request result', async () => {
	vi.useFakeTimers();
	const gate = weatherGate<string>(),
		storage = cachePort();
	storage.read.mockReturnValue(gate.promise);
	vi.mocked(requestUrl).mockResolvedValue(forecast(21) as never);
	let settled = false;
	const request = fetchWeather({ cityName: 'Fixture read', latitude: 11.101, longitude: 12.101 }, storage).then(
		(value) => {
			settled = true;
			return value;
		},
	);
	await vi.advanceTimersByTimeAsync(30_000);
	expect(settled).toBe(true);
	expect(await request).toMatchObject({ temperature: 21 });
	gate.resolve('{}');
});
test('a held disposable cache write does not hold a successful forecast hostage', async () => {
	vi.useFakeTimers();
	const gate = weatherGate<void>(),
		storage = cachePort();
	storage.write.mockReturnValue(gate.promise);
	vi.mocked(requestUrl).mockResolvedValue(forecast(22) as never);
	let settled = false;
	const request = fetchWeather({ cityName: 'Fixture write', latitude: 11.102, longitude: 12.102 }, storage, true).then(
		(value) => {
			settled = true;
			return value;
		},
	);
	await vi.advanceTimersByTimeAsync(30_000);
	expect(settled).toBe(true);
	expect(await request).toMatchObject({ temperature: 22 });
	gate.resolve();
});
test('memory forecast caches follow storage ownership, not a module-global coordinate alone', async () => {
	const a = cachePort(),
		b = cachePort(),
		location = { cityName: 'Same coordinates', latitude: 11.103, longitude: 12.103 };
	vi.mocked(requestUrl)
		.mockResolvedValueOnce(forecast(23) as never)
		.mockResolvedValueOnce(forecast(24) as never);
	expect(await fetchWeather(location, a, true)).toMatchObject({ temperature: 23 });
	expect(await fetchWeather(location, b)).toMatchObject({ temperature: 24 });
	expect(requestUrl).toHaveBeenCalledTimes(2);
});

test('primary timeout reaches fallback and both provider hangs terminate without retained timers', async () => {
	vi.useFakeTimers();
	const first = fetchWeather({ cityName: 'Fallback', latitude: 12.201, longitude: 13.201 }, cachePort(), true);
	// The fallback needs its own real provider payload.
	vi.mocked(requestUrl)
		.mockReset()
		.mockReturnValueOnce(new Promise(() => {}) as never)
		.mockResolvedValueOnce({
			json: {
				properties: {
					timeseries: [
						{
							time: '2026-10-31T00:00:00Z',
							data: {
								instant: { details: { air_temperature: 28 } },
								next_1_hours: { summary: { symbol_code: 'clearsky_day' } },
							},
						},
					],
				},
			},
		} as never);
	await vi.advanceTimersByTimeAsync(12_001);
	expect(await first).toMatchObject({ temperature: 28, source: 'Met.no' });
	vi.mocked(requestUrl).mockReturnValue(new Promise(() => {}) as never);
	const second = fetchWeather({ cityName: 'Both held', latitude: 12.202, longitude: 13.202 }, undefined, true).catch(
		(error) => error,
	);
	await vi.advanceTimersByTimeAsync(24_001);
	expect(await second).toMatchObject({ code: 'timeout', stage: 'fallback' });
	expect(vi.getTimerCount()).toBe(0);
});
test('late cache reads cannot replace a newer forecast and cancelled mkdir cannot admit a write', async () => {
	vi.useFakeTimers();
	const read = weatherGate<string>(),
		storage = cachePort(),
		location = { cityName: 'Late cache', latitude: 12.203, longitude: 13.203 };
	storage.read.mockReturnValue(read.promise);
	vi.mocked(requestUrl).mockResolvedValue(forecast(29) as never);
	const pending = fetchWeather(location, storage);
	await vi.advanceTimersByTimeAsync(1001);
	const result = await pending;
	read.resolve(JSON.stringify({ ...result, temperature: -10 }));
	await vi.advanceTimersByTimeAsync(0);
	expect(await fetchWeather(location, storage)).toMatchObject({ temperature: 29 });
	const mkdir = weatherGate<void>(),
		other = cachePort(),
		controller = new AbortController();
	other.mkdir.mockReturnValue(mkdir.promise);
	await fetchWeather({ ...location, latitude: 12.204 }, other, true, { signal: controller.signal });
	await vi.advanceTimersByTimeAsync(0);
	expect(other.mkdir).toHaveBeenCalledOnce();
	controller.abort();
	mkdir.resolve();
	await vi.advanceTimersByTimeAsync(0);
	expect(other.write).not.toHaveBeenCalled();
	expect(vi.getTimerCount()).toBe(0);
});
test('an already admitted write stays in its captured vault and precedes the latest same-key write', async () => {
	vi.useFakeTimers();
	const gate = weatherGate<void>(),
		a = cachePort(),
		b = cachePort(),
		writesA: number[] = [],
		writesB: number[] = [];
	let calls = 0;
	a.write.mockImplementation(async (_path: string, raw: string) => {
		if (++calls === 1) await gate.promise;
		writesA.push(JSON.parse(raw).temperature);
	});
	b.write.mockImplementation(async (_path: string, raw: string) => {
		writesB.push(JSON.parse(raw).temperature);
	});
	const location = { cityName: 'Write owner', latitude: 12.205, longitude: 13.205 },
		old = new AbortController();
	vi.mocked(requestUrl)
		.mockResolvedValueOnce(forecast(30) as never)
		.mockResolvedValueOnce(forecast(31) as never)
		.mockResolvedValueOnce(forecast(32) as never);
	await fetchWeather(location, a, true, { signal: old.signal });
	await vi.advanceTimersByTimeAsync(0);
	expect(a.write).toHaveBeenCalledTimes(1);
	old.abort();
	expect(await fetchWeather(location, a, true)).toMatchObject({ temperature: 31 });
	expect(await fetchWeather(location, b, true)).toMatchObject({ temperature: 32 });
	await vi.advanceTimersByTimeAsync(0);
	expect(writesA).toEqual([]);
	expect(writesB).toEqual([32]);
	gate.resolve();
	await vi.advanceTimersByTimeAsync(0);
	expect(writesA).toEqual([30, 31]);
	expect(writesB).toEqual([32]);
	expect(vi.getTimerCount()).toBe(0);
});

test('a cache mkdir completing after the write admission budget cannot start a late write', async () => {
	vi.useFakeTimers();
	const gate = weatherGate<void>(),
		storage = cachePort(),
		states: string[] = [];
	storage.mkdir.mockReturnValue(gate.promise);
	vi.mocked(requestUrl).mockResolvedValue(forecast(33) as never);
	expect(
		await fetchWeather({ cityName: 'Held mkdir', latitude: 12.206, longitude: 13.206 }, storage, true, {
			onCacheWrite: (state) => states.push(state),
		}),
	).toMatchObject({ temperature: 33 });
	await vi.advanceTimersByTimeAsync(1001);
	expect(states).toEqual(['pending', 'failed']);
	expect(storage.write).not.toHaveBeenCalled();
	gate.resolve();
	await vi.advanceTimersByTimeAsync(0);
	expect(storage.write).not.toHaveBeenCalled();
	expect(vi.getTimerCount()).toBe(0);
});
