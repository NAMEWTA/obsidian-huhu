import { describe, expect, it } from 'vitest';
import { emptyWorkspace, type TerminalTabData } from './model';
import {
	activateTab,
	activeTab,
	closeTab,
	groupOf,
	moveTab,
	nextTab,
	normalizeWorkspace,
	openPage,
	openTab,
	recentTab,
	removeEmptyGroups,
	renameTab,
	resizeGroups,
	splitGroupWithTab,
} from './ops';
export const terminalTab = (id: string): TerminalTabData => ({
	kind: 'terminal',
	id,
	title: id,
	sessionIds: [id],
	paneLayout: { kind: 'pane', session: id },
	focusedSessionId: id,
	panes: { [id]: { cwd: '/vault' } },
	state: 'unknown',
	unread: false,
	createdAt: 1,
	updatedAt: 1,
});
const three = () => ['a', 'b', 'c'].reduce((s, id) => openTab(s, 'g', terminalTab(id)), emptyWorkspace());
it('normalization preserves explicit Pane identity including invalid strings for diagnosis', () => {
	for (const paneId of ['opaque 原身份', '', 'x'.repeat(4097)]) {
		const tab = terminalTab('a');
		Reflect.set(tab.panes.a!, 'paneId', paneId);
		const view = normalizeWorkspace(openTab(emptyWorkspace(), 'g', tab));
		expect(view.tabs.a?.kind === 'terminal' && Reflect.get(view.tabs.a.panes.a!, 'paneId')).toBe(paneId);
	}
});
describe('workspace operations', () => {
	it('opens in an empty workspace and activates, without mutating the baseline', () => {
		const original = emptyWorkspace(),
			state = openTab(original, undefined, terminalTab('a'));
		expect(original.groups).toEqual([]);
		expect(state.groups).toHaveLength(1);
		expect(activeTab(state)?.id).toBe('a');
		expect(openTab(state, undefined, terminalTab('a')).groups[0]!.tabIds).toEqual(['a']);
	});
	it('closing the last tab removes its group and focuses the adjacent group', () => {
		const split = splitGroupWithTab(three(), 'c', 'g', 'right', 'g2');
		const closed = closeTab(split, 'c');
		expect(closed.groups.map((g) => g.id)).toEqual(['g']);
		expect(closed.activeGroupId).toBe('g');
		expect(closed.layout).toEqual({ kind: 'group', groupId: 'g' });
		expect(closed.closedTabs[0]?.id).toBe('c');
		expect(closeTab(closed, 'missing')).toBe(closed);
	});
	it('moves into the second position of another group and repairs both selections', () => {
		let state = splitGroupWithTab(three(), 'c', 'g', 'right', 'g2');
		state = openTab(state, 'g2', terminalTab('d'));
		state = moveTab(state, 'b', 'g2', 1);
		expect(state.groups[0]?.tabIds).toEqual(['a']);
		expect(state.groups[0]?.activeTabId).toBe('a');
		expect(state.groups[1]?.tabIds).toEqual(['c', 'b', 'd']);
		expect(state.groups[1]?.activeTabId).toBe('b');
	});
	it('sorts within a group, rejects invalid moves and clamps insertion', () => {
		let state = moveTab(three(), 'a', 'g', 2);
		expect(state.groups[0]?.tabIds).toEqual(['b', 'c', 'a']);
		state = moveTab(state, 'a', 'g', -3);
		expect(state.groups[0]?.tabIds).toEqual(['a', 'b', 'c']);
		expect(moveTab(state, 'a', 'missing', 0)).toBe(state);
	});
	it('splits at all four edges with equal sizes and refuses a fifth group', () => {
		let state = three();
		state = splitGroupWithTab(state, 'c', 'g', 'right', 'g2');
		expect(state.layout).toMatchObject({
			kind: 'split',
			direction: 'row',
			sizes: [50, 50],
			children: [{ groupId: 'g' }, { groupId: 'g2' }],
		});
		state = splitGroupWithTab(state, 'b', 'g', 'down', 'g3');
		expect(state.groups.map((g) => g.id)).toEqual(['g', 'g3', 'g2']);
		state = openTab(state, 'g', terminalTab('d'));
		state = splitGroupWithTab(state, 'd', 'g', 'left', 'g4');
		expect(state.groups[0]?.id).toBe('g4');
		expect(splitGroupWithTab(state, 'c', 'g', 'up')).toBe(state);
		const up = splitGroupWithTab(three(), 'c', 'g', 'up', 'u');
		expect(up.layout).toMatchObject({ direction: 'column', children: [{ groupId: 'u' }, { groupId: 'g' }] });
	});
	it('does not create an empty split from a single-tab group', () => {
		const state = openTab(emptyWorkspace(), 'g', terminalTab('a'));
		expect(splitGroupWithTab(state, 'a', 'g', 'right')).toBe(state);
	});
	it('activating clears unread and returns the previous active tab for Ctrl Tab', () => {
		let state = three();
		state.tabs.a = { ...terminalTab('a'), unread: true };
		state = activateTab(state, 'a');
		expect(recentTab(state)).toBe('c');
		expect(state.tabs.a).toMatchObject({ unread: false });
		expect(activateTab(state, 'missing')).toBe(state);
	});
	it('next/previous wrap, rename is bounded, and closing prefers MRU', () => {
		let state = three();
		expect(nextTab(state)).toBe('a');
		expect(nextTab(state, -1)).toBe('b');
		state = renameTab(state, 'a', '  new name  ');
		expect(state.tabs.a?.customTitle).toBe('new name');
		state = activateTab(activateTab(state, 'a'), 'c');
		expect(closeTab(state, 'c').groups[0]?.activeTabId).toBe('a');
		expect(nextTab(emptyWorkspace())).toBeUndefined();
		expect(recentTab(emptyWorkspace())).toBeUndefined();
	});
	it('removes empty groups and updates nested split sizes', () => {
		let state = splitGroupWithTab(three(), 'c', 'g', 'right', 'g2');
		state = resizeGroups(state, [], [30, 70]);
		expect(state.layout).toMatchObject({ sizes: [30, 70] });
		expect(resizeGroups(state, [], [NaN, 1]).layout).toEqual(state.layout);
		expect(removeEmptyGroups(emptyWorkspace()).layout).toBeUndefined();
	});
	it('normalizes dangling ids, duplicate refs, empty groups, malformed splits and bounds panes', () => {
		const raw = {
			...three(),
			groups: [
				{ id: 'g', tabIds: ['a', 'missing', 'a'], activeTabId: 'missing', recentTabIds: ['missing'] },
				{ id: 'empty', tabIds: ['missing'] },
			],
			layout: {
				kind: 'split',
				children: [
					{ kind: 'group', groupId: 'empty' },
					{ kind: 'group', groupId: 'g' },
				],
			},
		};
		const state = normalizeWorkspace(raw);
		expect(state.groups).toEqual([{ id: 'g', tabIds: ['a'], activeTabId: 'a', recentTabIds: ['a'] }]);
		expect(Object.keys(state.tabs)).toEqual(['a']);
		expect(state.layout).toEqual({ kind: 'group', groupId: 'g' });
		expect(state.tabs.a).toMatchObject({ resume: { cwd: '/vault' } });
		expect(normalizeWorkspace(null)).toEqual(emptyWorkspace());
		expect(normalizeWorkspace({ version: 0, tabs: raw.tabs })).toEqual(emptyWorkspace());
		expect(groupOf(state, 'a')?.id).toBe('g');
	});
	it('restores per-pane metadata without serialized credentials or executing sessions', () => {
		const state = three();
		state.tabs.a = {
			...terminalTab('a'),
			agentId: 'claude-code',
			panes: {
				a: {
					cwd: '/vault',
					accountId: 'work',
					nativeSessionId: 'native',
					transcriptPath: '/vault/.huhu/log.json',
				},
			},
		};
		const restored = normalizeWorkspace(JSON.parse(JSON.stringify(state)));
		expect(restored.tabs.a).toMatchObject({
			resume: { cwd: '/vault', accountId: 'work', nativeSessionId: 'native' },
			state: 'idle',
			unread: false,
		});
	});
});

