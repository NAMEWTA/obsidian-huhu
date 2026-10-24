/**
 * Default icons by file type and special folder.
 *
 * Pure data, shared by the icons module (Obsidian file list), the note navigator and the HUHU file tree, so one
 * table decides what a `.pdf`, a `.md` or the `日志` folder looks like. Icon names are Lucide names without prefix
 * (`file-text`); Obsidian's `setIcon` takes them as `lucide-file-text` (see {@link lucideIconId}). Colors are
 * Obsidian theme variables, so they follow the theme and the light/dark mode and are valid in HUHU's own UI and in
 * Obsidian's file explorer.
 */
import { HUHU_VISIBLE_ROOT } from './storage/vault-layout';

export interface FileTypeIcon {
	/** Lucide icon name without the `lucide-` prefix. */
	icon: string;
	/** A CSS color (`var(--color-red)`), or null to inherit the surrounding text color. */
	color: string | null;
}

/** The icon id Obsidian's `setIcon` expects for a Lucide name. */
export function lucideIconId(icon: string): string {
	return icon.startsWith('lucide-') ? icon : `lucide-${icon}`;
}

const color = (name: 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink'): string => `var(--color-${name})`;
const entry = (icon: string, tone: string | null = null): FileTypeIcon => ({ icon, color: tone });

const PLAIN_FILE = entry('file');
const MARKDOWN = entry('file-text');
const SLIDES = entry('presentation', color('orange'));
const DOCUMENT = entry('file-type', color('blue'));
const SPREADSHEET = entry('file-spreadsheet', color('green'));
const IMAGE = entry('file-image', color('pink'));
const AUDIO = entry('file-audio', color('yellow'));
const VIDEO = entry('file-video', color('purple'));
const ARCHIVE = entry('file-archive');
const CODE = entry('file-code', color('cyan'));
const JSON_DATA = entry('file-json', color('yellow'));
const CONFIG_DATA = entry('file-braces', color('yellow'));

const BY_EXTENSION = new Map<string, FileTypeIcon>();
function assign(extensions: string, icon: FileTypeIcon): void {
	for (const extension of extensions.split(' ')) BY_EXTENSION.set(extension, icon);
}
assign('md markdown', MARKDOWN);
assign('canvas', entry('layout-dashboard', color('purple')));
assign('base', entry('database', color('cyan')));
assign('pdf', entry('file-text', color('red')));
assign('doc docx odt rtf pages', DOCUMENT);
assign('ppt pptx odp key', SLIDES);
assign('xls xlsx xlsm csv tsv ods numbers', SPREADSHEET);
assign('png jpg jpeg gif svg webp bmp avif heic ico tif tiff', IMAGE);
assign('mp3 wav ogg oga opus m4a flac aac 3gp', AUDIO);
assign('mp4 mov mkv avi webm m4v wmv', VIDEO);
assign('zip rar 7z tar gz tgz bz2 xz', ARCHIVE);
assign('js jsx mjs cjs ts tsx py rs go java kt c h cpp cc hpp cs rb php swift sh bash zsh ps1 lua sql html htm css scss vue svelte', CODE);
assign('json jsonl', JSON_DATA);
assign('yaml yml toml xml ini conf env', CONFIG_DATA);
assign('txt log', PLAIN_FILE);
assign('epub mobi', entry('book-open', color('orange')));

/** Lowercase extension of a path or bare extension (`'PDF'`, `'.pdf'`, `'a/b/Report.PDF'` all give `pdf`). */
export function fileExtension(pathOrExtension: string): string {
	const name = pathOrExtension.slice(pathOrExtension.lastIndexOf('/') + 1);
	const dot = name.lastIndexOf('.');
	// A bare extension has no separator and no stem; a dotfile such as `.gitignore` has no extension.
	if (dot < 0) return pathOrExtension.includes('/') ? '' : name.toLowerCase();
	if (dot === 0) return pathOrExtension.includes('/') ? '' : name.slice(1).toLowerCase();
	return name.slice(dot + 1).toLowerCase();
}

/** The default icon for a file path or extension. Unknown types get the plain file icon. */
export function defaultFileIcon(pathOrExtension: string): FileTypeIcon {
	return BY_EXTENSION.get(fileExtension(pathOrExtension)) ?? PLAIN_FILE;
}

const JOURNAL = entry('calendar-days', color('green'));
const PERIODIC = new Map<string, FileTypeIcon>([
	['日记', entry('calendar-1', color('green'))],
	['周记', entry('calendar-range', color('green'))],
	['月记', entry('calendar', color('green'))],
	['季记', entry('calendar-fold', color('green'))],
	['年记', entry('calendar-clock', color('green'))],
]);
const ARCHIVES = entry('contact-round', color('blue'));
const PEOPLE = entry('user', color('blue'));
const COMPANIES = entry('building-2', color('orange'));
const ATTACHMENTS = entry('paperclip');
const TEMPLATES = entry('layout-template', color('purple'));
const FOLDER_CLOSED = entry('folder-closed');
const FOLDER_OPEN = entry('folder-open');

/**
 * The default icon for a folder path (vault-relative; a leading `huhu/` root is ignored, so `huhu/日志` is the journal). Special folders keep their icon open
 * or closed; ordinary folders switch between the closed and open folder.
 */
export function defaultFolderIcon(path: string, open = false): FileTypeIcon {
	const segments = path.split('/').filter(Boolean);
	if (segments[0] === HUHU_VISIBLE_ROOT) segments.shift();
	const name = segments.at(-1);
	if (name) {
		const parent = segments.at(-2);
		if (name === '日志' && segments.length === 1) return JOURNAL;
		if (parent === '日志' && segments.length === 2) {
			const periodic = PERIODIC.get(name);
			if (periodic) return periodic;
		}
		if (name === '档案') return ARCHIVES;
		if (parent === '档案') {
			if (name === '个人档案') return PEOPLE;
			if (name === '企业档案') return COMPANIES;
		}
		const lower = name.toLowerCase();
		if (lower === 'attachments' || lower === '附件') return ATTACHMENTS;
		if (lower === 'templates' || name === '模板') return TEMPLATES;
	}
	return open ? FOLDER_OPEN : FOLDER_CLOSED;
}

/** Every icon name the table can return, so callers and tests can check them against an icon set. */
export function defaultIconNames(): string[] {
	const names = new Set<string>([PLAIN_FILE.icon, FOLDER_CLOSED.icon, FOLDER_OPEN.icon, JOURNAL.icon, ARCHIVES.icon, PEOPLE.icon, COMPANIES.icon, ATTACHMENTS.icon, TEMPLATES.icon]);
	for (const value of BY_EXTENSION.values()) names.add(value.icon);
	for (const value of PERIODIC.values()) names.add(value.icon);
	return [...names].sort();
}
