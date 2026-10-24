import type { CalendarTaskFilter } from './task-filter';
import type { TaskAutomationMeta } from '../../../../shared/automation/metadata';
import type { TaskRecurrence } from '../../../../shared/automation/task';

/** A source task, independent of an open board, UI component or Obsidian file instance. */
export interface CalendarTask extends TaskAutomationMeta {
	/** True for a virtual future recurrence; rendering it never writes a file. */
	virtual?: boolean;
	id?: string;
	effectKey?: string;
	path: string;
	line: number;
	originalLine: string;
	checked: boolean;
	text: string;
	reminder?: string;
	due?: string;
	start?: string;
	end?: string;
	scheduled?: string;
	scheduledTime?: string;
	completion?: string;
	completionTime?: string;
	time?: string;
	endTime?: string;
	priority?: 'high' | 'medium' | 'low';
	mtime: number;
	ctime: number;
}

/** Source scope and display filter are separate: hiding a completed task does not make its target invalid. */
export interface CalendarScope {
	boardPath?: string;
	filter?: CalendarTaskFilter;
	/** Optional visible interval for lazy recurrence previews. */
	from?: string;
	to?: string;
}

export interface CalendarSnapshot {
	status: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
	tasks: readonly CalendarTask[];
	byDay: ReadonlyMap<string, readonly CalendarTask[]>;
	unfilteredCount: number;
	filter: CalendarTaskFilter;
	revision: number;
	error?: string;
}

/** Versioned, JSON-safe destination recorded before an automation performs its side effect. */
export interface CalendarTargetSnapshot {
	version: 1;
	kind: 'daily' | 'file' | 'folder' | 'task';
	path: string;
	position: 'start' | 'end';
	date: string;
	id: string;
	boardPath?: string;
	template?: string;
	effectKey?: string;
}

export type CalendarFailureCode =
	| 'invalid-input'
	| 'invalid-target'
	| 'source-excluded'
	| 'source-missing'
	| 'period-disabled'
	| 'periodic-unavailable'
	| 'template-missing'
	| 'template-input-required'
	| 'template-engine-unavailable'
	| 'template-invalid'
	| 'conflict'
	| 'write-failed'
	| 'stopped';

export interface CalendarFailure {
	status: 'cancelled' | 'unavailable' | 'failed';
	code: CalendarFailureCode;
	message?: string;
}

export interface CalendarTaskInput extends CalendarScope {
	/** Calendar ownership date; an empty string creates an unscheduled task. */
	date: string;
	/** A single title line without scanner-recognized date fields; date/time/reminder controls are authoritative. */
	text: string;
	/** Explicit task time on `date`; it does not implicitly create a reminder. */
	time?: string;
	/** Explicit reminder in YYYY-MM-DD HH:mm (independent of the ownership date). */
	reminder?: string;
	recurrence?: TaskRecurrence;
	effectKey?: string;
	runId?: string;
	interactive?: boolean;
	values?: Record<string, string>;
	signal?: AbortSignal;
}

export type CalendarTargetResult = { status: 'ready'; target: CalendarTargetSnapshot } | CalendarFailure;
export interface CalendarTaskReceipt {
	id: string;
	path: string;
	line: number;
	originalLine: string;
	date: string;
	effectKey?: string;
}
export type CalendarCreateResult =
	| {
			status: 'created' | 'already-exists' | 'written-pending-refresh';
			receipt: CalendarTaskReceipt;
			target: CalendarTargetSnapshot;
	  }
	| CalendarFailure;

export type CalendarMutationResult = { status: 'updated' | 'written-pending-refresh' } | CalendarFailure;
