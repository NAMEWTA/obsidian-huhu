import { widgetPresentationKey } from './widget-members';
import { sectionDefaultSize } from './widget-table';
import type { TileSpec } from './grid';
import type { BoardWidgetMember, DashboardCard, DashboardColumn, DashboardData } from './types/model';

export type BoardTileSource =
	| { id: string; type: 'widget'; member: BoardWidgetMember }
	| { id: string; type: 'section'; column: DashboardColumn }
	| { id: string; type: 'card'; card: DashboardCard; column: DashboardColumn }
	| { id: string; type: 'missing' };

/** A tile's starting size and floor, in grid cells. */
export interface TileDefaults {
	w: number;
	h: number;
	minW?: number;
	minH?: number;
}
export type WidgetTileDefaults = (member: BoardWidgetMember) => TileDefaults | undefined;

/** Ids the board's saved geometry names: its grid, or (before the one-time conversion) the old tiles. */
export function savedTileIds(data: Pick<DashboardData, 'grid' | 'legacyTiles'>): Set<string> {
	return new Set([
		...(data.grid?.lg.map((item) => item.i) ?? []),
		...(data.grid?.md?.map((item) => item.i) ?? []),
		...(data.legacyTiles?.map((tile) => tile.id) ?? []),
	]);
}

/**
 * What the board is made of: widget members, content sections and standalone cards. Apex presentation keys are
 * persisted; internal column identities remain independent. With `missing`, geometry that names nothing the board
 * has any more stays visible as a placeholder (the file is never edited behind the user's back).
 */
export function boardTileSources(
	data: DashboardData,
	members: readonly BoardWidgetMember[],
	options: { missing?: boolean } = {},
): BoardTileSource[] {
	const saved = savedTileIds(data);
	const sources: BoardTileSource[] = members.map((member) => ({
		id: `widget:${widgetPresentationKey(member)}`,
		type: 'widget',
		member,
	}));
	for (const [index, column] of data.columns.entries()) {
		const id =
			column.id && saved.has(column.id)
				? column.id
				: `section:${column.name}${data.columns.filter((other) => other.name === column.name).length > 1 ? `:${index}` : ''}`;
		const standalone = column.cards.filter(
			(card) =>
				column.sectionType === 'sticky' ||
				saved.has(`card:${card.id}`) ||
				saved.has(card.id) ||
				(data.gridPacked && card.gridCol > 0 && card.gridRow > 0),
		);
		const ids = new Set(standalone.map((card) => card.id));
		const grouped = column.cards.filter((card) => !ids.has(card.id));
		if (grouped.length || !column.cards.length || saved.has(id))
			sources.push({ id, type: 'section', column: { ...column, cards: grouped } });
		for (const card of standalone)
			sources.push({ id: saved.has(card.id) ? card.id : `card:${card.id}`, type: 'card', card, column });
	}
	if (options.missing) {
		const present = new Set(sources.map((source) => source.id));
		for (const id of [...(data.grid?.lg.map((item) => item.i) ?? []), ...(data.grid?.md?.map((item) => item.i) ?? [])])
			if (!present.has(id)) {
				present.add(id);
				sources.push({ id, type: 'missing' });
			}
	}
	return sources;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Starting size and floor of every source; the layout places it from here until the user resizes it. */
export function tileSpecs(
	sources: readonly BoardTileSource[],
	widgetDefaults: WidgetTileDefaults = () => undefined,
): TileSpec[] {
	return sources.map((source): TileSpec => {
		const base = ((): TileDefaults => {
			if (source.type === 'widget') return widgetDefaults(source.member) ?? { w: 3, h: 2, minW: 3, minH: 2 };
			if (source.type === 'section') return sectionDefaultSize(source.column.sectionType);
			if (source.type === 'card')
				return { w: clamp(source.card.gridCols || 3, 2, 12), h: 2, minW: 2, minH: 2 };
			return { w: 3, h: 2, minW: 1, minH: 1 };
		})();
		return { id: source.id, w: base.w, h: base.h, minW: base.minW ?? 1, minH: base.minH ?? 1 };
	});
}
