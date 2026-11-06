import type { ReactNode } from 'react';
import { createStore } from 'zustand/vanilla';
import { emptyWorkspace } from '../../core/workspace/model';
import type { AgentController } from '../../services/controller';
import { TerminalSession } from '../../services/terminal/session';
import type { TerminalSessions } from '../../services/terminal/sessions';
import { WorkspaceService, type WorkspaceLaunchPort } from '../../services/workspace-service';
import { CURRENT_NATIVE } from '../../../../../test/fixtures/native/current';
import { TestProviders } from '../../../../ui/react/test-providers';
import { WorkspaceUIContext } from './workspace-context';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { t } from '../../../../shared/i18n';
import { pageTabFixture } from './page-tabs.fixture';
import { SessionInformation, WaitingAnswerBanner } from './SessionInformation';
import type { TerminalTabData } from '../../core/workspace/model';
const tab: TerminalTabData = { id: 'waiting', kind: 'terminal', title: 'Existing CLI question', agentId: 'codex', createdAt: 1, updatedAt: 1, sessionIds: ['runtime'], focusedSessionId: 'runtime', paneLayout: { kind: 'pane', session: 'runtime' }, panes: { runtime: { cwd: '/vault/source', persistentSessionId: 'persistent', accountId: 'account', spaceId: 'space' } }, state: 'waiting', unread: true };
function fixture() {
 const f = pageTabFixture();
 f.workspace.store.setState({ version: 1, tabs: { waiting: tab }, groups: [{ id: 'g', tabIds: [tab.id], activeTabId: tab.id, recentTabIds: [] }], activeGroupId: 'g', layout: { kind: 'group', groupId: 'g' }, closedTabs: [] }, true);
 return f;
}
function runtimeFixture() {
	const map = new Map<string, TerminalSession>(),
		listeners = new Set<() => void>();
	let next = 0;
	const make = (agentId?: 'codex') => {
		const session = new TerminalSession({
			id: `s${next++}`,
			sid: next,
			kind: agentId ? 'agent' : 'shell',
			title: agentId ?? 'Shell',
			cwd: '/vault',
			agentId,
			cols: 80,
			rows: 24,
			scrollback: 100,
			platform: 'linux',
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		session.attach({ ...CURRENT_NATIVE, input: () => {}, resize: () => {}, acknowledge: () => {}, end: () => {} }, 1);
		map.set(session.id, session);
		session.onChange(() => listeners.forEach((fn) => fn()));
		return session;
	};
	const sessions = {
		get: (id: string) => map.get(id),
		focus: vi.fn(),
		managedRef: () => undefined,
		end: vi.fn((id: string) => map.get(id)?.exit(0, null)),
		subscribe: (fn: () => void) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		remove: vi.fn((id: string) => {
			map.get(id)?.dispose();
			map.delete(id);
		}),
	} as unknown as TerminalSessions;
	const persistence = {
		store: createStore(emptyWorkspace),
		ready: Promise.resolve(),
		flush: async () => {},
		dispose: vi.fn(async () => {}),
	};
	const launch: WorkspaceLaunchPort = {
		shell: vi.fn(async () => make()),
		agent: vi.fn(async () => make('codex')),
		resume: vi.fn(async () => make('codex')),
		account: () => 'work',
		report: vi.fn(),
	};
	const service = new WorkspaceService(persistence, sessions, launch);
	const controller = { workspace: service, sessions, agentTitle: () => 'Codex' } as unknown as AgentController;
	const wrap = (children: ReactNode) => <TestProviders><WorkspaceUIContext value={{ controller, confirm: async () => true, close: () => {} }}>{children}</WorkspaceUIContext></TestProviders>;
	const dispose = async () => { await service.dispose(); for (const session of map.values()) session.dispose(); };
	return { service, sessions, launch, map, wrap, dispose };
}

test.each([false, true])('waiting banner focuses the real waiting pane (split=%s) without launching or answering', async split => {
 const f = runtimeFixture();
 const id = (await f.service.newAgent('codex'))!;
 const session = f.map.get(id)!;
 session.setActivity('waiting');
 if (split) await f.service.splitPane(id, 'row');
 const launches = vi.mocked(f.launch.shell).mock.calls.length;
 const view = render(f.wrap(<WaitingAnswerBanner />));
 try {
  await userEvent.setup().click(screen.getByRole('button', { name: t('agent.activityEvidence.viewTerminal') }));
  expect(f.service.active).toMatchObject({ focusedSessionId: id });
  expect(f.sessions.focus).toHaveBeenLastCalledWith(id);
  expect(f.launch.shell).toHaveBeenCalledTimes(launches);
  expect(f.launch.agent).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: /allow|deny|允许|拒绝/ })).toBeNull();
  act(() => session.setActivity('idle'));
  expect(document.querySelector('[data-agent-waiting-banner]')).toBeNull();
 } finally { view.unmount(); await f.dispose(); }
});

test.each([false, true])('session provider follows the focused shell identity (split=%s)', async split => {
 const f = runtimeFixture();
 if (split) {
  const id = (await f.service.newAgent('codex'))!;
  await f.service.splitPane(id, 'row');
 } else await f.service.newTerminal();
 const view = render(f.wrap(<SessionInformation open onOpenChange={() => {}} leafWidth={390} />));
 try {
  await screen.findByRole('dialog');
  expect(screen.getByText(t('agent.historyUI.detail.provider')).nextElementSibling?.textContent).toBe(t('agent.inbox.shell'));
  const tab = f.service.active;
  if (tab?.kind !== 'terminal') throw new Error('Expected terminal tab');
  expect(screen.getByText(tab.focusedSessionId)).toBeTruthy();
  if (split) {
   act(() => f.service.focusSession(tab.sessionIds[0]!));
   expect(screen.getByText(t('agent.historyUI.detail.provider')).nextElementSibling?.textContent).toBe('Codex');
   expect(screen.getByText(tab.sessionIds[0]!)).toBeTruthy();
  }
 } finally { view.unmount(); await f.dispose(); }
});
test('session details expose actual identities and metadata without synthesizing missing model or token usage', async () => {
 const f = fixture();
 const view = render(f.wrap(<SessionInformation open onOpenChange={() => {}} leafWidth={390} />));
 expect(await screen.findByRole('dialog', { name: t('agent.sessionInfo') })).toBeTruthy();
 expect(screen.getByText('/vault/source')).toBeTruthy(); expect(screen.getByText('persistent')).toBeTruthy(); expect(screen.getByText('account')).toBeTruthy();
 expect(document.querySelector('.xterm')).toBeNull();
 view.unmount(); await f.workspace.dispose();
});
