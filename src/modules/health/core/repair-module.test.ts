import { expect, test } from 'vitest';
import type { Command } from 'obsidian';
import type { ModuleContext, ServiceKey, ContributionPoint } from '../../../app/contracts/module';
import { HEALTH_PROVIDERS, HEALTH_SCANNER, HEALTH_REPAIR_OWNERS, HEALTH_REPAIRS, type HealthScanner, type HealthRepairs, type HealthRepairOwner, type HealthCheck } from '../api';
import { NOTIFICATION_INBOX, type NotificationRequest } from '../../notifications/api';
import { ARCHIVES_REPAIRS } from '../../archives/api';
import { serviceKey } from '../../../app/contracts/module';
import { SettingsStore } from '../../../shared/settings/store';
import { DomainEvents } from '../../../shared/events/domain-events';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import createHealthModule from '../module';

test('shipped module publishes repair service and sends redacted scan/failure inbox targets without UI', async () => {
	const vault = memoryVault({}, { setTimeout, clearTimeout }), events = new DomainEvents();
	const settings = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: setTimeout, clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) } });
	const checkKey = serviceKey<HealthCheck>('archives', 'fixture'), controller = new AbortController();
	const requests: NotificationRequest[] = [];
	const check: HealthCheck = { permission: async () => 'allowed', scan: async function* () { yield { checked: 1, issues: [{ code: 'projection-mismatch', count: 1, severity: 'error', reference: 'a'.repeat(64) }] }; } };
	const owner: HealthRepairOwner = { preview: async selection => ({ id: 'proposal', kind: selection.kind, expectedHash: 'a'.repeat(64), affected: 1 }), commit: async input => ({ operationId: input.operationId, kind: 'belonging-projection', status: 'failed', committed: false, rechecked: false, recoveryId: 'recover-one' }), recover: async () => { throw new Error('unused'); } };
	const module = createHealthModule({ app: vault.app, settings, events,
		services: { peek: (key: ServiceKey<unknown>) => key === NOTIFICATION_INBOX ? { send: async (request: NotificationRequest) => { requests.push(request); } } : key === checkKey ? check : undefined, acquire: async (key: ServiceKey<unknown>) => ({ value: key === ARCHIVES_REPAIRS ? owner : check, revoked: controller.signal }) },
		contributions: { collect: async (point: ContributionPoint<unknown>) => [{ module: 'archives', value: point === HEALTH_PROVIDERS ? [{ id: 'archives.belongings', scope: 'belongings', service: checkKey }] : point === HEALTH_REPAIR_OWNERS ? [{ providerId: 'archives.belongings', service: ARCHIVES_REPAIRS }] : [] }], watch: () => () => {} }, commands: { add: (command: Command) => command },
	} as unknown as ModuleContext);
	try {
		await module.activate?.(controller.signal);
		const scanner = module.services!.find(([key]) => key === HEALTH_SCANNER)![1] as HealthScanner;
		const repairs = module.services!.find(([key]) => key === HEALTH_REPAIRS)![1] as HealthRepairs;
		const report = await scanner.scan();
		const plan = await repairs.plan(report.id, [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: report.sections[0]!.issues[0]!.reference }]);
		const result = await repairs.confirm({ planId: plan.id, confirmation: repairs.preview(plan.id).confirmation });
		expect(result.status).toBe('failed'); expect(requests).toHaveLength(2);
		for (const request of requests) expect(request).toMatchObject({ source: { kind: 'health', id: report.id }, target: { kind: 'health', reportId: report.id }, channels: [] });
		expect(requests[1]?.body).not.toMatch(/success|成功/);
		expect(repairs.results[0]?.items[0]?.recoveryId).toBe('recover-one');
	} finally { await module.dispose('unload'); events.dispose(); await settings.dispose(); }
});
