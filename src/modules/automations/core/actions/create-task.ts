import { t } from '../../../../shared/i18n';
import { AutomationError } from '../../../../shared/automation/errors';
import { propertiesCodec } from './document';
import type { ActionDefinition } from './definition';

/** Add one to-do to a board card or to the board's effective calendar storage. */
export const createTaskAction: ActionDefinition<'create-task'> = {
	kind: 'create-task',
	nameKey: 'automation.create-task',
	scheduled: true,
	desktop: false,
	sourceBound: false,
	create: ({ text }) => ({ kind: 'create-task', path: '', cardId: '', text }),
	text: (action) => action.text,
	setText: (action, value) => {
		action.text = value;
	},
	document: propertiesCodec<'create-task'>({
		section: 'prompt',
		omit: ['text'],
		read: ['path', 'cardId', 'target', 'time', 'reminderTime'],
		create: ({ text }) => ({ kind: 'create-task', path: '', cardId: '', text }),
		setText: (action, value) => {
			action.text = value;
			if (action.target === 'calendar') delete action.cardId;
		},
	}),
	contentError: (action) => !action.text.trim() ? t('automation.contentRequired')
		: action.target === 'calendar' && /[\r\n]/.test(action.text) ? t('automation.calendarInvalidInput') : undefined,
	settingsError: (action) => {
		if (!action.path || (action.target !== 'calendar' && !action.cardId)) return t('automation.targetRequired');
		if (action.target === 'calendar' && [action.time, action.reminderTime].some(
			(value) => value !== undefined && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value),
		)) return t('automation.calendarInvalidTime');
		return undefined;
	},
	verify: (action) => {
		if (!action.text.trim()) throw new AutomationError('contentRequired');
		if (!action.path || (action.target !== 'calendar' && !action.cardId)) throw new AutomationError('targetRequired');
	},
	run: {
		mode: 'direct',
		execute: async (action, { sources, run, signal, checkpointTask }) => {
			const result = await sources.createTask(action, run.id, { run, signal, checkpoint: checkpointTask });
			return result ?? { message: '' };
		},
	},
};
