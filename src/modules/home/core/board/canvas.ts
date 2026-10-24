import { boardTileSources, tileSpecs, type TileDefaults, type WidgetTileDefaults } from './board-tiles';
import { t } from '../../../../shared/i18n';
import {
	GRID_COLUMNS,
	GRID_VERSION,
	addItem,
	compactLayout,
	convertLegacyItem,
	dropItems,
	renameItems,
	type GridItem,
} from './grid';
import type { BoardWidgetMember, DashboardData } from './types/model';
import { defaultCellSize, tierSize } from './widget-catalog';
import { retireLegacyKeys } from './parser/parse';
import { widgetPresentationKey } from './widget-members';
import { BUILTIN_WIDGETS, SECTION_WIDGETS } from './widget-table';
import type { HomeWidgetTier } from './widget-tiers';

const member = (kind: string, instanceId = 'default'): BoardWidgetMember => ({
	memberId: `home:${kind}:${instanceId}`,
	provider: 'home',
	kind,
	instanceId,
});

/** Starting geometry of a built-in widget, from the same table the add-widget panel reads. */
export function builtinTileDefaults(widget: BoardWidgetMember): TileDefaults | undefined {
	const spec =
		widget.provider === 'home'
			? BUILTIN_WIDGETS.find(
					(item) =>
						item.key ===
						(['quick-notes', 'shortcuts'].includes(widget.kind) ? 'quick-actions' : widget.kind),
				)
			: undefined;
	return spec ? { ...defaultCellSize(spec), minW: spec.minSize.w, minH: spec.minSize.h } : undefined;
}

/** The widgets a new board starts with; its content sections (notes, to-do, projects) come with the board's columns. */
export function defaultCanvasMembers(): BoardWidgetMember[] {
	return ['calendar', 'clock', 'pomodoro', 'usage', 'quick-actions'].map((kind) => member(kind));
}

/** What an old board with no widget list of its own got on the sidebar. */
const legacyDefaultMembers = (): BoardWidgetMember[] =>
	['calendar', 'quick-actions', 'pomodoro'].map((kind) => member(kind));

const isBanner = (item: Pick<BoardWidgetMember, 'provider' | 'kind'>) =>
	item.provider === 'home' && item.kind === 'banner';

/** A board is on the grid once it carries `grid:`. Anything older (immersive tiles, side or stacked layouts) converts once. */
export function needsGridConversion(data: Pick<DashboardData, 'grid'>): boolean {
	return !data.grid;
}

/**
 * Opens an old board on the grid once. Cards, sections and the widget list stay as they are; the banner is
 * dropped. Tiles with saved geometry keep their columns and position (heights are re-measured in the new rows);
 * every other tile gets its starting size in the first free spot, in the board's order. `quickNotes` turns the old
 * top bar into its own widget.
 */
export function convertToGrid(
	data: DashboardData,
	legacyMembers: readonly BoardWidgetMember[] | undefined,
	defaults: WidgetTileDefaults = builtinTileDefaults,
	options: { quickNotes?: boolean } = {},
): DashboardData {
	const known = (data.widgets ?? legacyMembers ?? legacyDefaultMembers())
		.filter((item) => !isBanner(item))
		.map((item) => ({ ...item }));
	const widgets =
		options.quickNotes && !known.some((item) => item.provider === 'home' && item.kind === 'quick-notes')
			? [member('quick-notes'), ...known]
			: known;
	const sources = boardTileSources({ ...data, widgets }, widgets);
	const specs = tileSpecs(sources, defaults);
	const legacy = new Map(data.legacyTiles?.map((tile) => [tile.id, tile]));
	const placed: GridItem[] = [];
	const pending: { id: string; w: number; h: number }[] = [];
	for (const spec of specs) {
		const tile = legacy.get(spec.id);
		const converted = tile ? convertLegacyItem(tile, spec) : undefined;
		if (converted?.x !== undefined && converted.y !== undefined)
			placed.push({ i: spec.id, x: converted.x, y: converted.y, w: converted.w, h: converted.h });
		else pending.push({ id: spec.id, w: converted?.w ?? spec.w, h: converted?.h ?? spec.h });
	}
	let lg = compactLayout(placed, GRID_COLUMNS.lg);
	for (const tile of pending) lg = addItem(lg, tile.id, tile, GRID_COLUMNS.lg);
	return retireLegacyKeys({
		...data,
		widgets,
		grid: { v: GRID_VERSION, lg },
		legacyTiles: undefined,
		gridPacked: undefined,
	});
}

