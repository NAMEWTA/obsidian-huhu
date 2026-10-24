import { AutomationError } from '../../../../shared/automation/errors';
import { validatedExtraArgs } from '../../../../shared/automation/extra-args';
import type { AgentDescription } from '../../../../shared/automation/types';
import { fillAgentTemplate } from '../../../../shared/agent-prompt';
import { t } from '../../../../shared/i18n';
import { insideVault, propertiesCodec } from './document';
import type { ActionDefinition } from './definition';

/** The agents an automation may use: enabled in the settings and, where known, installed. */
export const availableAgents = (agents: readonly AgentDescription[]) =>
	agents.filter((agent) => agent.enabled && agent.installed !== false);

const pad = (value: number) => String(value).padStart(2, '0');

/** Start a coding agent in a terminal with a prompt. */
export const agentAction: ActionDefinition<'agent'> = {
	kind: 'agent',
	nameKey: 'automation.agent',
	scheduled: true,
	desktop: true,
	sourceBound: false,
	create: ({ agentId, cwd, text }) => ({ kind: 'agent', agentId, cwd, prompt: text, sessionMode: 'fresh' }),
	text: (action) => action.prompt,
	setText: (action, value) => {
		action.prompt = value;
	},
	document: propertiesCodec<'agent'>({
		section: 'prompt',
		omit: ['prompt'],
		read: ['sessionMode', 'session', 'extraArgs'],
		create: ({ agentId, cwd, text }) => ({ kind: 'agent', agentId, cwd, prompt: text, sessionMode: 'fresh' }),
		setText: (action, value) => {
			action.prompt = value;
		},
	}),
	contentError: (action) => (action.prompt.trim() ? undefined : t('automation.contentRequired')),
	settingsError: (action, { cwd, agents }) => {
		// The picker only supplies vault folders; validate again at the execution boundary (including symlinks).
		if (!insideVault(action.cwd, cwd)) return t('automation.cwdInvalid');
		if (!availableAgents(agents).some((agent) => agent.id === action.agentId))
			return t('automation.agentSelectionUnavailable');
		if (
			action.sessionMode === 'specific' &&
			(!action.session?.sessionId || action.session.agentId !== action.agentId || action.session.cwd !== action.cwd)
		)
			return t('automation.sessionMissing');
		try {
			validatedExtraArgs(action.agentId, action.extraArgs ?? '');
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
		if (action.sessionMode === 'reuse' && action.extraArgs?.trim()) return t('automation.extraArgsReuse');
		return undefined;
	},
	verify: (action) => {
		validatedExtraArgs(action.agentId, action.extraArgs ?? '');
		if (action.sessionMode === 'reuse' && action.extraArgs?.trim()) throw new AutomationError('extraArgsReuse');
	},
	run: {
		mode: 'terminal',
		start: (action, { agent, run, previous, now, vaultName, invocation }) => {
			const date = new Date(now);
			// A delivery request already carries its final prompt; otherwise the template variables are filled in.
			const filled = invocation
				? action
				: {
						...action,
						prompt: fillAgentTemplate(action.prompt, {
							date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
							time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
							vault: vaultName,
							folder: action.cwd,
						}),
					};
			return agent.start(filled, run, previous);
		},
	},
};
