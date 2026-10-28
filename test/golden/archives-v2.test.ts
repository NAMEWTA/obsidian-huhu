import { expect, test } from 'vitest';
import {
	createEntityMarkdown,
	archiveFrontmatter,
	entityValues,
} from '../../src/modules/archives/core/persist/v2/markdown';
import type { ArchiveEntity, ArchiveTypeDefinition } from '../../src/modules/archives/core/schema';

test('v2 archive Markdown preserves its envelope, scalar spelling and stable Markdown field region', () => {
	const type: ArchiveTypeDefinition = {
		typeId: 'tax',
		revisionId: 'revision-tax-1',
		parentRevisionIds: [],
		contentHash: 'fixture',
		displayVersion: 1,
		label: '税务',
		folder: '税务档案',
		titleFieldId: 'code',
		fields: [
			{ fieldId: 'code', storageKey: 'tax-code', label: '编号', codec: 'text' },
			{ fieldId: 'period', storageKey: 'tax-period', label: '期间', codec: 'date' },
			{ fieldId: 'confirmed', storageKey: 'tax-confirmed', label: '确认', codec: 'boolean' },
			{ fieldId: 'amount', storageKey: 'tax-amount', label: '金额', codec: 'money' },
			{ fieldId: 'notes', storageKey: 'tax-notes', label: '说明', codec: 'markdown' },
		],
	};
	const entity: ArchiveEntity = {
		id: 'entity-tax-1',
		typeId: 'tax',
		schemaRevisionId: type.revisionId,
		formatVersion: 2,
		path: 'huhu/档案/税务档案/00123-entity-tax-1/基本信息.md',
		folderPath: 'huhu/档案/税务档案/00123-entity-tax-1',
		values: {
			code: '00123',
			period: { value: '2026-03', precision: 'month' },
			confirmed: false,
			amount: { amount: '123456789.0100', currency: 'CNY' },
			notes: '**保留原始 Markdown**\n第二行',
		},
		createdAt: '2026-10-26T01:02:03.000Z',
		updatedAt: '2026-10-26T01:02:03.000Z',
		raw: '',
		readOnly: false,
	};
	const raw = createEntityMarkdown(entity, type);
	expect(raw).toMatchInlineSnapshot(`
"---
huhu-type: archive-record
huhu-format-version: 2
huhu-id: entity-tax-1
huhu-archive-type-id: tax
huhu-schema-revision: revision-tax-1
huhu-created-at: 2026-10-26T01:02:03.000Z
huhu-updated-at: 2026-10-26T01:02:03.000Z
huhu-state: draft
tax-code: \"00123\"
tax-period: 2026-03
tax-period-precision: month
tax-confirmed: false
tax-amount:
  amount: \"123456789.0100\"
  currency: CNY
---

# 00123

<!-- huhu:field notes -->
**保留原始 Markdown**
第二行
<!-- /huhu:field notes -->
"
`);
	expect(
		entityValues(archiveFrontmatter(raw), type, raw, () => {
			throw new Error('invalid golden field');
		}),
	).toEqual(entity.values);
});
