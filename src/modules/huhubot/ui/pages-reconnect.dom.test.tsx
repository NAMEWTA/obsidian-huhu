import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../shared/i18n';
import { messages } from '../i18n';
import type { Agent, BotClient, BotMethodMap, Session } from '../api';
import { WorkbenchClient } from '../services/workbench/workbench-client';
import { AgentEditorView } from './agent-page';
import { GroupEditorView } from './group-page';

function connection(name: string, revision: string) {
	let state: 'ready' | 'closed' = 'ready';
	const listeners = new Set<() => void>();
	const agent: Agent = {
		id: 'same-agent',
		name,
		description: '',
		persona: '',
		enabled: true,
		isDefault: false,
		revision,
		personaRevision: revision,
		modelBindingRevision: revision,
	};
	let group: Session = {
		id: 'same-group',
		kind: 'group',
		title: name,
		revision,
		memberIds: [agent.id],
		coordinatorId: agent.id,
		archived: false,
	};
	const update = vi.fn(async (command: BotMethodMap['agents.update']['params']): Promise<Agent> => ({
		...agent,
		...command.draft,
		model: undefined,
		revision: String(Number(revision) + 1),
	}));
	const updateMembers = vi.fn(async (command: BotMethodMap['sessions.updateMembers']['params']) => {
		group = { ...group, memberIds: command.memberIds, revision: String(Number(group.revision) + 1) };
		return group;
	});
	const client = {
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		get state() {
			return state;
		},
		onClose: (callback: () => void) => {
			listeners.add(callback);
			return () => listeners.delete(callback);
		},
		agents: { list: async () => ({ items: [agent] }), update },
		sessions: { list: async () => ({ items: [group] }), updateMembers },
		collaboration: { proposals: async () => ({ items: [] }) },
	} as unknown as BotClient;
	return {
		client,
		agent,
		update,
		updateMembers,
		close: () => {
			state = 'closed';
			for (const callback of [...listeners]) callback();
		},
	};
}
beforeEach(() => {
	registerMessages(messages);
	setLanguage('en');
});
test('Agent page reloads a new connection and an old pending save cannot overwrite its current directory', async () => {
	const first = connection('Old name', '3'),
		second = connection('Fresh name', '7');
	let current: BotClient | undefined = first.client;
	const getClient = () => current,
		workspace = new WorkbenchClient({ client: getClient }, { after: () => () => {} });
	let finish!: (agent: Agent) => void;
	first.update.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const tree = () => (
		<TestProviders>
			<AgentEditorView getClient={getClient} shared={workspace} />
		</TestProviders>
	);
	const view = render(tree());
	await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Old name'));
	fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Old pending edit' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	act(() => {
		current = undefined;
		first.close();
	});
	expect(screen.queryByLabelText('Name')).toBeNull();
	current = second.client;
	view.rerender(tree());
	await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Fresh name'));
	await act(async () => {
		finish({ ...first.agent, name: 'Old late reply', revision: '4' });
		await Promise.resolve();
	});
	expect(workspace.getSnapshot().agents[0]?.name).toBe('Fresh name');
	fireEvent.click(screen.getByRole('button', { name: 'Save Bot' }));
	await waitFor(() => expect(second.update).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: '7' })));
	workspace.dispose();
});
test('Group page sends the first save after reconnect to the new client and its fresh revision', async () => {
	const first = connection('Old group', '2'),
		second = connection('Fresh group', '9');
	let current: BotClient | undefined = first.client;
	const getClient = () => current,
		workspace = new WorkbenchClient({ client: getClient }, { after: () => () => {} });
	const tree = () => (
		<TestProviders>
			<GroupEditorView getClient={getClient} shared={workspace} />
		</TestProviders>
	);
	const view = render(tree());
	await waitFor(() =>
		expect((screen.getByRole('textbox', { name: 'Group name' }) as HTMLInputElement).value).toBe('Old group'),
	);
	act(() => {
		current = undefined;
		first.close();
	});
	current = second.client;
	view.rerender(tree());
	await waitFor(() =>
		expect((screen.getByRole('textbox', { name: 'Group name' }) as HTMLInputElement).value).toBe('Fresh group'),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Save group' }));
	await waitFor(() =>
		expect(second.updateMembers).toHaveBeenCalledWith(
			expect.objectContaining({ expectedRevision: '9', id: 'same-group' }),
		),
	);
	expect(first.updateMembers).not.toHaveBeenCalled();
	workspace.dispose();
});
