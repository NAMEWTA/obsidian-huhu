import { AGENT_CATALOG } from '../launch/catalog';
import type { AgentId, AgentSettings } from '../launch/types';
import type { TerminalSettings } from '../terminal/settings';
export type DetectedAgents = Partial<Record<AgentId, string>>;
export function availableAgents(settings: TerminalSettings, detected: DetectedAgents) {
	return AGENT_CATALOG.filter((a) => settings.enabled[a.id] && detected[a.id]).sort(
		(a, b) => Number(b.id === settings.defaultAgent) - Number(a.id === settings.defaultAgent),
	);
}
/** Old launch/history ports receive a projection; the new settings remain the only source of preferences. */
export function launchSettings(settings: TerminalSettings, detected: DetectedAgents = {}): AgentSettings {
	return {
		...settings.agents,
		globalPermissionMode: settings.permissionMode,
		usageRefreshSec: settings.usageRefreshSec,
		agents: Object.fromEntries(
			AGENT_CATALOG.map((a) => [
				a.id,
				{
					...settings.agents.agents[a.id],
					enabled: settings.enabled[a.id],
					permissionMode: 'inherit',
					cliPath: detected[a.id] || settings.overrides[a.id]?.command || '',
					extraArgs: '',
					argsOverride: settings.overrides[a.id]?.args,
					env: settings.overrides[a.id]?.env,
				},
			]),
		) as AgentSettings['agents'],
	};
}

/**
 * Providers whose usage is read and shown (status bar, usage widget): the CLI was found on this device and its
 * usage analysis is switched on (Settings > Agents > Usage). The agent itself must not be disabled either.
 */
export function usageAgentIds(settings: TerminalSettings, detected: DetectedAgents): AgentId[] {
	return AGENT_CATALOG.filter(
		(agent) =>
			agent.usage !== 'none' &&
			!!detected[agent.id] &&
			settings.usageAnalytics[agent.id] !== false &&
			settings.enabled[agent.id] !== false &&
			settings.agents.agents[agent.id]?.showUsage !== false,
	).map((agent) => agent.id);
}
