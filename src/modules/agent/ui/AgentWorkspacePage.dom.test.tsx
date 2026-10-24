import { expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { HuhuProviders } from '../../../ui/react/providers';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import type { AgentController } from '../services/controller';
import { emptyWorkspace } from '../core/workspace/model';
import { t } from '../../../shared/i18n';
import { useWorkspaceUI } from './workspace/workspace-context';
import { AgentWorkspace, AgentWorkspacePage } from './AgentWorkspacePage';
import { pageTabFixture } from './workspace/page-tabs.fixture';
vi.mock('./workspace/WorkspaceLayout', () => ({
	WorkspaceLayout: () => {
		const { close } = useWorkspaceUI();
		return <button onClick={() => close('tab')}>Close fixture</button>;
	},
}));
vi.mock('./sidebar/AgentSidebar', () => ({ AgentSidebar: () => null }));
vi.mock('./create/NewTabMenu', () => ({ NewTabMenu: () => null }));
function fixture(wording?: { title?: string; action?: string }) {
	const choices: boolean[] = [];
	const workspace = {
		store: createStore(emptyWorkspace),
		setVisible: vi.fn(),
		onMenu: () => () => {},
		report: vi.fn(),
		close: vi.fn(async (_id: string, confirm: (s: string, options?: { title?: string; action?: string }) => Promise<boolean>) => {
			choices.push(await confirm('End fixture?', wording));
		}),
	};
	const controller = {
		workspace,
  usageStore:{observeWindow:()=>()=>{}},
		app: { keymap: { pushScope: vi.fn(), popScope: vi.fn() } },
	} as unknown as AgentController;
	const content = (visible: boolean) => (
		<HuhuProviders ownerDocument={document} visible={visible}>
			<AgentWorkspace controller={controller} context={{} as NativeSurfaceContext} />
		</HuhuProviders>
	);
	const rendered = render(content(true));
	return { choices, ...rendered, content };
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
