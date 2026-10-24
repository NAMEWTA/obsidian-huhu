import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { setLanguage } from '../../../../shared/i18n';
import { pageTabFixture } from '../workspace/page-tabs.fixture';
import { PageTabView } from './PageTabView';

vi.mock('../dashboard/AgentBoard', () => ({ AgentBoard: () => <div>board page</div> }));
vi.mock('../usage/UsageStatsPage', () => ({ UsageStatsPage: ({ provider }: { provider?: string }) => <div>usage page {provider ?? 'all'}</div> }));
beforeEach(() => setLanguage('en'));
const tabOf = (f: ReturnType<typeof pageTabFixture>, id: string) => {
	const tab = f.workspace.store.getState().tabs[id];
	if (tab?.kind !== 'page') throw new Error(`no page tab ${id}`);
	return tab;
};

test('board and usage tabs render their page, usage with the provider it was opened for', () => {
	const f = pageTabFixture();
	const board = f.workspace.openPage('board')!;
	const usage = f.workspace.openPage('usage', { resourceId: 'codex' })!;
	render(
		f.wrap(
			<>
				<PageTabView tab={tabOf(f, board)} active />
				<PageTabView tab={tabOf(f, usage)} active />
			</>,
		),
	);
	expect(screen.getByText('board page')).toBeTruthy();
	expect(screen.getByText('usage page codex')).toBeTruthy();
});
test('a tab restored in the background mounts nothing until it is shown, and then stays mounted while hidden', () => {
	const f = pageTabFixture();
	const id = f.workspace.openPage('board')!;
	const view = render(f.wrap(<PageTabView tab={tabOf(f, id)} active={false} />));
	expect(screen.queryByText('board page')).toBeNull();
	view.rerender(f.wrap(<PageTabView tab={tabOf(f, id)} active />));
	expect(screen.getByText('board page')).toBeTruthy();
	view.rerender(f.wrap(<PageTabView tab={tabOf(f, id)} active={false} />));
	expect(screen.getByText('board page')).toBeTruthy();
});
test('the workspace has no automations page: only the board and usage open as tabs', () => {
	const f = pageTabFixture();
	f.workspace.openPage('board');
	f.workspace.openPage('usage');
	// @ts-expect-error automations are not a page of the agent workspace
	expect(f.workspace.openPage('automations')).toBeUndefined();
	expect(Object.keys(f.workspace.store.getState().tabs).sort()).toEqual(['tab-page-board', 'tab-page-usage']);
});
