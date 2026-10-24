import { expect, test } from 'vitest';
import path from 'node:path';
import { systemAccountPaths } from '../agents/system-homes';
import { resolveSkillRoots } from './roots';
import { AGENT_IDS } from '../../../core/launch/defaults';

test('roots follow the injected home, CLI-home variables and the vault', () => {
	const home = path.join(path.sep, 'tmp', 'fake-home');
	const paths = systemAccountPaths({ CODEX_HOME: path.join(path.sep, 'x', 'codex') }, home);
	const roots = resolveSkillRoots({ home, vault: path.join(path.sep, 'v'), paths: Object.fromEntries(AGENT_IDS.map(id => [id, paths])), agents: AGENT_IDS });
	const find = (target: string, scope: string) => roots.find(r => r.target === target && r.scope === scope)?.dir;
	expect(find('agents', 'global')).toBe(path.resolve(home, '.agents', 'skills'));
	expect(find('claude-code', 'global')).toBe(path.resolve(home, '.claude', 'skills'));
	expect(find('codex', 'global')).toBe(path.resolve(path.sep, 'x', 'codex', 'skills'));
	expect(find('gemini', 'global')).toBe(path.resolve(home, '.gemini', 'skills'));
	expect(find('opencode', 'global')).toBe(path.resolve(home, '.config', 'opencode', 'skills'));
	expect(find('grok', 'global')).toBe(path.resolve(home, '.grok', 'skills'));
	expect(find('pi', 'global')).toBe(path.resolve(home, '.pi', 'agent', 'skills'));
	expect(find('agents', 'vault')).toBe(path.resolve(path.sep, 'v', '.agents', 'skills'));
	expect(find('claude-code', 'vault')).toBe(path.resolve(path.sep, 'v', '.claude', 'skills'));
	expect(find('codex', 'vault')).toBe(path.resolve(path.sep, 'v', '.codex', 'skills'));
	expect(find('opencode', 'vault')).toBe(path.resolve(path.sep, 'v', '.opencode', 'skills'));
	expect(roots).toHaveLength(14);
});

test('without a vault only global directories remain, and an agent without homes is skipped', () => {
	const roots = resolveSkillRoots({ home: '/h', vault: undefined, paths: {}, agents: AGENT_IDS });
	expect(roots.map(r => [r.target, r.scope])).toEqual([['agents', 'global']]);
});
