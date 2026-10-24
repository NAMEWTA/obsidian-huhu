import { bindLocalizedOptions } from '../../../../host/obsidian/localized-dom';
import { bindLocalizedControl } from '../../../../host/obsidian/localized-dom';
import { localizedText } from '../../../../host/obsidian/localized-dom';
import { createElement } from 'react';
import { App, Modal, Setting } from 'obsidian';
import { PathPicker } from '../../../../ui/components/huhu/PathPicker';
import { vaultPathItems } from '../../../../shared/vault-path';
import { mountReact } from '../ui/mount-react';
import { DEFAULT_WIDGET_BACKGROUND, type WidgetBackground } from '../../core/board/types/index';
import { t } from '../../../../shared/i18n/index';
import { applyModalTheme } from '../appearance/modal-theme';

/** Extensions a widget background can use. */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

/** Create/edit one widget card background: vault image (text or file picker)
 *  plus opacity / dim / blur sliders. Saving with an empty image yields
 *  undefined (background removed). */
export class WidgetBackgroundModal extends Modal {
	private readonly cfg: WidgetBackground;
	private readonly onSave: (bg: WidgetBackground | undefined) => void;
	private unmount?: () => void;

	constructor(app: App, bg: WidgetBackground | undefined, onSave: (bg: WidgetBackground | undefined) => void) {
		super(app);
		this.cfg = bg ? { ...bg } : DEFAULT_WIDGET_BACKGROUND();
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl, containerEl } = this;
		contentEl.empty();
		contentEl.addClass('dashboard-library-config-modal');
		containerEl.parentElement?.addClass('modal-bg--dashboard');
		applyModalTheme(containerEl);

		const container = contentEl.createDiv({ cls: 'dashboard-modal dashboard-modal--compact' });
		const title = container.createDiv({ cls: 'dashboard-modal-title', ...localizedText('wbg.title') });
		title.setCssProps({ fontSize: '1em' });
		const body = container.createDiv({ cls: 'dashboard-modal-body' });

		const imageSetting = bindLocalizedControl(bindLocalizedControl(new Setting(body)
			.setName(t('wbg.image')), "name", 'wbg.image')
			.setDesc(t('wbg.imageDesc')), "desc", 'wbg.imageDesc');
		// The image is chosen with the shared path field, fuzzy-matched against the vault's image files.
		const imageHost = imageSetting.controlEl.createDiv({ cls: 'dashboard-modal-path-field' });
		const images = vaultPathItems(this.app.vault, 'file').filter((item) => IMAGE_EXT.test(item.path));
		this.unmount = mountReact(
			imageHost,
			createElement(PathPicker, {
				kind: 'file',
				items: images,
				allowCreate: false,
				label: t('wbg.image'),
				placeholder: t('wbg.imagePlaceholder'),
				value: this.cfg.image,
				onChange: (path: string) => {
					this.cfg.image = path;
				},
			}),
		);

		bindLocalizedControl(bindLocalizedControl(new Setting(body)
			.setName(t('wbg.opacity')), "name", 'wbg.opacity')
			.setDesc(t('wbg.opacityDesc')), "desc", 'wbg.opacityDesc')
			.addSlider((slider) =>
				slider
					.setLimits(10, 100, 5)
					.setValue(this.cfg.opacity)
					.onChange((v) => {
						this.cfg.opacity = v;
					}),
			);

		bindLocalizedControl(bindLocalizedControl(new Setting(body)
			.setName(t('wbg.dim')), "name", 'wbg.dim')
			.setDesc(t('wbg.dimDesc')), "desc", 'wbg.dimDesc')
			.addSlider((slider) =>
				slider
					.setLimits(0, 100, 5)
					.setValue(this.cfg.dim)
					.onChange((v) => {
						this.cfg.dim = v;
					}),
			);

		bindLocalizedControl(bindLocalizedControl(new Setting(body)
			.setName(t('wbg.blur')), "name", 'wbg.blur')
			.setDesc(t('wbg.blurDesc')), "desc", 'wbg.blurDesc')
			.addSlider((slider) =>
				slider
					.setLimits(0, 20, 1)
					.setValue(this.cfg.blur)
					.onChange((v) => {
						this.cfg.blur = v;
					}),
			);

		// Foreground scheme: follow-theme default, light/dark presets, or a
		// custom picker color. The picker only drives the value while the
		// dropdown sits on "custom".
		let fgColorInput: HTMLInputElement | null = null;
		const fgMode = (): string => {
			const v = this.cfg.foreground;
			if (!v) return 'theme';
			if (v === 'light' || v === 'dark') return v;
			return 'custom';
		};
		bindLocalizedControl(bindLocalizedControl(new Setting(body)
			.setName(t('wbg.foreground')), "name", 'wbg.foreground')
			.setDesc(t('wbg.foregroundDesc')), "desc", 'wbg.foregroundDesc')
			.addDropdown((dropdown) => {
				bindLocalizedOptions(bindLocalizedOptions(bindLocalizedOptions(bindLocalizedOptions(dropdown
					.addOption('theme', t('wbg.fgTheme')), {['theme']: ['wbg.fgTheme']})
					.addOption('light', t('wbg.fgLight')), {['light']: ['wbg.fgLight']})
					.addOption('dark', t('wbg.fgDark')), {['dark']: ['wbg.fgDark']})
					.addOption('custom', t('wbg.fgCustom')), {['custom']: ['wbg.fgCustom']})
					.setValue(fgMode())
					.onChange((v) => {
						if (v === 'theme') this.cfg.foreground = undefined;
						else if (v === 'light' || v === 'dark') this.cfg.foreground = v;
						else
							this.cfg.foreground = this.cfg.foreground?.startsWith('#')
								? this.cfg.foreground
								: '#ffffff';
						const input = fgColorInput;
						if (input) {
							input.disabled = v !== 'custom';
							input.value = this.cfg.foreground?.startsWith('#') ? this.cfg.foreground : '#ffffff';
						}
					});
			})
			.addColorPicker((picker) => {
				picker
					.setValue(this.cfg.foreground?.startsWith('#') ? this.cfg.foreground : '#ffffff')
					.onChange((v) => {
						this.cfg.foreground = v;
					});
				fgColorInput = (picker as unknown as { inputEl?: HTMLInputElement }).inputEl ?? null;
			});

		const footer = container.createDiv({ cls: 'dashboard-modal-footer' });
		footer
			.createEl('button', {
				...localizedText('wbg.clear'),
				cls: 'dashboard-modal-btn dashboard-modal-btn--cancel',
			})
			.addEventListener('click', () => {
				this.close();
				this.onSave(undefined);
			});
		footer
			.createEl('button', {
				...localizedText('common.save'),
				cls: 'dashboard-modal-btn dashboard-modal-btn--confirm',
			})
			.addEventListener('click', () => {
				this.close();
				// An empty image means "no background" — persist nothing so the
				// widget stays clean instead of carrying dead settings.
				this.onSave(this.cfg.image.trim() ? this.cfg : undefined);
			});
	}

	onClose(): void {
		this.unmount?.();
		this.unmount = undefined;
		this.contentEl.empty();
	}
}
