import { expect, test } from 'vitest';
import {
	convertToGrid,
	defaultCanvas,
	defaultCanvasMembers,
	hasRetiredWidgets,
	needsGridConversion,
	replaceRetiredWidgets,
} from './canvas';
import { parse, serialize } from './parser/parse';
import { generateDefaultMarkdown } from './parser/default-document';
import { splitFrontmatter } from './parser/generate-default-markdown';
import { boardTileSources, tileSpecs } from './board-tiles';
import { layoutsFor, type GridItem } from './grid';
import { setLanguage } from '../../../../shared/i18n';
import { widgetPresentationKey } from './widget-members';
import { builtinTileDefaults } from './canvas';

const overlap = (a: GridItem, b: GridItem) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const noOverlap = (items: readonly GridItem[]) =>
	items.every((a, index) => items.slice(index + 1).every((b) => !overlap(a, b)));

const body =
	'\n## Notes\n\n### One\nid: one\ntype: generic\nFirst body, kept word for word.\n\n### Two\nid: two\ntype: generic\nSecond body.\n\n## Todo\n\n### Tasks\nid: tasks\ntype: task\n- [ ] Ship it\n';
const oldImmersive = `---
custom: keep
layout: immersive
canvas: 1
widgets: [{"memberId":"home:banner:default","provider":"home","kind":"banner","instanceId":"default"},{"memberId":"home:pomodoro:default","provider":"home","kind":"pomodoro","instanceId":"default"},{"memberId":"home:calendar:default","provider":"home","kind":"calendar","instanceId":"default"}]
immersive: [{"id":"widget:banner","w":12,"cap":12,"x":0,"y":0},{"id":"widget:pomodoro","w":3,"cap":24,"x":0,"y":12},{"id":"widget:calendar","w":4,"cap":50,"x":4,"y":12},{"id":"section:Notes","w":8,"cap":48,"x":0,"y":62},{"id":"section:Todo","w":4,"cap":48,"x":8,"y":62}]
banner:
  quote: "Old banner quote"
  author: "A"
columns:
  - name: "Notes"
    color: "#f59e0b"
    type: memo
  - name: "Todo"
    color: "#6366f1"
    type: todo
---
${body}`;

test('an old board is not on the grid yet; one with a grid is', () => {
	expect(needsGridConversion(parse(oldImmersive))).toBe(true);
	expect(needsGridConversion(parse('---\ngrid: {"v":2,"lg":[]}\n---\n'))).toBe(false);
	// another grid version is not this grid: the board converts
	expect(needsGridConversion(parse('---\ngrid: {"v":3,"lg":[]}\n---\n'))).toBe(true);
});

test('converting an old immersive board keeps its tiles in place (rows re-measured), drops the banner and keeps every card', () => {
	const old = parse(oldImmersive);
	expect(old.legacyTiles?.map((tile) => tile.id)).toContain('widget:banner');
	const converted = convertToGrid(old, undefined);
	expect(converted.widgets?.map((m) => m.kind)).toEqual(['pomodoro', 'calendar']);
	expect(converted.legacyTiles).toBeUndefined();
	expect(converted.columns).toEqual(old.columns);
	const lg = converted.grid!.lg;
	expect(lg.map((tile) => tile.i).sort()).toEqual([
		'section:Notes',
		'section:Todo',
		'widget:calendar',
		'widget:pomodoro',
	]);
	expect(lg.some((tile) => tile.i.includes('banner'))).toBe(false);
	expect(noOverlap(lg)).toBe(true);
	// calendar: 4 columns at x 4 stay; cap 50 rows (500px) is 5 rows of 96px
	expect(lg.find((tile) => tile.i === 'widget:calendar')).toMatchObject({ x: 4, w: 4, h: 5 });
	// pomodoro: cap 24 rounds to 3 rows
	expect(lg.find((tile) => tile.i === 'widget:pomodoro')).toMatchObject({ x: 0, w: 3, h: 3 });
	// the sections keep their split (8 + 4 columns) and their height; compaction lifts the right one into the free space
	const notes = lg.find((tile) => tile.i === 'section:Notes')!,
		todo = lg.find((tile) => tile.i === 'section:Todo')!;
	expect([notes.x, notes.w, todo.x, todo.w]).toEqual([0, 8, 8, 4]);
	expect(notes.h).toBe(5);
	expect(todo.h).toBe(5);
});

