import { expect, test } from 'vitest';
import { ensureVaultFolder, fuzzyPathMatch, normalizeVaultPath, vaultPathItems, type VaultFolderPort } from './vault-path';

test('typed paths become vault-relative; traversal and absolute paths are refused', () => {
	expect(normalizeVaultPath(' /日志//日记/ ')).toEqual({ ok: true, path: '日志/日记' });
	expect(normalizeVaultPath('./a\\b/./c/')).toEqual({ ok: true, path: 'a/b/c' });
	expect(normalizeVaultPath('')).toEqual({ ok: true, path: '' });
	expect(normalizeVaultPath('a/../b')).toEqual({ ok: false, reason: 'traversal' });
	expect(normalizeVaultPath('..')).toEqual({ ok: false, reason: 'traversal' });
	expect(normalizeVaultPath('.huhu/journal')).toEqual({ ok: false, reason: 'hidden' });
	expect(normalizeVaultPath('a/.obsidian')).toEqual({ ok: false, reason: 'hidden' });
	expect(normalizeVaultPath('C:\\Users\\me')).toEqual({ ok: false, reason: 'absolute' });
	expect(normalizeVaultPath('\\\\server\\share')).toEqual({ ok: false, reason: 'absolute' });
	expect(normalizeVaultPath('a\0b')).toEqual({ ok: false, reason: 'invalid' });
});

test('fuzzy matching follows Obsidian: ordered characters, name matches first, ranges for highlighting', () => {
	expect(fuzzyPathMatch('zzz', 'Projects/Notes')).toBeNull();
	expect(fuzzyPathMatch('', 'anything')).toEqual({ score: 0, ranges: [] });
	const exact = fuzzyPathMatch('notes', 'Projects/Notes')!;
	const scattered = fuzzyPathMatch('notes', 'nxoxtxexs')!;
	expect(exact.score).toBeGreaterThan(scattered.score);
	expect(exact.ranges).toEqual([[9, 14]]);
	// Initials of path segments match, like `pn` for Projects/Notes.
	expect(fuzzyPathMatch('pn', 'Projects/Notes')!.ranges).toEqual([[0, 1], [9, 10]]);
	// Chinese folder names work the same way.
	expect(fuzzyPathMatch('日记', '日志/日记/2026')!.ranges).toEqual([[3, 5]]);
	// A leading slash is ignored, as in the typed form.
	expect(fuzzyPathMatch('/pro', 'Projects')).not.toBeNull();
});

function fakeVault(initial: Array<[string, 'file' | 'folder']>): VaultFolderPort & { created: string[] } {
	const entries = new Map(initial.map(([path, kind]) => [path, kind === 'folder' ? { path, children: [] } : { path }]));
	const created: string[] = [];
	return {
		created,
		getAbstractFileByPath: (path) => entries.get(path) ?? null,
		getAllLoadedFiles: () => [{ path: '/', children: [] }, ...entries.values()],
		createFolder: async (path) => {
			created.push(path);
			entries.set(path, { path, children: [] });
		},
		adapter: { exists: async (path) => entries.has(path) },
	};
}

test('a typed folder is created level by level when it is used; existing levels are left alone', async () => {
	const vault = fakeVault([['日志', 'folder'], ['note.md', 'file']]);
	expect(await ensureVaultFolder(vault, '/日志/日记//2026/')).toBe('日志/日记/2026');
	expect(vault.created).toEqual(['日志/日记', '日志/日记/2026']);
	expect(await ensureVaultFolder(vault, '日志/日记')).toBe('日志/日记');
	expect(vault.created).toHaveLength(2);
	await expect(ensureVaultFolder(vault, '../x')).rejects.toThrow('huhu-path.traversal');
	await expect(ensureVaultFolder(vault, 'note.md/inside')).rejects.toThrow('huhu-path.not-a-folder');
	// The vault root needs no folder.
	expect(await ensureVaultFolder(vault, '')).toBe('');
});

test('path items list folders and files separately and skip the root', () => {
	const vault = fakeVault([['b', 'folder'], ['a', 'folder'], ['a/x.md', 'file']]);
	expect(vaultPathItems(vault, 'folder')).toEqual([{ path: 'a', kind: 'folder' }, { path: 'b', kind: 'folder' }]);
	expect(vaultPathItems(vault, 'file')).toEqual([{ path: 'a/x.md', kind: 'file' }]);
	expect(vaultPathItems(vault)).toHaveLength(3);
});
