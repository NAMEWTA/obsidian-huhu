import { createElement } from 'react';
import { App, Modal } from 'obsidian';
import type { CountdownConfig } from '../../core/board/types';
import { resolveWidgetLabel, usesDefaultWidgetLabel } from '../../core/board/default-widget-label';
import { mountReact } from '../ui/mount-react';
import { CountdownEditor } from './CountdownWidget';

/** Native host owns focus and dismissal; every field is a shared React control. */
export class CountdownSettingsModal extends Modal {
	private unmount?: () => void;
	constructor(
		app: App,
		private config: CountdownConfig,
		private save: (value: CountdownConfig) => void | Promise<void>,
	) {
		super(app);
	}
	onOpen(): void {
		this.unmount = mountReact(
			this.contentEl,
			createElement(CountdownEditor, {
				app: this.app,
				embedded: true,
				initial: {
					...this.config,
					label: resolveWidgetLabel(this.config, 'countdown'),
					defaultLabel: usesDefaultWidgetLabel(this.config, 'countdown'),
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
