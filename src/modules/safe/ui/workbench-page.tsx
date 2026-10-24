import type { PageCreate } from '../../../app/contracts/workbench-host';
import { t } from '../../../shared/i18n';
import { ReactSurface } from '../../../ui/react/surface';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { SafeError } from '../core/model';
import type { SafePreferences } from '../services/preferences';
import type { SafeService } from '../services/safe-service';
import { SafePage } from './SafePage';

export class SafeSurface extends ReactSurface {
	private removeMigrationListener?: () => void;
	constructor(context: NativeSurfaceContext, private readonly service: SafeService, private readonly preferences: SafePreferences) { super(context); }
	getViewType(): string { return 'huhu-safe-surface'; }
	getDisplayText(): string { return t('workbench.safe'); }
	getIcon(): string { return 'vault'; }
	override onOpen(): Promise<void> {
		// A page moved to another window is rebuilt there; the session never carries over, whatever the lock rules say.
		this.removeMigrationListener = this.contentEl.onWindowMigrated(() => {
			this.service.lock();
			this.rerender();
		});
		this.register(() => this.removeMigrationListener?.());
		return super.onOpen();
	}
	protected renderContent() { return <SafePage service={this.service} preferences={this.preferences} />; }
	override setVisible(visible: boolean): void {
		if (!visible) this.service.leave('switch');
		else this.service.checkDeadline();
		super.setVisible(visible);
	}
	override onClose(): Promise<void> {
		this.service.leave('close');
		this.removeMigrationListener?.();
		this.removeMigrationListener = undefined;
		return super.onClose();
	}
}

export const createSafePage = (service: SafeService, preferences: SafePreferences): PageCreate => async (context, _target, _state, signal) => {
	if (signal.aborted) throw new SafeError('canceled');
	const surface = new SafeSurface(context, service, preferences);
	return {
		surface,
		getTarget: () => ({ feature: 'safe' }),
		getState: () => ({}),
		navigate: async () => { service.checkDeadline(); },
	};
};
