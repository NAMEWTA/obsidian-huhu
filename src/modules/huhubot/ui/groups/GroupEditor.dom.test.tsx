import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import { messages as agentMessages } from '../../i18n';
import { GroupEditor } from './GroupEditor';
import { BotRpcError } from '../../core/protocol/connection';
import { WorkbenchClient, EMPTY_THREAD } from '../../services/workbench/workbench-client';
import type { Agent, BotClient, Session, GroupHistoryScope } from '../../api';
const agents: Agent[] = [
	{
		id: 'a',
		name: 'Alpha',
		description: '',
		persona: '',
		enabled: true,
		isDefault: false,
		revision: '1',
		personaRevision: '1',
		modelBindingRevision: '1',
	},
	{
		id: 'b',
		name: 'Beta',
		description: '',
		persona: '',
		enabled: true,
		isDefault: false,
		revision: '1',
		personaRevision: '1',
		modelBindingRevision: '1',
	},
];
function fakeClient() {
	let durable: Session = {
		id: 'group:1',
		revision: '2',
		kind: 'group',
		title: 'Review',
		memberIds: ['a', 'b'],
		coordinatorId: 'a',
		archived: false,
	};
	const updateMembers = vi.fn(async (input: { memberIds: string[]; historyScope: GroupHistoryScope }) => {
		durable = {
			...durable,
			revision: String(Number(durable.revision) + 1),
			memberIds: input.memberIds,
			groupMembers: input.memberIds.map((agentId) => ({
				agentId,
				incarnation: '1',
				historyRevision: '1',
				historyScope: input.historyScope,
			})),
		};
		return durable;
	});
	const setCoordinator = vi.fn(async (input: { coordinatorId: string }) => {
		durable = { ...durable, revision: String(Number(durable.revision) + 1), coordinatorId: input.coordinatorId };
		return durable;
	});
	const create = vi.fn(async (input: { title: string; memberIds: string[]; coordinatorId?: string }) => ({
		id: 'group:1',
		revision: '2',
		kind: 'group' as const,
		title: input.title,
		memberIds: input.memberIds,
		coordinatorId: input.coordinatorId,
		archived: false,
	}));
	return {
		client: {
			hello: { profile: { profileId: 'profile:test', commandEpoch: '1' } },
			sessions: { create, updateMembers, setCoordinator },
		} as unknown as BotClient,
		create,
		updateMembers,
		setCoordinator,
	};
}
beforeEach(() => {
	registerMessages(agentMessages);
	setLanguage('en');
});
test('group form sends selected members, coordinator and explicit history scope', async () => {
	const f = fakeClient();
	render(
		<TestProviders>
			<GroupEditor client={f.client} agents={agents} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByRole('textbox', { name: 'Group name' }), { target: { value: 'Review' } });
	fireEvent.click(screen.getByLabelText('Alpha'));
	fireEvent.click(screen.getByLabelText('Beta'));
	fireEvent.click(screen.getByRole('radio', { name: 'Bounded range' }));
	fireEvent.change(screen.getByLabelText('After sequence'), { target: { value: '2x' } });
	fireEvent.change(screen.getByLabelText('Through sequence'), { target: { value: '8' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	await waitFor(() => expect(f.create).toHaveBeenCalled());
	expect(f.create.mock.calls[0]![0]).toMatchObject({ kind: 'group', memberIds: ['a', 'b'], coordinatorId: 'a' });
	await waitFor(() =>
		expect(f.updateMembers).toHaveBeenCalledWith(
			expect.objectContaining({ historyScope: { kind: 'range', afterSeq: '2', throughSeq: '8' } }),
		),
	);
});

test('saving a changed coordinator applies the dedicated command before the following membership revision', async () => {
	const f = fakeClient();
	const session: Session = {
		id: 'group:1',
		revision: '2',
		kind: 'group',
		title: 'Review',
		memberIds: ['a', 'b'],
		coordinatorId: 'a',
		archived: false,
	};
	render(
		<TestProviders>
			<GroupEditor client={f.client} agents={agents} session={session} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByRole('combobox', { name: 'Coordinator' }), { target: { value: 'b' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	await waitFor(() =>
		expect(f.setCoordinator).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'group:1', expectedRevision: '2', coordinatorId: 'b' }),
		),
	);
	await waitFor(() =>
		expect(f.updateMembers).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'group:1', expectedRevision: '3', memberIds: ['a', 'b'] }),
		),
	);
});

