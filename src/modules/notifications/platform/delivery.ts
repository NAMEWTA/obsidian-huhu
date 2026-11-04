import { Notice, Platform, type App } from 'obsidian';
import type { NotificationChannel } from '../api';
import { reportOperationFailure } from '../../../host/obsidian/feedback';

/** Native delivery belongs to the plugin lifetime, independently of inbox views. */
export function createNotificationChannels(app: App): readonly NotificationChannel[] {
	const active = new Set<Notification>();
	const notices = new Set<Notice>();
	const nativeWindow = () => app.workspace.containerEl.win as Window & { Notification: typeof Notification };
	return [{
		id: 'in-app', available: () => true,
		send(row) {
			for (const notice of notices) if (!notice.containerEl.isConnected) notices.delete(notice);
			notices.add(new Notice(row.title === row.body ? row.title : `${row.title}\n${row.body}`));
		},
		dispose() { for (const notice of notices) notice.hide(); notices.clear(); },
	}, {
		id: 'system',
		available: () => Platform.isDesktopApp && typeof nativeWindow().Notification === 'function',
		send(row, events) {
			const item = new (nativeWindow().Notification)(row.title, {
				body: row.title === row.body ? '' : row.body,
				tag: row.id,
			});
			active.add(item);
			item.onerror = () => events.failed();
			item.onclose = () => {
				active.delete(item);
			};
			item.onclick = () => {
				void events.open().catch(() => reportOperationFailure(nativeWindow(), 'notifications', 'notification.operationFailed'));
			};
		},
		dispose() {
			for (const item of active) {
				item.onerror = null; item.onclick = null; item.onclose = null;
				item.close();
			}
			active.clear();
		},
	}];
}
