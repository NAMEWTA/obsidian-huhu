import { expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { InboxPanel } from './InboxPanel';
import type { AgentController } from '../../services/controller';
import type { InboxMessage } from '../../core/inbox/model';
import type { InboxObservation } from '../../services/inbox/presentation';

function fixture(selectedSpaceId?: string, observations: readonly InboxObservation[] = []) {
	const messages: InboxMessage[] = [{
		messageId: 'm-1',
		recipient: { spaceId: 'space-a', sessionId: 'session-a' },
		source: 'test',
		body: 'keep reading separate from acknowledgement',
		references: [],
		sendSequence: 1,
		createdAt: 1,
	}];
	const spaces = {
		store: createStore(() => ({
			records: {
				selectedSpaceId,
				spaces: {
					'space-a': { id: 'space-a', name: 'Twin Space', archived: false },
					'space-b': { id: 'space-b', name: 'Twin Space', archived: false },
				},
				sessions: {
					'session-a': { id: 'session-a', spaceId: 'space-a', title: 'Stopped target', kind: 'shell', archived: false },
					'session-b': { id: 'session-b', spaceId: 'space-b', title: 'Same cwd target', kind: 'shell', archived: false },
				},
			},
			loading: false,
		})),
	};
	const presentation = {
		state: () => observations,
		subscribe: () => () => {},
		get: (attemptId: string) => observations.find((observation) => observation.attemptId === attemptId),
		complete: vi.fn(),
		remove: vi.fn(() => true),
	};
	const listMessages = vi.fn(async ({ sessionId, afterSequence }: { sessionId: string; afterSequence?: number; highWaterSequence?: number; generation?: number }) => ({
		rows: sessionId !== 'session-a' ? [] : afterSequence === 2 ? [{ messageId: 'm-2', recipient: messages[0]!.recipient, source: 'test', sendSequence: 2, createdAt: 2, acked: false }] : [{ messageId: 'm-1', recipient: messages[0]!.recipient, source: 'test', sendSequence: 1, createdAt: 1, acked: false }],
		highWaterSequence: sessionId === 'session-a' ? 2 : 0,
		nextSequence: sessionId === 'session-a' && afterSequence !== 2 ? 2 : undefined,
		generation: sessionId === 'session-a' ? 7 : 1,
		freshness: 'fresh' as const,
	}));
	const readMessage = vi.fn(async () => messages[0]!);
	const ackMessage = vi.fn(async () => ({ value: { ...messages[0]!, ack: { ackedAt: 2 } }, effect: 'completed' as const, status: 'saved' as const }));
	const inbox = { presentation, listMessages, readMessage, ackMessage, sendMessage: vi.fn(), freshPrimary: vi.fn() };
	const managedSnapshot = { revision: 1, sessions: [] as never[] };
	const controller = {
		spaces,
		workspace: { subscribeManaged: () => () => {}, getManagedSnapshot: () => managedSnapshot },
		inbox,
	} as unknown as AgentController;
	return { controller, inbox };
}

test('without a selected Space the Inbox asks for an explicit choice and does not infer cwd', () => {
	const f = fixture();
	render(<TestProviders><InboxPanel controller={f.controller} close={() => {}} /></TestProviders>);
	expect(document.querySelector('[data-inbox-availability="true"]')).toBeTruthy();
	expect(screen.getByText('请先选择 Space，再选择收件人。')).toBeTruthy();
	expect(screen.getByRole('combobox', { name: '收件人' }).hasAttribute('disabled')).toBe(true);
});

test('same-name Spaces remain explicit and reading does not acknowledge', async () => {
	const f = fixture('space-a');
	const user = userEvent.setup();
	render(<TestProviders><InboxPanel controller={f.controller} close={() => {}} /></TestProviders>);
	const scope = screen.getByRole('combobox', { name: 'Space 范围' });
	await user.click(scope);
	await user.click(await screen.findByRole('option', { name: '此库的全部 Space' }));
	const recipient = screen.getByRole('combobox', { name: '收件人' });
	await user.click(recipient);
	const options = await screen.findAllByRole('option');
	expect(options.map((option) => option.textContent).join('|')).toContain('space-a');
	expect(options).toHaveLength(2);
	await user.click(options.find((option) => option.textContent?.includes('space-a'))!);
	await waitFor(() => expect(screen.getByText('m-1')).toBeTruthy());
	expect(screen.getByText('m-2')).toBeTruthy();
	expect(f.inbox.listMessages).toHaveBeenCalledWith(expect.objectContaining({ afterSequence: 2, highWaterSequence: 2, generation: 7 }));
	expect(screen.queryByText('keep reading separate from acknowledgement')).toBeNull();
	const article = screen.getByText('m-1').closest('article');
	expect(article).toBeTruthy();
	await user.click(within(article!).getByRole('button', { name: '读取' }));
	await waitFor(() => expect(f.inbox.readMessage).toHaveBeenCalledWith('m-1', { spaceId: 'space-a', sessionId: 'session-a' }));
	await waitFor(() => expect(screen.getByText('keep reading separate from acknowledgement')).toBeTruthy());
	expect(f.inbox.ackMessage).not.toHaveBeenCalled();
	expect(within(article!).getByRole('button', { name: '确认收到' })).toBeTruthy();
	expect(screen.getByRole('button', { name: '发送消息' })).toBeTruthy();
});

test('pending and unknown observations remain visible for explicit fresh-primary verification', () => {
	const f = fixture('space-a', [
		{ attemptId: 'attempt-p', action: 'send', status: 'pending', messageId: 'm-p', recipient: { spaceId: 'space-a', sessionId: 'session-a' }, body: 'pending body' },
		{ attemptId: 'attempt-u', action: 'ack', status: 'unknown', messageId: 'm-u', recipient: { spaceId: 'space-a', sessionId: 'session-a' }, diagnostic: 'readback unavailable' },
	]);
	render(<TestProviders><InboxPanel controller={f.controller} close={() => {}} /></TestProviders>);
	expect(screen.getByText('处理中')).toBeTruthy();
	expect(screen.getByText('未知；请核对')).toBeTruthy();
	expect(screen.getAllByRole('button', { name: '核对最新主记录' })).toHaveLength(2);
});

test('fresh-primary verification settles only a complete matching saved observation', async () => {
	const f = fixture('space-a', [{ attemptId: 'attempt-saved', action: 'send', status: 'unknown', messageId: 'm-1', recipient: { spaceId: 'space-a', sessionId: 'session-a' }, body: 'keep reading separate from acknowledgement', source: 'test', references: [] }]);
	f.inbox.freshPrimary.mockResolvedValue({ freshness: 'fresh', records: { inbox: { messages: [{ messageId: 'm-1', recipient: { spaceId: 'space-a', sessionId: 'session-a' }, source: 'test', body: 'keep reading separate from acknowledgement', references: [], sendSequence: 1, createdAt: 1 }] } } });
	const user = userEvent.setup();
	render(<TestProviders><InboxPanel controller={f.controller} close={() => {}} /></TestProviders>);
	await user.click(screen.getByRole('button', { name: '核对最新主记录' }));
	await waitFor(() => expect(document.querySelector('[data-inbox-verification="saved"]')).toBeTruthy());
	expect(f.inbox.presentation.complete).toHaveBeenCalledWith('attempt-saved', 'completed', 'completed');
});

test('settled observations offer explicit dismiss while unknown observations remain retained', async () => {
	const f = fixture('space-a', [
		{ attemptId: 'attempt-done', action: 'send', status: 'completed', effect: 'completed', messageId: 'm-done', recipient: { spaceId: 'space-a', sessionId: 'session-a' }, body: 'done' },
		{ attemptId: 'attempt-unknown', action: 'ack', status: 'unknown', effect: 'unknown', messageId: 'm-unknown', recipient: { spaceId: 'space-a', sessionId: 'session-a' } },
	]);
	const user = userEvent.setup();
	render(<TestProviders><InboxPanel controller={f.controller} close={() => {}} /></TestProviders>);
	expect(screen.getByText('已结算动作')).toBeTruthy();
	expect(screen.getByRole('button', { name: '收起' })).toBeTruthy();
	expect(screen.getAllByRole('button', { name: '核对最新主记录' })).toHaveLength(1);
	await user.click(screen.getByRole('button', { name: '收起' }));
	expect(f.inbox.presentation.remove).toHaveBeenCalledWith('attempt-done');
});

