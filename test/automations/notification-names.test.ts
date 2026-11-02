import { beforeEach, expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../src/app/contracts/module';
import type { AutomationDefinition, AutomationRun } from '../../src/shared/automation/types';
import type { NotificationRequest } from '../../src/modules/notifications/api';
import { NotificationService, notificationBody } from '../../src/modules/notifications/core/service';
import { setLanguage, t } from '../../src/shared/i18n';

const captured = vi.hoisted(() => ({ publish: undefined as undefined | ((run: AutomationRun, definition: AutomationDefinition) => Promise<void>) }));
vi.mock('../../src/host/obsidian/storage/device-id', () => ({ deviceId: () => 'device' }));
vi.mock('../../src/host/obsidian/storage/private-storage', () => ({ privateVaultStorage: () => ({}) }));
vi.mock('../../src/modules/automations/platform/definitions', () => ({ MarkdownAutomationDefinitions: class {} }));
vi.mock('../../src/modules/automations/core/service', () => ({
	AutomationService: class {
		constructor(...args: unknown[]) {
			captured.publish = args[5] as typeof captured.publish;
			throw new Error('notification-callback-captured');
		}
	},
	automationRecoveryOwners: vi.fn(),
}));
import { createAutomationRuntime } from '../../src/modules/automations/services/runtime';

const definition = (name = 'At admission'): AutomationDefinition => ({
	id: 'automation:stable', revision: 1, name, enabled: true, deviceId: 'device',
	schedule: { kind: 'manual' }, action: { kind: 'notify', body: 'Explicit reminder' },
	channels: ['in-app'], notifyOn: 'always', graceMinutes: 0, createdAt: 1, updatedAt: 1,
});
const run = (d: AutomationDefinition, patch: Partial<AutomationRun> = {}): AutomationRun => ({
	id: 'run:one', automationId: d.id, revision: d.revision, title: d.name, definition: structuredClone(d),
	scheduledFor: 1, trigger: 'manual', status: 'failed', startedAt: 1, endedAt: 2, message: '', ...patch,
});
async function publisher(send: (request: NotificationRequest) => Promise<void>) {
	await expect(createAutomationRuntime({ app: { vault: { adapter: {}, getName: () => "Fixture" } }, services: { peek: () => undefined } } as unknown as ModuleContext, send)).rejects.toThrow('notification-callback-captured');
	return captured.publish!;
}
beforeEach(() => { setLanguage('en'); });

test('runtime adapter uses the admitted name and safe result, not current definition or raw failure data', async () => {
	const sent: NotificationRequest[] = [];
	const publish = await publisher(async request => { sent.push(request); });
	const admitted = { ...definition(), action: { kind: 'create-task' as const, text: 'private-action-parameter', timezone: 'UTC' } };
	await publish(run(admitted, { message: 'token=secret-canary', errorCode: 'operationFailed', errorParams: { detail: 'secret-canary' } }), { ...admitted, name: 'Renamed later' });
	expect(sent[0]?.title).toBe('At admission');
	expect(sent[0]?.body).toBe(t('automation.failed'));
	expect(JSON.stringify(sent)).not.toContain('secret-canary');
	expect(JSON.stringify(sent)).not.toContain('private-action-parameter');
	expect(sent[0]?.target).toMatchObject({ automationId: admitted.id, runId: 'run:one' });
});

test('blank admitted names are localized and historical run titles outrank a renamed definition', async () => {
	const sent: NotificationRequest[] = [];
	const publish = await publisher(async request => { sent.push(request); });
	const empty = definition(' \n ');
	await publish(run(empty), empty);
	expect(sent[0]?.title).toBe('Unnamed automation');
	const old = run(definition('Historical name')); delete old.definition;
	await publish(old, definition('Present name'));
	expect(sent[1]?.title).toBe('Historical name');
	setLanguage('zh');
	await publish(run(empty, { id: 'run:zh' }), empty);
	expect(sent[2]?.title).toBe('未命名自动化');
});

test('failed delivery retains the immutable notification and stable association across real JSON reload and dedupe', async () => {
	const files = new Map<string, string>();
	const storage = { exists: async (path: string) => files.has(path), read: async (path: string) => files.get(path)!, write: async (path: string, value: string) => { files.set(path, value); }, mkdir: async () => {} };
	const delivery = { available: () => true, send: vi.fn(async () => { throw new Error('toast expired'); }), dispose: () => {} };
	const inbox = new NotificationService(storage, 'inbox.json', async () => {}, delivery);
	await inbox.load();
	const publish = await publisher(request => inbox.send(request));
	const d = definition('x'.repeat(1000));
	await publish(run(d), d);
	await publish(run(d), { ...d, name: 'New name' });
	const reopened = new NotificationService(storage, 'inbox.json', async () => {}, delivery);
	await reopened.load();
	expect(reopened.records).toHaveLength(1);
	expect(reopened.records[0]).toMatchObject({ title: d.name, read: false, deliveries: { 'in-app': 'failed' }, target: { automationId: d.id, runId: 'run:one' } });
	expect(notificationBody(reopened.records[0]!)).toBe(t('automation.failed'));
	expect(reopened.unread).toBe(1);
	expect(delivery.send).toHaveBeenCalledTimes(1);
	await inbox.shutdown(); await reopened.shutdown();
});

test('intentional reminder text and result come from the same admitted snapshot', async () => {
	const sent: NotificationRequest[] = [];
	const publish = await publisher(async request => { sent.push(request); });
	const admitted = definition('Remember');
	await publish(run(admitted, { status: 'succeeded' }), { ...admitted, action: { kind: 'notify', body: 'Edited later' } });
	expect(sent[0]?.body).toBe(`${t('automation.succeeded')}${t('automation.colon')}Explicit reminder`);
	expect(JSON.stringify(sent)).not.toContain('Edited later');
});

test('real service persists admission before gated result and late renamed/deleted histories keep their names', async () => {
	const { AutomationService } = await vi.importActual<typeof import('../../src/modules/automations/core/service')>('../../src/modules/automations/core/service');
	const files = new Map<string, string>();
	const storage = { exists: async (path: string) => files.has(path), read: async (path: string) => files.get(path)!, write: async (path: string, value: string) => { files.set(path, value); }, mkdir: async () => {} };
	const delivered: NotificationRequest[] = [];
	const inbox = new NotificationService(storage, 'inbox.json', async () => {}, { available: () => true, send: (_channel, request) => { delivered.push(structuredClone(request)); }, dispose: () => {} });
	await inbox.load();
	const publish = await publisher(request => inbox.send(request));
	let finish!: () => void;
	const gate = new Promise<void>(resolve => { finish = resolve; });
	const createTask = vi.fn(async () => { await gate; return { message: 'private-output-canary' }; });
	const sources = { list: async () => [], save: async () => {}, remove: async () => {}, open: async () => {}, createTask };
	const service = new AutomationService(storage, 'runtime.json', 'device', sources, () => undefined, publish);
	await service.load();
	const admitted = { ...definition('Same name'), action: { kind: 'create-task' as const, text: 'private-action-canary', timezone: 'UTC' } };
	await service.save(admitted);
	const first = service.run(admitted);
	await vi.waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
	expect(delivered).toEqual([]);
	const pending = JSON.parse(files.get('runtime.json')!) as { runs: AutomationRun[] };
	expect(pending.runs[0]?.definition?.name).toBe('Same name');
	admitted.name = 'Changed while running';
	await service.save(admitted);
	finish(); await first;
	expect(delivered[0]).toMatchObject({ title: 'Same name', body: t('automation.succeeded'), target: { automationId: admitted.id } });
	expect(JSON.stringify(delivered)).not.toContain('private-');
	await service.remove(admitted);
	await service.shutdown();
	// A crash after terminal persistence but before notification bookkeeping is
	// replayed from run.definition, even after the current definition was removed.
	const history = JSON.parse(files.get('runtime.json')!) as { runs: AutomationRun[] };
	delete history.runs[0]!.notificationAttempted;
	files.set('runtime.json', JSON.stringify(history));
	const reopened = new AutomationService(storage, 'runtime.json', 'device', sources, () => undefined, publish);
	await reopened.load();
	expect(reopened.definitions).toEqual([]);
	expect(inbox.records).toHaveLength(1); // stable run id deduplicates the late replay
	expect(inbox.records[0]?.title).toBe('Same name');
	// Repeated runs and a distinct automation with the same name remain distinct.
	await reopened.save(admitted);
	await reopened.run(admitted);
	const duplicateName = { ...admitted, id: 'automation:other' };
	await reopened.save(duplicateName); await reopened.run(duplicateName);
	expect(inbox.records).toHaveLength(3);
	expect(new Set(inbox.records.map(row => row.id)).size).toBe(3);
	expect(inbox.records.slice(1).map(row => row.target?.automationId)).toEqual([admitted.id, duplicateName.id]);
	await reopened.shutdown(); await inbox.shutdown();
});

test('old inbox records without new metadata keep their saved title/body and read state', async () => {
	const row = { id: 'old-run', title: 'Old saved title', body: 'Old saved body', channels: ['in-app'], createdAt: 1, read: true, deliveries: { 'in-app': 'sent' }, target: { runId: 'old-run', automationId: 'removed-id' } };
	const content = JSON.stringify({ records: [row], receipts: { 'old-run': row.deliveries } });
	const storage = { exists: async () => true, read: async () => content, write: vi.fn(async () => {}), mkdir: async () => {} };
	const inbox = new NotificationService(storage, 'inbox.json', async () => {}, { available: () => true, send: vi.fn(), dispose: () => {} });
	await inbox.load();
	expect(inbox.records[0]).toEqual(row);
	expect(notificationBody(inbox.records[0]!)).toBe('Old saved body');
	expect(inbox.unread).toBe(0); expect(storage.write).not.toHaveBeenCalled();
	await inbox.shutdown();
});


test('late notification after actual definition deletion still uses the durable admitted name', async () => {
 const { AutomationService } = await vi.importActual<typeof import('../../src/modules/automations/core/service')>('../../src/modules/automations/core/service');
 const files = new Map<string, string>();
 const storage = { exists: async (path: string) => files.has(path), read: async (path: string) => files.get(path)!, write: async (path: string, value: string) => { files.set(path, value); }, mkdir: async () => {} };
 const sent: NotificationRequest[] = [];
 const publish = await publisher(async request => {sent.push(request);});
 let allowDelivery!: () => void, entered!: () => void;
 const held = new Promise<void>(resolve => {allowDelivery = resolve;});
 const enteredDelivery = new Promise<void>(resolve => {entered = resolve;});
 const service = new AutomationService(storage, 'runtime.json', 'device', {list: async () => [], save: async () => {}, remove: async () => {}, open: async () => {}, createTask: async () => {}}, () => undefined, async (completed, snapshot) => {entered(); await held; await publish(completed, snapshot);});
 await service.load();
 const admitted = definition('Deleted before delivery');
 await service.save(admitted);
 const executing = service.run(admitted);
 await enteredDelivery;
 expect(sent).toEqual([]);
 await service.remove(admitted);
 expect(service.definitions).toEqual([]);
 allowDelivery(); await executing;
 expect(sent[0]).toMatchObject({title: 'Deleted before delivery', target: {automationId: admitted.id}});
 await service.shutdown();
});

test('legacy run missing definition never borrows current reminder text', async () => {
 const sent: NotificationRequest[] = [];
 const publish = await publisher(async request => {sent.push(request);});
 const historical = run(definition('Old run'), {status: 'succeeded'});
 delete historical.definition;
 await publish(historical, {...definition('Current name'), action: {kind: 'notify', body: 'Current private reminder'}});
 expect(sent[0]).toMatchObject({title: 'Old run', body: t('automation.succeeded')});
 expect(JSON.stringify(sent)).not.toContain('Current private reminder');
});
