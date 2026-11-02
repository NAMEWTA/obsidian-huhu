import type { MarkdownView, WorkspaceLeaf } from 'obsidian';

/** A real source editor, scoped to its owning Obsidian window. Never persisted with page state. */
export interface EditorDocumentContext {
	readonly id: string;
	readonly path: string;
	readonly leafId: string;
	readonly ownerWindow: Window;
	readonly generation: number;
}

export interface EditorBufferCapture {
	readonly context: EditorDocumentContext;
	readonly text: string;
}

/** App-owned context survives focus moving into a sidebar or a read-only review page. */
export interface EditorContextAccess {
	current(ownerWindow: Window): EditorDocumentContext | undefined;
	get(id: string): EditorDocumentContext | undefined;
	capture(id: string): EditorBufferCapture;
	resolveLeaf(leafId: string): WorkspaceLeaf | undefined;
	resolveView(leafId: string): MarkdownView | undefined;
	returnTo(id: string): Promise<void>;
	checkDrafts?(path: string, expectedText: string): void;
	subscribe(listener: () => void): () => void;
}

export interface EditorPanelContribution {
	mount(container: HTMLElement, documents: EditorContextAccess): () => void;
}
