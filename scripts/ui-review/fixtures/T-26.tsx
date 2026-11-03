/** The real Home page (DashboardPage, board canvas, tile frames, clock/weather tile). Only the BoardStore edges are supplied here. */
import { createRoot, type Root } from 'react-dom/client';
import { createStore } from 'zustand/vanilla';
import { setLanguage, t } from '../../../src/shared/i18n';
import { ContainerProviders } from '../../../src/ui/react/providers';
import { DashboardPage } from '../../../src/modules/home/ui/DashboardPage';
import { DEFAULT_DASHBOARD_SETTINGS, type WeatherData } from '../../../src/modules/home/core/board/types/model';
import type { BoardStore, BoardWeatherState } from '../../../src/modules/home/services/board-store';
import type { NativeSurfaceContext } from '../../../src/ui/native-surface';

// cmdk brings its own Radix copy, as in the production bundle; the owner-document adapter expects both.
import '../../../src/ui/components/command';
const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };

function extensions(doc: Document) {
	const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
	const define = (name: string, descriptor: PropertyDescriptor) => {
		if (!Object.getOwnPropertyDescriptor(proto, name)) Object.defineProperty(proto, name, { configurable: true, ...descriptor });
	};
	define('win', { get(this: HTMLElement) { return this.ownerDocument.defaultView; } });
	define('doc', { get(this: HTMLElement) { return this.ownerDocument; } });
	define('addClass', { value(this: HTMLElement, ...names: string[]) { this.classList.add(...names); } });
	define('removeClass', { value(this: HTMLElement, ...names: string[]) { this.classList.remove(...names); } });
	define('empty', { value(this: HTMLElement) { this.replaceChildren(); } });
	define('onWindowMigrated', { value: () => () => {} });
	define('createEl', { value(this: HTMLElement, tag: string, options?: { cls?: string; text?: string }) {
		const el = this.ownerDocument.createElement(tag);
		if (options?.cls) el.className = options.cls;
		if (options?.text) el.textContent = options.text;
		this.append(el);
		return el;
	} });
	define('createDiv', { value(this: HTMLElement, options?: { cls?: string; text?: string }) { return this.createEl('div', options); } });
}
for (const doc of Object.values(docs)) extensions(doc);

const longCity = 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch 威尔士兰韦尔普尔古因吉尔戈格里奇韦尔恩德罗布尔';
const place = (cityName: string, latitude: number) => ({ cityName, latitude, longitude: 10, timezone: 'UTC' });
const forecast = (fetchedAt: number): WeatherData => ({
	temperature: 21, feelsLike: 20, humidity: 55, windSpeed: 9, weatherCode: 2, fetchedAt, timezone: 'UTC',
	dailyDates: ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'], dailyCodes: [2, 61, 3, 0, 95],
	dailyMax: [24, 19, 22, 26, 21], dailyMin: [15, 13, 14, 16, 14], dailyPrecipitation: [10, 80, 20, 0, 60], hourly: [],
});
const keyOf = (location: { latitude: number; longitude: number }) => `${location.latitude},${location.longitude}`;

/** One tile per weather situation the store can publish (and the two the page derives). */
const situations: { id: string; label: string; location: ReturnType<typeof place> | null; state?: (key: string, now: number) => BoardWeatherState | undefined }[] = [
	{ id: 'default', label: 'Unconfigured', location: null, state: () => ({ locationKey: '', status: 'unconfigured', data: null, error: '' }) },
	{ id: 'waiting', label: 'Waiting', location: place('Oslo', 1), state: undefined },
	{ id: 'loading', label: 'Loading', location: place('Lima', 2), state: (key) => ({ locationKey: key, status: 'loading', stage: 'fallback', data: null, error: '' }) },
	{ id: 'refreshing', label: 'Refreshing a saved forecast', location: place('Rome', 3), state: (key, now) => ({ locationKey: key, status: 'refreshing', stage: 'primary', data: forecast(now - 600000), error: '', fetchedAt: now - 600000 }) },
	{ id: 'ready', label: 'Ready', location: place(longCity, 4), state: (key, now) => ({ locationKey: key, status: 'ready', data: forecast(now - 60000), error: '', fetchedAt: now - 60000 }) },
	{ id: 'stale', label: 'Saved forecast out of date', location: place('Cairo', 5), state: (key, now) => ({ locationKey: key, status: 'ready', stale: true, data: forecast(now - 7200000), error: '', fetchedAt: now - 7200000 }) },
	{ id: 'timeout', label: 'Timed out, no forecast', location: place('Dakar', 6), state: (key) => ({ locationKey: key, status: 'error', errorCode: 'timeout', retryable: true, data: null, error: '' }) },
	{ id: 'offline', label: 'Offline, older forecast kept', location: place('Quito', 7), state: (key, now) => ({ locationKey: key, status: 'error', errorCode: 'network', retryable: true, data: forecast(now - 3600000), error: '', fetchedAt: now - 3600000 }) },
	{ id: 'invalid', label: 'Unreadable answer', location: place('Hanoi', 8), state: (key) => ({ locationKey: key, status: 'error', errorCode: 'invalid-response', retryable: true, data: null, error: '' }) },
	{ id: 'cancelled', label: 'Cancelled', location: place('Perth', 9), state: (key) => ({ locationKey: key, status: 'cancelled', retryable: true, data: null, error: '' }) },
	{ id: 'invalidated', label: 'Location changed during a request', location: place('Kyiv', 11), state: () => ({ locationKey: keyOf({ latitude: 99, longitude: 99 }), status: 'ready', data: forecast(1), error: '' }) },
];

