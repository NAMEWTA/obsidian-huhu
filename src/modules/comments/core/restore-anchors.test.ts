import { ChangeSet } from '@codemirror/state';
import { expect, test } from 'vitest';
import { textEdits } from '../../../shared/storage/text-edits';
import { createAnchor } from './anchor';
import { CommentStore, type CommentFs } from './store';

function store() {
	const files = new Map<string, string>();
	const fs: CommentFs = { exists: async path => files.has(path), read: async path => files.get(path)!, write: async (path, text) => { files.set(path, text); }, remove: async path => { files.delete(path); } };
	return new CommentStore(fs, { timers: { set: () => 0, clear: () => {} } });
}
const change = (id: string, before: string, after: string) => ({ operationId: id, path: 'note.md', before, after, edits: textEdits(before, after) });
const broadcast = (s: CommentStore, before: string, after: string) => s.applyChanges('note.md', ChangeSet.of({ from: 0, to: before.length, insert: after }, before.length), after, before);

test('prepare suppresses normal full-replacement mapping and commit preserves unchanged quotes once across leaves', async () => {
	const s = store(), before = 'top\nTARGET\nbottom', after = 'different top\nTARGET\ndifferent bottom';
	await s.add('note.md', { anchor: createAnchor(before, 4, 10), text: 'Keep this comment' });
	await s.prepareDocumentChange(change('restore', before, after));
	broadcast(s, before, after); broadcast(s, before, after); s.reconcile('note.md', after); await s.flush();
	expect(s.threadsFor('note.md')[0]!.status).toBe('open');
	await s.commitDocumentChange('restore', after);
	expect(s.threadsFor('note.md')[0]!.anchor.text).toBe('TARGET'); expect(s.threadsFor('note.md')[0]!.anchor.start).toBe(after.indexOf('TARGET'));
	broadcast(s, before, after); expect(s.threadsFor('note.md')[0]!.anchor.start).toBe(after.indexOf('TARGET')); await s.close();
});

test('explicit and native undo restore orphaned anchors without restoring comment message history', async () => {
	const s = store(), before = 'a TARGET z', after = 'only an older paragraph';
	const thread = await s.add('note.md', { anchor: createAnchor(before, 2, 8), text: 'Original message', author: 'A' });
	const original = await s.prepareDocumentChange(change('restore', before, after)); broadcast(s, before, after);
	const applied = await s.commitDocumentChange('restore', after); expect(s.threadsFor('note.md')[0]!.status).toBe('orphaned');
	await s.editMessage(thread.id, thread.messages[0]!.id, 'New comment body', 'A');
	await s.prepareDocumentChange(change('undo', after, before), { before: original, expected: applied }); broadcast(s, after, before); await s.commitDocumentChange('undo', before);
	expect(s.threadsFor('note.md')[0]).toMatchObject({ status: 'open', anchor: { text: 'TARGET', start: 2 }, messages: [{ text: 'New comment body' }] });
	// Native editor undo/redo follows the same verified pair and does not require a service callback.
	broadcast(s, before, after); expect(s.threadsFor('note.md')[0]!.status).toBe('orphaned');
	broadcast(s, after, before); expect(s.threadsFor('note.md')[0]!.status).toBe('open'); await s.close();
});

test('abort maps the actual later edit and never restores the prepared text', async () => {
	const s = store(), before = 'TARGET', planned = 'older', actual = 'user typed\nTARGET';
	await s.add('note.md', { anchor: createAnchor(before, 0, 6), text: 'message' });
	await s.prepareDocumentChange(change('restore', before, planned)); broadcast(s, before, actual);
	await s.abortDocumentChange('restore', actual);
	expect(s.threadsFor('note.md')[0]).toMatchObject({ status: 'open', anchor: { start: actual.indexOf('TARGET'), text: 'TARGET' } });
	broadcast(s, actual, ''); expect(s.threadsFor('note.md')[0]!.status).toBe('orphaned'); await s.close();
});

test('ambiguous moved quotes remain orphaned and a manual reanchor is never undone by an old checkpoint', async () => {
	const s = store(), before = 'old TARGET end', after = 'TARGET new TARGET';
	const thread = await s.add('note.md', { anchor: createAnchor(before, 4, 10), text: 'message' });
	const original = await s.prepareDocumentChange(change('restore', before, after)); broadcast(s, before, after);
	const applied = await s.commitDocumentChange('restore', after); expect(s.threadsFor('note.md')[0]!.status).toBe('orphaned');
	await s.reanchor(thread.id, createAnchor(after, 0, 6));
	await s.prepareDocumentChange(change('undo', after, before), { before: original, expected: applied }); broadcast(s, after, before); await s.commitDocumentChange('undo', before);
	// The manual anchor is handled against actual text, not overwritten with a saved author/message object.
	expect(s.threadsFor('note.md')[0]!.messages[0]!.text).toBe('message'); expect(s.threadsFor('note.md')[0]!.anchor.text).toBe('TARGET'); await s.close();
});