test('the converted file drops every retired key, keeps the rest byte for byte and is stable', () => {
	const converted = convertToGrid(parse(oldImmersive), undefined);
	const written = serialize(converted);
	const front = splitFrontmatter(written).frontmatter;
	for (const retired of ['layout', 'canvas', 'immersive', 'banner', 'banners', 'gridPacked'])
		expect(front, retired).not.toHaveProperty(retired);
	expect(front.custom).toBe('keep');
	expect(front.grid).toMatchObject({ v: 2 });
	expect((front.widgets as { kind: string }[]).map((m) => m.kind)).toEqual(['pomodoro', 'calendar']);
	// section configuration and card text are content, not layout: they survive untouched
	expect(front.columns).toEqual([
		{ name: 'Notes', color: '#f59e0b', type: 'memo' },
		{ name: 'Todo', color: '#6366f1', type: 'todo' },
	]);
	expect(written.endsWith(body)).toBe(true);
	expect(written).not.toContain('Old banner quote');
	// the grid is written as one line of JSON, even when it is patched into an existing file
	const line = written.split('\n').find((text) => text.startsWith('grid:'))!;
	expect(line).toBe(`grid: ${JSON.stringify(converted.grid)}`);
	// idempotent: reading the file back and writing it again changes nothing
	const again = parse(written);
	expect(needsGridConversion(again)).toBe(false);
	expect(again.grid).toEqual(converted.grid);
	expect(serialize(again)).toBe(written);
	expect(serialize(parse(serialize(again)))).toBe(written);
});

test('a board with no geometry at all (side or stacked layout) is laid out from the default sizes, in order', () => {
	const old = parse('---\nlayout: stacked\nbanner:\n  quote: "Q"\n---\n' + body);
	const members = [
		{ memberId: 'home:calendar:default', provider: 'home', kind: 'calendar', instanceId: 'default' },
		{ memberId: 'home:clock:default', provider: 'home', kind: 'clock', instanceId: 'default' },
		{ memberId: 'home:pomodoro:default', provider: 'home', kind: 'pomodoro', instanceId: 'default' },
	];
	const converted = convertToGrid(old, members);
	expect(converted.widgets?.map((m) => m.kind)).toEqual(['calendar', 'clock', 'pomodoro']);
	const lg = converted.grid!.lg;
	expect(lg.find((tile) => tile.i === 'widget:calendar')).toMatchObject({ x: 0, y: 0, w: 6, h: 4 });
	// the two small widgets sit side by side in the first free spots; sections follow
	expect(lg.find((tile) => tile.i === 'widget:clock')).toMatchObject({ x: 6, y: 0, w: 6, h: 2 });
	expect(lg.find((tile) => tile.i === 'widget:pomodoro')).toMatchObject({ x: 6, y: 2, w: 3, h: 2 });
	expect(lg.some((tile) => tile.i === 'section:Notes')).toBe(true);
	expect(noOverlap(lg)).toBe(true);
	expect(serialize(converted).endsWith(body)).toBe(true);
	// without a remembered widget list the old sidebar defaults come back, minus the banner
	expect(convertToGrid(old, undefined).widgets?.map((m) => m.kind)).toEqual([
		'calendar',
		'quick-actions',
		'pomodoro',
	]);
});

