/**
 * The two persistence roots of a vault and every default path under them, in one place.
 *
 *   huhu/   visible. The user's content and records (journal, captures, inbox, archives, ledgers, RSS, new notes).
 *           Read and written through the Obsidian vault API, so Obsidian indexes, searches and syncs it.
 *   .huhu/  hidden. HUHU's own configuration and runtime data. Only `.huhu/dashboards/` and
 *           `.huhu/automation/definitions/` hold Markdown documents (board layouts, automation definitions).
 *
 * Folder names are Chinese on purpose: they are the user's vault structure, not interface text.
 * Nothing HUHU generates may contain a space; `huhuName` is the one function that makes a title safe.
 */

/** Visible root: user content and records. */
export const HUHU_VISIBLE_ROOT = 'huhu';

export const JOURNAL_ROOT = `${HUHU_VISIBLE_ROOT}/日志`;
/**
 * The inbox widget (the former memo widget and the fleeting-capture widget in one), flat:
 *   `<root>/YYYY-MM-DD-HHmm-标题.md`  a new item, one note each
 *   `<root>/YYYY-MM-DD-闪念.md`       the fleeting thoughts of one day, one list line each
 */
export const INBOX_ROOT = `${HUHU_VISIBLE_ROOT}/收件箱`;
export const TASK_ARCHIVE_PATH = `${HUHU_VISIBLE_ROOT}/待办/已完成.md`;
export const TASKS_PATH = `${HUHU_VISIBLE_ROOT}/待办/待办.md`;
/** Canonical task-domain state; legacy board checkboxes are not a data source. */
export const TASK_STORE_PATH = `${HUHU_VISIBLE_ROOT}/任务/tasks.json`;
export const PROJECTS_ROOT = `${HUHU_VISIBLE_ROOT}/项目管理`;
/** `<root>/个人档案/<姓名>/基本信息.md`, `<root>/企业档案/<名称>/基本信息.md`. */
export const ARCHIVES_ROOT = `${HUHU_VISIBLE_ROOT}/档案`;
/** Portable archive protocol, definitions, relations and recovery evidence. */
export const ARCHIVE_PATHS = {
	collection: '档案集合.md',
	definitions: '档案定义',
	relations: '关联记录',
	migrations: '迁移记录',
} as const;
export const ARCHIVES_DRAFT_ROOT = '.huhu/archives/drafts';
export const EXPENSE_ROOT = `${HUHU_VISIBLE_ROOT}/记账`;
export const HABIT_ROOT = `${HUHU_VISIBLE_ROOT}/习惯`;
export const POMODORO_ROOT = `${HUHU_VISIBLE_ROOT}/番茄钟`;
export const READING_ROOT = `${HUHU_VISIBLE_ROOT}/阅读`;
export const RSS_ROOT = `${HUHU_VISIBLE_ROOT}/RSS`;
export const WEREAD_HIGHLIGHTS_ROOT = `${HUHU_VISIBLE_ROOT}/微信读书/划线`;
/** A new note that names no folder of its own. */
export const NEW_NOTE_ROOT = `${HUHU_VISIBLE_ROOT}/笔记`;
/** Exports (ledger CSV, agent conversation exports). */
export const EXPORTS_ROOT = `${HUHU_VISIBLE_ROOT}/导出`;

/** Hidden Markdown documents HUHU owns (listed and edited through the managed-file index). */
export const DASHBOARDS_ROOT = '.huhu/dashboards';
/** Per-device managed Chromium, encrypted identities and operation records. */
export const BROWSER_ROOT = '.huhu/browser';
/** User-selected material copies for Agent inputs; excluded from Git. */
export const BROWSER_MATERIALS_ROOT = '.huhu/browser-materials';
export const WEATHER_CACHE_ROOT = '.huhu/cache/weather';
export const GIT_UNTRACK_RECOVERY_ROOT = '.huhu/recovery/git-untrack';
export const VERSIONING_RECOVERY_ROOT = '.huhu/recovery/versioning';
/** Host-local minimal receipts; the Bot business database remains in its OS Profile root. */
export const HUHUBOT_RUNTIME_ROOT = '.huhu/huhubot';
export const AUTOMATION_DEFINITIONS_ROOT = '.huhu/automation/definitions';
export const HIDDEN_DOCUMENT_ROOTS: readonly string[] = [DASHBOARDS_ROOT, AUTOMATION_DEFINITIONS_ROOT];
/** The board a fresh vault starts with (no extension: board file settings omit `.md`). */
export const DEFAULT_DASHBOARD_FILE = '.huhu/dashboards/dashboard';

export function isVisibleHuhuPath(path: string): boolean {
	return path === HUHU_VISIBLE_ROOT || path.startsWith(HUHU_VISIBLE_ROOT + '/');
}

/**
 * A title as a file or folder name: whitespace runs and characters no filesystem accepts become one `-`, ends are
 * trimmed, and an empty result falls back to `fallback`. `First article` -> `First-article`.
 */
export function huhuName(raw: string, fallback = '未命名'): string {
	const name = Array.from(raw, (char) => (char.charCodeAt(0) < 32 ? '-' : char))
		.join('')
		.replace(/[\\/:*?"<>|\s]+/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^[-.]+|[-.]+$/g, '')
		.slice(0, 100)
		.replace(/[-.]+$/g, '');
	return name || fallback;
}

/** A moment-like value: only `format` is used, so the module stays free of host imports. */
export interface Stamp {
	format(pattern: string): string;
}

/** `2026-10-21-1654-新备忘` (no extension). */
export function inboxFileName(title: string, now: Stamp, fallback = '未命名'): string {
	return `${now.format('YYYY-MM-DD-HHmm')}-${huhuName(title, fallback)}`;
}

/** `2026-10-20-First-article` (no extension): a dated name for articles, new notes and similar. */
export function datedName(title: string, now: Stamp, fallback = '未命名'): string {
	return `${now.format('YYYY-MM-DD')}-${huhuName(title, fallback)}`;
}

/** The part of a capture file's name after its date: the Chinese word for a fleeting thought, as in the folder names. */
export const CAPTURE_DAY_WORD = '闪念';

/** `<root>/2026-10-22-闪念.md`: the capture file of the day `now` is in, next to the inbox items. */
export function captureDayPath(root: string, now: Stamp): string {
	return captureDayPathFor(root, now.format('YYYY-MM-DD'));
}

/** The capture file of `day` (`YYYY-MM-DD`) under the inbox folder `root`. */
export function captureDayPathFor(root: string, day: string): string {
	return `${root.replace(/\/+$/, '')}/${day}-${CAPTURE_DAY_WORD}.md`;
}

/** The day (`YYYY-MM-DD`) a capture file's name stands for, or undefined when the name is not a capture file's. */
export function captureDayOf(basename: string): string | undefined {
	return new RegExp(`^(\\d{4}-\\d{2}-\\d{2})-${CAPTURE_DAY_WORD}$`).exec(basename)?.[1];
}

/** One capture entry as a list line: `- 16:54 text`. Line breaks continue the item with an indent. */
export function captureLine(text: string, now: Stamp): string {
	const [first = '', ...rest] = text.trim().split(/\r?\n/);
	return [`- ${now.format('HH:mm')} ${first}`, ...rest.map((line) => (line ? `  ${line}` : ''))].join('\n');
}
