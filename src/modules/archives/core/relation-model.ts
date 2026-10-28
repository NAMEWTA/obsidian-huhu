import type { ArchiveDiagnostic, ArchiveEntity, ArchiveField, ArchiveValue } from './schema';
import { validateFieldDefinitions, validateFieldValue } from './field-codecs';
import { ContactsError } from './model';
import { completeFields } from './persist/v2/patch';

export interface RelationDate { value: string; precision: 'month' | 'day' }
export interface PublishRelationType {
	baseRevisionId?: string; baseContentHash?: string;
	relationTypeId: string; label: string; inverseLabel: string;
	direction: 'directed' | 'symmetric'; sourceTypes: string[]; targetTypes: string[];
	fields: ArchiveField[]; temporal: boolean; allowSelf: boolean; acyclic: boolean;
	cardinality: { sourceMax?: number; targetMax?: number; scope: 'all' | 'current' | 'overlap'; includeDrafts: boolean };
	duplicates: { policy: 'allow' | 'ever' | 'overlap'; fieldIds: string[]; contextRoles: string[] };
	contextRoles: Array<{ role: string; label?: string; types: string[]; required: boolean }>;
	deletePolicy: 'restrict' | 'retain';
}
export interface RelationType extends PublishRelationType {
	revisionId: string; parentRevisionIds: string[]; contentHash: string; displayVersion: number;
}
export interface ArchiveRelation {
	id: string; relationTypeId: string; schemaRevisionId: string;
	sourceId: string; targetId: string; values: Record<string, ArchiveValue>;
	validFrom?: RelationDate; validTo?: RelationDate;
	status: 'current' | 'past'; lifecycle: 'draft' | 'active' | 'archived' | 'deleted';
	contextRefs: Record<string, string>; operationId: string; requestHash: string;
	path: string; raw: string; readOnly: boolean;
}
/** Allocate both identities once per user intent; a retry must reuse this entire request. */
export interface CreateRelation {
	id: string; operationId: string; relationTypeId: string; schemaRevisionId: string; schemaContentHash: string;
	sourceId: string; targetId: string; values: Record<string, ArchiveValue>; contextRefs?: Record<string, string>;
	validFrom?: RelationDate; validTo?: RelationDate; status: 'current' | 'past'; intent: 'draft' | 'complete';
}
export interface RelationEditBase { relation: ArchiveRelation; contentHash: string; schemaContentHash: string }
export interface UpdateRelation {
	base: RelationEditBase;
	changes: { values?: Record<string, ArchiveValue>; contextRefs?: Record<string, string>; validFrom?: RelationDate | null; validTo?: RelationDate | null; status?: 'current' | 'past' };
	intent: 'draft' | 'complete' | 'archive';
}
export interface RelationReceipt { relation: ArchiveRelation; operationId: string; contentHash: string; replayed: boolean }
export interface RelationCatalogSnapshot { definitionStates?: import('./definition-graph').DefinitionState[]; types: RelationType[]; diagnostics: ArchiveDiagnostic[]; isComplete: boolean }
export interface RelationProjection { relation: ArchiveRelation; direction: 'outgoing' | 'incoming' | 'symmetric' | 'context'; label: string; otherId: string; role?: string }
export interface RelationQuerySnapshot { deletions?: import('./relation-deletion').RelationDeletion[]; relations: ArchiveRelation[]; projections: RelationProjection[]; diagnostics: ArchiveDiagnostic[]; isComplete: boolean }
export const relationId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value);
export const canonicalRelation = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonicalRelation).join(',')}]` : value && typeof value === 'object'
	? `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, item]) => `${JSON.stringify(key)}:${canonicalRelation(item)}`).join(',')}}` : JSON.stringify(value);
export const sameRelationValue = (a: unknown, b: unknown): boolean => canonicalRelation(a) === canonicalRelation(b);
const typeList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every((id) => id === '*' || relationId(id)) && new Set(value).size === value.length;
export function validateRelationType(type: PublishRelationType): void {
	if (!type || !relationId(type.relationTypeId) || typeof type.label !== 'string' || !type.label.trim() || typeof type.inverseLabel !== 'string' || !type.inverseLabel.trim() ||
		!['directed', 'symmetric'].includes(type.direction) || !typeList(type.sourceTypes) || !typeList(type.targetTypes) ||
		!['temporal', 'allowSelf', 'acyclic'].every((key) => typeof Reflect.get(type, key) === 'boolean') ||
		!type.cardinality || !['all', 'current', 'overlap'].includes(type.cardinality.scope) || typeof type.cardinality.includeDrafts !== 'boolean' ||
		[type.cardinality.sourceMax, type.cardinality.targetMax].some((max) => max !== undefined && (!Number.isSafeInteger(max) || max < 1)) ||
		!type.duplicates || !['allow', 'ever', 'overlap'].includes(type.duplicates.policy) || !Array.isArray(type.duplicates.fieldIds) || !Array.isArray(type.duplicates.contextRoles) ||
		!Array.isArray(type.contextRoles) || !['restrict', 'retain'].includes(type.deletePolicy)) throw new ContactsError('invalidRelationDefinition');
	validateFieldDefinitions(type.fields);
	if (type.fields.some((field) => ['valid-from', 'valid-to', 'valid-from-precision', 'valid-to-precision', 'context-refs', 'relation-status'].includes(field.storageKey))) throw new ContactsError('invalidRelationDefinition');
	const roles = new Set<string>();
	for (const role of type.contextRoles) {
		if (!role || !relationId(role.role) || roles.has(role.role) || !typeList(role.types) || typeof role.required !== 'boolean' || (role.label !== undefined && (typeof role.label !== 'string' || !role.label.trim()))) throw new ContactsError('invalidRelationDefinition');
		roles.add(role.role);
	}
	if (type.duplicates.fieldIds.some((id) => !type.fields.some((field) => field.fieldId === id)) || type.duplicates.contextRoles.some((role) => !roles.has(role)) ||
		new Set(type.duplicates.fieldIds).size !== type.duplicates.fieldIds.length || new Set(type.duplicates.contextRoles).size !== type.duplicates.contextRoles.length ||
		(type.direction === 'symmetric' && (!sameRelationValue([...type.sourceTypes].sort(), [...type.targetTypes].sort()) || type.acyclic || type.cardinality.sourceMax !== type.cardinality.targetMax))) throw new ContactsError('invalidRelationDefinition');
}
export function relationInterval(relation: Pick<ArchiveRelation, 'validFrom' | 'validTo'>): [number, number] {
	const day = (date: RelationDate, end: boolean): number => {
		validateFieldValue({ fieldId: 'time', storageKey: 'time', label: 'time', codec: 'date' }, date);
		if (!date || (date.precision !== 'month' && date.precision !== 'day')) throw new ContactsError('invalidDate');
		if (date.precision === 'day') return Date.parse(date.value + 'T00:00:00Z');
		const first = Date.parse(date.value + '-01T00:00:00Z');
		if (!end) return first;
		const next = new Date(first); next.setUTCMonth(next.getUTCMonth() + 1); return next.getTime() - 86400000;
	};
	const from = relation.validFrom ? day(relation.validFrom, false) : -Infinity, to = relation.validTo ? day(relation.validTo, true) : Infinity;
	if (from > to) throw new ContactsError('invalidDate');
	return [from, to];
}
export const intervalsOverlap = (a: ArchiveRelation, b: ArchiveRelation): boolean => { const x = relationInterval(a), y = relationInterval(b); return x[0] <= y[1] && y[0] <= x[1]; };
export function validateRelationRecord(relation: ArchiveRelation, type: RelationType, complete: boolean): void {
	if (!relation || !relationId(relation.id) || relation.relationTypeId !== type.relationTypeId || relation.schemaRevisionId !== type.revisionId ||
		!relationId(relation.sourceId) || !relationId(relation.targetId) || !relationId(relation.operationId) || typeof relation.requestHash !== 'string' || !relation.requestHash ||
		!['draft', 'active', 'archived', 'deleted'].includes(relation.lifecycle) || !['current', 'past'].includes(relation.status) ||
		!relation.values || typeof relation.values !== 'object' || Array.isArray(relation.values) || !relation.contextRefs || typeof relation.contextRefs !== 'object' || Array.isArray(relation.contextRefs)) throw new ContactsError('invalidRelation');
	if (!type.allowSelf && relation.sourceId === relation.targetId) throw new ContactsError('selfRelation');
	if (!type.temporal && (relation.validFrom || relation.validTo)) throw new ContactsError('invalidDate');
	relationInterval(relation);
	if (relation.status === 'current' && relation.validTo) throw new ContactsError('currentEnd');
	for (const [id, value] of Object.entries(relation.values)) {
		const field = type.fields.find((field) => field.fieldId === id);
		if (!field) throw new ContactsError('invalidField', id);
		validateFieldValue(field, value);
	}
	for (const [role, id] of Object.entries(relation.contextRefs)) if (!type.contextRoles.some((item) => item.role === role) || !relationId(id)) throw new ContactsError('invalidContext', role);
	if (complete) { completeFields(type.fields, relation.values); for (const role of type.contextRoles) if (role.required && !relation.contextRefs[role.role]) throw new ContactsError('invalidContext', role.role); }
}
export function validateRelationEndpoints(relation: ArchiveRelation, type: RelationType, entities: ArchiveEntity[]): void {
	const check = (id: string, types: string[]) => {
		const matches = entities.filter((entity) => entity.id === id);
		if (matches.length !== 1 || matches[0]!.readOnly) throw new ContactsError('relationEndpoint', id);
		if (!types.includes('*') && !types.includes(matches[0]!.typeId) && !types.includes(matches[0]!.typeId.replace(/^type-(person|company)$/, '$1'))) throw new ContactsError('relationEndpointType', id);
	};
	check(relation.sourceId, type.sourceTypes); check(relation.targetId, type.targetTypes);
	for (const [role, id] of Object.entries(relation.contextRefs)) check(id, type.contextRoles.find((item) => item.role === role)!.types);
}
export function validateRelationGraph(candidate: ArchiveRelation, type: RelationType, relations: ArchiveRelation[]): void {
	const includes = (record: ArchiveRelation) => record.lifecycle !== 'deleted' && (record.lifecycle !== 'draft' || type.cardinality.includeDrafts);
	if (!includes(candidate)) return;
	const rest = relations.filter((record) => record.id !== candidate.id && record.relationTypeId === type.relationTypeId && includes(record));
	for (const record of rest) {
		const endpoints = record.sourceId === candidate.sourceId && record.targetId === candidate.targetId || type.direction === 'symmetric' && record.sourceId === candidate.targetId && record.targetId === candidate.sourceId;
		if (endpoints && type.duplicates.policy !== 'allow' && type.duplicates.fieldIds.every((id) => sameRelationValue(record.values[id], candidate.values[id])) &&
			type.duplicates.contextRoles.every((role) => record.contextRefs[role] === candidate.contextRefs[role]) && (type.duplicates.policy === 'ever' || intervalsOverlap(record, candidate))) throw new ContactsError('relationDuplicate', record.id);
	}
	const all = [...rest, candidate], cardinality = type.cardinality;
	const current = (record: ArchiveRelation) => record.status === 'current' && (record.lifecycle === 'active' || record.lifecycle === 'draft');
	for (const side of ['source', 'target'] as const) {
		const max = side === 'source' ? cardinality.sourceMax : cardinality.targetMax;
		if (max === undefined) continue;
		const endpoint = side === 'source' ? candidate.sourceId : candidate.targetId;
		let edges = all.filter((record) => type.direction === 'symmetric' ? [record.sourceId, record.targetId].includes(endpoint) : record[side === 'source' ? 'sourceId' : 'targetId'] === endpoint);
		if (cardinality.scope === 'current') edges = edges.filter(current);
		const points = cardinality.scope === 'overlap' ? edges.flatMap((edge) => relationInterval(edge)) : [0];
		for (const point of points) {
			const targets = new Set(edges.filter((edge) => cardinality.scope !== 'overlap' || (relationInterval(edge)[0] <= point && relationInterval(edge)[1] >= point))
				.map((edge) => type.direction === 'symmetric' ? edge.sourceId === endpoint ? edge.targetId : edge.sourceId : edge[side === 'source' ? 'targetId' : 'sourceId']));
			if (targets.size > max) throw new ContactsError('relationCardinality', endpoint);
		}
	}
	if (type.acyclic && candidate.lifecycle !== 'archived') {
		const [from, to] = relationInterval(candidate), visited = new Set<string>(), pending = [{ id: candidate.targetId, from, to }];
		while (pending.length) {
			const step = pending.pop()!, key = `${step.id}:${step.from}:${step.to}`;
			if (step.id === candidate.sourceId) throw new ContactsError('relationCycle');
			if (visited.has(key)) continue; visited.add(key);
			for (const record of rest) if (record.sourceId === step.id && record.lifecycle !== 'archived') {
				const interval = relationInterval(record), from = Math.max(step.from, interval[0]), to = Math.min(step.to, interval[1]);
				if (from <= to) pending.push({ id: record.targetId, from, to });
			}
		}
	}
}
