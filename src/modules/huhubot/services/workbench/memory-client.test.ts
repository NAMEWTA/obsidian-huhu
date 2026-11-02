import { expect, test, vi } from 'vitest';
import type { BotClient, ExecutionContextView, MemoryGet, MemoryNamespace, MemoryQuery } from '../../api';
import { MemoryClient } from './memory-client';
import { MethodValidation } from '../../core/protocol/method-validation';
import { WorkbenchClient } from './workbench-client';
const first: MemoryNamespace = { kind: 'agent', id: 'a' },
	second: MemoryNamespace = { kind: 'agent', id: 'b' };
function context(namespace: MemoryNamespace): ExecutionContextView {
	return {
		state: 'sealed',
		runId: 'r',
		runRevision: '3',
		manifestRevision: '1',
		namespace,
		scope: { kind: 'session', id: 's' },
		nextCursor: 'parts2',
		entries: [
			{
				id: 'intent',
				revision: '1',
				scope: { kind: 'session', id: 's' },
				kind: 'intent',
				representation: 'full',
				state: 'readable',
				text: `First ${namespace.id}`,
				partIndex: 0,
				creatorKind: 'user',
				preparationKind: 'explicit',
			},
		],
	};
}
test('a late context parts page cannot cross a namespace change', async () => {
	let finish!: (value: { kind: 'context'; context: ExecutionContextView }) => void;
	const bot = {
		hello: { profile: { profileId: 'p' } },
		memory: {
			list: async (query: { kind: string; namespace: MemoryNamespace }) => ({
				namespaceRevision: '2',
				items: query.kind === 'context' ? [{ kind: 'context', context: context(query.namespace) }] : [],
			}),
			get: vi.fn(
				() =>
					new Promise<{ kind: 'context'; context: ExecutionContextView }>((resolve) => {
						finish = resolve;
					}),
			),
		},
	} as unknown as BotClient;
	const memory = new MemoryClient(() => bot);
	await memory.load(first, undefined, { kind: 'session', id: 's' });
	const pending = memory.loadContextMore('r', 'parts2');
	await memory.load(second, undefined, { kind: 'session', id: 's' });
	finish({ kind: 'context', context: { ...context(first), nextCursor: undefined, entries: [] } });
	await pending;
	const result = memory.store.getState().page?.items.find((object) => object.kind === 'context');
	expect(result?.kind === 'context' && result.context.namespace).toEqual(second);
	memory.dispose();
});

test('catalog queries obey the public HAP limit and never request an unscoped execution context', async () => {
	const validation = new MethodValidation();
	const list = vi.fn(async (query: MemoryQuery) => {
		expect(validation.validate('memory.list', 'params', query), JSON.stringify(query)).toBe(true);
		expect(query.kind !== 'proposal' || query.namespace.kind === 'global').toBe(true);
		return { namespaceRevision: '2', items: [] };
	});
	const bot = { hello: { profile: { profileId: 'p' } }, memory: { list } } as unknown as BotClient;
	const memory = new MemoryClient(() => bot);
	await memory.load({ kind: 'global', id: 'p' });
	expect(memory.store.getState().error).toBe(false);
	await memory.load(first);
	expect(memory.store.getState().error).toBe(false);
	expect(list.mock.calls.every(([query]) => query.kind !== 'context')).toBe(true);
	await memory.load(first, undefined, { kind: 'session', id: 's' });
	expect(memory.store.getState().error).toBe(false);
	expect(list).toHaveBeenCalledWith(
		expect.objectContaining({ kind: 'context', scope: { kind: 'session', id: 's' }, limit: 50 }),
		expect.anything(),
	);
	memory.dispose();
});

