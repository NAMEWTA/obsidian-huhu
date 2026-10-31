import { serviceKey } from '../../app/contracts/module';
import type { WorkbenchTarget } from '../../app/contracts/workbench';
import type { EditorPanelContribution } from '../../app/contracts/editor-context';
import type { VersioningQueries } from './core/history';

export type { RevisionRef, TextSnapshot, ResolvedEndpoint, ResolvedComparison, FileHistoryEntry, HistoryCursor, VersioningQueries } from './core/history';

/** A status bar row about git sync; the workbench opens the sync page (`section`) when it is clicked. */
export interface SyncStatusRow {
	id: string;
	kind: 'error' | 'running' | 'info';
	label: string;
	section?: string;
}

/** What the workbench shows for git sync: the page title and status rows. */
export interface SyncWorkbench {
	title(target: WorkbenchTarget): string | undefined;
	status(): readonly SyncStatusRow[];
	subscribe(listener: () => void): () => void;
}

export const VERSIONING_WORKBENCH = serviceKey<SyncWorkbench>('versioning', 'workbench');
export const VERSION_HISTORY = serviceKey<VersioningQueries>('versioning', 'history');
export const NOTE_HISTORY_PANEL = serviceKey<EditorPanelContribution>('versioning', 'history-panel');
