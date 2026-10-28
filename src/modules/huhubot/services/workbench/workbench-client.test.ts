import { expect, test, vi } from 'vitest';
import type { Agent, BotClient, BotMethodMap, Session, SourceSnapshot, VisibleMessage } from '../../api';
import { WorkbenchClient } from './workbench-client';
import { BotRpcError } from '../../core/protocol/connection';
const agents: Agent[] = ['a', 'b'].map((id) => ({
	id,
	name: id.toUpperCase(),
	description: '',
	persona: '',
	enabled: true,
	isDefault: false,
	revision: '1',
	personaRevision: '1',
	modelBindingRevision: '1',
}));
const group: Session = {
	id: 'group',
	kind: 'group',
	revision: '1',
	title: 'Team',
	memberIds: ['a', 'b'],
	coordinatorId: 'a',
	archived: false,
};
const profile = { profileId: 'p', commandEpoch: '1', revision: '1', createdAt: '2026-10-28T00:00:00Z' };
function fixture() {
	const start = vi.fn(async (_command: BotMethodMap['runs.start']['params']) => ({
		runId: 'r',
		revision: '1',
		status: 'accepted',
		commandId: 'c',
		receiptId: 'receipt',
	}));
	const client = {
		hello: { profile, capabilities: [] },
		state: 'ready',
		onClose: () => () => {},
		agents: { list: vi.fn(async () => ({ items: agents })) },
		sessions: {
			get: vi.fn(async () => group),
			list: vi.fn(async () => ({ items: [group] })),
			history: vi.fn(async () => ({ items: [] })),
		},
		runs: { start },
	} as unknown as BotClient;
	const workspace = new WorkbenchClient({ client: () => client }, { after: () => () => {} });
	return { client, workspace, start };
}
test('group sends default to the coordinator and retries the same accepted intent after a lost response', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	f.workspace.setDraft('group', { text: 'hello', mentions: [] });
	f.start.mockRejectedValueOnce(new Error('REQUEST_TIMEOUT'));
	await expect(f.workspace.send('group')).rejects.toThrow('REQUEST_TIMEOUT');
	const original = f.start.mock.calls[0]![0] as unknown as { targetAgentIds: string[]; idempotencyKey: string };
	expect(original.targetAgentIds).toEqual([]);
	expect(f.workspace.getSnapshot().threads.group?.draft.text).toBe('hello');
	await f.workspace.retrySend('group');
	expect(f.start.mock.calls[1]![0]).toEqual(original);
	expect(f.workspace.getSnapshot().threads.group?.draft.text).toBe('');
	expect(f.workspace.getSnapshot().threads.group?.runIds).toContain('r');
	f.workspace.dispose();
});
test('a committed start followed by an internal RPC error stays uncertain and retries its exact command', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	f.workspace.setText(group.id, 'accepted intent');
	f.start.mockRejectedValueOnce(
		new BotRpcError(-32603, {
			kind: 'CONFLICT',
			reason: 'INTERNAL_ERROR',
			retryable: false,
			correlationId: 'test',
		}),
	);
	await expect(f.workspace.send(group.id)).rejects.toThrow();
	expect(f.workspace.getSnapshot().threads.group?.uncertain).toBe(true);
	await f.workspace.retrySend(group.id);
	expect(f.start.mock.calls[1]?.[0]).toEqual(f.start.mock.calls[0]?.[0]);
	f.workspace.dispose();
});

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
test('late history responses remain in their original conversation and superseded reads cannot overwrite a newer page', async () => {
	const f = fixture();
	const old = deferred<{ items: VisibleMessage[] }>(),
		current = deferred<{ items: VisibleMessage[] }>();
	(f.client.sessions.history as ReturnType<typeof vi.fn>)
		.mockReturnValueOnce(old.promise)
		.mockReturnValueOnce(current.promise);
	const first = f.workspace.refreshHistory('first');
	const newer = f.workspace.refreshHistory('first');
	current.resolve({
		items: [
			{
				id: 'current',
				sessionId: 'first',
				role: 'assistant',
				text: 'current page',
				createdAt: '2026-10-28T00:00:00Z',
				sourceRefs: [],
			},
		],
	});
	await newer;
	old.resolve({
		items: [
			{
				id: 'old',
				sessionId: 'first',
				role: 'assistant',
				text: 'old page',
				createdAt: '2026-10-28T00:00:00Z',
				sourceRefs: [],
			},
		],
	});
	await first;
	expect(f.workspace.getSnapshot().threads.first?.messages.map((message) => message.text)).toEqual(['current page']);
	expect(f.workspace.getSnapshot().threads.first?.historyLoaded).toBe(true);
	expect(f.workspace.getSnapshot().threads.first?.historyLoading).toBe(false);
	f.workspace.setText('first', 'first draft');
	f.workspace.setText('second', 'second draft');
	expect(f.workspace.getSnapshot().threads.first?.draft.text).toBe('first draft');
	expect(f.workspace.getSnapshot().threads.second?.draft.text).toBe('second draft');
	f.workspace.dispose();
});
test('an explicit mention routes only its stable identity and a changed token blocks admission', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	f.workspace.setDraft('group', { text: '@B review', mentions: [{ agentId: 'b', label: 'B', start: 0, end: 2 }] });
	await f.workspace.send('group');
	expect(f.start.mock.calls[0]![0]).toMatchObject({ targetAgentIds: ['b'] });
	f.workspace.setDraft('group', {
		text: '@wrong review',
		mentions: [{ agentId: 'b', label: 'B', start: 0, end: 2 }],
	});
	await expect(f.workspace.send('group')).rejects.toThrow('MENTION_TOKEN_INVALID');
	expect(f.start).toHaveBeenCalledOnce();
	f.workspace.dispose();
});
test.each(['accept', 'refresh'])(
	'group membership changes from %s clear cached bodies and abort pending history',
	async (mode) => {
		const f = fixture();
		await f.workspace.refreshDirectory();
		const before = f.workspace.getSnapshot().permissionRevision;
		const history = deferred<{ items: VisibleMessage[] }>();
		(f.client.sessions.history as ReturnType<typeof vi.fn>).mockReturnValueOnce(history.promise);
		const loading = f.workspace.refreshHistory(group.id);
		const changed = { ...group, revision: '2', memberIds: ['a'] };
		if (mode === 'accept') f.workspace.acceptSession(changed);
		else {
			(f.client.sessions.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items: [changed] });
			await f.workspace.refreshDirectory();
		}
		history.resolve({
			items: [
				{
					id: 'private',
					sessionId: group.id,
					role: 'assistant',
					text: 'removed member body',
					createdAt: '2026-10-28T00:00:00Z',
					sourceRefs: [],
				},
			],
		});
		await loading;
		expect(f.workspace.getSnapshot().permissionRevision).toBeGreaterThan(before);
		expect(f.workspace.getSnapshot().threads.group?.messages).toEqual([]);
		expect(f.workspace.getSnapshot().threads.group?.historyLoaded).toBe(false);
		f.workspace.dispose();
	},
);
test('a deletion that erases SQL but fails cleanup still invalidates bodies reloaded while pending', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	let fail!: (error: unknown) => void;
	Object.assign(f.client.sessions, {
		delete: vi.fn(
			() =>
				new Promise((_resolve, reject) => {
					fail = reject;
				}),
		),
	});
	Object.assign(f.client, { service: { status: async () => ({}) } });
	const deleting = f.workspace.deleteSession(group.id, {
		token: 'cleanup',
		revision: '1',
		expiresAt: '2026-10-28T20:00:00Z',
		categories: [],
	});
	const failed = expect(deleting).rejects.toThrow('SESSION_CLEANUP_FAILED');
	(f.client.sessions.history as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		items: [
			{
				id: 'old',
				sessionId: group.id,
				role: 'assistant',
				text: 'old body read while pending',
				sourceRefs: [],
				createdAt: '2026-10-28T00:00:00Z',
			},
		],
	});
	await f.workspace.refreshHistory(group.id);
	expect(f.workspace.getSnapshot().threads.group?.messages).toHaveLength(1);
	fail(new Error('SESSION_CLEANUP_FAILED'));
	await failed;
	expect(f.workspace.getSnapshot().threads.group?.messages).toEqual([]);
	expect(f.workspace.getSnapshot().sessions).toContainEqual(group);
	f.workspace.dispose();
});
test('another click cannot race past session refresh and create a second intent', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	f.workspace.setText('group', 'hello');
	const pending = deferred<Session>();
	(f.client.sessions.get as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending.promise);
	const first = f.workspace.send('group');
	await expect(f.workspace.send('group')).rejects.toThrow('SESSION_BUSY');
	pending.resolve(group);
	await first;
	expect(f.start).toHaveBeenCalledOnce();
	f.workspace.dispose();
});

