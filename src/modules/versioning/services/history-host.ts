import type { EditorContextAccess } from '../../../app/contracts/editor-context';
import type { VersioningQueries } from '../core/history';
import type { NoteReviewService } from './note-review';
import type { RestoreService } from './restore-service';
import type { SyncService } from './sync-service';
import type { AutomaticHistory } from './automatic-history';

/** Capabilities shared by the sidebar and the focus review; no renderer or global active path is retained. */
export interface NoteHistoryHost {
	documents: EditorContextAccess;
	queries: VersioningQueries;
	reviews: NoteReviewService;
	restores: RestoreService;
	sync: SyncService;
	automaticHistory?: AutomaticHistory;
	openSettings(): void;
}
