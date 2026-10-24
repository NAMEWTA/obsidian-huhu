import { afterEach, expect, test, vi } from 'vitest';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { contentFiles } from '../../../host/obsidian/storage/content-files';
import { setLanguage } from '../../../shared/i18n';
import { DEFAULT_DASHBOARD_SETTINGS } from '../core/board/types/model';
import { parse } from '../core/board/parser/parse';
import { weatherInstanceLocation } from '../core/board/weather-locations';
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

const board = '.huhu/dashboards/board.md';
const oldImmersive =
	'---\ncustom: keep\nlayout: immersive\nwidgets: [{"memberId":"home:banner:default","provider":"home","kind":"banner","instanceId":"default"},{"memberId":"home:pomodoro:default","provider":"home","kind":"pomodoro","instanceId":"default"}]\nimmersive: [{"id":"widget:banner","w":12,"cap":12,"x":0,"y":0},{"id":"widget:pomodoro","w":3,"cap":24,"x":0,"y":12},{"id":"section:Notes","w":9,"cap":48,"x":3,"y":12}]\nbanner:\n  quote: "Preserve old banner"\n  author: "A"\ncolumns:\n  - name: "Notes"\n    color: "#f59e0b"\n    type: memo\n---\n\n## Notes\n\n### One\nid: one\ntype: generic\nBody one.\n';
const oldStacked =
	'---\nlayout: stacked\nbanner:\n  quote: "Stacked banner"\n  author: "B"\n---\n\n## Notes\n\n### One\nid: one\ntype: generic\nBody one.\n';
const stores: BoardStore[] = [];
afterEach(async () => {
	for (const store of stores.splice(0)) await store.dispose();
});
async function open(text: string, extra: Partial<HomeHost['settings']> = {}) {
	setLanguage('en');
	const vault = memoryVault({ [board]: text }, window);
	await contentFiles(vault.app).refresh();
	const settings = { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), ...extra };
	const host = {
		app: vault.app,
		settings,
		subscribeSettings: () => () => {},
		workbenchRefresh: () => {},
	} as unknown as HomeHost;
	const store = new BoardStore(host, '.huhu/dashboards/board', window);
	stores.push(store);
	const process = vi.spyOn(vault.adapter, 'process');
	await store.init();
	return { vault, store, writes: () => process.mock.calls.filter(([path]) => path === board).length };
}

test('opening an old immersive board converts it once through the real entry: one write, the banner is dropped, every card stays', async () => {
	const { vault, store, writes } = await open(oldImmersive);
	const written = vault.contents.get(board)!;
	const data = parse(written);
	expect(writes()).toBe(1);
	expect(data.widgets?.map((member) => member.kind)).toEqual(['pomodoro']);
	expect(data.grid?.lg.find((tile) => tile.i === 'widget:pomodoro')).toMatchObject({ x: 0, w: 3, h: 3 });
	expect(data.grid?.lg.find((tile) => tile.i === 'section:Notes')).toMatchObject({ x: 3, w: 9, h: 5 });
	expect(data.grid?.lg.some((tile) => tile.i.includes('banner'))).toBe(false);
	for (const retired of ['layout:', 'immersive:', 'banner:', 'Preserve old banner'])
		expect(written).not.toContain(retired);
	expect(written).toContain('custom: keep');
	expect([...vault.contents].find(([path]) => path.startsWith('huhu/收件箱/'))?.[1]).toContain(
		'# One\nid: one\ntype: generic\nBody one.',
	);
	expect(data.columns[0]?.cards).toEqual([]);
	expect(store.state.getState().data?.grid).toEqual(data.grid);
	expect(store.state.getState().data?.widgets?.map((member) => member.kind)).toEqual(['pomodoro']);
});

test('a converted board is stable: reopening it writes nothing and a removed widget stays removed', async () => {
	const { vault, store } = await open(oldImmersive);
	await store.sync.setBoardMembers([]);
	const removed = vault.contents.get(board)!;
	expect(parse(removed).widgets).toEqual([]);
	expect(parse(removed).grid?.lg.map((tile) => tile.i)).toEqual(['section:Notes']);
	const reopened = await open(removed);
	expect(reopened.writes()).toBe(0);
	expect(reopened.vault.contents.get(board)).toBe(removed);
	expect(reopened.store.state.getState().data?.widgets).toEqual([]);
});

test('an old stacked board converts with the sidebar widgets the old settings had enabled and the quick-notes bar it showed', async () => {
	const { vault } = await open(oldStacked, {
		legacyWidgetMembers: [
			{ memberId: 'home:calendar:default', provider: 'home', kind: 'calendar', instanceId: 'default' },
		],
		quickNotesEnabled: true,
	});
	const written = parse(vault.contents.get(board)!);
	expect(written.widgets?.map((member) => member.kind)).toEqual(['calendar', 'quick-actions']);
	expect(written.grid?.lg.find((tile) => tile.i === 'widget:calendar')).toMatchObject({ w: 6, h: 4 });
	expect([...vault.contents].find(([path]) => path.startsWith('huhu/收件箱/'))?.[1]).toContain('Body one.');
	expect(vault.contents.get(board)).not.toContain('Stacked banner');
});

