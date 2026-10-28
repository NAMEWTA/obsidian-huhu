import { parseDocument, stringify } from 'yaml';
import { ContactsError } from '../../model';
import { fieldCodecRegistry } from '../../field-codecs';
import type { ArchiveEntity, ArchiveTypeDefinition, ArchiveValue } from '../../schema';

export function archiveFrontmatter(raw: string): Record<string, unknown> {
	const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
	if (!match) throw new ContactsError('invalidYaml');
	const document = parseDocument(match[1]!, { uniqueKeys: true });
	if (document.errors.length) throw new ContactsError('invalidYaml');
	const value: unknown = document.toJS();
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ContactsError('invalidYaml');
	return value as Record<string, unknown>;
}
export function archiveMarkdown(values: Record<string, unknown>, body = ''): string {
	return `---\n${stringify(values)}---\n${body}`;
}
export function createEntityMarkdown(entity: ArchiveEntity, type: ArchiveTypeDefinition): string {
	const values: Record<string, unknown> = {
		'huhu-type': 'archive-record',
		'huhu-format-version': 2,
		'huhu-id': entity.id,
		'huhu-archive-type-id': type.typeId,
		'huhu-schema-revision': type.revisionId,
		'huhu-created-at': entity.createdAt,
		'huhu-updated-at': entity.updatedAt,
		'huhu-state': 'draft',
	};
	for (const field of type.fields)
		if (Object.hasOwn(entity.values, field.fieldId)) {
			const value = entity.values[field.fieldId]!;
			const encoded = fieldCodecRegistry[field.codec].encode(value, field);
			if (field.codec === 'date' && encoded !== null) {
				const date = encoded as { value: string; precision: string };
				values[field.storageKey] = date.value;
				values[`${field.storageKey}-precision`] = date.precision;
			} else if (field.codec !== 'markdown') values[field.storageKey] = encoded;
		}
	const sections = type.fields
		.filter((field) => field.codec === 'markdown' && Object.hasOwn(entity.values, field.fieldId))
		.map((field) => {
			const value = entity.values[field.fieldId];
			if (value === null) {
				values[field.storageKey] = null;
				return '';
			}
			if (typeof value !== 'string' || /<!--\s*\/?huhu:field\b/.test(value))
				throw new ContactsError('invalidField', field.fieldId);
			return `\n<!-- huhu:field ${field.fieldId} -->\n${value}\n<!-- /huhu:field ${field.fieldId} -->\n`;
		})
		.join('');
	const title = entity.values[type.titleFieldId];
	if (typeof title !== 'string') throw new ContactsError('nameRequired');
	return archiveMarkdown(values, `\n# ${title.replace(/\r?\n/g, ' ')}\n${sections}`);
}
export interface MarkdownRegion {
	start: number;
	end: number;
	contentStart: number;
	contentEnd: number;
}
export function markdownRegions(
	raw: string,
	invalid: (fieldId: string) => void,
	ranges?: Map<string, MarkdownRegion>,
): Map<string, string> {
	const front = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw);
	if (!front) throw new ContactsError('invalidYaml');
	const body = raw.slice(front[0].length),
		regions = new Map<string, string>(),
		invalidIds = new Set<string>();
	let offset = 0,
		open: { id: string; start: number; markerStart: number; newline: string } | undefined,
		fence: { character: string; length: number } | undefined;
	const fail = (id: string) => {
		invalidIds.add(id);
		regions.delete(id);
		ranges?.delete(id);
		invalid(id);
	};
	for (const line of body.split('\n')) {
		const marker = /^<!-- (\/?)huhu:field ([A-Za-z0-9][A-Za-z0-9_-]{0,119}) -->\r?$/.exec(line);
		const boundary = /^[ \t]{0,3}(`{3,}|~{3,})(.*)\r?$/.exec(line);
		if (!open && boundary) {
			const run = boundary[1]!;
			if (!fence) fence = { character: run[0]!, length: run.length };
			else if (run[0] === fence.character && run.length >= fence.length && !boundary[2]?.trim())
				fence = undefined;
		} else if (!fence && marker) {
			const id = marker[2]!;
			if (!marker[1]) {
				if (open) {
					fail(open.id);
					fail(id);
				}
				if (regions.has(id)) fail(id);
				open = {
					id,
					start: offset + line.length + 1,
					markerStart: offset,
					newline: line.endsWith('\r') ? '\r\n' : '\n',
				};
			} else if (!open || open.id !== id) {
				if (open) fail(open.id);
				fail(id);
				open = undefined;
			} else {
				if (!invalidIds.has(id)) {
					const content = body.slice(open.start, offset);
					if (content.endsWith(open.newline)) {
						regions.set(id, content.slice(0, -open.newline.length));
						ranges?.set(id, {
							start: front[0].length + open.markerStart,
							end: front[0].length + offset + line.replace(/\r$/, '').length,
							contentStart: front[0].length + open.start,
							contentEnd: front[0].length + offset - open.newline.length,
						});
					} else fail(id);
				}
				open = undefined;
			}
		}
		offset += line.length + 1;
	}
	if (open) fail(open.id);
	return regions;
}
export function entityValues(
	values: Record<string, unknown>,
	type: Pick<ArchiveTypeDefinition, 'fields'>,
	raw: string,
	invalid: (fieldId: string) => void,
): Record<string, ArchiveValue> {
	const result: Record<string, ArchiveValue> = {};
	const markdownFields = new Set(
		type.fields.filter((field) => field.codec === 'markdown').map((field) => field.fieldId),
	);
	const regions = markdownRegions(raw, (id) => {
		if (markdownFields.has(id)) invalid(id);
	});
	for (const field of type.fields) {
		let present = Object.hasOwn(values, field.storageKey),
			value = values[field.storageKey];
		if (field.codec === 'markdown') {
			if (regions.has(field.fieldId)) {
				present = true;
				value = regions.get(field.fieldId);
			}
		} else if (field.codec === 'date' && present && value !== null)
			value = { value, precision: values[`${field.storageKey}-precision`] };
		if (!present) continue;
		try {
			result[field.fieldId] = fieldCodecRegistry[field.codec].decode(value, field);
		} catch {
			invalid(field.fieldId);
			result[field.fieldId] = value as ArchiveValue;
		}
	}
	return result;
}
