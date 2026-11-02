import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import type { BotClient, Run } from '../../api';
import { messages as taskMessages } from '../../i18n';
import { TasksPage, type BotTaskHost } from './TasksPage';
import { WorkbenchClient } from '../../services/workbench/workbench-client';

const run: Run = {
	id: 'run-a',
	agentId: 'agent-a',
	personaRevision: '1',
	modelBindingRevision: '1',
	sessionId: 'session-a',
	status: 'running',
	revision: '3',
	effectsUnresolved: false,
};
function fixture() {
	const client = {
		hello: { profile: { profileId: 'profile-a', commandEpoch: '1' } },
		runs: {
			get: vi.fn(async () => run),
			recovery: vi.fn(async () => ({
				runId: run.id,
				rootRunId: run.id,
				revision: '3',
				state: 'none',
				generation: '1',
				affectedRunIds: [],
			})),
			cancel: vi.fn(async () => ({
				commandId: 'c',
				receiptId: 'r',
				revision: '4',
				runId: run.id,
				status: 'canceled',
			})),
		},
		collaboration: { list: vi.fn(async () => ({ items: [] })) },
	} as unknown as BotClient;
	return { client, host: { client: () => client, report: vi.fn() } as BotTaskHost };
}
beforeEach(() => {
	registerMessages(taskMessages);
	setLanguage('en');
});
test('shows durable run state and only updates after cancellation receipt', async () => {
	const f = fixture();
	render(
		<TestProviders>
			<TasksPage host={f.host} runId="run-a" />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('Running')).toBeTruthy());
	await screen.findByRole('button', { name: 'Cancel this run' }).then((button) => button.click());
	await waitFor(() => expect(f.client.runs.cancel).toHaveBeenCalledOnce());
	await waitFor(() => expect(screen.getByText('Canceled')).toBeTruthy());
	expect(f.client.runs.cancel).toHaveBeenCalledWith(expect.objectContaining({ id: 'run-a', expectedRevision: '3' }));
});

test('tasks can be found in a different conversation and its older history page', async () => {
	const f = fixture();
	const client = {
		...f.client,
		onClose: () => () => {},
		agents: { list: async () => ({ items: [] }) },
		sessions: {
			list: async () => ({
				items: ['first', 'second'].map((id) => ({
					id,
					title: id,
					kind: 'direct',
					memberIds: ['a'],
					revision: '1',
					archived: false,
				})),
			}),
			history: vi.fn(async (query: { sessionId: string; cursor?: string }) => ({
				items: [
					{
						id: query.cursor ? 'older' : 'recent',
						runId: query.cursor ? 'older-run' : `${query.sessionId}-run`,
						sessionId: query.sessionId,
						role: 'assistant',
						text: 'Result',
						createdAt: '2026-10-28T00:00:00Z',
						sourceRefs: [],
					},
				],
				...(query.cursor ? {} : { nextCursor: 'older-page' }),
			})),
		},
	} as unknown as BotClient;
	const workspace = new WorkbenchClient({ client: () => client }, { after: () => () => {} });
	render(
		<TestProviders>
			<TasksPage host={{ client: () => client, workspace }} />
		</TestProviders>,
	);
	await screen.findByRole('button', { name: /first-run/ });
	fireEvent.change(screen.getByLabelText('Conversations'), { target: { value: 'second' } });
	await screen.findByRole('button', { name: /second-run/ });
	fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
	await screen.findByRole('button', { name: /older-run/ });
	expect(client.sessions.history).toHaveBeenCalledWith(
		expect.objectContaining({ sessionId: 'second', cursor: 'older-page' }),
		expect.anything(),
	);
	workspace.dispose();
});
