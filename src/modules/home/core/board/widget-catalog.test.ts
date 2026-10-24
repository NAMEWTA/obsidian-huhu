import { expect, test } from 'vitest';
import type { HomeWidgetKind } from '../../api';
import { BUILTIN_WIDGETS, SECTION_WIDGETS, sectionDefaultSize } from './widget-table';
import {
	catalogCategories,
	defaultCellSize,
	exactTier,
	filterCatalog,
	supportedTiers,
	tierSize,
	type CatalogEntry,
} from './widget-catalog';
import { HOME_WIDGET_CATEGORIES } from './widget-tiers';

const kind = (key: string, category: HomeWidgetKind['category'] = 'time'): HomeWidgetKind => ({
	key,
	titleKey: key,
	icon: 'x',
	category,
	defaultTier: 'M',
	minSize: { w: 3, h: 2 },
	sizes: { S: { w: 3, h: 2 }, M: { w: 6, h: 2 }, XL: { w: 12, h: 4 } },
	instances: () => [{ id: 'default' }],
	render: () => undefined,
});

const TIERS = { S: { w: 3, h: 2 }, M: { w: 6, h: 2 }, L: { w: 6, h: 4 }, XL: { w: 12, h: 4 } };

test('every built-in declares its tiers once, from the four board sizes, with a default among them and a minimum that fits', () => {
	const keys = new Set<string>();
	for (const spec of [...BUILTIN_WIDGETS, ...SECTION_WIDGETS]) {
		expect(keys.has(spec.key), spec.key).toBe(false);
		keys.add(spec.key);
		expect(spec.sizes[spec.defaultTier], spec.key).toBeDefined();
		for (const [tier, cell] of Object.entries(spec.sizes)) {
			expect(cell, `${spec.key} ${tier}`).toEqual(TIERS[tier as keyof typeof TIERS]);
			expect(cell.w).toBeGreaterThanOrEqual(spec.minSize.w);
			expect(cell.h).toBeGreaterThanOrEqual(spec.minSize.h);
		}
	}
});

test('the starting sizes follow the plan: clock weather medium, calendar large, to-do large, projects across the row', () => {
	const start = (key: string) =>
		defaultCellSize([...BUILTIN_WIDGETS, ...SECTION_WIDGETS].find((spec) => spec.key === key)!);
	expect(start('clock')).toEqual(TIERS.M);
	expect(start('pomodoro')).toEqual(TIERS.S);
	expect(start('usage')).toEqual(TIERS.S);
	expect(BUILTIN_WIDGETS.some((kind) => kind.key === 'weather')).toBe(false);
	expect(start('calendar')).toEqual(TIERS.L);
	expect(start('quick-actions')).toEqual(TIERS.M);
	expect(start('section-memo')).toEqual(TIERS.M);
	expect(start('section-todo')).toEqual(TIERS.L);
	expect(start('section-projects')).toEqual(TIERS.XL);
	expect(start('section-library')).toEqual(TIERS.XL);
	expect(sectionDefaultSize('memo')).toMatchObject({ w: 6, h: 2, minW: 3, minH: 2 });
	// sections with a toolbar over their content never offer the one-row size
	for (const key of ['section-rss', 'section-web', 'section-library', 'section-pm'])
		expect(Object.keys(SECTION_WIDGETS.find((spec) => spec.key === key)!.sizes), key).toEqual(['L', 'XL']);
	// the inbox is the one section that fits the small tile too: items on top, the capture strip underneath
	expect(Object.keys(SECTION_WIDGETS.find((spec) => spec.key === 'section-memo')!.sizes)).toEqual([
		'S',
		'M',
		'L',
		'XL',
	]);
	expect(sectionDefaultSize('nothing')).toMatchObject(TIERS.M);
});

test('tiers resolve to grid cells, in order, and an unsupported tier falls back to the default', () => {
	const k = kind('calendar');
	expect(supportedTiers(k)).toEqual(['S', 'M', 'XL']);
	expect(tierSize(k, 'XL')).toEqual({ w: 12, h: 4 });
	expect(tierSize(k, 'L')).toEqual({ w: 6, h: 2 });
	expect(defaultCellSize(k)).toEqual({ w: 6, h: 2 });
});

test('only exact cells count as a tier', () => {
	const k = kind('calendar');
	expect(exactTier(k, { w: 6, h: 2 })).toBe('M');
	expect(exactTier(k, { w: 6, h: 3 })).toBeUndefined();
});

test('the add panel filters by text and category and lists only categories that still have entries', () => {
	const entries: CatalogEntry[] = [
		{ module: 'home', kind: kind('calendar', 'time'), title: 'Calendar' },
		{ module: 'home', kind: kind('pomodoro', 'productivity'), title: 'Pomodoro' },
		{ module: 'home', kind: kind('album', 'media'), title: 'Photo album' },
	];
	expect(filterCatalog(entries, 'photo').map((e) => e.kind.key)).toEqual(['album']);
	expect(filterCatalog(entries, ' CAL ').map((e) => e.kind.key)).toEqual(['calendar']);
	expect(filterCatalog(entries, '', 'productivity').map((e) => e.kind.key)).toEqual(['pomodoro']);
	expect(catalogCategories(filterCatalog(entries, 'o'), HOME_WIDGET_CATEGORIES)).toEqual(['productivity', 'media']);
	expect(catalogCategories(filterCatalog(entries, 'photo'), HOME_WIDGET_CATEGORIES)).toEqual(['media']);
});
