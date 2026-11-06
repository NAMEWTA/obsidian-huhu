import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { ReactSurface } from '../../../ui/react/surface';
import { DesignScope } from '../../../ui/react/design-scope';
import { t } from '../../../shared/i18n';
import type { AutomationEditRequest } from '../core/api';
import type { AutomationViewHost } from './panel-contract';
import { AutomationsPage, initialPageState, type AutomationPageState } from './AutomationsPage';

export class AutomationPresentation extends ReactSurface {
	private target: WorkbenchTarget;
	private state: AutomationPageState;
	private request?: AutomationEditRequest;
	private restoreKey = 0;
	private leaveGuard: (() => Promise<boolean>) | null = null;
	private closed = false;
	canClose = () => this.leaveGuard?.() ?? Promise.resolve(true);
	constructor(
		context: NativeSurfaceContext,
		private host: AutomationViewHost,
		target: WorkbenchTarget,
		state: Record<string, unknown>,
		private signal?: AbortSignal,
	) {
		super(context);
		this.target = target;
		this.state = initialPageState(state);
	}
	getViewType() {
		return 'huhu-automations';
	}
	getDisplayText() {
		return t('automation.title');
	}
	getIcon() {
		return 'workflow';
	}
	getTarget() {
		return this.target;
	}
	override getState(): Record<string, unknown> {
		return { ...this.state };
	}
	async restore(state: Record<string, unknown>) {
		if (!(await this.canClose()) || this.closed || this.signal?.aborted) return;
		this.state = initialPageState(state);
		this.restoreKey++;
		this.rerender();
	}
	async navigate(target: WorkbenchTarget, signal?: AbortSignal) {
		if (signal?.aborted) return;
		const next = {
			feature: 'automations' as const,
			section: target.section === 'runs' ? 'runs' : target.section === 'new' ? 'new' : 'tasks',
			resourceId: target.resourceId,
		};
		const different =
			next.section !== this.target.section ||
			next.resourceId !== this.target.resourceId ||
			target.focusId === 'edit';
		if ((different && !(await this.canClose())) || this.closed || this.signal?.aborted || signal?.aborted) return;
		this.target = {
			feature: 'automations',
			section: target.section === 'runs' ? 'runs' : target.section === 'new' ? 'new' : 'tasks',
			resourceId: target.resourceId,
		};
		// A link can open the editor of one automation (`resourceId`) or of a new one.
		if (target.focusId === 'edit')
			this.request = { existing: this.host.service.definitions.find((row) => row.id === target.resourceId) };
		this.rerender();
		this.context.changed?.();
	}
	override async onClose() {
		this.closed = true;
		this.leaveGuard = null;
		await super.onClose();
	}
	protected renderContent() {
		return (
			<DesignScope className="flex h-full min-h-0 flex-col">
				<AutomationsPage
					key={this.restoreKey}
					host={this.host}
					signal={this.signal}
					target={this.target}
					request={this.request}
					initialState={this.state}
					onState={(state) => {
						this.state = state;
						this.context.changed?.();
					}}
					onNavigate={(target) => {
						void this.navigate(target);
					}}
					onLeaveGuard={(guard) => {
						this.leaveGuard = guard;
					}}
					onEditConsumed={() => {
						this.request = undefined;
					}}
					onPageMenu={(event) => this.context.openPageMenu?.(event)}
					onNavigation={() => this.context.togglePanel?.()}
				/>
			</DesignScope>
		);
	}
}
