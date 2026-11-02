import { t } from '../../../../shared/i18n';
import { AutomationError } from '../../../../shared/automation/errors';
import { propertiesCodec } from './document';
import type { ActionDefinition } from './definition';
const create = ({ text }: { text: string }) => ({
	kind: 'create-task' as const,
	text,
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});
export const createTaskAction: ActionDefinition<'create-task'> = {
	kind: 'create-task',
	nameKey: 'automation.create-task',
	scheduled: true,
	desktop: false,
	sourceBound: false,
	create,
	text: (action) => action.text,
	setText: (action, value) => {
		action.text = value;
	},
	document: propertiesCodec<'create-task'>({
		section: 'prompt',
		omit: ['text'],
		read: ['date', 'time', 'timezone', 'reminderAt'],
		create,
		setText: (action, value) => {
			action.text = value;
		},
	}),
	contentError: (action) =>
		!action.text.trim() || /[\r\n]/.test(action.text) ? t('automation.contentRequired') : undefined,
	settingsError: (action) => {
		try {
			new Intl.DateTimeFormat('en', { timeZone: action.timezone }).format();
		} catch {
			return t('automation.invalidTimezone');
		}
		if (
			(action.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(action.date)) ||
			(action.time !== undefined && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(action.time))
		)
			return t('automation.calendarInvalidTime');
		return undefined;
	},
	verify: (action) => {
		if (!action.text.trim() || !action.timezone) throw new AutomationError('contentRequired');
	},
	run: {
		mode: 'direct',
		execute: async (action, { sources, run, signal, checkpointTask }) =>
			(await sources.createTask(action, run.id, { run, signal, checkpoint: checkpointTask })) ?? { message: '' },
	},
};
