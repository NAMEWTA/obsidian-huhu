import { cloneRecord, type ArchiveRecord, type EntityRef } from '../model';
import { parseRecord, patchMarkdown, resolveRelative } from '../persist/markdown';
import {
	ArchiveError,
	type ArchiveDiagnostic,
	type EntityRecord,
	type PrecisionDate,
	type RelationRecord,
	type Values,
} from '../schema/model';
import { frontmatter } from './markdown';
import { legacySchemaId, legacyTypeId } from '../schema/presets';
import { copy, identifier, own } from '../schema/value';

/** A legacy read projects values, but never upgrades or rewrites a note. */
export function adaptLegacy(record: ArchiveRecord, hash: string): EntityRecord {
	const properties = frontmatter(record.raw),
		values: Values = {};
	for (const [key, value] of Object.entries(record.fields))
		if (own(properties, key)) values[key] = properties[key] === null ? null : copy(value);
	for (const [key, value] of Object.entries(record.prose))
		if (record.raw.includes(`<!-- huhu:${key} -->`)) values[key] = value;
	return {
		id: record.id,
		typeId: legacyTypeId(record.kind),
		schemaRevisionId: legacySchemaId(record.kind),
		lifecycle: 'active',
		values,
		path: record.path,
		contentHash: hash,
		modified: record.modified,
		format: 1,
	};
}
export function patchLegacy(
	latest: string,
	baseRaw: string,
	path: string,
	values: Values,
	dirtyFields: readonly string[],
): string {
	const base = parseRecord(baseRaw, path);
	if (!base || base.errors.length) throw new ArchiveError('invalid-legacy');
	const next = cloneRecord(base);
	for (const id of dirtyFields) {
		if (id in next.fields) {
			const old = next.fields[id as keyof typeof next.fields],
				value = values[id];
			if (
				Array.isArray(old)
					? !Array.isArray(value) || !value.every((item) => typeof item === 'string')
					: typeof value !== 'string'
			)
				throw new ArchiveError('legacy-value-unrepresentable', id);
			Object.assign(next.fields, { [id]: copy(value) });
		} else if (id in next.prose && typeof values[id] === 'string') Object.assign(next.prose, { [id]: values[id] });
		else throw new ArchiveError('migration-required', id);
	}
	// Keep the existing v1 three-way section/field patcher, including reminder and unknown data preservation.
	return patchMarkdown(latest, base, next);
}
export interface LegacyResolver {
	byId(id: string): EntityRecord[];
	byPath(path: string): EntityRecord | undefined;
}
export interface LegacyProjection {
	relations: RelationRecord[];
	diagnostics: ArchiveDiagnostic[];
}
function date(value: string): PrecisionDate | undefined {
	return value ? { value, precision: value.length === 7 ? 'month' : 'day' } : undefined;
}
export function legacyReference(
	ref: EntityRef,
	owner: ArchiveRecord,
	resolver: LegacyResolver,
	required = true,
): { id?: string; diagnostic?: ArchiveDiagnostic } {
	const linked = ref.link ? resolver.byPath(resolveRelative(owner.path, ref.link)) : undefined;
	const referenced = ref.id ? resolver.byId(ref.id) : linked ? resolver.byId(linked.id) : [];
	const diagnostic = (code: ArchiveDiagnostic['code'], detail: string): { diagnostic: ArchiveDiagnostic } => ({
		diagnostic: { code, path: owner.path, id: owner.id, detail },
	});
	if (ref.id && !identifier(ref.id)) return diagnostic('invalid-value', ref.id);
	if (ref.id && linked && linked.id !== ref.id) return diagnostic('reference-conflict', `${ref.id} / ${linked.id}`);
	if (referenced.length > 1) return diagnostic('duplicate-id', ref.id || linked?.id || '');
	if (referenced.length === 1) return { id: referenced[0]!.id };
	if (!required && !ref.id && !ref.link) return {};
	// An explicit ID is preserved even when its endpoint is currently missing. It is never replaced by a name.
	return {
		id: ref.id || undefined,
		diagnostic: {
			code: 'missing-endpoint',
			path: owner.path,
			id: owner.id,
			detail: ref.id || ref.link || ref.label,
		},
	};
}
export function projectLegacy(record: ArchiveRecord, resolver: LegacyResolver): LegacyProjection {
	const relations: RelationRecord[] = [],
		diagnostics: ArchiveDiagnostic[] = [];
	if (record.errors.length || !identifier(record.id))
		return {
			relations,
			diagnostics: record.errors.map((detail) => ({
				code: 'invalid-format',
				path: record.path,
				id: record.id,
				detail,
			})),
		};
	const reference = (ref: EntityRef, required = true) => {
		const result = legacyReference(ref, record, resolver, required);
		if (result.diagnostic) diagnostics.push(result.diagnostic);
		return result.id;
	};
	const relation = (
		section: 'employments' | 'relations',
		rowId: string,
		relationTypeId: string,
		sourceId: string,
		targetId: string,
		values: Values,
	): RelationRecord => ({
		id: `legacy:${record.id}:${section}:${rowId}`,
		relationTypeId,
		schemaRevisionId: `preset-${relationTypeId}-v1`,
		sourceId,
		targetId,
		values,
		lifecycle: 'active',
		contextRefs: {},
		path: record.path,
		contentHash: '',
		modified: record.modified,
		legacy: { ownerId: record.id, section, rowId },
	});
	for (const job of record.employments) {
		const target = reference(job.company);
		if (!target) continue;
		const item = relation('employments', job.id, 'relation-employment', record.id, target, {
			department: job.department,
			title: job.title,
			status: job.status,
			keyRole: job.keyRole,
			notes: job.notes,
		});
		item.validFrom = date(job.start);
		item.validTo = date(job.end);
		relations.push(item);
	}
	for (const row of record.relations) {
		const target = reference(row.person),
			company = reference(row.company, false);
		if (!target) continue;
		const typeId =
			row.kind === 'leader' || row.kind === 'report'
				? 'relation-reports-to'
				: row.kind === 'colleague'
					? 'relation-colleague'
					: row.kind === 'friend'
						? 'relation-friend'
						: 'relation-custom';
		// A's row describes "B is my leader": A reports to B. "B is my report" reverses that fact.
		const item = relation(
			'relations',
			row.id,
			typeId,
			row.kind === 'report' ? target : record.id,
			row.kind === 'report' ? record.id : target,
			{ label: row.kind, notes: row.notes },
		);
		if (company) item.contextRefs.company = company;
		relations.push(item);
	}
	return { relations, diagnostics };
}
