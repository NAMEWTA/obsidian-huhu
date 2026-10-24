// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test } from 'vitest';
import { TFile, TFolder, type App, type Component, type TAbstractFile } from 'obsidian';
import { VaultIndex } from './vault-index';

type Listener = (...args: never[]) => void;

/** A vault with Obsidian's tree shape and events, just enough for the index. */
function fixture(paths: string[]) {
	const all = new Map<string, TAbstractFile>();
	const listeners = new Map<string, Listener[]>();
	const folder = (path: string): TFolder => {
		const existing = all.get(path);
		if (existing) return existing as TFolder;
		const created = Object.assign(Object.create(TFolder.prototype) as TFolder, { path, name: path.slice(path.lastIndexOf('/') + 1), isRoot: () => path === '/' });
		all.set(path, created);
		return created;
	};
	folder('/');
	const make = (path: string): TFile => {
		const slash = path.lastIndexOf('/');
		for (let at = path.indexOf('/'); at >= 0; at = path.indexOf('/', at + 1)) folder(path.slice(0, at));
		const name = path.slice(slash + 1);
		const dot = name.lastIndexOf('.');
		const file = Object.assign(Object.create(TFile.prototype) as TFile, { path, name, basename: name.slice(0, dot), extension: name.slice(dot + 1), stat: { ctime: 1, mtime: 1, size: 1 } });
		all.set(path, file);
		return file;
	};
	paths.forEach(make);
	const on = (name: string, callback: Listener) => { listeners.set(name, [...(listeners.get(name) ?? []), callback]); return { name }; };
	const app = {
		vault: { getAllLoadedFiles: () => [...all.values()], on },
		metadataCache: { on, getFileCache: () => null },
		workspace: { containerEl: { ownerDocument: { defaultView: globalThis } } },
	} as unknown as App;
	const scope = { registerEvent: () => undefined, register: () => undefined } as unknown as Component;
	const emit = (name: string, ...args: unknown[]) => { for (const callback of listeners.get(name) ?? []) (callback as (...rest: unknown[]) => void)(...args); };
	return {
		app,
		scope,
		create(path: string) { const file = make(path); emit('create', file); },
		delete(path: string) { const file = all.get(path)!; all.delete(path); emit('delete', file); },
		rename(from: string, to: string) {
			const file = all.get(from) as TFile;
			all.delete(from);
			Object.assign(file, { path: to, name: to.slice(to.lastIndexOf('/') + 1) });
			for (let at = to.indexOf('/'); at >= 0; at = to.indexOf('/', at + 1)) folder(to.slice(0, at));
			all.set(to, file);
			emit('rename', file, from);
		},
	};
}

const totals = (index: VaultIndex, ...folders: string[]) => folders.map((path) => index.counts().total(path));

test('folder counts are built at start and follow create, delete and rename without a recount', () => {
	const vault = fixture(['a/one.md', 'a/b/two.md', 'a/b/pic.png', 'c/three.md', 'root.md']);
	const index = new VaultIndex(vault.app);
	index.start(vault.scope, false);
	// Only listed file types count: the png is not a note.
	expect(totals(index, '/', 'a', 'a/b', 'c')).toEqual([4, 2, 1, 1]);
	expect(index.counts().direct('a')).toBe(1);

	vault.create('a/b/deeper/four.md');
	expect(totals(index, '/', 'a', 'a/b', 'a/b/deeper')).toEqual([5, 3, 2, 1]);
	vault.delete('a/one.md');
	expect(totals(index, '/', 'a')).toEqual([4, 2]);
	vault.rename('a/b/two.md', 'c/two.md');
	expect(totals(index, '/', 'a', 'a/b', 'c')).toEqual([4, 1, 1, 2]);
	vault.create('a/b/notes.canvas');
	expect(index.counts().total('a/b')).toBe(2);
});

test('switching the file-type filter recounts from the vault', () => {
	const vault = fixture(['a/one.md', 'a/pic.png', 'a/doc.pdf']);
	const index = new VaultIndex(vault.app);
	index.start(vault.scope, false);
	expect(index.counts().total('/')).toBe(1);
	index.setShowAllFiles(true);
	expect(totals(index, '/', 'a')).toEqual([3, 3]);
	index.dispose();
});
