import type { HealthScanner, HealthReport, HealthScanRequest, HealthSnapshot, HealthProvider } from '../api';
import type { HealthScanService, HealthScanPorts, HealthScanOptions } from '../core/scanner';

/** Discovery/scan initializes the scanner; merely activating the module does not. */
export class LazyHealthScanner implements HealthScanner {
	private service?: HealthScanService;
	private loading?: Promise<HealthScanService>;
	private stopped = false;
	private work?: Promise<HealthReport>;
	private controller?: AbortController;
	private readonly listeners = new Set<() => void>();
	constructor(private readonly ports: HealthScanPorts, private readonly options: () => HealthScanOptions) {}
	get snapshot(): HealthSnapshot { const snapshot = this.service?.snapshot ?? { running: false }; return this.work ? { ...snapshot, running: true } : snapshot; }
	private load(): Promise<HealthScanService> {
		if (this.stopped) return Promise.reject(new Error('health-disposed'));
		return this.loading ??= import('../core/scanner').then(({ HealthScanService }) => {
			if (this.stopped) throw new Error('health-disposed');
			this.service = new HealthScanService(this.ports, this.options);
			this.service.subscribe(() => this.emit());
			return this.service;
		});
	}
	async providers(): Promise<readonly HealthProvider[]> { return (await this.load()).providers(); }
	scan(request: HealthScanRequest = {}): Promise<HealthReport> {
		if (this.stopped) return Promise.reject(new Error('health-disposed'));
		if (this.work) return Promise.reject(new Error('health-busy'));
		const controller = new AbortController(), abort = () => controller.abort();
		this.controller = controller;
		request.signal?.addEventListener('abort', abort, { once: true });
		if (request.signal?.aborted) abort();
		const providerIds = request.providerIds ? [...request.providerIds] : undefined;
		this.work = Promise.resolve().then(() => this.load()).then(service => service.scan({ providerIds, signal: controller.signal })).finally(() => {
			request.signal?.removeEventListener('abort', abort); this.work = undefined; this.controller = undefined; this.emit();
		});
		this.emit();
		return this.work;
	}
	cancel(): void { this.controller?.abort(); this.service?.cancel(); }
	invalidate(): void { this.service?.invalidate(); }
	subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
	private emit(): void { if (!this.stopped) for (const listener of this.listeners) { try { listener(); } catch { /* A consumer cannot interrupt admission, scanning or cleanup. */ } } }
	async dispose(): Promise<void> {
		this.stopped = true; this.cancel(); this.listeners.clear();
		await this.service?.dispose();
		await this.work?.catch(() => {});
	}
}
