import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setLanguage, t } from '../../../../shared/i18n';
import { pageTabFixture } from './page-tabs.fixture';
import { WorkspaceLayout } from './WorkspaceLayout';

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
vi.mock('../browser/BrowserTabView', () => ({ BrowserTabView: () => null }));
vi.mock('../browser/BrowserWorkspaceTab', () => ({ BrowserWorkspaceTab: () => null }));
vi.mock('../create/NewTabMenu', () => ({ NewTabMenu: () => null }));
vi.mock('../quick-commands/QuickCommandsButton', () => ({ QuickCommandsButton: () => null }));
vi.mock('../dashboard/AgentBoard', () => ({ AgentBoard: () => <div>board page</div> }));
vi.mock('../usage/UsageStatsPage', () => ({ UsageStatsPage: () => <div>usage page</div> }));
beforeEach(() => setLanguage('en'));
const tabNames = () =>
	within(screen.getByRole('tablist'))
		.getAllByRole('tab')
		.map((tab) => tab.textContent);

test('page tabs sit in the tab strip with their own names, switch like any tab and close from the tab', async () => {
	const f = pageTabFixture();
	const user = userEvent.setup();
	render(f.wrap(<WorkspaceLayout />));
	act(() => {
		f.workspace.openPage('board');
		f.workspace.openPage('usage');
	});
	expect(tabNames()).toEqual([t('agent.workspace.nav.board'), t('agent.workspace.nav.stats')]);
	const board = screen.getByRole('tab', { name: t('agent.workspace.nav.board') });
	await user.click(board);
	expect(f.workspace.active?.id).toBe('tab-page-board');
	expect(screen.getByRole('tabpanel', { name: t('agent.workspace.nav.board') }).hasAttribute('hidden')).toBe(false);
	const usagePanel = document.querySelector('[data-tab-content="tab-page-usage"]')!;
	expect(usagePanel.hasAttribute('hidden')).toBe(true);
	expect(usagePanel.getAttribute('aria-label')).toBe(t('agent.workspace.nav.stats'));
	expect(screen.getByText('board page')).toBeTruthy();
	await user.click(within(board).getByRole('button', { name: t('agent.workspace.closeTab') }));
	await vi.waitFor(() => expect(tabNames()).toEqual([t('agent.workspace.nav.stats')]));
	// Opening it from the sidebar again brings back one board tab.
	act(() => {
		f.workspace.openPage('board');
	});
	expect(tabNames()).toEqual([t('agent.workspace.nav.stats'), t('agent.workspace.nav.board')]);
});
test('page names follow the language and the page tabs offer no rename', async () => {
	const f = pageTabFixture();
	render(f.wrap(<WorkspaceLayout />));
	act(() => {
		f.workspace.openPage('usage');
	});
	expect(tabNames()).toEqual([t('agent.workspace.nav.stats')]);
	act(() => setLanguage('zh'));
	expect(tabNames()).toEqual(['用量统计']);
	await userEvent.setup().pointer({ keys: '[MouseRight]', target: screen.getByRole('tab') });
	expect(await screen.findByRole('menuitem', { name: t('agent.workspace.closeTab') })).toBeTruthy();
	expect(screen.queryByRole('menuitem', { name: t('agent.renameLabel') })).toBeNull();
	expect(screen.queryByRole('menuitem', { name: t('agent.copyId') })).toBeNull();
});

test('narrow terminal splits are presentation only and never rewrite the original direction or ratios on mount', async () => {
	const f = pageTabFixture();
	const original = {
		kind: 'terminal' as const,
		id: 'tab-live',
		title: 'Long terminal identity',
		createdAt: 1,
		updatedAt: 1,
		sessionIds: ['left', 'right'],
		focusedSessionId: 'left',
		paneLayout: {
			kind: 'split' as const,
			direction: 'row' as const,
			ratio: 0.7,
			first: { kind: 'pane' as const, session: 'left' },
			second: { kind: 'pane' as const, session: 'right' },
		},
		panes: { left: { cwd: '/vault' }, right: { cwd: '/vault' } },
		state: 'unknown' as const,
		unread: false,
	};
	f.workspace.store.setState(
		{
			version: 1,
			tabs: { [original.id]: original },
			groups: [{ id: 'g', tabIds: [original.id], activeTabId: original.id, recentTabIds: [] }],
			layout: { kind: 'group', groupId: 'g' },
			activeGroupId: 'g',
			closedTabs: [],
		},
		true,
	);
	const box = vi
		.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
		.mockReturnValue({
			width: 390,
			height: 600,
			left: 0,
			top: 0,
			right: 390,
			bottom: 600,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});
	const rendered = render(f.wrap(<WorkspaceLayout />));
	try {
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-panel-group-direction]')?.getAttribute('data-panel-group-direction'),
			).toBe('vertical'),
		);
		expect(f.workspace.store.getState().tabs[original.id]).toMatchObject({
			paneLayout: { direction: 'row', ratio: 0.7 },
		});
		expect(f.workspace.store.getState().tabs[original.id]).toEqual(original);
	} finally {
		rendered.unmount();
		box.mockRestore();
		await f.workspace.dispose();
	}
});

