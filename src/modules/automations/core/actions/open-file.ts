import { t } from '../../../../shared/i18n';
import { propertiesCodec } from './document';
import type { ActionDefinition } from './definition';

/** Open a note of the vault. */
export const openFileAction: ActionDefinition<'open-file'> = {
	kind: 'open-file',
	nameKey: 'automation.open-file',
	scheduled: false,
	desktop: false,
	sourceBound: false,
	create: () => ({ kind: 'open-file', path: '' }),
	text: (action) => action.path,
	setText: (action, value) => {
		action.path = value;
	},
	document: propertiesCodec<'open-file'>({
		section: 'prompt',
		omit: [],
		read: ['path'],
		create: () => ({ kind: 'open-file', path: '' }),
		setText: (action, value) => {
			action.path = value;
		},
	}),
	contentError: (action) => (action.path.trim() ? undefined : t('automation.choiceRequired')),
	run: {
		mode: 'direct',
		execute: async (action, { host }) => {
			await host.openFile(action.path);
			return { message: '' };
		},
	},
};
