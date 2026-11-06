import { Modal, type App } from 'obsidian';
import { t } from '../shared/i18n/index';

/** The lightweight native owner loads React content only when the intro opens. */
export class IntroModal extends Modal {
	private generation = 0;
	private opened = false;
	private cancelled = false;
	private disposeContent?: () => void;

	constructor(
		app: App,
		private readonly onSeen: () => void,
	) {
		super(app);
	}

	/** Plugin unload closes the native owner without recording a user acknowledgement. */
	cancel(): void {
		if (this.cancelled) return;
		this.cancelled = true;
		this.opened = false;
		++this.generation;
		this.close();
	}

	onOpen(): void {
		if (this.cancelled) return;
		this.disposeContent?.();
		this.disposeContent = undefined;
		this.opened = true;
		this.contentEl.empty();
		this.loadContent(++this.generation);
	}

	private loadContent(generation: number): void {
		void import('./intro-content').then(
			({ mountIntroContent }) => {
				if (!this.opened || this.generation !== generation) return;
				this.contentEl.empty();
				this.disposeContent = mountIntroContent(this.contentEl, () => this.close());
			},
			() => {
				if (!this.opened || this.generation !== generation) return;
				this.contentEl.empty();
				this.contentEl.createEl('p', { text: t('workbench.failed'), attr: { role: 'alert' } });
				const retry = this.contentEl.createEl('button', { text: t('workbench.retry') });
				retry.addEventListener('click', () => {
					retry.disabled = true;
					this.loadContent(generation);
				});
			},
		);
	}

	onClose(): void {
		// The lazy import may still be pending or show retry UI; acknowledge only a committed intro tree.
		const presented = this.opened && !!this.disposeContent && !!this.contentEl.querySelector('.huhu-design');
		++this.generation;
		this.disposeContent?.();
		this.disposeContent = undefined;
		this.contentEl.empty();
		if (this.opened) {
			this.opened = false;
			if (presented) this.onSeen();
		}
	}
}
