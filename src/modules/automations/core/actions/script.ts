import { t } from '../../../../shared/i18n';
import { insideVault, propertiesCodec } from './document';
import type { ActionDefinition } from './definition';

/** Run a PowerShell or Bash script in a terminal. */
export const scriptAction: ActionDefinition<'script'> = {
	kind: 'script',
	nameKey: 'automation.script',
	scheduled: true,
	desktop: true,
	sourceBound: false,
	create: ({ cwd, text }) => ({ kind: 'script', script: text, cwd, shell: 'powershell' }),
	text: (action) => action.script,
	setText: (action, value) => {
		action.script = value;
	},
	document: propertiesCodec<'script'>({
		section: 'script',
		omit: ['script'],
		read: ['shell'],
		create: ({ cwd, text }) => ({ kind: 'script', script: text, cwd, shell: 'powershell' }),
		setText: (action, value) => {
			action.script = value;
		},
	}),
	contentError: (action) => (action.script.trim() ? undefined : t('automation.contentRequired')),
	settingsError: (action, { cwd }) => (insideVault(action.cwd, cwd) ? undefined : t('automation.cwdInvalid')),
	run: {
		mode: 'terminal',
		start: (action, { agent, run }) => agent.startScript?.(action, run) ?? Promise.resolve(undefined),
	},
};
