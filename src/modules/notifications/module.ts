import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { deviceId } from '../../host/obsidian/storage/device-id';
import { privateVaultStorage } from '../../host/obsidian/storage/private-storage';
import { NOTIFICATION_CHANNELS, NOTIFICATION_INBOX, NOTIFICATION_OPENERS, notificationInboxPath, type NotificationChannel } from './api';
import { NotificationService, notificationsRecoveryOwner } from './core/service';
import { createNotificationChannels } from './platform/delivery';
import { NotificationChannelRegistry } from './core/channels';
import { createNotificationOpeners } from './core/openers';
import { reportOperationFailure } from '../../host/obsidian/feedback';
import { registerMessages } from '../../shared/i18n/index';
import { messages } from './i18n';
import { messages as automationStrings } from '../../shared/i18n/lazy/automation-inbox';

registerMessages(automationStrings);
registerMessages(messages);

/**
 * Notifications module: owns the per-device inbox (`.huhu/notifications/<device>/inbox.json`) and native
 * delivery. Senders acquire `notifications.inbox`; opening a record goes to the sender's contributed opener.
 */
export default function createNotificationsModule(context: ModuleContext): ModuleInstance {
	const report = (_error: unknown) => reportOperationFailure(context.app.workspace.containerEl.win, 'notifications', 'notification.operationFailed');
	// Only active senders can open their records; opening a notification never turns a module on.
	const routing = createNotificationOpeners(async () => (await context.contributions.collect(NOTIFICATION_OPENERS, { activate: false })).map(item => item.value));
	const delivery = new NotificationChannelRegistry();
	for (const channel of createNotificationChannels(context.app)) delivery.register(channel, true);
	const inbox = new NotificationService(privateVaultStorage(context.app), notificationInboxPath(deviceId(context.app)), routing.open, delivery, routing.canOpen, routing.describe);
	const registered = new Map<NotificationChannel, () => void>();
	let disposed = false;
	let generation = 0;
	const refreshChannels = async () => {
		const current = ++generation;
		const contributions = await context.contributions.collect(NOTIFICATION_CHANNELS, { activate: false });
		if (disposed || current !== generation) return;
		const next = new Set(contributions.map(item => item.value));
		for (const [channel, revoke] of registered) if (!next.has(channel)) { revoke(); registered.delete(channel); }
		for (const channel of next) if (!registered.has(channel)) {
			try { registered.set(channel, delivery.register(channel)); }
			catch (error) { report(error); }
		}
		inbox.refreshOpeners();
	};
	context.lifetime.register(context.contributions.watch(NOTIFICATION_OPENERS, () => inbox.refreshOpeners()));
	context.lifetime.register(context.contributions.watch(NOTIFICATION_CHANNELS, () => { void refreshChannels().catch(report); }));
	// The inbox file takes part in cross-owner backup and restore; a module that is off has no owner and is handled offline.
	if (context.recovery)
		context.lifetime.register(
			context.recovery.register(notificationsRecoveryOwner(inbox, notificationInboxPath(deviceId(context.app)))),
		);
	return {
		services: [[NOTIFICATION_INBOX, inbox]],
		pages: {
			inbox: async () => (await import('./ui/workbench-page')).createInboxPage(inbox, report),
		},
		activate: async () => { await refreshChannels(); await inbox.load(); },
		dispose: () => {
			disposed = true; generation++;
			for (const revoke of registered.values()) revoke();
			registered.clear();
			return inbox.shutdown();
		},
	};
}
