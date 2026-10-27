import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import type { BotClient, Run } from '../../api';
import { taskMessages } from '../../i18n/tasks';
import { TasksPage, type BotTaskHost } from './TasksPage';

const run: Run = { id: 'run-a', agentId: 'agent-a', personaRevision: '1', modelBindingRevision: '1', sessionId: 'session-a', status: 'running', revision: '3', effectsUnresolved: false };
function fixture() {
  const client = { hello: { profile: { profileId: 'profile-a', commandEpoch: '1' } }, runs: { get: vi.fn(async () => run), recovery: vi.fn(async () => ({ runId: run.id, rootRunId: run.id, revision: '3', state: 'none', generation: '1', affectedRunIds: [] })), cancel: vi.fn(async () => ({ commandId: 'c', receiptId: 'r', revision: '4', runId: run.id, status: 'canceled' })) }, collaboration: { list: vi.fn(async () => ({ items: [] })) } } as unknown as BotClient;
  return { client, host: { client: () => client, report: vi.fn() } as BotTaskHost };
}
beforeEach(() => { registerMessages(taskMessages); setLanguage('en'); });
test('shows durable run state and only updates after cancellation receipt', async () => {
  const f = fixture(); render(<TestProviders><TasksPage host={f.host} runId="run-a" /></TestProviders>);
  await waitFor(() => expect(screen.getByText('running')).toBeTruthy());
  await screen.findByRole('button', { name: 'Cancel this run' }).then(button => button.click());
  await waitFor(() => expect(f.client.runs.cancel).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByText('canceled')).toBeTruthy());
  expect(f.client.runs.cancel).toHaveBeenCalledWith(expect.objectContaining({ id: 'run-a', expectedRevision: '3' }));
});
