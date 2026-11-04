import type { App } from 'obsidian';
import { expect, test, vi } from 'vitest';
import { createNotificationChannels } from './delivery';
import { NotificationChannelRegistry } from '../core/channels';

const notices = vi.hoisted(() => [] as Array<{ text: string; containerEl: { isConnected: boolean }; hide(): void }>);
vi.mock('obsidian', async importOriginal => ({
	...await importOriginal<typeof import('obsidian')>(),
	Notice: class {
		containerEl = { isConnected: true };
		constructor(readonly text: string) { notices.push(this); }
		hide() { this.containerEl.isConnected = false; }
	},
}));

test('built-in channels keep native content and events, then release native handles and ignore late callbacks', async () => {
	notices.length = 0;
	const native: NativeNotification[] = [];
	class NativeNotification {
		onerror: (() => void) | null = null;
		onclick: (() => void) | null = null;
		onclose: (() => void) | null = null;
		closed = false;
		constructor(readonly title: string, readonly options: { body: string; tag: string }) { native.push(this); }
		close() { this.closed = true; }
	}
	const app = { workspace: { containerEl: { win: { Notification: NativeNotification } } } } as unknown as App;
	const delivery = new NotificationChannelRegistry();
	for (const channel of createNotificationChannels(app)) delivery.register(channel, true);
	const opened: string[] = [];
	let failures = 0;
	const events = { open: async () => { opened.push('opened'); }, failed: () => { failures++; } };
	const request = { id: 'native-one', title: 'Snapshot title', body: 'Snapshot body', channels: ['in-app', 'system'] };
	try {
		expect(delivery.available('in-app')).toBe(true);
		expect(delivery.available('system')).toBe(true);
		await delivery.send('in-app', request, events);
		await delivery.send('system', request, events);
		expect(notices[0]?.text).toBe('Snapshot title\nSnapshot body');
		expect(native[0]?.title).toBe('Snapshot title');
		expect(native[0]?.options).toEqual({ body: 'Snapshot body', tag: 'native-one' });
		native[0]!.onerror?.(); native[0]!.onclick?.();
		expect(failures).toBe(1);
		expect(opened).toEqual(['opened']);
		const lateError = native[0]!.onerror, lateClick = native[0]!.onclick;
		delivery.dispose();
		expect(notices[0]?.containerEl.isConnected).toBe(false);
		expect(native[0]?.closed).toBe(true);
		expect(native[0]?.onclick).toBeNull();
		lateError?.(); lateClick?.();
		expect(failures).toBe(1);
		expect(opened).toEqual(['opened']);
	} finally { delivery.dispose(); notices.length = 0; }
});
