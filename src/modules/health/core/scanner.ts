// Design adapted from https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/checkup/run.ts
// Copyright (c) 2026 叫我包仔 (MIT).
// HUHU changes: instance-scoped, contribution/lease-based bounded read-only scans; structured, redacted reports.
import type { Lease } from '../../../app/contracts/module';
import type { HealthCheck, HealthCheckDescriptor, HealthChunk, HealthIssue, HealthIssueCode, HealthProvider, HealthReport, HealthScanner, HealthScanRequest, HealthSection, HealthSnapshot, HealthStatus } from '../api';

export interface HealthScanPorts {
	readonly knownChecks?: readonly HealthCheckDescriptor[];
	providers(): Promise<readonly HealthProvider[]>;
	acquire(provider: HealthProvider, signal: AbortSignal): Promise<Lease<HealthCheck> | undefined>;
	now(): number;
	id(): string;
	yieldControl(signal: AbortSignal): Promise<void>;
}
export interface HealthScanOptions { concurrency: number; batchSize: number; maxItems: number; maxIssues: number; freshnessMinutes: number }
type Section = { -readonly [K in keyof HealthSection]: HealthSection[K] };
const issueCodes = new Set<HealthIssueCode>(['unparseable', 'missing', 'unsupported-version', 'duplicate-id', 'dangling-reference', 'revision-conflict', 'projection-mismatch', 'check-failed', 'budget-exceeded']);
const count = (value: number) => Number.isSafeInteger(value) && value >= 0;
const validId = (value: string) => /^[a-z][a-z0-9.-]{0,79}$/.test(value);
const severity: HealthStatus[] = ['pass', 'skipped', 'warning', 'locked', 'unavailable', 'incomplete', 'error', 'cancelled'];
const worst = (statuses: readonly HealthStatus[]): HealthStatus => statuses.length ? statuses.reduce((a, b) => severity.indexOf(a) > severity.indexOf(b) ? a : b) : 'skipped';

/** Race only the wait, not provider work. Providers retain cleanup responsibility and must honor AbortSignal. */
async function untilAborted<T>(work: PromiseLike<T>, signal: AbortSignal): Promise<T> {
	if (signal.aborted) void Promise.resolve(work).catch(() => {});
	signal.throwIfAborted();
	let abort!: () => void;
	const stopped = new Promise<never>((_resolve, reject) => { abort = () => reject(new Error('health-cancelled')); signal.addEventListener('abort', abort, { once: true }); });
	try { return await Promise.race([work, stopped]); }
	finally { signal.removeEventListener('abort', abort); }
}

