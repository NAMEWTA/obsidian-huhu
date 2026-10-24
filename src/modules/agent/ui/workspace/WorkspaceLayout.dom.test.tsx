import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setLanguage, t } from '../../../../shared/i18n';
import { pageTabFixture } from './page-tabs.fixture';
import { WorkspaceLayout } from './WorkspaceLayout';

vi.mock('../terminal/TerminalTabView', () => ({ TerminalTabView: () => null }));
vi.mock('../browser/BrowserTabView', () => ({ BrowserTabView: () => null }));
vi.mock('../browser/BrowserWorkspaceTab', () => ({ BrowserWorkspaceTab: () => null }));
vi.mock('../create/NewTabMenu', () => ({ NewTabMenu: () => null }));
vi.mock('../quick-commands/QuickCommandsButton', () => ({ QuickCommandsButton: () => null }));
vi.mock('../dashboard/AgentBoard', () => ({ AgentBoard: () => <div>board page</div> }));
vi.mock('../usage/UsageStatsPage', () => ({ UsageStatsPage: () => <div>usage page</div> }));
beforeEach(() => setLanguage('en'));
const tabNames = () => within(screen.getByRole('tablist')).getAllByRole('tab').map((tab) => tab.textContent);

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
