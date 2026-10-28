import { patchYamlValues } from '../yaml-values';
import { ContactsError } from '../../model';
import { fieldCodecRegistry } from '../../field-codecs';
import type { ArchiveEntity, ArchiveField, ArchiveTypeDefinition, ArchiveValue } from '../../schema';
import { archiveFrontmatter, entityValues, markdownRegions, type MarkdownRegion } from './markdown';

export function readEntityMarkdown(raw: string, path: string, type: ArchiveTypeDefinition): ArchiveEntity {
	const metadata = archiveFrontmatter(raw),
		id = metadata['huhu-id'];
	if (metadata['huhu-type'] !== 'archive-record' || metadata['huhu-format-version'] !== 2)
		throw new ContactsError('futureFormat');
	if (
		typeof id !== 'string' ||
		!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(id) ||
		metadata['huhu-archive-type-id'] !== type.typeId ||
		metadata['huhu-schema-revision'] !== type.revisionId
	)
		throw new ContactsError('definitionConflict');
	const createdAt = metadata['huhu-created-at'],
		updatedAt = metadata['huhu-updated-at'];
	if (
		(createdAt !== null && (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt)))) ||
		typeof updatedAt !== 'string' ||
		!Number.isFinite(Date.parse(updatedAt)) ||
		typeof metadata['huhu-state'] !== 'string' ||
		!['draft', 'active', 'archived'].includes(metadata['huhu-state'])
	)
		throw new ContactsError('invalidRecord');
	return {
		id,
		typeId: type.typeId,
		schemaRevisionId: type.revisionId,
		formatVersion: 2,
		path,
		folderPath: path.slice(0, path.lastIndexOf('/')),
		createdAt,
		updatedAt,
		raw,
		readOnly: false,
		values: entityValues(metadata, type, raw, (field) => {
			throw new ContactsError('invalidField', field);
		}),
	};
}

interface Edit {
	start: number;
	end: number;
	text: string;
}
const canonical = (value: unknown): unknown =>
	Array.isArray(value)
		? value.map(canonical)
		: value && typeof value === 'object'
			? Object.fromEntries(
					Object.entries(value)
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([key, item]) => [key, canonical(item)]),
				)
			: value;
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const applyEdits = (raw: string, edits: Edit[]) =>
	edits
		.sort((a, b) => b.start - a.start)
		.reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), raw);
export function completeFields(fields: ArchiveField[], values: Record<string, ArchiveValue>, prefix = ''): void {
	for (const field of fields) {
		const value = values[field.fieldId],
			key = prefix + field.fieldId;
		if (
			field.required &&
			(!Object.hasOwn(values, field.fieldId) ||
				value === null ||
				(typeof value === 'string' && !value.trim()) ||
				(Array.isArray(value) && !value.length))
		)
			throw new ContactsError('incompleteRecord', key);
		if (field.codec === 'subtable' && Array.isArray(value))
			for (const row of value) {
				if (
					row &&
					typeof row === 'object' &&
					!Array.isArray(row) &&
					row.values &&
					typeof row.values === 'object' &&
					!Array.isArray(row.values)
				)
					completeFields(
						field.columns!,
						row.values,
						`${key}.${typeof row.rowId === 'string' ? row.rowId : ''}.`,
					);
			}
	}
}
export function patchEntityMarkdown(
	current: string,
	base: ArchiveEntity,
	changes: Record<string, ArchiveValue>,
	type: ArchiveTypeDefinition,
	intent: 'draft' | 'complete',
	time: string,
): string {
	const latest = readEntityMarkdown(current, base.path, type);
	if (latest.id !== base.id || latest.typeId !== base.typeId || latest.schemaRevisionId !== base.schemaRevisionId)
		throw new ContactsError('invalidRecord');
	return patchArchiveFieldValues(current, base.values, changes, type, intent, time);
}
/** Shared field-level three-way merge for entities and independent relations; identity is verified by each owner. */
export function patchArchiveFieldValues(
	current: string, baseValues: Record<string, ArchiveValue>, changes: Record<string, ArchiveValue>,
	type: Pick<ArchiveTypeDefinition, 'fields'>, intent: 'draft' | 'complete', time: string,
): string {
	const latest = { values: entityValues(archiveFrontmatter(current), type, current, (id) => { throw new ContactsError('invalidField', id); }) };
	const ranges = new Map<string, MarkdownRegion>();
	markdownRegions(
		current,
		(field) => {
			throw new ContactsError('invalidField', field);
		},
		ranges,
	);
	const yaml = new Map<string, ArchiveValue | undefined>(),
		bodyEdits: Edit[] = [];
	for (const [id, value] of Object.entries(changes)) {
		const field = type.fields.find((field) => field.fieldId === id);
		if (!field) throw new ContactsError('invalidField', id);
		const encoded = fieldCodecRegistry[field.codec].encode(value, field);
		const previous = { present: Object.hasOwn(baseValues, id), value: baseValues[id] },
			actual = { present: Object.hasOwn(latest.values, id), value: latest.values[id] };
		if (!same(previous, actual) && !same(actual, { present: true, value })) throw new ContactsError('conflict', id);
		if (field.codec === 'markdown') {
			const range = ranges.get(id);
			if (value === null) {
				yaml.set(field.storageKey, null);
				if (range) bodyEdits.push({ start: range.start, end: range.end, text: '' });
			} else {
				if (typeof value !== 'string' || /<!--\s*\/?huhu:field\b/.test(value))
					throw new ContactsError('invalidField', id);
				yaml.set(field.storageKey, undefined);
				if (range) bodyEdits.push({ start: range.contentStart, end: range.contentEnd, text: value });
				else
					bodyEdits.push({
						start: current.length,
						end: current.length,
						text: `\n<!-- huhu:field ${id} -->\n${value}\n<!-- /huhu:field ${id} -->\n`,
					});
			}
		} else if (field.codec === 'date' && encoded !== null) {
			const date = encoded as { value: string; precision: string };
			yaml.set(field.storageKey, date.value);
			yaml.set(`${field.storageKey}-precision`, date.precision);
		} else yaml.set(field.storageKey, encoded);
	}
	const draft = { ...latest.values, ...changes };
	if (intent === 'complete') completeFields(type.fields, draft);
	yaml.set('huhu-state', intent === 'complete' ? 'active' : 'draft');
	yaml.set('huhu-updated-at', time);
	const patched = patchYamlValues(applyEdits(current, bodyEdits), yaml);
	const verified = entityValues(archiveFrontmatter(patched), type, patched, (id) => { throw new ContactsError('invalidField', id); });
	if (!same(verified, draft)) throw new ContactsError('writeUnverified');
	return patched;
}
