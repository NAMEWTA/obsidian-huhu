import { createElement } from 'react';
import { App, Modal } from 'obsidian';
import type { AlbumConfig } from '../../core/board/types';
import { mountReact } from '../ui/mount-react';
import { AlbumEditor } from './AlbumEditor';
export class AlbumSettingsModal extends Modal {
	private unmount?: () => void;
	constructor(
		app: App,
		private config: AlbumConfig,
		private save: (value: AlbumConfig) => void | Promise<void>,
	) {
		super(app);
	}
	onOpen(): void {
		this.unmount = mountReact(
			this.contentEl,
			createElement(AlbumEditor, {
				app: this.app,
				embedded: true,
				initial: this.config,
				onClose: () => this.close(),
				onSave: async (value) => {
					await this.save(value);
					this.close();
				},
			}),
		);
	}
	onClose(): void {
		this.unmount?.();
		this.unmount = undefined;
		this.contentEl.empty();
	}
}
