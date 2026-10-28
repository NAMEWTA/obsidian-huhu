import { expect, test } from 'vitest';
import { parse, serialize } from './parser/parse';
import { splitFrontmatter } from './parser/generate-default-markdown';
import { readSkillShortcuts } from './skill-shortcuts';

test('board-local skill declarations preserve untouched bytes and opaque fields during an intentional edit', () => {
	const source = '---\r\ncustom: keep # personal\r\nskills:\r\n  - id: review\r\n    label: Review\r\n    agentId: codex\r\n    skillName: review\r\n    promptTemplate: "  {{input}}  "\r\n    extension: keep\r\n    destination: {kind: existing, sessionId: gone}\r\n---\r\n\r\n<!-- personal body -->\r\n';
	const data = parse(source);
	expect(data.skills?.[0]?.directSend).toBe(false); expect(data.skills?.[0]?.destination).toEqual({ kind: 'existing', sessionId: 'gone' });
	expect(serialize(data)).toBe(source);
	data.skills![0]!.label = 'Changed'; data.skills![0]!.directSend = true;
	const next = serialize(data);
	expect(next).toContain('custom: keep # personal\r\n'); expect(next).toContain('<!-- personal body -->\r\n');
	expect((splitFrontmatter(next).frontmatter.skills as Array<Record<string, unknown>>)[0]?.extension).toBe('keep');
	expect(parse(next).skills).toEqual(data.skills); expect(serialize(parse(next))).toBe(next);
});
test('invalid destinations cannot silently become fresh sessions; duplicate IDs do not create duplicate buttons', () => {
	const row = { id: 'a', label: 'A', agentId: 'missing-agent', skillName: '', promptTemplate: 'Hi', destination: { kind: 'existing', sessionId: '' } };
	expect(readSkillShortcuts([{ ...row, destination: null }, { ...row, destination: { kind: 'guess' } }])).toEqual([]);
	expect(readSkillShortcuts([row, row])?.[0]?.destination).toEqual(row.destination);
	expect(readSkillShortcuts([row, row])).toHaveLength(1);
});
test('a fresh destination keeps a saved Space id; a blank or non-string id reads as unbound', () => {
	const row = { id: 'a', label: 'A', agentId: 'codex', skillName: '', promptTemplate: 'Hi' };
	const read = (spaceId: unknown) => readSkillShortcuts([{ ...row, destination: { kind: 'fresh', cwd: '', spaceId } }])?.[0]?.destination;
	expect(read('space-1')).toEqual({ kind: 'fresh', cwd: '', spaceId: 'space-1' });
	for (const bad of ['', 7, null, undefined]) expect(read(bad)).toEqual({ kind: 'fresh', cwd: '' });
});
