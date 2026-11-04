import { expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../../app/contracts/module';
import { MANIFESTS } from '../../../app/manifests';
import { ModuleRegistry } from '../../../app/modules/registry';
import { SettingsStore } from '../../../shared/settings/store';
import { DomainEvents } from '../../../shared/events/domain-events';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { HEALTH_SCANNER } from '../../health/api';
import { HEALTH_INVALIDATED } from '../../health/api';
import type { Command } from 'obsidian';
import { createContainer } from '../platform/crypto';
import { makePayload } from '../core/model';
import { SAFE_MAIN_PATH } from '../services/cipher-repository';

const native = vi.hoisted(() => ({ raw: null as string | null, reads: 0 }));
vi.mock('../../../host/obsidian/storage/private-storage', () => ({ desktopVaultRoot: () => '/health-safe', privateVaultStorage: (app: { vault: { adapter: unknown } }) => app.vault.adapter }));
vi.mock('../platform/desktop/cipher-files', () => ({ createCipherFiles: () => ({
	read: async (name: string) => { native.reads++; return name === 'vault.enc' ? native.raw : null; },
	stage: async () => { throw new Error('Health must not write'); }, publish: async () => { throw new Error('Health must not publish'); }, discard: async () => {},
}) }));
vi.mock('../platform/desktop/actions', () => ({ createDesktopActions: () => ({}) }));

test.each([false, true])('real safe module advertises read-only health after activation (container=%s)', async exists => {
	native.raw = exists ? (await createContainer('Fixture-Master-Only-123!', makePayload([]))).raw : null;
	native.reads = 0;
	const initial = native.raw ? { [SAFE_MAIN_PATH]: native.raw } : {};
	const vault = memoryVault(initial, { setTimeout, clearTimeout });
	const writes = [vi.spyOn(vault.adapter, 'write'), vi.spyOn(vault.adapter, 'remove'), vi.spyOn(vault.adapter, 'mkdir'), vi.spyOn(vault.app.vault, 'create'), vi.spyOn(vault.app.vault, 'process')];
	const read = vi.spyOn(vault.adapter, 'read'), stat = vi.spyOn(vault.adapter, 'stat');
	const settings = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: setTimeout, clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) } });
	const events = new DomainEvents(), errors: unknown[] = [];
	const commands = new Map<string, Command>();
	let enabled = true, invalidations = 0;
	events.on(HEALTH_INVALIDATED, () => { invalidations++; });
	const registry = new ModuleRegistry(MANIFESTS.filter(row => row.id === 'safe' || row.id === 'health'), {
		env: { desktop: true, mobile: false, phone: false }, enabled: id => id !== 'safe' || enabled,
		createContext: (manifest, services, contributions) => ({ id: manifest.id, app: vault.app, services, contributions, settings, events, env: { desktop: true, mobile: false, phone: false }, commands: { add: (command: Command) => { commands.set(command.id, command); return command; } } }) as unknown as ModuleContext,
		releaseContext: () => {}, report: (_id, _phase, error) => errors.push(error),
	});
	try {
		await registry.apply(['layout-ready']);
		const scanner = registry.services.peek(HEALTH_SCANNER)!;
		expect(await scanner.providers()).toEqual([]);
		await registry.activate('safe');
		expect(errors).toEqual([]);
		expect((await scanner.providers()).map(provider => provider.id)).toEqual(['safe.container']);
		const priorReads = native.reads;
		const report = await scanner.scan();
		expect(report.sections[0]?.status).toBe(exists ? 'locked' : 'warning');
		if (exists) { expect(stat).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled(); }
		else expect(report.sections[0]?.issues.map(issue => issue.code)).toEqual(['missing']);
		expect(native.reads).toBe(priorReads);
		expect(scanner.snapshot.report?.stale).toBe(false);
		commands.get('safe-lock')?.callback?.();
		expect(scanner.snapshot.report?.stale).toBe(true);
		enabled = false;
		await registry.apply(['layout-ready']);
		expect((await scanner.scan({ providerIds: ['safe.container'] })).sections[0]?.status).toBe('unavailable');
		const stopped = invalidations;
		commands.get('safe-lock')?.callback?.();
		expect(invalidations).toBe(stopped);
		for (const write of writes) expect(write).not.toHaveBeenCalled();
		expect(Object.fromEntries(vault.contents)).toEqual(initial);
		expect(errors).toEqual([]);
	} finally { await registry.dispose(); events.dispose(); await settings.dispose(); vi.restoreAllMocks(); }
});
