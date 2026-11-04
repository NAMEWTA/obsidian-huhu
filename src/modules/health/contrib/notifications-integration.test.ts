import { expect, test, vi } from 'vitest';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import type { Command } from 'obsidian';
import type { ModuleContext, ServiceKey, ContributionPoint } from '../../../app/contracts/module';
import { serviceKey } from '../../../app/contracts/module';
import { HEALTH_PROVIDERS, HEALTH_SCANNER, HEALTH_REPAIR_OWNERS, HEALTH_REPAIRS, type HealthCheck, type HealthRepairOwner, type HealthScanner, type HealthRepairs } from '../api';
import { NOTIFICATION_INBOX, NOTIFICATION_OPENERS, type NotificationOpener } from '../../notifications/api';
import { NotificationService } from '../../notifications/core/service';
import { SettingsStore } from '../../../shared/settings/store';
import { DomainEvents } from '../../../shared/events/domain-events';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { ARCHIVES_REPAIRS } from '../../archives/api';
import createHealthModule from '../module';

test('shipped module scans without a page and persists scan/failure summaries with a working opener', async () => {
	const vault = memoryVault({}, { setTimeout, clearTimeout }), events = new DomainEvents(), routes: unknown[] = [];
	const settings = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: setTimeout, clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) } });
	const files = new Map<string, string>(); let opener: NotificationOpener | undefined;
	const inbox = new NotificationService({ exists: async path => files.has(path), read: async path => files.get(path)!, write: async (path, text) => { files.set(path, text); }, mkdir: async () => {} }, 'inbox.json', async record => { await opener?.open(record); }, { available: () => false, send: () => {}, dispose: () => {} });
	await inbox.load();
	const checkKey = serviceKey<HealthCheck>('archives', 'health-fixture'), stop = new AbortController();
	const check: HealthCheck = { permission: async () => 'allowed', scan: async function* () { yield { checked: 7, excluded: 2, issues: [{ code: 'projection-mismatch', count: 1, severity: 'error', reference: 'a'.repeat(64) }] }; } };
	const owner: HealthRepairOwner = { preview: async selection => ({ id: 'candidate', kind: selection.kind, expectedHash: 'b'.repeat(64), affected: 1 }), commit: async input => ({ operationId: input.operationId, kind: 'belonging-projection', committed: 'unknown', rechecked: false, status: 'failed', recoveryId: 'recover-one' }), recover: async () => { throw new Error('unused'); } };
	const module = createHealthModule({ app: vault.app, settings, events, shell: { open: async (target: WorkbenchTarget) => { routes.push(target); } },
		services: { peek: (key: ServiceKey<unknown>) => key === NOTIFICATION_INBOX ? inbox : key === checkKey ? check : undefined, acquire: async (key: ServiceKey<unknown>) => ({ value: key === ARCHIVES_REPAIRS ? owner : check, revoked: stop.signal }) },
		contributions: { collect: async (point: ContributionPoint<unknown>) => [{ module: 'archives', value: point === HEALTH_PROVIDERS ? [{ id: 'archives.belongings', scope: 'belongings', service: checkKey }] : point === HEALTH_REPAIR_OWNERS ? [{ providerId: 'archives.belongings', service: ARCHIVES_REPAIRS }] : [] }], watch: () => () => {} }, commands: { add: (command: Command) => command },
	} as unknown as ModuleContext);
	try {
		await module.activate?.(stop.signal);
		opener = module.contributions!.find(([point]) => point === NOTIFICATION_OPENERS)![1] as NotificationOpener;
		const scanner = module.services!.find(([key]) => key === HEALTH_SCANNER)![1] as HealthScanner;
		const repairs = module.services!.find(([key]) => key === HEALTH_REPAIRS)![1] as HealthRepairs;
		const report = await scanner.scan(); await vi.waitFor(() => expect(inbox.records).toHaveLength(1));
		const plan = await repairs.plan(report.id, [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: report.sections[0]!.issues[0]!.reference }]);
		await repairs.confirm({ planId: plan.id, confirmation: repairs.preview(plan.id).confirmation });
		await vi.waitFor(() => expect(inbox.records).toHaveLength(2));
		expect(inbox.records[0]?.body).toMatch(/7/); expect(inbox.records[1]?.body).toMatch(/1/);
		expect(files.get('inbox.json')).toContain('reportId');
		await inbox.open(inbox.records[1]!); expect(routes).toEqual([{ feature: 'health', section: 'scan', resourceId: report.id }]);
		expect(opener.canOpen(inbox.records[0]!)).toBe(true);
	} finally { await module.dispose('unload'); await inbox.shutdown(); events.dispose(); await settings.dispose(); }
});
