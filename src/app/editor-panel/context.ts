import { MarkdownView, type App, type EventRef, type WorkspaceLeaf } from 'obsidian';
import type { EditorBufferCapture, EditorContextAccess, EditorDocumentContext } from '../contracts/editor-context';

/** One source per window; tool views and null file-open events do not replace it. */
export class EditorContextService implements EditorContextAccess {
	private readonly ids = new WeakMap<WorkspaceLeaf, string>();
	private readonly documentIds = new WeakMap<WorkspaceLeaf, string>();
	private readonly contexts = new Map<string, EditorDocumentContext>();
	private readonly windows = new Map<Window, string>();
	private readonly listeners = new Set<() => void>();
	private readonly events: EventRef[] = [];
	private sequence = 0;
	private disposed = false;

	constructor(
		private readonly app: App,
		private readonly draftGuard?: (path: string, text: string) => void,
	) {
		this.events.push(app.workspace.on('active-leaf-change', (leaf) => this.follow(leaf)));
		this.events.push(
			app.workspace.on('editor-change', (_editor, info) => {
				if (!(info instanceof MarkdownView)) return;
				const id = this.documentIds.get(info.leaf),
					context = id ? this.contexts.get(id) : undefined;
				if (context) {
					this.contexts.set(context.id, { ...context, generation: context.generation + 1 });
					this.emit();
				}
			}),
		);
		this.events.push(app.workspace.on('layout-change', () => this.prune()));
		this.events.push(
			app.workspace.on('file-open', () =>
				this.follow(app.workspace.getActiveViewOfType(MarkdownView)?.leaf ?? null),
			),
		);
		this.follow(app.workspace.getActiveViewOfType(MarkdownView)?.leaf ?? null);
	}

	private follow(leaf: WorkspaceLeaf | null): void {
		if (this.disposed || !leaf || !(leaf.view instanceof MarkdownView) || !leaf.view.file) return;
		const view = leaf.view,
			ownerWindow = view.containerEl.win;
		let leafId = this.ids.get(leaf);
		if (!leafId) {
			leafId = `editor-${++this.sequence}`;
			this.ids.set(leaf, leafId);
		}
		const previousId = this.documentIds.get(leaf),
			previous = previousId ? this.contexts.get(previousId) : undefined;
		const same = previous?.path === view.file!.path && previous.ownerWindow === ownerWindow;
		const id = same ? previous.id : `${leafId}:document-${++this.sequence}`;
		if (!same && previous) this.contexts.delete(previous.id);
		for (const [win, current] of this.windows)
			if (win !== ownerWindow && current === previousId) this.windows.delete(win);
		this.documentIds.set(leaf, id);
		const context: EditorDocumentContext = {
			id,
			leafId,
			path: view.file!.path,
			ownerWindow,
			generation: previous?.generation ?? 0,
		};
		this.contexts.set(id, context);
		this.windows.set(ownerWindow, id);
		this.emit();
	}

	private prune(): void {
		const live = new Set(this.app.workspace.getLeavesOfType('markdown').map((leaf) => this.ids.get(leaf)));
		let changed = false;
		for (const [id, context] of this.contexts)
			if (!live.has(context.leafId) || !this.get(id)) {
				this.contexts.delete(id);
				changed = true;
			}
		for (const [win, id] of this.windows)
			if (win.closed || !this.contexts.has(id)) {
				this.windows.delete(win);
				changed = true;
			}
		if (changed) this.emit();
	}

	current(ownerWindow: Window): EditorDocumentContext | undefined {
		const id = this.windows.get(ownerWindow);
		const context = id ? this.get(id) : undefined;
		return context?.ownerWindow === ownerWindow ? context : undefined;
	}
	get(id: string): EditorDocumentContext | undefined {
		const context = this.contexts.get(id),
			view = context && this.resolveView(context.leafId);
		return context && view?.file?.path === context.path && view.containerEl.win === context.ownerWindow
			? context
			: undefined;
	}
	resolveLeaf(leafId: string): WorkspaceLeaf | undefined {
		return this.app.workspace.getLeavesOfType('markdown').find((leaf) => this.ids.get(leaf) === leafId);
	}
	resolveView(leafId: string): MarkdownView | undefined {
		const view = this.resolveLeaf(leafId)?.view;
		return view instanceof MarkdownView ? view : undefined;
	}
	capture(id: string): EditorBufferCapture {
		const context = this.get(id),
			view = context && this.resolveView(context.leafId);
		if (!context || !view) throw new Error('versioning.source-closed');
		return { context, text: view.editor.getValue() };
	}
	async returnTo(id: string): Promise<void> {
		const context = this.get(id),
			leaf = context && this.resolveLeaf(context.leafId);
		if (!leaf) throw new Error('versioning.source-closed');
		await this.app.workspace.revealLeaf(leaf);
		if (!this.get(id) || this.resolveLeaf(context.leafId) !== leaf) throw new Error('versioning.source-closed');
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
	}
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	checkDrafts(path: string, text: string): void {
		this.draftGuard?.(path, text);
	}
	private emit(): void {
		for (const listener of this.listeners) listener();
	}
	dispose(): void {
		this.disposed = true;
		for (const ref of this.events) this.app.workspace.offref(ref);
		this.events.length = 0;
		this.contexts.clear();
		this.windows.clear();
		this.listeners.clear();
	}
}
