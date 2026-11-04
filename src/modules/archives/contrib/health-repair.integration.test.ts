import { expect, test } from 'vitest';
import { memoryArchives } from '../services/generic/test-port';
import { ArchivesApplication } from '../services/generic/application';
import { ArchiveRepairService } from '../services/generic/repair';
import { HealthScanService } from '../../health/core/scanner';
import { HealthRepairService } from '../../health/core/repair';
import { createArchivesHealth, ARCHIVES_HEALTH_PROVIDERS } from './health';
import { ARCHIVES_REPAIRS, BELONGING_TYPE_ID } from '../api';
import { patchProperties } from '../core/generic/markdown';

test('real scan → preview → confirmation → owner CAS → per-item receipts → recheck and recovery', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	await app.commands.belongings.install();
	const created = [];
	for (const operationId of ['repair-first', 'repair-second']) {
		const item = await app.commands.create({ operationId, typeId: BELONGING_TYPE_ID, values: { name: 'PRIVATE-TITLE' } });
		f.files.external(item.path, patchProperties(f.files.text.get(item.path)!, { status: 'idle' })); created.push(item);
	}
	await f.runtime.flushEvents();
	const provider = createArchivesHealth({ catalog: app.catalog, query: app.query, available: () => f.runtime.ready });
	const owner = new ArchiveRepairService(f.runtime, provider.resolve), revoke = new AbortController();
	const scanner = new HealthScanService({ providers: async () => ARCHIVES_HEALTH_PROVIDERS, acquire: async descriptor => ({ value: descriptor.id === 'archives.belongings' ? provider.belongings : provider.archives, revoked: revoke.signal }), now: Date.now, id: () => crypto.randomUUID(), yieldControl: async () => {} }, () => ({ concurrency: 1, batchSize: 2, maxItems: 100, maxIssues: 100, freshnessMinutes: 10 }));
	const notifications: unknown[] = [];
	const repairs = new HealthRepairService({ providers: async () => [{ providerId: 'archives.belongings', service: ARCHIVES_REPAIRS }], acquire: async () => ({ value: owner, revoked: revoke.signal }), report: () => scanner.snapshot.report, now: Date.now, id: () => crypto.randomUUID(), notify: async result => { notifications.push(result); } });
	try {
		const report = await scanner.scan({ providerIds: ['archives.belongings'] });
		const selections = report.sections[0]!.issues.map(issue => ({ providerId: 'archives.belongings', kind: 'belonging-projection' as const, reference: issue.reference! }));
		expect(selections).toHaveLength(2);
		const before = f.files.writes.length, plan = await repairs.plan(report.id, selections), preview = repairs.preview(plan.id);
		expect(f.files.writes.length).toBe(before);
		// Change the second owner after preview without changing the first owner.
		const second = provider.resolve(selections[1]!.reference)!;
		f.files.external(second.path, f.files.text.get(second.path)! + '\nPRIVATE-CONCURRENT-EDIT\n'); await f.runtime.flushEvents();
		const result = await repairs.confirm({ planId: plan.id, confirmation: preview.confirmation });
		expect(result.status).toBe('partial'); expect(result.items.map(item => item.committed)).toEqual([true, false]);
		expect(result.items[1]?.status).toBe('conflict'); expect(result.items[0]?.recoveryId).toBeDefined();
		expect(JSON.stringify([plan, result, notifications])).not.toMatch(/PRIVATE|profile\.md/);
		expect(repairs.results).toEqual([result]);
		const after = await scanner.scan({ providerIds: ['archives.belongings'] });
		expect(after.sections[0]?.issues).toHaveLength(1);
		const retry = await repairs.plan(after.id, after.sections[0]!.issues.map(issue => ({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: issue.reference! })));
		expect((await repairs.confirm({ planId: retry.id, confirmation: repairs.preview(retry.id).confirmation })).status).toBe('verified');
		expect((await scanner.scan({ providerIds: ['archives.belongings'] })).status).toBe('pass');
		expect(f.files.text.get(second.path)).toContain('PRIVATE-CONCURRENT-EDIT');
		expect(await repairs.recover({ providerId: 'archives.belongings', recoveryId: result.items[0]!.recoveryId!, action: 'rollback' })).toMatchObject({ status: 'rolled-back' });
	} finally { repairs.dispose(); provider.dispose(); await scanner.dispose(); f.runtime.dispose(); }
});

