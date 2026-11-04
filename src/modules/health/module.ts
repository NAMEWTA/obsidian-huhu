import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { publishFeedback, reportOperationFailure } from '../../host/obsidian/feedback';
import { registerMessages, t } from '../../shared/i18n';
import { HEALTH_INVALIDATED, HEALTH_PROVIDERS, HEALTH_SCANNER, HEALTH_REPAIRS, HEALTH_REPAIR_OWNERS } from './api';
import { healthNotificationOpener } from './contrib/notification-opener';
import type { HealthReport } from './api';
import { NOTIFICATION_INBOX, NOTIFICATION_OPENERS } from '../notifications/api';
import { LazyHealthScanner } from './services/lazy-scanner';
import { LazyHealthRepairs } from './services/lazy-repairs';
import { healthSettings } from './settings';
import { messages } from './i18n';
import { knownHealthChecks } from './services/check-catalog';

registerMessages(messages);

export default function createHealthModule(context: ModuleContext): ModuleInstance {
	const settings = context.settings.bind('health', healthSettings);
	const scanner = new LazyHealthScanner({
		knownChecks: knownHealthChecks,
		providers: async () => (await context.contributions.collect(HEALTH_PROVIDERS, { activate: false })).flatMap(entry => entry.value.filter(row => row.service.owner === entry.module)),
		acquire: (provider, signal) => context.services.peek(provider.service) ? context.services.acquire(provider.service, signal) : Promise.resolve(undefined),
		now: Date.now, id: () => crypto.randomUUID(),
		yieldControl: signal => new Promise<void>((resolve, reject) => {
			signal.throwIfAborted();
			const win = context.app.workspace.containerEl.win;
			const abort = () => { win.clearTimeout(timer); reject(new Error('health-cancelled')); };
			const timer = win.setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 0);
			signal.addEventListener('abort', abort, { once: true });
		}),
	}, () => settings.get());
	const reports = new Map<string, HealthReport>();
	const getReport = (id?: string): HealthReport | undefined => {
		const current = scanner.snapshot.report;
		if (!id || current?.id === id) return current;
		const previous = reports.get(id);
		return previous ? { ...structuredClone(previous), stale: true } : undefined;
	};
	const notify = async (reportId: string, repair = false, resultId = reportId, summary?: string) => {
		if (disposed) return;
		const inbox = context.services.peek(NOTIFICATION_INBOX);
		const report = getReport(reportId);
		const body = summary ?? (report ? t('health.noticeScan', {
			unchecked: report.sections.filter(row => !row.complete).length, status: t(`health.${report.status}`), checked: report.sections.reduce((sum, row) => sum + row.checked, 0), excluded: report.sections.reduce((sum, row) => sum + row.excluded, 0),
		}) : t(repair ? 'health.repairResult' : 'health.finished'));
		if (inbox) await inbox.send({ id: `health-${repair ? 'repair' : 'scan'}-${resultId}`, title: t('health.notificationTitle'), body, channels: [], source: { kind: 'health', id: reportId }, target: { kind: 'health', reportId } });
	};
	const repairs = new LazyHealthRepairs({
		providers: async () => (await context.contributions.collect(HEALTH_REPAIR_OWNERS, { activate: false })).flatMap(entry => entry.value.filter(row => row.service.owner === entry.module)),
		acquire: (provider, signal) => context.services.acquire(provider.service, signal),
		report: () => scanner.snapshot.report, now: Date.now, id: () => crypto.randomUUID(),
		notify: async result => { scanner.invalidate(); await notify(result.reportId, true, result.planId, t('health.noticeRepair', { status: t(`health.repairOutcome.${result.status}`), committed: result.items.filter(item => item.committed === true).length, unknown: result.items.filter(item => item.committed === 'unknown').length, uncommitted: result.items.filter(item => item.committed === false).length })); },
	});
	let disposed = false;
	const cleanups: Array<() => void> = [];
	let notifiedReport: string | undefined;
	cleanups.push(scanner.subscribe(() => {
		const report = scanner.snapshot.report;
		if (!disposed && report && report.id !== notifiedReport) {
			notifiedReport = report.id;
			reports.set(report.id, report);
			if (reports.size > 20) reports.delete(reports.keys().next().value!);
			void notify(report.id).catch(() => {});
		}
	}));
	const run = async () => {
		const win = context.app.workspace.getMostRecentLeaf()?.view.containerEl.win ?? context.app.workspace.containerEl.win;
		const operationId = crypto.randomUUID();
		const report = await scanner.scan();
		if (!disposed) {
			const input = { operationId, source: 'health', message: { key: `health.${report.status}` } };
			if (report.complete && report.status === 'pass') publishFeedback(win, { ...input, message: { key: 'health.finished' }, outcome: 'success', receipt: { committed: true } });
			else publishFeedback(win, { ...input, outcome: report.status === 'cancelled' ? 'cancelled' : report.status === 'locked' ? 'locked' : 'partial' });
		}
	};
	return {
		services: [[HEALTH_SCANNER, scanner], [HEALTH_REPAIRS, repairs]],
		contributions: [[NOTIFICATION_OPENERS, healthNotificationOpener(target => context.shell.open(target), () => !disposed)]],
		pages: { health: async () => (await import('./ui/workbench-page')).createHealthPage({ scanner, repairs, getReport, openNotifications: () => { void context.shell.open({ feature: 'notifications' }).catch(() => { if (!disposed) reportOperationFailure(context.app.workspace.containerEl.win, 'health', 'health.failed'); }); } }) },
		activate: signal => {
			const cancel = () => { scanner.cancel(); repairs.dispose(); };
			signal.addEventListener('abort', cancel, { once: true });
			cleanups.push(() => signal.removeEventListener('abort', cancel));
			cleanups.push(context.contributions.watch(HEALTH_PROVIDERS, () => scanner.invalidate()));
			cleanups.push(context.events.on(HEALTH_INVALIDATED, () => scanner.invalidate()));
			const invalidate = () => scanner.invalidate();
			const refs = [context.app.vault.on('create', invalidate), context.app.vault.on('modify', invalidate), context.app.vault.on('delete', invalidate), context.app.vault.on('rename', invalidate)];
			cleanups.push(() => { for (const ref of refs) context.app.vault.offref(ref); });
			context.commands.add({ id: 'health-scan', name: t('health.scan'), nameKey: 'health.scan', callback: () => { void run().catch(() => { if (!disposed) reportOperationFailure(context.app.workspace.containerEl.win, 'health', 'health.failed'); }); } });
			context.commands.add({ id: 'health-cancel', name: t('health.cancel'), nameKey: 'health.cancel', callback: () => scanner.cancel() });
		},
		dispose: async () => {
			disposed = true;
			repairs.dispose(); reports.clear();
			for (const cleanup of cleanups.splice(0).reverse()) cleanup();
			await scanner.dispose();
		},
	};
}
