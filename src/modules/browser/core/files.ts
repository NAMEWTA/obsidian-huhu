export type BrowserExecutionScope = { kind: 'agent'; runId: string } | { kind: 'human'; viewerId: string; epoch: number };
export interface BrowserFileScope { spaceId: string; execution: BrowserExecutionScope }
export interface BrowserFileItem { id: string; name: string; size: number; kind: 'upload' | 'download'; state: 'ready' | 'pending' | 'failed' }
export interface BrowserFile extends BrowserFileItem { sha256: string; scope: BrowserFileScope; createdAt: number }
export interface BrowserFileGrant { id: string; fileId: string; scope: BrowserFileScope; expiresAt: number }
export interface BrowserDownload {
	id: string; pageId: string; scope: BrowserFileScope; name: string; state: 'in-progress' | 'completed' | 'canceled' | 'failed';
	receivedBytes: number; totalBytes: number; fileId?: string; error?: string;
}
export type BrowserFileErrorCode = 'file_scope_mismatch' | 'file_grant_invalid' | 'file_missing' | 'file_changed' | 'file_too_large' | 'file_quota' | 'file_path_invalid' | 'file_exists' | 'file_closed' | 'file_corrupt' | 'key_unavailable' | 'weak_provider' | 'download_unknown';
export class BrowserFileError extends Error { constructor(readonly code: BrowserFileErrorCode) { super(code); this.name = 'BrowserFileError'; } }
export function cloneFileScope(scope: BrowserFileScope): BrowserFileScope { return { spaceId: scope.spaceId, execution: { ...scope.execution } }; }
export function validFileScope(scope: BrowserFileScope): boolean {
	const id = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,180}$/.test(value) && value !== '.' && value !== '..';
	return !!scope && id(scope.spaceId) && !!scope.execution && (scope.execution.kind === 'agent' ? id(scope.execution.runId) : scope.execution.kind === 'human' && id(scope.execution.viewerId) && Number.isSafeInteger(scope.execution.epoch) && scope.execution.epoch >= 0);
}
export function sameFileScope(a: BrowserFileScope, b: BrowserFileScope): boolean {
	return a.spaceId === b.spaceId && (a.execution.kind === 'agent' && b.execution.kind === 'agent' ? a.execution.runId === b.execution.runId : a.execution.kind === 'human' && b.execution.kind === 'human' && a.execution.viewerId === b.execution.viewerId && a.execution.epoch === b.execution.epoch);
}
export function safeBrowserFilename(value: string): string {
	return [...(value.split(/[\\/]/).pop() ?? '')].filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127).join('').replace(/^[. ]+|[. ]+$/g, '').slice(0, 180) || 'download';
}
export interface BrowserFileServicePort {
	readonly ready: Promise<void>;
	grantUpload(source: string, scope: BrowserFileScope): Promise<{ file: BrowserFile; grant: BrowserFileGrant }>;
	consumeUpload(fileId: string, scope: BrowserFileScope): Promise<string>;
	beginDownload(id: string, pageId: string, scope: BrowserFileScope, name: string): void;
	updateDownload(id: string, progress: { state: 'inProgress' | 'completed' | 'canceled'; receivedBytes: number; totalBytes?: number }): Promise<BrowserDownload>;
	listFiles(scope: BrowserFileScope): BrowserFile[]; listDownloads(scope: BrowserFileScope): BrowserDownload[];
	listSpaceFiles(spaceId: string): BrowserFile[]; listSpaceDownloads(spaceId: string): BrowserDownload[];
	exportForUser(spaceId: string, fileId: string, destination: string): Promise<void>;
	removeFile(spaceId: string, fileId: string): Promise<void>;
	removeSpace(spaceId: string): Promise<void>; dispose(): Promise<void>;
}
