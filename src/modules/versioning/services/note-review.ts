import type { EditorContextAccess, EditorDocumentContext } from '../../../app/contracts/editor-context';
import type { FileHistoryEntry, ResolvedComparison, RevisionRef, VersioningQueries } from '../core/history';
import type { DocumentSnapshot } from '../../../shared/storage/document-mutation';

export interface NoteReviewSession {
	readonly id: string;
	readonly source: EditorDocumentContext;
	readonly buffer: Extract<RevisionRef, { kind: 'editor-buffer' }>;
	readonly bufferCapturedAt: number;
	readonly selected: FileHistoryEntry;
	readonly mode: 'current' | 'change' | 'pair';
	readonly baseline?: FileHistoryEntry;
	readonly phase: 'loading' | 'ready' | 'error';
	readonly comparison?: ResolvedComparison;
	readonly error?: string;
	readonly restoreTarget?: DocumentSnapshot;
	readonly targetPhase?: 'loading' | 'ready' | 'unavailable';
}

interface ReviewDependencies {
	documents: EditorContextAccess;
	queries: VersioningQueries;
	toRepo(path: string): string | null;
	open(id: string, ownerWindow: Window): Promise<void>;
	captureTarget?(source: EditorDocumentContext, signal: AbortSignal): Promise<DocumentSnapshot | undefined>;
}

/** One ephemeral comparison per source document/window. Only selecting Refresh changes the B snapshot. */
export class NoteReviewService {
	private readonly sessions = new Map<string, NoteReviewSession>();
	private readonly byDocument = new Map<string, string>();
	private readonly requests = new Map<string, AbortController>();
	private readonly targetRequests = new Map<string, AbortController>();
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
	private targetState(session: NoteReviewSession) {
		const latest = this.get(session.id);
		return latest?.buffer === session.buffer ? { restoreTarget: latest.restoreTarget, targetPhase: latest.targetPhase }
			: { restoreTarget: session.restoreTarget, targetPhase: session.targetPhase };
	}
	private captureTarget(session: NoteReviewSession): void {
		this.targetRequests.get(session.id)?.abort();
		const controller = new AbortController();
		this.targetRequests.set(session.id, controller);
		this.sessions.set(session.id, { ...session, restoreTarget: undefined, targetPhase: this.deps.captureTarget ? 'loading' : 'unavailable' });
		void (async () => {
			let target: DocumentSnapshot | undefined;
			try { target = await this.deps.captureTarget?.(session.source, controller.signal); } catch { /* Whole-version browsing remains available. */ }
			const latest = this.get(session.id);
			if (controller.signal.aborted || this.disposed || this.targetRequests.get(session.id) !== controller || latest?.buffer !== session.buffer) return;
			let source: EditorDocumentContext | undefined;
			try { source = this.deps.documents.get(session.source.id); } catch { /* Unavailable source disables only selective recovery. */ }
			const matches = source?.id === session.source.id && source.path === session.source.path && source.leafId === session.source.leafId
				&& source.generation === session.source.generation && source.ownerWindow === session.source.ownerWindow
				&& target?.text === session.buffer.text && target.exists && target.originLeafId === session.source.leafId;
			this.sessions.set(session.id, { ...latest, restoreTarget: matches ? structuredClone(target) : undefined, targetPhase: matches ? 'ready' : 'unavailable' });
			this.emit();
		})();
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
		const path = selected.ref.kind === 'local-snapshot' ? capture.context.path : this.deps.toRepo(capture.context.path);
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
			bufferCapturedAt: existing?.bufferCapturedAt ?? Date.now(),
			mode,
			phase: 'loading',
			...(existing ? this.targetState(existing) : {}),
		};
		this.sessions.set(id, session);
		this.byDocument.set(documentId, id);
		if (!existing) this.captureTarget(session);
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
		const next: NoteReviewSession = {
			...session,
			source: capture.context,
			buffer: Object.freeze({ ...session.buffer, text: capture.text, generation: capture.context.generation }),
			bufferCapturedAt: Date.now(),
			mode: 'current',
			baseline: undefined,
			phase: 'loading',
			comparison: undefined,
			error: undefined,
		};
		this.sessions.set(id, next);
		this.captureTarget(next);
		await this.load(next);
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
		this.sessions.set(session.id, { ...session, ...this.targetState(session), phase: 'loading', comparison: undefined, error: undefined });
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
			this.sessions.set(session.id, { ...session, ...this.targetState(session), phase: 'ready', comparison, error: undefined });
		} catch (error) {
			if (controller.signal.aborted || this.disposed || this.requests.get(session.id) !== controller) return;
			this.sessions.set(session.id, {
				...session,
				...this.targetState(session),
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
		this.targetRequests.get(id)?.abort(); this.targetRequests.delete(id);
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
		for (const request of this.targetRequests.values()) request.abort();
		this.targetRequests.clear();
		this.sessions.clear();
		this.byDocument.clear();
		this.listeners.clear();
	}
}
