/** Parsed display protocol. No raw VT continuation, native SID, or mutable xterm objects. */
export const SCREEN_ENGINE = 'xterm-6.0.0' as const;
export type ScreenBufferName = 'normal' | 'alternate';
export interface ScreenMark {
	readonly runtimeId: string;
	readonly contentSequence: number;
}
export interface ScreenGrid {
	readonly cols: number;
	readonly rows: number;
}
export interface ScreenCell {
	readonly content: number;
	readonly fg: number;
	readonly bg: number;
	readonly chars: string;
	readonly width: 0 | 1 | 2;
	readonly extended?: Readonly<{
		ext: number;
		underlineStyle: number;
		underlineColor: number;
		underlineVariantOffset: number;
	}>;
	readonly linkKey?: string;
}
export interface ScreenRow {
	readonly key: string;
	readonly isWrapped: boolean;
	readonly cells: readonly ScreenCell[];
}
export interface ScreenBufferHeader {
	readonly name: ScreenBufferName;
	readonly length: number;
	readonly baseY: number;
	readonly cursorX: number;
	readonly cursorY: number;
}
export interface ScreenBuffer extends ScreenBufferHeader {
	readonly rows: readonly ScreenRow[];
}
export interface ScreenLink {
	readonly key: string;
	readonly uri: string;
	readonly oscId?: string;
}
export type ScreenColor = Readonly<
	{ type: 1; index: number; color: readonly [number, number, number] } | { type: 2; index?: number }
>;
export interface ScreenState {
	readonly applicationCursorKeys: boolean;
	readonly applicationKeypad: boolean;
	readonly bracketedPaste: boolean;
	readonly sendFocus: boolean;
	readonly mouseProtocol: string;
	readonly mouseEncoding: 'DEFAULT' | 'SGR' | 'SGR_PIXELS';
	readonly cursorHidden: boolean;
	readonly cursorInitialized: boolean;
	readonly cursorStyle?: 'block' | 'bar' | 'underline';
	readonly cursorBlink?: boolean;
	readonly synchronizedOutput: boolean;
	readonly lastSyncCommandId: number;
	readonly colors: readonly ScreenColor[];
}
export type ScreenEffect = Readonly<
	{ id: number } & (
		| { kind: 'sync-output'; enabled: boolean }
		| { kind: 'send-focus' }
		| { kind: 'bell' }
		| { kind: 'a11y-char'; text: string }
		| { kind: 'a11y-tab'; count: number }
		| { kind: 'color'; changes: readonly ScreenColor[] }
	)
>;
export interface ScreenSnapshot {
	readonly version: 1;
	readonly engine: typeof SCREEN_ENGINE;
	readonly at: ScreenMark;
	readonly geometry: ScreenGrid;
	readonly active: ScreenBufferName;
	readonly buffers: readonly ScreenBuffer[];
	readonly state: ScreenState;
	readonly links: readonly ScreenLink[];
	readonly output: 'complete' | 'pending' | 'truncated' | 'unknown';
	readonly nativeGeometry?: Readonly<{
		op: number;
		state: 'requested' | 'queued' | 'applied' | 'superseded' | 'none' | 'unknown';
		reason?: string;
	}>;
}
export type ScreenSnapshotHeader = Omit<ScreenSnapshot, 'buffers' | 'links'> & {
	readonly buffers: readonly ScreenBufferHeader[];
};
export type ScreenOperation = Readonly<
	| { kind: 'trim-start'; buffer: ScreenBufferName; count: number }
	| { kind: 'delete-rows'; buffer: ScreenBufferName; index: number; count: number }
	| { kind: 'insert-rows'; buffer: ScreenBufferName; index: number; keys: readonly string[] }
	| { kind: 'truncate-end'; buffer: ScreenBufferName; length: number }
	| { kind: 'row'; buffer: ScreenBufferName; index: number; key: string; isWrapped: boolean }
	| { kind: 'cells'; buffer: ScreenBufferName; row: number; start: number; cells: readonly ScreenCell[] }
	| {
			kind: 'replace-buffer';
			buffer: ScreenBufferName;
			reason: 'resize' | 'reset' | 'clear' | 'buffer-replaced';
			keys: readonly string[];
	  }
>;
export interface ScreenPatch {
	readonly kind: 'patch';
	readonly from: ScreenMark;
	readonly to: ScreenMark;
	readonly geometry: ScreenGrid;
	readonly active: ScreenBufferName;
	readonly buffers: readonly ScreenBufferHeader[];
	readonly state: ScreenState;
	readonly links: readonly ScreenLink[];
	readonly operations: readonly ScreenOperation[];
	readonly effects: readonly ScreenEffect[];
	readonly output: ScreenSnapshot['output'];
	readonly nativeGeometry?: ScreenSnapshot['nativeGeometry'];
}
export type ScreenFrame =
	| Readonly<{ kind: 'snapshot-begin'; snapshotId: string; header: ScreenSnapshotHeader }>
	| Readonly<{ kind: 'snapshot-links'; snapshotId: string; links: readonly ScreenLink[] }>
	| Readonly<{
			kind: 'snapshot-row';
			snapshotId: string;
			buffer: ScreenBufferName;
			index: number;
			key: string;
			isWrapped: boolean;
			start: number;
			cells: readonly ScreenCell[];
	  }>
	| Readonly<{ kind: 'snapshot-end'; snapshotId: string; at: ScreenMark }>
	| ScreenPatch
	| Readonly<{
			kind: 'patch-part';
			patchId: string;
			index: number;
			count: number;
			header: Omit<ScreenPatch, 'operations' | 'effects' | 'links'>;
			operations: readonly ScreenOperation[];
			effects: readonly ScreenEffect[];
			links: readonly ScreenLink[];
	  }>
	| Readonly<{
			kind: 'resync-required';
			at: ScreenMark;
			reason: 'gap' | 'pressure' | 'expired' | 'stale-runtime' | 'disposed' | 'resource-limit';
	  }>;
