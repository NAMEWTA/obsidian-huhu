import { afterEach, beforeEach, expect, test } from 'vitest';
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { systemAccountPaths } from '../platform/desktop/agents/system-homes';
import { createSkillOps } from '../platform/desktop/skills/ops';
import { SkillManager } from './skill-manager';

let base = '', home = '', vault = '', extra: string[] = [], opened: string[] = [], trashed: string[] = [];
beforeEach(async () => {
	base = await mkdtemp(path.join(tmpdir(), 'huhu-skill-manager-'));
	home = path.join(base, 'home'); vault = path.join(base, 'vault'); extra = []; opened = []; trashed = [];
	await mkdir(home, { recursive: true }); await mkdir(vault, { recursive: true });
});
afterEach(async () => { await rm(base, { recursive: true, force: true }); });

const write = async (dir: string, name: string) => { await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: about ${name}\n---\n`); };
const manager = () => new SkillManager({
	extraDirectories: () => extra,
	load: async () => createSkillOps({
		home, vault: () => vault, agentPaths: async () => systemAccountPaths({}, home),
		trash: async dir => { trashed.push(dir); await rm(dir, { recursive: true }); },
		open: async dir => { opened.push(dir); return ''; },
	}),
});

test('discovers global and vault skills from the shared and agent folders and merges by name', async () => {
	await write(path.join(home, '.agents/skills/review'), 'review');
	await write(path.join(home, '.claude/skills/review'), 'review');
	await write(path.join(home, '.codex/skills/ship'), 'ship');
	await write(path.join(vault, '.agents/skills/note'), 'note');
	await write(path.join(vault, '.claude/skills/note'), 'note');
	const m = manager();
	await m.refresh();
	const { records, error } = m.state.getState();
	expect(error).toBe('');
	expect(records.map(r => [r.key, r.locations.map(l => l.target)])).toEqual([
		['vault:note', ['agents', 'claude-code']], ['global:review', ['agents', 'claude-code']], ['global:ship', ['codex']],
	]);
	expect(records.find(r => r.name === 'review')?.description).toBe('about review');
});

test('extra directories are discovery only', async () => {
	const dir = path.join(base, 'elsewhere');
	await write(path.join(dir, 'cat/deep'), 'deep');
	extra = [dir, 'relative', '~/missing'];
	const m = manager();
	await m.refresh();
	expect(m.state.getState().records.map(r => r.name)).toEqual(['deep']);
	expect(m.state.getState().unavailable).toContain('relative');
});

test('toggle enables into the same scope and disables only the copy, through the trash', async () => {
	await write(path.join(home, '.agents/skills/review'), 'review');
	await write(path.join(vault, '.agents/skills/review'), 'review');
	const m = manager();
	await m.refresh();
	await m.toggle('global:review', 'codex');
	expect((await lstat(path.join(home, '.codex/skills/review'))).isDirectory()).toBe(true);
	await expect(lstat(path.join(vault, '.codex/skills/review'))).rejects.toThrow();
	await m.toggle('vault:review', 'claude-code');
	expect((await lstat(path.join(vault, '.claude/skills/review/.huhu-skill-copy.json'))).isFile()).toBe(true);
	expect(m.state.getState().pending).toEqual([]);
	await m.toggle('global:review', 'codex');
	expect(trashed).toEqual([path.join(home, '.codex/skills/review')]);
	await expect(lstat(path.join(home, '.codex/skills/review'))).rejects.toThrow();
	expect(await readFile(path.join(home, '.agents/skills/review/SKILL.md'), 'utf8')).toContain('review');
	expect(await readFile(path.join(vault, '.claude/skills/review/SKILL.md'), 'utf8')).toContain('review');
});

test('a hand-placed twin is neither overwritten nor removed, and the original cannot be toggled', async () => {
	await write(path.join(home, '.agents/skills/review'), 'review');
	await write(path.join(home, '.codex/skills/review'), 'review');
	await writeFile(path.join(home, '.codex/skills/review/mine.txt'), 'mine');
	const m = manager();
	await m.refresh();
	await expect(m.toggle('global:review', 'codex')).rejects.toMatchObject({ code: 'not-owned' });
	await expect(m.toggle('global:review', 'agents')).rejects.toMatchObject({ code: 'not-owned' });
	expect(await readFile(path.join(home, '.codex/skills/review/mine.txt'), 'utf8')).toBe('mine');
	await mkdir(path.join(home, '.grok/skills/review'), { recursive: true });
	await expect(m.toggle('global:review', 'grok')).rejects.toMatchObject({ code: 'exists' });
	expect(trashed).toEqual([]);
});

test('update recopies stale copies only, and a failing trash needs permanent deletion', async () => {
	await write(path.join(home, '.agents/skills/review'), 'review');
	const m = new SkillManager({
		extraDirectories: () => [],
		load: async () => createSkillOps({ home, vault: () => vault, agentPaths: async () => systemAccountPaths({}, home), trash: async () => { throw new Error('none'); }, open: async () => '' }),
	});
	await m.refresh();
	await m.toggle('global:review', 'codex');
	await writeFile(path.join(home, '.agents/skills/review/new.md'), 'fresh');
	await m.refresh();
	await m.update('global:review');
	expect(await readFile(path.join(home, '.codex/skills/review/new.md'), 'utf8')).toBe('fresh');
	await expect(m.toggle('global:review', 'codex')).rejects.toMatchObject({ code: 'trash-failed' });
	expect((await lstat(path.join(home, '.codex/skills/review'))).isDirectory()).toBe(true);
	await m.toggle('global:review', 'codex', { permanent: true });
	await expect(lstat(path.join(home, '.codex/skills/review'))).rejects.toThrow();
});

test('only known directories can be opened and a disposed manager refuses work', async () => {
	await write(path.join(home, '.agents/skills/review'), 'review');
	const m = manager();
	await m.refresh();
	await m.open(path.join(home, '.agents/skills'));
	await m.open(path.join(home, '.agents/skills/review'));
	await expect(m.open('/etc')).rejects.toMatchObject({ code: 'unavailable' });
	expect(opened).toHaveLength(2);
	m.dispose();
	await expect(m.toggle('global:review', 'codex')).rejects.toBeInstanceOf(Error);
});