test('native keyboard resizing updates the same pane model while external ratio synchronization creates no echo mutation', async () => {
	const f = pageTabFixture();
	const tab = {
		kind: 'terminal' as const,
		id: 'tab-resize',
		title: 'Shell',
		createdAt: 1,
		updatedAt: 1,
		sessionIds: ['left', 'right'],
		focusedSessionId: 'left',
		paneLayout: {
			kind: 'split' as const,
			direction: 'row' as const,
			ratio: 0.5,
			first: { kind: 'pane' as const, session: 'left' },
			second: { kind: 'pane' as const, session: 'right' },
		},
		panes: { left: { cwd: '/vault' }, right: { cwd: '/vault' } },
		state: 'unknown' as const,
		unread: false,
	};
	f.workspace.store.setState(
		{
			version: 1,
			tabs: { [tab.id]: tab },
			groups: [{ id: 'g', tabIds: [tab.id], activeTabId: tab.id, recentTabIds: [] }],
			layout: { kind: 'group', groupId: 'g' },
			activeGroupId: 'g',
			closedTabs: [],
		},
		true,
	);
	const box = vi
		.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
		.mockReturnValue({
			width: 1200,
			height: 600,
			left: 0,
			top: 0,
			right: 1200,
			bottom: 600,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});
	const resize = vi.spyOn(f.workspace, 'resizePane');
	const rendered = render(f.wrap(<WorkspaceLayout />));
	try {
		await vi.waitFor(() => expect(screen.getByRole('separator').getAttribute('aria-valuenow')).toBe('50'));
		expect(resize).not.toHaveBeenCalled();
		act(() => f.workspace.resizePane(tab.id, [], 0.6));
		await vi.waitFor(() => expect(screen.getByRole('separator').getAttribute('aria-valuenow')).toBe('60'));
		expect(resize).toHaveBeenCalledTimes(1);
		const separator = screen.getByRole('separator');
		separator.focus();
		await userEvent.setup().keyboard('{ArrowRight}');
		await vi.waitFor(() => expect(resize).toHaveBeenCalledTimes(2));
		expect(f.workspace.store.getState().tabs[tab.id]).toMatchObject({
			paneLayout: { direction: 'row', ratio: 0.7 },
		});
	} finally {
		rendered.unmount();
		box.mockRestore();
		await f.workspace.dispose();
	}
});

test('group splits keep their model through narrow and wide projection and native keyboard resizing stays writable', async () => {
	const f = pageTabFixture();
	const board = f.workspace.openPage('board')!,
		usage = f.workspace.openPage('usage')!;
	f.workspace.move(usage, { split: 'right', ofGroupId: f.workspace.group(board)!.id });
	const original = structuredClone(f.workspace.store.getState());
	let width = 1200;
	const observers = new Map<ResizeObserverCallback, Set<Element>>();
	const NativeObserver = window.ResizeObserver;
	class Observer {
		private elements = new Set<Element>();
		constructor(private callback: ResizeObserverCallback) {
			observers.set(callback, this.elements);
		}
		observe(element: Element) {
			this.elements.add(element);
		}
		unobserve(element: Element) {
			this.elements.delete(element);
		}
		disconnect() {
			observers.delete(this.callback);
		}
	}
	window.ResizeObserver = Observer as unknown as typeof ResizeObserver;
	const box = vi
		.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
		.mockImplementation(() => ({
			width,
			height: 600,
			left: 0,
			top: 0,
			right: width,
			bottom: 600,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		}));
	const resize = vi.spyOn(f.workspace, 'resize');
	const rendered = render(f.wrap(<WorkspaceLayout />));
	const orientation = () =>
		document.querySelector('[data-panel-group-direction]')!.getAttribute('data-panel-group-direction');
	const changeWidth = (next: number) =>
		act(() => {
			width = next;
			for (const [callback, elements] of observers)
				if ([...elements].some((el) => el.hasAttribute('data-workspace-layout')))
					callback([], {} as ResizeObserver);
		});
	try {
		expect(orientation()).toBe('horizontal');
		expect(resize).not.toHaveBeenCalled();
		changeWidth(390);
		expect(orientation()).toBe('vertical');
		expect(f.workspace.store.getState()).toEqual(original);
		changeWidth(1200);
		expect(orientation()).toBe('horizontal');
		expect(resize).not.toHaveBeenCalled();
		act(() => f.workspace.resize([], [65, 35]));
		await vi.waitFor(() => expect(screen.getByRole('separator').getAttribute('aria-valuenow')).toBe('65'));
		expect(resize).toHaveBeenCalledTimes(1);
		screen.getByRole('separator').focus();
		await userEvent.setup().keyboard('{ArrowRight}');
		await vi.waitFor(() => expect(resize).toHaveBeenCalledTimes(2));
		expect(f.workspace.store.getState().layout).toMatchObject({ direction: 'row', sizes: [75, 25] });
	} finally {
		rendered.unmount();
		box.mockRestore();
		window.ResizeObserver = NativeObserver;
		await f.workspace.dispose();
	}
});
