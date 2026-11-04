import { expect, test } from 'vitest';
import { createRevision } from '../../src/modules/archives/core/schema/definitions';
import type { ArchiveTypeDefinition, EntityRecord } from '../../src/modules/archives/core/schema/model';
import { decodeEntity, encodeEntity, frontmatter } from '../../src/modules/archives/core/generic/markdown';

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
	expect(() => encodeEntity({ ...record, values: { ...values, period: '2026-03-01' } }, type)).toThrow(
		'invalid-value',
	);
});

test('belonging money and lifecycle table have a stable portable Markdown representation', async () => {
	const { BELONGING } = await import('../../src/modules/archives/core/belongings/preset');
	const { parseBelonging } = await import('../../src/modules/archives/core/belongings/lifecycle');
	const values = {
		name: 'Golden item', category: 'Devices', purchaseDate: '2026-01', purchase: { amount: '12345678901234567890.0100', currency: 'CNY' },
		status: 'sold', exitDate: '2026-02-01', sale: { amount: '0.00', currency: 'CNY' },
		events: [{ rowId: 'golden-sale', values: { status: 'sold', date: '2026-02-01', exitDate: '2026-02-01', sale: { amount: '0.00', currency: 'CNY' }, commandHash: 'a'.repeat(64) } }],
	};
	const record: EntityRecord = { id: 'golden-item', typeId: BELONGING.id, schemaRevisionId: 'golden-belonging-v1', lifecycle: 'active', values, path: 'huhu/archives/belongings/golden/profile.md', contentHash: '', modified: 0 };
	const raw = encodeEntity(record, BELONGING);
	expect(raw).toMatchSnapshot('belonging lifecycle table and exact money');
	const decoded = decodeEntity(raw, record.path, 'hash', 0, await createRevision(BELONGING, [], 1, record.schemaRevisionId));
	expect(decoded.values).toEqual(values);
	expect(parseBelonging(decoded).events[0]?.rowId).toBe('golden-sale');
});

test('person journal rows keep IDs, related entity IDs and multiline text in portable archive Markdown', async () => {
	const { PERSON_WITH_JOURNAL } = await import('../../src/modules/archives/core/person-journal/preset');
	const values = {
		name: '同名人物', notes: '**保留资料**\n第二行',
		journal: [{ rowId: 'journal-row-001', values: { date: '2026-11-05', title: '手工纪事', content: '**Markdown 内容**\n第二段\n', relatedEntityIds: ['person-002', 'company-001'] } }],
	};
	const record: EntityRecord = { id: 'person-001', typeId: PERSON_WITH_JOURNAL.id, schemaRevisionId: 'golden-person-journal-v3', lifecycle: 'active', values, path: 'huhu/archives/people/person-001/profile.md', contentHash: '', modified: 0 };
	const raw = encodeEntity(record, PERSON_WITH_JOURNAL);
	expect(raw).toMatchSnapshot('person journal table and preserved Markdown');
	const decoded = decodeEntity(raw, record.path, 'hash', 0, await createRevision(PERSON_WITH_JOURNAL, [], 1, record.schemaRevisionId));
	expect(decoded.values).toEqual(values);
	expect(frontmatter(raw)['person-journal']).toEqual(values.journal);
});
