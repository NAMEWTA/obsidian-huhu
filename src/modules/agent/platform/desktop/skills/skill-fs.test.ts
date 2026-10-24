import { afterEach, beforeEach, expect, test } from 'vitest';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SKILL_COPY_MARKER, SkillError, buildRecords, skillCell, type SkillRoot } from '../../../core/skills/library';
import { copySkill, hashSkillDir, readCopyMarker, removeCopy, scanRoot, updateCopy } from './skill-fs';

let base = '';
beforeEach(async () => { base = await mkdtemp(path.join(tmpdir(), 'huhu-skill-fs-')); });
afterEach(async () => { await rm(base, { recursive: true, force: true }); });

const root = (name: string, scope: SkillRoot['scope'] = 'global', target: SkillRoot['target'] = 'agents'): SkillRoot => ({ target, scope, dir: path.join(base, name) });
async function skill(dir: string, name: string, description = 'Does things', extra: Record<string, string> = {}) {
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: >\n  ${description}\n  and more\n---\nBody name: nope\n`);
	for (const [file, text] of Object.entries(extra)) { await mkdir(path.dirname(path.join(dir, file)), { recursive: true }); await writeFile(path.join(dir, file), text); }
}

test('scan reads frontmatter name and folded description, ignores folders without SKILL.md and temp folders', async () => {
	const shared = root('shared');
	await skill(path.join(shared.dir, 'review'), 'review-code');
	await skill(path.join(shared.dir, 'fallback'), 'bad name');
	await mkdir(path.join(shared.dir, 'plain'), { recursive: true });
	await skill(path.join(shared.dir, '.huhu-skill-tmp-abc'), 'temp');
	await writeFile(path.join(shared.dir, 'loose.md'), 'x');
	const found = await scanRoot(shared);
	expect(found.locations.map(l => [l.folder, l.name, l.description]).sort()).toEqual([['review', 'review-code', 'Does things and more']]);
	expect(found.unavailable.map(p => path.basename(p))).toEqual(['fallback']);
	expect((await scanRoot(root('missing'))).locations).toEqual([]);
});

test('hash ignores the marker, caches, and links; it changes with content', async () => {
	const dir = path.join(base, 's');
	await skill(dir, 'a', 'd', { 'scripts/run.sh': 'echo 1' });
	const first = await hashSkillDir(dir);
	await writeFile(path.join(dir, SKILL_COPY_MARKER), '{}');
	await mkdir(path.join(dir, '__pycache__')); await writeFile(path.join(dir, '__pycache__', 'x.pyc'), 'x');
	await symlink('/etc/hostname', path.join(dir, 'link'));
	expect(await hashSkillDir(dir)).toBe(first);
	await writeFile(path.join(dir, 'scripts/run.sh'), 'echo 2');
	expect(await hashSkillDir(dir)).not.toBe(first);
});

test('enable copies the folder with a marker; scanning then shows an owned copy that is current', async () => {
	const shared = root('shared'), codex = root('codex-home/skills', 'global', 'codex');
	await skill(path.join(shared.dir, 'review'), 'review', 'd', { 'ref/notes.md': 'hello' });
	const [source] = (await scanRoot(shared)).locations;
	const target = await copySkill(source!, codex);
	expect(target).toBe(path.join(codex.dir, 'review'));
	expect(await readFile(path.join(target, 'ref/notes.md'), 'utf8')).toBe('hello');
	expect((await readCopyMarker(target))?.source).toBe(source!.dir);
	const [record] = buildRecords([...(await scanRoot(shared)).locations, ...(await scanRoot(codex)).locations]);
	expect(skillCell(record!, 'codex').state).toBe('copy');
	expect(skillCell(record!, 'agents')).toMatchObject({ state: 'manual', origin: true });
});

test('enable never overwrites an existing folder, including a hand-placed twin', async () => {
	const shared = root('shared'), codex = root('codex', 'global', 'codex');
	await skill(path.join(shared.dir, 'review'), 'review');
	await skill(path.join(codex.dir, 'review'), 'review', 'mine');
	const [source] = (await scanRoot(shared)).locations;
	await expect(copySkill(source!, codex)).rejects.toMatchObject({ code: 'exists' });
	expect(await readFile(path.join(codex.dir, 'review', 'SKILL.md'), 'utf8')).toContain('mine');
	expect((await readdir(codex.dir)).filter(n => n.startsWith('.huhu-skill-'))).toEqual([]);
});

test('disable removes only a marked copy; a hand-placed twin, a link and a forged location are refused', async () => {
	const shared = root('shared'), codex = root('codex', 'global', 'codex'), grok = root('grok', 'global', 'grok');
	await skill(path.join(shared.dir, 'review'), 'review');
	await skill(path.join(codex.dir, 'review'), 'review', 'mine');
	const [source] = (await scanRoot(shared)).locations;
	const copied = await copySkill(source!, grok);
	const [mine] = (await scanRoot(codex)).locations;
	const [owned] = (await scanRoot(grok)).locations;
	expect(owned!.copy).toBeDefined();
	await expect(removeCopy(mine!)).rejects.toMatchObject({ code: 'not-owned' });
	await expect(removeCopy({ ...mine!, copy: owned!.copy })).rejects.toMatchObject({ code: 'not-owned' });
	await expect(removeCopy({ ...source!, copy: owned!.copy })).rejects.toBeInstanceOf(SkillError);
	expect((await lstat(path.join(codex.dir, 'review'))).isDirectory()).toBe(true);
	expect((await lstat(source!.dir)).isDirectory()).toBe(true);
	const trashed: string[] = [];
	await removeCopy(owned!, async dir => { trashed.push(dir); await rm(dir, { recursive: true }); });
	expect(trashed).toEqual([copied]);
	await expect(lstat(copied)).rejects.toThrow();
	await skill(path.join(grok.dir, 'again'), 'again');
	await copySkill({ ...source!, folder: 'review' }, grok);
	const [again] = (await scanRoot(grok)).locations.filter(l => l.folder === 'review');
	await expect(removeCopy(again!, async () => { throw new Error('no trash'); })).rejects.toMatchObject({ code: 'trash-failed' });
	await removeCopy(again!);
	await expect(lstat(path.join(grok.dir, 'review'))).rejects.toThrow();
});

test('a symlinked skill folder is shown but never copied over, updated or removed', async () => {
	const shared = root('shared'), codex = root('codex', 'global', 'codex');
	await skill(path.join(shared.dir, 'review'), 'review');
	await mkdir(codex.dir, { recursive: true });
	await symlink(path.join(shared.dir, 'review'), path.join(codex.dir, 'review'));
	const [linked] = (await scanRoot(codex)).locations;
	expect(linked).toMatchObject({ link: true, name: 'review' });
	expect(linked!.copy).toBeUndefined();
	await expect(removeCopy({ ...linked!, copy: { version: 1, name: 'review', source: 'x', hash: 'a'.repeat(64), copiedAt: 0 } })).rejects.toMatchObject({ code: 'not-owned' });
	await expect(copySkill((await scanRoot(shared)).locations[0]!, codex)).rejects.toMatchObject({ code: 'exists' });
	expect((await lstat(path.join(shared.dir, 'review', 'SKILL.md'))).isFile()).toBe(true);
});

test('a changed source makes the copy stale and update replaces only the copy', async () => {
	const shared = root('shared'), codex = root('codex', 'global', 'codex');
	await skill(path.join(shared.dir, 'review'), 'review');
	await copySkill((await scanRoot(shared)).locations[0]!, codex);
	await writeFile(path.join(shared.dir, 'review', 'extra.md'), 'new');
	let records = buildRecords([...(await scanRoot(shared)).locations, ...(await scanRoot(codex)).locations]);
	expect(skillCell(records[0]!, 'codex').state).toBe('stale');
	const cell = skillCell(records[0]!, 'codex');
	if (cell.state !== 'stale') throw new Error('expected stale');
	await updateCopy(records[0]!.source!, cell.location);
	expect(await readFile(path.join(codex.dir, 'review', 'extra.md'), 'utf8')).toBe('new');
	records = buildRecords([...(await scanRoot(shared)).locations, ...(await scanRoot(codex)).locations]);
	expect(skillCell(records[0]!, 'codex').state).toBe('copy');
	expect((await readdir(codex.dir)).filter(n => n.startsWith('.huhu-skill-'))).toEqual([]);
	await expect(updateCopy(records[0]!.source!, records[0]!.source!)).rejects.toMatchObject({ code: 'not-owned' });
});
