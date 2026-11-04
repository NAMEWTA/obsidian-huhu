import { expect, test } from 'vitest';
import { defaultCanvas, defaultCanvasMembers } from './canvas';
import { parse, serialize } from './parser/parse';
import { generateDefaultMarkdown } from './parser/default-document';
import { boardTileSources, tileSpecs } from './board-tiles';
import { layoutsFor, type GridItem } from './grid';
import { setLanguage } from '../../../../shared/i18n';
import { widgetPresentationKey } from './widget-members';
import { builtinTileDefaults } from './canvas';

const overlap = (a: GridItem, b: GridItem) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const noOverlap = (items: readonly GridItem[]) =>
	items.every((a, index) => items.slice(index + 1).every((b) => !overlap(a, b)));

test('a new board carries its grid from the start: calendar and to-do, a medium clock weather and two small widgets, projects, memo and quick notes', () => {
	setLanguage('en');
	const data = parse(generateDefaultMarkdown());
	expect(data.grid).toBeDefined();
	expect(data.widgets?.map(widgetPresentationKey)).toEqual(defaultCanvasMembers().map(widgetPresentationKey));
	expect(data.widgets?.map((m) => m.kind)).toEqual([
		'calendar',
		'clock',
		'pomodoro',
		'usage',
		'quick-actions',
		'tasks',
	]);
	const lg = data.grid!.lg;
	expect(lg).toHaveLength(data.widgets!.length + data.columns.length);
	expect(noOverlap(lg)).toBe(true);
	const at = (id: string) => lg.find((tile) => tile.i === id)!;
	const todo = at('widget:task:tasks:default');
	expect(data.columns.some((column) => column.sectionType === 'todo')).toBe(false);
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
