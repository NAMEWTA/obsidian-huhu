// Adapted from jonaas-dev/obsidian-margin-comments f727e38 (MIT), Copyright (c) 2026 jonaas-dev: src/editor/marker-pass.ts, src/editor/line-highlight.ts
import { Decoration, type DecorationSet, type EditorView } from '@codemirror/view';
import type { CommentsEnv } from '../env';
import { pathOf } from './markers';
import { threadHighlightHex } from '../../core/highlight-colors';

/** Split overlapping ranges into disjoint marks carrying every covering thread id. */
/** Sweep endpoints once: O(n log n + output) instead of filtering every range per segment. */
export function segments(ranges: { start: number; end: number; id: string }[]) {
	const events = ranges.flatMap((range, index) => [
		{ pos: range.start, open: true, index, id: range.id },
		{ pos: range.end, open: false, index, id: range.id },
	]).sort((a, b) => a.pos - b.pos || Number(a.open) - Number(b.open) || a.index - b.index);
	const active = new Map<string, number>();
	const output: { start: number; end: number; ids: string[] }[] = [];
	let last: number | null = null;
	for (let i = 0; i < events.length;) {
		const pos = events[i]!.pos;
		if (last !== null && pos > last && active.size) {
			output.push({ start: last, end: pos, ids: [...active].sort((x, y) => x[1] - y[1]).map(([id]) => id) });
		}
		while (i < events.length && events[i]!.pos === pos) {
			const event = events[i++]!;
			if (event.open) active.set(event.id, event.index); else active.delete(event.id);
		}
		last = pos;
	}
	return output;
}
export function buildDecorations(view: EditorView, env: CommentsEnv): DecorationSet {
	const settings = env.service.settings(), path = pathOf(view.state);
	if (!path || !settings.highlightEnabled) return Decoration.none;
	const ranges: { start: number; end: number; id: string }[] = [];
	const byId = new Map(env.service.store.threadsFor(path).map(thread => [thread.id, thread]));
	const lines = new Set<number>();
	for (const thread of env.service.store.threadsFor(path)) {
		if (thread.status === 'orphaned' || (thread.status === 'resolved' && !settings.highlightResolved && !thread.color)) continue;
		const { start, end, text } = thread.anchor;
		if (start < 0 || end > view.state.doc.length || view.state.doc.sliceString(start, end) !== text) continue;
		if (thread.kind === 'line') { if (settings.highlightLines) lines.add(view.state.doc.lineAt(start).from); }
		else if (end > start) ranges.push({ start, end, id: thread.id });
	}
	return Decoration.set([
		...segments(ranges).map(range => {
			const primary = [...range.ids].sort((a, b) => (byId.get(b)?.createdAt ?? '').localeCompare(byId.get(a)?.createdAt ?? '') || a.localeCompare(b))[0]!;
			const selected = byId.get(primary);
			const hex = selected ? threadHighlightHex(selected, settings) : 'var(--interactive-accent)';
			return Decoration.mark({ class: 'huhu-comment-hl', attributes: {
				'data-comment-ids': range.ids.join(' '),
				'data-highlight-count': String(range.ids.length),
				'style': `--huhu-highlight-color: ${hex};`,
			} }).range(range.start, range.end);
		}),
		...[...lines].map(pos => Decoration.line({ class: 'huhu-comment-line' }).range(pos)),
	], true);
}
