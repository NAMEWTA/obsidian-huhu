import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import { messages } from '../../i18n';
import type { BotClient } from '../../api';
import { AgentProposals } from './AgentProposals';
import { EMPTY_THREAD, WorkbenchClient } from '../../services/workbench/workbench-client';
import { emptyProjection } from '../../core/events/reducer';

beforeEach(() => {
	registerMessages(messages);
	setLanguage('en');
});

test('a proposal created after run start appears when the shared event cursor advances', async () => {
	const proposal = {
		proposalId: 'late',
		revision: '1',
		previewHash: 'hash',
		draft: { name: 'Late proposal', description: '', persona: 'Preview only' },
	};
	const list = vi.fn(async () => ({ items: [] as (typeof proposal)[] }));
	const bot = {
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		onClose: () => () => {},
		collaboration: { proposals: list },
	} as unknown as BotClient;
	const workspace = new WorkbenchClient({ client: () => bot }, { after: () => () => {} });
	workspace.store.setState({
		threads: { session: { ...EMPTY_THREAD, projections: { run: { ...emptyProjection('run'), seq: '1' } } } },
	});
	render(
		<TestProviders>
			<AgentProposals client={bot} workspace={workspace} runId="run" />
		</TestProviders>,
	);
	await screen.findByText('No pending Bot proposals.');
	list.mockResolvedValue({ items: [proposal] });
	act(() =>
		workspace.store.setState({
			threads: { session: { ...EMPTY_THREAD, projections: { run: { ...emptyProjection('run'), seq: '2' } } } },
		}),
	);
	await screen.findByText('Late proposal');
	workspace.dispose();
});
test('a durable Bot proposal remains a preview until the user explicitly confirms its observed hash', async () => {
	const proposal = {
		proposalId: 'proposal:a',
		revision: '4',
		previewHash: 'sha256:observed',
		draft: {
			name: 'Source reviewer',
			description: 'Check authorized sources',
			persona: 'Cite evidence and keep uncertainty visible.',
			allowedTools: ['note.read'],
			allowedCollaborationTargets: ['a'],
			model: {
				modelId: 'm',
				providerId: 'p',
				endpoint: 'https://provider.example/v1',
				protocol: 'openai-responses',
				capabilities: [],
			},
		},
	};
	const bot = {
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		onClose: () => () => {},
		collaboration: {
			proposals: vi.fn(async () => ({ items: [proposal] })),
			confirmProposal: vi.fn(async () => ({ ...proposal.draft, id: 'b', revision: '1' })),
			rejectProposal: vi.fn(),
		},
	};
	render(
		<TestProviders>
			<AgentProposals client={bot as unknown as BotClient} runId="run:a" />
		</TestProviders>,
	);
	await screen.findByText(proposal.draft.persona);
	expect(bot.collaboration.confirmProposal).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: 'Confirm and create Bot' }));
	await waitFor(() =>
		expect(bot.collaboration.confirmProposal).toHaveBeenCalledWith(
			expect.objectContaining({
				proposalId: proposal.proposalId,
				expectedRevision: '4',
				previewHash: proposal.previewHash,
			}),
		),
	);
	await screen.findByText('No pending Bot proposals.');
});
