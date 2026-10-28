import { ContactsError } from './model';
import { validateFieldValue } from './field-codecs';
import type { ArchiveTypeDefinition, ArchiveValue } from './schema';

export type ArchiveCondition =
	| { op: 'eq' | 'contains'; fieldId: string; value: ArchiveValue }
	| { op: 'and' | 'or'; conditions: ArchiveCondition[] };
export interface ArchiveFormControl {
	fieldId: string;
	group: string;
	help?: string;
	readOnly?: boolean;
	visibleWhen?: ArchiveCondition;
}
export interface ArchiveFormTemplate {
	id: string;
	label: string;
	columns: 1 | 2;
	controls: ArchiveFormControl[];
}
export interface ArchiveRecordTemplate {
	id: string;
	label: string;
	values: Record<string, ArchiveValue>;
	body: string;
}
/** Presentation metadata references fields; it never owns an entity's values. */
export interface ArchiveFormDesign {
	typeId: string;
	schemaRevisionId: string;
	fieldSettings: Array<{ fieldId: string; label: string; disabled: boolean }>;
	forms: ArchiveFormTemplate[];
	templates: ArchiveRecordTemplate[];
}
export interface ArchiveFormSnapshot {
	definitionState?: import('./definition-graph').DefinitionState;
	blockedReason?: string;
	type: ArchiveTypeDefinition;
	design: ArchiveFormDesign;
	revisionId: string | null;
	contentHash: string | null;
}
export interface PublishArchiveForms {
	typeId: string;
	baseRevisionId: string | null;
	baseContentHash: string | null;
	schemaContentHash: string;
	design: ArchiveFormDesign;
}
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value);
const label = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
function validLiteral(value: unknown, depth = 0): void {
	if (depth > 16) throw new ContactsError('invalidDefinition');
	if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
	if (!value || typeof value !== 'object') throw new ContactsError('invalidDefinition');
	const children = Array.isArray(value) ? value : Object.values(value);
	if (children.length > 1000) throw new ContactsError('invalidDefinition');
	for (const child of children) validLiteral(child, depth + 1);
}
function validCondition(condition: ArchiveCondition, fields: Set<string> | undefined, depth = 0): void {
	if (!condition || typeof condition !== 'object' || Array.isArray(condition) || depth > 8) throw new ContactsError('invalidDefinition');
	if (condition.op === 'and' || condition.op === 'or') {
		if (Object.keys(condition).some((key) => key !== 'op' && key !== 'conditions') || !Array.isArray(condition.conditions) || condition.conditions.length > 50) throw new ContactsError('invalidDefinition');
		for (const item of condition.conditions) validCondition(item, fields, depth + 1);
	} else {
		if ((condition.op !== 'eq' && condition.op !== 'contains') || Object.keys(condition).some((key) => !['op', 'fieldId', 'value'].includes(key)) ||
			!identifier(condition.fieldId) || (fields !== undefined && !fields.has(condition.fieldId)) || !Object.hasOwn(condition, 'value')) throw new ContactsError('invalidDefinition');
		validLiteral(condition.value);
	}
}
const comparable = (value: unknown): string | undefined => Array.isArray(value) ? JSON.stringify(value.map((item) => comparable(item)))
	: value && typeof value === 'object' ? JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, comparable(item)])) : JSON.stringify(value);
/** Only this allowlisted expression tree is evaluated. No script, eval or remote references. */
export function conditionMatches(condition: ArchiveCondition, values: Record<string, ArchiveValue>): boolean {
	validCondition(condition, undefined);
	if (condition.op === 'and' || condition.op === 'or') return condition.op === 'and'
		? condition.conditions.every((item) => conditionMatches(item, values))
		: condition.conditions.some((item) => conditionMatches(item, values));
	if (!('fieldId' in condition)) throw new ContactsError('invalidDefinition');
	const value = values[condition.fieldId];
	if (condition.op === 'eq') return comparable(value) === comparable(condition.value);
	return Array.isArray(value) ? value.some((item) => comparable(item) === comparable(condition.value))
		: typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value);
}
export function defaultFormDesign(type: ArchiveTypeDefinition): ArchiveFormDesign {
	return {
		typeId: type.typeId, schemaRevisionId: type.revisionId,
		fieldSettings: type.fields.map((field) => ({ fieldId: field.fieldId, label: field.label, disabled: false })),
		forms: [{ id: 'default', label: type.label, columns: 2, controls: type.fields.map((field) => ({ fieldId: field.fieldId, group: '' })) }],
		templates: [],
	};
}
export function validateFormDesign(design: ArchiveFormDesign, type: ArchiveTypeDefinition): void {
	if (!design || design.typeId !== type.typeId || design.schemaRevisionId !== type.revisionId || !Array.isArray(design.fieldSettings) ||
		!Array.isArray(design.forms) || !design.forms.length || design.forms.length > 50 || !Array.isArray(design.templates) || design.templates.length > 50)
		throw new ContactsError('invalidDefinition');
	if (![...design.fieldSettings, ...design.forms, ...design.templates].every((item) => item && typeof item === 'object' && !Array.isArray(item))) throw new ContactsError('invalidDefinition');
	const fields = new Set(type.fields.map((field) => field.fieldId));
	if (design.fieldSettings.length !== fields.size || new Set(design.fieldSettings.map((item) => item.fieldId)).size !== fields.size)
		throw new ContactsError('invalidDefinition');
	for (const item of design.fieldSettings) if (!fields.has(item.fieldId) || !label(item.label) || typeof item.disabled !== 'boolean') throw new ContactsError('invalidDefinition');
	for (const collection of [design.forms, design.templates])
		if (new Set(collection.map((item) => item.id)).size !== collection.length) throw new ContactsError('invalidDefinition');
	for (const form of design.forms) {
		if (!identifier(form.id) || !label(form.label) || ![1, 2].includes(form.columns) || !Array.isArray(form.controls) ||
			!form.controls.every((item) => item && typeof item === 'object' && !Array.isArray(item)) ||
			new Set(form.controls.map((item) => item.fieldId)).size !== form.controls.length) throw new ContactsError('invalidDefinition');
		for (const control of form.controls) {
			if (!fields.has(control.fieldId) || typeof control.group !== 'string' || (control.help !== undefined && typeof control.help !== 'string') ||
				(control.readOnly !== undefined && typeof control.readOnly !== 'boolean')) throw new ContactsError('invalidDefinition');
			if (control.visibleWhen) validCondition(control.visibleWhen, fields);
		}
	}
	for (const template of design.templates) {
		if (!identifier(template.id) || !label(template.label) || typeof template.body !== 'string' || !template.values || typeof template.values !== 'object' || Array.isArray(template.values)) throw new ContactsError('invalidDefinition');
		for (const [id, value] of Object.entries(template.values)) {
			const field = type.fields.find((field) => field.fieldId === id);
			if (!field || (type.legacy && value === null)) throw new ContactsError('invalidField', id);
			validateFieldValue(field, value);
		}
		if (/<!--\s*\/?huhu:(?:field|reminders)\b/.test(template.body)) throw new ContactsError('invalidDefinition');
	}
}
