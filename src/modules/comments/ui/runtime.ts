import { Notice, TFile } from 'obsidian';
import type { ModuleContext } from '../../../app/contracts/module';
import { t } from '../../../shared/i18n';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { CommentsIndex, CommentsPanel } from '../api';
import { CommentStore } from '../core/store';
import { trackActiveMarkdown } from '../platform/active-file';
import { beginCommentStoreActivation } from '../platform/store-handoff';
import { vaultCommentFs } from '../platform/vault-fs';
import { createCommentsService } from '../services/comments';
import type { CommentsSettings } from '../settings';
import { commentsCmExtension } from './editor/extension';
import { registerCommentCommands } from './commands';
import type { CommentsEnv } from './env';
import { CommentsOverlays } from './popover/overlay-host';
import { commentsReadingProcessor, refreshReadingViews } from './reading';
import type { EditorPanelHandle } from '../../../app/contracts/editor-context';
import type { DocumentChangeParticipant } from '../../../shared/storage/document-mutation';
export interface CommentsRuntime { readonly env: CommentsEnv; readonly panel: CommentsPanel; readonly index: CommentsIndex; readonly documentChanges: DocumentChangeParticipant; dispose(): void }
export async function createCommentsRuntime(context: ModuleContext, settings: SettingsHandle<CommentsSettings>): Promise<CommentsRuntime> {
	const { app, lifetime } = context;
	const activation = beginCommentStoreActivation(app);
	await activation.ready();
	const win = app.workspace.containerEl.ownerDocument.defaultView!;
	let alive = true;
	const store = new CommentStore(vaultCommentFs(app), { timers: { set: (callback, ms) => win.setTimeout(callback, ms), clear: handle => win.clearTimeout(handle as number) }, fuzzyThreshold: () => settings.get().fuzzyThreshold, onError: () => { if (alive) new Notice(t('editor.comments.storageFailed')); } });
	const service = createCommentsService(store, () => settings.get());
	const env: CommentsEnv = { app, service, editors: new Set(), alive: () => alive, overlay: doc => overlays.get(doc), open: request => overlays.get(request.ownerDocument).open(request), openSettings: () => { void context.shell.open({ feature: 'settings', section: 'editor' }); }, exportHighlights: async rows => { const { exportHighlightCards } = await import('../services/export'); return exportHighlightCards(app, settings.get().exportFolder, rows); } };
	const overlays = new CommentsOverlays(env);
	const readingCleanups = new Set<() => void>();
	const panels = new Set<EditorPanelHandle>();
	context.editor.addExtension(commentsCmExtension(env));
	context.editor.addPostProcessor(commentsReadingProcessor(env, readingCleanups));
	registerCommentCommands(env, context.commands);
	const active = trackActiveMarkdown(app, ref => lifetime.registerEvent(ref), file => service.setPath(file?.path ?? null));
	service.setPath(active?.path ?? null);
	lifetime.registerEvent(app.vault.on('rename', (file, oldPath) => {
		if (!(file instanceof TFile) || file.extension !== 'md') return;
		void store.renamePath(oldPath, file.path).then(() => service.refresh(), () => undefined);
		if (service.state.getState().path === oldPath) service.setPath(file.path);
	}));
	lifetime.registerEvent(app.vault.on('delete', file => {
		if (!(file instanceof TFile) || file.extension !== 'md') return;
		if (settings.get().deleteWithNote) void store.deletePath(file.path);
		if (service.state.getState().path === file.path) service.setPath(null);
		void service.refresh();
	}));
	lifetime.register(settings.subscribe(() => { store.notify(); refreshReadingViews(env); }));
	lifetime.register(store.subscribe(() => refreshReadingViews(env)));
	void service.refresh();
	const panel: CommentsPanel = { mount(container, documents, initialVisible) {
		let mounted = true, visible = initialVisible;
		let child: EditorPanelHandle | undefined;
		const handle: EditorPanelHandle = {
			setVisible(next) { visible = next; child?.setVisible(next); },
			dispose() { if (!mounted) return; mounted = false; child?.dispose(); panels.delete(handle); },
		};
		void import('./panel/mount').then(({ mountCommentsPanel }) => { if (mounted && alive) child = mountCommentsPanel(container, env, documents, visible); });
		panels.add(handle); return handle;
	} };
	const index: CommentsIndex = { notes: () => service.state.getState().notes, subscribe: listener => service.state.subscribe(listener) };
	const documentChanges: DocumentChangeParticipant = {
		prepare: (change, undo) => store.prepareDocumentChange(change, undo),
		commit: (operationId, text) => store.commitDocumentChange(operationId, text),
		abort: (operationId, text) => store.abortDocumentChange(operationId, text),
	};
	return { env, panel, index, documentChanges, dispose() {
		alive = false; overlays.dispose(); for (const handle of panels) handle.dispose(); for (const cleanup of readingCleanups) cleanup();
		service.dispose(); activation.retire(store); refreshReadingViews(env);
	} };
}
