import { expect, test } from 'vitest';
import { boardTileSources, savedTileIds, tileSpecs } from './board-tiles';
import { builtinTileDefaults } from './canvas';
import { layoutsFor } from './grid';
import { parse } from './parser/parse';

const board = () => {
	const data = parse(
		'## Notes\n\n### One\nid: one\ntype: generic\nBody one.\n\n### Two\nid: two\ntype: generic\nBody two.\n',
	);
	data.widgets = [
		{ memberId: 'automations', provider: 'automations', kind: 'automations-hot', instanceId: 'default' },
	];
	data.grid = {
		v: 2,
		lg: [
			{ i: 'one', x: 0, y: 0, w: 4, h: 2 },
			{ i: 'deleted-reference', x: 0, y: 9, w: 3, h: 2 },
		],
	};
	return data;
};

test('mixed sources render standalone cards once; saved geometry that names nothing stays visible as a placeholder', () => {
	const data = board();
	const sources = boardTileSources(data, data.widgets!, { missing: true });
	expect(sources.map((source) => source.type)).toEqual(['widget', 'section', 'card', 'missing']);
	const section = sources.find((source) => source.type === 'section');
	expect(section?.type === 'section' && section.column.cards.map((card) => card.id)).toEqual(['two']);
	expect(data.columns[0]?.cards.map((card) => card.id)).toEqual(['one', 'two']);
	// the conversion never invents placeholders
	expect(boardTileSources(data, data.widgets!).map((source) => source.type)).toEqual(['widget', 'section', 'card']);
	// the layout keeps the placeholder where the file put it, and gives every other source a cell
	const specs = tileSpecs(sources, builtinTileDefaults);
	const lg = layoutsFor(data.grid, specs).lg;
	expect(lg.map((item) => item.i).sort()).toEqual(sources.map((source) => source.id).sort());
	expect(lg.find((item) => item.i === 'deleted-reference')).toMatchObject({ w: 3, h: 2 });
});

test('the saved ids come from the grid, both widths, or from the old tiles until the board converts', () => {
	const data = board();
	data.grid!.md = [{ i: 'md-only', x: 0, y: 0, w: 3, h: 2 }];
	expect([...savedTileIds(data)].sort()).toEqual(['deleted-reference', 'md-only', 'one']);
	expect([...savedTileIds({ legacyTiles: [{ id: 'old', w: 3, cap: 20 }] })]).toEqual(['old']);
});

test('every source starts at its kind size and a floor: widgets from the size table, sections 6x2 and up, cards small', () => {
	const data = parse(
		'---\ncolumns: [{name: Sticky, type: sticky}, {name: Data, type: dataview}, {name: Plain, type: memo}]\n---\n\n## Sticky\n\n### Note\nid: c1\nbody\n\n## Data\n\n## Plain\n',
	);
	const members = [
		{ memberId: 'home:clock:default', provider: 'home', kind: 'clock', instanceId: 'default' },
		{ memberId: 'home:calendar:default', provider: 'home', kind: 'calendar', instanceId: 'default' },
		{ memberId: 'x:y:z', provider: 'x', kind: 'unknown', instanceId: 'z' },
	];
	const specs = tileSpecs(boardTileSources(data, members), builtinTileDefaults);
	const byId = Object.fromEntries(specs.map((spec) => [spec.id, spec]));
	expect(byId['widget:clock']).toMatchObject({ w: 6, h: 2, minW: 3, minH: 2 });
	expect(byId['widget:calendar']).toMatchObject({ w: 6, h: 4, minW: 3, minH: 2 });
	expect(byId['widget:x:unknown:z']).toMatchObject({ w: 3, h: 2 });
	expect(byId['section:Data']).toMatchObject({ w: 12, h: 4 });
	expect(byId['section:Plain']).toMatchObject({ w: 6, h: 2 });
	expect(byId['card:c1']).toMatchObject({ w: 3, h: 2, minW: 2, minH: 2 });
});
