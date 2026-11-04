import { expect, test } from 'vitest';
import { NotificationChannelRegistry } from './channels';
import { NotificationService } from './service';
import { notificationInboxPath } from '../api';

test('a contributed channel delivers once and persists its receipt across reload and revocation', async () => {
	const files = new Map<string, string>();
	const storage = { exists: async (path: string) => files.has(path), read: async (path: string) => files.get(path)!, write: async (path: string, text: string) => { files.set(path, text); }, mkdir: async () => {} };
	const channels = new NotificationChannelRegistry();
	const sent: string[] = [];
	const revoke = channels.register({ id: 'test-channel', available: () => true, send: row => { sent.push(row.id); } });
	expect(channels.available('test-channel')).toBe(true);
	const path = notificationInboxPath('device');
	const inbox = new NotificationService(storage, path, async () => {}, channels);
	await inbox.load();
	const request = { id: 'one', title: 'Title', body: 'Body', channels: ['test-channel'] };
	await Promise.all([inbox.send(request), inbox.send(request)]);
	expect(sent).toEqual(['one']);
	expect(inbox.records[0]?.deliveries).toEqual({ 'test-channel': 'sent' });
	const reloaded = new NotificationService(storage, path, async () => {}, channels);
	await reloaded.load(); await reloaded.send(request);
	expect(sent).toEqual(['one']);
	revoke(); revoke();
	expect(channels.available('test-channel')).toBe(false);
	await inbox.shutdown(); await reloaded.shutdown();
});

test('an unregistered channel is persisted as unavailable without throwing or replaying its reserved ID', async () => {
	const files = new Map<string, string>();
	const channels = new NotificationChannelRegistry();
	const sent: string[] = [];
	const inbox = new NotificationService({ exists: async path => files.has(path), read: async path => files.get(path)!, write: async (path, value) => { files.set(path, value); }, mkdir: async () => {} }, 'inbox.json', async () => {}, channels);
	await inbox.load();
	const request = { id: 'missing-one', title: 'Title', body: 'Body', channels: ['not-registered'] };
	await expect(inbox.send(request)).resolves.toBeUndefined();
	expect(inbox.records[0]?.deliveries).toEqual({ 'not-registered': 'unavailable' });
	channels.register({ id: 'not-registered', available: () => true, send: row => { sent.push(row.id); } });
	await inbox.send(request);
	expect(sent).toEqual([]);
	await inbox.send({ ...request, id: 'new-operation' });
	expect(sent).toEqual(['new-operation']);
	await inbox.shutdown();
});
