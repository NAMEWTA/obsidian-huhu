import {
	INBOX_ROOT,
	NEW_NOTE_ROOT,
	PROJECTS_ROOT,
	RSS_ROOT,
	TASK_ARCHIVE_PATH,
	WEREAD_HIGHLIGHTS_ROOT,
} from '../../../../shared/storage/vault-layout';

/**
 * Defaults for missing/empty preferences. Notes live in the visible `huhu/` folder of the vault, never under
 * `.huhu/` (Obsidian does not index dot-folders). The layout itself is defined in `shared/storage/vault-layout`.
 */
export const DEFAULT_TASK_ARCHIVE_PATH = TASK_ARCHIVE_PATH;
export const DEFAULT_HIGHLIGHT_IMPORT_PATH = WEREAD_HIGHLIGHTS_ROOT;
/**
 * The inbox folder, flat: items are `<root>/YYYY-MM-DD-HHmm-title.md`, the fleeting thoughts of a day are
 * `<root>/YYYY-MM-DD-闪念.md`. (The setting is still called `memoSavePath`.)
 */
export const DEFAULT_MEMO_ROOT = INBOX_ROOT;
/** A new note with no folder of its own (database toolbar, saved sticky). */
export const DEFAULT_NEW_NOTE_FOLDER = NEW_NOTE_ROOT;
/** Project-management notes: one note per project, `type: project`. */
export const DEFAULT_PROJECTS_ROOT = PROJECTS_ROOT;
/** Articles saved from the reader and the exported subscription list. */
export const DEFAULT_RSS_FOLDER = RSS_ROOT;
