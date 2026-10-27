import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import { agentMessages } from '../../i18n/agent';
import { GroupEditor } from './GroupEditor';
import type { Agent, BotClient } from '../../api';
const agents: Agent[] = [
	{ id: 'a', name: 'Alpha', description: '', persona: '', enabled: true, isDefault: false, revision: '1', personaRevision: '1', modelBindingRevision: '1' },
	{ id: 'b', name: 'Beta', description: '', persona: '', enabled: true, isDefault: false, revision: '1', personaRevision: '1', modelBindingRevision: '1' },
];
function fakeClient() { const create = vi.fn(async (input: { title: string; memberIds: string[]; coordinatorId?: string }) => ({ id: 'group:1', revision: '2', kind: 'group' as const, title: input.title, memberIds: input.memberIds, coordinatorId: input.coordinatorId, archived: false })); return { client: { hello: { profile: { profileId: 'profile:test', commandEpoch: '1' } }, sessions: { create } } as unknown as BotClient, create }; }
beforeEach(() => { registerMessages(agentMessages); setLanguage('en'); });
test('group form sends selected members, coordinator and explicit history scope', async () => {
	const f = fakeClient();
	render(<TestProviders><GroupEditor client={f.client} agents={agents} /></TestProviders>);
	fireEvent.change(screen.getByRole('textbox', { name: 'Group name' }), { target: { value: 'Review' } });
	fireEvent.click(screen.getByLabelText('Alpha'));
	fireEvent.click(screen.getByLabelText('Beta'));
	fireEvent.click(screen.getByRole('radio', { name: 'Bounded range' }));
	fireEvent.change(screen.getByLabelText('After sequence'), { target: { value: '2x' } });
	fireEvent.change(screen.getByLabelText('Through sequence'), { target: { value: '8' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	await waitFor(() => expect(f.create).toHaveBeenCalled());
	expect(f.create.mock.calls[0]![0]).toMatchObject({ kind: 'group', memberIds: ['a', 'b'], coordinatorId: 'a' });
});
