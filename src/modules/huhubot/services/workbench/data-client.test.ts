import { expect, test, vi } from 'vitest';
import type { BotClient, BotMethodMap, Receipt } from '../../api';
import { BotRpcError } from '../../core/protocol/connection';
import { DataClient } from './data-client';
import { WorkbenchClient } from './workbench-client';
import { MethodValidation } from '../../core/protocol/method-validation';

function fixture() {
	const preview = { token: 'original-cleanup', revision: '2', expiresAt: '2026-10-28T20:00:00Z', categories: [] };
	const client = {
		state: 'ready',
		onClose: () => () => {},
		hello: { profile: { profileId: 'profile', commandEpoch: '2' } },
		service: { status: vi.fn(async () => ({ cleanup: { profile: false, sessionIds: ['session'] } })) },
		agents: { list: vi.fn(async () => ({ items: [] })) },
		memory: { list: vi.fn(async () => ({ items: [] })) },
		sessions: {
			list: vi.fn(async () => ({ items: [] })),
			deletePreview: vi.fn(async () => preview),
			delete: vi.fn(async (_command: BotMethodMap['sessions.delete']['params']) => ({ receiptId: 'cleaned' })),
		},
		profile: { deletePreview: vi.fn(async () => preview) },
	} as unknown as BotClient;
	return { client, preview };
}
test('restricted data initialization reads only pending cleanup and can retry without business lists', async () => {
	const { client, preview } = fixture();
	const data = new DataClient(() => client);
	await data.initialize();
	expect(data.store.getState().sessionCleanup).toEqual([{ id: 'session', preview }]);
	expect(client.agents.list).not.toHaveBeenCalled();
	expect(client.sessions.list).not.toHaveBeenCalled();
	expect(client.memory.list).not.toHaveBeenCalled();
	expect(client.profile.deletePreview).not.toHaveBeenCalled();
	expect(await data.retrySessionCleanup('session')).toBe(true);
	expect(client.sessions.delete).toHaveBeenCalledWith(
		expect.objectContaining({ id: 'session', previewToken: preview.token, expectedRevision: preview.revision }),
	);
	data.dispose();
});
test('Data memory queries and continuations obey the real public fifty-item request contract', async () => {
	const { client } = fixture();
	const validation = new MethodValidation();
	Object.assign(client.service, { status: async () => ({ state: 'ready' }) });
	const list = vi.fn(async (query: BotMethodMap['memory.list']['params']) => {
		if (!validation.validate('memory.list', 'params', query)) throw new Error('PUBLIC_MEMORY_CONTRACT_REJECTED');
		return { namespaceRevision: '1', items: [], nextCursor: 'opaque-next-page' };
	});
	Object.assign(client.memory, { list });
	const data = new DataClient(() => client);
	await data.initialize();
	expect(data.store.getState().error).toBeUndefined();
	await data.loadMemories({ kind: 'agent', id: 'agent-a' });
	await data.loadMemories({ kind: 'agent', id: 'agent-a' }, true);
	expect(data.store.getState().error).toBeUndefined();
	expect(list.mock.calls).toHaveLength(3);
	expect(list.mock.calls.every(([query]) => query.limit === 50)).toBe(true);
	expect(list.mock.calls[2]?.[0].cursor).toBe('opaque-next-page');
	data.dispose();
});
test('an import RPC failure after commit keeps its original preview, resolutions and command identity', async () => {
	const { client } = fixture();
	const imported = vi.fn(async (_command: BotMethodMap['portable.import']['params']) => ({ receiptId: 'imported' }));
	imported.mockRejectedValueOnce(
		new BotRpcError(-32603, {
			kind: 'CONFLICT',
			reason: 'INTERNAL_ERROR',
			retryable: false,
			correlationId: 'test',
		}),
	);
	Object.assign(client, { portable: { import: imported } });
	const data = new DataClient(() => client);
	data.store.setState({
		importPreview: { token: 'preview', mappingMode: 'copy-candidate', mappings: [], conflicts: [] },
	});
	expect(await data.import([{ id: 'a', action: 'copy' }])).toBe(false);
	expect(data.store.getState().importUncertain).toBe(true);
	// A permission change may clear preview projections while the accepted intent still needs its receipt.
	data.store.setState({ importPreview: undefined });
	expect(await data.import([{ id: 'a', action: 'replace' }])).toBe(true);
	expect(imported.mock.calls[1]?.[0]).toEqual(imported.mock.calls[0]?.[0]);
	data.dispose();
});
test('opening Data before Chat still binds close and discards a late memory page', async () => {
	const { client } = fixture();
	const handlers = new Set<() => void>();
	Object.assign(client, {
		onClose: (handler: () => void) => {
			handlers.add(handler);
			return () => handlers.delete(handler);
		},
	});
	Object.assign(client.service, { status: async () => ({ state: 'ready' }) });
	let finish!: (value: unknown) => void;
	Object.assign(client.memory, {
		list: vi
			.fn(
				() =>
					new Promise((resolve) => {
						finish = resolve;
					}),
			)
			.mockResolvedValueOnce({
				items: [
					{
						kind: 'item',
						item: { id: 'loaded', state: 'active', body: { text: 'already loaded private body' } },
					},
				],
			}),
	});
	const workspace = new WorkbenchClient({ client: () => client }, { after: () => () => {} });
	const data = new DataClient(() => client, workspace);
	await data.initialize();
	expect(data.store.getState().memories).toHaveLength(1);
	const pending = data.initialize();
	await vi.waitFor(() => expect(client.memory.list).toHaveBeenCalledTimes(2));
	expect(handlers.size).toBe(1);
	Object.assign(client, { state: 'closed' });
	for (const handler of handlers) handler();
	finish({ items: [{ kind: 'item', item: { id: 'private', state: 'active', body: { text: 'old private body' } } }] });
	await pending;
	expect(data.store.getState().memories).toEqual([]);
	expect(data.store.getState().preview).toBeUndefined();
	expect(workspace.getSnapshot().permissionRevision).toBeGreaterThan(0);
	data.dispose();
	workspace.dispose();
	expect(handlers.size).toBe(0);
});
test('failed physical Profile cleanup clears every leaf and retains the original retry token and command', async () => {
	const { client, preview } = fixture();
	Object.assign(client.service, { status: vi.fn(async () => ({ state: 'ready' })) });
	let fail!: (error: unknown) => void;
	const remove = vi.fn(
		async (_command: BotMethodMap['profile.delete']['params']) =>
			new Promise<Receipt>((_resolve, reject) => {
				fail = reject;
			}),
	);
	Object.assign(client.profile, { delete: remove });
	Object.assign(client.sessions, {
		history: async () => ({
			items: [
				{
					id: 'private',
					sessionId: 'session',
					role: 'assistant',
					text: 'body read during cleanup',
					createdAt: '2026-10-28T00:00:00Z',
					sourceRefs: [],
				},
			],
		}),
	});
	const workspace = new WorkbenchClient({ client: () => client }, { after: () => () => {} });
	const data = new DataClient(() => client, workspace);
	await data.initialize();
	const pending = data.deleteProfile();
	await workspace.refreshHistory('session');
	expect(workspace.getSnapshot().threads.session?.messages).toHaveLength(1);
	Object.assign(client.service, { status: async () => ({ cleanup: { profile: true, sessionIds: [] } }) });
	fail(
		new BotRpcError(-32000, {
			kind: 'CONFLICT',
			reason: 'PROFILE_CLEANUP_FAILED',
			retryable: true,
			correlationId: 'test',
		}),
	);
	expect(await pending).toBe(false);
	expect(workspace.getSnapshot().threads.session?.messages).toEqual([]);
	expect(data.store.getState().preview?.token).toBe(preview.token);
	expect(data.store.getState().cleanup?.profile).toBe(true);
	remove.mockResolvedValueOnce({ commandId: 'saved', receiptId: 'cleaned', revision: '3' });
	expect(await data.deleteProfile()).toBe(true);
	expect(remove.mock.calls[1]?.[0]).toEqual(remove.mock.calls[0]?.[0]);
	data.dispose();
	workspace.dispose();
});
