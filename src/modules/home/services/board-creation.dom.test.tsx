import { afterEach, expect, test, vi } from 'vitest';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { contentFiles } from '../../../host/obsidian/storage/content-files';
import { parse } from '../core/board/parser/parse';
import { DEFAULT_DASHBOARD_SETTINGS, type DashboardSettings } from '../core/board/types/model';
import { weatherInstanceLocation } from '../core/board/weather-locations';
import { BoardRegistry } from './board-registry';
import { BoardStore } from './board-store';
import type { HomeHost } from './home-host';

vi.mock('obsidian', async (original) => ({
	...(await original<typeof import('obsidian')>()),
	Component: class {
		load() {}
		unload() {}
	},
}));
vi.mock('./instances', () => ({ homeServices: {} }));

const stores: BoardStore[] = [];
afterEach(async () => {
	for (const store of stores.splice(0)) await store.dispose();
});

async function open(vault: ReturnType<typeof memoryVault>, settings: DashboardSettings) {
	const host = {
		app: vault.app,
		settings,
		subscribeSettings: () => () => {},
		workbenchRefresh: () => {},
	} as unknown as HomeHost;
	const store = new BoardStore(host, settings.dashboardFile, window);
	stores.push(store);
	await store.init();
	return store;
}

test.each(['registry', 'missing'] as const)(
	'a board created through %s persists its initial weather location across reopening with a different default',
	async (entry) => {
		const settings: DashboardSettings = {
			...structuredClone(DEFAULT_DASHBOARD_SETTINGS),
			dashboardFile: '.huhu/dashboards/board',
			workspaceFiles: [],
			workspaceNames: [],
			widgetWeatherCity: '广州',
			widgetWeatherLat: 23.12,
			widgetWeatherLon: 113.26,
		};
		const expected = { cityName: '广州', latitude: 23.12, longitude: 113.26 };
		const vault = memoryVault({}, window);
		await contentFiles(vault.app).refresh();
		if (entry === 'registry') {
			const registry = new BoardRegistry({
				app: vault.app,
				read: () => settings,
				settings: () => settings,
				write: async (next) => {
					Object.assign(settings, next);
				},
				repointAll: async () => {},
				refreshAll: () => {},
			});
			await registry.create('First');
		}
		const store = await open(vault, settings);
		const path = `${settings.dashboardFile}.md`;
		const created = vault.contents.get(path)!;
		expect(parse(created).widgets?.find((member) => member.kind === 'clock')?.weather).toEqual(expected);
		expect(weatherInstanceLocation(store.state.getState().data, settings)).toEqual(expected);

		const changed = { ...settings, widgetWeatherCity: '深圳', widgetWeatherLat: 22.54, widgetWeatherLon: 114.06 };
		const restarted = memoryVault(Object.fromEntries(vault.contents), window);
		const reopened = await open(restarted, changed);
		expect(weatherInstanceLocation(reopened.state.getState().data, changed)).toEqual(expected);
		expect(restarted.contents.get(path)).toBe(created);
	},
);

test('an unseeded vault creates exactly one canonical board across concurrent first opens and reopening', async () => {
	const vault = memoryVault({}, window);
	const settings = structuredClone(DEFAULT_DASHBOARD_SETTINGS);
	expect([...vault.contents]).toEqual([]);
	const [one, two] = await Promise.all([open(vault, settings), open(vault, settings)]);
	const path = '.huhu/dashboards/dashboard.md',
		created = vault.contents.get(path)!;
	expect(created.length).toBeGreaterThan(0);
	expect(one.state.getState().path).toBe('.huhu/dashboards/dashboard');
	expect(two.state.getState().path).toBe('.huhu/dashboards/dashboard');
	expect([...vault.contents.keys()].filter((path) => path.endsWith('.md'))).toEqual([path]);
	await one.dispose();
	await two.dispose();
	stores.splice(0);
	const restarted = memoryVault(Object.fromEntries(vault.contents), window);
	await open(restarted, settings);
	expect(restarted.contents.get(path)).toBe(created);
});

test('a failed first create preserves unrelated data and can be retried', async () => {
	const vault = memoryVault({ '笔记/keep.md': 'kept' }, window),
		copy = vault.adapter.copy;
	vi.spyOn(vault.adapter, 'copy').mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EACCES' }));
	await expect(open(vault, structuredClone(DEFAULT_DASHBOARD_SETTINGS))).rejects.toMatchObject({
		stage: 'create',
		cause: { code: 'EACCES' },
	});
	expect(vault.contents.get('笔记/keep.md')).toBe('kept');
	expect(vault.contents.has('.huhu/dashboards/dashboard.md')).toBe(false);
	vault.adapter.copy = copy;
	await open(vault, structuredClone(DEFAULT_DASHBOARD_SETTINGS));
	expect(vault.contents.get('.huhu/dashboards/dashboard.md')).toBeTruthy();
});

test('ordinary note renames retain their native path contract while a board is open', async () => {
	const vault = memoryVault({ 'Notes/old.md': 'kept' }, window);
	const store = await open(vault, structuredClone(DEFAULT_DASHBOARD_SETTINGS));
	await store.sync.addQuickAction({ type: 'file', target: 'Notes/old', name: 'Old', icon: 'file' });
	await vault.adapter.rename('Notes/old.md', 'Notes/new.md');
	expect(() => vault.emit('rename', vault.file('Notes/new.md'), 'Notes/old.md')).not.toThrow();
	await store.sync.flush();
	expect(store.sync.getData()?.quickActions.some((action) => action.target === 'Notes/new.md')).toBe(true);
	expect(vault.contents.get('Notes/new.md')).toBe('kept');
});
