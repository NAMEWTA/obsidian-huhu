import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { ReactSurface } from '../../../ui/react/surface';
import { t } from '../../../shared/i18n';
import { HealthPage } from './HealthPage';
import type { HealthPagePort } from './types';
class HealthSurface extends ReactSurface {
	constructor(context: NativeSurfaceContext, private readonly port: HealthPagePort, private target: WorkbenchTarget) { super(context); }
	getViewType(): string { return 'huhu-health-surface'; }
	getDisplayText(): string { return t('health.title'); }
	getIcon(): string { return 'heart-pulse'; }
	getTarget(): WorkbenchTarget { return this.target; }
	navigate(target: WorkbenchTarget): void { this.target = target; this.rerender(); this.context.changed?.(); }
	protected renderContent() { return <HealthPage port={this.port} reportId={this.target.resourceId} section={this.target.section === 'repair' ? 'repair' : 'scan'} navigate={(section, resourceId) => this.navigate({ feature: 'health', section, resourceId })} />; }
}
export const createHealthPage = (port: HealthPagePort): PageCreate => async (context, target, _state, signal) => {
	signal.throwIfAborted();
	const surface = new HealthSurface(context, port, target);
	return { surface, getTarget: () => surface.getTarget(), getState: () => ({}), navigate: async (next, signal) => { signal.throwIfAborted(); surface.navigate(next); } };
};
