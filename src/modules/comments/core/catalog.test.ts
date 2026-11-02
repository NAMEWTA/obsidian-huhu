import { expect, test } from 'vitest';
import { createAnchor } from './anchor';
import { filterHighlightRows, sortHighlightRows, groupHighlightRows, highlightsToMarkdown, type HighlightRow } from './catalog';
import type { CommentThread } from './model';

function row(path: string, start: number, color: CommentThread['color'], extras: Partial<CommentThread> = {}): HighlightRow {
	const source = 'prefix selected text suffix';
	const thread: CommentThread = {
		id: path + '-' + start, kind: 'range', status: 'open',
		anchor: { ...createAnchor(source, 7, 20), start, end: start + 13 },
		messages: [], color, createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-02T00:00:00Z', ...extras,
	};
	return { path, thread };
}
test('search covers quote, note, discussion, tags and source with archive and color facets', () => {
	const list = [row('folder/a.md', 20, 'yellow', { note: 'research observation', tags: ['concept'] }),
		row('b.md', 2, 'pink', { messages: [{ id: 'm', author: '', text: 'critical theory', createdAt: '2026-01-01' }] }),
		row('c.md', 12, 'green', { archivedAt: '2026-01-02' })];
	const base = { search: '', color: 'all', status: 'all' as const, showArchived: false };
	expect(filterHighlightRows(list, { ...base, search: 'concept' })).toEqual([list[0]]);
	expect(filterHighlightRows(list, { ...base, search: 'theory' })).toEqual([list[1]]);
	expect(filterHighlightRows(list, { ...base, color: 'green' })).toEqual([]);
	expect(filterHighlightRows(list, { ...base, color: 'green', showArchived: true })).toEqual([list[2]]);
});
test('position order uses character offsets and pin never overrides source order', () => {
	const list = [row('a.md', 10, 'pink'), row('a.md', 3, 'green', { pinnedAt: '2026-01-03' }),
		row('b.md', 1, 'blue')];
	expect(sortHighlightRows(list, 'position')).toEqual([list[1], list[0], list[2]]);
	expect(sortHighlightRows(list, 'activity')[0]).toBe(list[1]);
});
test('color and tag groups and Markdown export do not alter source data', () => {
	const list = [row('a.md', 1, 'yellow', { note: 'My own **note**', tags: ['math', 'logic'] }),
		row('b.md', 5, 'green')];
	expect(groupHighlightRows(list, 'color').map(group => group.key)).toEqual(['yellow', 'green']);
	expect(groupHighlightRows(list, 'tag').map(group => group.key)).toEqual(['math', 'logic', '__untagged__']);
	const before = JSON.stringify(list);
	const md = highlightsToMarkdown(list, true);
	expect(md).toContain('> selected text');
	expect(md).toContain('My own **note**');
	expect(md).toContain('a.md');
	expect(JSON.stringify(list)).toEqual(before);
});
