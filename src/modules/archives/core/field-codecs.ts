import { ContactsError, validDate } from './model';
import type { ArchiveField, ArchiveValue, FieldCodecId } from './schema';

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => !!value && typeof value === 'object' && !Array.isArray(value);
const decimal = (value: unknown): value is string =>
	typeof value === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value);
const strings = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === 'string');
const option = (value: unknown, field: ArchiveField) =>
	typeof value === 'string' && !!field.options?.some((item) => item.id === value);
const validators: Record<FieldCodecId, (value: unknown, field: ArchiveField) => boolean> = {
	text: (value) => typeof value === 'string',
	markdown: (value) => typeof value === 'string',
	integer: (value) => typeof value === 'number' && Number.isSafeInteger(value),
	decimal,
	money: (value) =>
		object(value) &&
		Object.keys(value).every((key) => key === 'amount' || key === 'currency') &&
		decimal(value.amount) &&
		typeof value.currency === 'string' &&
		/^[A-Z]{3}$/.test(value.currency),
	boolean: (value) => typeof value === 'boolean',
	date: (value) =>
		object(value) &&
		Object.keys(value).every((key) => key === 'value' || key === 'precision') &&
		typeof value.value === 'string' &&
		((value.precision === 'month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value.value)) ||
			(value.precision === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(value.value) && validDate(value.value, false))),
	datetime: (value) =>
		typeof value === 'string' &&
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
		Number.isFinite(Date.parse(value)) &&
		validDate(value.slice(0, 10), false),
	choice: option,
	'multi-choice': (value, field) =>
		strings(value) && new Set(value).size === value.length && value.every((item) => option(item, field)),
	'string-list': strings,
	file: (value) =>
		typeof value === 'string' &&
		value.length > 0 &&
		!value.startsWith('/') &&
		!value.includes('\\') &&
		!value.split('/').some((part) => !part || part === '.' || part === '..' || part.startsWith('.')),
	subtable: (value, field) => {
		if (!Array.isArray(value) || !field.columns) return false;
		const ids = new Set<string>();
		for (const row of value) {
			if (
				!object(row) ||
				typeof row.rowId !== 'string' ||
				!/^[\w-]+$/.test(row.rowId) ||
				ids.has(row.rowId) ||
				!object(row.values)
			)
				return false;
			ids.add(row.rowId);
			if (Object.keys(row.values).some((key) => !field.columns!.some((column) => column.fieldId === key)))
				return false;
			for (const column of field.columns)
				if (Object.hasOwn(row.values, column.fieldId)) {
					try {
						validateFieldValue(column, row.values[column.fieldId]);
					} catch {
						return false;
					}
				}
		}
		return true;
	},
};

export interface FieldCodec {
	/** Both directions validate without coercion; absence is represented by the caller omitting the field. */
	decode(value: unknown, field: ArchiveField): ArchiveValue;
	encode(value: unknown, field: ArchiveField): ArchiveValue;
}
export const fieldCodecRegistry: Readonly<Record<FieldCodecId, FieldCodec>> = Object.fromEntries(
	Object.keys(validators).map((key) => [
		key,
		{
			decode: (value: unknown, field: ArchiveField) => checkedValue(field, value),
			encode: (value: unknown, field: ArchiveField) => checkedValue(field, value),
		},
	]),
) as Record<FieldCodecId, FieldCodec>;
function checkedValue(field: ArchiveField, value: unknown): ArchiveValue {
	validateFieldValue(field, value);
	return structuredClone(value) as ArchiveValue;
}
export function validateFieldValue(field: ArchiveField, value: unknown): void {
	if (value === null) return;
	if (!Object.hasOwn(validators, field.codec) || !validators[field.codec](value, field))
		throw new ContactsError('invalidField', field.fieldId);
}
export function validateFieldDefinitions(fields: ArchiveField[], depth = 0): void {
	if (!Array.isArray(fields) || depth > 4 || fields.length > 200) throw new ContactsError('invalidDefinition');
	const ids = new Set<string>(),
		keys = new Set<string>();
	for (const field of fields) {
		if (
			!field ||
			typeof field !== 'object' ||
			typeof field.fieldId !== 'string' ||
			!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(field.fieldId) ||
			typeof field.storageKey !== 'string' ||
			!/^[A-Za-z][A-Za-z0-9_-]*$/.test(field.storageKey) ||
			field.storageKey.toLowerCase().startsWith('huhu-') ||
			typeof field.label !== 'string' ||
			!field.label.trim() ||
			!Object.hasOwn(validators, field.codec) ||
			ids.has(field.fieldId) ||
			keys.has(field.storageKey) ||
			(field.required !== undefined && typeof field.required !== 'boolean')
		)
			throw new ContactsError('invalidDefinition', field?.fieldId);
		ids.add(field.fieldId);
		keys.add(field.storageKey);
		if (field.codec === 'choice' || field.codec === 'multi-choice') {
			if (
				!Array.isArray(field.options) ||
				field.options.some(
					(item) =>
						!item ||
						typeof item.id !== 'string' ||
						!item.id ||
						typeof item.label !== 'string' ||
						!item.label,
				) ||
				new Set(field.options.map((item) => item.id)).size !== field.options.length
			)
				throw new ContactsError('invalidDefinition', field.fieldId);
		}
		if (field.codec === 'subtable') validateFieldDefinitions(field.columns!, depth + 1);
		if (field.codec === 'date' && fields.some((other) => other.storageKey === `${field.storageKey}-precision`))
			throw new ContactsError('invalidDefinition', field.fieldId);
	}
}

/** The vault shares native property types across notes, including notes outside the archive root. */
export function nativePropertyKind(codec: FieldCodecId): string {
	if (codec === 'integer') return 'number';
	if (codec === 'boolean') return 'boolean';
	if (codec === 'multi-choice' || codec === 'string-list') return 'list';
	if (codec === 'money') return 'object';
	if (codec === 'subtable') return 'rows';
	return 'string';
}
export function storedPropertyKind(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	if (Array.isArray(value)) return value.every((item) => typeof item === 'string') ? 'list' : 'rows';
	return typeof value;
}
