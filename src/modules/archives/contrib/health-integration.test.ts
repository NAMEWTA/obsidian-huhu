import { expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../../app/contracts/module';
import { MANIFESTS } from '../../../app/manifests';
import { ModuleRegistry } from '../../../app/modules/registry';
import { SettingsStore } from '../../../shared/settings/store';
import { DomainEvents } from '../../../shared/events/domain-events';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { HEALTH_SCANNER } from '../../health/api';
import { ARCHIVES_CATALOG, BELONGING_TYPE_ID } from '../api';
import { memoryArchives } from '../services/generic/test-port';
import { ArchivesApplication } from '../services/generic/application';
import { patchProperties } from '../core/generic/markdown';

test('shipped archive contributions are discovered by the shipped scanner and scan without any vault writes', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	await app.commands.belongings.install();
	const created = await app.commands.create({ operationId: 'integration-item', typeId: BELONGING_TYPE_ID, values: { name: 'PRIVATE' } });
	const initial = Object.fromEntries(f.files.text);
	initial[created.path] = patchProperties(initial[created.path]!, { status: 'idle' });
	f.runtime.dispose();
	const vault = memoryVault(initial, { setTimeout, clearTimeout });
	Object.assign(vault.app.workspace, { onLayoutReady: (callback: () => void) => callback() });
	const spies = [vi.spyOn(vault.adapter, 'write'), vi.spyOn(vault.adapter, 'remove'), vi.spyOn(vault.adapter, 'mkdir'), vi.spyOn(vault.app.vault, 'create'), vi.spyOn(vault.app.vault, 'process')];
	const save = vi.fn(async (_scope, file) => file);
	const settings = new SettingsStore({ load: async () => null, save }, { timers: { set: setTimeout, clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) } });
	const events = new DomainEvents(), releases = new Map<string, Array<() => void>>(), errors: unknown[] = [];
	const registry = new ModuleRegistry(MANIFESTS.filter(row => row.id === 'archives' || row.id === 'health'), {
		env: { desktop: true, mobile: false, phone: false }, enabled: () => true,
		createContext: (manifest, services, contributions) => {
			const cleanups: Array<() => void> = []; releases.set(manifest.id, cleanups);
			return { id: manifest.id, app: vault.app, services, contributions, settings, events,
				commands: { add: () => {} }, shell: { refresh: () => {} }, lifetime: { register: (cleanup: () => void) => { cleanups.push(cleanup); } } } as unknown as ModuleContext;
		},
		releaseContext: context => { for (const cleanup of releases.get(context.id) ?? []) cleanup(); },
		report: (_id, _phase, error) => errors.push(error),
	});
	try {
		await registry.apply(['startup', 'layout-ready']);
		await vi.waitFor(() => expect(registry.services.peek(ARCHIVES_CATALOG)?.snapshot().types.find(type => type.id === BELONGING_TYPE_ID)?.count).toBe(1));
		const scanner = registry.services.peek(HEALTH_SCANNER)!;
		expect((await scanner.providers()).map(row => row.id)).toEqual(['archives.integrity', 'archives.belongings']);
		const report = await scanner.scan();
		expect(report.sections.find(row => row.providerId === 'archives.belongings')?.issues.map(issue => issue.code)).toEqual(['projection-mismatch']);
		expect(JSON.stringify(report)).not.toContain('PRIVATE');
		for (const spy of [...spies, save]) expect(spy).not.toHaveBeenCalled();
		expect(Object.fromEntries(vault.contents)).toEqual(initial);
		expect(errors).toEqual([]);
	} finally { await registry.dispose(); events.dispose(); await settings.dispose(); vi.restoreAllMocks(); }
});
