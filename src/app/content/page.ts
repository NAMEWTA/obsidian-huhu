import { Notice } from 'obsidian';
import { createElement as h } from 'react';
import { ReactSurface } from '../../ui/react/surface';
import { type NativeSurfaceContext } from '../../ui/native-surface';
import type { PageCreate } from '../contracts/workbench-host';
import { t } from '../../shared/i18n';
import { isVisibleHuhuPath, HUHU_VISIBLE_ROOT } from '../../shared/storage/vault-layout';
import { ContentOverview } from './ContentPanel';
import { folderOverview, huhuVaultSnapshot } from './content-tree';
import { openContentLocation, openInNativeTab } from './new-note';

/** The folder a target names: itself, else `huhu/` (a file or a path outside the visible root shows the root). */
function overviewFolder(path?: string): string {
	return path && isVisibleHuhuPath(path) && !/\.[^/.]+$/.test(path) ? path : HUHU_VISIBLE_ROOT;
}

class ContentSurface extends ReactSurface {
	private folder: string;
	constructor(
		context: NativeSurfaceContext,
		path?: string,
	) {
		super(context);
		this.folder = overviewFolder(path);
	}
	protected renderContent() {
		const { files } = huhuVaultSnapshot(this.app.vault);
		const { rows, total } = folderOverview(files, this.folder);
		return h(
			'div',
			{ className: 'flex h-full min-h-0 flex-col gap-3 overflow-auto p-6' },
			h(ContentOverview, {
				folder: this.folder,
				rows,
				total,
				onOpen: (path: string) => {
					void openInNativeTab(this.app, path, undefined, this.contentEl.ownerDocument.defaultView ?? undefined).catch((error: unknown) => new Notice(String(error)));
				},
			}),
		);
	}
	getViewType(): string {
		return 'huhu-content';
	}
	getDisplayText(): string {
		return this.folder.split('/').at(-1) || t('content.title');
	}
	getIcon(): string {
		return 'files';
	}
	get current(): string {
		return this.folder;
	}
	override async onOpen(): Promise<void> {
		await super.onOpen();
		const refresh = () => this.rerender();
		const { vault } = this.app;
		this.registerEvent(vault.on('create', refresh));
		this.registerEvent(vault.on('modify', refresh));
		this.registerEvent(vault.on('delete', refresh));
		this.registerEvent(vault.on('rename', refresh));
	}
	async show(path: string | undefined, signal: AbortSignal, fragment?: string): Promise<void> {
		const folder = await openContentLocation(this.app, path, signal, fragment, this.contentEl.ownerDocument.defaultView ?? undefined);
		if (signal.aborted) return;
		this.folder = folder;
		this.rerender();
	}
}

export const createContentPage: PageCreate = async (context, target) => {
	const surface = new ContentSurface(context, target.resourceId);
	return {
		surface,
		getTarget: () => ({ feature: 'content', ...(surface.current !== HUHU_VISIBLE_ROOT ? { resourceId: surface.current } : {}) }),
		navigate: (next, signal) => surface.show(next.resourceId, signal, next.focusId),
	};
};
