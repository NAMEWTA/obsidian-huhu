import { expect, test } from 'vitest';
import type { RestoreReceipt } from './restore';
import { protectsRestoreObjects } from './history-retention';

test('undo and uncertain writes stay protected even after prompt acknowledgement; terminal records are eligible', () => {
	const receipt: RestoreReceipt = { id: 'receipt', path: 'note.md', sourceId: 'source', sourceLabel: '', mode: 'replace-current', stage: 'needs-review',
		createdAt: 1, updatedAt: 1, beforeObject: null, beforeDiskObject: null, afterObject: null, repositoryBaseline: 'baseline', acknowledgedAt: 2 };
	expect(protectsRestoreObjects(receipt)).toBe(true);
	expect(protectsRestoreObjects({ ...receipt, stage: 'verified', acknowledgedAt: undefined })).toBe(true);
	expect(protectsRestoreObjects({ ...receipt, stage: 'verified', mode: 'undo', undoOf: 'original' })).toBe(true);
	expect(protectsRestoreObjects({ ...receipt, stage: 'verified', undoneBy: 'undo' })).toBe(false);
	expect(protectsRestoreObjects({ ...receipt, stage: 'aborted' })).toBe(false);
});