/** Widget kinds that no longer exist: fleeting capture became part of the inbox section (type `memo`). */
const RETIRED_KINDS: ReadonlySet<string> = new Set(['quickCapture']);
const isRetired = (member: BoardWidgetMember): boolean => member.provider === 'home' && RETIRED_KINDS.has(member.kind);

/** Whether the board still lists a widget kind that was folded into another one. */
export function hasRetiredWidgets(data: Pick<DashboardData, 'widgets'>): boolean {
	return !!data.widgets?.some(isRetired);
}

/**
 * Replaces the retired widget kinds with their successor: the fleeting-capture widget leaves the board and the inbox
 * section takes its place and size. A board that already has an inbox section only loses the retired widget.
 */
export function replaceRetiredWidgets(data: DashboardData): DashboardData {
	const retired = (data.widgets ?? []).filter(isRetired);
	if (!retired.length) return data;
	const gone = new Set(retired.map((member) => `widget:${widgetPresentationKey(member)}`));
	const widgets = (data.widgets ?? []).filter((member) => !isRetired(member));
	let columns = data.columns,
		heir: string | undefined;
	if (!columns.some((column) => column.sectionType === 'memo')) {
		let name = t('renderer.typeMemo'),
			serial = 1;
		while (columns.some((column) => column.name === name)) name = `${t('renderer.typeMemo')} ${++serial}`;
		columns = [...columns, { name, color: '#f59e0b', sectionType: 'memo', cards: [] }];
		heir = `section:${name}`;
	}
	const rename = (id: string) => (heir && gone.has(id) ? heir : id);
	const grid = !data.grid ? undefined : heir ? renameItems(data.grid, rename) : dropItems(data.grid, gone);
	const legacyTiles = heir
		? data.legacyTiles?.map((tile) => ({ ...tile, id: rename(tile.id) }))
		: data.legacyTiles?.filter((tile) => !gone.has(tile.id));
	return { ...data, widgets, columns, ...(grid ? { grid } : {}), ...(legacyTiles ? { legacyTiles } : {}) };
}

type Slot = readonly [x: number, y: number, tier: HomeWidgetTier];
/** The first board: calendar and to-do side by side, four small widgets, projects across, memo and quick notes. */
const WIDGET_SLOTS: Readonly<Record<string, Slot>> = {
	calendar: [0, 0, 'L'],
	clock: [0, 4, 'M'],
	pomodoro: [6, 4, 'S'],
	usage: [9, 4, 'S'],
	'quick-actions': [6, 10, 'M'],
};
const SECTION_SLOTS: Readonly<Record<string, Slot>> = {
	todo: [6, 0, 'L'],
	projects: [0, 6, 'XL'],
	memo: [0, 10, 'M'],
};

/** A new board: the default widgets and sections laid out as one symmetric page (every row has one height). */
export function defaultCanvas(data: DashboardData): DashboardData {
	const widgets = defaultCanvasMembers();
	const board: DashboardData = { ...data, widgets };
	const items: GridItem[] = [];
	for (const source of boardTileSources(board, widgets)) {
		const slot =
			source.type === 'widget'
				? WIDGET_SLOTS[source.member.kind]
				: source.type === 'section'
					? SECTION_SLOTS[source.column.sectionType ?? '']
					: undefined;
		const spec =
			source.type === 'widget'
				? BUILTIN_WIDGETS.find((item) => item.key === source.member.kind)
				: source.type === 'section'
					? SECTION_WIDGETS.find((item) => item.section === source.column.sectionType)
					: undefined;
		if (!slot || !spec) continue;
		const size = tierSize(spec, slot[2]);
		items.push({ i: source.id, x: slot[0], y: slot[1], w: size.w, h: size.h });
	}
	return { ...board, grid: { v: GRID_VERSION, lg: items } };
}
