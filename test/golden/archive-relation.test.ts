import { expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { createRevision } from '../../src/modules/archives/core/schema/definitions';
import type { RelationRecord, RelationTypeDefinition } from '../../src/modules/archives/core/schema/model';
import { decodeRelation, encodeRelation, patchValues } from '../../src/modules/archives/core/generic/markdown';

// Rewritten from the deleted independent-relation golden.
// Month/day validity, context role, money spelling, explicit false, and unmanaged prose stay.
const type: RelationTypeDefinition = {
	kind: 'relation-type',
	id: 'employment',
	label: '任职',
	enabled: true,
	sourceTypes: ['person'],
	targetTypes: ['company'],
	directed: true,
	forwardLabel: '任职',
	inverseLabel: '任职人员',
	sourceCardinality: { scope: 'active' },
	targetCardinality: { scope: 'active' },
	allowSelf: false,
	acyclic: false,
	onDelete: 'retain',
	duplicatePolicy: 'values',
	contextRoles: [{ role: 'project', label: '项目', typeIds: ['project'] }],
	fields: [
		{ fieldId: 'role', storageKey: 'job-title', label: '职务', kind: 'text' },
		{ fieldId: 'amount', storageKey: 'contract-amount', label: '金额', kind: 'money' },
		{ fieldId: 'confirmed', storageKey: 'confirmed', label: '确认', kind: 'boolean' },
		{ fieldId: 'notes', storageKey: 'relation-notes', label: '备注', kind: 'markdown' },
	],
};
const values = {
	role: '000123',
	amount: { amount: '1000000.0001', currency: 'CNY' },
	confirmed: false,
	notes: '保留任职备注。',
};

test('independent relation Markdown keeps precise attributes, validity, context and unmanaged prose', async () => {
	const relation: RelationRecord = {
		id: 'employment-001',
		relationTypeId: type.id,
		schemaRevisionId: 'employment-revision-1',
		sourceId: 'person-001',
		targetId: 'company-001',
		values,
		validFrom: { value: '2024-05', precision: 'month' },
		validTo: { value: '2025-06-30', precision: 'day' },
		lifecycle: 'active',
		contextRefs: { project: 'project-001' },
		path: 'huhu/档案/关联记录/employment/employment-001.md',
		contentHash: '',
		modified: 0,
	};
	const raw = encodeRelation(relation, type);
	await expect(raw).toMatchFileSnapshot(
		fileURLToPath(new URL('./__snapshots__/archive-relation-v2.md', import.meta.url)),
	);
	const schema = await createRevision(type, [], 1, relation.schemaRevisionId);
	expect(decodeRelation(raw, relation.path, 'hash', 0, schema)).toMatchObject({
		id: relation.id,
		sourceId: relation.sourceId,
		targetId: relation.targetId,
		lifecycle: 'active',
		validFrom: relation.validFrom,
		validTo: relation.validTo,
		contextRefs: relation.contextRefs,
		values,
	});
	const patched = patchValues(
		raw + '\n自由正文不受管理。\n',
		type.fields,
		{ ...values, confirmed: true },
		['confirmed'],
	);
	expect(decodeRelation(patched, relation.path, 'hash', 0, schema).values).toEqual({
		...values,
		confirmed: true,
	});
	expect(patched).toContain('自由正文不受管理。');
	expect(patched).toContain('"huhu-valid-from": "2024-05"');
	expect(patched).toContain('"huhu-valid-from-precision": "month"');
	expect(patched).toContain('"huhu-valid-to": "2025-06-30"');
	expect(patched).toContain('"huhu-valid-to-precision": "day"');
	expect(patched).toContain('"huhu-context-refs": {"project":"project-001"}');
});
