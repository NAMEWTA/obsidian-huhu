import { expect, test } from 'vitest';
import {
	GRID_COLUMNS,
	GRID_ROW_PITCH,
	addItem,
	breakpointOf,
	compactLayout,
	convertLegacyItem,
	dropItems,
	firstFit,
	layoutsFor,
	nudgeItem,
	projectLayout,
	readGrid,
	renameItems,
	resizeItem,
	serializeGrid,
	stackLayout,
	type GridItem,
	type TileSpec,
} from './grid';

const item = (i: string, x: number, y: number, w: number, h: number): GridItem => ({ i, x, y, w, h });
const spec = (id: string, w = 3, h = 2, minW = 3, minH = 2): TileSpec => ({ id, w, h, minW, minH });
const overlap = (a: GridItem, b: GridItem) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const noOverlap = (items: readonly GridItem[]) =>
	items.every((a, index) => items.slice(index + 1).every((b) => !overlap(a, b)));

test('the breakpoints are 12 columns from 960px, 6 from 600px and one below', () => {
	expect([1440, 960, 959, 600, 599, 320].map(breakpointOf)).toEqual(['lg', 'lg', 'md', 'md', 'sm', 'sm']);
	expect(GRID_COLUMNS).toEqual({ lg: 12, md: 6, sm: 1 });
});

test('a grid is read tolerantly: bad entries are repaired or dropped, another version is not a grid', () => {
	expect(readGrid(undefined)).toBeUndefined();
	expect(readGrid({ v: 1, lg: [] })).toBeUndefined();
	expect(readGrid({ v: 2, lg: 'nope' })).toBeUndefined();
	expect(
		readGrid({
			v: 2,
			lg: [
				{ i: 'a', x: -4, y: 2, w: 99, h: 0 },
				{ i: 'a', x: 0, y: 0, w: 1, h: 1 },
				{ i: '', x: 0, y: 0, w: 1, h: 1 },
				'junk',
				{ i: 'b', x: 11, y: Infinity, w: 3, h: 1000 },
			],
			md: [{ i: 'a', x: 5, y: 0, w: 6, h: 2 }],
		}),
	).toEqual({
		v: 2,
		lg: [item('a', 0, 2, 12, 1), item('b', 9, 0, 3, 40)],
		md: [item('a', 0, 0, 6, 2)],
	});
});

test('a grid is written as one line of JSON in a fixed key order, without stray fields', () => {
	const text = serializeGrid({ v: 2, lg: [{ ...item('widget:clock', 0, 0, 3, 2), extra: 1 } as GridItem], md: [item('widget:clock', 0, 0, 3, 2)] });
	expect(text).toBe(
		'{"v":2,"lg":[{"i":"widget:clock","x":0,"y":0,"w":3,"h":2}],"md":[{"i":"widget:clock","x":0,"y":0,"w":3,"h":2}]}',
	);
	expect(text).not.toContain('\n');
	expect(serializeGrid({ v: 2, lg: [] })).toBe('{"v":2,"lg":[]}');
});

test('compaction is react-grid-layout vertical compaction: gaps close upward and nothing overlaps', () => {
	const packed = compactLayout([item('a', 0, 0, 6, 4), item('b', 6, 3, 6, 4), item('c', 0, 9, 12, 2)], 12);
	expect(packed.find((tile) => tile.i === 'b')!.y).toBe(0);
	expect(packed.find((tile) => tile.i === 'c')!.y).toBe(4);
	expect(noOverlap(packed)).toBe(true);
});

test('first fit takes the first free cell, row by row', () => {
	const taken = [item('a', 0, 0, 6, 4), item('b', 6, 0, 3, 2)];
	expect(firstFit(taken, { w: 3, h: 2 }, 12)).toEqual({ x: 9, y: 0 });
	expect(firstFit(taken, { w: 6, h: 2 }, 12)).toEqual({ x: 6, y: 2 });
	expect(firstFit(taken, { w: 12, h: 2 }, 12)).toEqual({ x: 0, y: 4 });
	expect(firstFit([], { w: 12, h: 4 }, 6)).toEqual({ x: 0, y: 0 });
});

