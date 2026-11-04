import { expect, test, vi } from 'vitest';
import type { ModuleContext, ModuleInstance, ModuleManifest } from '../../../app/contracts/module';
import { ModuleRegistry } from '../../../app/modules/registry';
import { NOTIFICATION_CHANNELS, NOTIFICATION_INBOX, NOTIFICATION_OPENERS, type NotificationChannel, type NotificationDeliveryEvents, type NotificationOpener } from '../api';
import { notificationsManifest } from '../manifest';
import createNotificationsModule from '../module';
import type { NotificationService } from './service';

const disk = vi.hoisted(() => new Map<string, string>());
vi.mock('../../../host/obsidian/storage/device-id', () => ({ deviceId: () => 'notification-test-device' }));
vi.mock('../../../host/obsidian/storage/private-storage', () => ({ privateVaultStorage: () => ({ exists: async (path: string) => disk.has(path), read: async (path: string) => disk.get(path)!, write: async (path: string, text: string) => { disk.set(path, text); }, mkdir: async () => {} }) }));

test('real module contributions follow provider and inbox lifetimes without duplicate delivery after reactivation', async () => {
	disk.clear();
	const enabled = new Set(['home', 'notifications']);
	const callbacks = new WeakMap<object, Array<() => void>>();
	const sent: string[] = [], opened: string[] = [], errors: unknown[] = [];
	let late: NotificationDeliveryEvents | undefined;
	const channel: NotificationChannel = { id: 'contributed.test', available: () => true, send: (row, events) => { sent.push(row.id); late = events; } };
	const opener: NotificationOpener = { kind: 'health', canOpen: row => row.source?.kind === 'health', open: async row => { opened.push(row.id); } };
	const provider: ModuleManifest = {
		id: 'home', order: 1, icon: 'home', titleKey: 'home', descriptionKey: 'home', platforms: { desktop: true, mobile: true }, defaultEnabled: true, activation: 'startup',
		contributes: [NOTIFICATION_CHANNELS, NOTIFICATION_OPENERS],
		load: async () => ({ default: (): ModuleInstance => ({ contributions: [[NOTIFICATION_CHANNELS, channel], [NOTIFICATION_OPENERS, opener]], activate: () => {}, dispose: () => {} }) }),
	};
	const registry = new ModuleRegistry([provider, { ...notificationsManifest, load: async () => ({ default: createNotificationsModule }) }], {
		env: { desktop: true, mobile: false, phone: false }, enabled: id => enabled.has(id),
		createContext: (manifest, services, contributions) => {
			const context = { id: manifest.id, app: { workspace: { containerEl: { win: {} } } }, services, contributions, lifetime: { register: (cleanup: () => void) => { callbacks.get(context)!.push(cleanup); } } } as unknown as ModuleContext;
			callbacks.set(context, []); return context;
		},
		releaseContext: context => { for (const cleanup of callbacks.get(context) ?? []) cleanup(); callbacks.delete(context); },
		report: (_id, _phase, error) => { errors.push(error); },
	});
	try {
		await registry.apply(['startup']);
		expect(errors).toEqual([]);
		const inbox = registry.services.peek(NOTIFICATION_INBOX) as NotificationService;
		expect(inbox).toBeDefined();
		expect(inbox.available('contributed.test')).toBe(true);
		const request = { id: 'health-lifecycle', title: 'Health', body: 'Finished', source: { kind: 'health' as const, id: 'scan-one' }, target: { kind: 'health' as const, reportId: 'scan-one' }, channels: ['contributed.test'] };
		await inbox.send(request);
		await inbox.open(inbox.records[0]!);
		expect(opened).toEqual(['health-lifecycle']);
		expect(sent).toEqual(['health-lifecycle']);
		enabled.delete('home'); await registry.apply(['startup']);
		await vi.waitFor(() => expect(inbox.available('contributed.test')).toBe(false));
		expect(await inbox.canOpen(inbox.records[0]!)).toBe(false);
		late?.failed(); await inbox.drainWrites();
		expect(inbox.records[0]?.deliveries['contributed.test']).toBe('sent');
		enabled.delete('notifications'); await registry.apply(['startup']);
		expect(registry.services.peek(NOTIFICATION_INBOX)).toBeUndefined();
		await expect(inbox.send({ ...request, id: 'closed' })).rejects.toThrow('shutting down');
		enabled.add('home'); enabled.add('notifications'); await registry.apply(['startup']);
		const reopened = registry.services.peek(NOTIFICATION_INBOX) as NotificationService;
		await reopened.send(request);
		expect(sent).toEqual(['health-lifecycle']);
		expect(reopened.records[0]?.read).toBe(true);
		expect(disk.has('.huhu/notifications/notification-test-device/inbox.json')).toBe(true);
		expect(errors).toEqual([]);
	} finally { await registry.dispose(); disk.clear(); }
});
