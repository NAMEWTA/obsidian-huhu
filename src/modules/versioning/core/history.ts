/** Read-only version references. Commit/tree references are resolved to object ids before reading. */
export type RevisionRef =
	| { readonly kind: 'commit'; readonly commit: string; readonly path: string }
	| { readonly kind: 'tree'; readonly tree: string; readonly path: string }
	| { readonly kind: 'index'; readonly path: string; readonly stage?: 0 | 1 | 2 | 3 }
	| { readonly kind: 'worktree'; readonly path: string }
	| {
			readonly kind: 'editor-buffer';
			readonly path: string;
			readonly text: string;
			readonly generation: string | number;
	  }
	| { readonly kind: 'local-snapshot'; readonly path: string; readonly snapshotId: string; readonly text: string }
	| { readonly kind: 'empty'; readonly path: string };

/** Exact UTF-8 source: no newline normalization or BOM stripping is permitted. */
export interface TextSnapshot {
	readonly text: string;
	readonly hash: string;
	readonly byteLength: number;
	readonly encoding: 'utf-8';
	readonly eol: 'lf' | 'crlf' | 'cr' | 'mixed' | 'none';
	readonly hasBom: boolean;
	readonly endsWithNewline: boolean;
}

export type EndpointContent =
	| { readonly status: 'text'; readonly snapshot: TextSnapshot }
	| { readonly status: 'missing'; readonly reason: 'not-present' | 'empty' }
	| {
			readonly status: 'binary';
			readonly byteLength: number;
			readonly reason: 'nul' | 'encoding' | 'symlink' | 'submodule' | 'not-file';
	  }
	| { readonly status: 'too-large'; readonly byteLength: number; readonly limit: number }
	| { readonly status: 'error'; readonly code: string; readonly message: string };

export type ResolvedEndpoint = EndpointContent & {
	readonly repositoryId: string;
	readonly ref: RevisionRef;
	readonly id: string;
	readonly path: string;
	readonly label: string;
	readonly commitOid?: string;
	readonly blobOid?: string;
};

export type ComparisonIntent = 'unstaged' | 'staged' | 'commit' | 'history-current' | 'revisions' | 'branches';
export interface ComparisonRequest {
	readonly repositoryId?: string;
	readonly intent: ComparisonIntent;
	readonly left: RevisionRef;
	readonly right: RevisionRef;
}
export interface ResolvedComparison {
	readonly id: string;
	readonly repositoryId: string;
	readonly intent: ComparisonIntent;
	readonly left: ResolvedEndpoint;
	readonly right: ResolvedEndpoint;
	readonly capturedAt: number;
	readonly identical: boolean;
	readonly canCompare: boolean;
}

export interface FileHistoryEntry {
	readonly id: string;
	readonly commitOid: string;
	readonly parents: readonly string[];
	readonly author: string;
	readonly time: number;
	readonly subject: string;
	readonly pathAtRevision: string;
	readonly previousPath?: string;
	readonly status: string;
	readonly ref: RevisionRef;
}
export interface HistoryCursor {
	readonly tip: string;
	readonly path: string;
	readonly skip: number;
}
export interface FileHistoryPage {
	readonly entries: readonly FileHistoryEntry[];
	readonly tip: string | null;
	readonly path: string;
	readonly nextCursor?: HistoryCursor;
	readonly complete: boolean;
	/** Git follows detected renames; it cannot prove stable document identity. */
	readonly lineage: 'git-rename-detection';
}
export interface HistoryOptions {
	readonly cursor?: HistoryCursor;
	readonly limit?: number;
	readonly ref?: string;
	readonly signal?: AbortSignal;
}

export interface SnapshotReadOptions {
	readonly signal?: AbortSignal;
	readonly maxBytes?: number;
}
export interface RevisionReader {
	resolve(ref: RevisionRef, options?: SnapshotReadOptions): Promise<ResolvedEndpoint>;
}

/** The UI consumes this contract; the service owns immutable resolution and repository checks. */
export interface VersioningQueries {
	/** Automatic local history remains readable without a Git repository. Metadata is loaded before bodies. */
	localHistory?(path: string, signal?: AbortSignal): Promise<readonly FileHistoryEntry[]>;
	readLocalSnapshot?(snapshotId: string, signal?: AbortSignal): Promise<string>;
	fileHistory(path: string, options?: HistoryOptions): Promise<FileHistoryPage>;
	resolveCommit(ref: string, signal?: AbortSignal): Promise<string | null>;
	resolve(ref: RevisionRef, signal?: AbortSignal): Promise<ResolvedEndpoint>;
	compare(request: ComparisonRequest, signal?: AbortSignal): Promise<ResolvedComparison>;
	commitComparison(commit: string, path: string, parent?: string, signal?: AbortSignal): Promise<ResolvedComparison>;
	changedFiles(
		leftCommit: string | null,
		rightCommit: string,
		signal?: AbortSignal,
	): Promise<readonly RevisionFileChange[]>;
}

export interface RevisionFileChange {
	readonly path: string;
	readonly from?: string;
	readonly status: string;
}
