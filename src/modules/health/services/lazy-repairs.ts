import type { HealthRepairs, HealthRepairSelection, HealthRepairReceipt, HealthRepairResult, HealthRepairPlan } from '../api';
import type { HealthRepairService, HealthRepairPorts } from '../core/repair';

/** Activation publishes only this facade. Implementation loads on the first repair action. */
export class LazyHealthRepairs implements HealthRepairs {
	private service?: HealthRepairService;
	private loading?: Promise<HealthRepairService>;
	private stopped = false;
	constructor(private readonly ports: HealthRepairPorts) {}
	get results(): readonly HealthRepairResult[] { return this.service?.results ?? []; }
	private load(): Promise<HealthRepairService> {
		if (this.stopped) return Promise.reject(new Error('health-disposed'));
		return this.loading ??= import('../core/repair').then(({ HealthRepairService }) => {
			if (this.stopped) throw new Error('health-disposed');
			return this.service = new HealthRepairService(this.ports);
		});
	}
	async plan(reportId: string, selections: readonly HealthRepairSelection[], signal?: AbortSignal): Promise<HealthRepairPlan> {
		const owned = structuredClone(selections);
		return (await this.load()).plan(reportId, owned, signal);
	}
	preview(planId: string): HealthRepairPlan & { confirmation: string } {
		if (this.stopped || !this.service) throw new Error('health-plan-expired');
		return this.service.preview(planId);
	}
	async confirm(input: { planId: string; confirmation: string }, signal?: AbortSignal): Promise<HealthRepairResult> {
		const owned = { ...input };
		return (await this.load()).confirm(owned, signal);
	}
	async recover(input: { providerId: string; recoveryId: string; action: 'resume' | 'rollback' }, signal?: AbortSignal): Promise<HealthRepairReceipt> {
		const owned = { ...input };
		return (await this.load()).recover(owned, signal);
	}
	dispose(): void { this.stopped = true; this.service?.dispose(); }
}
