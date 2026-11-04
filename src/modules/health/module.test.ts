import { expect, test, vi } from 'vitest';
import type { Command } from 'obsidian';
import type { ModuleContext, ModuleId, ModuleManifest } from '../../app/contracts/module';
import { serviceKey } from '../../app/contracts/module';
import { MANIFESTS } from '../../app/manifests';
import { ModuleRegistry } from '../../app/modules/registry';
import { SettingsStore } from '../../shared/settings/store';
import { DomainEvents } from '../../shared/events/domain-events';
import { memoryVault } from '../../../scripts/fixtures/memory-vault';
import { HEALTH_INVALIDATED, HEALTH_PROVIDERS, HEALTH_SCANNER, type HealthCheck, type HealthProvider } from './api';
import { healthManifest } from './manifest';

test('the shipped health module scans only on request, respects provider disable/lock, and releases listeners on restart', async () => {
	const initial = { 'broken.json': '{broken', 'future.json': '{"version":999}', 'broken.md': '---\na: [\n---\nPRIVATE_BODY' };
	const vault = memoryVault(initial, { setTimeout, clearTimeout });
	Object.assign(vault.app.workspace, { getMostRecentLeaf: () => undefined });
	const write = vi.spyOn(vault.adapter, 'write'), remove = vi.spyOn(vault.adapter, 'remove'), mkdir = vi.spyOn(vault.adapter, 'mkdir');
	const create = vi.spyOn(vault.app.vault, 'create'), process = vi.spyOn(vault.app.vault, 'process');
	const save = vi.fn(async (_scope, file) => file);
	const settings = new SettingsStore({ load: async () => null, save }, { timers: { set: setTimeout, clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) } });
	const events = new DomainEvents();
	let locked = false, scans = 0;
	const check: HealthCheck = {
		permission: async () => locked ? 'locked' : 'allowed',
		scan: async function* ({ signal }) {
			scans++;
			for (const path of [...Object.keys(initial), 'missing.json']) {
				signal.throwIfAborted();
				if (await vault.adapter.exists(path)) await vault.adapter.read(path);
				yield { checked: 1, total: 4, issues: [{ code: path === 'missing.json' ? 'missing' : path === 'future.json' ? 'unsupported-version' : 'unparseable', severity: 'warning', count: 1 }] };
			}
		},
	};
	const key = serviceKey<HealthCheck>('archives', 'health-test');
	const descriptor: HealthProvider = { id: 'archives.fixture', scope: 'archives', service: key };
	const provider: ModuleManifest = { id: 'archives', order: 1, icon: 'contact', titleKey: 'contacts.title', descriptionKey: 'contacts.description', platforms: { desktop: true, mobile: true }, defaultEnabled: true, activation: 'startup', provides: [key], contributes: [HEALTH_PROVIDERS], load: async () => ({ default: () => ({ services: [[key, check]], contributions: [[HEALTH_PROVIDERS, [descriptor]]], dispose: () => {} }) }) };
	const enabled = new Set<ModuleId>(['archives', 'health', 'safe']);
	const errors: unknown[] = [], commands = new Map<string, Command>();
	const registry = new ModuleRegistry([provider, healthManifest, { ...healthManifest, id: 'safe', activation: 'on-demand', provides: [], load: async () => { throw new Error('unrelated provider must stay idle'); } }], {
		env: { desktop: true, mobile: false, phone: false }, enabled: id => enabled.has(id),
		createContext: (manifest, services, contributions) => ({ id: manifest.id, app: vault.app, settings, services, contributions, events, commands: { add: (command: Command) => { commands.set(command.id, command); return command; } } }) as unknown as ModuleContext,
		releaseContext: context => { if (context.id === 'health') commands.clear(); }, report: (_id, _phase, error) => errors.push(error),
	});
	try {
		expect(MANIFESTS.filter(row => row.id === 'health')).toHaveLength(1);
		await registry.apply(['startup']);
		expect(registry.services.peek(HEALTH_SCANNER)).toBeUndefined();
		await registry.apply(['layout-ready']);
		const scanner = registry.services.peek(HEALTH_SCANNER)!;
		expect(scanner).toBeDefined(); expect(scans).toBe(0); expect(vault.reads).toBe(0);
		expect(commands.has('health-scan')).toBe(true);
		const report = await scanner.scan({ providerIds: ['archives.fixture'] });
		expect(report).toMatchObject({ status: 'warning', complete: true, stale: false });
		expect(report.sections[0]?.checked).toBe(4);
		for (const spy of [write, remove, mkdir, create, process, save]) expect(spy).not.toHaveBeenCalled();
		expect(Object.fromEntries(vault.contents)).toEqual(initial);
		locked = true;
		const lockedReport = await scanner.scan();
		expect(lockedReport.sections[0]?.status).toBe('locked'); expect(scans).toBe(1);
		events.emit(HEALTH_INVALIDATED, { providerIds: ['archives.fixture'] });
		expect(scanner.snapshot.report?.stale).toBe(true);
		enabled.delete('archives'); await registry.apply(['startup', 'layout-ready']);
		const unavailable = await scanner.scan({ providerIds: ['archives.fixture'] });
		expect(unavailable.sections[0]?.status).toBe('unavailable'); expect(scans).toBe(1);
		expect(registry.state('safe')).toBe('idle');
		enabled.delete('health'); await registry.apply(['layout-ready']);
		expect(registry.services.peek(HEALTH_SCANNER)).toBeUndefined(); expect(commands.size).toBe(0);
		await expect(scanner.scan()).rejects.toThrow('health-disposed');
		const stopped = scanner.snapshot;
		vault.emit('modify', vault.file('broken.json')); events.emit(HEALTH_INVALIDATED, {});
		expect(scanner.snapshot).toEqual(stopped);
		enabled.add('health'); await registry.apply(['layout-ready']);
		const reopened = registry.services.peek(HEALTH_SCANNER)!;
		expect(reopened).not.toBe(scanner); expect(reopened.snapshot.report).toBeUndefined();
		expect(errors).toEqual([]);
	} finally { await registry.dispose(); events.dispose(); await settings.dispose(); vi.restoreAllMocks(); }
});
