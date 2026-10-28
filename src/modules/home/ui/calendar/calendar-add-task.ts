import { Notice, type App } from 'obsidian';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { homeServices } from '../../services/instances';
import { t } from '../../../../shared/i18n';
/** A presentation adapter to task; destination and board state are not business inputs. */
export async function addCalendarTask(app: App, iso: string, title: string, time: string): Promise<VaultTask | null> {
	const calendar = homeServices.calendar;
	if (!calendar) {
		new Notice(t('calendarUnified.unavailable'));
		return null;
	}
	const result = await calendar.createTask({ date: iso, text: title, time: time || undefined });
	if ('code' in result) {
		new Notice(t(`calendarUnified.error.${result.code}`));
		return null;
	}
	const file = contentFiles(app).getFileByPath(result.task.path);
	return file ? { ...result.task, file } : null;
}
