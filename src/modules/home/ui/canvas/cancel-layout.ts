import type { BoardGrid, GridItem } from '../../core/board/grid';

const sameCell = (a: GridItem, b: GridItem) => a.i === b.i && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
/** Undo only geometry still owned by this submission; independent additions, moves and content survive. */
export function cancelSubmittedLayout(
	current: BoardGrid | undefined,
	before: BoardGrid | undefined,
	submitted: Partial<Pick<BoardGrid, 'lg' | 'md'>>,
): BoardGrid | undefined {
	if (!current) return current;
	const restored: BoardGrid = { ...current, lg: [...current.lg] };
	for (const key of ['lg', 'md'] as const) {
		const attempt = submitted[key];
		if (!attempt || !current[key]) continue;
		const old = new Map((before?.[key] ?? []).map((item) => [item.i, item]));
		const written = new Map(attempt.map((item) => [item.i, item]));
		const items = current[key].flatMap((item) => {
			const owned = written.get(item.i);
			return owned && sameCell(item, owned) ? (old.has(item.i) ? [old.get(item.i)!] : []) : [item];
		});
		if (key === 'md' && !before?.md && items.length === 0) delete restored.md;
		else restored[key] = items;
	}
	return !before && restored.lg.length === 0 && !restored.md ? undefined : restored;
}
