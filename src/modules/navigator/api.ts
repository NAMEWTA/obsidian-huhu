// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import type { TFile } from 'obsidian';
import { serviceKey } from '../../app/contracts/module';
import type { Period, WeekStart } from '../../shared/periodic-paths';

/** View type of the navigator side panel; the module places it in the left sidebar while it is switched on. */
export const NAVIGATOR_VIEW_TYPE = 'huhu-navigator-view';

/** The navigator side panel (`huhu-navigator-view`) renders through this while the module is active. */
export interface NavigatorPanel {
	/** Render the panel into `container`; returns the cleanup. */
	mount(container: HTMLElement): () => void;
	/** Select a note's folder in the navigator, scroll it into view and select it (without opening it). */
	reveal(path: string): void;
	/** Move keyboard focus into one pane of the open navigator. */
	focus(pane: 'nav' | 'list'): void;
}

export const NAVIGATOR_PANEL = serviceKey<NavigatorPanel>('navigator', 'panel');

/** What a navigator entry points at. `key` is a note or folder path, a lower-case tag, a property context key (`property:status=done`) or a search query. */
export interface NavigatorListTarget {
	kind: 'note' | 'folder' | 'tag' | 'property' | 'search';
	key: string;
}

export interface NavigatorListsSnapshot {
	/** Recently opened notes on this device, newest first, limited to the configured count. */
	recent: ReadonlyArray<{ path: string; title: string }>;
	/** The navigator's shortcuts in their saved order. */
	shortcuts: ReadonlyArray<NavigatorListTarget & { title: string }>;
}

/**
 * Read-only view of the navigator's recent notes and shortcuts, for dashboard widgets. Anything the hiding rules
 * hide (while "show hidden" is off), shortcuts whose note or folder no longer exists, and the recent list when it
 * is switched off in the settings are left out. Provided only while the navigator module is active.
 */
export interface NavigatorLists {
	/** The current lists; the same object is returned until they change. */
	snapshot(): NavigatorListsSnapshot;
	/** Run `listener` when `snapshot()` would return something different; returns the unsubscribe function. */
	subscribe(listener: () => void): () => void;
	/** Open a note, or reveal the navigator and select the folder, tag or property / run the saved search. */
	open(target: NavigatorListTarget): void;
}

export const NAVIGATOR_LISTS = serviceKey<NavigatorLists>('navigator', 'lists');

/**
 * Read-only view of the journal settings (where periodic notes live and how new ones start), for the dashboard
 * calendar so its daily notes are the very files the navigator's calendar opens. Provided only while the navigator
 * module is active. Missing capabilities are explicit; callers never create default blank notes as a fallback.
 */
export interface PeriodicNoteInfo {
	period: Period;
	date: string;
	path: string;
	title: string;
	status: 'existing' | 'missing' | 'disabled' | 'unavailable';
	active: boolean;
}
export interface PeriodicNotePreview extends PeriodicNoteInfo {
	summary?: string;
	image?: string;
}
export type PeriodicPreparation = { status: 'ready'; path: string; content: string; cursor?: number } | {
	status: 'cancelled' | 'unavailable' | 'failed';
	code: 'period-disabled' | 'periodic-unavailable' | 'template-missing' | 'template-input-required' | 'template-engine-unavailable' | 'template-invalid';
};
export interface PeriodicPrepareOptions {
	interactive?: boolean;
	values?: Record<string, string>;
	/** A previously resolved destination; retries retain the same note identity. */
	path?: string;
	template?: string;
	/** Frozen effective template path, or null for explicitly no template. Never falls back to changed settings. */
	resolvedTemplate?: string | null;
}
export interface NavigatorPeriodic {
	/** Vault folder of the journal; the fixed period folders (`shared/periodic-paths`) live below it. */
	root(): string;
	/** With a date, resolve the effective template (including folder rules) to its actual path. */
	template(period: Period, date?: Date): string | undefined;
	/** First day of the week the weekly notes follow. */
	weekStart(): WeekStart;
	display(): { weekNumbers: boolean; images: boolean; weeks: number };
	inspect(period: Period, date: Date): PeriodicNoteInfo;
	/** Changes to files, the active note and effective settings; listeners own no module activation. */
	subscribe(listener: () => void): () => void;
	preview(period: Period, date: Date): Promise<PeriodicNotePreview>;
	/** Prepare all content before a caller atomically creates a note and its task. No files are written. */
	prepare(period: Period, date: Date, options?: PeriodicPrepareOptions): Promise<PeriodicPreparation>;
	/** Existing files are opened unless the caller explicitly requests creation. */
	open(period: Period, date: Date, options?: { create?: boolean; newTab?: boolean; split?: boolean; ownerWindow?: Window }): Promise<boolean>;
	/** Resolve the active periodic note without moving anybody's browsing position. */
	active(): { period: Period; date: string } | undefined;
	/**
	 * The note of the period that contains `date`, created with the navigator's template engine (folders included,
	 * not opened) when it does not exist yet. Undefined when the user cancels a template question.
	 */
	ensure(period: Period, date: Date): Promise<TFile | undefined>;
}

export const NAVIGATOR_PERIODIC = serviceKey<NavigatorPeriodic>('navigator', 'periodic');
