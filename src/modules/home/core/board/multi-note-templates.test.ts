import { expect, test } from 'vitest';
import { parse, serialize } from './parser';
import { templateChoices } from './board-experience';

const original =
	'\uFEFF---\r\ncustom: keep # author\r\ncolumns:\r\n  - name: Notes\r\n    type: library\r\n    library:\r\n      filters: []\r\n      viewMode: grid\r\n      sortBy: modified\r\n      sortDesc: true\r\n      templatePaths: [Templates/Old.md] # keep\r\n      custom: nested\r\n---\r\n## Notes\r\nMy notes.\r\n';

test('an unrelated edit keeps the template list, author comments and custom keys', () => {
	const board = parse(original),
		config = board.columns[0]!.libraryConfig!;
	expect(config.templatePaths).toEqual(['Templates/Old.md']);
	expect(serialize(board)).toBe(original);
	config.sortBy = 'title';
	const changed = serialize(board);
	expect(changed).toContain('sortBy: title');
	expect(changed).toContain('templatePaths: [ Templates/Old.md ] # keep');
	expect(changed).toContain('custom: nested');
	expect(changed).toContain('My notes.\r\n');
});

test('ordered choices survive edits; an explicit empty list creates a blank note', () => {
	const board = parse(original),
		config = board.columns[0]!.libraryConfig!;
	config.templatePaths = templateChoices([
		' Templates/B.md ',
		'Templates/A.md',
		'Templates/B.md',
		'',
	]);
	const saved = serialize(board),
		back = parse(saved).columns[0]!.libraryConfig!;
	expect(back.templatePaths).toEqual(['Templates/B.md', 'Templates/A.md']);
	expect(serialize(parse(saved))).toBe(saved);
	back.templatePaths = [];
	expect(templateChoices(back.templatePaths)).toEqual([]);
});
