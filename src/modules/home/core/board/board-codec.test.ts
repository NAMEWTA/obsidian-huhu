import { expect, test } from 'vitest';

import { readBoardMembers, readLegacyTiles } from './board-codec';
import { serializeGrid } from './grid';
import { parse, serialize } from './parser/parse';
import { splitFrontmatter } from './parser/generate-default-markdown';
import { withStableSectionIds } from './section-identity';
import { weatherInstanceLocation } from './weather-locations';
import { widgetPresentationKey } from './widget-members';
import { DEFAULT_DASHBOARD_SETTINGS } from './types/model';

const frontGrid = (text: string) => splitFrontmatter(text).frontmatter.grid as { lg: Record<string, unknown>[]; md?: Record<string, unknown>[] };

test('weather locations and distinct tile geometry survive Markdown edits and reopening without changing the legacy singleton id', () => {
	const source = '---\ncustom: keep\nwidgets: [{memberId: "home:weather:default", provider: home, kind: weather, instanceId: default, private: retain}]\ngrid: {v: 2, lg: [{i: "widget:weather", x: 0, y: 0, w: 3, h: 2}]}\n---\n\n## Notes\nOriginal note body.\n';
	const board = parse(source);
	expect(serialize(board)).toBe(source);
	expect(weatherInstanceLocation(board, DEFAULT_DASHBOARD_SETTINGS)?.cityName).toBe('Shanghai');
	const first = board.widgets![0]!;
	first.weather = { cityName: '广州', latitude: 23.13, longitude: 113.26, admin1: '广东省', country: '中国' };
	board.widgets!.push({ memberId: 'home:weather:shenzhen', provider: 'home', kind: 'weather', instanceId: 'shenzhen', weather: { cityName: '深圳', latitude: 22.54, longitude: 114.06 } });
	expect(board.widgets!.map(widgetPresentationKey)).toEqual(['weather', 'weather-shenzhen']);
	board.grid!.lg.push({ i: 'widget:weather-shenzhen', x: 3, y: 0, w: 3, h: 2 });
	const written = serialize(board), reopened = parse(written);
	expect(reopened.widgets).toEqual(board.widgets);
	expect(reopened.grid).toEqual(board.grid);
	expect(written).toContain('private: retain');
	expect(written).toContain('Original note body.');
	expect(serialize(reopened)).toBe(written);
	const otherBoard = parse(source);
	expect(weatherInstanceLocation(otherBoard, DEFAULT_DASHBOARD_SETTINGS)?.cityName).toBe('Shanghai');
	reopened.widgets = reopened.widgets!.filter((member) => member.instanceId !== 'default');
	expect(weatherInstanceLocation(parse(serialize(reopened)), DEFAULT_DASHBOARD_SETTINGS, 'shenzhen')?.cityName).toBe('深圳');
});

test('an invalid explicit weather location remains a request to choose a location, not a fallback city', () => {
	const widgets = readBoardMembers([{ memberId: 'w', provider: 'home', kind: 'weather', instanceId: 'default', weather: { cityName: 'Bad', latitude: 1000, longitude: 0 } }]);
	expect(widgets?.[0]?.weather).toBeNull();
	expect(weatherInstanceLocation({ widgets, columns: [], quickActions: [] }, DEFAULT_DASHBOARD_SETTINGS)).toBeNull();
});

test('invalid saved geometry is repaired in memory without changing the original bytes', () => {
	const source =
		'---\r\ngrid: {v: 2, lg: [{i: external, x: -1, y: 0, w: 99, h: 0}]}\r\n---\r\n';
	const data = parse(source);
	expect(data.grid).toEqual({ v: 2, lg: [{ i: 'external', x: 0, y: 0, w: 12, h: 1 }] });
	expect(serialize(data)).toBe(source);
});

test('an unrelated edit leaves the hand-written grid bytes alone; an explicit geometry edit commits the normalized grid once', () => {
	const source =
		'---\ncustom: keep\ngrid: {v: 2, lg: [{i: "widget:clock", x: 0, y: 0, w: 14, h: 2, note: keep this}, {i: fine, x: 3, y: 0, w: 3, h: 2}]} # my layout\nquickActions:\n  - name: "A"\n    icon: "file-text"\n    type: file\n    target: "a.md"\n---\n\n<!-- personal body -->\n';
	const data = parse(source);
	expect(data.grid!.lg.map((item) => item.w)).toEqual([12, 3]);
	expect(serialize(data)).toBe(source);
	data.quickActions[0]!.name = 'B';
	const contentOnly = serialize(data);
	expect(contentOnly).toContain('w: 14');
	expect(contentOnly).toContain('# my layout');
	expect(contentOnly).toContain('name: B');
	// moving a tile is the explicit edit: the grid is written normalized, as one line of JSON
	data.grid = { v: 2, lg: [{ i: 'widget:clock', x: 0, y: 2, w: 12, h: 2 }, { i: 'fine', x: 0, y: 0, w: 3, h: 2 }] };
	const updated = serialize(data);
	expect(updated).toContain(`grid: ${serializeGrid(data.grid)}`);
	expect(updated).toContain('custom: keep');
	expect(updated).toContain('<!-- personal body -->\n');
	expect(parse(updated).grid).toEqual(data.grid);
	expect(serialize(parse(updated))).toBe(updated);
});

