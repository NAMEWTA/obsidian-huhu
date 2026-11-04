import type { NotificationOpener, NotificationRecord } from '../../notifications/api';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
const reportId = (record: NotificationRecord): string | undefined => record.source?.kind === 'health' && record.target?.kind === 'health' && record.source.id === record.target.reportId && /^[a-zA-Z0-9_-]{1,128}$/.test(record.target.reportId) ? record.target.reportId : undefined;
export function healthNotificationOpener(open: (target: WorkbenchTarget) => Promise<void>, available: () => boolean): NotificationOpener {
	return { kind: 'health', canOpen: record => available() && !!reportId(record), open: async record => { const id = reportId(record); if (available() && id) await open({ feature: 'health', section: 'scan', resourceId: id }); } };
}
