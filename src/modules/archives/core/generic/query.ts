import { ArchiveError, type EntityQuery, type EntitySummary, type Filter, type RelationRecord } from '../schema/model';
import { canonical, equal, identifier, object, present } from '../schema/value';

export function validateQuery(value: unknown): asserts value is EntityQuery {
	if (
		!object(value) ||
		Object.keys(value).some(
			(key) => !['typeId', 'search', 'filter', 'states', 'sort', 'offset', 'limit'].includes(key),
		)
	)
		throw new ArchiveError('invalid-query');
	if (value.typeId !== undefined && !identifier(value.typeId)) throw new ArchiveError('invalid-query');
	if (value.search !== undefined && (typeof value.search !== 'string' || value.search.length > 2048))
		throw new ArchiveError('invalid-query');
	if (
		value.states !== undefined &&
		(!Array.isArray(value.states) ||
			!value.states.length ||
			value.states.some((state) => !['draft', 'active', 'archived'].includes(String(state))))
	)
		throw new ArchiveError('invalid-query');
	if (
		value.sort !== undefined &&
		(!object(value.sort) ||
			Object.keys(value.sort).some((key) => !['fieldId', 'direction'].includes(key)) ||
			!identifier(value.sort.fieldId) ||
			!['asc', 'desc'].includes(String(value.sort.direction)))
	)
		throw new ArchiveError('invalid-query');
	for (const [key, max, min] of [
		['offset', 1000000, 0],
		['limit', 500, 1],
	] as const)
		if (
			value[key] !== undefined &&
			(typeof value[key] !== 'number' ||
				!Number.isSafeInteger(value[key]) ||
				value[key] < min ||
				value[key] > max)
		)
			throw new ArchiveError('invalid-query');
	if (value.filter !== undefined) validateFilter(value.filter);
}
export function validateFilter(value: unknown, depth = 0): asserts value is Filter {
	if (!object(value) || depth > 12) throw new ArchiveError('invalid-query');
	if ('all' in value || 'any' in value) {
		const key = 'all' in value ? 'all' : 'any';
		if (Object.keys(value).length !== 1 || !Array.isArray(value[key]) || value[key].length > 32)
			throw new ArchiveError('invalid-query');
		value[key].forEach((child) => validateFilter(child, depth + 1));
	} else if ('relationTypeId' in value) {
		if (
			Object.keys(value).some((key) => !['relationTypeId', 'direction', 'targetId'].includes(key)) ||
			!identifier(value.relationTypeId) ||
			!['out', 'in', 'either'].includes(String(value.direction)) ||
			(value.targetId !== undefined && !identifier(value.targetId))
		)
			throw new ArchiveError('invalid-query');
	} else {
		if (
			Object.keys(value).some((key) => !['fieldId', 'op', 'value'].includes(key)) ||
			!identifier(value.fieldId) ||
			!['eq', 'ne', 'contains', 'gt', 'gte', 'lt', 'lte', 'present'].includes(String(value.op))
		)
			throw new ArchiveError('invalid-query');
		canonical(value.value);
	}
}
/** Numbers compare numerically; nonnumeric values are never coerced to zero. */
export function compareValues(a: unknown, b: unknown): number {
	if (a === undefined || a === null) return b === undefined || b === null ? 0 : -1;
	if (b === undefined || b === null) return 1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
	return canonical(a).localeCompare(canonical(b));
}
export function filterMatches(
	record: EntitySummary,
	filter: Filter | undefined,
	relations: (id: string) => readonly RelationRecord[],
	symmetric: (typeId: string) => boolean,
): boolean {
	if (!filter) return true;
	if ('all' in filter) return filter.all.every((child) => filterMatches(record, child, relations, symmetric));
	if ('any' in filter) return filter.any.some((child) => filterMatches(record, child, relations, symmetric));
	if ('relationTypeId' in filter)
		return relations(record.id).some((edge) => {
			if (edge.relationTypeId !== filter.relationTypeId || edge.lifecycle !== 'active') return false;
			const out = edge.sourceId === record.id,
				inward = edge.targetId === record.id;
			return (
				(filter.direction === 'either' ||
					symmetric(edge.relationTypeId) ||
					(filter.direction === 'out' ? out : inward)) &&
				(!filter.targetId || (out ? edge.targetId : edge.sourceId) === filter.targetId)
			);
		});
	const value = record.values[filter.fieldId];
	switch (filter.op) {
		case 'present':
			return present(value);
		case 'eq':
			return equal(value, filter.value);
		case 'ne':
			return !equal(value, filter.value);
		case 'contains':
			return Array.isArray(value)
				? value.some((item) => equal(item, filter.value))
				: typeof value === 'string' &&
						typeof filter.value === 'string' &&
						value.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase());
		default: {
			if (
				value == null ||
				filter.value == null ||
				typeof value !== typeof filter.value ||
				!['string', 'number'].includes(typeof value)
			)
				return false;
			const comparison = compareValues(value, filter.value);
			return filter.op === 'gt'
				? comparison > 0
				: filter.op === 'gte'
					? comparison >= 0
					: filter.op === 'lt'
						? comparison < 0
						: comparison <= 0;
		}
	}
}
