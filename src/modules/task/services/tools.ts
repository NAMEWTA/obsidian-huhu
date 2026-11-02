import type { TaskService, TaskTools, TaskToolDescriptor, TaskResources, TaskResource } from '../api';
import { TaskError, type TaskCommand } from '../core/model';
import { assertToolArguments, taskToolSchemas } from '../core/tool-schema';
const descriptions: Record<string, string> = {
	'task.list':
		'Query tasks with explicit status, date dimension, resource relation and bounded pagination. Overdue is derived; all includes completed.',
	'task.preview':
		'Read bounded future occurrence projections without writing files. A projection carries the series ID and revision used for explicit materialization.',
	'task.resources.search':
		'Search visible vault file/folder names and archive metadata. Does not read note contents or expose hidden plugin data.',
	'task.resources.resolve':
		'Resolve one related resource and report available, missing or unavailable without creating it.',
	'task.get':
		'Read one persistent task by stable ID including revision, three time dimensions and effective handling date.',
	'task.history': 'Read bounded task or series change history, newest first.',
	'task.series.get': 'Read a recurrence series and its user-edit revision.',
	'task.occurrence.materialize':
		'Persist one valid future occurrence for editing or completion; id is the series ID and expectedRevision is its template revision. Querying previews never writes.',
	'task.create':
		'Create a task (optionally recurring). Supply a unique commandId; retry the same payload with the SAME commandId.',
	'task.update':
		'Replace editable fields of one task. Read its current revision first. Omitted optional dates are cleared; createdAt and identity never change.',
	'task.complete': 'Complete one open task at its expectedRevision. Future reminders cease.',
	'task.reopen': 'Reopen one completed task at its expectedRevision. Past reminders are not replayed.',
	'task.cancel': 'Cancel one task, preserving its audit record. This is not physical file deletion.',
	'task.series.update':
		'Replace a series from an occurrence instant onwards atomically; completed history is retained. Use the SERIES revision.',
	'task.series.cancel':
		'Stop a series from an occurrence instant onwards and cancel its uncompleted following instances. Use the SERIES revision.',
};
const readOnly = new Set([
	'task.list',
	'task.get',
	'task.history',
	'task.series.get',
	'task.preview',
	'task.resources.search',
	'task.resources.resolve',
]);
const outputSchema = {
	type: 'object',
	properties: {
		ok: { type: 'boolean' },
		data: {},
		receipt: { type: 'object' },
		replayed: { type: 'boolean' },
		error: { type: 'object' },
	},
	required: ['ok'],
};
/** In-process tools: transports must provide their own authentication and trusted grants. */
export function createTaskTools(service: TaskService, resources?: TaskResources): TaskTools {
	const descriptors: TaskToolDescriptor[] = Object.entries(taskToolSchemas).map(([name, inputSchema]) => ({
		name,
		description: descriptions[name]!,
		inputSchema: inputSchema as Readonly<Record<string, unknown>>,
		outputSchema,
		annotations: {
			readOnlyHint: readOnly.has(name),
			destructiveHint: name.endsWith('.cancel') || name === 'task.series.update',
			idempotentHint: true,
		},
	}));
	return {
		version: 1,
		list: () => structuredClone(descriptors),
		async call(name, arguments_, context) {
			try {
				const schema = Object.hasOwn(taskToolSchemas, name) ? taskToolSchemas[name] : undefined;
				if (!schema) throw new TaskError('invalid-input', 'Unknown task tool');
				if (!context?.grants?.includes(readOnly.has(name) ? 'task:read' : 'task:write'))
					throw new TaskError('forbidden');
				if (context.signal?.aborted) throw new TaskError('cancelled');
				if (service.snapshot().status !== 'ready')
					throw new TaskError('unavailable', 'Task repository is not ready');
				// Validate and consume the same owned snapshot across asynchronous adapters.
				const args = structuredClone(arguments_) as Record<string, unknown>;
				assertToolArguments(args, schema);
				if (name === 'task.preview')
					return { ok: true, data: service.preview(args.from as string, args.to as string) };
				if (name === 'task.resources.search' || name === 'task.resources.resolve') {
					if (!resources) throw new TaskError('unavailable', 'Resource provider is unavailable');
					const data =
						name === 'task.resources.search'
							? await resources.search(args.text as string, args.kind as TaskResource['kind'] | undefined)
							: await resources.resolve(args.resource as TaskResource);
					if (context.signal?.aborted) throw new TaskError('cancelled');
					if (service.snapshot().status !== 'ready')
						throw new TaskError('unavailable', 'Task repository is not ready');
					return { ok: true, data };
				}
				if (name === 'task.list') return { ok: true, data: service.query(args) };
				if (name === 'task.history')
					return {
						ok: true,
						data: service.history(
							args.id as string | undefined,
							args.offset as number | undefined,
							args.limit as number | undefined,
						),
					};
				if (name === 'task.get' || name === 'task.series.get') {
					const data =
						name === 'task.get' ? service.get(args.id as string) : service.getSeries(args.id as string);
					if (!data) throw new TaskError('not-found');
					return { ok: true, data };
				}
				const kind =
					name === 'task.occurrence.materialize'
						? 'materialize'
						: name === 'task.series.update'
							? 'update-series'
							: name === 'task.series.cancel'
								? 'cancel-series'
								: name.slice(5);
				return await service.execute({ ...args, kind } as TaskCommand, context.signal);
			} catch (error) {
				const cause = error instanceof TaskError ? error : new TaskError('invalid-input', 'Task tool failed');
				return {
					ok: false,
					error: { code: cause.code, message: cause.message, currentRevision: cause.currentRevision },
				};
			}
		},
	};
}