test('an explicit inspection resolves session metadata to canonical work-thread context and pages its parts', async () => {
	const validation = new MethodValidation(),
		view: ExecutionContextView = { ...context(first), scope: { kind: 'work_thread', id: 'thread:r' } };
	const get = vi.fn(async (query: MemoryGet) => {
		expect(validation.validate('memory.get', 'params', query)).toBe(true);
		return {
			kind: 'context' as const,
			context:
				query.kind === 'context' && query.cursor
					? {
							...view,
							nextCursor: undefined,
							entries: [{ ...view.entries[0]!, partIndex: 1, text: 'Last fragment' }],
						}
					: view,
		};
	});
	const bot = {
		hello: { profile: { profileId: 'p' } },
		memory: {
			list: async (query: { kind: string }) => ({
				namespaceRevision: '2',
				items:
					query.kind === 'context'
						? [
								{
									kind: 'context',
									context: {
										state: 'pending',
										runId: 'r',
										runRevision: '2',
										namespace: first,
										scope: { kind: 'session', id: 's' },
										entries: [],
									},
								},
							]
						: [],
			}),
			get,
		},
	} as unknown as BotClient;
	const memory = new MemoryClient(() => bot);
	await memory.load(first, undefined, { kind: 'session', id: 's' });
	expect(get).not.toHaveBeenCalled();
	await memory.loadContext('r');
	expect(get).toHaveBeenCalledWith(
		expect.objectContaining({ kind: 'context', id: 'r', namespace: first, limit: 50 }),
		expect.anything(),
	);
	expect(memory.store.getState().page?.items).toContainEqual({ kind: 'context', context: view });
	expect(memory.store.getState().contextLoaded.r).toBe(true);
	await memory.loadContextMore('r', 'parts2');
	const result = memory.store.getState().page?.items.find((object) => object.kind === 'context');
	expect(result?.kind === 'context' && result.context.scope).toEqual({ kind: 'work_thread', id: 'thread:r' });
	expect(result?.kind === 'context' && result.context.entries).toHaveLength(2);
	expect(result?.kind === 'context' && result.context.nextCursor).toBeUndefined();
	memory.dispose();
});

test('a late first inspection cannot restore context after the selected conversation changes', async () => {
	let finish!: (result: { kind: 'context'; context: ExecutionContextView }) => void;
	const bot = {
		hello: { profile: { profileId: 'p' } },
		memory: {
			list: async (query: MemoryQuery) => ({
				namespaceRevision: '2',
				items:
					query.kind === 'context' && query.scope?.kind !== 'profile' && query.scope?.id === 's'
						? [{ kind: 'context', context: { ...context(first), entries: [] } }]
						: [],
			}),
			get: () =>
				new Promise<{ kind: 'context'; context: ExecutionContextView }>((resolve) => {
					finish = resolve;
				}),
		},
	} as unknown as BotClient;
	const memory = new MemoryClient(() => bot);
	await memory.load(first, undefined, { kind: 'session', id: 's' });
	const pending = memory.loadContext('r');
	await memory.load(first, undefined, { kind: 'session', id: 'other' });
	finish({ kind: 'context', context: context(first) });
	await pending;
	expect(memory.store.getState().page?.items).toEqual([]);
	expect(memory.store.getState().contextLoaded.r).toBeUndefined();
	memory.dispose();
});

test('task context metadata separates execution subjects, stays bounded and clears on lost authorization or Profile reset', () => {
	const workspace = new WorkbenchClient({ client: () => undefined }, { after: () => () => {} });
	const children = Array.from({ length: 514 }, (_, index) => ({
		id: `d:${index}`,
		revision: '1',
		parentRunId: 'parent',
		rootRunId: 'parent',
		childRunId: `run:${index}`,
		requesterAgentId: 'sponsor',
		executorAgentId: `subject:${index}`,
		targetAgentId: index % 2 ? `subject:${index}` : undefined,
		workThreadId: 'reused-thread',
		status: 'succeeded' as const,
	}));
	workspace.acceptDelegations(children);
	const threads = workspace.getSnapshot().contextThreads;
	expect(threads).toHaveLength(512);
	expect(threads[0]).toEqual({
		namespace: { kind: 'temporary', id: 'subject:2' },
		runId: 'run:2',
		workThreadId: 'reused-thread',
	});
	expect(threads[1]?.namespace).toEqual({ kind: 'agent', id: 'subject:3' });
	workspace.permissionsChanged();
	expect(workspace.getSnapshot().contextThreads).toEqual([]);
	workspace.acceptDelegations(children.slice(0, 1));
	workspace.resetProfile();
	expect(workspace.getSnapshot().contextThreads).toEqual([]);
	workspace.dispose();
});