test('a lost group creation reply is retried with the exact original command', async () => {
	const f = fakeClient();
	f.create.mockRejectedValueOnce(Error('REQUEST_TIMEOUT'));
	render(
		<TestProviders>
			<GroupEditor client={f.client} agents={agents} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByRole('textbox', { name: 'Group name' }), { target: { value: 'Review' } });
	fireEvent.click(screen.getByLabelText('Alpha'));
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	const retry = await screen.findByRole('button', { name: 'Retry original request' });
	expect(
		(screen.getByRole('textbox', { name: 'Group name' }) as HTMLInputElement).closest('fieldset')?.disabled,
	).toBe(true);
	const original = f.create.mock.calls[0]?.[0];
	fireEvent.click(retry);
	await waitFor(() => expect(f.create).toHaveBeenCalledTimes(2));
	expect(f.create.mock.calls[1]?.[0]).toEqual(original);
	await waitFor(() => expect(f.updateMembers).toHaveBeenCalledOnce());
});

test('a committed interim removal clears another leaf cache even when changing the coordinator then fails', async () => {
	const f = fakeClient();
	const roster = ['a', 'b', 'c', 'd'].map((id) => ({ ...agents[0]!, id, name: id.toUpperCase() }));
	const old: Session = {
		id: 'g',
		revision: '2',
		kind: 'group',
		title: 'Partial update',
		memberIds: ['a', 'd'],
		coordinatorId: 'a',
		archived: false,
	};
	const interim: Session = { ...old, revision: '3', memberIds: ['b', 'c', 'a'] };
	f.updateMembers.mockResolvedValue(interim);
	f.setCoordinator.mockRejectedValue(
		new BotRpcError(-32000, { kind: 'SESSION_BUSY', reason: 'GROUP_BUSY', retryable: true, correlationId: 'test' }),
	);
	const workspace = new WorkbenchClient({ client: () => f.client }, { after: () => () => {} });
	workspace.store.setState({
		sessions: [old],
		threads: {
			g: {
				...EMPTY_THREAD,
				messages: [
					{
						id: 'm',
						sessionId: 'g',
						role: 'assistant',
						text: 'D private cached body',
						createdAt: '2026-10-28T00:00:00Z',
						sourceRefs: [],
					},
				],
			},
		},
	});
	const saved = vi.fn();
	render(
		<TestProviders>
			<GroupEditor
				client={f.client}
				agents={roster}
				session={old}
				onMembershipChanging={() => workspace.permissionsChanged()}
				onCommittedSession={(session) => workspace.acceptSession(session)}
				onSaved={saved}
			/>
		</TestProviders>,
	);
	for (const label of ['A', 'D', 'B', 'C']) fireEvent.click(screen.getByLabelText(label));
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	await waitFor(() => expect(f.setCoordinator).toHaveBeenCalled());
	expect(workspace.getSnapshot().permissionRevision).toBeGreaterThan(0);
	expect(workspace.getSnapshot().threads.g?.messages).toEqual([]);
	expect(workspace.getSnapshot().sessions[0]?.memberIds).toEqual(['b', 'c', 'a']);
	expect(saved).not.toHaveBeenCalled();
	workspace.dispose();
});