test('closing the comments module releases an admitted guard and persists the observed revision', async () => {
	const s = store(), before = 'TARGET', after = 'new\nTARGET';
	await s.add('note.md', { anchor: createAnchor(before, 0, 6), text: 'message' });
	await s.prepareDocumentChange(change('restore', before, after)); broadcast(s, before, after); await s.close();
	expect(s.threadsFor('note.md')[0]).toMatchObject({ status: 'open', anchor: { start: 4 } });
});

test('a late broadcast cannot rewind the observed document while a guard is active', async () => {
	const s = store(), before = 'TARGET', after = 'new\nTARGET', newer = 'later\nnew\nTARGET';
	await s.add('note.md', { anchor: createAnchor(before, 0, 6), text: 'message' });
	await s.prepareDocumentChange(change('restore', before, after));
	broadcast(s, before, after); broadcast(s, after, newer); broadcast(s, before, after);
	await s.abortDocumentChange('restore');
	expect(s.threadsFor('note.md')[0]!.anchor.start).toBe(newer.indexOf('TARGET')); await s.close();
});

test('closing before an accepted prepare runs cannot install a leaked guard', async () => {
	const s = store();
	const preparing = s.prepareDocumentChange(change('restore', 'TARGET', 'gone'));
	const rejected = expect(preparing).rejects.toThrow('closed');
	await s.close(); await rejected;
	await expect(s.commitDocumentChange('restore', 'gone')).rejects.toThrow();
});

test('comments added or manually reanchored during a restore retain their actual document coordinates', async () => {
	const s = store(), before = 'first TARGET last', after = 'TARGET\nsecond TARGET';
	const original = await s.add('note.md', { anchor: createAnchor(before, 6, 12), text: 'original' });
	const anchorsBefore = await s.prepareDocumentChange(change('restore', before, after)); broadcast(s, before, after);
	await s.reanchor(original.id, createAnchor(after, 0, 6));
	const added = await s.add('note.md', { anchor: createAnchor(after, 14, 20), text: 'new comment' });
	const anchorsAfter = await s.commitDocumentChange('restore', after);
	expect(s.threadsFor('note.md').find(item => item.id === original.id)?.anchor.start).toBe(0);
	expect(s.threadsFor('note.md').find(item => item.id === added.id)?.anchor.start).toBe(14);
	expect(anchorsAfter.anchors).toEqual([]);
	await s.prepareDocumentChange(change('undo', after, before), { before: anchorsBefore, expected: anchorsAfter });
	broadcast(s, after, before); await s.commitDocumentChange('undo', before);
	expect(s.threadsFor('note.md')).toHaveLength(2);
	expect(s.threadsFor('note.md').map(item => item.messages[0]!.text)).toEqual(['original', 'new comment']); await s.close();
});

test('renaming during a pending restore settles observed anchor offsets before moving the sidecar', async () => {
	const s = store(), before = 'TARGET', after = 'new\nTARGET';
	await s.add('note.md', { anchor: createAnchor(before, 0, 6), text: 'message' });
	await s.prepareDocumentChange(change('restore', before, after)); broadcast(s, before, after);
	await s.renamePath('note.md', 'renamed.md');
	await expect(s.commitDocumentChange('restore', after)).rejects.toThrow('no longer active');
	await s.abortDocumentChange('restore');
	expect(s.threadsFor('renamed.md')[0]!.anchor.start).toBe(4); expect(s.threadsFor('note.md')).toEqual([]); await s.close();
});

test('undo-copy cannot delete new comments, and its removal guard survives the native file deletion event', async () => {
	const s = store(), removal = { ...change('remove', 'copy', ''), kind: 'remove' as const };
	const thread = await s.add('note.md', { anchor: createAnchor('copy', 0, 4), text: 'new work' });
	await expect(s.prepareDocumentChange(removal)).rejects.toThrow('changed'); expect(s.threadsFor('note.md')[0]!.messages[0]!.text).toBe('new work');
	await s.remove(thread.id); await s.prepareDocumentChange(removal);
	await expect(s.add('note.md', { anchor: createAnchor('copy', 0, 4), text: 'racing comment' })).rejects.toThrow('changed');
	await s.deletePath('note.md'); expect((await s.commitDocumentChange('remove', '')).anchors).toEqual([]); await s.close();
});
