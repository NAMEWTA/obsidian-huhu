import { createElement } from 'react';
import { App, Modal } from 'obsidian';
import type { AnniversaryConfig } from '../../core/board/types';
import { resolveWidgetLabel, usesDefaultWidgetLabel } from '../../core/board/default-widget-label';
import { mountReact } from '../ui/mount-react';
import { AnniversaryEditor } from './AnniversaryEditor';
export class AnniversarySettingsModal extends Modal {
	private unmount?: () => void;
	constructor(
		app: App,
		private config: AnniversaryConfig,
		private save: (value: AnniversaryConfig) => void | Promise<void>,
	) {
		super(app);
	}
	onOpen(): void {
		this.unmount = mountReact(
			this.contentEl,
			createElement(AnniversaryEditor, {
				app: this.app,
				embedded: true,
				initial: {
					...this.config,
					label: resolveWidgetLabel(this.config, 'anniversary'),
					defaultLabel: usesDefaultWidgetLabel(this.config, 'anniversary'),
				},
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
