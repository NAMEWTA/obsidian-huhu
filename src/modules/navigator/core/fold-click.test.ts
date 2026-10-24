// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test } from 'vitest';
import { foldClick, foldDoubleClick, type FoldSequence } from './fold-click';

/** Replays the clicks a mouse sends for a (double) click on a row and returns whether the row ends up expanded. */
function play(expanded: boolean, clicks: 1 | 2 | 'double-only'): boolean {
	const key = 'folder:A';
	let state = expanded;
	let sequence: FoldSequence | null = null;
	const click = (detail: number) => {
		const step = foldClick({ key, expanded: state }, detail, sequence);
		sequence = step.sequence;
		if (step.expand) state = true;
	};
	if (clicks === 'double-only') {
		state = foldDoubleClick({ key, expanded: state }, sequence);
		return state;
	}
	click(1);
	if (clicks === 2) {
		click(2);
		state = foldDoubleClick({ key, expanded: state }, sequence);
	}
	return state;
}

test('a single click unfolds a folded row and leaves an unfolded row open', () => {
	expect(play(false, 1)).toBe(true);
	expect(play(true, 1)).toBe(true);
});

test('a double click folds an unfolded row and ends with a folded row unfolded', () => {
	expect(play(true, 2)).toBe(false);
	expect(play(false, 2)).toBe(true);
});

test('the first click of a double click never folds an unfolded row; the second click is a repeat', () => {
	const row = { key: 'folder:A', expanded: true };
	const first = foldClick(row, 1, null);
	expect(first).toEqual({ expand: false, repeat: false, sequence: { key: 'folder:A', expanded: true } });
	const second = foldClick(row, 2, first.sequence);
	expect(second.expand).toBe(false);
	expect(second.repeat).toBe(true);
	expect(second.sequence).toBe(first.sequence);
});

test('the second click of a double click does not re-open a row the first click unfolded', () => {
	const folded = { key: 'folder:A', expanded: false };
	const first = foldClick(folded, 1, null);
	expect(first.expand).toBe(true);
	// The row is expanded now, but the sequence remembers it began folded.
	const second = foldClick({ ...folded, expanded: true }, 2, first.sequence);
	expect(second.repeat).toBe(true);
	expect(second.expand).toBe(false);
	expect(foldDoubleClick({ ...folded, expanded: true }, second.sequence)).toBe(true);
});

test('a double click without a remembered sequence toggles the row', () => {
	expect(play(true, 'double-only')).toBe(false);
	expect(play(false, 'double-only')).toBe(true);
	// A sequence that began on another row does not apply.
	expect(foldDoubleClick({ key: 'folder:B', expanded: true }, { key: 'folder:A', expanded: false })).toBe(false);
});

test('a click count above one on another row starts a new sequence', () => {
	const step = foldClick({ key: 'folder:B', expanded: false }, 2, { key: 'folder:A', expanded: true });
	expect(step.repeat).toBe(false);
	expect(step.expand).toBe(true);
	expect(step.sequence).toEqual({ key: 'folder:B', expanded: false });
});

test('a third click shortly after a double click is a new single click', () => {
	// The double click folded the row; the next click unfolds it again like any single click.
	const step = foldClick({ key: 'folder:A', expanded: false }, 3, { key: 'folder:A', expanded: true });
	expect(step.repeat).toBe(false);
	expect(step.expand).toBe(true);
	expect(step.sequence).toEqual({ key: 'folder:A', expanded: false });
});

test('a keyboard-activated click (detail 0) starts a new sequence', () => {
	const step = foldClick({ key: 'folder:A', expanded: true }, 0, { key: 'folder:A', expanded: true });
	expect(step.repeat).toBe(false);
	expect(step.expand).toBe(false);
});
