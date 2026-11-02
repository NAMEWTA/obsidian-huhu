import { describe, expect, it, vi } from 'vitest';
import type { TextStorage } from '../../../shared/storage/ports';
import type { NotificationChannelId, NotificationRecord } from '../api';
import type { NotificationDelivery } from './ports';
import { NotificationService, notificationsRecoveryOwner } from './service';

class MemoryStorage implements TextStorage {
	readonly files = new Map<string, string>();
	failWrites = false;
	async exists(path: string) { return this.files.has(path); }
	async read(path: string) { return this.files.get(path)!; }
	async write(path: string, content: string) {
		if (this.failWrites) throw new Error('write failed');
		this.files.set(path, content);
	}
	async mkdir() {}
}

/** Delivery that counts submissions; `system` is unavailable unless enabled. */
const delivery = (system = false) => {
	const sent: Array<[NotificationChannelId, string]> = [];
	const adapter: NotificationDelivery = {
		available: (channel) => channel === 'in-app' || system,
		send: (channel, request) => { sent.push([channel, request.id]); },
		dispose: () => {},
	};
	return { adapter, sent };
};
const request = (id = 'run') => ({ id, title: 'Title', body: 'Body', channels: ['in-app', 'system'] as NotificationChannelId[] });

describe('NotificationService', () => {
	it('opener capability supports automations records without an automation target and changes with the sender', async () => {
		let active = true;
		const inbox = new NotificationService(new MemoryStorage(), 'inbox.json', async () => {}, delivery().adapter, async record => active && record.id.startsWith('automations:'));
		await inbox.load(); await inbox.send(request('automations:run:complete'));
		expect(inbox.records[0]!.target).toBeUndefined(); expect(inbox.records[0]!.source).toBeUndefined();
		expect(await inbox.canOpen(inbox.records[0]!)).toBe(true);
		let redraws = 0; inbox.subscribe(() => { redraws++; });
		active = false; inbox.refreshOpeners();
		expect(await inbox.canOpen(inbox.records[0]!)).toBe(false); expect(redraws).toBe(1);
		await inbox.shutdown();
	});
	it('delivers each request id once, across concurrent calls and restarts', async () => {
		const disk = new MemoryStorage();
		const { adapter, sent } = delivery();
		const inbox = new NotificationService(disk, 'inbox.json', async () => {}, adapter);
		await inbox.load();
		await Promise.all([inbox.send(request()), inbox.send(request())]);
		expect(inbox.records).toHaveLength(1);
		expect(inbox.records[0]?.deliveries).toEqual({ 'in-app': 'sent', system: 'failed' });
		const reloaded = new NotificationService(disk, 'inbox.json', async () => {}, adapter);
		await reloaded.load();
		await reloaded.send(request());
		expect(reloaded.records).toHaveLength(1);
		expect(sent).toEqual([['in-app', 'run']]);
	});

	it('keeps delivery receipts after read records are cleared', async () => {
		const disk = new MemoryStorage();
		const { adapter } = delivery();
		const first = new NotificationService(disk, 'inbox.json', async () => {}, adapter);
		await first.load();
		disk.failWrites = true;
		await expect(first.send(request('once'))).rejects.toThrow();
		expect(first.records).toHaveLength(0);
		disk.failWrites = false;
		await first.send(request('once'));
		await Promise.all([first.markRead(), first.clearRead()]);
		expect(first.records).toHaveLength(0);
		const second = new NotificationService(disk, 'inbox.json', async () => {}, adapter);
		await second.load();
		await second.send(request('once'));
		expect(second.records).toHaveLength(0);
	});

	it('refuses changes while the inbox file is unreadable and recovers on a later load', async () => {
		const disk = new MemoryStorage();
		disk.files.set('inbox.json', '{broken');
		const inbox = new NotificationService(disk, 'inbox.json', async () => {}, delivery().adapter);
		await expect(inbox.load()).rejects.toThrow();
		await expect(inbox.markRead()).rejects.toThrow();
		await expect(inbox.clearRead()).rejects.toThrow();
		let changed = 0;
		inbox.subscribe(() => { changed++; });
		disk.files.set('inbox.json', JSON.stringify({ records: [], receipts: {} }));
		await inbox.load();
		expect(changed).toBe(1);
		await inbox.send(request('retry'));
		expect(inbox.unread).toBe(1);
	});

	it('records a submission interrupted by shutdown as unknown and never replays it', async () => {
		const disk = new MemoryStorage();
		const { adapter, sent } = delivery(true);
		const inbox = new NotificationService(disk, 'inbox.json', async () => {}, adapter);
		await inbox.load();
		const sending = inbox.send({ ...request('queued'), channels: ['in-app'] });
		const closing = inbox.shutdown();
		await sending;
		await closing;
		expect(sent).toEqual([]);
		expect(JSON.parse(disk.files.get('inbox.json')!).receipts.queued['in-app']).toBe('unknown');
		await expect(inbox.markRead()).rejects.toThrow(/shutting down/);
	});

	it('opens a record through the opener, then marks it read', async () => {
		const opened: string[] = [];
		const inbox = new NotificationService(new MemoryStorage(), 'inbox.json', async (record: NotificationRecord) => { opened.push(record.id); }, delivery().adapter);
		await inbox.load();
		await inbox.send(request('open-me'));
		await inbox.open(inbox.records[0]!);
		expect(opened).toEqual(['open-me']);
		expect(inbox.unread).toBe(0);
	});
});

