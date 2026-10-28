import { expect, test } from 'vitest';
import { parseRecord } from '../persist/markdown';
import { createRevision } from '../schema/definitions';
import { PERSON } from '../schema/presets';
import type { EntityRecord } from '../schema/model';
import {
	decodeDefinition,
	decodeEntity,
	encodeDefinition,
	encodeEntity,
	fieldBlock,
	patchProperties,
	frontmatter,
} from './markdown';
const entity: EntityRecord = {
	id: 'entity-1',
	typeId: PERSON.id,
	schemaRevisionId: 'preset-type-person-v1',
	lifecycle: 'active',
	values: { name: '0012', notes: 'hello', tags: [] },
	path: 'huhu/档案/个人档案/a/基本信息.md',
	contentHash: '',
	modified: 0,
	format: 2,
};
test('v2 records never enter the legacy parser; exact revision decodes fields', async () => {
	const schema = await createRevision(PERSON, [], 1, entity.schemaRevisionId),
		raw = encodeEntity(entity, PERSON);
	expect(parseRecord(raw, entity.path)).toBeNull();
	expect(decodeEntity(raw, entity.path, 'hash', 0, schema).values).toEqual(entity.values);
});
test('surgical patch retains BOM, CRLF, unknown YAML comments, quotes and free Markdown byte-for-byte', () => {
	const raw =
		'\uFEFF---\r\nname: "before" # keep inline\r\ncode: "0012"  # unknown\r\ncustom:\r\n  - one # comment\r\n  - two\r\nnullable: null\r\n---\r\n# Custom heading\r\nFree **body**\r\n';
	expect(patchProperties(raw, { name: 'after' })).toBe(raw.replace('"before"', '"after"'));
	expect(patchProperties(raw, { absent: undefined })).toBe(raw);
	expect(patchProperties(raw, { nullable: undefined })).toBe(raw.replace('nullable: null\r\n', ''));
	expect(patchProperties(raw, { custom: ['three'] })).toContain('code: "0012"  # unknown\r\n');
});
test('markdown field IDs survive display renames, and duplicated managed blocks are diagnosed', () => {
	const raw = encodeEntity(entity, PERSON),
		renamed = { ...PERSON, fields: PERSON.fields.map((field) => ({ ...field, label: 'RENAMED' })) };
	expect(encodeEntity(entity, renamed, raw, [])).toBe(raw);
	expect(fieldBlock(raw, 'notes')?.text).toBe('hello');
	expect(() => fieldBlock(raw + '\n<!-- huhu:field notes -->\nextra\n<!-- /huhu:field notes -->', 'notes')).toThrow(
		'invalid-field-block',
	);
});
test('definition protocol detects edited immutable content and future format', async () => {
	const revision = await createRevision(PERSON, [], 1, 'revision-1'),
		raw = encodeDefinition(revision);
	expect(await decodeDefinition(raw)).toEqual(revision);
	await expect(decodeDefinition(raw.replace('个人档案', '客户档案'))).rejects.toThrow('revision-hash-mismatch');
	await expect(decodeDefinition(patchProperties(raw, { 'huhu-format-version': 999 }))).rejects.toThrow(
		'future-format',
	);
});

test.each(['name: |\n  first\n  second\n', 'name:\n  - first\n  - second\n', 'name: { nested: true }\n'])(
	'replacing block and collection values keeps the next unknown key valid: %s',
	(source) => {
		const raw = `---\n${source}unknown: "0012" # untouched\n---\nFree body\n`;
		const patched = patchProperties(raw, { name: 'New' });
		expect(frontmatter(patched)).toEqual({ name: 'New', unknown: '0012' });
		expect(patched).toContain('unknown: "0012" # untouched\n---\nFree body\n');
	},
);
test('optional undefined definition properties have the same portable semantic digest after reopen', async () => {
	const revision = await createRevision({ ...PERSON, defaultTemplateId: undefined }, [], 1, 'optional-properties');
	expect((await decodeDefinition(encodeDefinition(revision))).contentHash).toBe(revision.contentHash);
});
