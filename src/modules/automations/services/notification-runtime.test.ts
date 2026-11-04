import { expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../../app/contracts/module';
import type { AutomationDefinition } from '../../../shared/automation/types';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { NotificationService } from '../../notifications/core/service';
import { notificationInboxPath, type NotificationRequest } from '../../notifications/api';
import { createAutomationRuntime } from './runtime';
import { createNotificationOpeners } from '../../notifications/core/openers';

vi.mock('../../../host/obsidian/storage/device-id', async importOriginal => ({ ...await importOriginal<typeof import('../../../host/obsidian/storage/device-id')>(), deviceId: () => 'automation-notification-test' }));

test('the real automation runtime commits and publishes typed notification snapshots through the real inbox', async () => {
	const win = { setInterval: () => 1, setTimeout: () => 2, clearTimeout: () => {} };
	const vault = memoryVault({}, win);
	Object.assign(vault.app.vault, { getName: () => 'Fixture' });
	Object.assign(vault.app.workspace, { layoutReady: true, onLayoutReady: () => {}, getMostRecentLeaf: () => undefined });
	const cleanups: Array<() => void> = [];
	const navigation: unknown[] = [];
	const context = {
		app: vault.app, shell: { open: async (target: unknown) => { navigation.push(target); } },
		services: { peek: () => undefined }, contributions: { collect: async () => [] },
		lifetime: { register: (cleanup: () => void) => cleanups.push(cleanup), registerInterval: () => {}, registerDomEvent: () => {}, registerEvent: (ref: Parameters<typeof vault.app.vault.offref>[0]) => cleanups.push(() => vault.app.vault.offref(ref)) },
	} as unknown as ModuleContext;
	const sent: NotificationRequest[] = [];
	let runtime: Awaited<ReturnType<typeof createAutomationRuntime>> | undefined;
	const inbox = new NotificationService(vault.adapter, notificationInboxPath('automation-notification-test'), async row => runtime?.opener.open(row), { available: () => true, send: (_channel, request) => { sent.push(structuredClone(request)); }, dispose: () => {} });
	try {
		await inbox.load();
		runtime = await createAutomationRuntime(context, request => inbox.send(request));
		const definition: AutomationDefinition = { id: 'typed-notice', name: 'Admission name', enabled: true, deviceId: 'automation-notification-test', revision: 1, schedule: { kind: 'manual' }, action: { kind: 'notify', body: 'Intentional reminder' }, channels: ['in-app'], notifyOn: 'always', graceMinutes: 0, createdAt: 1, updatedAt: 1 };
		await runtime.service.save(definition);
		const run = await runtime.service.run(definition);
		expect(run?.status).toBe('succeeded');
		expect(sent).toHaveLength(1);
		expect(sent[0]?.source).toEqual({ kind: 'automation-run', id: run!.id });
		expect(sent[0]?.target).toMatchObject({ kind: 'automation-run', runId: run!.id, automationId: definition.id });
		expect(sent[0]?.title).toBe('Admission name');
		expect(sent[0]?.body).toContain('Intentional reminder');
		await inbox.open(inbox.records[0]!);
		expect(navigation).toEqual([{ feature: 'automations', section: 'runs', resourceId: run!.id }]);
		expect(inbox.unread).toBe(0);
	} finally {
		await runtime?.shutdown('unload'); await inbox.shutdown();
		for (const cleanup of cleanups.reverse()) cleanup();
	}
});

test('source-only automation notifications cannot open or become read, while legacy targets still open', async () => {
	const vault = memoryVault({}, { setInterval: () => 1, setTimeout: () => 2, clearTimeout: () => {} });
	Object.assign(vault.app.vault, { getName: () => 'Fixture' });
	Object.assign(vault.app.workspace, { layoutReady: true, onLayoutReady: () => {}, getMostRecentLeaf: () => undefined });
	const cleanups: Array<() => void> = [];
	const navigation: unknown[] = [];
	const sources: unknown[] = [];
	const context = {
		app: vault.app, shell: { open: async (target: unknown) => { navigation.push(target); } },
		services: { peek: () => undefined },
		contributions: { collect: async () => [{ value: { kinds: ['widget'], open: async (source: unknown) => { sources.push(source); } } }] },
		lifetime: { register: (cleanup: () => void) => cleanups.push(cleanup), registerInterval: () => {}, registerDomEvent: () => {}, registerEvent: (ref: Parameters<typeof vault.app.vault.offref>[0]) => cleanups.push(() => vault.app.vault.offref(ref)) },
	} as unknown as ModuleContext;
	let runtime: Awaited<ReturnType<typeof createAutomationRuntime>> | undefined;
	const routing = createNotificationOpeners(async () => runtime ? [runtime.opener] : []);
	const path = notificationInboxPath('automation-notification-test');
	const inbox = new NotificationService(vault.adapter, path, routing.open, { available: () => true, send: () => {}, dispose: () => {} }, routing.canOpen);
	try {
		await inbox.load();
		runtime = await createAutomationRuntime(context, request => inbox.send(request));
		await inbox.send({ id: 'source-only', title: 'Run result', body: 'Finished', channels: [], source: { kind: 'automation-run', id: 'run-only' } });
		const record = inbox.records[0]!;
		expect(await inbox.canOpen(record)).toBe(false);
		await expect(runtime.opener.open(record)).rejects.toThrow();
		await expect(inbox.open(record)).rejects.toThrow();
		expect(navigation).toEqual([]);
		expect(sources).toEqual([]);
		expect(inbox.records[0]?.read).toBe(false);
		expect(inbox.unread).toBe(1);
		expect(JSON.parse(await vault.adapter.read(path)).records[0].read).toBe(false);

		await inbox.send({ id: 'legacy-run', title: 'Old run', body: '', channels: [], target: { runId: 'old-run', automationId: 'old-automation' } });
		await inbox.send({ id: 'legacy-source', title: 'Old source', body: '', channels: [], source: { kind: 'widget', path: 'board.md', id: 'old-widget' } });
		for (const legacy of inbox.records.slice(1)) {
			expect(await inbox.canOpen(legacy)).toBe(true);
			await inbox.open(legacy);
		}
		expect(navigation).toEqual([{ feature: 'automations', section: 'runs', resourceId: 'old-run' }]);
		expect(sources).toEqual([{ kind: 'widget', path: 'board.md', id: 'old-widget' }]);
		expect(inbox.records.map(row => row.read)).toEqual([false, true, true]);
		expect(JSON.parse(await vault.adapter.read(path)).records.map((row: { read: boolean }) => row.read)).toEqual([false, true, true]);
	} finally {
		await runtime?.shutdown('unload'); await inbox.shutdown();
		for (const cleanup of cleanups.reverse()) cleanup();
	}
});
