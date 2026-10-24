import { Notice } from 'obsidian';
import { t } from '../../shared/i18n';
import { ReactSurface } from '../../ui/react/surface';
import type { NativeSurfaceContext } from '../../ui/native-surface';
import type { WorkbenchContribution } from '../contracts/workbench-host';
import type DashboardPlugin from '../main';
import { settingsCategories } from './settings-categories';
import { SettingsPage } from '../settings/react/SettingsPage';
class SettingsSurface extends ReactSurface {
	private category = 'general';
 resourceId?: string;
	private focusId?: string;
	private focusToken = 0;
	constructor(
		context: NativeSurfaceContext,
		private readonly plugin: DashboardPlugin,
	) {
		super(context);
	}
	getViewType() {
		return 'huhu-settings';
	}
	getDisplayText() {
		return t('workbench.settings');
	}
	getIcon() {
		return 'settings';
	}
	override onOpen(): Promise<void> {
		this.register(
			this.plugin.onModuleChanged(() => {
				if (!settingsCategories(this.plugin).some((c) => c.id === this.category)) {
					this.show('general');
					this.context.changed?.();
				} else this.rerender();
			}),
		);
		return super.onOpen();
	}
	show(category?: string, resourceId?: string, focusId?: string) {
  this.resourceId = resourceId;
		this.focusId = focusId;
		this.focusToken++;
		this.category = settingsCategories(this.plugin).some((c) => c.id === category) ? category! : 'general';
		this.rerender();
	}
	get current() {
		return this.category;
	}
	protected renderContent() {
		return (
			<SettingsPage
				plugin={this.plugin}
				category={this.category}
    resourceId={this.resourceId}
				focusId={this.focusId}
				focusToken={this.focusToken}
				navigate={(target) => {
					if (target.feature !== 'settings') {
						void this.plugin.openWorkbench(target, this.contentEl.ownerDocument.defaultView ?? undefined)
							.catch((error: unknown) => new Notice(String(error)));
						return;
					}
					this.show(target.section, target.resourceId, target.focusId);
					this.context.changed?.();
				}}
			/>
		);
	}
}
export const createSettingsPage =
	(plugin: DashboardPlugin): WorkbenchContribution['create'] =>
	async (context, target) => {
		const surface = new SettingsSurface(context, plugin);
		surface.show(target.section, target.resourceId, target.focusId);
		return {
			surface,
			getTarget: () => ({ feature: 'settings', section: surface.current, resourceId: surface.resourceId }),
			navigate: async (next) => surface.show(next.section, next.resourceId, next.focusId),
		};
	};
