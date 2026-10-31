import { describe, expect, test } from 'vitest';
import { FieldCodecRegistry, matches, mergeValues, validateValues } from './fields';
import {
	assertPropertyCompatibility,
	createRevision,
	incompatibleFields,
	revisionGraph,
	validateDefinition,
} from './definitions';
import { PERSON, presetRevisions } from './presets';
import type { ArchiveTypeDefinition, FieldDefinition } from './model';
import { canonical } from './value';
const field = (kind: FieldDefinition['kind'], extra: Partial<FieldDefinition> = {}): FieldDefinition => ({
	fieldId: 'f',
	storageKey: 'f',
	label: '字段',
	kind,
	...extra,
});
describe('archive field codecs', () => {
	test('text preserves leading zeros; booleans and zero are values, not missing', () => {
		expect(FieldCodecRegistry.text.validate('0012', field('text'))).toBe(true);
		validateValues([field('boolean', { required: true })], { f: false }, true);
		validateValues([field('integer', { required: true })], { f: 0 }, true);
		expect(() => validateValues([field('integer')], { f: 'bad' }, false)).toThrow('invalid-value');
		expect(() => validateValues([field('integer')], { f: Infinity }, false)).toThrow('invalid-value');
	});
	test('month precision never manufactures a day and date-time requires an offset', () => {
		expect(FieldCodecRegistry.date.validate('2025-03', field('date', { precision: 'mixed' }))).toBe(true);
		expect(FieldCodecRegistry.date.validate('2025-03', field('date', { precision: 'day' }))).toBe(false);
		expect(FieldCodecRegistry.date.validate('2025-02-29', field('date'))).toBe(false);
		expect(FieldCodecRegistry.datetime.validate('2026-10-28T10:00:00+08:00', field('datetime'))).toBe(true);
		expect(FieldCodecRegistry.datetime.validate('2026-10-28T10:00:00', field('datetime'))).toBe(false);
	});
	test('money uses exact decimal strings with currency; archived options remain readable', () => {
		validateValues([field('money')], { f: { amount: '12345678901234567890.01', currency: 'CNY' } }, true);
		expect(() => validateValues([field('money')], { f: { amount: 1.01, currency: 'CNY' } }, true)).toThrow();
		const option = field('select', { options: [{ id: 'old', value: 'old-value', label: '改名', archived: true }] });
		validateValues([option], { f: 'old-value' }, true, { f: 'old-value' });
		expect(() => validateValues([option], { f: 'old-value' }, true)).toThrow('archived-option');
	});
	test('required checks only on activation; repeated rows require unique identity', () => {
		validateValues([field('text', { required: true })], {}, false);
		expect(() => validateValues([field('text', { required: true })], {}, true)).toThrow('required-field');
		const table = field('table', { columns: [field('text')] });
		validateValues([table], { f: [{ rowId: 'r1', values: { f: 'one' } }] }, false);
		expect(() =>
			validateValues(
				[table],
				{
					f: [
						{ rowId: 'r1', values: {} },
						{ rowId: 'r1', values: {} },
					],
				},
				false,
			),
		).toThrow();
	});
	test('three-way merge distinguishes removal/null/empty, preserves independent edits', () => {
		expect(mergeValues({ a: 'old', b: 1 }, { a: 'old', b: 2, unknown: null }, { a: '' }, ['a'])).toEqual({
			a: '',
			b: 2,
			unknown: null,
		});
		expect(mergeValues({ a: 1 }, { a: 1 }, {}, ['a'])).toEqual({});
		expect(mergeValues({ a: 1 }, { a: 1 }, { a: null }, ['a'])).toEqual({ a: null });
		expect(() => mergeValues({ a: 1 }, { a: 2 }, { a: 3 }, ['a'])).toThrow('field-conflict');
	});
	test('conditions are declarative; hiding does not mutate values', () => {
		const values = { enabled: false, note: 'retained' };
		expect(matches({ all: [{ fieldId: 'enabled', op: 'eq', value: true }] }, values)).toBe(false);
		expect(values.note).toBe('retained');
	});
});
describe('archive schema identity and evolution', () => {
	test('all built-in definitions validate and have reproducible semantic hashes', async () => {
		const first = await presetRevisions(),
			second = await presetRevisions();
		expect(first).toEqual(second);
		for (const revision of first) validateDefinition(revision.definition, [PERSON]);
	});
	test('label changes are compatible; keys, types, required fields and option values are not implicit migrations', () => {
		expect(
			incompatibleFields(PERSON, {
				...PERSON,
				label: '客户',
				fields: PERSON.fields.map((field) => ({ ...field, label: '新' + field.label })),
			}),
		).toEqual([]);
		expect(
			incompatibleFields(PERSON, {
				...PERSON,
				fields: PERSON.fields.map((field) =>
					field.fieldId === 'name' ? { ...field, storageKey: 'customer-name' } : field,
				),
			}),
		).toContain('name');
	});
	test('rejects reserved/duplicate keys and cross-type Properties conflicts', () => {
		expect(() =>
			validateDefinition({ ...PERSON, fields: [...PERSON.fields, field('text', { storageKey: 'huhu-state' })] }),
		).toThrow();
		expect(() =>
			validateDefinition({ ...PERSON, fields: [...PERSON.fields, field('text', { storageKey: 'name' })] }),
		).toThrow();
		const type: ArchiveTypeDefinition = {
			...PERSON,
			id: 'other',
			fields: [field('integer', { storageKey: 'name' })],
			nameFieldId: 'f',
		};
		expect(() => assertPropertyCompatibility(type, [PERSON])).toThrow('property-type-conflict');
	});
	test('DAG detects forks even with a last-writer-wins current pointer; merge resolves both heads', async () => {
		const base = await createRevision(PERSON, [], 1, 'base');
		const left = await createRevision({ ...PERSON, label: 'Left' }, ['base'], 2, 'left');
		const right = await createRevision({ ...PERSON, label: 'Right' }, ['base'], 2, 'right');
		expect(revisionGraph([base, left, right]).heads).toEqual(['left', 'right']);
		const merge = await createRevision(PERSON, ['left', 'right'], 3, 'merge');
		expect(revisionGraph([base, left, right, merge])).toEqual({ heads: ['merge'], missing: [], cycle: false });
		expect(revisionGraph([merge]).missing).toEqual(['left', 'right']);
	});
	test('semantic hash ignores object key order but includes labels and option order', async () => {
		expect(canonical({ a: 1, b: 2 })).toEqual(canonical({ b: 2, a: 1 }));
		const first = await createRevision(PERSON, [], 1, 'one'),
			other = await createRevision({ ...PERSON, label: 'Different' }, [], 2, 'two');
		expect(first.contentHash).not.toBe(other.contentHash);
	});
});

