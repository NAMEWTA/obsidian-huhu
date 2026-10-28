import type { TaskAutomationMeta } from '../../../../shared/automation/metadata';

/** Markdown checkbox read model for document/card presentation, NOT task-domain storage. */
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
