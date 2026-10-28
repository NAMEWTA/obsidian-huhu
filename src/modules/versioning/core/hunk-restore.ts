import type { DocumentSnapshot } from '../../../shared/storage/document-mutation';
import { applyTextEdits } from '../../../shared/storage/text-edits';

export interface HunkRange {
	readonly fromA: number; readonly toA: number; readonly fromB: number; readonly toB: number;
	readonly precise: boolean;
}
export interface HunkDiff {
	readonly left: string; readonly right: string; readonly precise: boolean; readonly chunks: readonly HunkRange[];
}
export interface RestoreHunk extends HunkRange { readonly id: string; readonly sourceFrom: number; readonly sourceTo: number; readonly targetFrom: number; readonly targetTo: number }
export interface HunkRestoreOrigin { readonly id: string; readonly path: string; readonly leafId: string; readonly generation: number }
export interface HunkRestoreSelection { readonly target: DocumentSnapshot; readonly origin: HunkRestoreOrigin; readonly diff: HunkDiff; readonly selected: readonly string[] }

const unavailable = () => new Error('versioning.restore.hunks-unavailable');
function projection(text: string) {
	const offsets = new Int32Array(text.length + 1);
	let raw = text.startsWith('\uFEFF') ? 1 : 0, display = 0;
	offsets[0] = raw;
	while (raw < text.length) {
		raw += text[raw] === '\r' && text[raw + 1] === '\n' ? 2 : 1;
		offsets[++display] = raw;
	}
	return { text: text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'), offsets };
}

/** Verify the entire display proof against immutable raw snapshots before exposing any selectable raw range. */
export function restoreHunks(source: string, target: string, diff: HunkDiff): readonly RestoreHunk[] {
	if (!diff.precise || source.length + target.length > 2_000_000 || !diff.chunks.length) throw unavailable();
	const a = projection(source), b = projection(target);
	if (a.text !== diff.left || b.text !== diff.right) throw unavailable();
	let previousA = 0, previousB = 0, reconstructed = '';
	const boundary = (text: string, from: number, to: number) => Number.isSafeInteger(from) && Number.isSafeInteger(to)
		&& from >= 0 && to >= from && from <= text.length && to <= text.length + 1
		&& (from === 0 || text[from - 1] === '\n')
		&& (to >= text.length || to === 0 || text[to - 1] === '\n');
	const hunks = diff.chunks.map(chunk => {
		if (!chunk.precise || !boundary(a.text, chunk.fromA, chunk.toA) || !boundary(b.text, chunk.fromB, chunk.toB)) throw unavailable();
		// CM Chunk.toA/toB may be one past EOF (installed @codemirror/merge Chunk contract).
		const fromA = chunk.fromA, toA = Math.min(chunk.toA, a.text.length), fromB = chunk.fromB, toB = Math.min(chunk.toB, b.text.length);
		if (fromA < previousA || fromB < previousB || a.text.slice(previousA, fromA) !== b.text.slice(previousB, fromB)
			|| a.text.slice(fromA, toA) === b.text.slice(fromB, toB)) throw unavailable();
		reconstructed += b.text.slice(previousB, fromB) + a.text.slice(fromA, toA);
		previousA = toA; previousB = toB;
		return { ...chunk, id: `${fromA}:${toA}:${fromB}:${toB}`, sourceFrom: a.offsets[fromA]!, sourceTo: a.offsets[toA]!,
			targetFrom: b.offsets[fromB]!, targetTo: b.offsets[toB]! };
	});
	if (a.text.slice(previousA) !== b.text.slice(previousB) || reconstructed + b.text.slice(previousB) !== a.text) throw unavailable();
	return hunks;
}

/** Preserve unselected raw ranges and verify the actual writer's conversion against the authorized display edits. */
export function applySelectedHunks(source: string, target: string, diff: HunkDiff, selected: readonly string[],
	editableText: (text: string) => string = text => text): string {
	const hunks = restoreHunks(source, target, diff), ids = new Set(selected);
	if (!ids.size || ids.size !== selected.length || selected.some(id => !hunks.some(hunk => hunk.id === id))) throw unavailable();
	const chosen = hunks.filter(hunk => ids.has(hunk.id));
	const expected = applyTextEdits(diff.right, chosen.map(hunk => ({ from: hunk.fromB, to: Math.min(hunk.toB, diff.right.length),
		insert: diff.left.slice(hunk.fromA, hunk.toA) })));
	const result = editableText(applyTextEdits(target, chosen.map(hunk => ({ from: hunk.targetFrom, to: hunk.targetTo,
		insert: source.slice(hunk.sourceFrom, hunk.sourceTo) }))));
	// A selected trailing CR next to an unselected LF would become one CRLF and erase a blank line.
	// Input range proofs cannot detect that new boundary: reject any non-faithful final conversion.
	if (result.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n') !== expected) throw unavailable();
	return result;
}