export class HealthScanService implements HealthScanner {
	private current: HealthSnapshot = { running: false };
	private listeners = new Set<() => void>();
	private controller?: AbortController;
	private work?: Promise<HealthReport>;
	private stopped = false;
	private revision = 0;
	private readonly known = new Map<string, HealthCheckDescriptor>();
	constructor(private readonly ports: HealthScanPorts, private readonly options: () => HealthScanOptions) {
		for (const row of ports.knownChecks ?? []) this.known.set(row.id, { ...row });
	}
	get snapshot(): HealthSnapshot {
		const copy = structuredClone(this.current);
		if (copy.report && this.ports.now() - copy.report.finishedAt >= this.options().freshnessMinutes * 60000)
			return { ...copy, report: { ...copy.report, stale: true } };
		return copy;
	}
	async providers(): Promise<readonly HealthProvider[]> {
		if (this.stopped) throw new Error('health-disposed');
		const values = await this.ports.providers();
		const seen = new Set<string>();
		return values.map(row => {
			if (!validId(row.id) || seen.has(row.id) || !['archives', 'belongings', 'periodic', 'safe'].includes(row.scope)) throw new Error('health-invalid-provider');
			seen.add(row.id);
			const known = this.known.get(row.id);
			if (known && (known.owner !== row.service.owner || known.scope !== row.scope)) throw new Error('health-invalid-provider');
			this.known.set(row.id, known ?? { id: row.id, owner: row.service.owner, scope: row.scope, titleKey: row.id });
			return { id: row.id, scope: row.scope, service: row.service };
		});
	}
	scan(request: HealthScanRequest = {}): Promise<HealthReport> {
		if (this.stopped) return Promise.reject(new Error('health-disposed'));
		if (this.work) return Promise.reject(new Error('health-busy'));
		const controller = new AbortController();
		this.controller = controller;
		const abort = () => controller.abort();
		request.signal?.addEventListener('abort', abort, { once: true });
		if (request.signal?.aborted) abort();
		this.current = { ...this.current, running: true, progress: { finishedProviders: 0, totalProviders: 0, sections: [] } };
		// Reserve admission before invoking subscribers (which may call scan again).
		const operation = Promise.resolve().then(() => this.run(request, controller.signal));
		this.work = operation.finally(() => {
			request.signal?.removeEventListener('abort', abort);
			this.controller = undefined; this.work = undefined;
			this.current = { ...this.current, running: false }; this.emit();
		});
		this.emit();
		return this.work;
	}
	private async run(request: HealthScanRequest, signal: AbortSignal): Promise<HealthReport> {
		const options = this.options();
		const id = this.ports.id(), startedAt = this.ports.now(), revision = this.revision;
		let discoveryFailed = false;
		const advertised = signal.aborted ? [] : await untilAborted(this.providers(), signal).catch(() => { discoveryFailed = !signal.aborted; return []; });
		if (discoveryFailed) {
			const report: HealthReport = { id, startedAt, finishedAt: this.ports.now(), status: 'error', complete: false, stale: revision !== this.revision, sections: [{ providerId: 'health.discovery', status: 'error', complete: false, checked: 0, excluded: 0, issues: [{ code: 'check-failed', severity: 'error', count: 1 }] }] };
			this.current = { ...this.current, report };
			return structuredClone(report);
		}
		const ids = [...new Set(request.providerIds ?? [...advertised.map(row => row.id), ...this.known.keys()])];
		if (ids.some(value => !validId(value))) throw new Error('health-invalid-provider');
		const sections: Section[] = ids.map(providerId => ({ providerId, owner: this.known.get(providerId)?.owner, titleKey: this.known.get(providerId)?.titleKey, scope: this.known.get(providerId)?.scope, status: 'incomplete', checked: 0, excluded: 0, issues: [], complete: false }));
		let next = 0, finished = 0;
		const publish = () => {
			this.current = { ...this.current, progress: { totalProviders: sections.length, finishedProviders: finished, sections: structuredClone(sections) } };
			this.emit();
		};
		publish();
		const worker = async () => {
			while (next < sections.length) {
				const section = sections[next++]!;
				const provider = advertised.find(row => row.id === section.providerId);
				if (signal.aborted) section.status = 'cancelled';
				else if (!provider) section.status = 'unavailable';
				else await this.check(provider, section, signal, options, publish);
				finished++;
				this.current = { ...this.current, progress: { totalProviders: sections.length, finishedProviders: finished, sections: structuredClone(sections) } };
				this.emit();
			}
		};
		await Promise.all(Array.from({ length: Math.min(options.concurrency, sections.length) }, worker));
		const complete = !signal.aborted && sections.length > 0 && sections.every(row => row.complete);
		const report: HealthReport = { id, startedAt, finishedAt: this.ports.now(), status: signal.aborted ? 'cancelled' : worst(sections.map(row => row.status)), complete, stale: revision !== this.revision, sections: structuredClone(sections) };
		this.current = { ...this.current, report };
		return structuredClone(report);
	}
	private async check(provider: HealthProvider, section: Section, signal: AbortSignal, options: HealthScanOptions, publish: () => void): Promise<void> {
		let iterator: AsyncIterator<HealthChunk> | undefined;
		let revoked: AbortSignal | undefined;
		const controller = new AbortController();
		const abort = () => controller.abort();
		signal.addEventListener('abort', abort, { once: true });
		if (signal.aborted) abort();
		try {
			const lease = await untilAborted(this.ports.acquire(provider, controller.signal), controller.signal);
			if (!lease) { section.status = 'unavailable'; return; }
			revoked = lease.revoked;
			revoked.addEventListener('abort', abort, { once: true });
			if (revoked.aborted) abort();
			controller.signal.throwIfAborted();
			const permission = await untilAborted(lease.value.permission(controller.signal), controller.signal);
			if (permission !== 'allowed') {
				if (!['locked', 'unavailable', 'skipped'].includes(permission)) throw new Error('health-invalid-permission');
				section.status = permission; return;
			}
			iterator = lease.value.scan({
				signal: controller.signal,
				get batchSize() { return Math.min(options.batchSize, options.maxItems - section.checked); },
				get remainingItems() { return options.maxItems - section.checked; },
			})[Symbol.asyncIterator]();
			let observed: HealthStatus = 'pass', slices = 0;
			while (true) {
				controller.signal.throwIfAborted();
				if (section.checked >= options.maxItems || slices >= options.maxItems) {
					section.status = 'incomplete'; section.issues = [...section.issues.slice(0, options.maxIssues - 1), { code: 'budget-exceeded', severity: 'warning', count: 1 }]; break;
				}
				const chunk = await untilAborted(iterator.next(), controller.signal);
				controller.signal.throwIfAborted();
				if (chunk.done) {
					section.complete = section.total === undefined || section.total === section.checked;
					section.status = section.complete ? observed : 'incomplete';
					break;
				}
				const value = chunk.value;
				if (!count(value.checked) || value.checked > options.batchSize || !count(value.excluded ?? 0) || (value.total !== undefined && (!count(value.total) || value.total < section.checked + value.checked))) throw new Error('health-invalid-count');
				if (++slices > options.maxItems || section.checked + value.checked > options.maxItems || section.issues.length + (value.issues?.length ?? 0) > options.maxIssues) {
					section.status = 'incomplete'; section.issues = [...section.issues.slice(0, options.maxIssues - 1), { code: 'budget-exceeded', severity: 'warning', count: 1 }]; break;
				}
				const issues = (value.issues ?? []).map(issue => this.issue(issue));
				section.checked += value.checked; section.excluded += value.excluded ?? 0;
				if (value.total !== undefined) section.total = value.total;
				section.issues = [...section.issues, ...issues];
				if (value.status && !severity.includes(value.status)) throw new Error('health-invalid-status');
				observed = worst([observed, value.status ?? 'pass', ...issues.map(issue => issue.severity)]);
				section.status = 'incomplete'; publish();
				await untilAborted(this.ports.yieldControl(controller.signal), controller.signal);
				if (observed !== 'pass' && observed !== 'warning' && observed !== 'error') { section.status = observed; break; }
			}
		} catch {
			section.complete = false;
			section.status = signal.aborted ? 'cancelled' : revoked?.aborted ? 'unavailable' : 'error';
			if (section.status === 'error') section.issues = [...section.issues, { code: 'check-failed', severity: 'error', count: 1 }];
		} finally {
			controller.abort();
			signal.removeEventListener('abort', abort); revoked?.removeEventListener('abort', abort);
			// A provider that ignores cancellation may finish late; never let its result mutate this report.
			try {
				if (iterator?.return) await untilAborted(Promise.resolve(iterator.return()), revoked?.aborted ? revoked : signal);
			} catch {
				section.complete = false;
				section.status = signal.aborted ? 'cancelled' : revoked?.aborted ? 'unavailable' : 'error';
				if (section.status === 'error') section.issues = [...section.issues.slice(0, options.maxIssues - 1), { code: 'check-failed', severity: 'error', count: 1 }];
			}
		}
	}
	private issue(value: HealthIssue): HealthIssue {
		if (!issueCodes.has(value.code) || !['warning', 'error'].includes(value.severity) || !count(value.count)) throw new Error('health-invalid-issue');
		return { code: value.code, severity: value.severity, count: value.count, ...(value.reference && /^[a-f0-9]{64}$/.test(value.reference) ? { reference: value.reference } : {}) };
	}
	cancel(): void { this.controller?.abort(); }
	subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
	private emit(): void { for (const listener of this.listeners) { try { listener(); } catch { /* A subscriber cannot interrupt scanning or cleanup. */ } } }
	invalidate(): void {
		this.revision++;
		if (this.current.report) this.current = { ...this.current, report: { ...this.current.report, stale: true } };
		this.emit();
	}
	async dispose(): Promise<void> { this.stopped = true; this.controller?.abort(); try { await this.work; } finally { this.listeners.clear(); } }
}
