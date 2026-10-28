import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../shared/i18n';
import type { Agent, BotClient, Session, VisibleMessage } from '../api';
import { messages as chatMessages } from '../i18n';
import { BotWorkbenchPage, type BotWorkbenchHost } from './BotWorkbenchPage';
import { WorkbenchClient } from '../services/workbench/workbench-client';

const agent: Agent = {
	id: 'agent-a',
	name: 'Aster',
	description: 'Research assistant',
	persona: '',
	isDefault: true,
	revision: '1',
	personaRevision: '1',
	modelBindingRevision: '1',
	enabled: true,
};
const session: Session = {
	id: 'session-a',
	revision: '1',
	kind: 'direct',
	title: 'Aster',
	memberIds: ['agent-a'],
	archived: false,
};
const message: VisibleMessage = {
	id: 'message-a',
	sessionId: session.id,
	role: 'assistant',
	text: 'Ready when you are.',
	createdAt: '2026-10-27T00:00:00Z',
	sourceRefs: [],
};

function fixture() {
	let close = () => {};
	const client = {
		hello: {
			protocolVersion: '0.1',
			buildVersion: 'test',
			schemaVersion: 1,
			profile: { profileId: 'profile-a', commandEpoch: '1', revision: '1', createdAt: '2026-10-27T00:00:00Z' },
			capabilities: [],
			limits: { maxFrameBytes: 1000, maxBatchItems: 100 },
		},
		state: 'ready',
		onClose: (listener: () => void) => {
			close = listener;
			return () => {
				close = () => {};
			};
		},
		agents: { list: vi.fn(async () => ({ items: [agent] })) },
		sessions: {
			list: vi.fn(async () => ({ items: [session] })),
			history: vi.fn(async () => ({ items: [message] })),
			create: vi.fn(async () => session),
		},
		runs: {
			start: vi.fn(async () => ({
				runId: 'run-a',
				commandId: 'c',
				receiptId: 'r',
				revision: '2',
				status: 'accepted',
			})),
		},
	} as unknown as BotClient;
	const host: BotWorkbenchHost = { client: () => client, report: vi.fn() };
	return { client, host, close, start: client.runs.start as unknown as ReturnType<typeof vi.fn> };
}

beforeEach(() => {
	registerMessages(chatMessages);
	setLanguage('en');
});

test('loads the durable Bot roster and opens a session history', async () => {
	const f = fixture();
	render(
		<TestProviders>
			<BotWorkbenchPage host={f.host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByRole('button', { name: 'Aster' })).toBeTruthy());
	await fireEvent.click(screen.getByRole('button', { name: 'Aster' }));
	await waitFor(() => expect(screen.getByText('Ready when you are.')).toBeTruthy());
	expect(f.client.sessions.history).toHaveBeenCalledWith(
		{ profileId: 'profile-a', sessionId: 'session-a', limit: 100 },
		{ signal: expect.any(AbortSignal) },
	);
});

test('keeps a draft when a run fails and does not submit an empty intent', async () => {
	const f = fixture();
	f.start.mockImplementation(async () => {
		throw new Error('offline');
	});
	render(
		<TestProviders>
			<BotWorkbenchPage host={f.host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByRole('button', { name: 'Aster' })).toBeTruthy());
	await fireEvent.click(screen.getByRole('button', { name: 'Aster' }));
	await waitFor(() => expect(screen.getByText('Ready when you are.')).toBeTruthy());
	const composer = screen.getByRole('textbox', { name: 'Message this Bot…' });
	fireEvent.change(composer, { target: { value: '  keep this draft  ' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
	await waitFor(() => expect(screen.getByDisplayValue('keep this draft')).toBeTruthy());
	expect(f.client.runs.start).toHaveBeenCalledOnce();
	const emptySubmit = screen.getByRole('button', { name: 'Send message' });
	fireEvent.change(composer, { target: { value: ' ' } });
	expect((emptySubmit as HTMLButtonElement).disabled).toBe(true);
});

test('renders an actionable empty state when Runner is unavailable', () => {
	const host: BotWorkbenchHost = { client: () => undefined, openSettings: vi.fn() };
	render(
		<TestProviders>
			<BotWorkbenchPage host={host} />
		</TestProviders>,
	);
	expect(screen.getByText('Runner is unavailable. Your draft is kept here.')).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Configure a Bot' }));
	expect(host.openSettings).toHaveBeenCalledOnce();
});

test('an unmentioned group message leaves target routing to the coordinator', async () => {
	const f = fixture();
	(f.client.sessions.list as ReturnType<typeof vi.fn>).mockResolvedValue({
		items: [
			{
				...session,
				id: 'group',
				title: 'Team',
				kind: 'group',
				memberIds: ['agent-a', 'agent-b'],
				coordinatorId: 'agent-a',
			},
		],
	});
	render(
		<TestProviders>
			<BotWorkbenchPage host={f.host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByRole('button', { name: /Team/ })).toBeTruthy());
	fireEvent.click(screen.getByRole('button', { name: /Team/ }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Message this Bot…' }), {
		target: { value: 'Coordinate this' },
	});
	fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
	await waitFor(() => expect(f.start).toHaveBeenCalledWith(expect.objectContaining({ targetAgentIds: [] })));
});

test('restoring a new ready connection rereads the selected history and clears the old disconnect error', async () => {
	const f = fixture(),
		listeners = new Set<() => void>();
	const first = {
		...f.client,
		onClose: (callback: () => void) => {
			listeners.add(callback);
			return () => listeners.delete(callback);
		},
	} as BotClient;
	const second = {
		...f.client,
		sessions: {
			...f.client.sessions,
			history: vi.fn(async () => ({ items: [{ ...message, text: 'History after reconnect' }] })),
		},
	} as BotClient;
	let current: BotClient | undefined = first;
	const workspace = new WorkbenchClient({ client: () => current }, { after: () => () => {} });
	render(
		<TestProviders>
			<BotWorkbenchPage host={{ client: () => current, workspace }} selectedSessionId={session.id} />
		</TestProviders>,
	);
	await screen.findByText('Ready when you are.');
	act(() => {
		current = undefined;
		Object.assign(first, { state: 'closed' });
		for (const listener of [...listeners]) listener();
	});
	expect(screen.queryByText('Ready when you are.')).toBeNull();
	await act(async () => {
		current = second;
		await workspace.refreshDirectory();
	});
	await screen.findByText('History after reconnect');
	expect(screen.queryByRole('alert')).toBeNull();
	workspace.dispose();
});
