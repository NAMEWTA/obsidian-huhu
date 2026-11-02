import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DEFAULT_DASHBOARD_SETTINGS, type DashboardData, type WeatherData } from '../core/board/types/model';
import type { HomeHost } from './home-host';

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	close: vi.fn(),
	read: vi.fn(async (): Promise<WeatherData | null> => null),
}));
vi.mock('../platform/widgets/weather-service', () => ({
	fetchWeather: mocks.fetch,
	geocodeCity: vi.fn(),
	readWeatherCache: mocks.read,
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
	vi.stubGlobal('window', {
		setTimeout: (run: () => void, ms: number) => setTimeout(run, ms),
		clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
	});
	mocks.read.mockResolvedValue(null);
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
	vi.useRealTimers();
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
	mocks.fetch.mockResolvedValueOnce(weather(25));
	await store.weather('a');
	mocks.fetch.mockRejectedValueOnce(new Error('offline'));
	await store.weather('a', true);
	expect(store.state.getState().weatherByInstance.a).toMatchObject({
		status: 'error',
		data: { temperature: 25, fetchedAt: 1 },
	});
	expect(store.state.getState().weatherByInstance.a?.error).not.toBe('');
});

test('a successful forecast is not gated by an unrelated held cache read', async () => {
	vi.useFakeTimers();
	mocks.read.mockReturnValue(new Promise(() => {}));
	mocks.fetch.mockResolvedValue(weather(26));
	let settled = false;
	const request = store.weather('a').then(() => {
		settled = true;
	});
	await vi.advanceTimersByTimeAsync(30_000);
	expect(settled).toBe(true);
	await request;
	expect(store.state.getState().weatherByInstance.a).toMatchObject({ status: 'ready', data: { temperature: 26 } });
});
test('the whole request reaches a retryable terminal state even if a provider promise never settles', async () => {
	vi.useFakeTimers();
	mocks.fetch.mockReturnValue(new Promise(() => {}));
	let settled = false;
	const request = store.weather('a').then(() => {
		settled = true;
	});
	await vi.advanceTimersByTimeAsync(30_000);
	expect(settled).toBe(true);
	await request;
	expect(store.state.getState().weatherByInstance.a).toMatchObject({ status: 'error', retryable: true });
});
test('an explicitly unconfigured widget publishes an unconfigured state', async () => {
	const data = structuredClone(store.state.getState().data) as DashboardData;
	data.widgets![0]!.weather = null;
	store.state.setState({ data });
	await store.weather('a');
	expect(store.state.getState().weatherByInstance.a).toMatchObject({ status: 'unconfigured', data: null });
	expect(mocks.fetch).not.toHaveBeenCalled();
});

test('hide cancels a held request, retains an explicit waiting state and resumes without replacing the store', async () => {
	vi.useFakeTimers();
	const old = deferred();
	mocks.fetch.mockReturnValueOnce(old.promise).mockResolvedValueOnce(weather(34));
	const pending = store.weather('a');
	store.setVisible(false);
	await pending;
	expect(store.state.getState().weatherByInstance.a).toMatchObject({ status: 'waiting', retryable: true });
	store.setVisible(true);
	await vi.advanceTimersByTimeAsync(0);
	expect(store.state.getState().weatherByInstance.a).toMatchObject({ status: 'ready', data: { temperature: 34 } });
	old.resolve(weather(-34));
	await vi.advanceTimersByTimeAsync(0);
	expect(store.state.getState().weatherByInstance.a?.data?.temperature).toBe(34);
	expect(vi.getTimerCount()).toBe(0);
});
test('a retained old forecast exposes its timestamp and expiration during refresh and failure', async () => {
	vi.useFakeTimers({ now: new Date('2026-10-31T12:00:00Z') });
	mocks.fetch.mockResolvedValueOnce(weather(35));
	await store.weather('a');
	const held = deferred();
	mocks.fetch.mockReturnValueOnce(held.promise);
	const refresh = store.weather('a', true);
	expect(store.state.getState().weatherByInstance.a).toMatchObject({
		status: 'refreshing',
		fetchedAt: 1,
		stale: true,
		data: { temperature: 35 },
	});
	held.reject(new Error('offline'));
	await refresh;
	expect(store.state.getState().weatherByInstance.a).toMatchObject({
		status: 'error',
		errorCode: 'network',
		retryable: true,
		stale: true,
		fetchedAt: 1,
	});
});
test('two live boards retain independent instance requests and disposal ignores late replies', async () => {
	vi.useFakeTimers();
	const other = new BoardStore(
		{ ...store.host, app: { vault: { adapter: {} } } } as unknown as HomeHost,
		'.huhu/dashboards/B',
	);
	other.state.setState({ data: structuredClone(store.state.getState().data) });
	const first = deferred(),
		second = deferred();
	mocks.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
	const a = store.weather('a'),
		b = other.weather('a');
	first.resolve(weather(36));
	await a;
	expect(other.state.getState().weatherByInstance.a?.status).toBe('loading');
	await other.dispose();
	await b;
	second.resolve(weather(-36));
	await vi.advanceTimersByTimeAsync(0);
	expect(store.state.getState().weatherByInstance.a?.data?.temperature).toBe(36);
	expect(other.state.getState().weatherByInstance.a?.data).toBeNull();
	expect(vi.getTimerCount()).toBe(0);
});
