// Per-tool skills directories follow xingkongliang/skills-manager 7f92c21 (MIT), Copyright (c) 2026 Tianliang Zhang: src-tauri/src/core/tool_adapters.rs (global and project-relative paths)
import path from 'node:path';
import type { AgentId } from '../../../core/launch/types';
import type { SkillRoot } from '../../../core/skills/library';
import type { AccountPaths } from '../agents/system-homes';

/** Project (vault) skills directory of each tool, relative to the vault root. */
export const VAULT_SKILL_DIRS: Readonly<Record<'agents' | AgentId, string>> = {
	agents: '.agents/skills',
	'claude-code': '.claude/skills',
	codex: '.codex/skills',
	grok: '.grok/skills',
	opencode: '.opencode/skills',
	gemini: '.gemini/skills',
	pi: '.pi/skills',
};

/** Global skills directory of one agent inside the homes its account uses. */
export function globalSkillDir(agent: AgentId, paths: AccountPaths): string {
	switch (agent) {
		case 'claude-code': return path.join(paths.CLAUDE_CONFIG_DIR, 'skills');
		case 'codex': return path.join(paths.CODEX_HOME, 'skills');
		case 'grok': return path.join(paths.GROK_HOME, 'skills');
		case 'opencode': return path.join(paths.OPENCODE_CONFIG_DIR, 'skills');
		case 'gemini': return path.join(paths.GEMINI_CLI_HOME, '.gemini', 'skills');
		case 'pi': return path.join(paths.PI_CODING_AGENT_DIR, 'skills');
	}
}

export interface RootInput {
	/** The user's real home; `~/.agents/skills` is shared by every account. */
	home: string;
	/** Absolute vault folder, when there is one. */
	vault: string | undefined;
	/** The homes each agent's selected account uses; an agent without an entry has no global directory. */
	paths: Partial<Record<AgentId, AccountPaths>>;
	agents: readonly AgentId[];
}

/** Every skills directory HUHU knows about: the shared one, then each agent's, global and in the vault. */
export function resolveSkillRoots(input: RootInput): SkillRoot[] {
	const roots: SkillRoot[] = [];
	const seen = new Set<string>();
	const add = (target: SkillRoot['target'], scope: SkillRoot['scope'], dir: string) => {
		const resolved = path.resolve(dir);
		if (seen.has(`${scope}:${resolved}`)) return;
		seen.add(`${scope}:${resolved}`);
		roots.push({ target, scope, dir: resolved });
	};
	add('agents', 'global', path.join(input.home, '.agents', 'skills'));
	for (const agent of input.agents) { const paths = input.paths[agent]; if (paths) add(agent, 'global', globalSkillDir(agent, paths)); }
	if (input.vault) {
		add('agents', 'vault', path.join(input.vault, VAULT_SKILL_DIRS.agents));
		for (const agent of input.agents) add(agent, 'vault', path.join(input.vault, VAULT_SKILL_DIRS[agent]));
	}
	return roots;
}