export type ScreenSink = (frame: ScreenFrame) => void;
export interface ScreenStream {
	readonly runtimeId: string;
	applied(mark: ScreenMark): void;
	resync(): void;
	dispose(): void;
}
export interface ScreenViewLease {
	readonly runtimeId: string;
	readonly viewId: string;
	readonly leaseId: string;
}
export type ScreenGeometryResult = Readonly<
	| { status: 'accepted'; at: ScreenMark; geometry: ScreenGrid; native: 'requested' | 'unsupported' | 'unknown' }
	| { status: 'rejected'; reason: 'not-owner' | 'invalid-grid' | 'resource-limit' | 'disposed' }
>;
export interface ScreenReadRequest {
	readonly expectedRuntimeId: string;
	readonly cursor?: string;
	readonly buffer?: ScreenBufferName;
	readonly maxRows?: number;
	readonly maxBytes?: number;
}
export type ScreenReadResult = Readonly<
	| {
			status: 'ok';
			at: ScreenMark;
			buffer: ScreenBufferName;
			range: Readonly<{ startRow: number; startOffset: number; endRow: number; endOffset: number }>;
			text: string;
			truncated: boolean;
			nextCursor?: string;
			output: ScreenSnapshot['output'];
	  }
	| { status: 'resync-required'; reason: 'stale-runtime' | 'expired-cursor' | 'retention-gap' }
	| { status: 'rejected'; reason: 'invalid-limit' | 'resource-limit' | 'disposed' }
>;
/** Logical payload/allocation limits, independently measured from V8 heap/RSS. */
export interface ScreenProfile {
	readonly maxCols: number;
	readonly maxRows: number;
	readonly maxScrollback: number;
	readonly maxModelCells: number;
	readonly maxModelBytes: number;
	readonly maxRuntimeBytes: number;
	readonly maxAgentBytes: number;
	readonly maxCombiningUnits: number;
	readonly maxCellUnits: number;
	readonly maxParserUnits: number;
	readonly maxCommandWork: number;
	readonly maxLinks: number;
	readonly maxLinkUnits: number;
	readonly maxMarkers: number;
	readonly maxPendingRawBytes: number;
	readonly parseBatchBytes: number;
	readonly maxLocalInputBytes: number;
	readonly maxSnapshotBytes: number;
	readonly maxFrameBytes: number;
	readonly maxJournalBytes: number;
	readonly maxJournalFrames: number;
	readonly maxObservers: number;
	readonly maxObserverBytes: number;
	readonly maxReadTokens: number;
	readonly readTtlMs: number;
	readonly maxReadBytes: number;
	readonly maxReadRows: number;
}
export const DEFAULT_SCREEN_PROFILE: Readonly<ScreenProfile> = Object.freeze({
	maxCols: 512,
	maxRows: 256,
	maxScrollback: 10000,
	maxModelCells: 2_000_000,
	maxModelBytes: 64 * 1024 * 1024,
	maxRuntimeBytes: 192 * 1024 * 1024,
	maxAgentBytes: 768 * 1024 * 1024,
	maxCombiningUnits: 2 * 1024 * 1024,
	maxCellUnits: 16384,
	maxParserUnits: 65536,
	maxCommandWork: 4096,
	maxLinks: 4096,
	maxLinkUnits: 32768,
	maxMarkers: 8192,
	maxPendingRawBytes: 2 * 1024 * 1024,
	parseBatchBytes: 4096,
	maxLocalInputBytes: 256 * 1024,
	maxSnapshotBytes: 64 * 1024 * 1024,
	maxFrameBytes: 256 * 1024,
	maxJournalBytes: 4 * 1024 * 1024,
	maxJournalFrames: 256,
	maxObservers: 32,
	maxObserverBytes: 1024 * 1024,
	maxReadTokens: 16,
	readTtlMs: 10000,
	maxReadBytes: 65536,
	maxReadRows: 200,
});
export interface ScreenUsage {
	readonly status: 'ok' | 'pressure' | 'resource-limit';
	readonly reason?: string;
	readonly modelCells: number;
	readonly modelBytes: number;
	readonly combiningUnits: number;
	readonly maxCellUnits: number;
	readonly parserUnits: number;
	readonly links: number;
	readonly linkUnits: number;
	readonly markers: number;
	readonly pendingRawBytes: number;
	readonly projectionBytes: number;
	readonly snapshotBytes: number;
	readonly journalBytes: number;
	readonly observerBytes: number;
	readonly observers: number;
	readonly readTokens: number;
}
export function screenMarkEqual(a: ScreenMark, b: ScreenMark): boolean {
	return a.runtimeId === b.runtimeId && a.contentSequence === b.contentSequence;
}
export function screenGridAllowed(grid: ScreenGrid, scrollback: number, profile: ScreenProfile): boolean {
	return (
		Number.isSafeInteger(grid.cols) &&
		Number.isSafeInteger(grid.rows) &&
		grid.cols >= 2 &&
		grid.rows >= 1 &&
		grid.cols <= profile.maxCols &&
		grid.rows <= profile.maxRows &&
		Number.isSafeInteger(scrollback) &&
		scrollback >= 0 &&
		scrollback <= profile.maxScrollback &&
		grid.cols * (scrollback + 2 * grid.rows) <= profile.maxModelCells
	);
}
