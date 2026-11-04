import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { Command } from 'obsidian';
import type { ModuleContext, ModuleId, ModuleManifest } from '../../app/contracts/module';
import { serviceKey } from '../../app/contracts/module';
import { ModuleRegistry } from '../../app/modules/registry';
import { SettingsStore } from '../../shared/settings/store';
import { DomainEvents } from '../../shared/events/domain-events';
import { getLanguage, setLanguage } from '../../shared/i18n';
import { memoryVault } from '../../../scripts/fixtures/memory-vault';
import * as feedback from '../../host/obsidian/feedback';
import { TestProviders } from '../../ui/react/test-providers';
import { safeManifest } from '../safe/manifest';
import { NOTIFICATION_INBOX } from '../notifications/api';
import { NotificationService } from '../notifications/core/service';
import { HEALTH_PROVIDERS, HEALTH_SCANNER, HEALTH_REPAIRS, type HealthCheck, type HealthProvider } from './api';
import { healthManifest } from './manifest';
import { HealthPage } from './ui/HealthPage';

test('default page and command scans retain known and seen checks across real registry owner lifecycle without activating safe', async () => {
	const language = getLanguage(); setLanguage('en');
	const vault = memoryVault({}, window), events = new DomainEvents();
	Object.assign(vault.app.workspace, { getMostRecentLeaf: () => undefined });
	const write = vi.spyOn(vault.adapter, 'write'), remove = vi.spyOn(vault.adapter, 'remove'), create = vi.spyOn(vault.app.vault, 'create');
	const settings = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: setTimeout, clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) } });
	const records = new Map<string, string>();
	const inbox = new NotificationService({ exists: async path => records.has(path), read: async path => records.get(path)!, write: async (path, value) => { records.set(path, value); }, mkdir: async () => {} }, 'inbox.json', async () => {}, { available: () => false, send: () => {}, dispose: () => {} });
	await inbox.load();
	let ready = true;
	const check: HealthCheck = { permission: async () => ready ? 'allowed' : 'unavailable', scan: async function* () { yield { checked: 1, total: 1 }; } };
	const owner = (id: 'archives' | 'navigator', rows: Array<{ id: string; scope: HealthProvider['scope'] }>): ModuleManifest => {
		const keys = rows.map(row => serviceKey<HealthCheck>(id, row.id));
		return { id, order: 1, icon: 'file', titleKey: 'test', descriptionKey: 'test', platforms: { desktop: true, mobile: true }, defaultEnabled: true, activation: 'startup', provides: keys, contributes: [HEALTH_PROVIDERS], load: async () => ({ default: () => ({ services: keys.map(key => [key, check] as const), contributions: [[HEALTH_PROVIDERS, rows.map((row, index) => ({ ...row, service: keys[index]! }))]], dispose: () => {} }) }) };
	};
	const safeLoad = vi.fn(safeManifest.load), published = vi.spyOn(feedback, 'publishFeedback');
	const enabled = new Set<ModuleId>(['archives', 'navigator', 'safe', 'health', 'notifications']);
	const errors: unknown[] = [], commands = new Map<string, Command>();
	const registry = new ModuleRegistry([
		owner('archives', [{ id: 'archives.integrity', scope: 'archives' }, { id: 'archives.belongings', scope: 'belongings' }, { id: 'archives.extension', scope: 'archives' }]),
		owner('navigator', [{ id: 'navigator.periodic', scope: 'periodic' }]),
		{ ...safeManifest, load: safeLoad }, healthManifest,
		{ ...healthManifest, id: 'notifications', activation: 'startup', provides: [NOTIFICATION_INBOX], contributes: [], load: async () => ({ default: () => ({ services: [[NOTIFICATION_INBOX, inbox]], dispose: () => {} }) }) },
	], { env: { desktop: true, mobile: false, phone: false }, enabled: id => enabled.has(id),
		createContext: (manifest, services, contributions) => ({ id: manifest.id, app: vault.app, settings, services, contributions, events, shell: { open: async () => {} }, commands: { add: (command: Command) => { commands.set(command.id, command); return command; } } }) as unknown as ModuleContext,
		releaseContext: () => {}, report: (_id, _phase, error) => errors.push(error),
	});
	try {
		await registry.apply(['startup', 'layout-ready']);
		const scanner = registry.services.peek(HEALTH_SCANNER)!, repairs = registry.services.peek(HEALTH_REPAIRS)!;
		const scan = vi.spyOn(scanner, 'scan');
		expect(registry.state('safe')).toBe('idle'); expect(safeLoad).not.toHaveBeenCalled();
		render(<TestProviders><HealthPage port={{ scanner, repairs, getReport: () => scanner.snapshot.report, openNotifications: () => {} }} navigate={() => {}} /></TestProviders>);
		await userEvent.click(screen.getByRole('button', { name: 'Start checkup' }));
		await screen.findByRole('region', { name: 'safe.container' });
		expect(scan.mock.calls[0]).toEqual([]);
		expect(await within(screen.getByRole('region', { name: 'safe.container' })).findByText('Unavailable')).toBeTruthy();
		expect(scanner.snapshot.report).toMatchObject({ status: 'unavailable', complete: false });
		expect(scanner.snapshot.report?.sections.find(row => row.providerId === 'safe.container')).toMatchObject({ owner: 'safe', scope: 'safe', titleKey: 'health.page.scope.safe', checked: 0 });
		await waitFor(() => expect(inbox.records).toHaveLength(1));
		expect(inbox.records[0]?.body).toContain('Unavailable');
		expect(inbox.records[0]?.body).toContain('Not fully checked 1');
		expect(screen.getByText('Not fully checked groups: 1')).toBeTruthy();
		const commandScan = async (unchecked: number) => {
			const before = inbox.records.length;
			await act(async () => { commands.get('health-scan')!.callback!(); });
			await waitFor(() => expect(inbox.records).toHaveLength(before + 1));
			expect(scan.mock.calls.at(-1)).toEqual([]);
			expect(scanner.snapshot.report).toMatchObject({ status: 'unavailable', complete: false });
			expect(scanner.snapshot.report?.sections).toHaveLength(5);
			expect(inbox.records.at(-1)?.body).toContain(`Not fully checked ${unchecked}`);
			expect(published.mock.calls.at(-1)?.[1]).toMatchObject({ outcome: 'partial', message: { key: 'health.unavailable' } });
		};
		enabled.delete('navigator'); enabled.delete('safe');
		await act(async () => { await registry.apply(['startup', 'layout-ready']); });
		await commandScan(2);
		expect(scanner.snapshot.report?.sections.find(row => row.providerId === 'navigator.periodic')?.status).toBe('unavailable');
		enabled.add('navigator'); enabled.add('safe');
		await act(async () => { await registry.apply(['startup', 'layout-ready']); });
		await commandScan(1);
		expect(scanner.snapshot.report?.sections.find(row => row.providerId === 'navigator.periodic')?.status).toBe('pass');
		expect(registry.state('safe')).toBe('idle');
		enabled.delete('archives'); await act(async () => { await registry.apply(['startup', 'layout-ready']); });
		await commandScan(4);
		expect(scanner.snapshot.report?.sections.find(row => row.providerId === 'archives.extension')?.status).toBe('unavailable');
		enabled.add('archives'); await act(async () => { await registry.apply(['startup', 'layout-ready']); });
		await commandScan(1);
		ready = false; await commandScan(5);
		expect(safeLoad).not.toHaveBeenCalled(); expect(vault.reads).toBe(0);
		for (const spy of [write, remove, create]) expect(spy).not.toHaveBeenCalled();
		// Explicit user activation is a control, not an action performed by scan discovery.
		const safeKey = serviceKey<HealthCheck>('safe', 'health-container');
		safeLoad.mockImplementationOnce(async () => ({ default: () => ({ services: [[safeKey, check]], contributions: [[HEALTH_PROVIDERS, [{ id: 'safe.container', scope: 'safe', service: safeKey }]]], dispose: () => {} }) }));
		ready = true;
		await act(async () => { await registry.activate('safe'); });
		const before = inbox.records.length;
		await act(async () => { commands.get('health-scan')!.callback!(); });
		await waitFor(() => expect(inbox.records).toHaveLength(before + 1));
		expect(scanner.snapshot.report).toMatchObject({ status: 'pass', complete: true });
		expect(scanner.snapshot.report?.sections).toHaveLength(5);
		expect(inbox.records.at(-1)?.body).toContain('Not fully checked 0');
		expect(published.mock.calls.at(-1)?.[1]).toMatchObject({ outcome: 'success' });
		expect(safeLoad).toHaveBeenCalledTimes(1);
		expect(vault.reads).toBe(0);
		expect(errors).toEqual([]);
	} finally { cleanup(); await registry.dispose(); await inbox.shutdown(); events.dispose(); await settings.dispose(); setLanguage(language); vi.restoreAllMocks(); }
});
