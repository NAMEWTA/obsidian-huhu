import { mkdtemp, readFile, readdir, rm, stat, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { SkillManager } from '../../../services/skill-manager';
import { createSkillOps } from './ops';
import { materializePackagedSkills } from './packaged';

let base = '', vault = '', home = '';
beforeEach(async () => {
	base = await mkdtemp(path.join(tmpdir(), 'huhu-packaged-skill-'));
	vault = path.join(base, 'vault'); home = path.join(base, 'home');
	await mkdir(vault); await mkdir(home);
});
afterEach(async () => { await rm(base, { recursive: true, force: true }); });

const manager = (language: 'en' | 'zh' = 'en') => new SkillManager({
	extraDirectories: () => [],
	load: async () => createSkillOps({
		home, vault: () => vault, trash: async () => undefined, open: async () => '',
		agentPaths: async () => { throw new Error('no account'); },
		packaged: () => materializePackagedSkills(vault, language),
	}),
});

test('the packaged control Skill is offered as a source, written only into HUHU’s own folder until the user enables it', async () => {
	const skills = manager();
	await skills.refresh();
	const record = skills.state.getState().records.find(item => item.key === 'global:huhu-control')!;
	expect(record, 'the Skills page lists it').toBeDefined();
	expect(record.source?.dir).toBe(path.join(await import('node:fs/promises').then(fs => fs.realpath(vault)), '.huhu/skills/huhu-control'));
	expect(record.description).toMatch(/explicitly asks/);
	// Nothing reached an agent or account directory by itself.
	expect(await readdir(home)).toEqual([]);
	await skills.toggle('global:huhu-control', 'agents');
	const copy = path.join(home, '.agents/skills/huhu-control/SKILL.md');
	expect(await readFile(copy, 'utf8')).toBe(await readFile(path.join(vault, '.huhu/skills/huhu-control/SKILL.md'), 'utf8'));
	skills.dispose();
});

test('refreshing is idempotent and follows the language without touching an unchanged file', async () => {
	const file = path.join(vault, '.huhu/skills/huhu-control/SKILL.md');
	await materializePackagedSkills(vault, 'en');
	const first = (await stat(file)).mtimeMs;
	await new Promise(resolve => setTimeout(resolve, 15));
	await materializePackagedSkills(vault, 'en');
	expect((await stat(file)).mtimeMs).toBe(first);
	await materializePackagedSkills(vault, 'zh');
	expect(await readFile(file, 'utf8')).toMatch(/仅当用户明确要求/);
	expect(await readdir(path.dirname(file))).toEqual(['SKILL.md']);
	expect(await materializePackagedSkills(undefined, 'en')).toBeUndefined();
});

test('a failing packaged folder never hides the user’s own skills', async () => {
	const ops = createSkillOps({ home, vault: () => vault, trash: async () => undefined, open: async () => '', agentPaths: async () => { throw new Error('x'); }, packaged: async () => { throw new Error('disk'); } });
	await expect(ops.scan(await ops.roots(), [], new AbortController().signal)).resolves.toMatchObject({ locations: [] });
});
