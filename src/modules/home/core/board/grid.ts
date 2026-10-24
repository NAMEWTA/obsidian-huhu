/**
 * Board grid geometry: the pure half of the react-grid-layout board. A tile is `cols × rows`; a row is
 * `GRID_ROW_HEIGHT` px plus a `GRID_MARGIN` gap, so every tile has a fixed pixel height and tiles in one row
 * align at top and bottom whatever they contain. Compaction and collision rules come from react-grid-layout's
 * framework-agnostic `core` entry (MIT, https://github.com/react-grid-layout/react-grid-layout), so the page
 * shows exactly what a write persists.
 *
 * Persisted shape (`grid:` in the board's frontmatter): `{"v":2,"lg":[{"i","x","y","w","h"}],"md":[...]}`.
 * `sm` (one column) is never stored; it is the `lg` layout read in (y, x) order.
 */
import { correctBounds, moveElement, verticalCompactor, type LayoutItem } from 'react-grid-layout/core';

export type GridBreakpoint = 'lg' | 'md' | 'sm';
export const GRID_BREAKPOINTS: Readonly<Record<GridBreakpoint, number>> = { lg: 960, md: 600, sm: 0 };
export const GRID_COLUMNS: Readonly<Record<GridBreakpoint, number>> = { lg: 12, md: 6, sm: 1 };
export const GRID_ROW_HEIGHT = 80;
export const GRID_MARGIN: readonly [number, number] = [16, 16];
export const GRID_VERSION = 2;
/** Height / position ceiling that keeps a hand-edited file from asking for a page-sized tile. */
export const GRID_MAX_ROWS = 40;
const GRID_MAX_Y = 400;

export interface GridItem {
	/** Tile id (`widget:calendar`, `section:Notes`, a card id, ...). */
	i: string;
	x: number;
	y: number;
	w: number;
	h: number;
}
/** What the file stores. `md` appears once the user has arranged the board at that width. */
export interface BoardGrid {
	v: typeof GRID_VERSION;
	lg: GridItem[];
	md?: GridItem[];
}
export interface GridCell {
	w: number;
	h: number;
}
/** A tile as the layout sees it: its starting size and the smallest size a resize may reach. */
export interface TileSpec extends GridCell {
	id: string;
	minW: number;
	minH: number;
}
/** What react-grid-layout renders: the stored fields plus the resize floor. */
export interface GridLayoutItem extends GridItem {
	minW: number;
	minH: number;
}
export type GridLayouts = Record<GridBreakpoint, GridLayoutItem[]>;

export const breakpointOf = (width: number): GridBreakpoint =>
	width >= GRID_BREAKPOINTS.lg ? 'lg' : width >= GRID_BREAKPOINTS.md ? 'md' : 'sm';

const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const whole = (value: unknown, min: number, max: number, fallback: number): number =>
	finite(value) ? clamp(Math.round(value), min, max) : fallback;

const pick = ({ i, x, y, w, h }: GridItem): GridItem => ({ i, x, y, w, h });

/** Tolerant reader: bad entries are repaired or dropped, never thrown. Writing back is up to an explicit edit. */
function readItems(value: unknown[], cols: number): GridItem[] {
	const seen = new Set<string>();
	const items: GridItem[] = [];
	for (const entry of value) {
		if (!record(entry)) continue;
		const i = typeof entry.i === 'string' ? entry.i.trim() : '';
		if (!i || seen.has(i)) continue;
		seen.add(i);
		const w = whole(entry.w, 1, cols, Math.min(3, cols));
		items.push({
			i,
			x: whole(entry.x, 0, cols - w, 0),
			y: whole(entry.y, 0, GRID_MAX_Y, 0),
			w,
			h: whole(entry.h, 1, GRID_MAX_ROWS, 2),
		});
	}
	return items;
}

export function readGrid(value: unknown): BoardGrid | undefined {
	if (!record(value) || value.v !== GRID_VERSION || !Array.isArray(value.lg)) return undefined;
	const lg = readItems(value.lg, GRID_COLUMNS.lg);
	return Array.isArray(value.md)
		? { v: GRID_VERSION, lg, md: readItems(value.md, GRID_COLUMNS.md) }
		: { v: GRID_VERSION, lg };
}

/** The canonical single-line JSON of a grid, as written to the frontmatter. */
export const serializeGrid = (grid: BoardGrid): string =>
	JSON.stringify({
		v: GRID_VERSION,
		lg: grid.lg.map(pick),
		...(grid.md ? { md: grid.md.map(pick) } : {}),
	});

const overlaps = (a: GridItem, b: GridItem): boolean =>
	a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** react-grid-layout's own vertical compaction: what the page shows after any gesture. */
export function compactLayout(items: readonly GridItem[], cols: number): GridItem[] {
	const bounded = correctBounds(
		items.map((item): LayoutItem => pick(item)),
		{ cols },
	);
	return verticalCompactor.compact(bounded, cols).map(pick);
}