test('layouts: the stored 12 columns win, a tile the file lacks starts in the first free spot, floors apply', () => {
	const specs = [spec('a', 6, 4), spec('b', 6, 4), spec('c', 3, 2), spec('d', 3, 2, 3, 3)];
	const layouts = layoutsFor({ v: 2, lg: [item('a', 0, 0, 6, 4), item('b', 6, 0, 6, 4), item('d', 0, 4, 1, 1)] }, specs);
	// d is stored at the left of the third row, so c takes the first free spot beside it
	expect(layouts.lg.find((tile) => tile.i === 'c')).toMatchObject({ x: 3, y: 4, w: 3, h: 2 });
	// d was stored smaller than its floor: the floor wins, and it is the resize floor of the tile
	expect(layouts.lg.find((tile) => tile.i === 'd')).toMatchObject({ w: 3, h: 3, minW: 3, minH: 3 });
	expect(layouts.lg.map((tile) => tile.i).sort()).toEqual(['a', 'b', 'c', 'd']);
	expect(noOverlap(layouts.lg)).toBe(true);
});

test('layouts: six columns are the twelve flowed in reading order until that width is arranged, then they are stored', () => {
	const specs = [spec('a', 6, 4), spec('b', 6, 4), spec('c'), spec('d'), spec('e', 12, 4)];
	const lg = { v: 2 as const, lg: [item('a', 0, 0, 6, 4), item('b', 6, 0, 6, 4), item('c', 0, 4, 3, 2), item('d', 3, 4, 3, 2), item('e', 0, 6, 12, 4)] };
	const derived = layoutsFor(lg, specs).md;
	expect(derived.map((tile) => [tile.i, tile.x, tile.y, tile.w, tile.h])).toEqual([
		['a', 0, 0, 6, 4],
		['b', 0, 4, 6, 4],
		['c', 0, 8, 3, 2],
		['d', 3, 8, 3, 2],
		['e', 0, 10, 6, 4],
	]);
	expect(derived.every((tile) => tile.minW <= 6)).toBe(true);
	const stored = layoutsFor({ ...lg, md: [item('b', 0, 0, 6, 4), item('a', 0, 4, 6, 4)] }, specs).md;
	expect(stored.find((tile) => tile.i === 'b')).toMatchObject({ x: 0, y: 0 });
	expect(stored.find((tile) => tile.i === 'a')).toMatchObject({ x: 0, y: 4 });
	// tiles the stored six-column layout does not know yet follow the twelve-column size
	expect(stored.find((tile) => tile.i === 'e')).toMatchObject({ w: 6, h: 4 });
	expect(noOverlap(stored)).toBe(true);
});

test('layouts: one column stacks the twelve in (y, x) order, keeps heights and follows a reorder', () => {
	const specs = [spec('a', 6, 4), spec('b', 6, 4), spec('c')];
	const grid = { v: 2 as const, lg: [item('b', 6, 0, 6, 4), item('a', 0, 0, 6, 4), item('c', 0, 4, 3, 2)] };
	expect(layoutsFor(grid, specs).sm.map((tile) => [tile.i, tile.y, tile.h, tile.w])).toEqual([
		['a', 0, 4, 1],
		['b', 4, 4, 1],
		['c', 8, 2, 1],
	]);
	expect(layoutsFor(grid, specs, ['c', 'a', 'b']).sm.map((tile) => tile.i)).toEqual(['c', 'a', 'b']);
	expect(stackLayout([item('x', 0, 1, 2, 2), item('y', 0, 0, 2, 3)]).map((tile) => [tile.i, tile.y])).toEqual([
		['y', 0],
		['x', 3],
	]);
});

test('every row of a symmetric layout keeps one height whatever the width', () => {
	const lg = [item('a', 0, 0, 6, 4), item('b', 6, 0, 6, 4), item('c', 0, 4, 3, 2), item('d', 3, 4, 3, 2), item('e', 6, 4, 3, 2), item('f', 9, 4, 3, 2)];
	for (const cols of [12, 6] as const) {
		const rows = new Map<number, Set<number>>();
		for (const tile of cols === 12 ? lg : projectLayout(lg, cols)) rows.set(tile.y, (rows.get(tile.y) ?? new Set()).add(tile.h));
		expect([...rows.values()].every((heights) => heights.size === 1)).toBe(true);
	}
});

