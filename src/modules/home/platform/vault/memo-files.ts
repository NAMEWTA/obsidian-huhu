import type { App, TFile } from 'obsidian';
import { nowMoment, type MomentLike } from '../../../../host/obsidian/datetime';
import { withDefaultProperties } from '../../../../shared/storage/note-defaults';
import { captureDayOf, inboxFileName } from '../../../../shared/storage/vault-layout';
import { DEFAULT_MEMO_ROOT } from '../../core/board/default-paths';
import { createVaultNote, cleanVaultFolder } from './vault-notes';

/*
 * The inbox is a flat folder of Markdown files (root `huhu/收件箱` unless the board settings say otherwise):
 *   - an item is one note, `<root>/YYYY-MM-DD-HHmm-<title>.md`; the date prefix orders items in the file list and
 *     tells the board when one was made;
 *   - the fleeting thoughts of a day are one file, `<root>/YYYY-MM-DD-闪念.md` (see `captureDayPath`).
 */

/** The inbox folder the board settings name, as a clean vault path; an empty or invalid setting means the default folder. */
export function inboxRoot(settings: { memoSavePath: string }): string {
	try {
		return cleanVaultFolder(settings.memoSavePath.trim()) || DEFAULT_MEMO_ROOT;
	} catch {
		return DEFAULT_MEMO_ROOT;
	}
}

const STAMP = /^(\d{4}-\d{2}-\d{2})[ -](\d{2})(\d{2})(?:[ -]|$)/;

/** Create the inbox item for `title` (the caller names an untitled one), with the default properties. Resolves to the new file. */
export async function createMemoFile(
	app: App,
	root: string,
	title: string,
	body = '',
	now: MomentLike = nowMoment(),
): Promise<TFile> {
	return createVaultNote(app, root, inboxFileName(title, now, 'Untitled'), withDefaultProperties(body));
}

/** The title of an inbox file: its name without the date prefix. */
export function memoTitle(file: { basename: string }): string {
	return (
		file.basename
			.replace(/^迁移-[a-f0-9]+-/, '')
			.replace(STAMP, '')
			.trim() || file.basename
	);
}

/** When an inbox item was made: the stamp in its name, else the file's creation time. */
export function memoTime(file: { basename: string; stat: { ctime: number } }): number {
	const match = STAMP.exec(file.basename);
	if (match) {
		const [y, m, d] = match[1]!.split('-').map(Number);
		return new Date(y!, m! - 1, d, Number(match[2]), Number(match[3])).getTime();
	}
	return file.stat.ctime;
}

/** Whether the file holds the fleeting thoughts of one day rather than being an item of its own. */
export function isCaptureFile(file: { basename: string }): boolean {
	return captureDayOf(file.basename) !== undefined;
}

/** Markdown files under `root` (any depth), most recently modified first. */
export function listMemos<T extends { path: string; basename: string; stat: { ctime: number; mtime: number } }>(
	files: readonly T[],
	root: string,
): T[] {
	const base = cleanVaultFolder(root);
	if (!base) return [];
	return files.filter((file) => file.path.startsWith(`${base}/`)).sort((a, b) => b.stat.mtime - a.stat.mtime);
}
