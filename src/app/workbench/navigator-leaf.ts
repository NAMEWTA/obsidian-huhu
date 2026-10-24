// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { ItemView, type App, type WorkspaceLeaf } from 'obsidian';
import type { ServiceAccess } from '../contracts/module';
import { NAVIGATOR_PANEL } from '../../modules/navigator/api';
import { t } from '../../shared/i18n';
import { onLeafLanguageChanged } from '../../host/obsidian/workspace-title';

export const NAVIGATOR_VIEW_TYPE = 'huhu-navigator-view';

/** Remove every navigator leaf the layout restored; used while the module is off so no empty "turned off" panel lingers. */
export function detachNavigatorLeaves(app: App): void {
	app.workspace.detachLeavesOfType(NAVIGATOR_VIEW_TYPE);
}

/**
 * The notes navigator side panel. Registered at plugin load so saved leaves restore. The module switch decides whether
 * the leaf exists (the module places it when switched on and removes it when switched off); while the module is still
 * starting, or failed, the leaf shows how to turn it on, and it switches to the module's panel as soon as it is ready.
 */
export class NavigatorLeaf extends ItemView {
	private unmount: (() => void) | null = null;
	private generation = 0;

	constructor(leaf: WorkspaceLeaf, private readonly host: { services: ServiceAccess; openWorkbenchSettings(category?: string): Promise<void> }) {
		super(leaf);
		this.navigation = false;
	}
	getViewType(): string {
		return NAVIGATOR_VIEW_TYPE;
	}
	getDisplayText(): string {
		return t('modules.navigator');
	}
	getIcon(): string {
		return 'notebook-tabs';
	}
	onOpen(): Promise<void> {
		this.register(this.host.services.watch(NAVIGATOR_PANEL, () => this.draw()));
		this.register(onLeafLanguageChanged(this.app, this.leaf, () => {
			if (!this.host.services.peek(NAVIGATOR_PANEL)) this.draw();
		}));
		this.draw();
		return Promise.resolve();
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
		const panel = this.host.services.peek(NAVIGATOR_PANEL);
		if (panel) {
			this.unmount = panel.mount(this.contentEl);
			return;
		}
		const generation = this.generation;
		void import('./NavigatorEmptyState').then(({ mountNavigatorEmptyState }) => {
			if (generation !== this.generation) return;
			this.unmount = mountNavigatorEmptyState(this.contentEl, () => { void this.host.openWorkbenchSettings('general'); });
		}).catch((error: unknown) => console.error('[HUHU] Navigator empty state failed', error));
	}
}
