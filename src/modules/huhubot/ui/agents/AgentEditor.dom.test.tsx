import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import { messages as agentMessages } from '../../i18n';
import { AgentEditor } from './AgentEditor';
import type { Agent, BotClient } from '../../api';
import { BotRpcError } from '../../core/protocol/connection';

const base: Agent = {
	id: 'agent:a',
	name: 'A',
	description: '',
	persona: '',
	enabled: true,
	isDefault: false,
	revision: '3',
	personaRevision: '1',
	modelBindingRevision: '1',
	model: {
		modelId: 'm',
		providerId: 'p',
		endpoint: 'https://example.test',
		credentialRef: 'cred:a',
		capabilities: [],
		protocol: 'openai-responses',
		revision: '1',
		credentialStatus: { mode: 'protected', state: 'available' },
	},
};
function fakeClient() {
	const saved = { ...base, revision: '4', name: 'Saved' };
	const update = vi.fn(async () => saved);
	return {
		client: {
			hello: { profile: { profileId: 'profile:test', commandEpoch: '1' } },
			models: {
				test: vi.fn(async () => ({
					available: true,
					capabilities: ['chat'],
					credentialStatus: { mode: 'protected', state: 'available' },
				})),
			},
			agents: {
				update,
				create: vi.fn(async () => saved),
				disable: vi.fn(async () => ({ ...saved, enabled: false })),
			},
		} as unknown as BotClient,
		update,
	};
}
beforeEach(() => {
	registerMessages(agentMessages);
	setLanguage('en');
});

test('connection test is explicit and saving a changed revision keeps the durable command shape', async () => {
	const f = fakeClient();
	render(
		<TestProviders>
			<AgentEditor client={f.client} agent={base} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'new-model' } });
	await waitFor(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
		await waitFor(() => expect(f.client.models.test).toHaveBeenCalled());
	});
	expect(f.update).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	await waitFor(() => expect(f.update).toHaveBeenCalled());
	expect(f.update).toHaveBeenCalledWith(
		expect.objectContaining({
			id: 'agent:a',
			expectedRevision: '3',
			profileId: 'profile:test',
			draft: expect.objectContaining({ name: 'A', model: expect.objectContaining({ modelId: 'new-model' }) }),
		}),
	);
});

test('a conflict reports an error and leaves the draft in the form', async () => {
	const f = fakeClient();
	f.update.mockImplementation(async () => {
		throw new BotRpcError(-32000, {
			kind: 'CONFLICT',
			reason: 'REVISION_CONFLICT',
			retryable: false,
			correlationId: 'test',
		});
	});
	render(
		<TestProviders>
			<AgentEditor client={f.client} agent={base} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'local draft' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed elsewhere'));
	expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('local draft');
});

test('changing the selected Bot never saves the previous Bot draft into the new identity', async () => {
	const f = fakeClient();
	const other = { ...base, id: 'agent:b', name: 'B', persona: 'B persona' };
	const view = render(
		<TestProviders>
			<AgentEditor client={f.client} agent={base} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'A draft' } });
	view.rerender(
		<TestProviders>
			<AgentEditor client={f.client} agent={other} />
		</TestProviders>,
	);
	expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('B');
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	await waitFor(() =>
		expect(f.update).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'agent:b',
				draft: expect.objectContaining({ name: 'B', persona: 'B persona' }),
			}),
		),
	);
});

test('creating a Bot after a lost reply retries the exact command and locks fields while awaiting receipt', async () => {
	const f = fakeClient();
	const create = vi.fn(async (_command: unknown) => base);
	create.mockRejectedValueOnce(Error('REQUEST_TIMEOUT'));
	Object.assign(f.client.agents, { create });
	render(
		<TestProviders>
			<AgentEditor client={f.client} />
		</TestProviders>,
	);
	for (const [label, value] of Object.entries({
		Name: 'New bot',
		Provider: 'p',
		Model: 'm',
		Endpoint: 'https://provider.invalid',
	}))
		fireEvent.change(screen.getByLabelText(label), { target: { value } });
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	const retry = await screen.findByRole('button', { name: 'Retry original request' });
	expect((screen.getByLabelText('Name') as HTMLInputElement).closest('fieldset')?.disabled).toBe(true);
	const original = create.mock.calls[0]?.[0];
	fireEvent.click(retry);
	await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
	expect(create.mock.calls[1]?.[0]).toEqual(original);
});

