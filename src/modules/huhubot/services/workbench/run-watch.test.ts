import { expect, test, vi } from 'vitest';
import type { BotClient, BotMethodMap, Run, RunUsage } from '../../api';
import { WorkbenchClient } from './workbench-client';

test('keeps terminal subscriptions for late settlement and refreshes on the actual delegation event', async () => {
	const callbacks: Array<{ run(): void; active: boolean }> = [];
	const settled: RunUsage = { knowledge: 'known', inputTokens: '5', outputTokens: '2', estimated: false };
	const run: Run = {
		id: 'run',
		sessionId: 'session',
		agentId: 'agent',
		status: 'succeeded',
		revision: '1',
		personaRevision: '1',
		modelBindingRevision: '1',
		usage: { knowledge: 'unknown', estimated: false },
	};
	const subscribe = vi.fn(async (query: BotMethodMap['runs.subscribe']['params']) => {
		const seq = Number(query.afterSeq ?? '0') + 1;
		return {
			runId: run.id,
			subscriptionId: 'events',
			headSeq: String(seq),
			nextSeq: String(seq),
			hasMore: false,
			events: [
				{
					runId: run.id,
					seq: String(seq),
					createdAt: '2026-10-28T00:00:00Z',
					type: seq === 1 ? 'succeeded' : seq === 2 ? 'usage.settled' : 'delegation.completed',
					...(seq === 2 ? { usage: settled } : {}),
				},
			],
		};
	});
	const history = vi.fn(async () => ({ items: [] }));
	const client = {
		hello: { profile: { profileId: 'profile' } },
		state: 'ready',
		onClose: () => () => {},
		agents: { list: async () => ({ items: [] }) },
		sessions: { list: async () => ({ items: [] }), history },
		runs: { get: async () => run, subscribe },
	} as unknown as BotClient;
	const workspace = new WorkbenchClient(
		{ client: () => client },
		{
			after: (_ms, callback) => {
				const item = { run: callback, active: true };
				callbacks.push(item);
				return () => {
					item.active = false;
				};
			},
		},
	);
	await workspace.refreshDirectory();
	await workspace.observeRun(run.sessionId, run.id);
	const poll = async (count: number) => {
		const next = callbacks.find((item) => item.active);
		expect(next).toBeDefined();
		next!.active = false;
		next!.run();
		await vi.waitFor(() => expect(subscribe).toHaveBeenCalledTimes(count));
		await vi.waitFor(() => expect(callbacks.some((item) => item.active)).toBe(true));
	};
	await poll(1);
	await poll(2);
	expect(workspace.getSnapshot().threads.session?.projections.run?.usage).toEqual(settled);
	expect(workspace.getSnapshot().threads.session?.projections.run?.status).toBe('succeeded');
	const oldReads = history.mock.calls.length;
	await poll(3);
	await vi.waitFor(() => expect(history.mock.calls.length).toBeGreaterThan(oldReads));
	workspace.dispose();
	expect(callbacks.some((item) => item.active)).toBe(false);
});
