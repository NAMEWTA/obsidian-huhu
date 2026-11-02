import type { CommentThread } from './model';

export interface HighlightRow { path: string; thread: CommentThread }
export type HighlightGroupBy = 'file' | 'color' | 'tag';
export type HighlightSort = 'position' | 'created' | 'activity';
export interface CatalogQuery {
	search: string;
	color: string;
	status: 'all' | 'open' | 'resolved';
	showArchived: boolean;
}
export function filterHighlightRows(rows: readonly HighlightRow[], query: CatalogQuery): HighlightRow[] {
	const q = query.search.trim().toLocaleLowerCase();
	return rows.filter(({ path, thread }) => {
		if (!query.showArchived && thread.archivedAt) return false;
		if (query.color !== 'all' && thread.color !== query.color) return false;
		if (query.status !== 'all' && (thread.status === 'resolved') !== (query.status === 'resolved')) return false;
		if (!q) return true;
		return [path, thread.anchor.text, thread.note ?? '', ...(thread.tags ?? []),
			...thread.messages.map(m => m.text)].some(value => value.toLocaleLowerCase().includes(q));
	});
}
export function sortHighlightRows(rows: readonly HighlightRow[], sort: HighlightSort): HighlightRow[] {
	return [...rows].sort((a, b) => {
		if ((a.thread.status === 'orphaned') !== (b.thread.status === 'orphaned')) return a.thread.status === 'orphaned' ? 1 : -1;
		if (sort === 'position') return a.path.localeCompare(b.path) || a.thread.anchor.start - b.thread.anchor.start
			|| a.thread.anchor.end - b.thread.anchor.end || a.thread.id.localeCompare(b.thread.id);
		if (!!a.thread.pinnedAt !== !!b.thread.pinnedAt) return a.thread.pinnedAt ? -1 : 1;
		if (a.thread.pinnedAt && b.thread.pinnedAt) {
			const pinned = b.thread.pinnedAt.localeCompare(a.thread.pinnedAt);
			if (pinned) return pinned;
		}
		const aTime = sort === 'created' ? a.thread.createdAt : a.thread.updatedAt;
		const bTime = sort === 'created' ? b.thread.createdAt : b.thread.updatedAt;
		return bTime.localeCompare(aTime) || a.thread.id.localeCompare(b.thread.id);
	});
}
export function groupHighlightRows(rows: readonly HighlightRow[], by: HighlightGroupBy) {
	const grouped = new Map<string, HighlightRow[]>();
	for (const row of rows) {
		const keys = by === 'file' ? [row.path] : by === 'color' ? [row.thread.color ?? 'legacy']
			: row.thread.tags?.length ? row.thread.tags : ['__untagged__'];
		for (const key of keys) {
			if (!grouped.has(key)) grouped.set(key, []);
			grouped.get(key)!.push(row);
		}
	}
	return [...grouped.entries()].map(([key, items]) => ({ key, items }));
}
/** Pure formatter; the source note is never modified during export. */
export function highlightsToMarkdown(rows: readonly HighlightRow[], includeDiscussion = false): string {
	const lines = ['# HUHU Highlights', ''];
	for (const { path, thread } of rows) {
		lines.push('## ' + path, '', thread.anchor.text.split('\n').map(line => '> ' + line).join('\n'), '',
			'- Color: ' + (thread.color ?? 'legacy') + (thread.colorHex ? ' (' + thread.colorHex + ')' : ''),
			'- Position: line ' + thread.anchor.lineHint + ', offset ' + thread.anchor.start,
			'- Tags: ' + (thread.tags ?? []).join(', '));
		if (thread.note) lines.push('', thread.note);
		if (includeDiscussion && thread.messages.length) for (const msg of thread.messages) lines.push('', '**' + (msg.author || 'Anonymous') + '** (' + msg.createdAt + '):', msg.text);
		lines.push('');
	}
	return lines.join('\n');
}
