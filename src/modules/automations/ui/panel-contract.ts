import type { AutomationsApi } from '../core/api';
import type { AutomationTaskDelivery, NoteLink } from '../../../shared/automation/types';
import type { AutomationViewStore } from '../services/view-store';
import type { AutomationCalendarTarget } from '../api';

export type TaskTarget = { path: string; cardId: string; title: string };
/** What the board page, the editor and the composer dialog need from the module; absent while it is not running. */
export interface AutomationViewHost {
	service: AutomationsApi;
	store: AutomationViewStore;
	skipDeleteConfirmation?(): boolean;
	setSkipDeleteConfirmation?(value: boolean): Promise<void>;
	inbox(): void;
	retry(): Promise<void>;
	refresh(): Promise<void>;
	/** Open the note an automation was made from, at its line. */
	openLink?(link: NoteLink): Promise<void>;
	/** Resolve the recorded task identity against current source bytes in the requesting window. */
	openCalendarSource?(delivery: AutomationTaskDelivery, owner?: Window): Promise<void>;
	taskTargets?(): Promise<TaskTarget[]>;
	calendarTargets?(): Promise<AutomationCalendarTarget[]>;
	paths(): Array<{ path: string; kind: 'file' | 'folder' }>;
	commands(): Array<{ id: string; name: string }>;
	readonly cwd?: string;
}
