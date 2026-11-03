// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/tab-bar/tab-agent-launch-options.ts
import { AGENT_CATALOG } from '../../core/launch/catalog';
import type { AgentId } from '../../core/launch/types';
export interface AgentOption {
	id: AgentId;
	title: string;
	command?: string;
}
export type InputAction =
	| { kind: 'terminal' }
	| { kind: 'agent'; agentId: AgentId };
export function matchingAgents(input: string, agents: readonly AgentOption[]): AgentOption[] {
	const q = input.trim().toLocaleLowerCase();
	if (!q || q.startsWith('?')) return [];
	const score = (agent: AgentOption) => {
		const aliases = [
			agent.id,
			agent.title,
			agent.command ?? '',
			AGENT_CATALOG.find((a) => a.id === agent.id)?.detectCommand ?? '',
		].map((s) => s.toLocaleLowerCase());
		if (aliases.includes(q)) return 2;
		return q.length > 1 && aliases.some((alias) => alias.split(/[\s/-]+/).some((word) => word.startsWith(q)))
			? 1
			: 0;
	};
	return agents.filter((a) => score(a)).sort((a, b) => score(b) - score(a));
}
/** A typed name opens a terminal or a matching agent; any other text has no creation action. */
export function classifyInput(input: string, agents: readonly AgentOption[] = AGENT_CATALOG): InputAction | undefined {
	const q = input.trim();
	if (!q) return { kind: 'terminal' };
	if (/^(terminal|shell|终端)$/i.test(q)) return { kind: 'terminal' };
	const agent = matchingAgents(q, agents)[0];
	if (agent) return { kind: 'agent', agentId: agent.id };
	return undefined;
}