test('moving by a cell pushes the tile in its way, resizing respects the floor and neither overlaps', () => {
	const tiles = [item('a', 0, 0, 6, 4), item('b', 6, 0, 6, 4), item('c', 0, 4, 12, 2)];
	const moved = nudgeItem(tiles, 'c', 0, -1, 12);
	expect(noOverlap(moved)).toBe(true);
	expect(nudgeItem(tiles, 'a', -1, -1, 12).find((tile) => tile.i === 'a')).toMatchObject({ x: 0, y: 0 });
	expect(nudgeItem(tiles, 'b', 1, 0, 12).find((tile) => tile.i === 'b')).toMatchObject({ x: 6 });
	// one step down passes the tile below, one step up passes the tile above
	const stacked = [item('a', 0, 0, 6, 2), item('b', 0, 2, 6, 2), item('c', 0, 4, 6, 2)];
	const down = nudgeItem(stacked, 'a', 0, 1, 12);
	expect(down.map((tile) => [tile.i, tile.y]).sort()).toEqual([['a', 2], ['b', 0], ['c', 4]]);
	const up = nudgeItem(stacked, 'c', 0, -1, 12);
	expect(up.map((tile) => [tile.i, tile.y]).sort()).toEqual([['a', 0], ['b', 4], ['c', 2]]);
	// at the bottom edge there is nothing to pass
	expect(nudgeItem(stacked, 'c', 0, 1, 12)).toEqual(stacked);
	const smaller = resizeItem(tiles, 'a', { w: 1, h: 1 }, spec('a'), 12);
	expect(smaller.find((tile) => tile.i === 'a')).toMatchObject({ w: 3, h: 2 });
	expect(noOverlap(smaller)).toBe(true);
	const wider = resizeItem(tiles, 'a', { w: 12, h: 4 }, spec('a'), 12);
	expect(wider.find((tile) => tile.i === 'a')).toMatchObject({ w: 12, h: 4 });
	expect(noOverlap(wider)).toBe(true);
});

test('adding a tile keeps the others where they are', () => {
	const tiles = [item('a', 0, 0, 6, 4), item('b', 6, 0, 3, 2)];
	const next = addItem(tiles, 'n', { w: 3, h: 2 }, 12);
	expect(next.find((tile) => tile.i === 'n')).toMatchObject({ x: 9, y: 0, w: 3, h: 2 });
	expect(next.filter((tile) => tile.i !== 'n')).toEqual(tiles);
});

test('removing and renaming tiles touches both layouts', () => {
	const grid = { v: 2 as const, lg: [item('a', 0, 0, 3, 2), item('b', 3, 0, 3, 2)], md: [item('a', 0, 0, 3, 2), item('b', 3, 0, 3, 2)] };
	expect(dropItems(grid, new Set(['a']))).toEqual({ v: 2, lg: [item('b', 3, 0, 3, 2)], md: [item('b', 3, 0, 3, 2)] });
	expect(renameItems(grid, (id) => (id === 'b' ? 'c' : id))!.md!.map((tile) => tile.i)).toEqual(['a', 'c']);
	expect(dropItems(undefined, new Set(['a']))).toBeUndefined();
});

test('an old tile converts by its pixel cap: columns stay, rows are re-measured, position scales with the rows', () => {
	const calendar = spec('calendar', 6, 4, 3, 3);
	// cap 50 fine rows (500px) is about five 96px rows; the saved position scales with it
	expect(convertLegacyItem({ id: 'calendar', w: 4, cap: 50, x: 8, y: 12 }, calendar)).toEqual({ w: 4, h: 5, x: 8, y: 1 });
	// the cap rounds to the nearest row (24 * 10 / 96 = 2.5)
	expect(convertLegacyItem({ id: 'calendar', w: 3, cap: 24, x: 0, y: 0 }, calendar)).toMatchObject({ h: 3 });
	// below the floor the floor wins; wider than the grid is cut to it; without a position none is invented
	expect(convertLegacyItem({ id: 'calendar', w: 1, cap: 3 }, calendar)).toEqual({ w: 3, h: 3 });
	expect(convertLegacyItem({ id: 'calendar', w: 99, cap: 4000, x: 5, y: 0 }, calendar)).toMatchObject({ w: 12, x: 0 });
	expect(GRID_ROW_PITCH).toBe(96);
});