function mountHome(doc: Document) {
	const now = Date.now();
	const calls = { weather: [] as [string, boolean][], cancel: [] as string[], edits: 0 };
	const weatherByInstance: Record<string, BoardWeatherState> = {};
	for (const item of situations) {
		const key = item.location ? keyOf(item.location) : '';
		const state = item.state?.(key, now);
		if (state) weatherByInstance[item.id] = state;
	}
	const widgets = situations.map((item) => ({
		memberId: `home:clock:${item.id}`, provider: 'home', kind: 'clock', instanceId: item.id, label: item.label, weather: item.location,
	}));
	const settings = structuredClone(DEFAULT_DASHBOARD_SETTINGS);
	settings.workspaces = { files: ['.huhu/dashboards/A', '.huhu/dashboards/B'], names: ['Work', 'A second board with a very long name 一个名字很长的看板'], active: 0 };
	const state = createStore(() => ({
		path: '.huhu/dashboards/A', settings, data: { quickActions: [], columns: [], widgets } as never, widgetRevision: 0, generation: 0,
		files: [], dialog: null as 'section' | null, switching: false, switchError: '', weatherByInstance, save: { status: 'saved' },
	}));
	const store: BoardStore = {
		view: () => store, state, widgets: {}, image: async () => '', setDialog() {}, setVisible() {},
		host: { app: { vault: { adapter: {} } }, openSettings() {}, switchWorkspace: async () => {}, createWorkspace: async () => {}, renameWorkspace: async () => {}, settings },
		sync: { setBoardGrid: async () => {}, setBoardMembers: async () => {}, addToCanvas: async () => {}, replaceData: async () => {}, deleteColumn: async () => {}, deleteCard: async () => {} },
		weather: async (id: string, force = false) => { calls.weather.push([id, force]); },
		cancelWeather: (id: string) => {
			calls.cancel.push(id);
			const current = state.getState().weatherByInstance[id];
			if (current) state.setState({ weatherByInstance: { ...state.getState().weatherByInstance, [id]: { ...current, status: 'cancelled', retryable: true, error: '' } } });
		},
		edit: async () => { calls.edits++; },
		cities: async () => [],
		switch: async () => {},
	} as unknown as BoardStore;
	const container = doc.createElement('section');
	container.dataset.review = 'home';
	container.classList.add('huhu-ui');
	doc.body.append(container);
	const context = { togglePanel() {}, openPageMenu() {}, changed() {} } as unknown as NativeSurfaceContext;
	const root: Root = createRoot(container);
	root.render(<ContainerProviders container={container}><DashboardPage store={store} context={context} /></ContainerProviders>);
	return { container, store, state, calls, root, dispose: () => root.unmount() };
}

Object.assign(window, {
	uiReview: {
		docs,
		situations: situations.map((item) => ({ id: item.id, label: item.label })),
		mounts: { main: mountHome(docs.main), other: mountHome(docs.other) },
		t,
		configure(language: 'en' | 'zh', theme: string) {
			setLanguage(language);
			for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
		},
		unmount() { for (const mount of Object.values((window as unknown as { uiReview: { mounts: unknown } }).uiReview.mounts as Record<string, { dispose(): void }>)) mount.dispose(); },
	},
});