test('shipped registry discovers the shipped repair owner and executes only after public confirmation', async () => {
	const { vi } = await import('vitest');
	const { TFolder, TFile } = await import('obsidian');
	const { MANIFESTS } = await import('../../../app/manifests');
	const { ModuleRegistry } = await import('../../../app/modules/registry');
	const { SettingsStore } = await import('../../../shared/settings/store');
	const { DomainEvents } = await import('../../../shared/events/domain-events');
	const { memoryVault } = await import('../../../../scripts/fixtures/memory-vault');
	const { HEALTH_SCANNER, HEALTH_REPAIRS } = await import('../../health/api');
	const { ARCHIVES_CATALOG } = await import('../api');
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	await app.commands.belongings.install();
	const item = await app.commands.create({ operationId: 'public-repair', typeId: BELONGING_TYPE_ID, values: { name: 'PRIVATE' } });
	const initial = Object.fromEntries(f.files.text); initial[item.path] = patchProperties(initial[item.path]!, { status: 'idle' }); f.runtime.dispose();
	const vault = memoryVault(initial, { setTimeout, clearTimeout });
	Object.assign(vault.app.workspace, { onLayoutReady: (callback: () => void) => callback() });
	// The shared read-only fixture models folders as plain paths; writes require real Vault class identity.
	const abstract = vault.app.vault.getAbstractFileByPath.bind(vault.app.vault);
	vault.app.vault.getAbstractFileByPath = path => { const entry = abstract(path); return entry && !(entry instanceof TFile) ? Object.assign(new TFolder(), entry) : entry; };
	const settings = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: setTimeout, clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) } });
	const events = new DomainEvents(), releases = new Map<string, Array<() => void>>(), errors: unknown[] = [];
	const registry = new ModuleRegistry(MANIFESTS.filter(row => row.id === 'archives' || row.id === 'health'), {
		env: { desktop: true, mobile: false, phone: false }, enabled: () => true,
		createContext: (manifest, services, contributions) => {
			const cleanups: Array<() => void> = []; releases.set(manifest.id, cleanups);
			return { id: manifest.id, app: vault.app, services, contributions, settings, events, commands: { add: () => {} }, shell: { refresh: () => {} }, lifetime: { register: (cleanup: () => void) => { cleanups.push(cleanup); } } } as unknown as import('../../../app/contracts/module').ModuleContext;
		}, releaseContext: context => { for (const cleanup of releases.get(context.id) ?? []) cleanup(); }, report: (_id, _phase, error) => errors.push(error),
	});
	try {
		await registry.apply(['startup', 'layout-ready']);
		await vi.waitFor(() => expect(registry.services.peek(ARCHIVES_CATALOG)?.snapshot().types.find(type => type.id === BELONGING_TYPE_ID)?.count).toBe(1));
		const scanner = registry.services.peek(HEALTH_SCANNER)!, repairs = registry.services.peek(HEALTH_REPAIRS)!;
		expect(registry.services.peek(ARCHIVES_REPAIRS)).toBeDefined();
		const report = await scanner.scan({ providerIds: ['archives.belongings'] });
		const original = new Map(vault.contents);
		const plan = await repairs.plan(report.id, [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: report.sections[0]!.issues[0]!.reference }]);
		const preview = repairs.preview(plan.id);
		expect(vault.contents).toEqual(original);
		const result = await repairs.confirm({ planId: plan.id, confirmation: preview.confirmation });
		expect(result.status).toBe('verified');
		expect((await scanner.scan({ providerIds: ['archives.belongings'] })).status).toBe('pass');
		expect(errors).toEqual([]);
	} finally { await registry.dispose(); events.dispose(); await settings.dispose(); }
});
