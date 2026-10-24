// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test } from 'vitest';
import { FolderCounts } from './folder-counts';
import { buildNavTree } from './nav-tree';
import type { NoteEntry } from './types';

const file = (folder: string) => ({ folder });

test('every ancestor counts the files below it, the folder itself counts only its own', () => {
	const counts = FolderCounts.from([file('a/b/c'), file('a/b'), file('a'), file('/'), file('d')]);
	expect(counts.total('/')).toBe(5);
	expect(counts.total('a')).toBe(3);
	expect(counts.direct('a')).toBe(1);
	expect(counts.total('a/b')).toBe(2);
	expect(counts.direct('a/b')).toBe(1);
	expect(counts.total('a/b/c')).toBe(1);
	expect(counts.total('d')).toBe(1);
	expect(counts.total('missing')).toBe(0);
	expect(counts.direct('')).toBe(1);
});

test('add, remove and move adjust only the ancestor chains involved', () => {
	const counts = FolderCounts.from([file('a/b'), file('a/b'), file('c')]);
	counts.add('a/b/deep');
	expect(counts.total('a')).toBe(3);
	expect(counts.total('/')).toBe(4);
	counts.move('a/b', 'c');
	expect(counts.total('a/b')).toBe(2);
	expect(counts.total('a')).toBe(2);
	expect(counts.total('c')).toBe(2);
	counts.remove('a/b/deep');
	counts.remove('a/b');
	expect(counts.total('a')).toBe(0);
	expect(counts.direct('a/b')).toBe(0);
	expect(counts.total('/')).toBe(2);
	counts.move('c', 'c');
	expect(counts.total('c')).toBe(2);
	counts.clear();
	expect(counts.total('/')).toBe(0);
});

test('the folder tree shows subtree counts at every level', () => {
	const notes: NoteEntry[] = ['00_Inbox/a.md', '10_档案/个人档案/p.md', '10_档案/企业档案/c.md', '10_档案/x.md', 'root.md'].map((path) => {
		const slash = path.lastIndexOf('/');
		return { path, name: path, ext: 'md', folder: slash < 0 ? '/' : path.slice(0, slash), ctime: 1, mtime: 1, tags: [] };
	});
	const folders = ['/', '00_Inbox', '10_档案', '10_档案/个人档案', '10_档案/企业档案'];
	const input = { folders, notes, showRoot: true, showTags: false, showUntagged: false, expandedFolders: new Set(folders), expandedTags: new Set<string>(), labels: { folders: 'F', tags: 'T', untagged: 'U', root: 'Vault' } };
	const deep = buildNavTree(input);
	expect(deep.rows.filter((row) => row.kind === 'folder').map((row) => [row.path, row.count])).toEqual([['/', 5], ['00_Inbox', 1], ['10_档案', 3], ['10_档案/个人档案', 1], ['10_档案/企业档案', 1]]);
	// Counts supplied by the caller (the index keeps them current) give the same rows.
	const supplied = buildNavTree({ ...input, folderCounts: FolderCounts.from(notes) });
	expect(supplied.rows).toEqual(deep.rows);
});

test('counting 10,000 files in a deep tree is a single fast pass, and a vault event costs one chain', () => {
	const files: Array<{ folder: string }> = [];
	for (let i = 0; i < 10_000; i++) files.push({ folder: `top${i % 20}/mid${i % 50}/leaf${i % 200}/deeper${i % 7}` });
	const started = performance.now();
	const counts = FolderCounts.from(files);
	const built = performance.now() - started;
	expect(counts.total('/')).toBe(10_000);
	expect(counts.total('top0')).toBe(500);
	expect(built).toBeLessThan(50);
	const before = performance.now();
	for (let i = 0; i < 1000; i++) { counts.add('top1/mid1/leaf1/deeper1'); counts.remove('top1/mid1/leaf1/deeper1'); }
	expect(performance.now() - before).toBeLessThan(50);
	expect(counts.total('/')).toBe(10_000);
});
