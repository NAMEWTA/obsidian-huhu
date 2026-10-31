import type { ContactsFile, ContactsFiles } from '../../core/files';
import { ArchiveRuntime, type ArchiveDraftStore } from './runtime';

/** Fault-injectable file port; production code never imports this fixture. */
export class MemoryArchiveFiles implements ContactsFiles {
	readonly formatGuide = '';
	readonly text = new Map<string, string>();
	readonly files = new Map<string, ContactsFile>();
	readonly unsaved = new Set<string>();
	readonly writes: string[] = [];
	reads = 0;
	beforeWrite?: (path: string, next: string) => void;
	afterWrite?: (path: string, next: string) => void;
	beforeProcess?: (path: string) => void;
	runtime?: ArchiveRuntime;
	constructor(initial: ReadonlyMap<string, string> = new Map()) {
		for (const [path, raw] of initial) this.seed(path, raw);
	}
	seed(path: string, raw: string): ContactsFile {
		const previous = this.files.get(path),
			file = {
				path,
				extension: path.split('.').pop() ?? '',
				stat: { mtime: (previous?.stat.mtime ?? 0) + 1, size: raw.length },
			};
		this.files.set(path, file);
		this.text.set(path, raw);
		return file;
	}
	external(path: string, raw: string): void {
		this.runtime?.fileChanged(this.seed(path, raw));
	}
	delete(path: string): void {
		this.files.delete(path);
		this.text.delete(path);
		this.runtime?.fileDeleted(path);
	}
	rename(from: string, to: string): void {
		const raw = this.text.get(from);
		if (raw === undefined) throw new Error('missing');
		this.text.delete(from);
		this.files.delete(from);
		const file = this.seed(to, raw);
		this.runtime?.fileRenamed(file, from, to);
	}
	ready(): Promise<void> {
		return Promise.resolve();
	}
	getMarkdownFiles(): ContactsFile[] {
		return [...this.files.values()].filter((file) => file.extension === 'md');
	}
	getFileByPath(path: string): ContactsFile | null {
		return this.files.get(path) ?? null;
	}
	getAbstractFileByPath(path: string): unknown {
		return (
			this.files.get(path) ??
			([...this.files.keys()].some((file) => file.startsWith(path + '/')) ? { path } : null)
		);
	}
	read(file: ContactsFile): Promise<string> {
		this.reads++;
		const raw = this.text.get(file.path);
		return raw === undefined ? Promise.reject(new Error('missing')) : Promise.resolve(raw);
	}
	cachedRead(file: ContactsFile): Promise<string> {
		return this.read(file);
	}
	process(file: ContactsFile, update: (latest: string) => string): Promise<string> {
		this.beforeProcess?.(file.path);
		const raw = this.text.get(file.path);
		if (raw === undefined) return Promise.reject(new Error('missing'));
		try {
			const next = update(raw);
			this.beforeWrite?.(file.path, next);
			this.writes.push(file.path);
			const changed = this.seed(file.path, next);
			this.runtime?.fileChanged(changed);
			this.afterWrite?.(file.path, next);
			return Promise.resolve(next);
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
	}
	create(path: string, raw: string): Promise<ContactsFile> {
		try {
			if (this.getAbstractFileByPath(path)) throw new Error('exists');
			this.beforeWrite?.(path, raw);
			this.writes.push(path);
			const file = this.seed(path, raw);
			this.runtime?.fileChanged(file);
			this.afterWrite?.(path, raw);
			return Promise.resolve(file);
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
	}
	createBinary(path: string, bytes: ArrayBuffer): Promise<ContactsFile> {
		return this.create(path, new TextDecoder().decode(bytes));
	}
	listFolder(path: string) {
		return [...this.files.values()]
			.filter((file) => file.path.startsWith(path + '/'))
			.map((file) => ({ path: file.path, folder: false, size: file.stat.size, modified: file.stat.mtime }));
	}
	trashFolder(path: string): Promise<void> {
		for (const file of [...this.files.keys()]) if (file.startsWith(path + '/')) this.delete(file);
		return Promise.resolve();
	}
	checkFolderEditors(path: string): Promise<void> {
		return [...this.unsaved].some((file) => file.startsWith(path + '/'))
			? Promise.reject(new Error('unsavedEditor'))
			: Promise.resolve();
	}
	createFolder(): Promise<void> {
		return Promise.resolve();
	}
	mkdir(): Promise<void> {
		return Promise.resolve();
	}
	checkEditor(file: ContactsFile): void {
		if (this.unsaved.has(file.path)) throw new Error('unsavedEditor');
	}
}
export async function memoryArchives(initial: ReadonlyMap<string, string> = new Map(), root = 'huhu/档案') {
	const files = new MemoryArchiveFiles(initial),
		draftValues = new Map<string, unknown>();
	const drafts: ArchiveDraftStore = {
		list: () => Promise.resolve([...draftValues.values()]),
		write: (_root, id, value) => {
			draftValues.set(id, structuredClone(value));
			return Promise.resolve();
		},
		remove: (_root, id) => {
			draftValues.delete(id);
			return Promise.resolve();
		},
	};
	const config = { root },
		runtime = await ArchiveRuntime.create(files, () => config.root, undefined, drafts);
	files.runtime = runtime;
	await runtime.ensureLoaded();
	return { runtime, files, config, draftValues };
}
