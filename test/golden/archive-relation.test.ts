import { expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { createRelationMarkdown, readRelation, patchRelation } from '../../src/modules/archives/core/relation-markdown';
import type { ArchiveRelation, RelationType } from '../../src/modules/archives/core/relation-model';

test('independent relation Markdown is portable and preserves precise attributes, explicit state and context roles', async () => {
	const type: RelationType = {
		relationTypeId: 'employment', label: '任职', inverseLabel: '任职人员', direction: 'directed', sourceTypes: ['person'], targetTypes: ['company'],
		revisionId: 'employment-revision-1', parentRevisionIds: [], displayVersion: 1, contentHash: 'definition-hash', temporal: true, allowSelf: false, acyclic: false,
		cardinality: { scope: 'overlap', includeDrafts: false }, duplicates: { policy: 'overlap', fieldIds: ['role'], contextRoles: ['project'] }, contextRoles: [{ role: 'project', types: ['project'], required: false }], deletePolicy: 'retain',
		fields: [
			{ fieldId: 'role', storageKey: 'job-title', label: '职务', codec: 'text' },
			{ fieldId: 'amount', storageKey: 'contract-amount', label: '金额', codec: 'money' },
			{ fieldId: 'confirmed', storageKey: 'confirmed', label: '确认', codec: 'boolean' },
			{ fieldId: 'notes', storageKey: 'relation-notes', label: '备注', codec: 'markdown' },
		],
	};
	const relation: ArchiveRelation = { id: 'employment-001', operationId: 'operation-001', requestHash: 'original-request-hash', relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId,
		sourceId: 'person-001', targetId: 'company-001', values: { role: '000123', amount: { amount: '1000000.0001', currency: 'CNY' }, confirmed: false, notes: '保留任职备注。' },
		validFrom: { value: '2024-05', precision: 'month' }, validTo: { value: '2025-06-30', precision: 'day' }, status: 'past', lifecycle: 'active', contextRefs: { project: 'project-001' }, path: 'huhu/档案/关联记录/employment/employment-001.md', raw: '', readOnly: false };
	const raw = createRelationMarkdown(relation, type);
	await expect(raw).toMatchFileSnapshot(fileURLToPath(new URL('./__snapshots__/archive-relation-v2.md', import.meta.url)));
	const decoded = readRelation(raw, relation.path, type);
	expect(decoded).toEqual({ ...relation, raw });
	const patched = patchRelation(raw + '\n自由正文不受管理。\n', decoded, { base: { relation: decoded, contentHash: '', schemaContentHash: type.contentHash }, changes: { values: { confirmed: true } }, intent: 'complete' }, type, '2026-10-27T00:00:00.000Z');
	expect(readRelation(patched, relation.path, type).values).toEqual({ ...relation.values, confirmed: true });
	expect(patched).toContain('自由正文不受管理。');
});
