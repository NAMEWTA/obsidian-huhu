import type { NavigatorPeriodicService } from '../api';

/** Preview completion and active-file notifications do not change the diary's file contents. */
export function observeDiaryChanges(
	journal: Pick<NavigatorPeriodicService, 'inspect' | 'subscribe'>,
	subscribeFiles: ((listener: () => void) => () => void) | undefined,
	changed: () => void,
): () => void {
	const identity = () => { const note = journal.inspect('day', new Date(2000, 0, 1)); return JSON.stringify([note.path, note.status]); };
	let previous = identity();
	const detachJournal = journal.subscribe(() => { const next = identity(); if (next !== previous) { previous = next; changed(); } });
	const detachFiles = subscribeFiles?.(changed);
	return () => { detachJournal(); detachFiles?.(); };
}
