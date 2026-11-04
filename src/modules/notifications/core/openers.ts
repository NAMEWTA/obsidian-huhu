import type { NotificationOpener, NotificationRecord, NotificationTargetName } from '../api';
import { t } from '../../../shared/i18n';

export function createNotificationOpeners(collect: () => Promise<readonly NotificationOpener[]>) {
	const resolve = async (record: NotificationRecord) => {
		const kind = record.source?.kind === 'health' || record.target?.kind === 'health' ? 'health' : 'automation-run';
		for (const opener of await collect()) {
			if ((opener.kind ?? 'automation-run') !== kind) continue;
			try { if (opener.canOpen(record)) return opener; }
			catch { /* An unavailable source must not prevent another source from opening its own records. */ }
		}
		return undefined;
	};
	return {
		canOpen: async (record: NotificationRecord): Promise<boolean> => !!await resolve(record),
		open: async (record: NotificationRecord): Promise<void> => {
			const opener = await resolve(record);
			if (!opener) throw new Error(t('notification.targetUnknown'));
			await opener.open(record);
		},
		describe: async (record: NotificationRecord): Promise<NotificationTargetName | undefined> => (await resolve(record))?.describe?.(record),
	};
}
