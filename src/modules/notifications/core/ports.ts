import type { NotificationChannelId, NotificationRequest } from '../api';

export interface NotificationDelivery {
	/** Absent for existing test/host adapters that only expose availability. */
	registered?(channel: NotificationChannelId): boolean;
	available(channel: NotificationChannelId): boolean;
	send(
		channel: NotificationChannelId,
		request: NotificationRequest,
		events: {
			open(): Promise<void>;
			failed(): void;
		},
	): void | Promise<void>;
	dispose(): void;
}
