import { describe, expect, it } from 'vitest';
import type { TaskCommand, TaskDraft, TaskResources } from '../api';
import { createTaskRepository } from '../platform/repository';
import { createTaskService } from './service';
import { createTaskTools } from './tools';

const draft = (): TaskDraft => ({
	title: 'Accepted task',
	description: '',
	timezone: 'UTC',
	due: { date: '2026-11-01' },
	relations: [{ kind: 'file', path: 'Project/accepted.md' }],
});
function deferred() {
	let release!: () => void;
	const promise = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { promise, release };
}
async function fixture() {
	let raw: string | null = null;
	let writes = 0;
	const tasks = createTaskService({
		deviceId: 'boundary-test',
		now: () => Date.UTC(2026, 9, 28, 10),
		repository: createTaskRepository({
			read: async () => raw,
			process: async (change) => {
				const next = change(raw);
				if (next !== raw) writes++;
				raw = next;
				return next;
			},
		}),
	});
	await tasks.load();
	return {
		tasks,
		writes: () => writes,
		corrupt() {
			raw = '{damaged';
		},
	};
}
function resourceProvider(gate: ReturnType<typeof deferred>): TaskResources {
	return {
		async search() {
			await gate.promise;
			return [
				{ resource: { kind: 'file', path: 'Project/accepted.md' }, status: 'available', label: 'Accepted' },
			];
		},
		async resolve(resource) {
			await gate.promise;
			return { resource, status: 'available', label: 'Accepted' };
		},
		async open() {},
	};
}

describe('task public boundary ownership', () => {
	it('captures create payload and idempotency key before queueing', async () => {
		const { tasks } = await fixture();
		const command: Extract<TaskCommand, { kind: 'create' }> = {
			kind: 'create',
			commandId: 'accepted',
			draft: draft(),
		};
		const original = structuredClone(command);
		const pending = tasks.execute(command);
		command.commandId = 'changed';
		command.draft.title = 'Changed after submission';
		command.draft.due!.date = '2026-12-01';
		command.draft.relations[0] = { kind: 'file', path: 'Other.md' };
		expect(await pending).toMatchObject({ ok: true, receipt: { commandId: 'accepted' } });
		expect(tasks.get('task:accepted')).toMatchObject(original.draft);
		expect(tasks.get('task:changed')).toBeUndefined();
		expect(await tasks.execute(original)).toMatchObject({ ok: true, replayed: true });
		await tasks.dispose();
	});
	it('captures update identity revision and nested fields before queueing', async () => {
		const { tasks } = await fixture();
		await tasks.execute({ kind: 'create', commandId: 'first', draft: draft() });
		await tasks.execute({ kind: 'create', commandId: 'second', draft: draft() });
		const command: Extract<TaskCommand, { kind: 'update' }> = {
			kind: 'update',
			commandId: 'edit',
			id: 'task:first',
			expectedRevision: 1,
			fields: { ...draft(), title: 'Accepted edit' },
		};
		const pending = tasks.execute(command);
		command.id = 'task:second';
		command.expectedRevision = 999;
		command.fields.title = 'Changed edit';
		expect(await pending).toMatchObject({ ok: true, receipt: { taskId: 'task:first', taskRevision: 2 } });
		expect(tasks.get('task:first')?.title).toBe('Accepted edit');
		expect(tasks.get('task:second')?.revision).toBe(1);
		await tasks.dispose();
	});
	it('rejects uncloneable input without writing or poisoning the queue', async () => {
		const { tasks, writes } = await fixture();
		const invalid = Object.assign(draft(), { unsupported: () => undefined });
		expect(await tasks.execute({ kind: 'create', commandId: 'bad', draft: invalid })).toMatchObject({
			ok: false,
			error: { code: 'invalid-input' },
		});
		expect(writes()).toBe(0);
		expect(tasks.snapshot().status).toBe('ready');
		expect(await tasks.execute({ kind: 'create', commandId: 'healthy', draft: draft() })).toMatchObject({
			ok: true,
		});
		await tasks.dispose();
	});
	it('keeps cancellation live after capturing a queued command', async () => {
		const { tasks, writes } = await fixture();
		const controller = new AbortController();
		const pending = tasks.execute({ kind: 'create', commandId: 'abort', draft: draft() }, controller.signal);
		controller.abort();
		expect(await pending).toMatchObject({ ok: false, error: { code: 'cancelled' } });
		expect(writes()).toBe(0);
		await tasks.dispose();
	});
	it('isolates AI write arguments from subsequent caller edits', async () => {
		const { tasks } = await fixture();
		const tools = createTaskTools(tasks);
		const args = { commandId: 'tool', draft: draft() };
		const pending = tools.call('task.create', args, { grants: ['task:write'] });
		args.draft.title = 'Changed after authorization';
		expect(await pending).toMatchObject({ ok: true });
		expect(tasks.get('task:tool')?.title).toBe('Accepted task');
		await tasks.dispose();
	});
	it('isolates resource arguments across asynchronous providers', async () => {
		const { tasks } = await fixture();
		const gate = deferred();
		const tools = createTaskTools(tasks, resourceProvider(gate));
		const args = { resource: { kind: 'file' as const, path: 'Project/accepted.md' } };
		const pending = tools.call('task.resources.resolve', args, { grants: ['task:read'] });
		args.resource.path = 'Other.md';
		gate.release();
		expect(await pending).toMatchObject({ ok: true, data: { resource: { path: 'Project/accepted.md' } } });
		await tasks.dispose();
	});
	it.each(['task.resources.search', 'task.resources.resolve'])(
		'rejects late %s data after module disposal',
		async (name) => {
			const { tasks } = await fixture();
			const gate = deferred();
			const tools = createTaskTools(tasks, resourceProvider(gate));
			const args = name.endsWith('.search')
				? { text: 'accepted' }
				: { resource: { kind: 'file', path: 'Project/accepted.md' } };
			const pending = tools.call(name, args, { grants: ['task:read'] });
			await tasks.dispose();
			gate.release();
			expect(await pending).toMatchObject({ ok: false, error: { code: 'unavailable' } });
		},
	);
	it('rejects late resource data after the repository enters an error state', async () => {
		const { tasks, corrupt } = await fixture();
		const gate = deferred();
		const tools = createTaskTools(tasks, resourceProvider(gate));
		const pending = tools.call('task.resources.search', { text: 'accepted' }, { grants: ['task:read'] });
		corrupt();
		await tasks.refresh();
		gate.release();
		expect(await pending).toMatchObject({ ok: false, error: { code: 'unavailable' } });
		await tasks.dispose();
	});
	it('discards aborted resource results after an asynchronous provider returns', async () => {
		const { tasks } = await fixture();
		const gate = deferred();
		const controller = new AbortController();
		const tools = createTaskTools(tasks, resourceProvider(gate));
		const pending = tools.call(
			'task.resources.search',
			{ text: 'accepted' },
			{ grants: ['task:read'], signal: controller.signal },
		);
		controller.abort();
		gate.release();
		expect(await pending).toMatchObject({ ok: false, error: { code: 'cancelled' } });
		await tasks.dispose();
	});
});
