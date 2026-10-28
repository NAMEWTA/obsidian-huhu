export type NativeUsage = import('../../../../../shared/automation/types').AgentUsage;
export interface NativeSessionSummary {
	key: string;
	agentId: string;
	accountKey: string;
	sessionId: string;
	cwd: string;
	title: string;
	transcriptPath: string;
	modifiedAtMs: number;
	usage: NativeUsage;
	/** Admission state is explicit; missing/unsupported sources are never represented as an empty body. */
	sourceStatus?: 'available' | 'missing' | 'changed' | 'unsupported' | 'permission-denied' | 'unknown';
	sourceRef?: string;
	/** Scan-time metadata the helper stores without the body; preview details may refine them. */
	model?: string | null;
	messageCount?: number;
	createdAtMs?: number | null;
	/** Why `sourceStatus` is not `available`, as reported by the helper. Metadata only; never a path or body. */
	sourceReason?: string;
	spaceId?: string;
}
export interface NativeSession extends NativeSessionSummary {
	text: string;
}
export interface HistoryPage {
	rows: NativeSessionSummary[];
	total: number;
	usage: NativeUsage;
	revision: number;
}

export interface HistoryFence {
	/** Native index revision captured by the first page. A later page must use the same revision. */
	readonly revision: number;
}

/** Native history requests served by the terminal helper (scan, query, read; cancelled by aborting). */
export interface HistoryClient {
	request<T>(
		operation: 'scan' | 'query' | 'read',
		payload: Record<string, unknown>,
		signal?: AbortSignal,
	): Promise<T>;
	isConnected(): boolean;
	/** Changes whenever the helper process starts or stops; cached results from older revisions are stale. */
	readonly connectionRevision: number;
	subscribeConnection(listener: () => void): () => void;
}

/** Where the history service gets its client (the module's terminal sessions). */
export interface HistoryClientSource {
	historyClient(): HistoryClient | Promise<HistoryClient>;
}
