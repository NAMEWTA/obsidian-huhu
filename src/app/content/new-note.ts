import type { App, TFile } from 'obsidian';
import { nowMoment } from '../../host/obsidian/datetime';
import { activateWindowLeaf, openNoteAt } from '../../host/obsidian/open-note';
import { t } from '../../shared/i18n';
import { datedName, isVisibleHuhuPath, HUHU_VISIBLE_ROOT, NEW_NOTE_ROOT } from '../../shared/storage/vault-layout';

/** The folder of a HUHU files selection: the folder itself, or the folder of a file; `huhu/` when it is outside. */
export function selectedFolder(selected?: string): string {
	const text = selected ?? '';
	const folder = /\.[^/.]+$/.test(text) ? text.slice(0, Math.max(0, text.lastIndexOf('/'))) : text;
	return folder && isVisibleHuhuPath(folder) ? folder : HUHU_VISIBLE_ROOT;
}

/** The folder a new note goes in: the selected folder (or the folder of the selected file), else `huhu/笔记`. */
export function newNoteFolder(selected?: string): string {
	const folder = selectedFolder(selected);
	return folder === HUHU_VISIBLE_ROOT ? NEW_NOTE_ROOT : folder;
}

/** Creates `<folder>/YYYY-MM-DD-新笔记.md` (numbered when taken) with the vault API, making folders as needed. */
export async function createHuhuNote(app: App, selected?: string): Promise<TFile> {
	const folder = newNoteFolder(selected);
	let current = '';
	for (const part of folder.split('/')) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(current)) await app.vault.createFolder(current);
	}
	const base = datedName(t('content.newNoteName'), nowMoment());
	let path = `${folder}/${base}.md`;
	for (let n = 2; app.vault.getAbstractFileByPath(path); n++) path = `${folder}/${base}-${n}.md`;
	return app.vault.create(path, '');
}

/** Opens a vault file in Obsidian's own editor or viewer, in a new tab. */
export async function openInNativeTab(app: App, path: string, fragment?: string, owner?: Window): Promise<void> {
	const file = app.vault.getFileByPath(path);
	if (!file) throw new Error(`Missing document: ${path}`);
	if (fragment?.startsWith('#')) {
		activateWindowLeaf(app, owner);
		await app.workspace.openLinkText(file.path + fragment, '', true);
		return;
	}
	await openNoteAt(app, file, { owner });
}

/** Old file deep links open the original note; directory links keep the secondary content browser. */
export async function openContentLocation(app: App, path?: string, signal?: AbortSignal, fragment?: string, owner?: Window): Promise<string> {
	if (!path || !isVisibleHuhuPath(path) || signal?.aborted) return HUHU_VISIBLE_ROOT;
	const entry = app.vault.getAbstractFileByPath(path);
	if (!entry) {
		if (path === HUHU_VISIBLE_ROOT) return HUHU_VISIBLE_ROOT;
		throw new Error(`Missing document: ${path}`);
	}
	if (app.vault.getFileByPath(path)) {
		await openInNativeTab(app, path, fragment, owner);
		return path.slice(0, path.lastIndexOf('/')) || HUHU_VISIBLE_ROOT;
	}
	return path;
}
