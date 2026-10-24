// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.

/** The row a click lands on, as far as folding is concerned. */
export interface FoldRow { key: string; expanded: boolean }

/** How a run of clicks on one row began: which row, and whether it was unfolded before the first click. */
export interface FoldSequence { key: string; expanded: boolean }

export interface FoldClick {
	/** Unfold the row now. A click never folds a row, so the notes of an open folder stay in view. */
	expand: boolean;
	/** True for the second click of a double click: the row is already selected and nothing more happens. */
	repeat: boolean;
	/** What to remember for the double click that may follow. */
	sequence: FoldSequence;
}

/**
 * A click on a row that has children selects it and unfolds it when it was folded; an unfolded row stays unfolded.
 * `detail` is the browser's click count: an odd count starts a sequence, an even one is the second click of a double
 * click, which must not change anything (the folder the first click just unfolded would otherwise be re-opened or
 * re-selected twice). A third click shortly after a double click is a new single click.
 */
export function foldClick(row: FoldRow, detail: number, current: FoldSequence | null): FoldClick {
	if (detail > 1 && detail % 2 === 0 && current?.key === row.key) return { expand: false, repeat: true, sequence: current };
	return { expand: !row.expanded, repeat: false, sequence: { key: row.key, expanded: row.expanded } };
}

/**
 * A double click toggles the row relative to where the sequence began, so a folded row ends up unfolded (its first
 * click already did it, nothing flickers) and an unfolded row folds. Without a remembered sequence it toggles the row.
 * Returns whether the row should end up expanded.
 */
export function foldDoubleClick(row: FoldRow, current: FoldSequence | null): boolean {
	const began = current?.key === row.key ? current.expanded : row.expanded;
	return !began;
}
