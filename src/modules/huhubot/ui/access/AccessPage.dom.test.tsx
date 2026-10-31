import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import type { Agent, BotClient, Grant, BotMethodMap } from '../../api';
import { messages as accessMessages } from '../../i18n';
import { AccessPage, type BotAccessHost } from './AccessPage';
import { WorkbenchClient } from '../../services/workbench/workbench-client';
import { BotRpcError } from '../../core/protocol/connection';
const agent: Agent = {
	id: 'agent-a',
	name: 'Aster',
	description: '',
	persona: '',
	isDefault: true,
	revision: '2',
	personaRevision: '1',
	modelBindingRevision: '3',
	enabled: true,
	model: {
		modelId: 'm',
		providerId: 'p',
		endpoint: 'https://example.invalid',
		capabilities: [],
		protocol: 'openai-chat-completions',
		revision: '3',
		credentialStatus: { mode: 'none', state: 'unknown' },
	},
};
const grant: Grant = {
	id: 'grant-a',
	revision: '2',
	workspaceId: 'ws',
	scope: 'source',
	resourceId: 'note.md',
	recipientIds: ['agent-a'],
	recipients: [],
	operations: ['read'],
	state: 'active',
};
beforeEach(() => {
	registerMessages(accessMessages);
	setLanguage('en');
});
test('revokes a grant with its durable revision', async () => {
	const revoke = vi.fn(async () => ({ commandId: 'c', receiptId: 'r', revision: '3' }));
	const client = {
		hello: { profile: { profileId: 'profile-a', commandEpoch: '1' } },
		grants: { list: vi.fn(async () => ({ items: [grant] })), revoke },
		agents: { list: vi.fn(async () => ({ items: [agent] })) },
	} as unknown as BotClient;
	const host: BotAccessHost = { client: () => client };
	render(
		<TestProviders>
			<AccessPage host={host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('note.md')).toBeTruthy());
	screen.getByRole('button', { name: 'Revoke access' }).click();
	await waitFor(() => expect(revoke).toHaveBeenCalledOnce());
	expect(revoke).toHaveBeenCalledWith(expect.objectContaining({ id: 'grant-a', expectedRevision: '2' }));
	await waitFor(() => expect(screen.getByText('Revoked')).toBeTruthy());
});

test('the next grant page remains revocable and the next Bot page binds the actual model when granting', async () => {
	const laterGrant = { ...grant, id: 'grant-101', resourceId: 'later-note.md', revision: '7' };
	const laterAgent = {
		...agent,
		id: 'agent-101',
		name: 'Later Bot',
		modelBindingRevision: '9',
		model: { ...agent.model!, modelId: 'later-model', revision: '9' },
	};
	const revoke = vi.fn(async () => ({ commandId: 'c', receiptId: 'r', revision: '8' }));
	const create = vi.fn(async () => ({ ...grant, id: 'new', resourceId: 'new.md' }));
	const client = {
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		grants: {
			list: vi.fn(async (query: { cursor?: string }) =>
				query.cursor ? { items: [grant, laterGrant] } : { items: [grant], nextCursor: 'grants-page2' },
			),
			revoke,
			create,
		},
		agents: {
			list: vi.fn(async (query: { cursor?: string }) =>
				query.cursor ? { items: [agent, laterAgent] } : { items: [agent], nextCursor: 'agents-page2' },
			),
		},
	} as unknown as BotClient;
	render(
		<TestProviders>
			<AccessPage host={{ client: () => client }} />
		</TestProviders>,
	);
	await screen.findByText('note.md');
	fireEvent.click(screen.getByRole('button', { name: 'Load more permissions' }));
	const heading = await screen.findByText('later-note.md');
	fireEvent.click(within(heading.closest('article')!).getByRole('button', { name: 'Revoke access' }));
	await waitFor(() =>
		expect(revoke).toHaveBeenCalledWith(expect.objectContaining({ id: 'grant-101', expectedRevision: '7' })),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Load more Bots' }));
	await screen.findByRole('option', { name: 'Later Bot' });
	fireEvent.change(screen.getByLabelText('Workspace'), { target: { value: 'ws' } });
	fireEvent.change(screen.getByLabelText('Resource ID'), { target: { value: 'new.md' } });
	const recipient = screen.getByLabelText('Recipients') as HTMLSelectElement;
	for (const option of recipient.options) option.selected = option.value === 'agent-101';
	fireEvent.change(recipient);
	fireEvent.click(screen.getByRole('button', { name: 'Create grant' }));
	await waitFor(() =>
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				recipients: [
					expect.objectContaining({
						agentId: 'agent-101',
						modelBindingRevision: '9',
						modelId: 'later-model',
					}),
				],
			}),
		),
	);
	expect(screen.getAllByText('note.md')).toHaveLength(1);
});

test('a revoke with a lost commit reply clears body refills and retries the identical original command without claiming revocation', async () => {
	let fail!: (error: Error) => void;
	const revoke = vi.fn(async (_command: BotMethodMap['grants.revoke']['params']) => ({
		commandId: 'c',
		receiptId: 'r',
		revision: '3',
	}));
	revoke.mockImplementationOnce(
		() =>
			new Promise((_resolve, reject) => {
				fail = reject;
			}),
	);
	const client = {
		state: 'ready',
		onClose: () => () => {},
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		grants: { list: async () => ({ items: [grant] }), revoke },
		agents: { list: async () => ({ items: [agent] }) },
		sessions: {
			history: async () => ({
				items: [
					{
						id: 'refill',
						sessionId: 's',
						role: 'assistant',
						text: 'Body refilled while revoke pending',
						createdAt: '2026-10-28T00:00:00Z',
						sourceRefs: [],
					},
				],
			}),
		},
	} as unknown as BotClient;
	const workspace = new WorkbenchClient({ client: () => client }, { after: () => () => {} });
	render(
		<TestProviders>
			<AccessPage host={{ client: () => client, workspace }} />
		</TestProviders>,
	);
	await screen.findByText('note.md');
	fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }));
	await waitFor(() => expect(revoke).toHaveBeenCalledOnce());
	await workspace.refreshHistory('s');
	expect(workspace.getSnapshot().threads.s?.messages[0]?.text).toBe('Body refilled while revoke pending');
	fail(
		new BotRpcError(-32000, {
			kind: 'CONFLICT',
			reason: 'INTERNAL_ERROR',
			retryable: true,
			correlationId: 'test',
		}),
	);
	const retry = await screen.findByRole('button', { name: 'Retry original request' });
	expect(workspace.getSnapshot().threads.s?.messages).toEqual([]);
	expect(screen.queryByText('Revoked')).toBeNull();
	const original = revoke.mock.calls[0]?.[0];
	fireEvent.click(retry);
	await waitFor(() => expect(revoke).toHaveBeenCalledTimes(2));
	expect(revoke.mock.calls[1]?.[0]).toEqual(original);
	await screen.findByText('Revoked');
	workspace.dispose();
});