const retiredCapture =
	'---\nwidgets: [{"memberId":"home:clock:default","provider":"home","kind":"clock","instanceId":"default"},{"memberId":"home:quickCapture:default","provider":"home","kind":"quickCapture","instanceId":"default"}]\ngrid: {"v":2,"lg":[{"i":"widget:clock","x":0,"y":0,"w":3,"h":2},{"i":"widget:quickCapture","x":6,"y":0,"w":6,"h":2}]}\n---\n';

test('opening a board that still lists the retired fleeting-capture widget replaces it with the inbox once; reopening writes nothing', async () => {
	const { vault, store, writes } = await open(retiredCapture);
	const written = vault.contents.get(board)!;
	const data = parse(written);
	expect(writes()).toBe(1);
	expect(data.widgets?.map((member) => member.kind)).toEqual(['clock']);
	expect(data.columns.map((column) => [column.name, column.sectionType])).toEqual([['Inbox', 'memo']]);
	expect(data.grid?.lg.find((tile) => tile.i === 'section:Inbox')).toMatchObject({ x: 6, y: 0, w: 6, h: 2 });
	expect(written).not.toContain('quickCapture');
	expect(store.state.getState().data?.columns.map((column) => column.sectionType)).toEqual(['memo']);
	const reopened = await open(written);
	expect(reopened.writes()).toBe(0);
	expect(reopened.vault.contents.get(board)).toBe(written);
});

test.each(['grid', 'members', 'add', 'replace'] as const)(
	'an explicit %s edit keeps migrated clock weather locations and unknown metadata',
	async (edit) => {
		const source =
			'---\ncustom: keep\nwidgets: [{memberId: old-weather, provider: home, kind: weather, instanceId: default, private: retain}, {memberId: configured-weather, provider: home, kind: weather, instanceId: configured, weather: {cityName: 深圳, latitude: 22.54, longitude: 114.06}}, {memberId: invalid-weather, provider: home, kind: weather, instanceId: invalid, weather: null}]\ngrid: {v: 2, lg: [{i: "widget:weather", x: 0, y: 0, w: 3, h: 2}], md: [{i: "widget:weather", x: 0, y: 0, w: 3, h: 2}]}\n---\n\nOriginal body.\n';
		const { vault, store, writes } = await open(source, {
			widgetWeatherCity: '广州',
			widgetWeatherLat: 23.13,
			widgetWeatherLon: 113.26,
		});
		expect(writes()).toBe(1);
		expect(parse(vault.contents.get(board)!).widgets?.every((m) => m.kind === 'clock')).toBe(true);
		expect(
			weatherInstanceLocation(store.state.getState().data, store.host.settings, 'weather-old-weather')?.cityName,
		).toBe('广州');
		const before = structuredClone(store.state.getState().data!);
		if (edit === 'grid') await store.sync.setBoardGrid({ lg: [{ ...before.grid!.lg[0]!, x: 3 }] });
		else if (edit === 'members') await store.sync.setBoardMembers([...before.widgets!].reverse());
		else if (edit === 'add')
			await store.sync.addToCanvas(
				{ member: { memberId: 'clock', provider: 'home', kind: 'clock', instanceId: 'default' } },
				{ w: 3, h: 2 },
			);
		else
			await store.sync.replaceData({
				...before,
				quickActions: [{ name: 'Note', icon: 'file-text', type: 'file', target: 'Note.md' }],
			});
		const written = vault.contents.get(board)!;
		const reopened = parse(written);
		expect(
			reopened.widgets!.find((member) => member.memberId === 'old-weather' && member.kind === 'clock')?.weather,
		).toEqual({ cityName: '广州', latitude: 23.13, longitude: 113.26 });
		expect(reopened.widgets!.find((member) => member.memberId === 'configured-weather')?.weather?.cityName).toBe(
			'深圳',
		);
		expect(reopened.widgets!.find((member) => member.memberId === 'invalid-weather')?.weather).toBeNull();
		expect(reopened.grid?.md).toEqual(before.grid!.md);
		expect(written).toContain('private: retain');
		expect(written).toContain('Original body.');
		expect(written).toContain('custom: keep');
		const changedSettings = {
			...store.host.settings,
			widgetWeatherCity: '北京',
			widgetWeatherLat: 39.9,
			widgetWeatherLon: 116.4,
		};
		expect(weatherInstanceLocation(reopened, changedSettings, 'weather-old-weather')?.cityName).toBe('广州');
		expect(weatherInstanceLocation(parse(source), changedSettings)?.cityName).toBe('北京');
	},
);