describe('NotificationService recovery owner', () => {
	const path = '.huhu/notifications/device/inbox.json';
	it('owns exactly its file; the hold fails new sends visibly; resume reopens', async () => {
		const disk = new MemoryStorage();
		const { adapter, sent } = delivery();
		const inbox = new NotificationService(disk, path, async () => {}, adapter);
		await inbox.load();
		const owner = notificationsRecoveryOwner(inbox, path);
		expect(owner.owns(path)).toBe(true);
		expect(owner.owns('.huhu/notifications/other/inbox.json')).toBe(false);
		await owner.quiesce('t');
		await expect(inbox.send(request('late'))).rejects.toThrow('notifications-recovery-busy');
		await expect(inbox.markRead()).rejects.toThrow('notifications-recovery-busy');
		expect(sent).toEqual([]);
		await owner.release('t');
		await inbox.send(request('after'));
		expect(sent).toEqual([['in-app', 'after']]);
		await owner.release('t');
	});

	it('drain is strict and waits for admitted work', async () => {
		const disk = new MemoryStorage();
		const inbox = new NotificationService(disk, path, async () => {}, delivery().adapter);
		await inbox.load();
		disk.failWrites = true;
		await expect(inbox.send(request('x'))).rejects.toThrow('write failed');
		await expect(inbox.drainWrites()).rejects.toThrow('write failed');
	});

	it('adopting a replaced file sends nothing and keeps receipts that have no record', async () => {
		const disk = new MemoryStorage();
		const { adapter, sent } = delivery();
		const inbox = new NotificationService(disk, path, async () => {}, adapter);
		await inbox.load();
		disk.files.set(
			path,
			JSON.stringify({
				records: [{ id: 'kept', title: 't', body: 'b', channels: ['in-app'], createdAt: 1, read: false, deliveries: { 'in-app': 'unknown' } }],
				receipts: { kept: { 'in-app': 'unknown' }, cleared: { 'in-app': 'sent' } },
			}),
		);
		await inbox.adoptFromDisk();
		expect(inbox.records.map((r) => r.id)).toEqual(['kept']);
		await inbox.send(request('cleared'));
		await inbox.send(request('kept'));
		expect(sent).toEqual([]);
		expect(inbox.records).toHaveLength(1);
	});

	it('a failure the system reports while held is applied after the hold, not dropped', async () => {
		const disk = new MemoryStorage();
		let report: (() => void) | undefined;
		const adapter: NotificationDelivery = {
			available: () => true,
			send: (_channel, _record, handlers) => {
				report = handlers.failed;
			},
			dispose: () => {},
		};
		const inbox = new NotificationService(disk, path, async () => {}, adapter);
		await inbox.load();
		await inbox.send({ ...request('late'), channels: ['in-app'] });
		expect(inbox.records[0]!.deliveries['in-app']).toBe('sent');
		inbox.quiesceWrites();
		report!();
		expect(inbox.records[0]!.deliveries['in-app']).toBe('sent');
		inbox.resumeWrites();
		await vi.waitFor(() => expect(inbox.records[0]!.deliveries['in-app']).toBe('failed'));
	});

	it('reports a send in flight as busy work', async () => {
		const disk = new MemoryStorage();
		let release!: () => void;
		const adapter: NotificationDelivery = {
			available: () => true,
			send: () => new Promise<void>((resolve) => (release = resolve)),
			dispose: () => {},
		};
		const inbox = new NotificationService(disk, path, async () => {}, adapter);
		await inbox.load();
		const pending = inbox.send({ ...request('slow'), channels: ['in-app'] });
		await vi.waitFor(() => expect(inbox.busyWork()).toEqual(['notifications:1']));
		release();
		await pending;
		expect(inbox.busyWork()).toEqual([]);
	});
});
