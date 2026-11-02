import type { TextEdit } from './document-mutation';

/** Exact edits with bounded line matching. Equal runs remain outside replacement ranges. */
export function textEdits(before: string, after: string): TextEdit[] {
	if (before === after) return [];
	const a = before.match(/[^\n]*\n|[^\n]+$/g) ?? [],
		b = after.match(/[^\n]*\n|[^\n]+$/g) ?? [];
	const offsets = (lines: string[]) => {
		const out = [0];
		for (const line of lines) out.push(out[out.length - 1]! + line.length);
		return out;
	};
	const ao = offsets(a),
		bo = offsets(b),
		edits: TextEdit[] = [];
	const replace = (as: number, ae: number, bs: number, be: number) => {
		let from = ao[as]!,
			to = ao[ae]!,
			start = bo[bs]!,
			end = bo[be]!;
		while (from < to && start < end && before[from] === after[start]) {
			from++;
			start++;
		}
		while (to > from && end > start && before[to - 1] === after[end - 1]) {
			to--;
			end--;
		}
		if (from !== to || start !== end) edits.push({ from, to, insert: after.slice(start, end) });
	};
	const walk = (as: number, ae: number, bs: number, be: number, depth = 0): void => {
		while (as < ae && bs < be && a[as] === b[bs]) {
			as++;
			bs++;
		}
		while (as < ae && bs < be && a[ae - 1] === b[be - 1]) {
			ae--;
			be--;
		}
		if (as === ae || bs === be || depth > 32) {
			replace(as, ae, bs, be);
			return;
		}
		const an = ae - as,
			bn = be - bs;
		if (an * bn <= 250_000) {
			const stride = bn + 1,
				table = new Uint32Array((an + 1) * stride);
			for (let i = an - 1; i >= 0; i--)
				for (let j = bn - 1; j >= 0; j--)
					table[i * stride + j] =
						a[as + i] === b[bs + j]
							? table[(i + 1) * stride + j + 1]! + 1
							: Math.max(table[(i + 1) * stride + j]!, table[i * stride + j + 1]!);
			let i = 0,
				j = 0,
				ai = as,
				bi = bs;
			while (i < an && j < bn) {
				if (a[as + i] === b[bs + j]) {
					replace(ai, as + i, bi, bs + j);
					i++;
					j++;
					ai = as + i;
					bi = bs + j;
				} else if (table[(i + 1) * stride + j]! >= table[i * stride + j + 1]!) i++;
				else j++;
			}
			replace(ai, ae, bi, be);
			return;
		}
		// Patience anchors bound memory on large notes. Ambiguous repeated lines never become guessed anchors.
		const unique = (lines: string[], start: number, end: number) => {
			const positions = new Map<string, number>();
			for (let i = start; i < end; i++) positions.set(lines[i]!, positions.has(lines[i]!) ? -1 : i);
			return positions;
		};
		const ap = unique(a, as, ae),
			bp = unique(b, bs, be);
		const pairs = [...ap]
			.flatMap(([line, i]) => {
				const j = bp.get(line);
				return i >= 0 && j !== undefined && j >= 0 ? [{ i, j }] : [];
			})
			.sort((x, y) => x.i - y.i);
		const tails: number[] = [],
			previous = new Int32Array(pairs.length).fill(-1);
		for (let k = 0; k < pairs.length; k++) {
			let low = 0,
				high = tails.length;
			while (low < high) {
				const mid = (low + high) >>> 1;
				if (pairs[tails[mid]!]!.j < pairs[k]!.j) low = mid + 1;
				else high = mid;
			}
			if (low) previous[k] = tails[low - 1]!;
			tails[low] = k;
		}
		if (!tails.length) {
			replace(as, ae, bs, be);
			return;
		}
		const anchors: { i: number; j: number }[] = [];
		for (let k = tails[tails.length - 1]!; k >= 0; k = previous[k]!) anchors.push(pairs[k]!);
		anchors.reverse();
		for (const anchor of anchors) {
			walk(as, anchor.i, bs, anchor.j, depth + 1);
			as = anchor.i + 1;
			bs = anchor.j + 1;
		}
		walk(as, ae, bs, be, depth + 1);
	};
	walk(0, a.length, 0, b.length);
	return edits;
}

export function applyTextEdits(text: string, edits: readonly TextEdit[]): string {
	let previous = 0,
		result = '';
	for (const edit of edits) {
		if (
			!Number.isInteger(edit.from) ||
			!Number.isInteger(edit.to) ||
			edit.from < previous ||
			edit.to < edit.from ||
			edit.to > text.length
		)
			throw new Error('Invalid text edit');
		result += text.slice(previous, edit.from) + edit.insert;
		previous = edit.to;
	}
	return result + text.slice(previous);
}

/** A range touching replaced text has no reliable position identity. */
export function unchangedRange(
	start: number,
	end: number,
	edits: readonly TextEdit[],
): { start: number; end: number } | null {
	let delta = 0;
	for (const edit of edits) {
		if (edit.to <= start) {
			delta += edit.insert.length - (edit.to - edit.from);
			continue;
		}
		if (edit.from >= end) break;
		return null;
	}
	return { start: start + delta, end: end + delta };
}

export async function textHash(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
