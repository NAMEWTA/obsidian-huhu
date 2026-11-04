import { expect, test } from 'vitest';
import { createNotificationOpeners } from './openers';
import { NotificationService } from './service';
import type { NotificationOpener } from '../api';

test('health targets open through their own contribution without automation or run IDs', async () => {
	const opened: string[] = [];
	const openers: NotificationOpener[] = [
		{ canOpen: () => true, open: async () => { opened.push('wrong-automation-opener'); }, describe: () => ({ state: 'deleted' }) },
		{ kind: 'health', canOpen: row => row.target?.kind === 'health', open: async row => { if (row.target?.kind === 'health') opened.push(row.target.reportId); }, describe: () => ({ state: 'current', name: 'Health report' }) },
	];
	const routing = createNotificationOpeners(async () => openers);
	const files = new Map<string, string>();
	const inbox = new NotificationService({ exists: async path => files.has(path), read: async path => files.get(path)!, write: async (path, value) => { files.set(path, value); }, mkdir: async () => {} }, 'inbox.json', routing.open, { available: () => true, send: () => {}, dispose: () => {} }, routing.canOpen, routing.describe);
	await inbox.load();
	await inbox.send({ id: 'health-one', title: 'Scan finished', body: 'One warning', source: { kind: 'health', id: 'scan-one' }, target: { kind: 'health', reportId: 'scan-one' }, channels: [] });
	const record = inbox.records[0]!;
	expect(await inbox.canOpen(record)).toBe(true);
	expect(await inbox.describe(record)).toEqual({ state: 'current', name: 'Health report' });
	await inbox.open(record);
	expect(opened).toEqual(['scan-one']);
	expect(inbox.unread).toBe(0);
	openers.splice(1);
	expect(await inbox.canOpen(record)).toBe(false);
	await inbox.shutdown();
});
