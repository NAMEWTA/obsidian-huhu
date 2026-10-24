import { t } from '../../../../shared/i18n';
import { propertiesCodec } from './document';
import type { ActionDefinition } from './definition';

/** Run one Obsidian command; the result only says that it was invoked. */
export const obsidianCommandAction: ActionDefinition<'obsidian-command'> = {
	kind: 'obsidian-command',
	nameKey: 'automation.obsidian-command',
	scheduled: false,
	desktop: false,
	sourceBound: false,
	create: () => ({ kind: 'obsidian-command', command: '' }),
	text: (action) => action.command,
	setText: (action, value) => {
		action.command = value;
	},
	document: propertiesCodec<'obsidian-command'>({
		section: 'prompt',
		omit: [],
		read: ['command'],
		create: () => ({ kind: 'obsidian-command', command: '' }),
		setText: (action, value) => {
			action.command = value;
		},
	}),
	contentError: (action) => (action.command.trim() ? undefined : t('automation.choiceRequired')),
	run: {
		mode: 'direct',
		execute: (action, { host }) => Promise.resolve({ message: host.runCommand(action.command) }),
	},
};
