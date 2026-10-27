import type { App } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import type { CommentsService } from '../services/comments';
import type { HighlightRow } from '../core/catalog';
import type { OverlayChannel, OverlayRequest } from '../services/overlay';

export interface CommentsEnv {
	app: App;
	service: CommentsService;
	editors: Set<EditorView>;
	alive(): boolean;
	overlay(doc: Document): OverlayChannel;
	open(request: OverlayRequest): boolean;
	openSettings(): void;
	exportHighlights(rows: readonly HighlightRow[]): Promise<string>;
}
