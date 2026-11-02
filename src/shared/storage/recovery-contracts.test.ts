import { expect, test } from 'vitest';
import { RecoveryError, isRecoveryJournal, isSafeRelativePath } from './recovery-contracts';

const digest = 'a'.repeat(64);
const journal = {
	format: 1,
	seq: 1,
	operationId: 'op-1',
	operation: 'x',
	phase: 'prepared',
	createdAt: 1,
	entries: [{ path: '.huhu/a.json', owner: 'o', oldDigest: digest, newDigest: null }],
};

test('journal codec accepts a complete journal and rejects damaged shapes', () => {
	expect(isRecoveryJournal(journal)).toBe(true);
	for (const bad of [
		null,
		{ ...journal, format: 2 },
		{ ...journal, seq: 0 },
		{ ...journal, phase: 'weird' },
		{ ...journal, operationId: '../x' },
		{ ...journal, entries: [{ path: 'a', owner: 'o', oldDigest: 'short', newDigest: null }] },
		{ ...journal, entries: 'no' },
	])
		expect(isRecoveryJournal(bad)).toBe(false);
});

test('paths in a journal can never leave the vault', () => {
	for (const ok of ['.huhu/a/b.json', 'huhu/x.md']) expect(isSafeRelativePath(ok)).toBe(true);
	for (const bad of ['', '/abs', 'C:/x', 'a\\b', 'a/../b', './a', 'a//b', 'a/./b', '../a', 'a\0b'])
		expect(isSafeRelativePath(bad)).toBe(false);
});

test('RecoveryError carries a code and detail without leaking into the message', () => {
	const error = new RecoveryError('BUSY', 'busy', { busy: ['x'] });
	expect(error).toMatchObject({ name: 'RecoveryError', code: 'BUSY', detail: { busy: ['x'] } });
});
