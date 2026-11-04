import type { NotificationChannel, NotificationChannelId, NotificationDeliveryEvents, NotificationRequest } from '../api';
import type { NotificationDelivery } from './ports';

export class NotificationChannelRegistry implements NotificationDelivery {
	private readonly channels = new Map<string, { channel: NotificationChannel; owned: boolean }>();
	private stopped = false;
	register(channel: NotificationChannel, owned = false): () => void {
		if (this.stopped || !/^[a-z][a-z0-9._-]*$/.test(channel.id)) throw new Error('notification-channel-invalid');
		if (this.channels.has(channel.id)) throw new Error('notification-channel-duplicate');
		const entry = { channel, owned };
		this.channels.set(channel.id, entry);
		return () => {
			if (this.channels.get(channel.id) !== entry) return;
			this.channels.delete(channel.id);
			if (owned) channel.dispose?.();
		};
	}
	registered(id: NotificationChannelId): boolean { return this.channels.has(id); }
	available(id: NotificationChannelId): boolean {
		try { return this.channels.get(id)?.channel.available() ?? false; }
		catch { return false; }
	}
	async send(id: NotificationChannelId, request: NotificationRequest, events: NotificationDeliveryEvents): Promise<void> {
		const entry = this.channels.get(id);
		if (!entry || !this.available(id)) throw new Error('notification-channel-unavailable');
		await entry.channel.send(request, {
			open: () => this.channels.get(id) === entry ? events.open() : Promise.resolve(),
			failed: () => { if (this.channels.get(id) === entry) events.failed(); },
		});
	}
	dispose(): void {
		if (this.stopped) return;
		this.stopped = true;
		const entries = [...this.channels.values()];
		this.channels.clear();
		for (const entry of entries) if (entry.owned) entry.channel.dispose?.();
	}
}
