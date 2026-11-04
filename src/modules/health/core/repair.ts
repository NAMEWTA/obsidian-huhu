import type { Lease } from '../../../app/contracts/module';
import type { HealthRepairOwner, HealthRepairProvider, HealthRepairSelection, HealthRepairPlan, HealthRepairs, HealthRepairResult, HealthRepairReceipt, HealthReport } from '../api';
export interface HealthRepairPorts {
	providers(): Promise<readonly HealthRepairProvider[]>;
	acquire(provider: HealthRepairProvider, signal: AbortSignal): Promise<Lease<HealthRepairOwner> | undefined>;
	report(): HealthReport | undefined;
	now(): number;
	id(): string;
	notify(result: HealthRepairResult): Promise<void>;
}
type Plan = { public: HealthRepairPlan; confirmation?: string };
/** Serial orchestration only. Owner retains source paths, captured bytes, backup and CAS authority. */
export class HealthRepairService implements HealthRepairs {
	private readonly plans = new Map<string, Plan>();
	private readonly lifetime = new AbortController();
	private busy = false;
	private history: HealthRepairResult[] = [];
	get results(): readonly HealthRepairResult[] { return structuredClone(this.history); }
	constructor(private readonly ports: HealthRepairPorts) {}
	private get(id: string): Plan {
		this.lifetime.signal.throwIfAborted();
		const plan = this.plans.get(id);
		if (!plan || this.ports.now() >= plan.public.expiresAt) { this.plans.delete(id); throw new Error('health-plan-expired'); }
		return plan;
	}
	private async withOwner<T>(providerId: string, signal: AbortSignal | undefined, run: (owner: HealthRepairOwner, signal: AbortSignal) => Promise<T>): Promise<T> {
		const controller = new AbortController(), signals = [this.lifetime.signal, ...(signal ? [signal] : [])];
		const abort = () => controller.abort();
		for (const source of signals) { source.addEventListener('abort', abort, { once: true }); if (source.aborted) abort(); }
		try {
			controller.signal.throwIfAborted();
			const providers = await this.ports.providers(), matches = providers.filter(row => row.providerId === providerId);
			if (matches.length !== 1) throw new Error('health-owner-unavailable');
			const lease = await this.ports.acquire(matches[0]!, controller.signal);
			if (!lease) throw new Error('health-owner-unavailable');
			signals.push(lease.revoked); lease.revoked.addEventListener('abort', abort, { once: true });
			if (lease.revoked.aborted) abort();
			controller.signal.throwIfAborted();
			// Await the owner even on cancellation: never lose an already committed receipt.
			return await run(lease.value, controller.signal);
		} finally { for (const source of signals) source.removeEventListener('abort', abort); }
	}
	async plan(reportId: string, selections: readonly HealthRepairSelection[], signal?: AbortSignal): Promise<HealthRepairPlan> {
		const report = this.ports.report();
		if (this.busy || !report || report.id !== reportId || report.stale || !selections.length || selections.length > 100) throw new Error('health-rescan-required');
		const owned = structuredClone(selections), seen = new Set<string>();
		const items: HealthRepairPlan['items'][number][] = [];
		for (const selection of owned) {
			const section = report.sections.find(row => row.providerId === selection.providerId);
			const identity = `${selection.providerId}:${selection.reference ?? ''}`;
			if (!section || seen.has(identity) ||
				!(selection.kind === 'rebuild-index' && selection.providerId === 'archives.integrity' || selection.kind === 'belonging-projection' && selection.providerId === 'archives.belongings') ||
				(selection.kind === 'belonging-projection' && !selection.reference) ||
				(selection.reference && !section.issues.some(issue => issue.reference === selection.reference))) throw new Error('health-unsupported-repair');
			seen.add(identity);
			const proposal = await this.withOwner(selection.providerId, signal, (owner, live) => owner.preview(selection, live));
			if (proposal.kind !== selection.kind || !/^[a-f0-9]{64}$/.test(proposal.expectedHash) || !Number.isSafeInteger(proposal.affected) || proposal.affected < 0) throw new Error('health-invalid-proposal');
			if (!/^[a-zA-Z0-9_-]{1,128}$/.test(proposal.id)) throw new Error('health-invalid-proposal');
			items.push({ id: proposal.id, kind: proposal.kind, expectedHash: proposal.expectedHash, affected: proposal.affected, providerId: selection.providerId });
		}
		this.lifetime.signal.throwIfAborted();
		if (this.ports.report()?.id !== reportId) throw new Error('health-rescan-required');
		for (const [id, plan] of this.plans) if (plan.public.expiresAt <= this.ports.now()) this.plans.delete(id);
		if (this.plans.size >= 20) throw new Error('health-plan-budget');
		const plan = { id: this.ports.id(), reportId, expiresAt: this.ports.now() + 300000, items };
		this.plans.set(plan.id, { public: plan });
		return structuredClone(plan);
	}
	preview(planId: string): HealthRepairPlan & { confirmation: string } {
		const plan = this.get(planId);
		plan.confirmation ??= this.ports.id();
		return { ...structuredClone(plan.public), confirmation: plan.confirmation };
	}
	async confirm(input: { planId: string; confirmation: string }, signal?: AbortSignal): Promise<HealthRepairResult> {
		const plan = this.get(input.planId);
		if (!plan.confirmation || input.confirmation !== plan.confirmation) throw new Error('health-confirmation-required');
		if (this.busy) throw new Error('health-repair-busy');
		this.plans.delete(input.planId); this.busy = true;
		const items: HealthRepairReceipt[] = [];
		try {
			for (const item of plan.public.items) {
				const operationId = this.ports.id();
				try {
					const receipt = await this.withOwner(item.providerId, signal, (owner, live) => owner.commit({ proposalId: item.id, expectedHash: item.expectedHash, operationId }, live));
					items.push(this.redact(receipt, item.kind, operationId));
				} catch {
					items.push({ operationId, kind: item.kind, committed: false, rechecked: false, status: signal?.aborted || this.lifetime.signal.aborted ? 'cancelled' : 'unavailable' });
				}
			}
			const verified = items.every(item => item.committed === true && item.rechecked && item.status === 'verified');
			const result: HealthRepairResult = { planId: plan.public.id, reportId: plan.public.reportId, items,
				status: verified ? 'verified' : items.some(item => item.committed !== false) ? 'partial' : items.some(item => item.status === 'cancelled') ? 'cancelled' : 'failed' };
			if (!this.lifetime.signal.aborted) this.history = [...this.history.slice(-19), structuredClone(result)];
			// Notification delivery failure must not turn a committed repair into a rejected operation.
			await this.ports.notify(structuredClone(result)).catch(() => {});
			return structuredClone(result);
		} finally { this.busy = false; }
	}
	private redact(receipt: HealthRepairReceipt, kind: HealthRepairReceipt['kind'], operationId: string): HealthRepairReceipt {
		const statuses: HealthRepairReceipt['status'][] = ['verified', 'failed', 'conflict', 'cancelled', 'unavailable', 'rolled-back'];
		return { operationId, kind, status: statuses.includes(receipt.status) ? receipt.status : 'failed', committed: receipt.committed === 'unknown' ? 'unknown' : receipt.committed === true, rechecked: receipt.rechecked === true,
			...(receipt.recoveryId && /^[a-zA-Z0-9_-]{1,128}$/.test(receipt.recoveryId) ? { recoveryId: receipt.recoveryId } : {}) };
	}
	recover(input: { providerId: string; recoveryId: string; action: 'resume' | 'rollback' }, signal?: AbortSignal): Promise<HealthRepairReceipt> {
		if (input.providerId !== 'archives.belongings' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.recoveryId)) return Promise.reject(new Error('health-unsupported-repair'));
		return this.withOwner(input.providerId, signal, async (owner, live) => this.redact(await owner.recover({ recoveryId: input.recoveryId, action: input.action }, live), 'belonging-projection', input.recoveryId));
	}
	dispose(): void { this.lifetime.abort(); this.plans.clear(); this.history = []; }
}
