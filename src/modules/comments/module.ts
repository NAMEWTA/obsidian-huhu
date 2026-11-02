import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { COMMENTS_DOCUMENT_CHANGES, COMMENTS_INDEX, COMMENTS_PANEL, type CommentsIndex, type CommentsPanel } from './api';
import type { DocumentChangeParticipant } from '../../shared/storage/document-mutation';
import { commentsSettings } from './settings';
type CommentsRuntime = Awaited<ReturnType<typeof import('./ui/runtime')['createCommentsRuntime']>>;
import { registerMessages } from '../../shared/i18n/index';
import { messages } from './i18n';

registerMessages(messages);

/**
 * Comments module: sidecar comments on Markdown notes (highlights, gutter, per-window React overlays and the
 * persistent side panel). Each activation creates a runtime; turning the module off removes every editor
 * feature it added and seals the store.
 */
export default function createCommentsModule(context: ModuleContext): ModuleInstance {
	const settings = context.settings.bind('comments', commentsSettings);
	let runtime: CommentsRuntime | undefined;
	const panel: CommentsPanel = { mount: (container, documents) => runtime?.panel.mount(container, documents) ?? (() => undefined) };
	const documentChanges: DocumentChangeParticipant = {
		prepare: (change, undo) => runtime ? runtime.documentChanges.prepare(change, undo) : Promise.reject(new Error('Comment module is inactive')),
		commit: (operationId, text) => runtime ? runtime.documentChanges.commit(operationId, text) : Promise.reject(new Error('Comment module is inactive')),
		abort: (operationId, text) => runtime?.documentChanges.abort(operationId, text) ?? Promise.resolve(),
	};
	const index: CommentsIndex = {
		notes: () => runtime?.index.notes() ?? [],
		subscribe: (listener) => runtime?.index.subscribe(listener) ?? (() => undefined),
	};
	return {
		services: [[COMMENTS_PANEL, panel], [COMMENTS_INDEX, index], [COMMENTS_DOCUMENT_CHANGES, documentChanges]],
		settingsPage: async () => (await import('./ui/settings-page')).commentsSettingsPage(settings),
		async activate(signal) {
			const { createCommentsRuntime } = await import('./ui/runtime');
			runtime = await createCommentsRuntime(context, settings);
			context.app.workspace.onLayoutReady(() => {
				if (signal.aborted || !runtime || settings.get().panelAutoPlaced) return;
				void context.app.workspace.ensureSideLeaf('huhu-comments-view', settings.get().panelSide, { active: false, reveal: false }).then(() => {
					if (!signal.aborted) return settings.update(draft => { draft.panelAutoPlaced = true; });
					return undefined;
				});
			});
		},
		dispose() {
			runtime?.dispose();
			runtime = undefined;
		},
	};
}
