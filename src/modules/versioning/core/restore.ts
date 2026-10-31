import type {
	AnnotationUndo,
	DocumentChangeParticipant,
	DocumentMutationPort,
	DocumentSnapshot,
} from '../../../shared/storage/document-mutation';
import type { HunkRestoreOrigin, HunkRestoreSelection } from './hunk-restore';

export interface RestoreSource {
	readonly id: string;
	readonly text: string;
	readonly label?: string;
}

export interface PrepareRestore {
	readonly source: RestoreSource;
	readonly targetPath: string;
	readonly originLeafId?: string;
	readonly mode: 'replace-current' | 'create-copy';
	readonly copyPath?: string;
	readonly hunks?: HunkRestoreSelection;
}

export interface RestorePlan {
	readonly id: string;
	readonly path: string;
	readonly sourceId: string;
	readonly sourceLabel: string;
	readonly mode: 'replace-current' | 'create-copy' | 'undo' | 'undo-copy';
	readonly beforeText: string | null;
	readonly afterText: string | null;
	readonly dirty: boolean;
	readonly createdAt: number;
	readonly undoOf?: string;
	readonly selectedHunks?: readonly string[];
}

export type RestoreStage = 'prepared' | 'applying' | 'applied' | 'verified' | 'aborted' | 'needs-review';

export interface RestoreReceipt {
	readonly id: string;
	readonly path: string;
	readonly sourceId: string;
	readonly sourceLabel: string;
	readonly mode: RestorePlan['mode'];
	readonly stage: RestoreStage;
	readonly createdAt: number;
	readonly updatedAt: number;
	readonly beforeObject: string | null;
	readonly beforeDiskObject: string | null;
	readonly afterObject: string | null;
	readonly actualDiskObject?: string | null;
	readonly repositoryBaseline: string;
	readonly annotationsBefore?: unknown;
	readonly annotationsAfter?: unknown;
	readonly undoOf?: string;
	readonly undoneBy?: string;
	readonly error?: string;
	readonly recoveryObservation?: 'before' | 'after' | 'diverged' | 'missing';
	/** Explicit human review closes the pending prompt without claiming a successful write. */
	readonly acknowledgedAt?: number;
	/** Terminal receipt facts remain readable after its retained checkpoint bodies have been reclaimed. */
	readonly objectsReleasedAt?: number;
	readonly selectedHunks?: readonly string[];
}

/** Pure coordination: no protection repair, staging, commit, checkout or automatic resume is hidden here. */
export interface RestoreGate {
	run<T>(operationId: string, work: () => Promise<T>): Promise<T>;
	/** Persist the automatic-write hold before accepting any checkpoint or note write. */
	hold(operationId: string): Promise<void>;
	/** Read-only validation: recovery files must be excluded AND untracked. */
	assertCheckpointProtection(): Promise<void>;
	/** HEAD/index semantic fingerprint. A worktree edit must not change this value. */
	capture(): Promise<string>;
}

export interface RestoreCheckpointPort {
	/** Publish objects and their references under the collector's lease. Nested calls use the supplied scoped port. */
	transaction?<T>(work: (checkpoints: RestoreCheckpointPort) => Promise<T>): Promise<T>;
	load(): Promise<void>;
	putObject(text: string): Promise<string>;
	readObject(hash: string): Promise<string>;
	putReceipt(receipt: RestoreReceipt): Promise<void>;
	receipts(): readonly RestoreReceipt[];
}

export interface RestoreDependencies {
	readonly documents: DocumentMutationPort;
	readonly checkpoints: RestoreCheckpointPort;
	readonly gate: RestoreGate;
	readonly participant?: () => DocumentChangeParticipant | undefined;
	readonly now?: () => number;
	readonly assertHunkOrigin?: (origin: HunkRestoreOrigin) => void;
}

export interface PreparedRestoreState {
	readonly plan: RestorePlan;
	readonly document: DocumentSnapshot;
	readonly repositoryBaseline: string;
	readonly annotationUndo?: AnnotationUndo;
	readonly hunkOrigin?: HunkRestoreOrigin;
}

export class RestoreError extends Error {
	constructor(
		readonly code:
			| 'closed'
			| 'plan-missing'
			| 'changed'
			| 'repository-changed'
			| 'checkpoint-corrupt'
			| 'undo-unavailable'
			| 'unverified'
			| 'too-large',
	) {
		super(`versioning.restore.${code}`);
		this.name = 'RestoreError';
	}
}
