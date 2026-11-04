import { boardTileSources, type TileDefaults } from './board-tiles';
import { GRID_VERSION, type GridItem } from './grid';
import type { BoardWidgetMember, DashboardData } from './types/model';
import { defaultCellSize, tierSize } from './widget-catalog';
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
	// Geometry of the default external slot; the provider owns its business and rendering.
	if (widget.provider === 'task' && widget.kind === 'tasks') return { w: 6, h: 4, minW: 3, minH: 2 };
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
	return [
		...['calendar', 'clock', 'pomodoro', 'usage', 'quick-actions'].map((kind) => member(kind)),
		{ memberId: 'task:tasks:default', provider: 'task', kind: 'tasks', instanceId: 'default' },
	];
}

type Slot = readonly [x: number, y: number, tier: HomeWidgetTier];
/** The first board: calendar and to-do side by side, four small widgets, projects across, memo and quick notes. */
const WIDGET_SLOTS: Readonly<Record<string, Slot>> = {
	calendar: [0, 0, 'L'],
	tasks: [6, 0, 'L'],
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
		if (source.type === 'widget' && source.member.provider === 'task' && source.member.kind === 'tasks' && slot) {
			items.push({ i: source.id, x: slot[0], y: slot[1], w: 6, h: 4 });
			continue;
		}
		if (!slot || !spec) continue;
		const size = tierSize(spec, slot[2]);
		items.push({ i: source.id, x: slot[0], y: slot[1], w: size.w, h: size.h });
	}
	return { ...board, grid: { v: GRID_VERSION, lg: items } };
}
