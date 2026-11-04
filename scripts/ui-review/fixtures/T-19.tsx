/** Production health page with deterministic public scanner/repair ports; no private content or disk writes. */
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { ContainerProviders } from '../../../src/ui/react/providers';
import { setLanguage, t } from '../../../src/shared/i18n';
import { HealthPage } from '../../../src/modules/health/ui/HealthPage';
import type { HealthPagePort } from '../../../src/modules/health/ui/types';
import type { HealthReport, HealthRepairPlan, HealthRepairResult, HealthSnapshot } from '../../../src/modules/health/api';
import { Command } from '../../../src/ui/components/command';
import { Select } from '../../../src/ui/components/select';
import { DropdownMenu } from '../../../src/ui/components/dropdown-menu';
import { Dialog } from '../../../src/ui/components/dialog';

async function boot() {
	const frame = document.querySelector('iframe')!;
	if (!frame.contentDocument?.body || frame.contentDocument.readyState !== 'complete') await new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
	const docs = { main: document, other: frame.contentDocument! };
	for (const doc of Object.values(docs)) {
		const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
		Object.defineProperty(proto, 'createDiv', { configurable: true, value(this: HTMLElement, options?: { cls?: string }) {
			const element = this.ownerDocument.createElement('div');
			if (options?.cls) element.className = options.cls;
			this.append(element); return element;
		} });
	}
	const mounts = Object.fromEntries(Object.entries(docs).map(([name, doc]) => {
		const container = doc.createElement('main'); container.className = 'huhu-ui'; container.dataset.review = 'health'; doc.body.append(container);
		const root = createRoot(container), listeners = new Set<() => void>(), calls = { scans: 0, plans: 0, commits: 0, recoveries: 0 };
		const mode = { scenario: 'complete', revision: 0 };
		const report = (): HealthReport => ({ id: 'report-one', startedAt: 1793799000000, finishedAt: 1793799005000, complete: mode.scenario !== 'incomplete' && mode.scenario !== 'cancelled', stale: ['stale', 'repair-stale'].includes(mode.scenario), status: mode.scenario === 'cancelled' ? 'cancelled' : mode.scenario === 'incomplete' ? 'incomplete' : 'error', sections: [
			{ providerId: `archives.integrity${'-averyverylongidentifier中文定位'.repeat(4)}`, scope: 'archives', complete: true, checked: 128, total: 256, excluded: 2, status: mode.scenario === 'provider-error' ? 'error' : 'warning', issues: [{ code: mode.scenario === 'provider-error' ? 'check-failed' : 'dangling-reference', severity: 'error', count: 1, reference: 'a'.repeat(64) }] },
			{ providerId: 'archives.belongings', scope: 'belongings', complete: true, checked: 3, total: 3, excluded: 0, status: 'error', issues: [{ code: 'projection-mismatch', severity: 'error', count: 1, reference: 'b'.repeat(64) }] },
			{ providerId: 'periodic.references', scope: 'periodic', complete: true, checked: 20, excluded: 1, status: mode.scenario === 'unavailable' ? 'unavailable' : 'pass', issues: [] },
			{ providerId: 'safe.container', scope: 'safe', complete: false, checked: 0, excluded: 1, status: 'locked', issues: [] },
		].filter(row => mode.scenario !== 'unsupported' || row.scope === 'archives') as HealthReport['sections'] });
		const result = (): HealthRepairResult => ({ reportId: 'report-one', planId: 'plan-one', status: mode.scenario === 'repair-complete' ? 'verified' : mode.scenario === 'conflict' ? 'failed' : 'partial', items: [{ operationId: 'operation-one', recoveryId: 'recovery-one', kind: 'belonging-projection', committed: mode.scenario === 'repair-complete' ? true : mode.scenario === 'conflict' ? false : 'unknown', rechecked: mode.scenario === 'repair-complete', status: mode.scenario === 'repair-complete' ? 'verified' : mode.scenario === 'conflict' ? 'conflict' : 'failed' }] });
		const snapshot = (): HealthSnapshot => mode.scenario === 'default' ? { running: false } : { running: mode.scenario === 'running', report: report(), progress: mode.scenario === 'running' ? { finishedProviders: 2, totalProviders: 4, sections: report().sections.slice(0, 2) } : undefined };
		const emit = () => { for (const listener of listeners) listener(); };
		const plan: HealthRepairPlan = { id: 'plan-one', reportId: 'report-one', expiresAt: Date.now() + 300000, items: [{ id: 'proposal-one', providerId: 'archives.belongings', kind: 'belonging-projection', expectedHash: 'c'.repeat(64), affected: 1 }] };
		const port: HealthPagePort = {
			scanner: { get snapshot() { return snapshot(); }, providers: async () => [], scan: async () => { calls.scans++; mode.scenario = 'complete'; emit(); return report(); }, cancel: () => { mode.scenario = 'cancelled'; emit(); }, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } },
			repairs: { get results() { return ['partial', 'restore', 'repair-complete', 'conflict'].includes(mode.scenario) ? [result()] : []; }, plan: async () => { calls.plans++; return plan; }, preview: () => ({ ...plan, confirmation: 'explicit' }), confirm: async () => { calls.commits++; if (mode.scenario === 'revalidating') return new Promise<HealthRepairResult>(() => {}); return result(); }, recover: async input => { calls.recoveries++; return { ...result().items[0]!, committed: true, rechecked: true, status: input.action === 'resume' ? 'verified' : 'rolled-back' }; } },
			getReport: id => mode.scenario === 'default' || id === 'expired-report' ? undefined : report(), openNotifications: () => {},
		};
		function Harness() {
			const [route, setRoute] = useState({ section: ['repair', 'partial', 'restore', 'unsupported', 'revalidating', 'repair-complete', 'repair-stale', 'conflict'].includes(mode.scenario) ? 'repair' as const : 'scan' as const, id: mode.scenario === 'notification' ? 'expired-report' : undefined as string | undefined });
			return <HealthPage port={port} section={route.section} reportId={route.id} navigate={(section, id) => setRoute({ section, id })} />;
		}
		const draw = () => root.render(<ContainerProviders container={container}><Harness key={mode.revision} /></ContainerProviders>);
		draw(); return [name, { container, root, mode, calls, draw }];
	}));
	Object.assign(window, { uiReviewAdapters: { Command, Select, DropdownMenu, Dialog }, uiReview: { docs, mounts, t,
		configure(language: 'en' | 'zh', theme: string) { setLanguage(language); for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; } },
		scenario(value: string) { for (const mount of Object.values(mounts)) { mount.mode.scenario = value; mount.mode.revision++; mount.draw(); } },
		unmount() { for (const mount of Object.values(mounts)) mount.root.unmount(); },
	} });
}
void boot();
