import { expect, test } from 'vitest';
import { buildRecords, filterRecords, parseMarker, skillCell, type SkillLocation } from './library';

const hash = (c: string) => c.repeat(64);
const loc = (over: Partial<SkillLocation>): SkillLocation => ({
	target: 'agents', scope: 'global', dir: '/h/.agents/skills/review', root: '/h/.agents/skills', folder: 'review', name: 'review', description: 'Review code', hash: hash('a'), ...over,
});

test('same name and scope merge into one record, same name in another scope stays apart', () => {
	const records = buildRecords([
		loc({ target: 'codex', dir: '/h/.codex/skills/review', root: '/h/.codex/skills' }),
		loc({}),
		loc({ scope: 'vault', dir: '/v/.claude/skills/review', root: '/v/.claude/skills', target: 'claude-code' }),
	]);
	expect(records.map(r => [r.key, r.locations.length])).toEqual([['global:review', 2], ['vault:review', 1]]);
	expect(records[0]!.source?.target).toBe('agents');
});

test('cell states: off, hand-placed original, hand-placed twin, current copy, stale copy', () => {
	const copy = (target: SkillLocation['target'], h: string) => loc({ target, dir: `/h/${target}/review`, root: `/h/${target}`, hash: h, copy: { version: 1, name: 'review', source: '/h/.agents/skills/review', hash: h, copiedAt: 1 } });
	const [record] = buildRecords([loc({}), loc({ target: 'claude-code', dir: '/h/c/review', root: '/h/c', hash: hash('b') }), copy('codex', hash('a')), copy('grok', hash('c'))]);
	expect(skillCell(record!, 'pi').state).toBe('off');
	expect(skillCell(record!, 'agents')).toMatchObject({ state: 'manual', origin: true });
	expect(skillCell(record!, 'claude-code')).toMatchObject({ state: 'manual', origin: false });
	expect(skillCell(record!, 'codex').state).toBe('copy');
	expect(skillCell(record!, 'grok').state).toBe('stale');
});

test('a record with only copies has no source and its copies are never stale', () => {
	const [record] = buildRecords([loc({ target: 'codex', copy: { version: 1, name: 'review', source: '/gone', hash: hash('z'), copiedAt: 1 } })]);
	expect(record!.source).toBeUndefined();
	expect(skillCell(record!, 'codex').state).toBe('copy');
});

test('filters by scope and by name or description', () => {
	const records = buildRecords([loc({}), loc({ name: 'other', folder: 'other', description: 'Writes docs', scope: 'vault' })]);
	expect(filterRecords(records, '', 'vault').map(r => r.name)).toEqual(['other']);
	expect(filterRecords(records, 'DOCS', 'all').map(r => r.name)).toEqual(['other']);
	expect(filterRecords(records, 'review', 'all').map(r => r.name)).toEqual(['review']);
});

test('markers must be complete', () => {
	const ok = { version: 1, name: 'a', source: '/x', hash: hash('a'), copiedAt: 5 };
	expect(parseMarker(JSON.stringify(ok))).toEqual(ok);
	expect(parseMarker('nope')).toBeUndefined();
	expect(parseMarker(JSON.stringify({ ...ok, hash: 'short' }))).toBeUndefined();
	expect(parseMarker(JSON.stringify({ ...ok, version: 2 }))).toBeUndefined();
});
