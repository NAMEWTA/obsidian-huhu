import { Modal, type App } from 'obsidian';
import { t } from '../shared/i18n/index';

/** The lightweight native owner loads React content only when the intro opens. */
export class IntroModal extends Modal {
	private generation = 0;
	private opened = false;
	private disposeContent?: () => void;

	constructor(
		app: App,
		private readonly onSeen: () => void,
	) {
		super(app);
	}

	onOpen(): void {
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
		++this.generation;
		this.disposeContent?.();
		this.disposeContent = undefined;
		this.contentEl.empty();
		if (this.opened) {
			this.opened = false;
			this.onSeen();
		}
	}
}
