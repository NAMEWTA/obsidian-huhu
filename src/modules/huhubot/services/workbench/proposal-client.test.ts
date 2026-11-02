import { expect, test, vi } from 'vitest';
import type { Agent, AgentProposal, BotClient, BotMethodMap } from '../../api';
import { ProposalClient } from './proposal-client';
import type { WorkbenchClient } from './workbench-client';

const proposal: AgentProposal = {
	proposalId: 'proposal:a',
	revision: '3',
	previewHash: 'sha256:expected',
	draft: { name: 'Researcher', description: 'Read sources', persona: 'Use cited sources.' },
};
function fixture() {
	const bot = {
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		collaboration: {
			proposals: vi.fn(async () => ({ items: [proposal] })),
			confirmProposal: vi.fn(
				async (_command: BotMethodMap['collaboration.confirmProposal']['params']) =>
					({ ...proposal.draft, id: 'a', revision: '1' }) as Agent,
			),
			rejectProposal: vi.fn(async () => ({ receiptId: 'r', commandId: 'c', revision: '4' })),
		},
	};
	return { bot, client: new ProposalClient(() => bot as unknown as BotClient) };
}
test('proposal discovery is read-only and a lost confirmation reply retries the exact original command', async () => {
	const { bot, client } = fixture();
	await client.load('run:a');
	expect(bot.collaboration.proposals).toHaveBeenCalledWith(
		{ profileId: 'p', runId: 'run:a', limit: 50 },
		expect.objectContaining({ signal: expect.any(AbortSignal) }),
	);
	expect(bot.collaboration.confirmProposal).not.toHaveBeenCalled();
	bot.collaboration.confirmProposal.mockRejectedValueOnce(Error('reply lost'));
	await client.confirm(proposal);
	expect(client.store.getState().items).toEqual([proposal]);
	const original = bot.collaboration.confirmProposal.mock.calls[0]?.[0];
	await client.confirm(proposal);
	expect(bot.collaboration.confirmProposal.mock.calls[1]?.[0]).toEqual(original);
	expect(original).toMatchObject({
		proposalId: proposal.proposalId,
		expectedRevision: '3',
		previewHash: proposal.previewHash,
	});
	expect(client.store.getState().items).toEqual([]);
});
test('reject uses the observed preview and does not create an Agent', async () => {
	const { bot, client } = fixture();
	await client.load();
	await client.reject(proposal);
	expect(bot.collaboration.rejectProposal).toHaveBeenCalledWith(
		expect.objectContaining({
			proposalId: proposal.proposalId,
			expectedRevision: '3',
			previewHash: proposal.previewHash,
		}),
	);
	expect(bot.collaboration.confirmProposal).not.toHaveBeenCalled();
	expect(client.store.getState().items).toEqual([]);
});

test('an invalidated confirmation cannot insert an old connection result into the shared directory', async () => {
	const { bot } = fixture(),
		acceptAgent = vi.fn();
	let finish!: (agent: Agent) => void;
	const client = new ProposalClient(() => bot as unknown as BotClient, { acceptAgent } as unknown as WorkbenchClient);
	bot.collaboration.confirmProposal.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	await client.load();
	const pending = client.confirm(proposal);
	client.clear();
	finish({ ...proposal.draft, id: 'late', revision: '1' } as Agent);
	expect(await pending).toBeUndefined();
	expect(client.store.getState().items).toEqual([]);
	expect(acceptAgent).not.toHaveBeenCalled();
});
