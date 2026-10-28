import { ContactsError } from './model';
import { fieldCodecRegistry } from './field-codecs';
import { archiveFrontmatter, archiveMarkdown, entityValues } from './persist/v2/markdown';
import { patchArchiveFieldValues } from './persist/v2/patch';
import { patchYamlValues } from './persist/yaml-values';
import { sameRelationValue, validateRelationRecord, type ArchiveRelation, type RelationType, type UpdateRelation } from './relation-model';

export function readRelation(raw: string, path: string, type: RelationType): ArchiveRelation {
	const data = archiveFrontmatter(raw);
	if (data['huhu-type'] !== 'archive-relation' || data['huhu-format-version'] !== 2) throw new ContactsError('futureFormat');
	const relation: ArchiveRelation = {
		id: data['huhu-id'] as string, relationTypeId: data['huhu-relation-type-id'] as string, schemaRevisionId: data['huhu-schema-revision'] as string,
		sourceId: data['huhu-source-id'] as string, targetId: data['huhu-target-id'] as string,
		operationId: data['huhu-operation-id'] as string, requestHash: data['huhu-request-hash'] as string,
		lifecycle: data['huhu-state'] as ArchiveRelation['lifecycle'], status: data['relation-status'] as ArchiveRelation['status'],
		contextRefs: data['context-refs'] as Record<string, string>, path, raw, readOnly: false,
		values: entityValues(data, type, raw, (id) => { throw new ContactsError('invalidField', id); }),
	};
	if (Object.hasOwn(data, 'valid-from')) relation.validFrom = { value: data['valid-from'] as string, precision: data['valid-from-precision'] as 'day' | 'month' };
	if (Object.hasOwn(data, 'valid-to')) relation.validTo = { value: data['valid-to'] as string, precision: data['valid-to-precision'] as 'day' | 'month' };
	validateRelationRecord(relation, type, relation.lifecycle === 'active');
	return relation;
}
export function createRelationMarkdown(relation: ArchiveRelation, type: RelationType): string {
	const data: Record<string, unknown> = {
		'huhu-type': 'archive-relation', 'huhu-format-version': 2, 'huhu-id': relation.id, 'huhu-relation-type-id': relation.relationTypeId,
		'huhu-schema-revision': relation.schemaRevisionId, 'huhu-source-id': relation.sourceId, 'huhu-target-id': relation.targetId,
		'huhu-operation-id': relation.operationId, 'huhu-request-hash': relation.requestHash, 'huhu-state': relation.lifecycle, 'relation-status': relation.status, 'context-refs': relation.contextRefs,
	};
	let body = `\n# ${type.label.replace(/\r?\n/g, ' ')}\n\n${relation.sourceId} → ${relation.targetId}\n`;
	for (const field of type.fields) if (Object.hasOwn(relation.values, field.fieldId)) {
		const encoded = fieldCodecRegistry[field.codec].encode(relation.values[field.fieldId], field);
		if (field.codec === 'markdown' && typeof encoded === 'string') {
			if (/<!--\s*\/?huhu:field\b/.test(encoded)) throw new ContactsError('invalidField', field.fieldId);
			body += `\n<!-- huhu:field ${field.fieldId} -->\n${encoded}\n<!-- /huhu:field ${field.fieldId} -->\n`;
		} else if (field.codec === 'date' && encoded !== null) {
			const date = encoded as { value: string; precision: string }; data[field.storageKey] = date.value; data[field.storageKey + '-precision'] = date.precision;
		} else data[field.storageKey] = encoded;
	}
	for (const [key, value] of [['valid-from', relation.validFrom], ['valid-to', relation.validTo]] as const) if (value) { data[key] = value.value; data[key + '-precision'] = value.precision; }
	return archiveMarkdown(data, body);
}
export function patchRelation(raw: string, base: ArchiveRelation, input: UpdateRelation, type: RelationType, time: string): string {
	const current = readRelation(raw, base.path, type);
	for (const key of ['id', 'relationTypeId', 'schemaRevisionId', 'sourceId', 'targetId', 'operationId', 'requestHash'] as const) if (current[key] !== base[key]) throw new ContactsError('invalidRelation');
	if (current.lifecycle === 'deleted') throw new ContactsError('invalidRelation');
	const values = new Map<string, unknown>();
	const next = { ...current, values: { ...current.values, ...input.changes.values } };
	for (const key of ['validFrom', 'validTo', 'status', 'contextRefs'] as const) if (Object.hasOwn(input.changes, key)) {
		const value = input.changes[key];
		if (!sameRelationValue(base[key], current[key]) && !sameRelationValue(current[key], value ?? undefined)) throw new ContactsError('conflict', key);
		Object.assign(next, { [key]: value ?? undefined });
	}
	const lifecycle = input.intent === 'archive' ? 'archived' : input.intent === 'complete' ? 'active' : 'draft';
	if (current.lifecycle !== base.lifecycle && current.lifecycle !== lifecycle) throw new ContactsError('conflict', 'lifecycle');
	next.lifecycle = lifecycle;
	validateRelationRecord(next, type, input.intent === 'complete');
	for (const [key, value] of [['valid-from', next.validFrom], ['valid-to', next.validTo]] as const) { values.set(key, value?.value); values.set(key + '-precision', value?.precision); }
	values.set('relation-status', next.status); values.set('context-refs', next.contextRefs); values.set('huhu-state', lifecycle);
	const fields = patchArchiveFieldValues(raw, base.values, input.changes.values ?? {}, type, input.intent === 'complete' ? 'complete' : 'draft', time);
	const patched = patchYamlValues(fields, values), verified = readRelation(patched, base.path, type);
	if (!sameRelationValue(verified.values, next.values)) throw new ContactsError('writeUnverified', base.path);
	return patched;
}
