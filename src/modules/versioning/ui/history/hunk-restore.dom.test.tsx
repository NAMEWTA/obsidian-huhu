import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { EditorContextAccess, EditorDocumentContext } from '../../../../app/contracts/editor-context';
import type { DocumentMutationPort, DocumentSnapshot } from '../../../../shared/storage/document-mutation';
import { sameDocumentSnapshot } from '../../../../shared/storage/document-mutation';
import type { TextStorage } from '../../../../shared/storage/ports';
import { setLanguage } from '../../../../shared/i18n';
import { HuhuProviders } from '../../../../ui/react/providers';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { EMPTY_DEVICE_STATE } from '../../core/ports';
import { CheckpointStore } from '../../services/checkpoint-store';
import { RestoreService } from '../../services/restore-service';
import { NoteReviewService } from '../../services/note-review';
import { HistoryQueryService } from '../../services/history-query';
import type { SyncService } from '../../services/sync-service';
import { NoteReviewPage } from './NoteReviewPage';

const shared = 'keep 1\nkeep 2\nkeep 3\nkeep 4\nkeep 5\n';
const historical = `old one\n${shared}old two\n`, current = `new one\n${shared}new two\n`;
async function fixture() {
	setLanguage('en');
	let generation = 0, text = current, fail = false;
	const files = new Map<string, string>(), listeners = new Set<() => void>();
	const context = (): EditorDocumentContext => ({ id: 'source', path: 'note.md', leafId: 'source-leaf', ownerWindow: window, generation });
	let source = context();
	const snapshot = (): DocumentSnapshot => ({ path: 'note.md', documentKey: 'original-file', exists: true, text, diskText: text,
		originLeafId: 'source-leaf', buffers: [{ id: 'editor', text, generation }] });
	const storage: TextStorage = { exists: async path => files.has(path), read: async path => files.get(path)!, mkdir: async () => {},
		write: async (path, value) => { if (fail && path.includes('/objects/')) throw new Error('disk-full'); files.set(path, value); } };
	const apply = vi.fn(async (expected: DocumentSnapshot, next: string | null) => {
		if (!sameDocumentSnapshot(expected, snapshot()) || next === null) throw new Error('changed');
		text = next; generation++; source = context(); for (const listener of listeners) listener(); return snapshot();
	});
	const mutation: DocumentMutationPort = { capture: async () => snapshot(), editableText: value => value, exclusive: (_path, work) => work(), apply };
	const documents: EditorContextAccess = { capture: () => ({ context: source, text }), get: () => source, current: () => source,
		resolveLeaf: () => undefined, resolveView: () => undefined, returnTo: async () => {},
		subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
	const hold = vi.fn(async () => {}), participant = { prepare: vi.fn(async () => ({})), commit: vi.fn(async () => ({})), abort: vi.fn(async () => {}) };
	const checkpoints = new CheckpointStore(storage, 'device-1');
	const restores = new RestoreService({ documents: mutation, checkpoints, participant: () => participant,
		gate: { run: (_id, work) => work(), capture: async () => 'fixed-HEAD/index', hold, assertCheckpointProtection: async () => {} },
		assertHunkOrigin: origin => { if (origin.id !== source.id || origin.generation !== generation || origin.leafId !== source.leafId) throw new Error('versioning.restore.changed'); } });
	const queries = new HistoryQueryService(async () => { throw new Error('Fixed inline history needs no new Git read'); });
	const reviews = new NoteReviewService({ documents, queries, toRepo: path => path, open: async () => {},
		captureTarget: value => restores.captureTarget(value.path, value.leafId) });
	await reviews.openVersion(source.id, { id: 'old', commitOid: '', parents: [], author: '', time: 1, subject: 'Historical version', pathAtRevision: 'old.md', status: 'M',
		ref: { kind: 'local-snapshot', path: 'old.md', snapshotId: 'old', text: historical } });
	const id = reviews.forDocument(source.id)!.id;
	const sync = { ready: true, snapshot: { device: { ...EMPTY_DEVICE_STATE } }, subscribe: () => () => {} } as unknown as SyncService;
	const view = render(<HuhuProviders ownerDocument={document}><NoteReviewPage id={id} host={{ documents, queries, reviews, restores, sync, openSettings() {} }}
		context={{} as NativeSurfaceContext} onLayoutChange={() => {}} /></HuhuProviders>);
	return { view, reviews, restores, apply, hold, participant, files, id, text: () => text, fail: () => { fail = true; },
		close: async () => { view.unmount(); reviews.dispose(); await restores.dispose(); } };
}

test('selected changes pass through real prepare/checkpoint/apply/receipt/undo while cancellation retains the fixed draft', async () => {
	const f = await fixture();
	try {
		const first = await screen.findByRole('checkbox', { name: 'Change 1' });
		fireEvent.click(first);
		fireEvent.click(screen.getByRole('button', { name: 'Restore selected changes (1)' }));
		await screen.findByRole('alertdialog');
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(f.files.size).toBe(0); expect(f.text()).toBe(current);
		expect(first.getAttribute('data-state')).toBe('checked');
		fireEvent.click(screen.getByRole('button', { name: 'Swap displayed versions' }));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Restore selected changes (1)' }).hasAttribute('disabled')).toBe(false));
		fireEvent.click(screen.getByRole('button', { name: 'Restore selected changes (1)' }));
		await screen.findByRole('alertdialog');
		fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
		await waitFor(() => expect(f.text()).toBe(`old one\n${shared}new two\n`));
		await waitFor(() => expect(f.restores.receipts().some(item => item.stage === 'verified')).toBe(true));
		const receipt = f.restores.receipts().find(item => item.stage === 'verified')!;
		expect(receipt.selectedHunks).toHaveLength(1);
		expect(await f.restores.readSnapshot(receipt.beforeObject!)).toBe(current);
		expect(f.reviews.get(f.id)?.buffer.text).toBe(current);
		expect(f.hold).toHaveBeenCalledTimes(1);
		expect(f.participant.prepare).toHaveBeenCalledTimes(1); expect(f.participant.commit).toHaveBeenCalledTimes(1);
		fireEvent.click(await screen.findByRole('button', { name: 'Undo this restore' }));
		await waitFor(() => expect(f.text()).toBe(current));
	} finally { await f.close(); }
});

test('selected changes retain the draft and selection when the mandatory checkpoint fails', async () => {
	const f = await fixture();
	try {
		fireEvent.click(await screen.findByRole('checkbox', { name: 'Change 1' }));
		fireEvent.click(screen.getByRole('button', { name: 'Restore selected changes (1)' }));
		await screen.findByRole('alertdialog'); f.fail();
		fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('disk-full'));
		expect(f.apply).not.toHaveBeenCalled(); expect(f.text()).toBe(current);
		expect(screen.getByRole('checkbox', { name: 'Change 1' }).getAttribute('data-state')).toBe('checked');
	} finally { await f.close(); }
});
