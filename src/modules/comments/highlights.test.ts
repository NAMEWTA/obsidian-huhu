import { expect, test } from 'vitest';
import { createAnchor, locateAnchor } from './core/anchor';
import { CommentStore } from './core/store';
import { createCommentsService } from './services/comments';
import { DEFAULT_COMMENTS_SETTINGS } from './settings';
import type { CommentFs } from './core/store';

const timers = {
	set: (cb: () => void, ms: number) => setTimeout(cb, ms),
	clear: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
function memoryFs(): CommentFs & { files: Map<string, string> } {
	const files = new Map<string, string>();
	return {
		files,
		read: async path => { const content = files.get(path); if (content === undefined) throw new Error('ENOENT'); return content; },
		write: async (path, content) => { files.set(path, content); },
		remove: async path => { files.delete(path); },
		exists: async path => files.has(path),
	};
}

const indexPath = '.huhu/editor/comments/index.json';

test('one-click highlight persists with zero messages, exact range reuses card and notes survive reload', async () => {
	const fs = memoryFs();
	const store = new CommentStore(fs, { timers, debounceMs: 1e6 });
	const text = 'Hello highlighted world';
	const anchor = createAnchor(text, 6, 17);
	const service = createCommentsService(store, () => DEFAULT_COMMENTS_SETTINGS);
	const id = await service.highlight({}, 'a.md', { anchor, color: 'yellow' });
	const again = await service.highlight({}, 'a.md', { anchor, color: 'pink' });
	expect(again).toBe(id);
	await service.note(id, 'A note, no comment thread');
	await service.tags(id, ['read', 'read', '  important ']);
	await service.pin(id, true);
	await service.archive(id, true);
	await store.close(); service.dispose();
	const restarted = new CommentStore(fs, { timers, debounceMs: 1e6 });
	const [saved] = await restarted.loadFile('a.md');
	expect(saved).toMatchObject({ id, messages: [], color: 'pink', note: 'A note, no comment thread', tags: ['read', 'important'] });
	expect(saved?.archivedAt).toBeTruthy();
	expect(saved?.pinnedAt).toBeTruthy();
	expect(JSON.parse(fs.files.get(indexPath)!).version).toBe(3);
	await restarted.close();
});
test('v2 migration preserves discussion ids/authors/status and backs up original bytes', async () => {
	const fs = memoryFs();
	const first = new CommentStore(fs, { timers, debounceMs: 1e6 });
	const text = 'alpha beta gamma';
	const old = await first.add('legacy.md', { anchor: createAnchor(text, 6, 10), text: 'Original note', author: 'Alice' });
	await first.reply(old.id, 'A second comment', 'Bob');
	await first.resolve(old.id); await first.close();
	const index = JSON.parse(fs.files.get(indexPath)!);
	const hash = index.files['legacy.md'].hash as string;
	const sidecarPath = `.huhu/editor/comments/files/${hash}.json`;
	const doc = JSON.parse(fs.files.get(sidecarPath)!);
	index.version = 2; doc.version = 2;
	// Reflect the old schema: no color, note, tags, or timestamps beyond thread fields.
	for (const thread of doc.threads) { delete thread.color; delete thread.note; delete thread.tags; }
	const originalIndex = JSON.stringify(index), originalSidecar = JSON.stringify(doc);
	fs.files.set(indexPath, originalIndex); fs.files.set(sidecarPath, originalSidecar);
	const store = new CommentStore(fs, { timers, debounceMs: 1e6 });
	const [migrated] = await store.loadFile('legacy.md');
	expect(migrated).toMatchObject({ id: old.id, color: 'legacy', status: 'resolved', messages: [
		{ author: 'Alice', text: 'Original note' }, { author: 'Bob', text: 'A second comment' },
	] });
	expect(JSON.parse(fs.files.get(indexPath)!).version).toBe(3);
	expect(JSON.parse(fs.files.get(sidecarPath)!).version).toBe(3);
	const backupPaths = [...fs.files.keys()].filter(path => path.startsWith('.huhu/editor/comments-backups/'));
	expect(backupPaths.some(path => fs.files.get(path) === originalIndex)).toBe(true);
	expect(backupPaths.some(path => fs.files.get(path) === originalSidecar)).toBe(true);
	await store.close();
});
test('failed zero-message highlight flush retains operation id and never duplicates on retry', async () => {
	const fs = memoryFs();
	const write = fs.write; let failure = true;
	fs.write = async (path, text) => { if (failure && path.endsWith('pending.json')) throw new Error('offline'); await write(path, text); };
	const store = new CommentStore(fs, { timers, debounceMs: 1e6 });
	const service = createCommentsService(store, () => DEFAULT_COMMENTS_SETTINGS);
	const key = {}, anchor = createAnchor('hello world', 0, 5);
	await expect(service.highlight(key, 'a.md', { anchor, color: 'yellow' })).rejects.toThrow('offline');
	failure = false;
	const id = await service.highlight(key, 'a.md', { anchor, color: 'yellow' });
	expect(store.threadsFor('a.md')).toHaveLength(1);
	expect(store.threadsFor('a.md')[0]?.id).toBe(id);
	service.dispose(); await store.close();
});


test('mapped edits outside a duplicate highlight refresh its identity without editing the card', async () => {
	const fs = memoryFs();
	const store = new CommentStore(fs, { timers, debounceMs: 1e6 });
	const service = createCommentsService(store, () => DEFAULT_COMMENTS_SETTINGS);
	const block = 'L'.repeat(50) + 'abcdefghij' + 'R'.repeat(50);
	const before = block + '\n' + block;
	const start = before.lastIndexOf('abcdefghij');
	const id = await service.highlight({}, 'a.md', { anchor: createAnchor(before, start, start + 10), color: 'yellow' });
	store.reconcile('a.md', before);
	await store.flush();
	const updatedAt = store.threadsFor('a.md')[0]!.updatedAt;
	const after = before + '\nUnrelated new paragraph';
	store.applyChanges('a.md', { mapPos: position => position }, after, before);
	const current = store.threadsFor('a.md')[0]!;
	expect(current).toMatchObject({ id, status: 'open', updatedAt });
	expect(current.anchor.documentHash).toBe(createAnchor(after, start, start + 10).documentHash);
	expect(locateAnchor(after, current.anchor)).toEqual({ start, end: start + 10 });
	await store.close();
	service.dispose();
	const restarted = new CommentStore(fs, { timers, debounceMs: 1e6 });
	try {
		const [saved] = await restarted.loadFile('a.md');
		expect(saved).toMatchObject({ id, status: 'open', updatedAt });
		expect(locateAnchor(after, saved!.anchor)).toEqual({ start, end: start + 10 });
	} finally { await restarted.close(); }
});

test('successful external reconciliation refreshes the fingerprint of a stationary range', async () => {
	const fs = memoryFs();
	const store = new CommentStore(fs, { timers, debounceMs: 1e6 });
	const service = createCommentsService(store, () => DEFAULT_COMMENTS_SETTINGS);
	const before = 'Hello highlighted world';
	try {
		await service.highlight({}, 'a.md', { anchor: createAnchor(before, 6, 17), color: 'blue' });
		store.reconcile('a.md', before);
		await store.flush();
		const after = before + ' and a new ending';
		store.reconcile('a.md', after);
		await store.flush();
		const saved = store.threadsFor('a.md')[0]!;
		expect(saved.status).toBe('open');
		expect(saved.anchor).toEqual(createAnchor(after, 6, 17));
	} finally { service.dispose(); await store.close(); }
});
