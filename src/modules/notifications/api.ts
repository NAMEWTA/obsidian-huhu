import { contributionPoint, serviceKey } from '../../app/contracts/module';
import type { AutomationMessage, NotificationChannelId, RunStatus, SourceRef } from '../../shared/automation/types';

export type { NotificationChannelId };

/** The automation run a notification reports on. */
export interface NotificationTarget {
	runId: string;
	automationId: string;
	terminalId?: string;
}

export interface NotificationRequest {
	target?: NotificationTarget;
	/** Idempotency key: a request with an id that was already delivered is ignored. */
	id: string;
	title: string;
	body: string;
	/** Optional presentation data; body remains the original delivery snapshot. */
	presentation?: AutomationMessage & { kind: 'automation-run'; status: RunStatus };
	source?: SourceRef;
	channels: NotificationChannelId[];
}

export interface NotificationRecord extends NotificationRequest {
	createdAt: number;
	read: boolean;
	deliveries: Partial<Record<NotificationChannelId, 'pending' | 'sent' | 'failed' | 'unknown'>>;
}

/** The notification inbox (service `notifications.inbox`). */
export interface NotificationInbox {
	readonly records: readonly NotificationRecord[];
	readonly unread: number;
	available(channel: NotificationChannelId): boolean;
	send(request: NotificationRequest): Promise<void>;
	subscribe(listener: () => void): () => void;
}

/** What the sender knows about the automation a record reported on, resolved by its stable id. */
export type NotificationTargetName = { state: 'current'; name: string } | { state: 'deleted' };

/** Opens what a notification points at. The module that sends a kind of notification contributes its opener. */
export interface NotificationOpener {
	canOpen(record: NotificationRecord): boolean;
	open(record: NotificationRecord): Promise<void>;
	/** Current name of the record's target, or that it no longer exists. Absent when the sender cannot tell. */
	describe?(record: NotificationRecord): NotificationTargetName | undefined;
}

export const NOTIFICATION_INBOX = serviceKey<NotificationInbox>('notifications', 'inbox');
export const NOTIFICATION_OPENERS = contributionPoint<NotificationOpener>('notifications', 'openers');

/** Recovery owner id and the one file it owns for a device (backup and restore address it by these, never by a package path). */
export const NOTIFICATIONS_RECOVERY_OWNER = 'notifications-inbox';
export function notificationInboxPath(deviceId: string): string {
	if (!/^[a-zA-Z0-9_-]+$/.test(deviceId)) throw new Error('huhu-storage.invalid-device');
	return `.huhu/notifications/${deviceId}/inbox.json`;
}