test('the one-column and six-column layouts are stored only once they exist', () => {
	const data = parse('---\ngrid: {"v":2,"lg":[{"i":"a","x":0,"y":0,"w":3,"h":2}]}\n---\n');
	expect(data.grid!.md).toBeUndefined();
	data.grid = { ...data.grid!, md: [{ i: 'a', x: 0, y: 0, w: 3, h: 2 }] };
	const written = serialize(data);
	expect(frontGrid(written).md).toEqual([{ i: 'a', x: 0, y: 0, w: 3, h: 2 }]);
	expect(written).not.toContain('"sm"');
	expect(parse(written).grid!.md).toEqual(data.grid.md);
});

test('old coarse heights are read once for the conversion, never written', () => {
	const source =
		'---\ncustom: keep\nimmersive:\n  - id: unknown-provider\n    w: 14\n    h: 2\n    x: 0\n    y: 7\n    note: keep this\n  - id: fine\n    w: 2\n    cap: 3\n---\n\n<!-- personal body -->\n';
	const data = parse(source);
	expect(data.grid).toBeUndefined();
	expect(data.legacyTiles).toEqual([
		{ id: 'unknown-provider', w: 12, cap: 20, x: 0, y: 7 },
		{ id: 'fine', w: 2, cap: 3 },
	]);
	expect(readLegacyTiles(undefined)).toBeUndefined();
});

test('member identity preserves unknown per-instance properties while reordering and retains missing providers', () => {
	const source =
		'---\nwidgets:\n  - memberId: first\n    provider: missing\n    kind: custom\n    instanceId: shared\n    private: alpha\n  - memberId: second\n    provider: home\n    kind: calendar\n    instanceId: default\n    private: beta\n---\n';
	const data = parse(source);
	expect(serialize(data)).toBe(source);
	data.widgets?.reverse();
	const members = splitFrontmatter(serialize(data)).frontmatter.widgets as Array<Record<string, unknown>>;
	expect(members.map((m) => [m.memberId, m.private])).toEqual([
		['second', 'beta'],
		['first', 'alpha'],
	]);
	expect(readBoardMembers([])).toEqual([]);
});

test('tile bounds repair partial and non-finite old coordinates without deleting the tile', () => {
	expect(
		readLegacyTiles([
			{ id: 'a', w: Infinity, cap: 0, x: 1 },
			{ id: 'b', w: 0, cap: 999, x: 2, y: Infinity },
			{ id: 'c', w: 2, cap: 3, x: 0, y: 0, fixed: true },
		]),
	).toEqual([
		{ id: 'a', w: 3, cap: 3 },
		{ id: 'b', w: 1, cap: 240 },
		{ id: 'c', w: 2, cap: 3, x: 0, y: 0, fixed: true },
	]);
});

test('layout edits allocate internal section identities without rewriting placement keys', () => {
	const source =
		'---\ngrid: {"v":2,"lg":[{"i":"section:Notes","x":0,"y":0,"w":6,"h":4}]}\n---\n\n## Notes\n\n### Personal card\nid: card-one\ntype: generic\nKeep this body.\n';
	const parsed = parse(source);
	expect(parsed.columns[0]?.id).toBeUndefined();
	let serial = 0;
	const edited = withStableSectionIds(parsed, () => `section-${++serial}`);
	expect(edited.grid?.lg[0]?.i).toBe('section:Notes');
	expect(withStableSectionIds(edited, () => `section-${++serial}`).columns[0]?.id).toBe('section-1');
	expect(serial).toBe(1);
	const reloaded = parse(serialize(edited));
	reloaded.columns[0]!.name = 'Renamed';
	const renamed = parse(serialize(reloaded));
	expect(renamed.columns[0]?.id).toBe('section-1');
	expect(renamed.grid?.lg[0]?.i).toBe('section:Notes');
	expect(renamed.columns[0]?.cards[0]?.title).toBe('Personal card');
});

test('new section identities cannot consume IDs already used by later sections or other tiles', () => {
	const data = parse('## New\n\n## Existing\n');
	data.columns[1]!.id = 'section-1';
	data.widgets = [{ memberId: 'section-2', provider: 'home', kind: 'calendar', instanceId: 'default' }];
	data.grid = { v: 2, lg: [{ i: 'section-4', x: 0, y: 0, w: 3, h: 2 }] };
	let serial = 0;
	const edited = withStableSectionIds(data, () => `section-${++serial}`);
	expect(edited.columns.map((column) => column.id)).toEqual(['section-3', 'section-1']);
});
