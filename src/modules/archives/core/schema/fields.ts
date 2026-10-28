import { ArchiveError, type Condition, type FieldDefinition, type FieldKind, type Values } from './model';
import { equal, identifier, object, own, present, safeRelativePath } from './value';

export const FIELD_KINDS: readonly FieldKind[] = [
	'text',
	'markdown',
	'integer',
	'decimal',
	'money',
	'boolean',
	'date',
	'datetime',
	'select',
	'multiselect',
	'strings',
	'file',
	'table',
];
export interface FieldCodec {
	validate(value: unknown, field: FieldDefinition): boolean;
	propertyType: string;
}
export function validPrecisionDate(value: unknown, precision: 'month' | 'day' | 'mixed' = 'mixed'): boolean {
	if (typeof value !== 'string') return false;
	if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return precision !== 'day';
	if (precision === 'month' || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) return false;
	const parsed = new Date(value + 'T00:00:00Z');
	return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function validDatetime(value: unknown): boolean {
	if (
		typeof value !== 'string' ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
	)
		return false;
	const date = value.slice(0, 10),
		time = value.slice(11, 19);
	const [hour, minute, second = '0'] = time.split(':');
	const offset = /([+-])(\d{2}):(\d{2})$/.exec(value);
	return (
		validPrecisionDate(date, 'day') &&
		Number(hour) < 24 &&
		Number(minute) < 60 &&
		Number(second) < 60 &&
		(!offset || (Number(offset[2]) <= 23 && Number(offset[3]) < 60)) &&
		Number.isFinite(Date.parse(value))
	);
}
const stringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === 'string');
const unique = (values: readonly unknown[]) => new Set(values).size === values.length;
const decimal = (value: unknown) =>
	typeof value === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && value.length <= 128;
/** No implicit parseFloat/Number fallback: invalid input remains an error, never zero. */
export const FieldCodecRegistry: Readonly<Record<FieldKind, FieldCodec>> = {
	text: { propertyType: 'text', validate: (value) => typeof value === 'string' },
	markdown: { propertyType: 'body', validate: (value) => typeof value === 'string' },
	integer: { propertyType: 'number', validate: (value) => typeof value === 'number' && Number.isSafeInteger(value) },
	decimal: { propertyType: 'number', validate: (value) => typeof value === 'number' && Number.isFinite(value) },
	money: {
		propertyType: 'object',
		validate: (value) =>
			object(value) &&
			Object.keys(value).every((key) => key === 'amount' || key === 'currency') &&
			decimal(value.amount) &&
			typeof value.currency === 'string' &&
			/^[A-Z]{3}$/.test(value.currency),
	},
	boolean: { propertyType: 'checkbox', validate: (value) => typeof value === 'boolean' },
	date: { propertyType: 'text', validate: (value, field) => validPrecisionDate(value, field.precision ?? 'mixed') },
	datetime: { propertyType: 'datetime', validate: validDatetime },
	select: {
		propertyType: 'text',
		validate: (value, field) =>
			typeof value === 'string' && !!field.options?.some((option) => option.value === value),
	},
	multiselect: {
		propertyType: 'multitext',
		validate: (value, field) =>
			stringArray(value) &&
			unique(value) &&
			value.every((item) => field.options?.some((option) => option.value === item)),
	},
	strings: {
		propertyType: 'multitext',
		validate: (value, field) => stringArray(value) && (!field.uniqueItems || unique(value)),
	},
	file: { propertyType: 'text', validate: (value) => safeRelativePath(value) },
	table: {
		propertyType: 'object',
		validate: (value) => {
			if (!Array.isArray(value) || value.length > 10000) return false;
			const ids = new Set<string>();
			return value.every((row) => {
				if (!object(row) || !identifier(row.rowId) || ids.has(row.rowId) || !object(row.values)) return false;
				ids.add(row.rowId);
				return true;
			});
		},
	},
};
export function validateValues(
	fields: readonly FieldDefinition[],
	values: Values,
	active: boolean,
	previous: Values = {},
): void {
	if (!object(values)) throw new ArchiveError('invalid-values');
	const byId = new Map(fields.map((field) => [field.fieldId, field]));
	for (const key of Object.keys(values)) if (!byId.has(key)) throw new ArchiveError('unknown-field', key, [key]);
	for (const field of fields) {
		const value = values[field.fieldId];
		if (active && field.required && !field.archived && !present(value))
			throw new ArchiveError('required-field', field.label, [field.fieldId]);
		if (
			value === undefined ||
			value === null ||
			(value === '' && ['date', 'datetime', 'file'].includes(field.kind))
		)
			continue;
		if (!FieldCodecRegistry[field.kind].validate(value, field))
			throw new ArchiveError('invalid-value', field.label, [field.fieldId]);
		if (field.kind === 'table') {
			const oldRows = Array.isArray(previous[field.fieldId]) ? (previous[field.fieldId] as unknown[]) : [];
			for (const row of value as { rowId: string; values: Values }[]) {
				const old = oldRows.find((candidate) => object(candidate) && candidate.rowId === row.rowId);
				try {
					validateValues(
						field.columns ?? [],
						row.values,
						active,
						object(old) && object(old.values) ? old.values : {},
					);
				} catch (error) {
					if (error instanceof ArchiveError)
						throw new ArchiveError(error.code, error.detail, [field.fieldId, ...error.fields]);
					throw error;
				}
			}
		}
		if (!equal(value, previous[field.fieldId])) {
			if (field.archived) throw new ArchiveError('archived-field', field.label, [field.fieldId]);
			const selected = Array.isArray(value) ? value : [value];
			if (
				(field.kind === 'select' || field.kind === 'multiselect') &&
				selected.some(
					(item) =>
						field.options?.some((option) => option.value === item && option.archived) &&
						!(Array.isArray(previous[field.fieldId])
							? (previous[field.fieldId] as unknown[]).includes(item)
							: previous[field.fieldId] === item),
				)
			)
				throw new ArchiveError('archived-option', field.label, [field.fieldId]);
		}
	}
}
/** UI visibility is not authorization and never deletes a hidden value. */
export function matches(condition: Condition | undefined, values: Values, depth = 0): boolean {
	if (!condition) return true;
	if (depth > 16) throw new ArchiveError('invalid-condition');
	if ('all' in condition) return condition.all.every((child) => matches(child, values, depth + 1));
	if ('any' in condition) return condition.any.some((child) => matches(child, values, depth + 1));
	const value = values[condition.fieldId];
	switch (condition.op) {
		case 'present':
			return present(value);
		case 'eq':
			return equal(value, condition.value);
		case 'ne':
			return !equal(value, condition.value);
		case 'contains':
			return Array.isArray(value)
				? value.some((item) => equal(item, condition.value))
				: typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value);
	}
}
export function mergeValues(base: Values, current: Values, draft: Values, dirty: readonly string[]): Values {
	const result = { ...current },
		conflicts: string[] = [];
	for (const id of dirty) {
		if (!equal(base[id], current[id]) && !equal(current[id], draft[id])) {
			conflicts.push(id);
			continue;
		}
		if (own(draft, id)) result[id] = draft[id];
		else delete result[id];
	}
	if (conflicts.length) throw new ArchiveError('field-conflict', '', conflicts);
	return result;
}
