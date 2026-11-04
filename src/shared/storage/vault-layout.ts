/** Fixed visible defaults. Display translations and user titles never determine these names. */
export const VISIBLE_NAMES = {
	root: 'huhu',
	journal: 'journal',
	inbox: 'inbox',
	todos: 'todos',
	tasks: 'tasks',
	projects: 'projects',
	archives: 'archives',
	expenses: 'expenses',
	habits: 'habits',
	pomodoro: 'pomodoro',
	reading: 'reading',
	rss: 'rss',
	highlights: 'highlights',
	notes: 'notes',
	exports: 'exports',
	taskFile: 'tasks.md',
	completedFile: 'completed.md',
	taskStore: 'tasks.json',
	periods: { day: 'daily', week: 'weekly', month: 'monthly', quarter: 'quarterly', year: 'yearly' },
	weekMarker: 'w',
	quarterMarker: 'q',
	archive: {
		people: 'people',
		companies: 'companies',
		entry: 'profile.md',
		guide: 'format-guide.md',
		collection: 'collection.md',
		definitions: 'definitions',
		relations: 'relations',
		migrations: 'migrations',
		categories: {
			type: 'types',
			form: 'forms',
			template: 'templates',
			'relation-type': 'relation-types',
			view: 'views',
		},
		current: 'current.md',
		revisions: 'revisions',
		originals: 'originals',
	},
	json: { expense: 'expense.json', habit: 'habits.json', pomodoro: 'pomodoro.json', reading: 'reading.json' },
	records: 'records',
	bookFile: 'book.md',
	habitFile: 'habit.md',
	expenseFile: 'categories.md',
	pomodoroFile: 'activities.md',
	agent: 'agent',
	session: 'session',
	expenseExport: 'expense-export',
	subscriptions: 'subscriptions',
	captures: 'captures',
	newNote: 'new-note',
	untitled: 'untitled',
	imported: 'imported',
	restored: 'restored',
} as const;

export const HUHU_VISIBLE_ROOT = VISIBLE_NAMES.root;
export const JOURNAL_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.journal}`;
export const INBOX_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.inbox}`;
export const TASK_ARCHIVE_PATH = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.todos}/${VISIBLE_NAMES.completedFile}`;
export const TASKS_PATH = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.todos}/${VISIBLE_NAMES.taskFile}`;
export const TASK_STORE_PATH = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.tasks}/${VISIBLE_NAMES.taskStore}`;
export const PROJECTS_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.projects}`;
export const ARCHIVES_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.archives}`;
export const ARCHIVE_PATHS = VISIBLE_NAMES.archive;
export const ARCHIVES_DRAFT_ROOT = '.huhu/archives/drafts';
export const EXPENSE_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.expenses}`;
export const HABIT_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.habits}`;
export const POMODORO_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.pomodoro}`;
export const READING_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.reading}`;
export const RSS_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.rss}`;
export const NEW_NOTE_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.notes}`;
export const EXPORTS_ROOT = `${HUHU_VISIBLE_ROOT}/${VISIBLE_NAMES.exports}`;

/** Hidden Markdown documents HUHU owns (listed and edited through the managed-file index). */
export const DASHBOARDS_ROOT = '.huhu/dashboards';
export const WEATHER_CACHE_ROOT = '.huhu/cache/weather';
export const GIT_UNTRACK_RECOVERY_ROOT = '.huhu/recovery/git-untrack';
export const VERSIONING_RECOVERY_ROOT = '.huhu/recovery/versioning';
/** Host-local minimal receipts; the Bot business database remains in its OS Profile root. */
export const AUTOMATION_DEFINITIONS_ROOT = '.huhu/automation/definitions';
export const HIDDEN_DOCUMENT_ROOTS: readonly string[] = [DASHBOARDS_ROOT, AUTOMATION_DEFINITIONS_ROOT];
/** The board a fresh vault starts with (no extension: board file settings omit `.md`). */
export const DEFAULT_DASHBOARD_FILE = '.huhu/dashboards/dashboard';

export function agentWorkbenchPath(deviceId: string): string {
	if (!/^[a-zA-Z0-9_-]+$/.test(deviceId)) throw new Error('huhu-storage.invalid-device');
	return `.huhu/terminal-agent/${deviceId}/workbench-v2.json`;
}

export function isVisibleHuhuPath(path: string): boolean {
	return path === HUHU_VISIBLE_ROOT || path.startsWith(HUHU_VISIBLE_ROOT + '/');
}

/**
 * A title as a file or folder name: whitespace runs and characters no filesystem accepts become one `-`, ends are
 * trimmed, and an empty result falls back to `fallback`. `First article` -> `First-article`.
 */
export function huhuName(raw: string, fallback: string = VISIBLE_NAMES.untitled): string {
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
export function inboxFileName(title: string, now: Stamp, fallback: string = VISIBLE_NAMES.untitled): string {
	return `${now.format('YYYY-MM-DD-HHmm')}-${huhuName(title, fallback)}`;
}

/** `2026-10-20-First-article` (no extension): a dated name for articles, new notes and similar. */
export function datedName(title: string, now: Stamp, fallback: string = VISIBLE_NAMES.untitled): string {
	return `${now.format('YYYY-MM-DD')}-${huhuName(title, fallback)}`;
}

/** The part of a capture file's name after its date: the fixed capture identifier. */
export const CAPTURE_DAY_WORD = VISIBLE_NAMES.captures;

/** `<root>/2026-10-22-captures.md`: the capture file of the day `now` is in, next to the inbox items. */
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
