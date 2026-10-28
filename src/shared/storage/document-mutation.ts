/** Host-neutral document write contract. A snapshot contains both the live draft and the disk baseline. */
export interface DocumentBuffer {
	readonly id: string;
	readonly generation: number;
	readonly text: string;
}

export interface DocumentSnapshot {
	readonly path: string;
	readonly documentKey: string;
	readonly exists: boolean;
	readonly text: string | null;
	readonly diskText: string | null;
	readonly buffers: readonly DocumentBuffer[];
	readonly originLeafId?: string;
}

export interface TextEdit {
	readonly from: number;
	readonly to: number;
	readonly insert: string;
}

export interface DocumentChange {
	readonly operationId: string;
	readonly path: string;
	/** Removal is only used to undo an untouched restored copy; annotations may refuse it. */
	readonly kind?: 'replace' | 'remove';
	readonly before: string;
	readonly after: string;
	readonly edits: readonly TextEdit[];
}

/** Annotation data is owned and validated by its participant; it never contains executable callbacks. */
export interface AnnotationUndo {
	readonly before: unknown;
	readonly expected: unknown;
}

export interface DocumentChangeParticipant {
	prepare(change: DocumentChange, undo?: AnnotationUndo): Promise<unknown>;
	commit(operationId: string, actualText: string): Promise<unknown>;
	abort(operationId: string, actualText?: string): Promise<void>;
}

export interface DocumentMutationPort {
	capture(path: string, originLeafId?: string): Promise<DocumentSnapshot>;
	exclusive<T>(path: string, operation: () => Promise<T>): Promise<T>;
	/** Must recheck live buffers and the disk baseline immediately before the mutation. null trashes a copied note. */
	apply(expected: DocumentSnapshot, text: string | null, operationId: string): Promise<DocumentSnapshot>;
	/** Normalization performed by the native editor, never by the historical object reader. */
	editableText(text: string, expected: DocumentSnapshot): string;
}

export class DocumentMutationError extends Error {
	constructor(
		readonly code:
			| 'invalid-path'
			| 'missing'
			| 'origin-unavailable'
			| 'editor-conflict'
			| 'changed'
			| 'identity-changed'
			| 'write-unverified'
			| 'unsupported',
		readonly path: string,
	) {
		super(`versioning.restore.${code}: ${path}`);
		this.name = 'DocumentMutationError';
	}
}

/** Exact state comparison, including editor generations (detects edit-and-undo during an async preparation). */
export function sameDocumentSnapshot(expected: DocumentSnapshot, current: DocumentSnapshot): boolean {
	return (
		expected.path === current.path &&
		expected.documentKey === current.documentKey &&
		expected.exists === current.exists &&
		expected.text === current.text &&
		expected.diskText === current.diskText &&
		expected.buffers.length === current.buffers.length &&
		expected.buffers.every((buffer) =>
			current.buffers.some(
				(other) =>
					other.id === buffer.id && other.generation === buffer.generation && other.text === buffer.text,
			),
		)
	);
}
