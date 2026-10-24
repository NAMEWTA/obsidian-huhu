// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import type { FolderTemplate } from './folder-templates';
import type { PeriodRules } from './periodic';

/** The settings the note factory and periodic notes read; the module's settings satisfy it. */
export interface ProductivityConfig {
	templateFolder: string;
	templateEngine: 'auto' | 'builtin' | 'templater';
	templateDateFormat: string;
	templateTimeFormat: string;
	folderTemplates: FolderTemplate[];
	calendarWeekStart: 'auto' | 'monday' | 'sunday' | 'saturday';
	/** Vault folder the journal (daily, weekly, ... notes) lives in. */
	periodicRoot: string;
	/** Which periods are in use and their templates. */
	periods: PeriodRules;
}

export interface ConfigReader {
	get(): ProductivityConfig;
}