test('choosing a Bot after a lost direct-session creation reply retrieves the original receipt instead of creating again', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	const create = vi.fn(async (_command: BotMethodMap['sessions.create']['params']) => ({
		...group,
		id: 'direct',
		kind: 'direct' as const,
		memberIds: ['a'],
	}));
	create.mockRejectedValueOnce(Error('REQUEST_TIMEOUT'));
	Object.assign(f.client.sessions, { create });
	await expect(f.workspace.chooseAgent(agents[0]!)).rejects.toThrow('REQUEST_TIMEOUT');
	const original = create.mock.calls[0]?.[0];
	await f.workspace.chooseAgent(agents[0]!);
	expect(create.mock.calls[1]?.[0]).toEqual(original);
	expect(create).toHaveBeenCalledTimes(2);
	f.workspace.dispose();
});

const source: SourceSnapshot = {
	kind: 'note',
	workspaceId: 'vault',
	resourceId: 'Notes/Source.md',
	revision: '1',
	hash: 'sha256:source',
	scopeResourceIds: [],
	hostLeaseId: 'lease',
	originClientId: 'client',
	originViewId: 'view',
	hostConnectionId: 'host',
	hostLeaseEpoch: '1',
};
test('an accepted old intent never clears text or an attachment edited while the session read is pending', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	f.workspace.setText('group', 'Original intent');
	const pending = deferred<Session>();
	(f.client.sessions.get as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending.promise);
	const send = f.workspace.send('group');
	f.workspace.setText('group', 'New intent');
	f.workspace.attach('group', source);
	pending.resolve(group);
	await send;
	expect(f.start).toHaveBeenCalledWith(expect.objectContaining({ intent: 'Original intent', sourceRefs: [] }));
	expect(f.workspace.getSnapshot().threads.group?.draft.text).toBe('New intent');
	expect(f.workspace.getSnapshot().threads.group?.sources).toEqual([source]);
	f.workspace.dispose();
});
test('group attachment grants match the Go admission requirement and preserve edits made while granting', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	f.workspace.store.setState({
		agents: agents.map((agent): Agent => ({
			...agent,
			model: {
				modelId: agent.id,
				providerId: 'p',
				endpoint: 'https://provider.invalid',
				protocol: 'openai-responses',
				capabilities: [],
				revision: '1',
				credentialStatus: { mode: 'session-memory', state: 'available' },
			},
		})),
	});
	f.workspace.setDraft('group', {
		text: '@B source review',
		mentions: [{ agentId: 'b', label: 'B', start: 0, end: 2 }],
	});
	f.workspace.attach('group', source);
	const grant = deferred<{ id: string }>();
	const create = vi.fn(async (_command: BotMethodMap['grants.create']['params']) => grant.promise);
	Object.assign(f.client, { grants: { create } });
	const send = f.workspace.send('group');
	await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
	f.workspace.setText('group', 'New draft while granting');
	f.workspace.removeAttachment('group', source.resourceId);
	grant.resolve({ id: 'grant' });
	await send;
	expect(create).toHaveBeenCalledWith(
		expect.objectContaining({
			operations: ['read', 'send', 'deliver'],
			recipients: [expect.objectContaining({ agentId: 'b' })],
		}),
	);
	expect(f.start).toHaveBeenCalledWith(
		expect.objectContaining({ targetAgentIds: ['b'], sourceRefs: [source], grantIds: ['grant'] }),
	);
	expect(f.workspace.getSnapshot().threads.group?.draft.text).toBe('New draft while granting');
	expect(f.workspace.getSnapshot().threads.group?.sources).toEqual([]);
	f.workspace.dispose();
});
test('a durable start receipt stays accepted when later history refresh fails', async () => {
	const f = fixture();
	await f.workspace.refreshDirectory();
	f.workspace.setText('group', 'hello');
	(f.client.sessions.history as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('offline'));
	const receipt = await f.workspace.send('group');
	expect(receipt.runId).toBe('r');
	expect(f.workspace.getSnapshot().threads.group?.uncertain).toBe(false);
	expect(f.workspace.getSnapshot().threads.group?.draft.text).toBe('');
	f.workspace.dispose();
});
test('an accepted conversation receives later streamed text through the shared event projection', async () => {
	const f = fixture();
	const callbacks: Array<{ run: () => void; active: boolean }> = [];
	const workspace = new WorkbenchClient(
		{ client: () => f.client },
		{
			after: (_ms, run) => {
				const callback = { run, active: true };
				callbacks.push(callback);
				return () => {
					callback.active = false;
				};
			},
		},
	);
	(f.client.runs as unknown as Record<string, unknown>).get = vi.fn(async () => ({
		id: 'r',
		agentId: 'a',
		personaRevision: '1',
		modelBindingRevision: '1',
		sessionId: 'group',
		revision: '1',
		status: 'running',
	}));
	(f.client.runs as unknown as Record<string, unknown>).subscribe = vi.fn(async () => ({
		runId: 'r',
		subscriptionId: 'stream',
		headSeq: '1',
		nextSeq: '1',
		hasMore: false,
		events: [{ runId: 'r', seq: '1', type: 'text.delta', createdAt: '2026-10-28T00:00:00Z', text: 'model answer' }],
	}));
	await workspace.refreshDirectory();
	workspace.setText('group', 'hello');
	await workspace.send('group');
	await vi.waitFor(() => expect(callbacks.some((callback) => callback.active)).toBe(true));
	callbacks.find((callback) => callback.active)!.run();
	await vi.waitFor(() =>
		expect(workspace.getSnapshot().threads.group?.projections.r?.pendingText).toBe('model answer'),
	);
	workspace.dispose();
	f.workspace.dispose();
});
