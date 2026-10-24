import { DEFAULT_PERIODIC_ROOT, PERIOD_FOLDERS, periodicNotePath } from '../../../../shared/periodic-paths';
import { App, TFile } from 'obsidian';
import { MomentLike, nowMoment } from '../../../../host/obsidian/datetime';
import type { NavigatorPeriodic } from '../../../navigator/api';

/*
 * Daily notes live in the journal archive shared with the notes navigator: `<root>/日记/YYYY/MM/YYYY-MM-DD.md`
 * (see `shared/periodic-paths`). The core Daily notes plugin is not consulted. The root folder and the daily template
 * come from the active navigator. Without that capability, creation is unavailable; it never silently writes
 * a blank note into a default location.
 */

let journalSource: (() => NavigatorPeriodic | undefined) | undefined;

/** The home module tells this file where to find the navigator's journal service; returns the unbind function. */
export function bindJournal(source: () => NavigatorPeriodic | undefined): () => void {
	journalSource = source;
	return () => {
		if (journalSource === source) journalSource = undefined;
	};
}

/** `YYYY-MM-DD` as a local date (a malformed value falls back to today). */
function isoToDate(iso: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!match) return new Date();
	const date = new Date(2000, 0, 1);
	date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return date;
}

/** Where the daily notes live: folder and the layout below it, in the shape the banner statistics read. */
export interface DailyNotesConfig {
	folder: string;
	format: string;
}
export function getDailyNotesConfig(_app: App): DailyNotesConfig {
	const root = journalSource?.()?.root() ?? DEFAULT_PERIODIC_ROOT;
	return { folder: `${root}/${PERIOD_FOLDERS.day}`, format: 'YYYY/MM/YYYY-MM-DD' };
}

/** Ensure a vault folder path exists, creating intermediate folders as needed. */
export async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const adapter = app.vault.adapter;
	const parts = folderPath
		.split('/')
		.map((p) => p.trim())
		.filter(Boolean);
	let current = '';
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!(await adapter.exists(current))) {
			await adapter.mkdir(current);
		}
	}
}

/**
 * Substitute a basic subset of Obsidian's template variables in `content`,
 * using `now` (defaults to the current time). Supported: `{{date}}`,
 * `{{date:FORMAT}}`, `{{time}}`, `{{time:FORMAT}}`, and `{{title}}` (only when
 * a title is provided — otherwise left in place). Used by note creation from
 * user templates and by daily-note seeding.
 */
export function substituteTemplateVars(content: string, opts: { title?: string; now?: MomentLike } = {}): string {
	const now = opts.now ?? nowMoment();
	let out = content;
	// Specific-format variants first so the bare regex doesn't shadow them.
	out = out.replace(/\{\{date:([^}]+)\}\}/g, (_m, fmt: string) => now.format(fmt));
	out = out.replace(/\{\{time:([^}]+)\}\}/g, (_m, fmt: string) => now.format(fmt));
	out = out.replace(/\{\{date\}\}/g, now.format('YYYY-MM-DD'));
	out = out.replace(/\{\{time\}\}/g, now.format('HH:mm'));
	if (opts.title != null) {
		out = out.replace(/\{\{title\}\}/g, opts.title);
	}
	return out;
}

/** Vault path of the daily note for the given `YYYY-MM-DD` iso date: `<journal root>/日记/YYYY/MM/YYYY-MM-DD.md`. */
export function dailyNotePathFor(_app: App, iso: string): string {
	const journal = journalSource?.();
	return periodicNotePath(journal?.root() ?? DEFAULT_PERIODIC_ROOT, 'day', isoToDate(iso), journal?.weekStart() ?? 1);
}

/** Explicit daily-note creation for existing board commands. Calendar tasks use the home calendar writer. */
export async function getOrCreateDailyNote(app: App, iso: string): Promise<TFile | null> {
	const journal = journalSource?.();
	if (!journal) return null;
	const info = journal.inspect('day', isoToDate(iso));
	if (info.status === 'disabled' || info.status === 'unavailable') return null;
	const existing = app.vault.getFileByPath(info.path);
	return existing ?? (await journal.ensure('day', isoToDate(iso))) ?? null;
}
