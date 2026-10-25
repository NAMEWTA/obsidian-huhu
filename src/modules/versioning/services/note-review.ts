import type { EditorContextAccess, EditorDocumentContext } from '../../../app/contracts/editor-context';
import type { FileHistoryEntry, ResolvedComparison, RevisionRef, VersioningQueries } from '../core/history';

export interface NoteReviewSession {
	readonly id: string;
	readonly source: EditorDocumentContext;
	readonly buffer: Extract<RevisionRef, { kind: 'editor-buffer' }>;
	readonly selected: FileHistoryEntry;
	readonly mode: 'current' | 'change' | 'pair';
	readonly baseline?: FileHistoryEntry;
	readonly phase: 'loading' | 'ready' | 'error';
	readonly comparison?: ResolvedComparison;
	readonly error?: string;
}

interface ReviewDependencies {
	documents: EditorContextAccess;
	queries: VersioningQueries;
	toRepo(path: string): string | null;
	open(id: string, ownerWindow: Window): Promise<void>;
}

/** One ephemeral comparison per source document/window. Only selecting Refresh changes the B snapshot. */
export class NoteReviewService {
	private readonly sessions = new Map<string, NoteReviewSession>();
	private readonly byDocument = new Map<string, string>();
	private readonly requests = new Map<string, AbortController>();
	private readonly opening = new Map<string, Promise<void>>();
	private readonly listeners = new Set<() => void>();
	private disposed = false;
	constructor(private readonly deps: ReviewDependencies) {}
	get(id: string): NoteReviewSession | undefined {
		return this.sessions.get(id);
	}
	forDocument(id: string): NoteReviewSession | undefined {
		const session = this.byDocument.get(id);
		return session ? this.get(session) : undefined;
	}
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	private emit(): void {
		for (const listener of this.listeners) listener();
	}

	async openVersion(
		documentId: string,
		selected: FileHistoryEntry,
		mode: 'current' | 'change' = 'current',
	): Promise<void> {
		if (this.disposed) throw new Error('versioning.source-closed');
		const existing = this.forDocument(documentId);
		const capture = existing
			? { context: existing.source, text: existing.buffer.text }
			: this.deps.documents.capture(documentId);
		const path = this.deps.toRepo(capture.context.path);
		if (path === null) throw new Error('versioning.outside-repository');
		const id = existing?.id ?? crypto.randomUUID();
		const session: NoteReviewSession = {
			id,
			source: capture.context,
			buffer:
				existing?.buffer ??
				Object.freeze({
					kind: 'editor-buffer',
					path,
					text: capture.text,
					generation: capture.context.generation,
				}),
			selected,
			mode,
			phase: 'loading',
		};
		this.sessions.set(id, session);
		this.byDocument.set(documentId, id);
		this.emit();
		const comparing = this.load(session);
		let opening = this.opening.get(id);
		if (!opening) {
			opening = this.deps.open(id, capture.context.ownerWindow).finally(() => {
				this.opening.delete(id);
			});
			this.opening.set(id, opening);
		}
		try {
			await opening;
		} catch (error) {
			this.close(id);
			throw error;
		}
		await comparing;
	}

	async compareWith(id: string, selected: FileHistoryEntry): Promise<void> {
		const session = this.get(id);
		if (!session) return;
		await this.load({
			...session,
			baseline: session.selected,
			selected,
			mode: 'pair',
			phase: 'loading',
			comparison: undefined,
			error: undefined,
		});
	}
	async refreshCurrent(id: string): Promise<void> {
		const session = this.get(id);
		if (!session) return;
		const capture = this.deps.documents.capture(session.source.id);
		await this.load({
			...session,
			source: capture.context,
			buffer: Object.freeze({ ...session.buffer, text: capture.text, generation: capture.context.generation }),
			mode: 'current',
			baseline: undefined,
			phase: 'loading',
			comparison: undefined,
			error: undefined,
		});
	}
	async retry(id: string): Promise<void> {
		const session = this.get(id);
		if (session) await this.load(session);
	}
	isCurrentChanged(id: string): boolean {
		const session = this.get(id);
		if (!session) return true;
		try {
			return this.deps.documents.capture(session.source.id).text !== session.buffer.text;
		} catch {
			return true;
		}
	}

	private async load(session: NoteReviewSession): Promise<void> {
		this.requests.get(session.id)?.abort();
		const controller = new AbortController();
		this.requests.set(session.id, controller);
		this.sessions.set(session.id, { ...session, phase: 'loading', comparison: undefined, error: undefined });
		this.emit();
		try {
			const comparison =
				session.mode === 'change'
					? await this.deps.queries.commitComparison(
							session.selected.commitOid,
							session.selected.pathAtRevision,
							undefined,
							controller.signal,
						)
					: await this.deps.queries.compare(
							{
								intent: session.mode === 'pair' ? 'revisions' : 'history-current',
								left: session.baseline?.ref ?? session.selected.ref,
								right: session.mode === 'pair' ? session.selected.ref : session.buffer,
							},
							controller.signal,
						);
			if (controller.signal.aborted || this.disposed || this.requests.get(session.id) !== controller) return;
			this.sessions.set(session.id, { ...session, phase: 'ready', comparison, error: undefined });
		} catch (error) {
			if (controller.signal.aborted || this.disposed || this.requests.get(session.id) !== controller) return;
			this.sessions.set(session.id, {
				...session,
				phase: 'error',
				comparison: undefined,
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			if (this.requests.get(session.id) === controller) {
				this.requests.delete(session.id);
				this.emit();
			}
		}
	}
	close(id: string): void {
		this.requests.get(id)?.abort();
		this.requests.delete(id);
		const session = this.sessions.get(id);
		if (session && this.byDocument.get(session.source.id) === id) this.byDocument.delete(session.source.id);
		this.sessions.delete(id);
		this.emit();
	}
	dispose(): void {
		this.disposed = true;
		for (const request of this.requests.values()) request.abort();
		this.requests.clear();
		this.sessions.clear();
		this.byDocument.clear();
		this.listeners.clear();
	}
}
