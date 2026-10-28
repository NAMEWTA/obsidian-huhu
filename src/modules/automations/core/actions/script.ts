import { t } from '../../../../shared/i18n';
import { insideVault, propertiesCodec } from './document';
import { withSpaceDecode } from './agent';
import type { ActionDefinition } from './definition';

const scriptCodec = propertiesCodec<'script'>({
	section: 'script',
	omit: ['script'],
	read: ['shell', 'spaceId'],
	create: ({ cwd, text }) => ({ kind: 'script', script: text, cwd, shell: 'powershell' }),
	setText: (action, value) => {
		action.script = value;
	},
});

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
	document: withSpaceDecode(scriptCodec),
	contentError: (action) => (action.script.trim() ? undefined : t('automation.contentRequired')),
	settingsError: (action, { cwd }) =>
		!insideVault(action.cwd, cwd)
			? t('automation.cwdInvalid')
			: action.spaceId
				? undefined
				: t('automation.spaceRequired'),
	run: {
		mode: 'terminal',
		start: (action, { agent, run }) => agent.startScript?.(action, run) ?? Promise.resolve(undefined),
	},
};
