import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import { agentMessages } from '../../i18n/agent';
import { AgentEditor } from './AgentEditor';
import type { Agent, BotClient } from '../../api';

const base: Agent = { id: 'agent:a', name: 'A', description: '', persona: '', enabled: true, isDefault: false, revision: '3', personaRevision: '1', modelBindingRevision: '1', model: { modelId: 'm', providerId: 'p', endpoint: 'https://example.test', credentialRef: 'cred:a', capabilities: [], protocol: 'openai-responses', revision: '1', credentialStatus: { mode: 'protected', state: 'available' } } };
function fakeClient() {
	const saved = { ...base, revision: '4', name: 'Saved' };
	const update = vi.fn(async () => saved);
	return { client: { hello: { profile: { profileId: 'profile:test', commandEpoch: '1' } }, models: { test: vi.fn(async () => ({ available: true, capabilities: ['chat'], credentialStatus: { mode: 'protected', state: 'available' } })) }, agents: { update, create: vi.fn(async () => saved), disable: vi.fn(async () => ({ ...saved, enabled: false })) } } as unknown as BotClient, update };
}
beforeEach(() => { registerMessages(agentMessages); setLanguage('en'); });

test('connection test is explicit and saving a changed revision keeps the durable command shape', async () => {
	const f = fakeClient();
	render(<TestProviders><AgentEditor client={f.client} agent={base} /></TestProviders>);
	fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'new-model' } });
	await waitFor(async () => { fireEvent.click(screen.getByRole('button', { name: 'Test connection' })); await waitFor(() => expect(f.client.models.test).toHaveBeenCalled()); });
	expect(f.update).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	await waitFor(() => expect(f.update).toHaveBeenCalled());
	expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'agent:a', expectedRevision: '3', profileId: 'profile:test', draft: expect.objectContaining({ name: 'A', model: expect.objectContaining({ modelId: 'new-model' }) }) }));
});

test('a conflict reports an error and leaves the draft in the form', async () => {
	const f = fakeClient();
	f.update.mockImplementation(async () => { throw new Error('CONFLICT'); });
	render(<TestProviders><AgentEditor client={f.client} agent={base} /></TestProviders>);
	fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'local draft' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed elsewhere'));
	expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('local draft');
});