test('the old quick-notes bar becomes the quick-notes widget when it was on', () => {
	const old = parse('---\nlayout: stacked\n---\n' + body);
	const converted = convertToGrid(old, [], builtinTileDefaults, { quickNotes: true });
	expect(converted.widgets?.map((m) => m.kind)).toEqual(['quick-notes']);
	expect(converted.grid!.lg.find((tile) => tile.i === 'widget:quick-notes')).toMatchObject({ w: 6, h: 2 });
	expect(convertToGrid(old, [], builtinTileDefaults).widgets).toEqual([]);
});

test('a removed widget stays removed: a converted board is never converted again', () => {
	const converted = convertToGrid(parse(oldImmersive), undefined);
	const reread = parse(serialize(converted));
	const removed = { ...reread, widgets: reread.widgets!.filter((m) => m.kind !== 'pomodoro') };
	const written = serialize(removed);
	expect(needsGridConversion(parse(written))).toBe(false);
	expect(parse(written).widgets?.map((m) => m.kind)).toEqual(['calendar']);
});

test('a new board is on the grid from the start: calendar and to-do, a medium clock weather and two small widgets, projects, memo and quick notes', () => {
	setLanguage('en');
	const data = parse(generateDefaultMarkdown());
	expect(needsGridConversion(data)).toBe(false);
	expect(data.widgets?.map(widgetPresentationKey)).toEqual(defaultCanvasMembers().map(widgetPresentationKey));
	expect(data.widgets?.map((m) => m.kind)).toEqual(['calendar', 'clock', 'pomodoro', 'usage', 'quick-actions']);
	const lg = data.grid!.lg;
	expect(lg).toHaveLength(data.widgets!.length + data.columns.length);
	expect(noOverlap(lg)).toBe(true);
	const at = (id: string) => lg.find((tile) => tile.i === id)!;
	const todo = lg.find((tile) => tile.i.startsWith('section:') && tile.w === 6 && tile.h === 4)!;
	expect([
		at('widget:calendar').x,
		at('widget:calendar').y,
		at('widget:calendar').w,
		at('widget:calendar').h,
	]).toEqual([0, 0, 6, 4]);
	expect([todo.x, todo.y]).toEqual([6, 0]);
	for (const [id, x] of [
		['widget:clock', 0],
		['widget:pomodoro', 6],
		['widget:usage', 9],
	] as const)
		expect([at(id).x, at(id).y, at(id).w, at(id).h], id).toEqual([x, 4, id === 'widget:clock' ? 6 : 3, 2]);
	expect(lg.filter((tile) => tile.w === 12).map((tile) => [tile.y, tile.h])).toEqual([[6, 4]]);
	expect([
		at('widget:quickActions').x,
		at('widget:quickActions').y,
		at('widget:quickActions').w,
		at('widget:quickActions').h,
	]).toEqual([6, 10, 6, 2]);
	expect(serialize(data)).toBe(generateDefaultMarkdown());
});

test('the default layout is symmetric: every row holds tiles of one height and the rows fill the 12 columns', () => {
	setLanguage('en');
	const lg = parse(generateDefaultMarkdown()).grid!.lg;
	const rows = new Map<number, GridItem[]>();
	for (const tile of lg) rows.set(tile.y, [...(rows.get(tile.y) ?? []), tile]);
	expect(rows.size).toBe(4);
	for (const [y, tiles] of rows) {
		expect(new Set(tiles.map((tile) => tile.h)).size, `row ${y} height`).toBe(1);
		expect(
			tiles.reduce((sum, tile) => sum + tile.w, 0),
			`row ${y} width`,
		).toBe(12);
	}
	// laid out for the page, no tile is moved by compaction, at 12 columns
	const board = parse(generateDefaultMarkdown());
	const specs = tileSpecs(boardTileSources(board, board.widgets ?? []), builtinTileDefaults);
	expect(layoutsFor(board.grid, specs).lg.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))).toEqual(
		specs.map((spec) => lg.find((tile) => tile.i === spec.id)),
	);
});

