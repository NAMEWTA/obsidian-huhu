import { t } from '../../../../shared/i18n';
import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { emptyWorkspace, type TerminalTabData } from '../../core/workspace/model';
import type { HistoryRow } from '../../services/history-store';
import type { AgentController } from '../../services/controller';
import { WorkspaceService } from '../../services/workspace-service';
import type { TerminalSessions } from '../../services/terminal/sessions';
import { JumpPalette } from './JumpPalette';

function fixture() {
	const tab: TerminalTabData = {
		id: 'open',
		title: 'Open terminal',
		kind: 'terminal',
		createdAt: 1,
		updatedAt: 1,
		state: 'idle',
		unread: false,
		sessionIds: ['session'],
		focusedSessionId: 'session',
		panes: { session: { cwd: '/vault' } },
		paneLayout: { kind: 'pane', session: 'session' },
	};
	const state = {
		...emptyWorkspace(),
		tabs: { open: tab },
		groups: [{ id: 'group', tabIds: ['open'], activeTabId: 'open', recentTabIds: [] }],
		activeGroupId: 'group',
		layout: { kind: 'group' as const, groupId: 'group' },
		closedTabs: [{ ...tab, id: 'closed', title: 'Closed terminal', sessionIds: ['closed-session'], focusedSessionId: 'closed-session', paneLayout: { kind: 'pane' as const, session: 'closed-session' }, panes: { 'closed-session': { cwd: '/vault' } } }],
	};
	const row: HistoryRow = {
		key: 'history',
		title: 'Native history',
		agentId: 'codex',
		accountKey: '{}',
		sessionId: 'native',
		cwd: '/vault',
		transcriptPath: '/vault/log',
		modifiedAtMs: 1,
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false },
		inVault: true,
		metadata: {},
		model: null,
		createdAt: null,
		firstPrompt: '',
		turns: [],
		messageCount: 0,
	};
	const report = vi.fn();
	const workspace = new WorkspaceService({ store: createStore(() => state), ready: Promise.resolve(), flush: async () => {}, dispose: async () => {} },
		{ subscribe: () => () => {}, get: () => undefined, focus: vi.fn() } as unknown as TerminalSessions,
		{ shell: vi.fn(), agent: vi.fn(), resume: vi.fn(), account: () => '', report });
	const resume = vi.fn(async () => {}),
		resumeAt = vi.fn(async () => {}),
		close = vi.fn(),
		select = vi.fn();
	const controller = {
		workspace,
		resume,
		resumeAt,
		historyStore: { store: createStore(() => ({ rows: [row] })) },
	} as unknown as AgentController;
	render(
		<TestProviders>
			<JumpPalette controller={controller} close={close} select={select} />
		</TestProviders>,
	);
	return { workspace, report, resume, resumeAt, close, select, row, user: userEvent.setup() };
}
test.each([false, true])('history Enter restores with split=%s exactly once', async (split) => {
	const f = fixture();
	await f.user.type(screen.getByRole('combobox'), 'Native history');
	await waitFor(() =>
		expect(document.querySelector('[cmdk-item][data-selected="true"]')?.getAttribute('data-history-key')).toBe(
			'history',
		),
	);
	await f.user.keyboard(split ? '{Shift>}{Enter}{/Shift}' : '{Enter}');
	if (split) {
		expect(f.resumeAt).toHaveBeenCalledExactlyOnceWith(f.row, 'group', 'right');
		expect(f.resume).not.toHaveBeenCalled();
	} else {
		expect(f.resume).toHaveBeenCalledExactlyOnceWith(f.row);
		expect(f.resumeAt).not.toHaveBeenCalled();
	}
	expect(f.close).toHaveBeenCalledOnce();
});
test.each([false, true])('closed tab Enter reopens with split=%s exactly once', async (split) => {
	const f = fixture();
	await f.user.click(screen.getByRole('combobox'));
	await f.user.keyboard('{ArrowDown}');
	await waitFor(() =>
		expect(document.querySelector('[cmdk-item][data-selected="true"]')?.getAttribute('data-closed-id')).toBe(
			'closed',
		),
	);
	await f.user.keyboard(split ? '{Shift>}{Enter}{/Shift}' : '{Enter}');
	expect(f.workspace.store.getState().tabs.closed).toBeDefined();
	expect(f.workspace.store.getState().closedTabs).toHaveLength(0);
	expect(f.select).toHaveBeenCalledExactlyOnceWith('closed');
	expect(f.workspace.store.getState().groups).toHaveLength(split ? 2 : 1);
	expect(f.report).not.toHaveBeenCalled();
	expect(f.close).toHaveBeenCalledOnce();
});
test('single open tab Shift+Enter explains refusal and keeps the palette open', async () => {
	const f = fixture();
	await f.user.click(screen.getByRole('combobox'));
	await f.user.keyboard('{Shift>}{Enter}{/Shift}');
	expect(f.workspace.store.getState().groups).toHaveLength(1);
	expect(f.report).toHaveBeenCalledWith(t('agent.workspace.moveReason.last-tab'));
	expect(f.select).not.toHaveBeenCalled();
	expect(f.close).not.toHaveBeenCalled();
});
