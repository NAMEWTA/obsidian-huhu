import { serviceKey } from '../../app/contracts/module';
import type { PanelModel, WorkbenchTarget } from '../../app/contracts/workbench';

/** What the workbench shows for the archives: the side panel tree, the page title and a change signal. */
export interface ArchivesWorkbench {
	/** The people / companies tree for the side panel; rows go to the list or straight to a record. */
	panel(target: WorkbenchTarget): PanelModel;
	title(target: WorkbenchTarget): string | undefined;
	/** Runs when the archive index changes; returns the unsubscribe function. */
	subscribe(listener: () => void): () => void;
}

export const ARCHIVES_WORKBENCH = serviceKey<ArchivesWorkbench>('archives', 'workbench');
