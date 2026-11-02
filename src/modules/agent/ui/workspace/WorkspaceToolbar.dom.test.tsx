import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { t } from '../../../../shared/i18n';
import { SpaceService } from '../../services/spaces/space-service';
import { createSpaceWorkspaceStore } from '../../services/workspace-store';
import { WorkspaceService } from '../../services/workspace-service';
import { createWorkspaceView } from '../../services/workspace-view';
import type { TerminalSessions } from '../../services/terminal/sessions';
import type { AgentController } from '../../services/controller';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { WorkspaceUIContext } from './workspace-context';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import { TerminalTabView } from '../terminal/TerminalTabView';
import { HiddenRendererRetention } from '../terminal/hidden-renderer-retention';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { emptyWorkspace, type TerminalTabData } from '../../core/workspace/model';

// Keep the terminal renderer real; these DOM cases must not enter the Electron file adapter.
vi.mock('../../platform/desktop/files', () => {
	const unavailable = () => {
		throw new Error('Desktop file access is outside this DOM fixture');
	};
	return {
		droppedFilePath: vi.fn(unavailable),
		openPath: vi.fn(unavailable),
		resolveReference: vi.fn(unavailable),
		vaultFilePath: vi.fn(unavailable),
	};
});

async function fixture() {
	const files = new Map<string, string>(),
		lost = new AbortController();
	const root = { canonicalPath: '/vault', dev: '1', ino: '2' },
		vault = { vaultId: 'v', deviceId: 'd', rootPath: '/vault', root };
	const write = vi.fn(async (path: string, value: string) => {
		files.set(path, value);
	});
	const acquire = vi.fn(async () => ({
		instanceId: 'toolbar',
		port: 1,
		lost: lost.signal,
		assertHeld: async () => {},
		close: async () => {},
	}));
	const spaces = new SpaceService({
		instanceId: 'toolbar',
		report: vi.fn(),
		storage: { exists: async (p) => files.has(p), read: async (p) => files.get(p)!, write, mkdir: async () => {} },
		directories: {
			inspectVault: async () => vault,
			assertVault: async () => {},
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }),
			chooseExternalDirectory: async () => undefined,
			resolveDirectory: async () => ({ cwd: '/vault' }),
		},
		owners: { acquire },
	});
	await spaces.ready;
	const persistence = createSpaceWorkspaceStore(spaces, window, vi.fn());
	await persistence.ready;
	const workspace = new WorkspaceService(
		persistence,
		{ subscribe: () => () => {}, get: () => undefined } as unknown as TerminalSessions,
		{ shell: vi.fn(), agent: vi.fn(), resume: vi.fn(), account: () => '', report: vi.fn() },
		() => undefined,
		spaces,
	);
	const settings = normalizeTerminalSettings(undefined);
	const controller = {
		spaces,
		workspace,
		app: { workspace: { on: () => ({}), offref: () => {}, getMostRecentLeaf: () => undefined } },
		sessions: { get: () => undefined },
		settings: { get: () => settings, subscribe: () => () => {} },
	} as unknown as AgentController;
	const view = createWorkspaceView(),
		togglePanel = vi.fn(),
		openPageMenu = vi.fn();
	const wrap = (children: ReactNode = <WorkspaceToolbar />) => (
		<TestProviders>
			<WorkspaceUIContext
				value={{
					controller,
					close: () => {},
					confirm: async () => false,
					chrome: {
						context: { togglePanel, openPageMenu } as unknown as NativeSurfaceContext,
						view,
						menu: undefined,
						setMenu: () => {},
					},
				}}
			>
				{children}
			</WorkspaceUIContext>
		</TestProviders>
	);
	return { spaces, workspace, write, acquire, view, togglePanel, openPageMenu, wrap };
}

test('same-name Spaces sharing a directory keep their exact identity visible without a render-time writer', async () => {
	const f = await fixture();
	const a = await f.spaces.create({ name: '同名空间 · very long workspace name', relativePath: '' }),
		b = await f.spaces.create({ name: '同名空间 · very long workspace name', relativePath: '' });
	await f.spaces.select(a.id);
	const writes = f.write.mock.calls.length,
		leases = f.acquire.mock.calls.length;
	const view = render(f.wrap());
	try {
		const toolbar = screen.getByRole('toolbar', { name: t('agent.workspace.toolbar') });
		expect(within(toolbar).getByText(a.id)).toBeTruthy();
		expect(within(toolbar).getByText(a.name).parentElement?.title).toContain(a.id);
		await f.workspace.persistence.readLayout?.(a.id);
		expect(f.write).toHaveBeenCalledTimes(writes);
		expect(f.acquire).toHaveBeenCalledTimes(leases);
		await act(async () => {
			await f.spaces.select(b.id);
		});
		expect(within(toolbar).getByText(b.id)).toBeTruthy();
		expect(within(toolbar).queryByText(a.id)).toBeNull();
	} finally {
		view.unmount();
		await f.workspace.dispose();
	}
});

test('no-Space toolbar keeps the original navigation and mutually exclusive control/history actions', async () => {
	const f = await fixture(),
		user = userEvent.setup(),
		view = render(f.wrap());
	try {
		expect(screen.getByText(t('agent.spaces.noSpaces'))).toBeTruthy();
		expect(f.write).not.toHaveBeenCalled();
		expect(f.acquire).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: t('agent.workspace.toggleSidebar') }));
		expect(f.togglePanel).toHaveBeenCalledOnce();
		await user.click(screen.getByRole('button', { name: t('agent.history') }));
		expect(f.view.getState()).toMatchObject({ history: true, control: false });
		await user.click(screen.getByRole('button', { name: t('agent.coordination.title') }));
		expect(f.view.getState()).toMatchObject({ history: false, control: true });
		await user.click(screen.getByRole('button', { name: t('agent.workspace.pageMenu') }));
		expect(f.openPageMenu).toHaveBeenCalledOnce();
	} finally {
		view.unmount();
		await f.workspace.dispose();
	}
});

