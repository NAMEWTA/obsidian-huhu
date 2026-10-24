import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DEFAULT_DASHBOARD_SETTINGS, type DashboardData, type WeatherData } from '../core/board/types/model';
import type { HomeHost } from './home-host';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), close: vi.fn() }));
vi.mock('../platform/widgets/weather-service', () => ({
	fetchWeather: mocks.fetch,
	geocodeCity: vi.fn(),
	readWeatherCache: vi.fn(async () => null),
}));
vi.mock('../platform/board/sync', () => ({
	SyncEngine: class {
		getSaveState() {
			return { status: 'saved' };
		}
		onDataUpdate() {
			return () => {};
		}
		onSaveStateUpdate() {
			return () => {};
		}
		updateSettings() {}
		async flush() {}
		async switchFile() {}
		async close() {
			mocks.close();
		}
	},
}));
vi.mock('../../../host/obsidian/storage/content-files', () => ({
	contentFiles: () => ({ subscribe: () => () => {} }),
}));
vi.mock('./instances', () => ({ homeServices: {} }));
import { BoardStore } from './board-store';

function deferred() {
	let resolve!: (value: WeatherData) => void, reject!: (reason: unknown) => void;
	const promise = new Promise<WeatherData>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
const weather = (temperature: number): WeatherData => ({
	temperature,
	feelsLike: temperature,
	humidity: 50,
	windSpeed: 1,
	weatherCode: 0,
	dailyMax: [],
	dailyMin: [],
	dailyCodes: [],
	dailyDates: [],
	fetchedAt: 1,
});
let store: BoardStore;
beforeEach(() => {
	vi.clearAllMocks();
	store = new BoardStore(
		{
			app: { vault: { adapter: {} } },
			settings: structuredClone(DEFAULT_DASHBOARD_SETTINGS),
			subscribeSettings: () => () => {},
			workbenchRefresh: () => {},
		} as unknown as HomeHost,
		'.huhu/dashboards/A',
	);
	store.state.setState({
		data: {
			columns: [],
			quickActions: [],
			widgets: [
				{
					memberId: 'a',
					provider: 'home',
					kind: 'weather',
					instanceId: 'a',
					weather: { cityName: '广州', latitude: 23.13, longitude: 113.26 },
				},
				{
					memberId: 'b',
					provider: 'home',
					kind: 'weather',
					instanceId: 'b',
					weather: { cityName: '深圳', latitude: 22.54, longitude: 114.06 },
				},
			],
		},
	});
});
afterEach(async () => {
	await store.dispose();
});

test('each weather instance has an independent request, failure and result', async () => {
	const a = deferred(),
		b = deferred();
	mocks.fetch.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
	const requests = [store.weather('a'), store.weather('b')];
	a.resolve(weather(25));
	b.reject(new Error('offline'));
	await Promise.all(requests);
	expect(store.state.getState().weatherByInstance.a).toMatchObject({ status: 'ready', data: { temperature: 25 } });
	expect(store.state.getState().weatherByInstance.b).toMatchObject({ status: 'error', data: null });
});

test('changing a city clears its old weather and a late response cannot overwrite its new city', async () => {
	const old = deferred(),
		next = deferred();
	mocks.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
	const first = store.weather('a');
	const data = structuredClone(store.state.getState().data) as DashboardData;
	data.widgets![0]!.weather = { cityName: '北京', latitude: 39.9, longitude: 116.4 };
	store.state.setState({ data });
	const second = store.weather('a');
	expect(store.state.getState().weatherByInstance.a).toMatchObject({
		locationKey: '39.9,116.4',
		status: 'loading',
		data: null,
	});
	next.resolve(weather(10));
	await second;
	old.resolve(weather(30));
	await first;
	expect(store.state.getState().weatherByInstance.a).toMatchObject({
		locationKey: '39.9,116.4',
		data: { temperature: 10 },
	});
});

test('responses and timer callbacks from a previous board generation cannot populate the next board', async () => {
	const delayed = deferred();
	mocks.fetch.mockReturnValueOnce(delayed.promise);
	const view = store.view(),
		pending = view.weather('a');
	await store.switch('.huhu/dashboards/B');
	delayed.resolve(weather(30));
	await pending;
	await view.weather('b');
	expect(store.state.getState().weatherByInstance).toEqual({});
	expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

test('a refresh failure retains the last successful forecast and exposes an error', async () => {
 mocks.fetch.mockResolvedValueOnce(weather(25)); await store.weather('a');
 mocks.fetch.mockRejectedValueOnce(new Error('offline')); await store.weather('a', true);
 expect(store.state.getState().weatherByInstance.a).toMatchObject({ status: 'error', data: { temperature: 25, fetchedAt: 1 } });
 expect(store.state.getState().weatherByInstance.a?.error).not.toBe('');
});
