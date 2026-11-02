import {
	mkdtempSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
	statSync,
	existsSync,
	readdirSync,
	rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { TFile, TFolder, type App } from 'obsidian';

/** Real disk bytes and exclusive creation; Obsidian indexing/events are the test boundary. */
export function temporaryVault(initial: Record<string, string> = {}) {
	const directory = mkdtempSync(join(tmpdir(), 'huhu-default-paths-'));
	const operations: Array<{ op: string; path: string }> = [];
	const absolute = (path: string) => join(directory, path);
	const observe = (op: string, path: string) => {
		operations.push({ op, path });
	};
	const indexed = new Set(Object.keys(initial));
	const entry = (path: string) => {
		observe('lookup', path);
		if (!existsSync(absolute(path))) return null;
		const stat = statSync(absolute(path)),
			name = path.split('/').at(-1)!;
		return Object.assign(stat.isDirectory() ? new TFolder() : new TFile(), {
			path,
			name,
			basename: name.replace(/\.[^.]+$/, ''),
			extension: name.split('.').at(-1),
			stat: { ctime: stat.ctimeMs, mtime: stat.mtimeMs, size: stat.size },
		});
	};
	const seed = (path: string, text: string) => {
		mkdirSync(dirname(absolute(path)), { recursive: true });
		writeFileSync(absolute(path), text);
		indexed.add(path);
	};
	for (const [path, text] of Object.entries(initial)) seed(path, text);
	const adapter = {
		exists: async (path: string) => {
			observe('exists', path);
			return existsSync(absolute(path));
		},
		read: async (path: string) => {
			observe('read', path);
			return readFileSync(absolute(path), 'utf8');
		},
		write: async (path: string, text: string) => {
			observe('write', path);
			writeFileSync(absolute(path), text);
		},
		mkdir: async (path: string) => {
			observe('mkdir', path);
			mkdirSync(absolute(path), { recursive: true });
		},
		list: async (path: string) => {
			observe('list', path);
			const entries = readdirSync(absolute(path), { withFileTypes: true });
			return {
				files: entries.filter((e) => e.isFile()).map((e) => `${path}/${e.name}`),
				folders: entries.filter((e) => e.isDirectory()).map((e) => `${path}/${e.name}`),
			};
		},
	};
	const vault = {
		adapter,
		on: () => ({}),
		offref: () => {},
		getFiles: () => [...indexed].filter((path) => !path.startsWith('.')).map((path) => entry(path) as TFile),
		getMarkdownFiles: () =>
			[...indexed]
				.filter((path) => !path.startsWith('.') && path.endsWith('.md'))
				.map((path) => entry(path) as TFile),
		getAbstractFileByPath: entry,
		getFileByPath: (path: string) => {
			const f = entry(path);
			return f instanceof TFile ? f : null;
		},
		createFolder: adapter.mkdir,
		cachedRead: (file: TFile) => adapter.read(file.path),
		read: (file: TFile) => adapter.read(file.path),
		create: async (path: string, text: string) => {
			observe('create', path);
			writeFileSync(absolute(path), text, { flag: 'wx' });
			indexed.add(path);
			return entry(path) as TFile;
		},
		process: async (file: TFile, update: (text: string) => string) => {
			const next = update(await adapter.read(file.path));
			await adapter.write(file.path, next);
			return next;
		},
	};
	return {
		app: { vault, workspace: { layoutReady: true, getLeavesOfType: () => [] } } as unknown as App,
		directory,
		operations,
		seed,
		read: (path: string) => readFileSync(absolute(path), 'utf8'),
		close: () => rmSync(directory, { recursive: true, force: true }),
	};
}