describe('page tabs', () => {
	const open = (state: ReturnType<typeof emptyWorkspace>, request: Parameters<typeof openPage>[2]) => {
		const result = openPage(state, 'g', request);
		if (!result) throw new Error('page was not opened');
		return result;
	};
	const now = 1000;
	it('opens board and usage once each with a fixed id, and a repeat only activates', () => {
		let state = openTab(emptyWorkspace(), 'g', terminalTab('a'));
		const board = open(state, { page: 'board', createdAt: now });
		expect(board.tabId).toBe('tab-page-board');
		state = open(board.state, { page: 'usage', createdAt: now }).state;
		expect(state.groups[0]?.tabIds).toEqual(['a', 'tab-page-board', 'tab-page-usage']);
		state = activateTab(state, 'a');
		const again = open(state, { page: 'board', createdAt: 2000 });
		expect(again.tabId).toBe('tab-page-board');
		expect(again.state.groups[0]?.tabIds).toHaveLength(3);
		expect(activeTab(again.state)?.id).toBe('tab-page-board');
		expect(again.state.tabs['tab-page-board']).toMatchObject({ createdAt: now });
	});
	it('re-routes an open usage tab only when asked to and never moves it', () => {
		let state = open(emptyWorkspace(), { page: 'usage', createdAt: now }).state;
		state = open(state, { page: 'usage', resourceId: 'codex', createdAt: now }).state;
		expect(state.tabs['tab-page-usage']).toMatchObject({ resourceId: 'codex' });
		// A plain click on the sidebar entry keeps the provider the tab is on.
		expect(open(state, { page: 'usage', createdAt: now }).state.tabs['tab-page-usage']).toMatchObject({ resourceId: 'codex' });
	});
	it('cannot open the automations pages of earlier versions', () => {
		const state = emptyWorkspace();
		expect(openPage(state, 'g', { page: 'automations' as never, createdAt: now })).toBeUndefined();
		expect(openPage(state, 'g', { page: 'automation-editor' as never, createdAt: now })).toBeUndefined();
	});
	it('survives a save and load: kept pages and the active tab', () => {
		let state = openTab(emptyWorkspace(), 'g', terminalTab('a'));
		state = open(state, { page: 'board', createdAt: now }).state;
		state = open(state, { page: 'usage', resourceId: 'codex', createdAt: now }).state;
		state = activateTab(state, 'tab-page-board');
		const restored = normalizeWorkspace(JSON.parse(JSON.stringify(state)));
		expect(restored.groups).toEqual(state.groups);
		expect(restored.tabs['tab-page-usage']).toMatchObject({ resourceId: 'codex' });
		expect(restored.tabs['tab-page-board']).toMatchObject({ kind: 'page', page: 'board' });
		expect(activeTab(restored)?.id).toBe('tab-page-board');
		// A second load changes nothing.
		expect(normalizeWorkspace(JSON.parse(JSON.stringify(restored)))).toEqual(restored);
	});
	it('drops page tabs with an unknown page or a wrong fixed id, and the automations tabs of earlier versions', () => {
		const good = open(emptyWorkspace(), { page: 'board', createdAt: now }).state;
		const raw = JSON.parse(JSON.stringify(good));
		const base = { kind: 'page', title: '', createdAt: 1 };
		raw.tabs.weird = { ...base, id: 'weird', page: 'terminal' };
		raw.tabs['tab-page-usage-2'] = { ...base, id: 'tab-page-usage-2', page: 'usage' };
		raw.tabs['tab-automation-abc'] = { ...base, id: 'tab-automation-abc', page: 'automation-editor', resourceId: 'x' };
		raw.tabs['tab-page-automations'] = { ...base, id: 'tab-page-automations', page: 'automations', section: 'runs', resourceId: 'r' };
		raw.groups[0].tabIds.push('weird', 'tab-page-usage-2', 'tab-automation-abc', 'tab-page-automations');
		const state = normalizeWorkspace(raw);
		expect(Object.keys(state.tabs)).toEqual(['tab-page-board']);
		expect(state.groups[0]?.tabIds).toEqual(['tab-page-board']);
	});
	it('splits, moves, closes and reopens page tabs like any other tab', () => {
		let state = openTab(emptyWorkspace(), 'g', terminalTab('a'));
		state = open(state, { page: 'board', createdAt: now }).state;
		state = open(state, { page: 'usage', createdAt: now }).state;
		state = splitGroupWithTab(state, 'tab-page-usage', 'g', 'right', 'g2');
		expect(state.groups.map((group) => group.tabIds)).toEqual([['a', 'tab-page-board'], ['tab-page-usage']]);
		state = moveTab(state, 'tab-page-board', 'g2', 0);
		expect(state.groups.map((group) => group.tabIds)).toEqual([['a'], ['tab-page-board', 'tab-page-usage']]);
		const closed = closeTab(state, 'tab-page-board');
		expect(closed.tabs['tab-page-board']).toBeUndefined();
		expect(closed.closedTabs[0]).toMatchObject({ id: 'tab-page-board', kind: 'page' });
		const back = openTab({ ...closed, closedTabs: [] }, closed.activeGroupId, closed.closedTabs[0]!);
		expect(back.tabs['tab-page-board']).toMatchObject({ page: 'board' });
		// Opening the page after it was closed gives one tab again, not two.
		expect(open(closed, { page: 'board', createdAt: now }).state.groups.flatMap((group) => group.tabIds).filter((id) => id === 'tab-page-board')).toHaveLength(1);
	});
});