/** The first free spot, scanning rows top to bottom and columns left to right. */
export function firstFit(items: readonly GridItem[], size: GridCell, cols: number): { x: number; y: number } {
	const w = clamp(size.w, 1, cols);
	for (let y = 0; ; y++)
		for (let x = 0; x + w <= cols; x++)
			if (!items.some((other) => overlaps({ i: '', x, y, w, h: size.h }, other))) return { x, y };
}

/** `lg` read in (y, x) order and flowed into fewer columns, row by row. */
export function projectLayout(lg: readonly GridItem[], cols: number): GridItem[] {
	const ordered = [...lg].sort((a, b) => a.y - b.y || a.x - b.x);
	let x = 0,
		y = 0,
		rowHeight = 0;
	const placed = ordered.map((item) => {
		const w = Math.min(item.w, cols);
		if (x + w > cols) {
			y += rowHeight;
			x = 0;
			rowHeight = 0;
		}
		const next = { i: item.i, x, y, w, h: item.h };
		x += w;
		rowHeight = Math.max(rowHeight, item.h);
		return next;
	});
	return compactLayout(placed, cols);
}

/** One column: `order` (or the (y, x) order of `lg`) top to bottom, heights kept. */
export function stackLayout(lg: readonly GridItem[], order?: readonly string[]): GridItem[] {
	const rank = new Map(order?.map((id, index) => [id, index]));
	const ordered = [...lg].sort((a, b) =>
		order ? (rank.get(a.i) ?? Infinity) - (rank.get(b.i) ?? Infinity) || a.y - b.y || a.x - b.x : a.y - b.y || a.x - b.x,
	);
	let y = 0;
	return ordered.map((item) => {
		const next = { i: item.i, x: 0, y, w: 1, h: item.h };
		y += item.h;
		return next;
	});
}

/** A saved item made to respect its tile's floor and the column count. */
function fit(item: GridItem, spec: TileSpec, cols: number): GridItem {
	const w = clamp(item.w, Math.min(spec.minW, cols), cols);
	return { i: item.i, w, h: clamp(item.h, spec.minH, GRID_MAX_ROWS), x: clamp(item.x, 0, cols - w), y: Math.max(0, item.y) };
}

/**
 * One layout per tile: saved geometry where the file has it, otherwise the starting size (or, when `like` knows
 * the tile at another width, that item's size) in the first free spot. Tiles keep `specs` order.
 */
export function reconcileLayout(
	saved: readonly GridItem[] | undefined,
	specs: readonly TileSpec[],
	cols: number,
	like?: readonly GridItem[],
): GridItem[] {
	const byId = new Map(saved?.map((item) => [item.i, item]));
	const likeById = new Map(like?.map((item) => [item.i, item]));
	const placed = new Map<string, GridItem>();
	for (const spec of specs) {
		const item = byId.get(spec.id);
		if (item) placed.set(spec.id, fit(item, spec, cols));
	}
	for (const spec of specs) {
		if (placed.has(spec.id)) continue;
		const size = likeById.get(spec.id) ?? spec;
		const w = clamp(size.w, Math.min(spec.minW, cols), cols);
		const h = clamp(size.h, spec.minH, GRID_MAX_ROWS);
		placed.set(spec.id, { i: spec.id, ...firstFit([...placed.values()], { w, h }, cols), w, h });
	}
	return specs.map((spec) => placed.get(spec.id)!);
}

const withFloor = (items: readonly GridItem[], specs: ReadonlyMap<string, TileSpec>, cols: number): GridLayoutItem[] =>
	items.map((item) => {
		const spec = specs.get(item.i);
		return { ...item, minW: Math.min(spec?.minW ?? 1, cols), minH: spec?.minH ?? 1 };
	});

/**
 * Every breakpoint's layout for the page. `lg` is the stored one; `md` is the stored one too, or `lg` flowed into
 * six columns until the user arranges that width; `sm` is `lg` stacked (in `smOrder` when the user reordered it).
 */
export function layoutsFor(
	grid: BoardGrid | undefined,
	specs: readonly TileSpec[],
	smOrder?: readonly string[],
): GridLayouts {
	const byId = new Map(specs.map((spec) => [spec.id, spec]));
	const lg = compactLayout(reconcileLayout(grid?.lg, specs, GRID_COLUMNS.lg), GRID_COLUMNS.lg);
	const md = grid?.md
		? compactLayout(reconcileLayout(grid.md, specs, GRID_COLUMNS.md, lg), GRID_COLUMNS.md)
		: projectLayout(lg, GRID_COLUMNS.md);
	const sm = stackLayout(lg, smOrder);
	return {
		lg: withFloor(lg, byId, GRID_COLUMNS.lg),
		md: withFloor(md, byId, GRID_COLUMNS.md),
		sm: withFloor(sm, byId, GRID_COLUMNS.sm),
	};
}

/** A gesture's resulting layout, as the file stores it (only the geometry, compacted). */
export const storedLayout = (items: readonly GridItem[], cols: number): GridItem[] => compactLayout(items, cols);

