import type { CellSize } from './widget-catalog';
import type { HomeWidgetCategory, HomeWidgetTier } from './widget-tiers';

type Sizes = Partial<Record<HomeWidgetTier, CellSize>>;
export interface BuiltinWidgetSpec {
	key: string;
	icon: string;
	category: HomeWidgetCategory;
	sizes: Sizes;
	defaultTier: HomeWidgetTier;
	minSize: CellSize;
	multiple?: boolean;
	/** Board content section this kind creates (notes, projects, ...). */
	section?: string;
}

const cell = (w: number, h: number): CellSize => ({ w, h });
/** The four sizes of the board, in grid cells (12 columns of the page width, rows of a fixed pixel height). */
const S = cell(3, 2);
const M = cell(6, 2);
const L = cell(6, 4);
const XL = cell(12, 4);
const smallest = cell(3, 2);

const SIZES: Record<HomeWidgetTier, CellSize> = { S, M, L, XL };
const tiers = (...names: HomeWidgetTier[]): Sizes => Object.fromEntries(names.map((name) => [name, SIZES[name]]));

/**
 * The one size table of every built-in widget: S 3×2, M 6×2, L 6×4, XL 12×4 (columns × rows), the phone-widget
 * proportions. A kind lists only the tiers that make sense for it; free resizing snaps to the grid and stops at
 * `minSize`.
 */
export const BUILTIN_WIDGETS: readonly BuiltinWidgetSpec[] = [
	{
		key: 'clock',
		multiple: true,
		icon: 'clock',
		category: 'time',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'calendar',
		icon: 'calendar',
		category: 'time',
		sizes: tiers('S', 'M', 'L', 'XL'),
		defaultTier: 'L',
		minSize: smallest,
	},
	{
		key: 'lunar',
		icon: 'moon',
		category: 'time',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'S',
		minSize: smallest,
	},
	{
		key: 'year-progress',
		icon: 'calendar-range',
		category: 'time',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'countdown',
		icon: 'timer',
		category: 'time',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'S',
		minSize: smallest,
		multiple: true,
	},
	{
		key: 'anniversary',
		icon: 'cake',
		category: 'time',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'S',
		minSize: smallest,
		multiple: true,
	},
	{
		key: 'pomodoro',
		icon: 'timer-reset',
		category: 'productivity',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'S',
		minSize: smallest,
	},
	{
		key: 'habit',
		icon: 'check-circle',
		category: 'record',
		sizes: tiers('M', 'L', 'XL'),
		defaultTier: 'L',
		minSize: smallest,
	},
	{
		key: 'expense',
		icon: 'wallet',
		category: 'record',
		sizes: tiers('S', 'M', 'L', 'XL'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'reading',
		icon: 'book-open',
		category: 'record',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'M',
		minSize: smallest,
	},

	{
		key: 'usage',
		icon: 'gauge',
		category: 'agent',
		sizes: tiers('S', 'M', 'L', 'XL'),
		defaultTier: 'S',
		minSize: smallest,
	},
	{
		key: 'quick-actions',
		icon: 'zap',
		category: 'tools',
		sizes: tiers('M', 'L', 'XL'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'skills',
		icon: 'sparkles',
		category: 'agent',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'fileSearch',
		icon: 'search',
		category: 'tools',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'recent',
		icon: 'history',
		category: 'content',
		sizes: tiers('S', 'M', 'L', 'XL'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'nav-recent',
		icon: 'history',
		category: 'content',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'nav-shortcuts',
		icon: 'bookmark',
		category: 'content',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'M',
		minSize: smallest,
	},
	{
		key: 'music',
		icon: 'music',
		category: 'media',
		sizes: tiers('S', 'M', 'L'),
		defaultTier: 'M',
		minSize: smallest,
		multiple: false,
	},
	{
		key: 'album',
		icon: 'image',
		category: 'media',
		sizes: tiers('S', 'M', 'L', 'XL'),
		defaultTier: 'L',
		minSize: smallest,
		multiple: true,
	},
];

/**
 * Content sections. Notes, to-do, sticky notes and skills can be as short as one 6×2 row; the others carry a toolbar
 * above their content (feeds, tables, boards, media) and start at 6×4, the wide ones across the whole row.
 */
const compact = tiers('M', 'L', 'XL');
const section = (
	type: string,
	icon: string,
	category: HomeWidgetCategory,
	defaultTier: HomeWidgetTier = 'M',
	sizes: Sizes = tiers('L', 'XL'),
): BuiltinWidgetSpec => ({
	key: `section-${type}`,
	icon,
	category,
	sizes,
	defaultTier,
	minSize: smallest,
	multiple: true,
	section: type,
});

/** Board content sections as widget kinds: adding one creates a column of that type. */
export const SECTION_WIDGETS: readonly BuiltinWidgetSpec[] = [
	// The inbox: items on top, fleeting capture at the bottom, today's captures beside the list when it is wide enough.
	section('memo', 'inbox', 'productivity', 'M', tiers('S', 'M', 'L', 'XL')),
	section('todo', 'check-square', 'productivity', 'L', compact),
	section('sticky', 'sticky-note', 'content', 'M', compact),
	section('projects', 'notebook', 'content', 'XL'),
	section('library', 'database', 'content', 'XL'),
	section('folder', 'folder', 'content', 'XL'),
	section('dataview', 'table', 'content', 'XL'),
	section('pm', 'kanban', 'productivity', 'XL'),
	section('pipeline', 'workflow', 'productivity', 'XL'),
	section('skills', 'sparkles', 'agent', 'M', compact),
	section('calendar', 'calendar', 'time', 'XL'),
	section('rss', 'rss', 'media', 'XL'),
	section('images', 'image', 'media', 'XL'),
	section('videos', 'video', 'media', 'XL'),
	section('web', 'globe', 'media', 'XL'),
];

const SECTION_BY_TYPE = new Map(SECTION_WIDGETS.map((spec) => [spec.section!, spec]));

/** Starting size of a content section on the board. */
export function sectionDefaultSize(type: string | undefined): CellSize & { minW: number; minH: number } {
	const spec = (type && SECTION_BY_TYPE.get(type)) || SECTION_BY_TYPE.get('sticky')!;
	const size = spec.sizes[spec.defaultTier]!;
	return { w: size.w, h: size.h, minW: spec.minSize.w, minH: spec.minSize.h };
}
