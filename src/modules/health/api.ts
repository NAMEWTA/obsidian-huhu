import { contributionPoint, serviceKey, type ServiceKey, type ModuleId } from '../../app/contracts/module';
import { domainEventKey } from '../../shared/events/domain-events';

export type HealthStatus = 'pass' | 'warning' | 'error' | 'skipped' | 'unavailable' | 'locked' | 'cancelled' | 'incomplete';
export type HealthScope = 'archives' | 'belongings' | 'periodic' | 'safe';
export type HealthIssueCode = 'unparseable' | 'missing' | 'unsupported-version' | 'duplicate-id' | 'dangling-reference' | 'revision-conflict' | 'projection-mismatch' | 'check-failed' | 'budget-exceeded';

/** Reports contain diagnostic codes and counts, never source text, account names, paths or thrown errors.
 * reference is a 64-character lowercase hex opaque token; only the owner resolves it to an entity/repair plan.
 * It must not encode source content or be an unsalted hash of a secret.
 */
export interface HealthIssue {
	readonly code: HealthIssueCode;
	readonly severity: 'warning' | 'error';
	readonly count: number;
	readonly reference?: string;
}
export interface HealthChunk {
	/** Counts are deltas for this slice; total, when known, is the expected overall checked count. */
	readonly checked: number;
	readonly excluded?: number;
	readonly total?: number;
	readonly issues?: readonly HealthIssue[];
	readonly status?: HealthStatus;
}
export interface HealthScanContext {
	readonly signal: AbortSignal;
	/** Live limits: read before each slice, never cache/destructure them for the whole scan. */
	readonly batchSize: number;
	readonly remainingItems: number;
}
export interface HealthCheck {
	/** No initialization writes, decryption, migrations, repair or network side effects. Locked is not permission to unlock. */
	permission(signal: AbortSignal): Promise<'allowed' | 'locked' | 'unavailable' | 'skipped'>;
	/** Honor signal and re-read context.batchSize before each slice; it is capped by remainingItems.
	 * Do not read ahead across yields. Once the budget is exhausted the iterator is closed without another next().
	 */
	scan(context: HealthScanContext): AsyncIterable<HealthChunk>;
}
/** Lightweight expected scope, retained independently of an owner's executable contribution. */
export interface HealthCheckDescriptor {
	readonly id: string;
	readonly owner: ModuleId;
	readonly scope: HealthScope;
	readonly titleKey: string;
}
export interface HealthProvider {
	/** Stable check ID, not user input. One contribution bundle can advertise several checks. */
	readonly id: string;
	readonly scope: HealthScope;
	readonly service: ServiceKey<HealthCheck>;
}
export interface HealthSection {
	readonly providerId: string;
	readonly owner?: ModuleId;
	readonly titleKey?: string;
	readonly scope?: HealthScope;
	readonly status: HealthStatus;
	readonly complete: boolean;
	readonly checked: number;
	readonly excluded: number;
	readonly total?: number;
	readonly issues: readonly HealthIssue[];
}
export interface HealthReport {
	readonly id: string;
	readonly startedAt: number;
	readonly finishedAt: number;
	readonly status: HealthStatus;
	readonly complete: boolean;
	readonly stale: boolean;
	readonly sections: readonly HealthSection[];
}
export interface HealthProgress {
	readonly finishedProviders: number;
	readonly totalProviders: number;
	readonly sections: readonly HealthSection[];
}
export interface HealthSnapshot {
	readonly running: boolean;
	readonly progress?: HealthProgress;
	readonly report?: HealthReport;
}
export interface HealthScanRequest {
	/** Omit to scan known checks plus active contributions, retaining previously seen descriptors.
	 * Missing, idle or disabled owners produce unavailable, never pass. Discovery never activates owners.
	 */
	readonly providerIds?: readonly string[];
	readonly signal?: AbortSignal;
}
export interface HealthScanner {
	readonly snapshot: HealthSnapshot;
	providers(): Promise<readonly HealthProvider[]>;
	/** User initiated only; concurrent scans reject. Reports remain in memory for this module activation. */
	scan(request?: HealthScanRequest): Promise<HealthReport>;
	cancel(): void;
	subscribe(listener: () => void): () => void;
}
export const HEALTH_SCANNER = serviceKey<HealthScanner>('health', 'scanner');
export const HEALTH_PROVIDERS = contributionPoint<readonly HealthProvider[]>('health', 'providers');
/** Owners emit this after a private repository commit; payload contains no source content. */
export const HEALTH_INVALIDATED = domainEventKey<{ readonly providerIds?: readonly string[] }>('health.invalidated');

/** Finite owner commands only. No arbitrary paths, edits, deletion or secret repair. */
export type HealthRepairKind = 'rebuild-index' | 'belonging-projection';
export interface HealthRepairSelection {
	readonly providerId: string;
	readonly kind: HealthRepairKind;
	readonly reference?: string;
}
export interface HealthRepairProposal {
	readonly id: string;
	readonly kind: HealthRepairKind;
	readonly expectedHash: string;
	readonly affected: number;
}
export interface HealthRepairReceipt {
	readonly operationId: string;
	readonly kind: HealthRepairKind;
	readonly status: 'verified' | 'failed' | 'conflict' | 'cancelled' | 'unavailable' | 'rolled-back';
	/** unknown means recovery is required before treating this item as uncommitted. */
	readonly committed: boolean | 'unknown';
	readonly rechecked: boolean;
	/** Durable owner transaction, usable after reload; never a source path. */
	readonly recoveryId?: string;
}
export interface HealthRepairOwner {
	preview(selection: HealthRepairSelection, signal?: AbortSignal): Promise<HealthRepairProposal>;
	commit(input: { proposalId: string; expectedHash: string; operationId: string }, signal?: AbortSignal): Promise<HealthRepairReceipt>;
	recover(input: { recoveryId: string; action: 'resume' | 'rollback' }, signal?: AbortSignal): Promise<HealthRepairReceipt>;
}
export interface HealthRepairProvider {
	readonly providerId: string;
	readonly service: ServiceKey<HealthRepairOwner>;
}
export interface HealthRepairPlan {
	readonly id: string;
	readonly reportId: string;
	readonly expiresAt: number;
	readonly items: readonly (HealthRepairProposal & { readonly providerId: string })[];
}
export interface HealthRepairResult {
	readonly planId: string;
	readonly reportId: string;
	readonly status: 'verified' | 'partial' | 'failed' | 'cancelled';
	readonly items: readonly HealthRepairReceipt[];
}
export interface HealthRepairs {
	/** Redacted results retained while this owner is active, including after leaving the page. */
	readonly results: readonly HealthRepairResult[];
	/** Plans are read-only and expire after five minutes. References must belong to this report. */
	plan(reportId: string, selections: readonly HealthRepairSelection[], signal?: AbortSignal): Promise<HealthRepairPlan>;
	/** Call when showing the impact preview. Confirmation is explicit and single-use. */
	preview(planId: string): HealthRepairPlan & { readonly confirmation: string };
	confirm(input: { planId: string; confirmation: string }, signal?: AbortSignal): Promise<HealthRepairResult>;
	recover(input: { providerId: string; recoveryId: string; action: 'resume' | 'rollback' }, signal?: AbortSignal): Promise<HealthRepairReceipt>;
}
export const HEALTH_REPAIRS = serviceKey<HealthRepairs>('health', 'repairs');
export const HEALTH_REPAIR_OWNERS = contributionPoint<readonly HealthRepairProvider[]>('health', 'repair-owners');
