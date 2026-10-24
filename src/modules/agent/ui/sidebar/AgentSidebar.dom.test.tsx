import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setLanguage, t } from '../../../../shared/i18n';
import { pageTabFixture } from '../workspace/page-tabs.fixture';
import { AgentSidebar } from './AgentSidebar';

vi.mock('../../platform/desktop/files', () => ({ openPath: vi.fn() }));
vi.mock('../create/NewTabMenu', () => ({ NewTabMenu: () => null }));
vi.mock('../terminal/material-picker', () => ({ pickMaterial: vi.fn() }));
beforeEach(() => setLanguage('en'));
const entry = (name: string) => screen.getByRole('button', { name });
const tabs = (f: ReturnType<typeof pageTabFixture>) => f.workspace.store.getState().groups.flatMap((g) => g.tabIds);

test('board and usage open as tabs; a second click only activates the one that is open', async () => {
	const f = pageTabFixture();
	const user = userEvent.setup();
	render(f.wrap(<AgentSidebar />));
	await user.click(entry(t('agent.workspace.nav.board')));
	await user.click(entry(t('agent.workspace.nav.stats')));
	expect(tabs(f)).toEqual(['tab-page-board', 'tab-page-usage']);
	expect(f.workspace.active?.id).toBe('tab-page-usage');
	f.workspace.activate('tab-page-board');
	await user.click(entry(t('agent.workspace.nav.board')));
	await user.click(entry(t('agent.workspace.nav.board')));
	await user.click(entry(t('agent.workspace.nav.stats')));
	await user.click(entry(t('agent.workspace.nav.stats')));
	expect(tabs(f)).toEqual(['tab-page-board', 'tab-page-usage']);
	// The sidebar never switches to another page or opens a dialog on its own.
	expect(f.controller.open).not.toHaveBeenCalled();
	expect(screen.queryByRole('dialog')).toBeNull();
});
test('the entry of the page that is showing is marked, and pages are not listed as sessions', async () => {
	const f = pageTabFixture();
	render(f.wrap(<AgentSidebar />));
	expect(entry(t('agent.workspace.nav.board')).getAttribute('aria-current')).toBeNull();
	act(() => {
		f.workspace.openPage('board');
	});
	expect(entry(t('agent.workspace.nav.board')).getAttribute('aria-current')).toBe('page');
	expect(entry(t('agent.workspace.nav.stats')).getAttribute('aria-current')).toBeNull();
	act(() => {
		f.workspace.openPage('usage');
	});
	expect(entry(t('agent.workspace.nav.stats')).getAttribute('aria-current')).toBe('page');
	expect(entry(t('agent.workspace.nav.board')).getAttribute('aria-current')).toBeNull();
	expect(document.querySelector('[data-session-card]')).toBeNull();
});
test('the sidebar has no automations entry: automations are the automation board of the rail', () => {
	const f = pageTabFixture();
	render(f.wrap(<AgentSidebar />));
	expect(screen.queryByRole('button', { name: /自动化|Automation/ })).toBeNull();
	expect(document.querySelector('[data-page-entry="automations"]')).toBeNull();
});
