import type { AnnotationUndo, TextEdit } from '../../../shared/storage/document-mutation';
import { unchangedRange } from '../../../shared/storage/text-edits';
import { createAnchor } from './anchor';
import type { CommentStatus, CommentThread, TextAnchorV2 } from './model';

export interface AnchorCheckpoint {
	version: 1;
	path: string;
	anchors: { id: string; status: CommentStatus; anchor: TextAnchorV2 }[];
}

export function anchorCheckpoint(path: string, threads: readonly CommentThread[]): AnchorCheckpoint {
	return { version: 1, path, anchors: threads.map(({ id, status, anchor }) => ({ id, status, anchor: structuredClone(anchor) })) };
}

function checkpoint(value: unknown, path: string): AnchorCheckpoint | undefined {
	if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('path' in value) || value.path !== path || !('anchors' in value) || !Array.isArray(value.anchors)) return undefined;
	for (const raw of value.anchors) {
		if (!raw || typeof raw !== 'object') return undefined;
		const item = raw as Record<string, unknown>, anchor = item['anchor'];
		if (typeof item['id'] !== 'string' || !['open', 'resolved', 'orphaned'].includes(String(item['status'])) || !anchor || typeof anchor !== 'object') return undefined;
		const a = anchor as Record<string, unknown>;
		if (!['line', 'range'].includes(String(a['kind'])) || ['text', 'textHash', 'before', 'after'].some(key => typeof a[key] !== 'string') || ['start', 'end', 'lineHint'].some(key => !Number.isInteger(a[key]) || Number(a[key]) < 0)) return undefined;
	}
	return value as AnchorCheckpoint;
}

function locateExactly(text: string, anchor: TextAnchorV2, edits: readonly TextEdit[]): { start: number; end: number } | null {
	const mapped = unchangedRange(anchor.start, anchor.end, edits);
	if (mapped && mapped.end <= text.length && text.slice(mapped.start, mapped.end) === anchor.text) return mapped;
	if (!anchor.text) return null;
	let found = -1;
	for (let at = text.indexOf(anchor.text); at >= 0; at = text.indexOf(anchor.text, at + 1)) {
		if (found !== -1) return null;
		found = at;
	}
	return found < 0 ? null : { start: found, end: found + anchor.text.length };
}

/** Strict restore mapping: preserve exact unaffected ranges, unique quotes, or a verified inverse checkpoint. */
export function applyRestoredAnchors(path: string, threads: readonly CommentThread[], after: string, edits: readonly TextEdit[], undo?: AnnotationUndo): boolean {
	const original = undo ? checkpoint(undo.before, path) : undefined, expected = undo ? checkpoint(undo.expected, path) : undefined;
	let changed = false;
	for (const thread of threads) {
		const old = JSON.stringify({ anchor: thread.anchor, status: thread.status });
		const previous = original?.anchors.find(item => item.id === thread.id), admitted = expected?.anchors.find(item => item.id === thread.id);
		if (previous && admitted && admitted.status === thread.status && JSON.stringify(admitted.anchor) === JSON.stringify(thread.anchor)
			&& previous.anchor.end <= after.length && after.slice(previous.anchor.start, previous.anchor.end) === previous.anchor.text) {
			thread.anchor = structuredClone(previous.anchor); thread.status = previous.status;
		} else if (thread.status !== 'orphaned') {
			const range = locateExactly(after, thread.anchor, edits);
			if (range) thread.anchor = createAnchor(after, range.start, range.end, thread.kind);
			else thread.status = 'orphaned';
		}
		if (old !== JSON.stringify({ anchor: thread.anchor, status: thread.status })) { thread.updatedAt = new Date().toISOString(); changed = true; }
	}
	return changed;
}
