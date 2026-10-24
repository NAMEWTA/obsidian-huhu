
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { SkillLocation, SkillOps, SkillRoot } from '../../../core/skills/library';
import type { AgentId } from '../../../core/launch/types';
import { AGENT_IDS } from '../../../core/launch/defaults';
import type { AccountPaths } from '../agents/system-homes';
import { copySkill, removeCopy, scanRoot, updateCopy } from './skill-fs';
import { resolveSkillRoots } from './roots';

export interface SkillOpsDeps {
	/** The real user home; tests pass a temporary one. */
	home: string;
	vault: () => string | undefined;
	/** The homes the selected account of `agent` reads its skills from. */
	agentPaths: (agent: AgentId) => Promise<AccountPaths>;
	trash: (dir: string) => Promise<void>;
	open: (dir: string) => Promise<string>;
}

function expandHome(value: string, home: string): string | undefined {
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const expanded = trimmed === '~' ? home : /^~[/\\]/.test(trimmed) ? path.join(home, trimmed.slice(2)) : trimmed;
	return path.isAbsolute(expanded) ? path.resolve(expanded) : undefined;
}

export function createSkillOps(deps: SkillOpsDeps): SkillOps {
	return {
		async roots() {
			const paths: Partial<Record<AgentId, AccountPaths>> = {};
			for (const agent of AGENT_IDS) { try { paths[agent] = await deps.agentPaths(agent); } catch { /* An agent whose account cannot be resolved has no global directory. */ } }
			return resolveSkillRoots({ home: deps.home, vault: deps.vault(), paths, agents: AGENT_IDS });
		},
		async scan(roots, extra, signal) {
			const locations: SkillLocation[] = [], unavailable: string[] = [];
			const roles: SkillRoot[] = [...roots];
			for (const value of extra) {
				const dir = expandHome(value, deps.home);
				if (dir) roles.push({ target: 'extra', scope: 'global', dir });
				else unavailable.push(value);
			}
			for (const root of roles) {
				const found = await scanRoot(root, signal, root.target === 'extra' ? 3 : 0);
				locations.push(...found.locations);
				unavailable.push(...found.unavailable);
			}
			return { locations, unavailable };
		},
		async copy(source, root) { await copySkill(source, root); },
		update: (source, copy) => updateCopy(source, copy),
		remove: (copy, mode) => removeCopy(copy, mode === 'trash' ? deps.trash : undefined),
		async open(dir) {
			await mkdir(dir, { recursive: true });
			const error = await deps.open(dir);
			if (error) throw new Error(error);
		},
	};
}
