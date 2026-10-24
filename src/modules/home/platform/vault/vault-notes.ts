import { TFile, TFolder, type App } from 'obsidian';
import { huhuName } from '../../../../shared/storage/vault-layout';
import { isContentPath } from '../../../../shared/storage/content-paths';
import { SUPPORTED_FILE_EXTS } from '../../../../shared/file-types';
import { ensureFolder } from '../calendar/daily-notes';

/*
 * Notes the board creates belong to the vault, in folders the user can see and chose (a project's folder, the memo
 * folder, a quick-note button's folder), never to HUHU's own `.huhu/` data. These helpers are the one place that
 * turns a configured folder or path into a vault path, creates the folder when it is missing, and opens a note with
 * Obsidian's own editor in a new tab.
 */

/** A vault-relative folder path: forward slashes, no leading or trailing slash. Hidden folders and `..` are refused. */
export function cleanVaultFolder(raw: string): string {
	const parts = raw
		.replace(/\\/g, '/')
		.split('/')
		.map((part) => part.trim())
		.filter((part) => part && part !== '.');
	if (parts.some((part) => part === '..' || part.startsWith('.'))) throw new Error(`Invalid folder: ${raw}`);
	return parts.join('/');
}

/** A file name HUHU generates: whitespace and characters no filename may hold become `-` (see `huhuName`). */
export function safeFileName(name: string): string {
	return huhuName(name, '');
}

/** `folder/name.ext`, or `folder/name-2.ext`, `name-3.ext` … when that is taken. */
export function uniqueVaultPath(app: App, folder: string, name: string, ext = 'md'): string {
	const dir = folder ? `${folder}/` : '';
	let path = `${dir}${name}.${ext}`;
	for (let n = 2; app.vault.getAbstractFileByPath(path); n++) path = `${dir}${name}-${n}.${ext}`;
	return path;
}

/** Create a note in `folder` (made when missing, with its parents). Returns the file the vault created. */
export async function createVaultNote(app: App, folder: string, name: string, body = ''): Promise<TFile> {
	const dir = cleanVaultFolder(folder);
	if (dir) await ensureFolder(app, dir);
	const base = safeFileName(name).replace(/\.md$/i, '') || 'Untitled';
	return app.vault.create(uniqueVaultPath(app, dir, base), body);
}

/** Open a note in a new tab of Obsidian's own editor. */
export async function openNoteInTab(app: App, file: TFile): Promise<void> {
	await app.workspace.getLeaf('tab').openFile(file);
}

/** The vault file a path names (a `.md` suffix may be left off), or null. Managed `.huhu` content is not a vault file. */
export function vaultFileAt(app: App, path: string): TFile | null {
	if (!path || isContentPath(path)) return null;
	const direct = app.vault.getFileByPath(path) ?? app.vault.getFileByPath(`${path}.md`);
	return direct ?? null;
}

/** A path to put in settings or a note: vault-relative, `.md` appended when it names no extension. */
export function vaultNotePath(raw: string): string {
	const clean = raw.trim().replace(/\\/g, '/').replace(/^\/+/, '');
	return /\.[^/.]+$/.test(clean) ? clean : `${clean}.md`;
}

/** Where a configured note path lives: a managed `.huhu` path stays, anything else is a vault path. */
export function notePathFor(raw: string): string {
	const clean = raw.trim().replace(/^\/+/, '');
	return isContentPath(clean) ? (clean.endsWith('.md') ? clean : `${clean}.md`) : vaultNotePath(clean);
}

/** Every visible folder of the vault (hidden ones are not offered), sorted. */
export function vaultFolders(app: App): string[] {
	const found = new Set<string>();
	const loaded = (app.vault as { getAllLoadedFiles?: () => unknown[] }).getAllLoadedFiles?.() ?? [];
	for (const entry of loaded)
		if (entry instanceof TFolder && entry.path && entry.path !== '/') found.add(entry.path);
	for (const file of app.vault.getFiles()) {
		const parts = file.path.split('/').slice(0, -1);
		for (let i = 1; i <= parts.length; i++) found.add(parts.slice(0, i).join('/'));
	}
	return [...found].filter((path) => !path.split('/').some((part) => part.startsWith('.'))).sort((a, b) => a.localeCompare(b));
}

/** The notes (files Obsidian can open) in a folder and all folders below it, newest change first. */
export function notesInFolder(app: App, folder: string): TFile[] {
	const dir = cleanVaultFolder(folder);
	if (!dir) return [];
	return app.vault
		.getFiles()
		.filter((file) => file.path.startsWith(`${dir}/`) && SUPPORTED_FILE_EXTS.has(file.extension.toLowerCase()))
		.sort((a, b) => b.stat.mtime - a.stat.mtime);
}
