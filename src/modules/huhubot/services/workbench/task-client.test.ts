import { expect, test, vi } from 'vitest';
import type { BotClient, BotMethodMap, EffectView, Run } from '../../api';
import { emptyProjection } from '../../core/events/reducer';
import { TaskClient } from './task-client';
import { WorkbenchClient, EMPTY_THREAD } from './workbench-client';

const run: Run = {
	id: 'run',
	sessionId: 'session',
	agentId: 'agent',
	status: 'succeeded',
	revision: '1',
	personaRevision: '1',
	modelBindingRevision: '1',
	effectsUnresolved: true,
};
function fixture() {
	const effect = { id: 'written', runId: run.id, status: 'committed', revision: '1' } as EffectView;
	const client = {
		hello: { profile: { profileId: 'profile', commandEpoch: '1' } },
		state: 'ready',
		onClose: () => () => {},
		runs: { get: vi.fn(async () => run), recovery: vi.fn(async () => ({ state: 'none' })) },
		collaboration: { list: vi.fn(async () => ({ items: [] })) },
		effects: { get: vi.fn(async () => effect) },
	} as unknown as BotClient;
	return { client, effect };
}
test('finds a committed effect in the middle of a long run without skipping event pages', async () => {
	const { client, effect } = fixture();
	const subscribe = vi.fn(async (query: BotMethodMap['runs.subscribe']['params']) => {
		const after = Number(query.afterSeq ?? '0');
		const end = Math.min(after + (query.limit ?? 64), 500);
		return {
			runId: run.id,
			subscriptionId: 'events',
			headSeq: '500',
			nextSeq: String(end),
			hasMore: end < 500,
			events: Array.from({ length: end - after }, (_, i) => ({
				runId: run.id,
				seq: String(after + i + 1),
				createdAt: '2026-10-28T00:00:00Z',
				type: after + i + 1 === 100 ? 'effect.committed' : 'text.delta',
				...(after + i + 1 === 100 ? { effectId: effect.id } : { text: '.' }),
			})),
		};
	});
	Object.assign(client.runs, { subscribe });
	const tasks = new TaskClient(() => client);
	await tasks.load(run.id);
	expect(tasks.store.getState().effects).toEqual([effect]);
	expect(subscribe.mock.calls.map(([query]) => query.afterSeq ?? '0')).toEqual(['0', '128', '256', '384']);
	tasks.dispose();
});
test('refreshes children on delegation.completed and accepts late usage at the same terminal status', async () => {
	const { client } = fixture();
	const workspace = new WorkbenchClient({ client: () => client }, { after: () => () => {} });
	const tasks = new TaskClient(() => client, workspace);
	await tasks.load(run.id);
	const projection = {
		...emptyProjection(run.id),
		status: 'succeeded',
		metadataSeq: '2',
		seq: '2',
		lastEventType: 'usage.settled',
		usage: { knowledge: 'known', inputTokens: '5', outputTokens: '2', estimated: false } as Run['usage'],
	};
	workspace.store.setState({
		threads: { [run.sessionId]: { ...EMPTY_THREAD, projections: { [run.id]: projection } } },
	});
	expect(tasks.store.getState().run?.usage).toEqual(projection.usage);
	await vi.waitFor(() => expect(client.collaboration.list).toHaveBeenCalledTimes(2));
	workspace.store.setState({
		threads: {
			[run.sessionId]: {
				...EMPTY_THREAD,
				projections: {
					[run.id]: {
						...projection,
						metadataSeq: '3',
						seq: '3',
						lastEventType: 'text.delta',
						facts: [
							{
								runId: run.id,
								seq: '3',
								type: 'delegation.completed',
								createdAt: '2026-10-28T00:00:00Z',
							},
						],
					},
				},
			},
		},
	});
	await vi.waitFor(() => expect(client.collaboration.list).toHaveBeenCalledTimes(3));
	tasks.dispose();
	workspace.dispose();
});
test('a late effect reconciliation cannot restore a body after another leaf revokes access', async () => {
	const { client, effect } = fixture();
	const workspace = new WorkbenchClient({ client: () => client }, { after: () => () => {} });
	const tasks = new TaskClient(() => client, workspace);
	await tasks.load(run.id);
	tasks.store.setState({ effects: [effect] });
	let finish!: (value: EffectView) => void;
	Object.assign(client.effects, {
		reconcile: vi.fn(
			() =>
				new Promise<EffectView>((resolve) => {
					finish = resolve;
				}),
		),
	});
	const pending = tasks.reconcile(effect);
	workspace.permissionsChanged();
	finish(effect);
	await pending;
	expect(tasks.store.getState().effects).toEqual([]);
	tasks.dispose();
	workspace.dispose();
});
