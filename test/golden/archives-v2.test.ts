import { expect, test } from 'vitest';
import { createRevision } from '../../src/modules/archives/core/schema/definitions';
import type { ArchiveTypeDefinition, EntityRecord } from '../../src/modules/archives/core/schema/model';
import { decodeEntity, encodeEntity, frontmatter } from '../../src/modules/archives/core/generic/markdown';
import { parseRecord } from '../../src/modules/archives/core/persist/markdown';

// Rewritten from the deleted v2 envelope golden onto the generic archives codec.
// The business invariants stay: leading zeros, month precision, explicit false,
// exact money spelling, and a stable markdown field block.
const type: ArchiveTypeDefinition = {
	kind: 'type',
	id: 'tax',
	label: '税务',
	icon: 'file',
	folder: '税务档案',
	enabled: true,
	nameFieldId: 'code',
	fields: [
		{ fieldId: 'code', storageKey: 'tax-code', label: '编号', kind: 'text' },
		{ fieldId: 'period', storageKey: 'tax-period', label: '期间', kind: 'date', precision: 'month' },
		{ fieldId: 'confirmed', storageKey: 'tax-confirmed', label: '确认', kind: 'boolean' },
		{ fieldId: 'amount', storageKey: 'tax-amount', label: '金额', kind: 'money' },
		{ fieldId: 'notes', storageKey: 'tax-notes', label: '说明', kind: 'markdown' },
	],
};
const values = {
	code: '00123',
	period: '2026-03',
	confirmed: false,
	amount: { amount: '123456789.0100', currency: 'CNY' },
	notes: '**保留原始 Markdown**\n第二行',
};

test('generic archive Markdown preserves leading zeros, month precision, false, money spelling and the markdown field', async () => {
	const record: EntityRecord = {
		id: 'entity-tax-1',
		typeId: type.id,
		schemaRevisionId: 'revision-tax-1',
		lifecycle: 'draft',
		values,
		path: 'huhu/档案/税务档案/00123-entity-tax-1/基本信息.md',
		contentHash: '',
		modified: 0,
		format: 2,
	};
	const raw = encodeEntity(record, type);
	expect(raw).toMatchInlineSnapshot(`
		"---
		"huhu-format-version": 2
		"huhu-type": "archive-record"
		"huhu-id": "entity-tax-1"
		"huhu-archive-type-id": "tax"
		"huhu-schema-revision": "revision-tax-1"
		"huhu-state": "draft"
		"tax-code": "00123"
		"tax-period": "2026-03"
		"tax-confirmed": false
		"tax-amount": {"amount":"123456789.0100","currency":"CNY"}
		---


		## 说明

		<!-- huhu:field notes -->
		**保留原始 Markdown**
		第二行
		<!-- /huhu:field notes -->
		"
	`);
	const schema = await createRevision(type, [], 1, record.schemaRevisionId);
	expect(decodeEntity(raw, record.path, 'hash', 0, schema).values).toEqual(values);
	expect(frontmatter(raw)['huhu-created-at']).toBeUndefined();
	expect(frontmatter(raw)['huhu-updated-at']).toBeUndefined();
	expect(parseRecord(raw, record.path)).toBeNull();
	expect(() => encodeEntity({ ...record, values: { ...values, period: '2026-03-01' } }, type)).toThrow(
		'invalid-value',
	);
});