test('defaultCanvas lays out sections by type and ignores sections it has no slot for', () => {
	const board = defaultCanvas(
		parse('---\ncolumns: [{name: Notes, type: memo}, {name: Other, type: sticky}]\n---\n## Notes\n\n## Other\n'),
	);
	expect(board.grid!.lg.map((tile) => tile.i)).toContain('section:Notes');
	expect(board.grid!.lg.map((tile) => tile.i)).not.toContain('section:Other');
});

const capturing = (columns: string, headings = '') =>
	`---\nwidgets: [{"memberId":"home:clock:default","provider":"home","kind":"clock","instanceId":"default"},{"memberId":"home:quickCapture:default","provider":"home","kind":"quickCapture","instanceId":"default"}]\ngrid: {"v":2,"lg":[{"i":"widget:clock","x":0,"y":0,"w":3,"h":2},{"i":"widget:quickCapture","x":6,"y":0,"w":6,"h":2}],"md":[{"i":"widget:quickCapture","x":0,"y":0,"w":6,"h":2}]}\n${columns}---\n${headings}`;

test('the retired fleeting-capture widget gives way to the inbox section, which takes its place and size', () => {
	setLanguage('en');
	const board = parse(capturing(''));
	expect(hasRetiredWidgets(board)).toBe(true);
	const next = replaceRetiredWidgets(board);
	expect(hasRetiredWidgets(next)).toBe(false);
	expect(next.widgets?.map((member) => member.kind)).toEqual(['clock']);
	expect(next.columns).toEqual([{ name: 'Inbox', color: '#f59e0b', sectionType: 'memo', cards: [] }]);
	expect(next.grid?.lg).toEqual([
		{ i: 'widget:clock', x: 0, y: 0, w: 3, h: 2 },
		{ i: 'section:Inbox', x: 6, y: 0, w: 6, h: 2 },
	]);
	expect(next.grid?.md).toEqual([{ i: 'section:Inbox', x: 0, y: 0, w: 6, h: 2 }]);
	// the heir is a real tile of the board
	const sources = boardTileSources(next, next.widgets ?? []);
	expect(sources.map((source) => source.id)).toEqual(['widget:clock', 'section:Inbox']);
	expect(replaceRetiredWidgets(next)).toBe(next);
});

test('a board that already has an inbox section only loses the retired widget; a taken name is not reused', () => {
	setLanguage('en');
	const withInbox = parse(
		capturing('columns:\n  - name: "Notes"\n    color: "#f59e0b"\n    type: memo\n', '\n## Notes\n'),
	);
	const next = replaceRetiredWidgets(withInbox);
	expect(next.columns).toEqual(withInbox.columns);
	expect(next.grid?.lg.map((item) => item.i)).toEqual(['widget:clock']);
	expect(next.grid?.md).toEqual([]);
	const clash = parse(
		capturing('columns:\n  - name: "Inbox"\n    color: "#6366f1"\n    type: todo\n', '\n## Inbox\n'),
	);
	expect(replaceRetiredWidgets(clash).columns.map((column) => column.name)).toEqual(['Inbox', 'Inbox 2']);
	expect(replaceRetiredWidgets(clash).grid?.lg.map((item) => item.i)).toContain('section:Inbox 2');
});

test('an old immersive board that listed the retired widget converts with the inbox in its place', () => {
	setLanguage('en');
	const old = parse(
		'---\nlayout: immersive\nwidgets: [{"memberId":"home:quickCapture:default","provider":"home","kind":"quickCapture","instanceId":"default"}]\nimmersive: [{"id":"widget:quickCapture","w":6,"cap":24,"x":6,"y":12}]\n---\n',
	);
	const next = replaceRetiredWidgets(convertToGrid(old, undefined));
	expect(next.widgets).toEqual([]);
	expect(next.columns.map((column) => column.sectionType)).toEqual(['memo']);
	expect(next.grid?.lg).toHaveLength(1);
	expect(next.grid?.lg[0]).toMatchObject({ i: 'section:Inbox', x: 6, w: 6 });
});
