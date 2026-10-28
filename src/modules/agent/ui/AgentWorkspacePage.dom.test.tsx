import { expect, test, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { HuhuProviders } from '../../../ui/react/providers';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import type { AgentController } from '../services/controller';
import { createWorkspaceView } from '../services/workspace-view';
import { emptyWorkspace } from '../core/workspace/model';
import { t } from '../../../shared/i18n';
import { useWorkspaceUI } from './workspace/workspace-context';
import { AgentWorkspace, AgentWorkspacePage, createAgentPage } from './AgentWorkspacePage';
import { pageTabFixture } from './workspace/page-tabs.fixture';
vi.mock('./workspace/WorkspaceLayout', () => ({
	WorkspaceLayout: () => {
		const { close } = useWorkspaceUI();
		return <button onClick={() => close('tab')}>Close fixture</button>;
	},
}));
vi.mock('./sidebar/AgentSidebar', () => ({ AgentSidebar: () => null }));
vi.mock('./create/NewTabMenu', () => ({ NewTabMenu: () => null }));
function fixture(
	wording?: { title?: string; action?: string },
	ownerDocument = document,
	view = createWorkspaceView(),
) {
	const choices: boolean[] = [];
	const emptyManaged = { revision: 0, sessions: [] };
	const workspace = {
		getManagedSnapshot: () => emptyManaged,
		subscribeManaged: () => () => {},
		store: createStore(emptyWorkspace),
		setVisible: vi.fn(),
		onMenu: () => () => {},
		report: vi.fn(),
		close: vi.fn(
			async (
				_id: string,
				confirm: (s: string, options?: { title?: string; action?: string }) => Promise<boolean>,
			) => {
				choices.push(await confirm('End fixture?', wording));
			},
		),
	};
	const controller = {
		workspace,
		spaces: { store: createStore(() => ({ records: { spaces: {}, selectedSpaceId: undefined }, loading: false })) },
		sessions: { get: () => undefined },
		usageStore: { observeWindow: () => () => {} },
		app: { keymap: { pushScope: vi.fn(), popScope: vi.fn() } },
	} as unknown as AgentController;
	const content = (visible: boolean) => (
		<HuhuProviders ownerDocument={ownerDocument} visible={visible}>
			<AgentWorkspace controller={controller} context={{} as NativeSurfaceContext} view={view} />
		</HuhuProviders>
	);
	const container = ownerDocument.createElement('div');
	ownerDocument.body.appendChild(container);
	const rendered = render(content(true), { container });
	return { choices, workspace, view, ...rendered, content };
}
test('running tab close presents a real AlertDialog; cancel and accept settle the queued request', async () => {
	const f = fixture(),
		user = userEvent.setup();
	await user.click(screen.getByText('Close fixture'));
	await screen.findByRole('alertdialog');
	await user.click(screen.getByRole('button', { name: t('common.cancel') }));
	await waitFor(() => expect(f.choices).toEqual([false]));
	await user.click(screen.getByText('Close fixture'));
	await screen.findByRole('alertdialog');
	await user.click(screen.getByRole('button', { name: t('agent.end') }));
	await waitFor(() => expect(f.choices).toEqual([false, true]));
});
test('the confirmation can carry its own title and button, e.g. for discarding unsaved edits', async () => {
	const f = fixture({ title: 'Discard unsaved changes?', action: 'Discard' }),
		user = userEvent.setup();
	await user.click(screen.getByText('Close fixture'));
	const dialog = await screen.findByRole('alertdialog');
	expect(within(dialog).getByText('Discard unsaved changes?')).toBeTruthy();
	expect(within(dialog).queryByText(t('agent.confirmTitle'))).toBeNull();
	expect(within(dialog).queryByRole('button', { name: t('agent.end') })).toBeNull();
	await user.click(within(dialog).getByRole('button', { name: 'Discard' }));
	await waitFor(() => expect(f.choices).toEqual([true]));
});
test('hiding and closing a page dismisses and cancels its pending confirmation without reopening it', async () => {
	const f = fixture(),
		user = userEvent.setup();
	await user.click(screen.getByText('Close fixture'));
	await screen.findByRole('alertdialog');
	f.rerender(f.content(false));
	await waitFor(() => expect(f.choices).toEqual([false]));
	expect(screen.queryByRole('alertdialog')).toBeNull();
	f.rerender(f.content(true));
	expect(screen.queryByRole('alertdialog')).toBeNull();
	await user.click(screen.getByText('Close fixture'));
	await screen.findByRole('alertdialog');
	f.unmount();
	await waitFor(() => expect(f.choices).toEqual([false, false]));
});

const target = (section?: string, resourceId?: string) => ({ feature: 'terminal' as const, section, resourceId });
test('deep links open board and usage as tabs; the automations sections of earlier versions open nothing; sessions and the open tabs are left alone', () => {
	const f = pageTabFixture();
	const page = new AgentWorkspacePage({} as NativeSurfaceContext, f.controller);
	const tabs = () => f.workspace.store.getState().groups.flatMap((g) => g.tabIds);
	page.show(target('board'));
	page.show(target('usage', 'codex'));
	expect(tabs()).toEqual(['tab-page-board', 'tab-page-usage']);
	expect(f.workspace.store.getState().tabs['tab-page-usage']).toMatchObject({ resourceId: 'codex' });
	for (const section of ['automations', 'automation-runs', 'automation-edit']) page.show(target(section));
	expect(tabs()).toEqual(['tab-page-board', 'tab-page-usage']);
	// Showing the workspace itself keeps whichever tab is active and does not look up a session for a page id.
	const active = f.workspace.active?.id;
	page.show(target('running'));
	page.show(target());
	page.show(target('usage', 'codex'));
	expect(f.workspace.active?.id).toBe('tab-page-usage');
	f.workspace.activate(active!);
	page.show(target('running'));
	expect(f.workspace.active?.id).toBe(active);
	expect(f.controller.show).not.toHaveBeenCalled();
	page.show(target('running', 'terminal-1'));
	expect(f.controller.show).toHaveBeenCalledExactlyOnceWith('terminal-1');
	page.show(target('history'));
	expect(page.view.getState().history).toBe(true);
	// Which tab is active is the workspace's own saved state, so the page always reports the workspace.
	expect(page.getTarget()).toEqual({ feature: 'terminal', section: 'running' });
});

test('createAgentPage round-trips the selected Inbox tool through getState', async () => {
	const page = await createAgentPage(() => undefined)(
		{} as NativeSurfaceContext,
		{ feature: 'terminal' },
		{ agentControl: true, agentHistory: false, agentTool: 'inbox' },
		new AbortController().signal,
	);
	expect(page.getState?.()).toMatchObject({ agentControl: true, agentHistory: false, agentTool: 'inbox' });
});

test('Escape returns focus to the original confirmation trigger without an AlertDialogTrigger', async () => {
	const focused = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
	const f = fixture(),
		user = userEvent.setup();
	try {
		const trigger = screen.getByRole('button', { name: 'Close fixture' });
		trigger.focus();
		await user.click(trigger);
		await screen.findByRole('alertdialog');
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		expect(f.choices).toEqual([false]);
		expect(document.activeElement).toBe(trigger);
	} finally {
		f.unmount();
		focused.mockRestore();
	}
});

test.each(['window-blurred', 'window-was-blurred', 'target-changed'] as const)(
	'closing confirmation does not steal focus when %s',
	async (reason) => {
		const focused = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
		const f = fixture(),
			user = userEvent.setup();
		try {
			const trigger = screen.getByRole('button', { name: 'Close fixture' });
			trigger.focus();
			await user.click(trigger);
			await screen.findByRole('alertdialog');
			if (reason === 'window-blurred') focused.mockReturnValue(false);
			else if (reason === 'window-was-blurred') window.dispatchEvent(new Event('blur'));
			else f.workspace.store.setState({ activeGroupId: 'changed' });
			await user.keyboard('{Escape}');
			await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
			expect(f.choices).toEqual([false]);
			expect(document.activeElement).not.toBe(trigger);
		} finally {
			f.unmount();
			focused.mockRestore();
		}
	},
);

test('confirmation portal and focus return belong to the initiating document', async () => {
	const frame = document.createElement('iframe');
	document.body.appendChild(frame);
	const owner = frame.contentDocument!;
	const focused = vi.spyOn(owner, 'hasFocus').mockReturnValue(true);
	const f = fixture(undefined, owner),
		user = userEvent.setup({ document: owner });
	try {
		const trigger = within(owner.body).getByRole('button', { name: 'Close fixture' });
		trigger.focus();
		await user.click(trigger);
		const dialog = await within(owner.body).findByRole('alertdialog');
		expect(dialog.ownerDocument).toBe(owner);
		expect(document.querySelector('[role=alertdialog]')).toBeNull();
		await user.click(within(dialog).getByRole('button', { name: t('common.cancel') }));
		await waitFor(() => expect(within(owner.body).queryByRole('alertdialog')).toBeNull());
		expect(f.choices).toEqual([false]);
		expect(owner.activeElement).toBe(trigger);
	} finally {
		f.unmount();
		focused.mockRestore();
		frame.remove();
	}
});

test('narrow control uses one owner-document Dialog and Escape closes it and releases its observer', async () => {
	const frame = document.createElement('iframe');
	document.body.appendChild(frame);
	const owner = frame.contentDocument!,
		win = frame.contentWindow!;
	const focused = vi.spyOn(owner, 'hasFocus').mockReturnValue(true);
	const disconnected = vi.fn();
	const previous = Object.getOwnPropertyDescriptor(win, 'ResizeObserver');
	class NarrowObserver {
		constructor(private notify: ResizeObserverCallback) {}
		observe() {
			this.notify([{ contentRect: { width: 480 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
		}
		unobserve() {}
		disconnect() {
			disconnected();
		}
	}
	Object.defineProperty(win, 'ResizeObserver', { configurable: true, value: NarrowObserver });
	const view = createWorkspaceView({ agentControl: false });
	const f = fixture(undefined, owner, view),
		user = userEvent.setup({ document: owner });
	try {
		const origin = within(owner.body).getByRole('button', { name: 'Close fixture' });
		origin.focus();
		act(() => view.setState({ control: true }));
		const dialog = await within(owner.body).findByRole('dialog');
		expect(dialog.ownerDocument).toBe(owner);
		expect(owner.querySelectorAll('[data-terminal-control]')).toHaveLength(1);
		expect(document.querySelector('[data-agent-control-dialog]')).toBeNull();
		await user.keyboard('{Escape}');
		await waitFor(() => expect(within(owner.body).queryByRole('dialog')).toBeNull());
		expect(view.getState().control).toBe(false);
		expect(owner.activeElement).toBe(origin);
		act(() => view.setState({ control: true }));
		await within(owner.body).findByRole('dialog');
		f.rerender(f.content(false));
		await waitFor(() => expect(within(owner.body).queryByRole('dialog')).toBeNull());
		f.unmount();
		expect(disconnected).toHaveBeenCalledOnce();
	} finally {
		f.unmount();
		focused.mockRestore();
		if (previous) Object.defineProperty(win, 'ResizeObserver', previous);
		else Reflect.deleteProperty(win, 'ResizeObserver');
		frame.remove();
	}
});

test('the workbench keeps its Space identity and navigation tools above an empty or populated layout', async () => {
	const f = fixture();
	const toolbar = screen.getByRole('toolbar', { name: t('agent.workspace.toolbar') });
	expect(within(toolbar).getByText(t('agent.spaces.noSpaces'))).toBeTruthy();
	expect(within(toolbar).getByRole('button', { name: t('agent.workspace.toggleSidebar') })).toBeTruthy();
	expect(within(toolbar).getByRole('button', { name: t('agent.coordination.title') })).toBeTruthy();
	expect(within(toolbar).getByRole('button', { name: t('agent.history') })).toBeTruthy();
	expect(within(toolbar).getByRole('button', { name: t('agent.workspace.pageMenu') })).toBeTruthy();
	f.unmount();
});
