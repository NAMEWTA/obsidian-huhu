// The stable legacy "CommentThread" name is preserved for module consumers.
// A thread now also represents a color highlight with no messages or note.
export type CommentStatus = 'open' | 'resolved' | 'orphaned';
export type HighlightColorId = 'yellow' | 'pink' | 'blue' | 'green' | 'legacy' | `custom-${string}`;
export interface TextAnchorV2 {
	kind: 'range' | 'line';
	text: string;
	textHash: string;
	/** Document fingerprint validating cached UTF-16 offsets; absent on legacy anchors. */
	documentHash?: string;
	before: string;
	after: string;
	lineHint: number;
	start: number;
	end: number;
}
export interface CommentMessage {
	id: string;
	author: string;
	text: string;
	createdAt: string;
	editedAt?: string;
}
export interface CommentThread {
	id: string;
	kind: 'range' | 'line';
	/** Legacy discussion state; detached anchors are never silently remapped. */
	status: CommentStatus;
	anchor: TextAnchorV2;
	/** Empty for a pure highlight; existing v2 message IDs and authors stay unchanged. */
	messages: CommentMessage[];
	/** Range highlights have an independent stable color and optional hex snapshot. */
	color?: HighlightColorId;
	colorHex?: string;
	/** Editable annotation independent of the original discussion messages. */
	note?: string;
	tags?: string[];
	pinnedAt?: string;
	archivedAt?: string;
	createdAt: string;
	updatedAt: string;
}
export interface CommentFileDoc { version: 3; path: string; threads: CommentThread[] }
export interface CommentIndexEntry { hash: string; open: number; total: number; updatedAt: string }
export interface CommentIndex { version: 3; files: Record<string, CommentIndexEntry> }
export interface NewCommentInput { anchor: TextAnchorV2; text: string; author?: string }
export interface NewHighlightInput { anchor: TextAnchorV2; color: HighlightColorId; colorHex?: string }
