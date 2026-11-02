import type { ModuleManifest } from '../../app/contracts/module';
import { AUTOMATION_AGENT_RUNTIME } from '../automations/api';
import { BROWSER_MATERIAL_CONSUMERS } from '../browser/api';
import {
	AGENT_SESSIONS,
	AGENT_USAGE,
	AGENT_WORKBENCH,
	AGENT_DIRECTORY,
	AGENT_DISPATCH,
	AGENT_PROMPT_RUNNER,
	AGENT_SKILLS,
	AGENT_SKILL_CATALOG,
	AGENT_QUICK_COMMANDS,
} from './api';

export const agentManifest: ModuleManifest = {
	id: 'agent',
	order: 50,
	icon: 'terminal',
	titleKey: 'modules.terminal',
	descriptionKey: 'modules.terminalDesc',
	// Mobile activates portable skill discovery only; the terminal page remains desktop-only.
	platforms: { desktop: true, mobile: true },
	defaultEnabled: true,
	activation: 'startup',
	contributes: [BROWSER_MATERIAL_CONSUMERS],
	provides: [
		AUTOMATION_AGENT_RUNTIME,
		AGENT_SESSIONS,
		AGENT_USAGE,
		AGENT_WORKBENCH,
		AGENT_DIRECTORY,
		AGENT_DISPATCH,
		AGENT_PROMPT_RUNNER,
		AGENT_SKILLS,
		AGENT_SKILL_CATALOG,
		AGENT_QUICK_COMMANDS,
	],
	load: () => import('./module'),
};
