import { ItemView, type WorkspaceLeaf, type ViewStateResult } from 'obsidian';
import type { ServiceAccess } from '../contracts/module';
import type { EditorContextAccess } from '../contracts/editor-context';
import { t } from '../../shared/i18n';
import { onLeafLanguageChanged } from '../../host/obsidian/workspace-title';

export const COMMENTS_VIEW_TYPE = 'huhu-comments-view';

/**
 * The comments side panel. Registered at plugin load so saved leaves restore; while the comments module is
 * off it shows how to turn it on, and it switches to the module's panel as soon as the module starts.
 */
export class CommentsLeaf extends ItemView {
	private unmount: (() => void) | null = null;
	private generation = 0;
	private tab: 'comments' | 'history' = 'comments';

	constructor(leaf: WorkspaceLeaf, private readonly host: { services: ServiceAccess; documents: EditorContextAccess; openWorkbenchSettings(category?: string): Promise<void> }) {
		super(leaf);
		this.navigation = false;
	}
	getViewType(): string {
		return COMMENTS_VIEW_TYPE;
	}
	getDisplayText(): string {
		return t('editor.viewTitle');
	}
	getIcon(): string {
		return 'message-square-text';
	}
	onOpen(): Promise<void> {
		this.register(onLeafLanguageChanged(this.app, this.leaf, () => {
			this.draw();
		}));
		this.draw();
		return Promise.resolve();
	}
	getState(): Record<string, unknown> { return { tab: this.tab }; }
	setState(state: { tab?: unknown }, result: ViewStateResult): Promise<void> {
		this.tab = state.tab === 'history' ? 'history' : 'comments';
		this.draw();
		return super.setState(state, result);
	}
	onClose(): Promise<void> {
		this.clear();
		return Promise.resolve();
	}
	private clear(): void {
		this.generation++;
		this.unmount?.();
		this.unmount = null;
		this.contentEl.empty();
	}
	private draw(): void {
		this.clear();
		const generation = this.generation;
		void import('../editor-panel/panel-host').then(({ mountEditorPanelHost }) => {
			if (generation !== this.generation) return;
			this.unmount = mountEditorPanelHost({ container: this.contentEl, services: this.host.services, documents: this.host.documents, initialTab: this.tab, select: tab => { this.tab = tab; }, openSettings: () => { void this.host.openWorkbenchSettings('general'); } });
		}).catch((error: unknown) => console.error('[HUHU] Editor panel failed', error));
	}
}