/** `id` resized to `size` (clamped to its floor) and the rest of the layout compacted around it. */
export function resizeItem(items: readonly GridItem[], id: string, size: GridCell, spec: TileSpec | undefined, cols: number): GridItem[] {
	const w = clamp(size.w, Math.min(spec?.minW ?? 1, cols), cols);
	const h = clamp(size.h, spec?.minH ?? 1, GRID_MAX_ROWS);
	return compactLayout(
		items.map((item) => (item.i === id ? { ...item, w, h, x: clamp(item.x, 0, cols - w) } : item)),
		cols,
	);
}

/**
 * `id` moved by whole cells (the keyboard and menu equivalent of a drag). Sideways it is a one-column step; up and
 * down it trades places with the nearest tile it overlaps in that direction, since the layout never keeps a gap
 * and a single row would only be pulled back.
 */
export function nudgeItem(items: readonly GridItem[], id: string, dx: number, dy: number, cols: number): GridItem[] {
	const layout = items.map((item): LayoutItem => pick(item));
	const target = layout.find((item) => item.i === id);
	if (!target) return items.map(pick);
	if (dy !== 0) {
		const across = layout.filter((other) => other.i !== id && other.x < target.x + target.w && target.x < other.x + other.w);
		const neighbour =
			dy > 0
				? across.filter((other) => other.y >= target.y + target.h).sort((a, b) => a.y - b.y)[0]
				: across.filter((other) => other.y + other.h <= target.y).sort((a, b) => b.y + b.h - (a.y + a.h))[0];
		if (!neighbour) return compactLayout(items, cols);
		const top = dy > 0 ? target.y : neighbour.y;
		return compactLayout(
			layout.map((item) =>
				item.i === id
					? { ...item, y: dy > 0 ? target.y + neighbour.h : top }
					: item.i === neighbour.i
						? { ...item, y: dy > 0 ? top : neighbour.y + target.h }
						: item,
			),
			cols,
		);
	}
	const x = clamp(target.x + dx, 0, cols - target.w);
	const moved = moveElement(layout, target, x, target.y, true, false, 'vertical', cols, false);
	return compactLayout(moved.map(pick), cols);
}

/** A new tile in the first free spot of `lg`; the rest of the layout stays where it is. */
export function addItem(items: readonly GridItem[], id: string, size: GridCell, cols: number): GridItem[] {
	const w = clamp(size.w, 1, cols);
	const h = clamp(size.h, 1, GRID_MAX_ROWS);
	return compactLayout([...items, { i: id, ...firstFit(items, { w, h }, cols), w, h }], cols);
}

/** Row pitch in px: one row plus the gap below it. */
export const GRID_ROW_PITCH = GRID_ROW_HEIGHT + GRID_MARGIN[1];
/** The old board measured in rows of 10px; a cap of `cap` rows covered about `cap * 10` px. */
const LEGACY_ROW_PX = 10;

export interface LegacyGeometry {
	id: string;
	w: number;
	cap: number;
	x?: number;
	y?: number;
}

/**
 * The one-time conversion of an old tile to the grid: columns are kept (both are 12 wide), the height is the old
 * pixel cap in new rows, and a tile without a saved position gets none (the caller places it).
 */
export function convertLegacyItem(tile: LegacyGeometry, spec: TileSpec): Partial<GridItem> & GridCell {
	const w = clamp(Math.round(tile.w), Math.min(spec.minW, GRID_COLUMNS.lg), GRID_COLUMNS.lg);
	const h = clamp(Math.round((tile.cap * LEGACY_ROW_PX) / GRID_ROW_PITCH), spec.minH, GRID_MAX_ROWS);
	return tile.x !== undefined && tile.y !== undefined
		? {
				w,
				h,
				x: clamp(Math.round(tile.x), 0, GRID_COLUMNS.lg - w),
				y: Math.max(0, Math.round((tile.y * LEGACY_ROW_PX) / GRID_ROW_PITCH)),
			}
		: { w, h };
}

export function sameLayout(a: readonly GridItem[] | undefined, b: readonly GridItem[] | undefined): boolean {
	if (!a || !b) return a === b;
	return JSON.stringify(a.map(pick)) === JSON.stringify(b.map(pick));
}

const mapLayouts = (grid: BoardGrid, change: (items: GridItem[]) => GridItem[]): BoardGrid => ({
	v: GRID_VERSION,
	lg: change(grid.lg),
	...(grid.md ? { md: change(grid.md) } : {}),
});

/** The grid without the tiles named by `ids` (a removed widget, section or card). */
export function dropItems(grid: BoardGrid | undefined, ids: ReadonlySet<string>): BoardGrid | undefined {
	return grid && mapLayouts(grid, (items) => items.filter((item) => !ids.has(item.i)));
}

/** The grid with tile ids rewritten by `rename` (a renamed section keeps its place). */
export function renameItems(grid: BoardGrid | undefined, rename: (id: string) => string): BoardGrid | undefined {
	return grid && mapLayouts(grid, (items) => items.map((item) => ({ ...item, i: rename(item.i) })));
}
