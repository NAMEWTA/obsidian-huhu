import { Notice, type App } from 'obsidian';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { scanFileTasks } from '../../platform/calendar/alltasks-scan';
import { homeServices } from '../../services/instances';
import { t } from '../../../../shared/i18n';
import type { DashboardSettingsAccess } from '../settings-access';

/** A UI adapter: the domain writer owns destination, template, identity and commit status. */
export async function addCalendarTask(
	app: App, iso: string, title: string, time: string,
	_access?: DashboardSettingsAccess, dashboardFile?: string,
): Promise<VaultTask | null> {
	const calendar = homeServices.calendar;
	if (!calendar) { new Notice(t('calendarUnified.unavailable')); return null; }
	const result = await calendar.createTask({ date: iso, text: title, time: time || undefined, boardPath: dashboardFile, interactive: true });
	if ('code' in result) {
		new Notice(t(result.status === 'cancelled' ? 'calendarUnified.cancelled' : `calendarUnified.error.${result.code}`));
		return null;
	}
	if (result.status === 'written-pending-refresh') new Notice(t('calendarUnified.pendingRefresh'));
	const file = contentFiles(app).getFileByPath(result.receipt.path);
	if (!file) return null;
	const task = scanFileTasks(file, result.receipt.originalLine)[0];
	return task ? { ...task, line: result.receipt.line } : null;
}
