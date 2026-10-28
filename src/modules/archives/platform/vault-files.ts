import { MarkdownView, TFile, TFolder, normalizePath, type App, type TAbstractFile } from 'obsidian';
import type { ContactsFile, ContactsFiles } from '../core/files';
import { ContactsError } from '../core/model';
import type { ArchiveFolderEntry } from '../core/resources';

/**
 * The archives' file port on the vault itself. Archives are ordinary visible notes (`档案/个人档案/<名称>/基本信息.md`),
 * so Obsidian's Vault API reads, writes and trashes them. `process` serializes disk writes;
 * a separate all-leaf guard below rejects unsaved editor buffers.
 */
export function vaultContactsFiles(app: App, formatGuide: () => string): ContactsFiles {
	const { vault } = app;
	/** The vault's own file object for an index entry (the entry may be a stale copy after a rename). */
	const fileFor = (file: ContactsFile): TFile => {
		if (file instanceof TFile) return file;
		const found = vault.getFileByPath(file.path);
		if (!found) throw new ContactsError('missing');
		return found;
	};
	const folderAt = (path: string): TFolder => {
		const entry = vault.getAbstractFileByPath(path);
		if (!(entry instanceof TFolder)) throw new ContactsError('missing');
		return entry;
	};
	/** Create `path` and any missing parents; an existing folder is fine. */
	const mkdir = async (path: string): Promise<void> => {
		let current = '';
		for (const part of normalizePath(path).split('/')) {
			current = current ? `${current}/${part}` : part;
			const existing = vault.getAbstractFileByPath(current);
			if (existing instanceof TFolder) continue;
			if (existing) throw new ContactsError('invalidFolder');
			await vault.createFolder(current);
		}
	};
	const checkEditor = (file: ContactsFile, disk: string): void => {
		for (const leaf of app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path === file.path && view.editor.getValue() !== disk)
				throw new ContactsError('unsavedEditor', file.path);
		}
	};
	const parentOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));
	const walk = (folder: TFolder, into: ArchiveFolderEntry[]): ArchiveFolderEntry[] => {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				into.push({ path: child.path, folder: true, size: 0, modified: 0 });
				walk(child, into);
			} else if (child instanceof TFile)
				into.push({ path: child.path, folder: false, size: child.stat.size, modified: child.stat.mtime });
		}
		return into;
	};
	return {
		get formatGuide() {
			return formatGuide();
		},
		ready: async () => {
			if (!app.workspace.layoutReady) await new Promise<void>((resolve) => app.workspace.onLayoutReady(resolve));
		},
		getMarkdownFiles: () => vault.getMarkdownFiles(),
		getFileByPath: (path) => vault.getFileByPath(path),
		getAbstractFileByPath: (path): TAbstractFile | null => vault.getAbstractFileByPath(path),
		read: (file) => vault.read(fileFor(file)),
		cachedRead: (file) => vault.cachedRead(fileFor(file)),
		process: (file, update) => vault.process(fileFor(file), update),
		create: async (path, text) => {
			await mkdir(parentOf(path));
			return vault.create(path, text);
		},
		createBinary: async (path, bytes) => {
			await mkdir(parentOf(path));
			return vault.createBinary(path, bytes);
		},
		listFolder: (path) => walk(folderAt(path), []),
		// Trash goes through the user's "deleted files" preference (system trash, .trash or permanent delete).
		trashFolder: async (path) => app.fileManager.trashFile(folderAt(path)),
		// Vault.process serializes disk transforms, but does not authorize overwriting an unsaved editor buffer.
		checkFolderEditors: async (path) => {
			for (const leaf of app.workspace.getLeavesOfType('markdown')) {
				const view = leaf.view;
				if (!(view instanceof MarkdownView) || !view.file || !view.file.path.startsWith(path + '/')) continue;
				const file = view.file,
					sourcePath = file.path,
					disk = await vault.read(file);
				if (view.file !== file || file.path !== sourcePath) throw new ContactsError('conflict');
				checkEditor(file, disk);
			}
		},
		createFolder: async (path) => {
			await mkdir(parentOf(path));
			await vault.createFolder(path);
		},
		mkdir,
		checkEditor,
	};
}