test('Inbox button shows a bounded unread count and opens the Inbox tool without switching Space', async () => {
	const f = await fixture();
	const user = userEvent.setup();
	const view = render(f.wrap(<WorkspaceToolbar inboxUnread={3} />));
	try {
		const inbox = screen.getByRole('button', { name: t('agent.inbox.title') });
		expect(within(inbox).getByText('3')).toBeTruthy();
		await user.click(inbox);
		expect(f.view.getState()).toMatchObject({ control: true, history: false, agentTool: 'inbox' });
	} finally {
		view.unmount();
		await f.workspace.dispose();
	}
});

test('restored pane identity is read from the original draft owner without a render-time write or process launch', async () => {
	const f = await fixture();
	const a = await f.spaces.create({ name: 'A', relativePath: '' });
	const tab: TerminalTabData = {
		kind: 'terminal',
		id: 'old-tab',
		title: 'Restored Shell',
		createdAt: 1,
		updatedAt: 1,
		sessionIds: ['old-leaf'],
		focusedSessionId: 'old-leaf',
		paneLayout: { kind: 'pane', session: 'old-leaf' },
		panes: { 'old-leaf': { cwd: '/vault' } },
		state: 'unknown',
		unread: false,
	};
	const original = {
		version: 1 as const,
		tabs: { [tab.id]: tab },
		groups: [{ id: 'g', tabIds: [tab.id], activeTabId: tab.id, recentTabIds: [] }],
		layout: { kind: 'group' as const, groupId: 'g' },
		activeGroupId: 'g',
		closedTabs: [],
	};
	await f.spaces.saveLayout(a.id, { base: emptyWorkspace(), value: original });
	await f.workspace.selectSpace(a.id);
	const writes = f.write.mock.calls.length,
		leases = f.acquire.mock.calls.length;
	const before = await f.workspace.persistence.readLayout!(a.id);
	const view = render(
		f.wrap(
			<TerminalTabView
				tab={f.workspace.store.getState().tabs[tab.id] as TerminalTabData}
				active
				retention={new HiddenRendererRetention()}
			/>,
		),
	);
	try {
		await vi.waitFor(() =>
			expect(document.querySelector('[data-terminal-pane]')?.getAttribute('data-pane-id')).toMatch(/^lp1\./),
		);
		expect(f.write).toHaveBeenCalledTimes(writes);
		expect(f.acquire).toHaveBeenCalledTimes(leases);
		const after = await f.workspace.persistence.readLayout!(a.id);
		expect(after.revision).toBe(before.revision);
		expect(after.dirty).toBe(before.dirty);
		expect(after.view.tabs[tab.id]).toEqual(before.view.tabs[tab.id]);
		expect((after.view.tabs[tab.id] as TerminalTabData).panes['old-leaf']?.paneId).toBeUndefined();
	} finally {
		view.unmount();
		await f.workspace.dispose();
	}
});

test('a late pane projection cannot replace the identity after a same-name Space switch', async () => {
	const f = await fixture();
	const a = await f.spaces.create({ name: 'Twin', relativePath: '' }),
		b = await f.spaces.create({ name: 'Twin', relativePath: '' });
	const layout = (paneId: string) => ({
		version: 1 as const,
		tabs: {
			tab: {
				kind: 'terminal' as const,
				id: 'tab',
				title: 'Twin shell',
				createdAt: 1,
				updatedAt: 1,
				sessionIds: ['leaf'],
				focusedSessionId: 'leaf',
				paneLayout: { kind: 'pane' as const, session: 'leaf' },
				panes: { leaf: { cwd: '/vault', paneId } },
				state: 'unknown' as const,
				unread: false,
			},
		},
		groups: [{ id: 'g', tabIds: ['tab'], activeTabId: 'tab', recentTabIds: [] }],
		layout: { kind: 'group' as const, groupId: 'g' },
		activeGroupId: 'g',
		closedTabs: [],
	});
	await f.spaces.saveLayout(a.id, { base: emptyWorkspace(), value: layout('pane-a') });
	await f.spaces.saveLayout(b.id, { base: emptyWorkspace(), value: layout('pane-b') });
	await f.workspace.selectSpace(a.id);
	const originalRead = f.workspace.persistence.readLayout!,
		captured = await originalRead(a.id);
	let release!: (value: typeof captured) => void;
	const delayed = vi.spyOn(f.workspace.persistence, 'readLayout').mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				release = resolve;
			}),
	);
	const content = () =>
		f.wrap(
			<TerminalTabView
				tab={f.workspace.store.getState().tabs.tab as TerminalTabData}
				active
				retention={new HiddenRendererRetention()}
			/>,
		);
	const view = render(content());
	try {
		await act(async () => {
			await f.workspace.selectSpace(b.id);
		});
		view.rerender(content());
		await vi.waitFor(() =>
			expect(document.querySelector('[data-terminal-pane]')?.getAttribute('data-pane-id')).toBe('pane-b'),
		);
		await act(async () => release(captured));
		expect(document.querySelector('[data-terminal-pane]')?.getAttribute('data-pane-id')).toBe('pane-b');
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(b.id);
	} finally {
		release(captured);
		delayed.mockRestore();
		view.unmount();
		await f.workspace.dispose();
	}
});
