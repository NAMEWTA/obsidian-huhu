import { ArchiveError, type EntityRecord, type RelationRecord, type RelationTypeDefinition } from '../schema/model';
import { matches, validPrecisionDate, validateValues } from '../schema/fields';
import { equal, identifier, object } from '../schema/value';

export interface RelationContext {
	entity(id: string): EntityRecord | undefined;
	relations(typeId: string): readonly RelationRecord[];
}
export function activeRelation(record: RelationRecord, type: RelationTypeDefinition): boolean {
	return record.lifecycle === 'active' && matches(type.activeWhen, record.values);
}
export function validateRelation(
	record: RelationRecord,
	type: RelationTypeDefinition,
	context: RelationContext,
	previous?: RelationRecord,
): void {
	if (
		!identifier(record.id) ||
		!identifier(record.sourceId) ||
		!identifier(record.targetId) ||
		record.relationTypeId !== type.id ||
		!['draft', 'active', 'archived', 'deleted'].includes(record.lifecycle)
	)
		throw new ArchiveError('invalid-relation');
	if (!type.enabled && (!previous || (record.lifecycle === 'active' && previous.lifecycle !== 'active')))
		throw new ArchiveError('type-disabled');
	if (!type.allowSelf && record.sourceId === record.targetId) throw new ArchiveError('self-relation');
	if (
		!object(record.contextRefs) ||
		Object.keys(record.contextRefs).some((role) => !type.contextRoles.some((item) => item.role === role))
	)
		throw new ArchiveError('invalid-context');
	for (const [date, precision] of [
		[record.validFrom?.value, record.validFrom?.precision],
		[record.validTo?.value, record.validTo?.precision],
	])
		if (
			date !== undefined &&
			((precision !== 'month' && precision !== 'day') || !validPrecisionDate(date, precision))
		)
			throw new ArchiveError('invalid-date');
	if (
		record.validFrom &&
		record.validTo &&
		(record.validFrom.value.slice(0, 7) > record.validTo.value.slice(0, 7) ||
			(record.validFrom.precision === record.validTo.precision && record.validFrom.value > record.validTo.value))
	)
		throw new ArchiveError('invalid-date-range');
	validateValues(type.fields, record.values, record.lifecycle === 'active', previous?.values);
	// Tombstones and archival preserve broken endpoints rather than requiring users to fabricate them.
	if (record.lifecycle !== 'active') return;
	const source = context.entity(record.sourceId),
		target = context.entity(record.targetId);
	if (!source || !target) throw new ArchiveError('missing-endpoint');
	if (!type.sourceTypes.includes(source.typeId) || !type.targetTypes.includes(target.typeId))
		throw new ArchiveError('endpoint-type');
	if (source.lifecycle === 'archived' || target.lifecycle === 'archived') throw new ArchiveError('archived-endpoint');
	for (const role of type.contextRoles) {
		const id = record.contextRefs[role.role];
		if (!id) {
			if (role.required) throw new ArchiveError('required-context', role.role);
			continue;
		}
		const entity = context.entity(id);
		if (!entity || !role.typeIds.includes(entity.typeId)) throw new ArchiveError('invalid-context', role.role);
	}
	const others = context.relations(type.id).filter((item) => item.id !== record.id && item.lifecycle !== 'deleted');
	const sameEndpoints = (item: RelationRecord) =>
		(item.sourceId === record.sourceId && item.targetId === record.targetId) ||
		(!type.directed && item.sourceId === record.targetId && item.targetId === record.sourceId);
	if (
		type.duplicatePolicy !== 'allow' &&
		others.some(
			(item) =>
				sameEndpoints(item) &&
				(type.duplicatePolicy === 'endpoints' ||
					(equal(item.values, record.values) &&
						equal(item.contextRefs, record.contextRefs) &&
						equal(item.validFrom, record.validFrom) &&
						equal(item.validTo, record.validTo))),
		)
	)
		throw new ArchiveError('duplicate-relation');
	for (const side of ['source', 'target'] as const) {
		const cardinality = type[side === 'source' ? 'sourceCardinality' : 'targetCardinality'];
		if (cardinality.max === undefined || (cardinality.scope === 'active' && !activeRelation(record, type)))
			continue;
		const id = side === 'source' ? record.sourceId : record.targetId;
		const count = others.filter(
			(item) =>
				(cardinality.scope === 'all' || activeRelation(item, type)) &&
				(type.directed
					? item[side === 'source' ? 'sourceId' : 'targetId'] === id
					: item.sourceId === id || item.targetId === id),
		).length;
		if (count >= cardinality.max) throw new ArchiveError('cardinality', side);
	}
	if (type.acyclic) {
		const next = new Map<string, string[]>();
		for (const edge of others)
			if (edge.lifecycle === 'active')
				next.set(edge.sourceId, [...(next.get(edge.sourceId) ?? []), edge.targetId]);
		const stack = [record.targetId],
			seen = new Set<string>();
		while (stack.length) {
			const id = stack.pop()!;
			if (id === record.sourceId) throw new ArchiveError('cycle');
			if (seen.has(id)) continue;
			seen.add(id);
			stack.push(...(next.get(id) ?? []));
		}
	}
}
