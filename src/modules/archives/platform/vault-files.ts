import { MarkdownView, TFile, TFolder, normalizePath, type App, type TAbstractFile } from 'obsidian';
import type { ContactsFile, ContactsFiles } from '../core/files';
import { ContactsError } from '../core/model';
import type { ArchiveFolderEntry } from '../core/resources';
import type { DocumentMutationCoordinator } from '../../../host/obsidian/document-mutation';
import { DocumentMutationError, type DocumentSnapshot } from '../../../shared/storage/document-mutation';

/**
 * The archives' file port on the vault itself. Archives are ordinary visible notes (`档案/个人档案/<名称>/基本信息.md`),
 * so reads, writes and trash use Vault APIs. Structured writes additionally reject native drafts; Vault.process alone is not a draft guard.
 */
export function vaultContactsFiles(
	app: App,
	formatGuide: () => string,
	documents: () => DocumentMutationCoordinator,
): ContactsFiles {
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
	const translate = (error: unknown): never => {
		if (error instanceof DocumentMutationError) throw new ContactsError('editorConflict', error.path);
		throw error;
	};
	const checkEditor = (file: ContactsFile, disk: string): void => {
		const native = fileFor(file);
		if (vault.getFileByPath(file.path) !== native) throw new ContactsError('missing', file.path);
		for (const leaf of app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (
				view instanceof MarkdownView &&
				view.file?.path === file.path &&
				view.editor.getValue().replace(/\r\n?/g, '\n') !== disk.replace(/\r\n?/g, '\n')
			)
				throw new ContactsError('editorConflict', file.path);
		}
	};
	const captureEditors = async (files: readonly ContactsFile[]): Promise<() => void> => {
		const snapshots: DocumentSnapshot[] = [];
		try {
			for (const file of files) {
				if (vault.getFileByPath(file.path) !== fileFor(file)) throw new ContactsError('missing', file.path);
				const snapshot = await documents().captureClean(file.path);
				if (snapshot.diskText === null) throw new ContactsError('missing', file.path);
				documents().assertClean(snapshot, snapshot.diskText);
				snapshots.push(snapshot);
			}
		} catch (error) {
			translate(error);
		}
		const check = () => {
			try {
				for (const snapshot of snapshots) documents().assertClean(snapshot, snapshot.diskText!);
			} catch (error) {
				translate(error);
			}
		};
		check();
		return check;
	};
	const checkFolderEditors = async (path: string): Promise<() => void> => {
		const files = walk(folderAt(path), [])
			.filter((entry) => !entry.folder && entry.path.endsWith('.md'))
			.map((entry) => vault.getFileByPath(entry.path)!);
		for (const leaf of app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path.startsWith(path + '/') && !files.includes(view.file))
				throw new ContactsError('editorConflict', view.file.path);
		}
		return captureEditors(files);
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
		process: async (file, update, beforeCommit) => {
			const native = fileFor(file),
				check = await captureEditors([file]);
			return vault.process(native, (latest) => {
				check();
				beforeCommit?.();
				checkEditor(file, latest);
				const next = update(latest);
				check();
				beforeCommit?.();
				checkEditor(file, latest);
				return next;
			});
		},
		create: async (path, text, beforeCommit) => {
			await mkdir(parentOf(path));
			beforeCommit?.();
			return vault.create(path, text);
		},
		createBinary: async (path, bytes) => {
			await mkdir(parentOf(path));
			return vault.createBinary(path, bytes);
		},
		listFolder: (path) => walk(folderAt(path), []),
		// Trash goes through the user's "deleted files" preference (system trash, .trash or permanent delete).
		trashFolder: async (path, beforeCommit) => {
			const folder = folderAt(path),
				check = await checkFolderEditors(path);
			if (folderAt(path) !== folder) throw new ContactsError('deleteChanged', path);
			check();
			beforeCommit?.();
			await app.fileManager.trashFile(folder);
		},
		checkFolderEditors,
		captureEditors,
		createFolder: async (path) => {
			await mkdir(parentOf(path));
			await vault.createFolder(path);
		},
		mkdir,
		checkEditor,
	};
}
