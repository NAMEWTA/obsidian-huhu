import { contributionPoint, serviceKey } from '../../app/contracts/module';
import type { AutomationMessage, RunStatus, SourceRef } from '../../shared/automation/types';

export type NotificationChannelId = string;

export interface NotificationDeliveryEvents {
	open(this: void): Promise<void>;
	failed(this: void): void;
}

/** A module-owned delivery channel; contributions are revoked with their owning module. */
export interface NotificationChannel {
	readonly id: NotificationChannelId;
	available(this: void): boolean;
	send(this: void, request: NotificationRequest, events: NotificationDeliveryEvents): void | Promise<void>;
	/** The provider owns disposal; notifications calls this only for its own built-in channels. */
	dispose?(this: void): void;
}

export type NotificationKind = 'automation-run' | 'health';
export type NotificationSource = SourceRef | { kind: 'automation-run'; id: string } | { kind: 'health'; id: string };

/** Missing kind is accepted for existing inbox snapshots; new senders include it. */
export interface AutomationNotificationTarget {
	kind?: 'automation-run';
	runId: string;
	automationId: string;
	terminalId?: string;
	source?: SourceRef;
}
export interface HealthNotificationTarget {
	kind: 'health';
	reportId: string;
	automationId?: never;
	runId?: never;
	terminalId?: never;
}
export type NotificationTarget = AutomationNotificationTarget | HealthNotificationTarget;

interface NotificationContent {
	/** Idempotency key: a request with an id that was already delivered is ignored. */
	id: string;
	title: string;
	body: string;
	channels: NotificationChannelId[];
}
export type NotificationRequest = NotificationContent & (
	| { source?: Exclude<NotificationSource, { kind: 'health' }>; target?: AutomationNotificationTarget; presentation?: AutomationMessage & { kind: 'automation-run'; status: RunStatus } }
	| { source: Extract<NotificationSource, { kind: 'health' }>; target?: HealthNotificationTarget; presentation?: never }
);

export type NotificationRecord = NotificationRequest & {
	createdAt: number;
	read: boolean;
	deliveries: Partial<Record<NotificationChannelId, 'pending' | 'sent' | 'failed' | 'unknown' | 'unavailable'>>;
};

/** The notification inbox (service `notifications.inbox`). */
export interface NotificationInbox {
	readonly records: readonly NotificationRecord[];
	readonly unread: number;
	available(channel: NotificationChannelId): boolean;
	send(request: NotificationRequest): Promise<void>;
	subscribe(listener: () => void): () => void;
}

/** What the sender knows about a record's target, resolved by its stable id. */
export type NotificationTargetName = { state: 'current'; name: string } | { state: 'deleted' };

/** Opens what a notification points at. The module that sends a kind of notification contributes its opener. */
export interface NotificationOpener {
	/** Unset is the existing automation contribution, for stored automation inbox entries. */
	readonly kind?: NotificationKind;
	canOpen(record: NotificationRecord): boolean;
	open(record: NotificationRecord): Promise<void>;
	/** Current name of the record's target, or that it no longer exists. Absent when the sender cannot tell. */
	describe?(record: NotificationRecord): NotificationTargetName | undefined;
}

export const NOTIFICATION_INBOX = serviceKey<NotificationInbox>('notifications', 'inbox');
export const NOTIFICATION_OPENERS = contributionPoint<NotificationOpener>('notifications', 'openers');
export const NOTIFICATION_CHANNELS = contributionPoint<NotificationChannel>('notifications', 'channels');

/** Recovery owner id and the one file it owns for a device (backup and restore address it by these, never by a package path). */
export const NOTIFICATIONS_RECOVERY_OWNER = 'notifications-inbox';
export function notificationInboxPath(deviceId: string): string {
	if (!/^[a-zA-Z0-9_-]+$/.test(deviceId)) throw new Error('huhu-storage.invalid-device');
	return `.huhu/notifications/${deviceId}/inbox.json`;
}