describe('archive history and nested boundaries', () => {
	test('required child columns validate only on activation and archived options retain row identity', () => {
		const child = field('select', {
			required: true,
			options: [{ id: 'old', value: 'old', label: 'Old', archived: true }],
		});
		const table = field('table', { columns: [child] });
		validateValues([table], { f: [{ rowId: 'r1', values: {} }] }, false);
		expect(() => validateValues([table], { f: [{ rowId: 'r1', values: {} }] }, true)).toThrow('required-field');
		const previous = {
			f: [
				{ rowId: 'r1', values: { f: 'old' } },
				{ rowId: 'r2', values: {} },
			],
		};
		validateValues([table], { f: [{ rowId: 'r1', values: { f: 'old' } }] }, false, previous);
		expect(() => validateValues([table], { f: [{ rowId: 'r3', values: { f: 'old' } }] }, false, previous)).toThrow(
			'archived-option',
		);
	});
	test('long definition histories use iterative DAG traversal, not the JavaScript call stack', async () => {
		const base = await createRevision(PERSON, [], 1, 'revision-0');
		const history = Array.from({ length: 15000 }, (_, i) => ({
			...base,
			revisionId: `revision-${i}`,
			parentRevisionIds: i ? [`revision-${i - 1}`] : [],
		}));
		expect(revisionGraph(history)).toEqual({ heads: ['revision-14999'], missing: [], cycle: false });
	});
	test('an old published storage key cannot silently change its Properties kind', () => {
		const changed = {
			...PERSON,
			fields: PERSON.fields.map((item) =>
				item.fieldId === 'region' ? { ...item, kind: 'integer' as const } : item,
			),
		};
		expect(() => assertPropertyCompatibility(changed, [PERSON])).toThrow('property-type-conflict');
	});
});
