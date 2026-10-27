import type { HostLease, HostSearchRequest, HostSearchResult, SourceSnapshot } from '../../../api';
import type { TFile, WorkspaceLeaf } from 'obsidian';

export interface SourceContent { source: SourceSnapshot; text: string }
export interface HostSources {
	setLease(lease: HostLease | undefined): void;
	readSnapshot(source: SourceSnapshot, signal: AbortSignal): Promise<SourceContent>;
	searchSnapshots(request: HostSearchRequest, signal: AbortSignal): Promise<HostSearchResult>;
}

/** Local-only identity for an explicitly captured source. This is never reconstructed from a wire path. */
export interface SourceWriteTarget { source: SourceSnapshot; file: TFile; path: string; fullHash: string }
export type SourceWriteOrigin = Pick<SourceSnapshot, 'workspaceId' | 'originClientId' | 'originViewId' | 'hostConnectionId' | 'hostLeaseId' | 'hostLeaseEpoch'>;
export interface HostWriteSources {
	resolveWriteTarget(resourceId: string, revision: string): SourceWriteTarget;
	captureWriteOrigin(leaf: WorkspaceLeaf): SourceWriteOrigin;
}

/** Wire limits count UTF-8 bytes; SourceRange offsets count UTF-16 code units in the original note. */
export function truncateUtf8(text: string, maxBytes: number): string {
	const encoder = new TextEncoder();
	let bytes = 0, end = 0;
	for (const point of text) {
		const count = encoder.encode(point).length;
		if (bytes + count > maxBytes) break;
		bytes += count; end += point.length;
	}
	return text.slice(0, end);
}