test('editing fields is disabled throughout a pending save', async () => {
	const f = fakeClient();
	let finish!: (agent: Agent) => void;
	f.update.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	render(
		<TestProviders>
			<AgentEditor client={f.client} agent={base} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'Prepared persona' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	expect((screen.getByLabelText('Persona') as HTMLTextAreaElement).closest('fieldset')?.disabled).toBe(true);
	finish({ ...base, persona: 'Prepared persona', revision: '4' });
	await waitFor(() =>
		expect((screen.getByLabelText('Persona') as HTMLTextAreaElement).closest('fieldset')?.disabled).toBe(false),
	);
});

test('an unused disabled Bot is deleted only after explicit preview confirmation and reports the removed identity', async () => {
	const f = fakeClient();
	const deleted = vi.fn();
	const deletePreview = vi.fn(async () => ({
		token: 'delete-token',
		revision: '3',
		expiresAt: '2026-10-29T00:00:00Z',
		categories: [
			{ kind: 'related-sessions', count: 1, retained: true, reason: 'HISTORY_RETAINED' },
			{ kind: 'active-runs', count: 0, retained: false },
			{ kind: 'group-memberships', count: 0, retained: false },
			{ kind: 'private-memory', count: 0, retained: false },
		],
	}));
	const remove = vi.fn(async () => ({ commandId: 'c', receiptId: 'r', revision: '4' }));
	Object.assign(f.client.agents, { deletePreview, delete: remove });
	render(
		<TestProviders>
			<AgentEditor client={f.client} agent={{ ...base, enabled: false }} onDeleted={deleted} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Review Bot deletion' }));
	await screen.findByRole('button', { name: 'Confirm Bot deletion' });
	expect(remove).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: 'Confirm Bot deletion' }));
	await waitFor(() =>
		expect(remove).toHaveBeenCalledWith(
			expect.objectContaining({ id: base.id, expectedRevision: '3', previewToken: 'delete-token' }),
		),
	);
	expect(deleted).toHaveBeenCalledWith(base.id);
});

test('deletion preview displays blockers and cannot confirm while the Bot still has private memory', async () => {
	const f = fakeClient();
	const remove = vi.fn();
	Object.assign(f.client.agents, {
		deletePreview: vi.fn(async () => ({
			token: 'blocked',
			revision: '3',
			expiresAt: '2026-10-29T00:00:00Z',
			categories: [{ kind: 'private-memory', count: 1, retained: true }],
		})),
		delete: remove,
	});
	render(
		<TestProviders>
			<AgentEditor client={f.client} agent={{ ...base, enabled: false }} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Review Bot deletion' }));
	const confirm = await screen.findByRole('button', { name: 'Confirm Bot deletion' });
	await screen.findByText(/Finish active tasks/);
	expect((confirm as HTMLButtonElement).disabled).toBe(true);
	fireEvent.click(confirm);
	expect(remove).not.toHaveBeenCalled();
});

test('a revision conflict keeps the draft until explicit discard-and-load, then saves from the actual fetched revision', async () => {
	const f = fakeClient(),
		fresh = { ...base, name: 'Server version', revision: '4' };
	const get = vi.fn(async () => fresh);
	Object.assign(f.client.agents, { get });
	f.update
		.mockRejectedValueOnce(
			new BotRpcError(-32000, {
				kind: 'CONFLICT',
				reason: 'REVISION_CONFLICT',
				retryable: false,
				correlationId: 'test',
			}),
		)
		.mockResolvedValueOnce({ ...fresh, revision: '5' });
	const view = render(
		<TestProviders>
			<AgentEditor client={f.client} agent={base} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Kept local draft' } });
	view.rerender(
		<TestProviders>
			<AgentEditor client={f.client} agent={fresh} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	await screen.findByText(/changed elsewhere/);
	expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: '3' }));
	expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Kept local draft');
	fireEvent.click(screen.getByRole('button', { name: 'Discard edits and load saved version' }));
	fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
	expect(get).not.toHaveBeenCalled();
	expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Kept local draft');
	fireEvent.click(screen.getByRole('button', { name: 'Discard edits and load saved version' }));
	fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
	await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Server version'));
	expect(get).toHaveBeenCalledWith(
		{ profileId: 'profile:test', id: base.id },
		expect.objectContaining({ signal: expect.any(AbortSignal) }),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	await waitFor(() =>
		expect(f.update).toHaveBeenLastCalledWith(
			expect.objectContaining({
				expectedRevision: '4',
				draft: expect.objectContaining({ name: 'Server version' }),
			}),
		),
	);
});
