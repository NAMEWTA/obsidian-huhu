import {
	ArchiveError,
	type ArchiveTypeDefinition,
	type Condition,
	type Definition,
	type DefinitionRevision,
	type FieldDefinition,
	type RelationTypeDefinition,
} from './model';
import { validateQuery } from '../generic/query';
import { FIELD_KINDS, FieldCodecRegistry, validateValues } from './fields';
import { canonical, digest, equal, identifier, object, requiredId, safeRelativePath, text } from './value';

function keys(value: Record<string, unknown>, allowed: string[]): void {
	for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new ArchiveError('invalid-definition', key);
}
function list(value: unknown, name: string, max = 200): asserts value is unknown[] {
	if (!Array.isArray(value) || value.length > max) throw new ArchiveError('invalid-definition', name);
}
function boolean(value: unknown, name: string, optional = false): void {
	if (optional && value === undefined) return;
	if (typeof value !== 'boolean') throw new ArchiveError('invalid-definition', name);
}
function ids(value: unknown, name: string): asserts value is string[] {
	list(value, name);
	if (!value.length || !value.every(identifier) || new Set(value).size !== value.length)
		throw new ArchiveError('invalid-definition', name);
}
export function validateCondition(
	value: unknown,
	fieldIds: ReadonlySet<string>,
	depth = 0,
): asserts value is Condition {
	if (!object(value) || depth > 12) throw new ArchiveError('invalid-condition');
	if ('all' in value || 'any' in value) {
		const key = 'all' in value ? 'all' : 'any';
		keys(value, [key]);
		list(value[key], key, 32);
		for (const child of value[key]) validateCondition(child, fieldIds, depth + 1);
	} else {
		keys(value, ['fieldId', 'op', 'value']);
		if (
			typeof value.fieldId !== 'string' ||
			!fieldIds.has(value.fieldId) ||
			!['eq', 'ne', 'contains', 'present'].includes(String(value.op))
		)
			throw new ArchiveError('invalid-condition');
		canonical(value.value);
	}
}
export function validateFields(value: unknown, depth = 0): asserts value is FieldDefinition[] {
	list(value, 'fields');
	if (depth > 1) throw new ArchiveError('invalid-definition', 'table nesting');
	const fieldIds = new Set<string>(),
		storageKeys = new Set<string>();
	for (const raw of value) {
		if (!object(raw)) throw new ArchiveError('invalid-definition', 'field');
		keys(raw, [
			'fieldId',
			'storageKey',
			'label',
			'kind',
			'required',
			'archived',
			'options',
			'precision',
			'uniqueItems',
			'columns',
			'help',
		]);
		requiredId(raw.fieldId, 'fieldId');
		if (fieldIds.has(raw.fieldId)) throw new ArchiveError('duplicate-field', raw.fieldId);
		fieldIds.add(raw.fieldId);
		const key = text(raw.storageKey, 'storageKey', 128);
		if (
			!/^[\p{L}][\p{L}\p{N}_-]*$/u.test(key) ||
			/^(huhu-|constructor$|prototype$|rowId$)/i.test(key) ||
			storageKeys.has(key.toLowerCase())
		)
			throw new ArchiveError('invalid-storage-key', key);
		storageKeys.add(key.toLowerCase());
		text(raw.label, 'label');
		if (!FIELD_KINDS.includes(raw.kind as FieldDefinition['kind'])) throw new ArchiveError('invalid-field-kind');
		if ((key === 'tags' || key === 'aliases') && raw.kind !== 'strings')
			throw new ArchiveError('property-type-conflict', key);
		boolean(raw.required, 'required', true);
		boolean(raw.archived, 'archived', true);
		boolean(raw.uniqueItems, 'uniqueItems', true);
		if (raw.help !== undefined && (typeof raw.help !== 'string' || raw.help.length > 4096))
			throw new ArchiveError('invalid-definition', 'help');
		if (
			raw.precision !== undefined &&
			(raw.kind !== 'date' ||
				typeof raw.precision !== 'string' ||
				!['month', 'day', 'mixed'].includes(raw.precision))
		)
			throw new ArchiveError('invalid-definition', 'precision');
		if (raw.kind === 'select' || raw.kind === 'multiselect') {
			list(raw.options, 'options', 1000);
			const optionIds = new Set(),
				optionValues = new Set();
			for (const option of raw.options) {
				if (!object(option)) throw new ArchiveError('invalid-definition', 'option');
				keys(option, ['id', 'value', 'label', 'archived']);
				requiredId(option.id, 'option.id');
				if (typeof option.value !== 'string' || option.value.length > 512)
					throw new ArchiveError('invalid-definition', 'option.value');
				text(option.label, 'option.label');
				boolean(option.archived, 'option.archived', true);
				if (optionIds.has(option.id) || optionValues.has(option.value))
					throw new ArchiveError('duplicate-option');
				optionIds.add(option.id);
				optionValues.add(option.value);
			}
		} else if (raw.options !== undefined) throw new ArchiveError('invalid-definition', 'options');
		if (raw.kind === 'table') validateFields(raw.columns, depth + 1);
		else if (raw.columns !== undefined) throw new ArchiveError('invalid-definition', 'columns');
	}
}
function cardinality(value: unknown): void {
	if (!object(value)) throw new ArchiveError('invalid-definition', 'cardinality');
	keys(value, ['max', 'scope']);
	if (
		!['active', 'all'].includes(String(value.scope)) ||
		(value.max !== undefined &&
			(typeof value.max !== 'number' || !Number.isSafeInteger(value.max) || value.max < 1))
	)
		throw new ArchiveError('invalid-definition', 'cardinality');
}
/** Validate untrusted persisted definitions and all public publishing inputs. No executable schema dialect. */
export function validateDefinition(
	value: unknown,
	types: readonly ArchiveTypeDefinition[] = [],
): asserts value is Definition {
	if (!object(value)) throw new ArchiveError('invalid-definition');
	requiredId(value.id, 'definition.id');
	text(value.label, 'label');
	switch (value.kind) {
		case 'type': {
			keys(value, [
				'kind',
				'id',
				'label',
				'icon',
				'folder',
				'enabled',
				'nameFieldId',
				'fields',
				'defaultFormId',
				'defaultTemplateId',
			]);
			text(value.icon, 'icon', 96);
			boolean(value.enabled, 'enabled');
			if (
				!safeRelativePath(value.folder) ||
				value.folder.split('/').some((part) => ['档案定义', '关联记录', '迁移记录'].includes(part))
			)
				throw new ArchiveError('invalid-folder');
			validateFields(value.fields);
			requiredId(value.nameFieldId, 'nameFieldId');
			if (
				!value.fields.some(
					(field) => field.fieldId === value.nameFieldId && field.kind === 'text' && !field.archived,
				)
			)
				throw new ArchiveError('invalid-name-field');
			if (value.defaultFormId !== undefined) requiredId(value.defaultFormId);
			if (value.defaultTemplateId !== undefined) requiredId(value.defaultTemplateId);
			break;
		}
		case 'form': {
			keys(value, ['kind', 'id', 'typeId', 'label', 'groups']);
			requiredId(value.typeId, 'typeId');
			list(value.groups, 'groups', 100);
			const type = types.find((type) => type.id === value.typeId),
				fields = new Set(type?.fields.map((field) => field.fieldId) ?? []),
				groupIds = new Set(),
				controls = new Set();
			for (const group of value.groups) {
				if (!object(group)) throw new ArchiveError('invalid-definition', 'group');
				keys(group, ['id', 'label', 'columns', 'controls', 'visibleWhen']);
				requiredId(group.id);
				text(group.label, 'group.label');
				if (groupIds.has(group.id) || typeof group.columns !== 'number' || ![1, 2, 3].includes(group.columns))
					throw new ArchiveError('invalid-definition', 'group');
				groupIds.add(group.id);
				list(group.controls, 'controls');
				for (const control of group.controls) {
					if (!object(control)) throw new ArchiveError('invalid-definition', 'control');
					keys(control, ['fieldId', 'readOnly', 'visibleWhen', 'help']);
					requiredId(control.fieldId);
					boolean(control.readOnly, 'readOnly', true);
					if (controls.has(control.fieldId) || (type && !fields.has(control.fieldId)))
						throw new ArchiveError('invalid-form-field', control.fieldId);
					controls.add(control.fieldId);
					if (control.help !== undefined && typeof control.help !== 'string')
						throw new ArchiveError('invalid-definition', 'help');
					if (control.visibleWhen !== undefined)
						validateCondition(
							control.visibleWhen,
							type ? fields : new Set(collectConditionIds(control.visibleWhen)),
						);
				}
				if (group.visibleWhen !== undefined)
					validateCondition(
						group.visibleWhen,
						type ? fields : new Set(collectConditionIds(group.visibleWhen)),
					);
			}
			break;
		}
		case 'template': {
			keys(value, ['kind', 'id', 'typeId', 'label', 'defaults', 'body']);
			requiredId(value.typeId);
			if (!object(value.defaults) || typeof value.body !== 'string')
				throw new ArchiveError('invalid-definition', 'template');
			const type = types.find((type) => type.id === value.typeId);
			if (type) validateValues(type.fields, value.defaults, false);
			break;
		}
		case 'relation-type': {
			keys(value, [
				'kind',
				'id',
				'label',
				'enabled',
				'sourceTypes',
				'targetTypes',
				'directed',
				'forwardLabel',
				'inverseLabel',
				'sourceCardinality',
				'targetCardinality',
				'allowSelf',
				'acyclic',
				'onDelete',
				'duplicatePolicy',
				'activeWhen',
				'fields',
				'contextRoles',
			]);
			boolean(value.enabled, 'enabled');
			boolean(value.directed, 'directed');
			boolean(value.allowSelf, 'allowSelf');
			boolean(value.acyclic, 'acyclic');
			ids(value.sourceTypes, 'sourceTypes');
			ids(value.targetTypes, 'targetTypes');
			text(value.forwardLabel, 'forwardLabel');
			text(value.inverseLabel, 'inverseLabel');
			cardinality(value.sourceCardinality);
			cardinality(value.targetCardinality);
			validateFields(value.fields);
			if (value.activeWhen !== undefined)
				validateCondition(value.activeWhen, new Set(value.fields.map((field) => field.fieldId)));
			if (
				!['restrict', 'retain'].includes(String(value.onDelete)) ||
				!['allow', 'endpoints', 'values'].includes(String(value.duplicatePolicy))
			)
				throw new ArchiveError('invalid-definition', 'relation');
			if (
				!value.directed &&
				(!equal([...value.sourceTypes].sort(), [...value.targetTypes].sort()) ||
					value.acyclic ||
					!equal(value.sourceCardinality, value.targetCardinality))
			)
				throw new ArchiveError('invalid-symmetric-relation');
			list(value.contextRoles, 'contextRoles', 32);
			const roles = new Set();
			for (const role of value.contextRoles) {
				if (!object(role)) throw new ArchiveError('invalid-definition', 'context role');
				keys(role, ['role', 'label', 'typeIds', 'required']);
				requiredId(role.role);
				text(role.label, 'role.label');
				ids(role.typeIds, 'typeIds');
				boolean(role.required, 'role.required', true);
				if (roles.has(role.role)) throw new ArchiveError('duplicate-role');
				roles.add(role.role);
			}
			break;
		}
		case 'view': {
			keys(value, ['kind', 'id', 'typeId', 'label', 'layout', 'columns', 'query']);
			requiredId(value.typeId);
			list(value.columns, 'columns');
			validateQuery(value.query);
			if (
				!['table', 'card'].includes(String(value.layout)) ||
				!value.columns.every(identifier) ||
				!object(value.query)
			)
				throw new ArchiveError('invalid-definition', 'view');
			const type = types.find((type) => type.id === value.typeId);
			if (type && value.columns.some((id) => !type.fields.some((field) => field.fieldId === id)))
				throw new ArchiveError('invalid-view-field');
			break;
		}
		default:
			throw new ArchiveError('invalid-definition', 'kind');
	}
}
function collectConditionIds(value: unknown, depth = 0): string[] {
	if (!object(value) || depth > 12) return [];
	if (typeof value.fieldId === 'string') return [value.fieldId];
	const children = value.all ?? value.any;
	return Array.isArray(children) ? children.flatMap((child) => collectConditionIds(child, depth + 1)) : [];
}
export function assertPropertyCompatibility(
	definition: ArchiveTypeDefinition | RelationTypeDefinition,
	others: readonly (ArchiveTypeDefinition | RelationTypeDefinition)[],
): void {
	const propertyTypes = new Map<string, string>();
	for (const other of [...others, definition]) {
		for (const field of other.fields) {
			if (field.kind === 'markdown') continue;
			const kind = FieldCodecRegistry[field.kind].propertyType,
				key = field.storageKey.toLowerCase(),
				previous = propertyTypes.get(key);
			if (previous && previous !== kind) throw new ArchiveError('property-type-conflict', field.storageKey);
			propertyTypes.set(key, kind);
		}
	}
}
export function incompatibleFields(
	before: ArchiveTypeDefinition | RelationTypeDefinition,
	after: ArchiveTypeDefinition | RelationTypeDefinition,
): string[] {
	const result: string[] = [];
	for (const field of before.fields) {
		const next = after.fields.find((next) => next.fieldId === field.fieldId);
		if (
			!next ||
			next.kind !== field.kind ||
			next.storageKey !== field.storageKey ||
			next.precision !== field.precision ||
			!equal(next.columns, field.columns) ||
			(field.options &&
				!field.options.every((option) =>
					next.options?.some(
						(nextOption) => nextOption.id === option.id && nextOption.value === option.value,
					),
				))
		)
			result.push(field.fieldId);
	}
	for (const field of after.fields)
		if (
			field.required &&
			!field.archived &&
			!before.fields.find((previous) => previous.fieldId === field.fieldId)?.required
		)
			result.push(field.fieldId);
	return [...new Set(result)];
}
export async function createRevision(
	definition: Definition,
	parents: readonly string[],
	displayVersion: number,
	revisionId: string = crypto.randomUUID(),
): Promise<DefinitionRevision> {
	validateDefinition(definition);
	requiredId(revisionId);
	parents.forEach((parent) => requiredId(parent));
	if (
		parents.includes(revisionId) ||
		new Set(parents).size !== parents.length ||
		!Number.isSafeInteger(displayVersion) ||
		displayVersion < 1
	)
		throw new ArchiveError('invalid-revision');
	const contentHash = await digest(canonical({ definition, parentRevisionIds: [...parents].sort() }));
	return {
		revisionId,
		parentRevisionIds: [...parents],
		contentHash,
		displayVersion,
		definition: structuredClone(definition),
	};
}
/** Heads are rebuilt from immutable revisions, not inferred from the last synced pointer. */
export function revisionGraph(revisions: readonly DefinitionRevision[]): {
	heads: string[];
	missing: string[];
	cycle: boolean;
} {
	const byId = new Map(revisions.map((revision) => [revision.revisionId, revision])),
		children = new Set<string>(),
		missing = new Set<string>();
	const remaining = new Map<string, number>(),
		descendants = new Map<string, string[]>();
	for (const revision of revisions) {
		remaining.set(revision.revisionId, revision.parentRevisionIds.filter((parent) => byId.has(parent)).length);
		for (const parent of revision.parentRevisionIds) {
			children.add(parent);
			if (!byId.has(parent)) missing.add(parent);
			else {
				const next = descendants.get(parent) ?? [];
				next.push(revision.revisionId);
				descendants.set(parent, next);
			}
		}
	}
	const ready = [...remaining].filter(([, count]) => count === 0).map(([id]) => id);
	for (let index = 0; index < ready.length; index++)
		for (const child of descendants.get(ready[index]!) ?? []) {
			const count = remaining.get(child)! - 1;
			remaining.set(child, count);
			if (!count) ready.push(child);
		}
	return {
		heads: [...byId.keys()].filter((id) => !children.has(id)).sort(),
		missing: [...missing].sort(),
		cycle: ready.length !== byId.size,
	};
}
