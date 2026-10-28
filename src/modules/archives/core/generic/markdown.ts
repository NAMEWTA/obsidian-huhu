import { isMap, isScalar, type Node } from 'yaml';
import { readMarkdownDocument, readYaml } from '../../../../shared/storage/markdown-document';
import {
	ArchiveError,
	type ArchiveDiagnostic,
	type ArchiveTypeDefinition,
	type DefinitionRevision,
	type EntityRecord,
	type FieldDefinition,
	type PrecisionDate,
	type RelationRecord,
	type RelationTypeDefinition,
	type Values,
} from '../schema/model';
import { createRevision, validateDefinition } from '../schema/definitions';
import { validateValues, validPrecisionDate } from '../schema/fields';
import { canonical, equal, identifier, object, own, requiredId } from '../schema/value';

export const FORMAT_VERSION = 2;
export const ENTITY_TAG = 'archive-record',
	RELATION_TAG = 'archive-relation',
	DEFINITION_TAG = 'archive-definition',
	HEAD_TAG = 'archive-definition-head',
	COLLECTION_TAG = 'archive-collection',
	MIGRATION_TAG = 'archive-migration';
export function frontmatter(raw: string): Record<string, unknown> {
	if (raw.length > 8 * 1024 * 1024) throw new ArchiveError('record-too-large');
	const document = readMarkdownDocument(raw),
		doc = readYaml(document.yaml);
	const value: unknown = doc.toJS({ maxAliasCount: 50 });
	if (!object(value)) throw new ArchiveError('invalid-format');
	return value;
}
/** Surgical top-level YAML patch: untouched tokens/comments/quotes and all free body bytes stay identical. */
export function patchProperties(raw: string, updates: Values): string {
	const source = readMarkdownDocument(raw),
		doc = readYaml(source.yaml),
		before = frontmatter(raw);
	if (
		!Object.keys(updates).some(
			(key) => !equal(before[key], updates[key]) || (updates[key] === undefined && own(before, key)),
		)
	)
		return raw;
	if (source.yaml === null) {
		const lines = Object.entries(updates)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`);
		return `---${source.newline}${lines.join(source.newline)}${source.newline}---${source.newline}${raw}`;
	}
	if (!isMap(doc.contents)) throw new ArchiveError('invalid-format');
	const yaml = source.yaml,
		edits: { from: number; to: number; text: string }[] = [],
		added: string[] = [];
	for (const [key, value] of Object.entries(updates)) {
		if (equal(before[key], value) && !(value === undefined && own(before, key))) continue;
		const pair = doc.contents.items.find((pair) => isScalar(pair.key) && pair.key.value === key);
		if (!pair) {
			if (value !== undefined) added.push(`${JSON.stringify(key)}: ${JSON.stringify(value)}`);
			continue;
		}
		const keyRange = (pair.key as Node).range,
			valueRange = (pair.value as Node | null)?.range;
		if (!keyRange) throw new ArchiveError('invalid-format');
		if (value === undefined) {
			const from = yaml.lastIndexOf('\n', keyRange[0] - 1) + 1;
			const end = valueRange?.[2] ?? keyRange[2],
				newline = yaml.indexOf('\n', Math.max(from, end - 1));
			edits.push({ from, to: newline < 0 ? yaml.length : newline + 1, text: '' });
		} else if (valueRange) {
			const previous = yaml.slice(valueRange[0], valueRange[1]);
			const ending = /\r?\n$/.exec(previous)?.[0] ?? '';
			edits.push({ from: valueRange[0], to: valueRange[1], text: JSON.stringify(value) + ending });
		} else {
			const colon = yaml.indexOf(':', keyRange[1]);
			if (colon < 0) throw new ArchiveError('invalid-format');
			edits.push({ from: colon + 1, to: colon + 1, text: ' ' + JSON.stringify(value) });
		}
	}
	let next = yaml;
	for (const edit of edits.sort((a, b) => b.from - a.from))
		next = next.slice(0, edit.from) + edit.text + next.slice(edit.to);
	if (added.length)
		next += (next.endsWith('\n') || !next ? '' : source.newline) + added.join(source.newline) + source.newline;
	const opening = /^(\uFEFF?[\t \r\n]*)---[\t ]*\r?\n/.exec(raw);
	if (!opening) throw new ArchiveError('invalid-format');
	const start = opening[0].length;
	return raw.slice(0, start) + next + raw.slice(start + yaml.length);
}
export function fieldBlock(raw: string, id: string): { from: number; to: number; text: string } | undefined {
	const open = `<!-- huhu:field ${id} -->`,
		close = `<!-- /huhu:field ${id} -->`;
	const from = raw.indexOf(open),
		end = raw.indexOf(close);
	if (from < 0 && end < 0) return undefined;
	if (
		from < 0 ||
		end < from ||
		raw.indexOf(open, from + open.length) >= 0 ||
		raw.indexOf(close, end + close.length) >= 0
	)
		throw new ArchiveError('invalid-field-block', id);
	return { from, to: end + close.length, text: raw.slice(from + open.length, end).replace(/^\r?\n|\r?\n$/g, '') };
}
export function valuesFrom(raw: string, properties: Values, fields: readonly FieldDefinition[]): Values {
	const values: Values = {};
	for (const field of fields) {
		if (field.kind === 'markdown') {
			const block = fieldBlock(raw, field.fieldId);
			if (block) values[field.fieldId] = block.text;
			else if (properties[field.storageKey] === null) values[field.fieldId] = null;
		} else if (own(properties, field.storageKey)) values[field.fieldId] = properties[field.storageKey];
	}
	return values;
}
export function patchValues(
	raw: string,
	fields: readonly FieldDefinition[],
	values: Values,
	dirty: readonly string[],
): string {
	const properties: Values = {};
	let result = raw;
	for (const id of dirty) {
		const field = fields.find((field) => field.fieldId === id);
		if (!field) throw new ArchiveError('unknown-field', id);
		const value = values[id];
		if (field.kind !== 'markdown') {
			properties[field.storageKey] = value;
			continue;
		}
		if (value !== undefined && value !== null && typeof value !== 'string')
			throw new ArchiveError('invalid-value', field.label, [id]);
		if (typeof value === 'string' && /<!--\s*\/?huhu:field\b/.test(value))
			throw new ArchiveError('reserved-marker', id);
		properties[field.storageKey] = value === null ? null : undefined;
		const block = fieldBlock(result, id);
		if (block?.text === value) continue;
		const newline = readMarkdownDocument(result).newline;
		const replacement =
			value === undefined || value === null
				? ''
				: `<!-- huhu:field ${id} -->${newline}${String(value)}${newline}<!-- /huhu:field ${id} -->`;
		result = block
			? result.slice(0, block.from) + replacement + result.slice(block.to)
			: replacement
				? result +
					`${newline}${newline}## ${field.label.replace(/\r?\n/g, ' ')}${newline}${newline}${replacement}${newline}`
				: result;
	}
	return patchProperties(result, properties);
}
export function entityMetadata(record: EntityRecord): Values {
	return {
		'huhu-format-version': FORMAT_VERSION,
		'huhu-type': ENTITY_TAG,
		'huhu-id': record.id,
		'huhu-archive-type-id': record.typeId,
		'huhu-schema-revision': record.schemaRevisionId,
		'huhu-state': record.lifecycle,
		'huhu-migration-id': record.migrationId,
		'huhu-expected-relations': record.expectedRelationIds,
	};
}
export function encodeEntity(
	record: EntityRecord,
	type: ArchiveTypeDefinition,
	original = '',
	dirty = Object.keys(record.values),
): string {
	validateValues(type.fields, record.values, record.lifecycle === 'active', record.values);
	return patchValues(patchProperties(original, entityMetadata(record)), type.fields, record.values, dirty);
}
export function decodeEntity(
	raw: string,
	path: string,
	hash: string,
	modified: number,
	schema?: DefinitionRevision,
): EntityRecord {
	const data = frontmatter(raw);
	envelope(data, ENTITY_TAG);
	requiredId(data['huhu-archive-type-id']);
	requiredId(data['huhu-schema-revision']);
	if (!['draft', 'active', 'archived'].includes(String(data['huhu-state']))) throw new ArchiveError('invalid-state');
	const type = schema?.definition;
	if (
		type &&
		(type.kind !== 'type' ||
			type.id !== data['huhu-archive-type-id'] ||
			schema.revisionId !== data['huhu-schema-revision'])
	)
		throw new ArchiveError('schema-mismatch');
	if (data['huhu-migration-id'] !== undefined) requiredId(data['huhu-migration-id']);
	if (
		data['huhu-expected-relations'] !== undefined &&
		(!Array.isArray(data['huhu-expected-relations']) ||
			!data['huhu-expected-relations'].every(identifier) ||
			new Set(data['huhu-expected-relations']).size !== data['huhu-expected-relations'].length)
	)
		throw new ArchiveError('invalid-migration-evidence');
	const values = type?.kind === 'type' ? valuesFrom(raw, data, type.fields) : {};
	if (type?.kind === 'type') validateValues(type.fields, values, data['huhu-state'] === 'active', values);
	return {
		id: data['huhu-id'] as string,
		typeId: data['huhu-archive-type-id'],
		schemaRevisionId: data['huhu-schema-revision'],
		lifecycle: data['huhu-state'] as EntityRecord['lifecycle'],
		values,
		path,
		contentHash: hash,
		modified,
		format: 2,
		...(data['huhu-migration-id'] ? { migrationId: data['huhu-migration-id'] } : {}),
		...(data['huhu-expected-relations'] ? { expectedRelationIds: data['huhu-expected-relations'] } : {}),
	};
}
export function relationMetadata(record: RelationRecord): Values {
	return {
		'huhu-format-version': 2,
		'huhu-type': RELATION_TAG,
		'huhu-id': record.id,
		'huhu-relation-type-id': record.relationTypeId,
		'huhu-schema-revision': record.schemaRevisionId,
		'huhu-source-id': record.sourceId,
		'huhu-target-id': record.targetId,
		'huhu-state': record.lifecycle,
		'huhu-valid-from': record.validFrom?.value,
		'huhu-valid-from-precision': record.validFrom?.precision,
		'huhu-valid-to': record.validTo?.value,
		'huhu-valid-to-precision': record.validTo?.precision,
		'huhu-context-refs': record.contextRefs,
		'huhu-provenance': record.provenance,
	};
}
export function encodeRelation(
	record: RelationRecord,
	type: RelationTypeDefinition,
	original = '',
	dirty = Object.keys(record.values),
): string {
	return patchValues(patchProperties(original, relationMetadata(record)), type.fields, record.values, dirty);
}
export function decodeRelation(
	raw: string,
	path: string,
	hash: string,
	modified: number,
	schema?: DefinitionRevision,
): RelationRecord {
	const data = frontmatter(raw);
	envelope(data, RELATION_TAG);
	for (const key of ['huhu-relation-type-id', 'huhu-schema-revision', 'huhu-source-id', 'huhu-target-id'])
		requiredId(data[key], key);
	if (!['draft', 'active', 'archived', 'deleted'].includes(String(data['huhu-state'])))
		throw new ArchiveError('invalid-state');
	const type = schema?.definition;
	if (
		type &&
		(type.kind !== 'relation-type' ||
			type.id !== data['huhu-relation-type-id'] ||
			schema.revisionId !== data['huhu-schema-revision'])
	)
		throw new ArchiveError('schema-mismatch');
	const contexts = data['huhu-context-refs'] ?? {};
	if (!object(contexts) || !Object.entries(contexts).every(([role, id]) => identifier(role) && identifier(id)))
		throw new ArchiveError('invalid-context');
	const date = (name: string): PrecisionDate | undefined => {
		const value = data[`huhu-valid-${name}`],
			precision = data[`huhu-valid-${name}-precision`];
		if (value === undefined && precision === undefined) return undefined;
		if ((precision !== 'month' && precision !== 'day') || !validPrecisionDate(value, precision))
			throw new ArchiveError('invalid-date');
		return { value: value as string, precision };
	};
	const provenance = data['huhu-provenance'];
	if (
		provenance !== undefined &&
		(!object(provenance) ||
			!identifier(provenance.migrationId) ||
			!identifier(provenance.legacyOwnerId) ||
			!identifier(provenance.legacyRowId) ||
			!['employments', 'relations'].includes(String(provenance.legacySection)))
	)
		throw new ArchiveError('invalid-provenance');
	const values = type?.kind === 'relation-type' ? valuesFrom(raw, data, type.fields) : {};
	if (type?.kind === 'relation-type') validateValues(type.fields, values, data['huhu-state'] === 'active', values);
	return {
		id: data['huhu-id'] as string,
		relationTypeId: data['huhu-relation-type-id'] as string,
		schemaRevisionId: data['huhu-schema-revision'] as string,
		sourceId: data['huhu-source-id'] as string,
		targetId: data['huhu-target-id'] as string,
		lifecycle: data['huhu-state'] as RelationRecord['lifecycle'],
		values,
		contextRefs: contexts as Record<string, string>,
		validFrom: date('from'),
		validTo: date('to'),
		provenance: provenance as RelationRecord['provenance'],
		path,
		contentHash: hash,
		modified,
	};
}
export function envelope(data: Values, tag: string): void {
	if (data['huhu-format-version'] !== FORMAT_VERSION)
		throw new ArchiveError(
			typeof data['huhu-format-version'] === 'number' && data['huhu-format-version'] > FORMAT_VERSION
				? 'future-format'
				: 'invalid-format',
		);
	if (data['huhu-type'] !== tag) throw new ArchiveError('invalid-format');
	requiredId(data['huhu-id']);
}
export function encodeDefinition(revision: DefinitionRevision): string {
	return patchProperties('', {
		'huhu-format-version': 2,
		'huhu-type': DEFINITION_TAG,
		'huhu-id': revision.definition.id,
		'huhu-definition-kind': revision.definition.kind,
		'huhu-revision-id': revision.revisionId,
		'huhu-parent-revisions': revision.parentRevisionIds,
		'huhu-content-hash': revision.contentHash,
		'huhu-display-version': revision.displayVersion,
		definition: revision.definition,
	});
}
export async function decodeDefinition(raw: string): Promise<DefinitionRevision> {
	const data = frontmatter(raw);
	envelope(data, DEFINITION_TAG);
	validateDefinition(data.definition);
	if (data.definition.id !== data['huhu-id'] || data.definition.kind !== data['huhu-definition-kind'])
		throw new ArchiveError('invalid-definition');
	requiredId(data['huhu-revision-id']);
	if (
		!Array.isArray(data['huhu-parent-revisions']) ||
		!data['huhu-parent-revisions'].every(identifier) ||
		typeof data['huhu-display-version'] !== 'number'
	)
		throw new ArchiveError('invalid-revision');
	const revision = await createRevision(
		data.definition,
		data['huhu-parent-revisions'],
		data['huhu-display-version'],
		data['huhu-revision-id'],
	);
	if (revision.contentHash !== data['huhu-content-hash']) throw new ArchiveError('revision-hash-mismatch');
	return revision;
}
export function parseDiagnostic(error: unknown, path: string, id?: string): ArchiveDiagnostic {
	const code = error instanceof ArchiveError ? error.code : 'invalid-format';
	return {
		code: code === 'future-format' ? code : 'invalid-format',
		path,
		id,
		detail: error instanceof ArchiveError ? [code, error.detail].filter(Boolean).join(': ') : String(error),
	};
}
export function metadataTag(raw: string): string | undefined {
	const data = frontmatter(raw);
	return typeof data['huhu-type'] === 'string' ? data['huhu-type'] : undefined;
}
export function semanticValue(value: unknown): string {
	return canonical(value);
}
