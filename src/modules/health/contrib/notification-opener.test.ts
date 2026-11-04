import { expect, test, vi } from 'vitest';
import { healthNotificationOpener } from './notification-opener';
import { NotificationService } from '../../notifications/core/service';
import { createNotificationOpeners } from '../../notifications/core/openers';
import type { NotificationRequest } from '../../notifications/api';
import type { TextStorage } from '../../../shared/storage/ports';

test('health inbox survives reload and its persisted target opens the health report, never automation', async () => {
	const files = new Map<string, string>();
	const storage: TextStorage = { exists: async path => files.has(path), read: async path => files.get(path)!, write: async (path, value) => { files.set(path, value); }, mkdir: async () => {} };
	let active = true;
	const open = vi.fn(async () => {}), automation = vi.fn();
	const health = healthNotificationOpener(open, () => active);
	const openers = createNotificationOpeners(async () => [{ canOpen: () => true, open: automation }, health]);
	const delivery = { available: () => false, send: () => {}, dispose: () => {} };
	const request: NotificationRequest = { id: 'health-one', title: 'Data health', body: 'Error · Checked 8 · Excluded 2', channels: [], source: { kind: 'health', id: 'report-one' }, target: { kind: 'health', reportId: 'report-one' } };
	const first = new NotificationService(storage, 'inbox.json', openers.open, delivery);
	await first.load(); await first.send(request); await first.shutdown();
	const restarted = new NotificationService(storage, 'inbox.json', openers.open, delivery);
	try {
		await restarted.load(); expect(restarted.records).toHaveLength(1);
		await restarted.open(restarted.records[0]!);
		expect(open).toHaveBeenCalledWith({ feature: 'health', section: 'scan', resourceId: 'report-one' }); expect(automation).not.toHaveBeenCalled();
		active = false; expect(health.canOpen(restarted.records[0]!)).toBe(false);
		active = true;
		expect(health.canOpen({ ...request, createdAt: 1, read: false, deliveries: {}, target: { kind: 'health', reportId: '../private' } })).toBe(false);
		expect(health.canOpen({ ...request, createdAt: 1, read: false, deliveries: {}, target: { kind: 'health', reportId: 'different-report' } })).toBe(false);
	} finally { await restarted.shutdown(); }
});
