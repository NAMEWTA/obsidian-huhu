import { TaskError } from './model';
/** Small, closed JSON-schema subset used by our own versioned tool declarations. */
export interface ToolSchema {
	type?: 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean';
	properties?: Record<string, ToolSchema>;
	required?: string[];
	additionalProperties?: boolean;
	items?: ToolSchema;
	enum?: readonly unknown[];
	minimum?: number;
	maximum?: number;
	maxLength?: number;
	minLength?: number;
	maxItems?: number;
	anyOf?: ToolSchema[];
}
export function assertToolArguments(value: unknown, schema: ToolSchema, path = 'arguments'): void {
	const invalid = () => {
		throw new TaskError('invalid-input', `Invalid ${path}`);
	};
	if (schema.anyOf) {
		for (const option of schema.anyOf) {
			try {
				assertToolArguments(value, option, path);
				return;
			} catch {
				/* Try another declared variant. */
			}
		}
		invalid();
	}
	if (schema.enum && !schema.enum.includes(value)) invalid();
	switch (schema.type) {
		case 'object': {
			if (value === null || typeof value !== 'object' || Array.isArray(value)) return invalid();
			const object = value as Record<string, unknown>;
			for (const key of schema.required ?? []) if (!Object.hasOwn(object, key)) invalid();
			for (const [key, child] of Object.entries(object)) {
				if (!Object.hasOwn(schema.properties ?? {}, key)) {
					if (schema.additionalProperties === false) invalid();
					continue;
				}
				assertToolArguments(child, schema.properties![key]!, `${path}.${key}`);
			}
			break;
		}
		case 'array':
			if (!Array.isArray(value) || (schema.maxItems !== undefined && value.length > schema.maxItems))
				return invalid();
			if (schema.items)
				for (const [index, item] of value.entries())
					assertToolArguments(item, schema.items, `${path}[${index}]`);
			break;
		case 'string':
			if (
				typeof value !== 'string' ||
				(schema.maxLength !== undefined && value.length > schema.maxLength) ||
				(schema.minLength !== undefined && value.length < schema.minLength)
			)
				invalid();
			break;
		case 'integer':
		case 'number':
			if (
				typeof value !== 'number' ||
				!Number.isFinite(value) ||
				(schema.type === 'integer' && !Number.isSafeInteger(value)) ||
				(schema.minimum !== undefined && value < schema.minimum) ||
				(schema.maximum !== undefined && value > schema.maximum)
			)
				invalid();
			break;
		case 'boolean':
			if (typeof value !== 'boolean') invalid();
			break;
	}
}
const string = (maxLength = 2048): ToolSchema => ({ type: 'string', maxLength });
const object = (properties: Record<string, ToolSchema>, required: string[] = []): ToolSchema => ({
	type: 'object',
	properties,
	required,
	additionalProperties: false,
});
export const resourceSchema: ToolSchema = {
	anyOf: [
		object({ kind: { enum: ['file', 'folder'] }, path: string() }, ['kind', 'path']),
		object({ kind: { enum: ['archive'] }, id: string(256) }, ['kind', 'id']),
	],
};
export const fieldsSchema = object(
	{
		title: { ...string(1000), minLength: 1 },
		description: string(100_000),
		timezone: string(128),
		due: object({ date: string(10), time: string(5) }, ['date']),
		planDate: string(10),
		reminderAt: { type: 'integer', minimum: 0 },
		relations: { type: 'array', items: resourceSchema, maxItems: 100 },
	},
	['title', 'description', 'timezone', 'relations'],
);
export const draftSchema = object(
	{
		...fieldsSchema.properties,
		recurrence: object({ expression: string(256), start: { type: 'integer', minimum: 0 }, end: string(10) }, [
			'expression',
			'start',
		]),
	},
	fieldsSchema.required,
);
const identity = { id: { ...string(512), minLength: 1 } },
	command = { commandId: { ...string(128), minLength: 1 } },
	revision = { expectedRevision: { type: 'integer', minimum: 1 } as ToolSchema };
export const taskToolSchemas: Record<string, ToolSchema> = {
	'task.list': object({
		filter: { enum: ['all', 'open', 'completed', 'overdue'] },
		text: string(1000),
		timeField: { enum: ['effectiveDate', 'due', 'createdAt', 'reminderAt', 'completedAt'] },
		from: string(10),
		to: string(10),
		related: resourceSchema,
		recursive: { type: 'boolean' },
		includeCancelled: { type: 'boolean' },
		order: { enum: ['asc', 'desc'] },
		offset: { type: 'integer', minimum: 0 },
		limit: { type: 'integer', minimum: 1, maximum: 500 },
	}),
	'task.preview': object({ from: string(10), to: string(10) }, ['from', 'to']),
	'task.resources.search': object({ text: string(1000), kind: { enum: ['file', 'folder', 'archive'] } }, ['text']),
	'task.resources.resolve': object({ resource: resourceSchema }, ['resource']),
	'task.get': object(identity, ['id']),
	'task.history': object({
		id: string(512),
		offset: { type: 'integer', minimum: 0 },
		limit: { type: 'integer', minimum: 1, maximum: 500 },
	}),
	'task.create': object({ ...command, draft: draftSchema }, ['commandId', 'draft']),
	'task.update': object({ ...command, ...identity, ...revision, fields: fieldsSchema }, [
		'commandId',
		'id',
		'expectedRevision',
		'fields',
	]),
	'task.complete': object({ ...command, ...identity, ...revision }, ['commandId', 'id', 'expectedRevision']),
	'task.reopen': object({ ...command, ...identity, ...revision }, ['commandId', 'id', 'expectedRevision']),
	'task.cancel': object({ ...command, ...identity, ...revision }, ['commandId', 'id', 'expectedRevision']),
	'task.occurrence.materialize': object(
		{ ...command, ...identity, ...revision, at: { type: 'integer', minimum: 0 } },
		['commandId', 'id', 'expectedRevision', 'at'],
	),
	'task.series.get': object(identity, ['id']),
	'task.series.update': object(
		{ ...command, ...identity, ...revision, from: { type: 'integer', minimum: 0 }, draft: draftSchema },
		['commandId', 'id', 'expectedRevision', 'from', 'draft'],
	),
	'task.series.cancel': object({ ...command, ...identity, ...revision, from: { type: 'integer', minimum: 0 } }, [
		'commandId',
		'id',
		'expectedRevision',
		'from',
	]),
};