test('membership publication invalidates cached bodies before waiting for an unknown mutation outcome', async () => {
	const f = fakeClient();
	let fail!: (error: Error) => void;
	f.updateMembers.mockImplementation(
		() =>
			new Promise((_resolve, reject) => {
				fail = reject;
			}),
	);
	const old: Session = {
		id: 'g',
		revision: '2',
		kind: 'group',
		title: 'Unknown update',
		memberIds: ['a', 'b'],
		coordinatorId: 'a',
		archived: false,
	};
	const workspace = new WorkbenchClient({ client: () => f.client }, { after: () => () => {} });
	workspace.store.setState({
		threads: {
			g: {
				...EMPTY_THREAD,
				messages: [
					{
						id: 'm',
						sessionId: 'g',
						role: 'assistant',
						text: 'Cached before revoke',
						createdAt: '2026-10-28T00:00:00Z',
						sourceRefs: [],
					},
				],
			},
		},
	});
	render(
		<TestProviders>
			<GroupEditor
				client={f.client}
				agents={agents}
				session={old}
				onMembershipChanging={() => workspace.permissionsChanged()}
			/>
		</TestProviders>,
	);
	fireEvent.click(screen.getByLabelText('Beta'));
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	await waitFor(() => expect(f.updateMembers).toHaveBeenCalledOnce());
	expect(workspace.getSnapshot().threads.g?.messages).toEqual([]);
	Object.assign(f.client, { onClose: () => () => {}, state: 'ready' });
	Object.assign(f.client.sessions, {
		history: vi.fn(async () => ({
			items: [
				{
					id: 'refill',
					sessionId: 'g',
					role: 'assistant',
					text: 'Refilled while pending',
					createdAt: '2026-10-28T00:00:00Z',
					sourceRefs: [],
				},
			],
		})),
	});
	await workspace.refreshHistory('g');
	expect(workspace.getSnapshot().threads.g?.messages[0]?.text).toBe('Refilled while pending');
	fail(
		new BotRpcError(-32000, {
			kind: 'CONFLICT',
			reason: 'INTERNAL_ERROR',
			retryable: true,
			correlationId: 'test',
		}),
	);
	await screen.findByRole('button', { name: 'Retry original request' });
	expect(workspace.getSnapshot().threads.g?.messages).toEqual([]);
	workspace.dispose();
});

test('a group revision conflict requires confirmed discard and a real fresh session read before saving again', async () => {
	const f = fakeClient();
	const old: Session = {
		id: 'group:1',
		revision: '2',
		kind: 'group',
		title: 'Original group',
		memberIds: ['a', 'b'],
		coordinatorId: 'a',
		archived: false,
	};
	const fresh: Session = { ...old, revision: '6', title: 'Server group' };
	const get = vi.fn(async () => fresh);
	Object.assign(f.client.sessions, { get });
	f.updateMembers
		.mockRejectedValueOnce(
			new BotRpcError(-32000, {
				kind: 'CONFLICT',
				reason: 'REVISION_CONFLICT',
				retryable: false,
				correlationId: 'test',
			}),
		)
		.mockResolvedValueOnce({ ...fresh, revision: '7' });
	const view = render(
		<TestProviders>
			<GroupEditor client={f.client} agents={agents} session={old} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByLabelText('Beta'));
	view.rerender(
		<TestProviders>
			<GroupEditor client={f.client} agents={agents} session={fresh} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	await screen.findByRole('button', { name: 'Discard edits and load saved version' });
	expect(f.updateMembers).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: '2', memberIds: ['a'] }));
	expect(screen.getByRole('checkbox', { name: 'Beta' }).getAttribute('aria-checked')).toBe('false');
	fireEvent.click(screen.getByRole('button', { name: 'Discard edits and load saved version' }));
	fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
	await waitFor(() =>
		expect((screen.getByRole('textbox', { name: 'Group name' }) as HTMLInputElement).value).toBe('Server group'),
	);
	expect(screen.getByRole('checkbox', { name: 'Beta' }).getAttribute('aria-checked')).toBe('true');
	expect(get).toHaveBeenCalledWith(
		{ profileId: 'profile:test', id: old.id },
		expect.objectContaining({ signal: expect.any(AbortSignal) }),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	await waitFor(() =>
		expect(f.updateMembers).toHaveBeenLastCalledWith(
			expect.objectContaining({ expectedRevision: '6', memberIds: ['a', 'b'] }),
		),
	);
});
