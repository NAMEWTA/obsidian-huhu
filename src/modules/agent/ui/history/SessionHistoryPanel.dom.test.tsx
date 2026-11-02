import { expect, test, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { HuhuProviders } from '../../../../ui/react/providers';
import { t } from '../../../../shared/i18n';
import type { AgentController } from '../../services/controller';
import type { HistoryRow } from '../../services/history-store';
import { matchesSpace, SessionHistoryPanel, SPACE_ALL, SPACE_NONE } from './SessionHistoryPanel';

vi.mock('../sidebar/AgentSidebar', () => ({ shortPath: (path: string) => path }));
vi.mock('@tanstack/react-virtual', () => ({
	useVirtualizer: (options: { count: number; getItemKey: (index: number) => string }) => ({
		getTotalSize: () => options.count * 64,
		measureElement: () => {},
		getVirtualItems: () =>
			Array.from({ length: options.count }, (_, index) => ({
				index,
				key: options.getItemKey(index),
				start: index * 64,
			})),
	}),
}));

const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
const row = (key: string, sourceRef?: string, extra: Partial<HistoryRow> = {}): HistoryRow =>
	({
		key,
		agentId: 'codex',
		accountKey: '{}',
		sessionId: key,
		cwd: '/same-cwd',
		title: `title-${key}`,
		transcriptPath: key,
		modifiedAtMs: 1,
		usage,
		sourceRef,
		sourceStatus: 'available',
		metadata: {},
		inVault: true,
		messageCount: 1,
		firstPrompt: '',
		turns: [],
		previewState: 'idle',
		...extra,
	}) as unknown as HistoryRow;
const space = (id: string, name: string, archived = false) => ({ id, name, archived });

interface State {
	rows: HistoryRow[];
	terminalRows?: HistoryRow[];
	loading: boolean;
	error: string;
	warnings: string[];
}
function fixture(initial: Partial<State> = {}) {
	const spaces = createStore(() => ({
		records: {
			spaces: { a: space('a', 'Alpha'), b: space('b', 'Beta'), old: space('old', 'Old', true) },
			historyOwners: { 'ref-a': 'a', 'ref-b': 'b', 'ref-gone': 'deleted', 'ref-old': 'old' } as Record<
				string,
				string
			>,
		},
	}));
	const store = createStore<State>(() => ({
		rows: [row('ra', 'ref-a'), row('rb', 'ref-b'), row('free'), row('dangling', 'ref-gone'), row('ro', 'ref-old')],
		loading: false,
		error: '',
		warnings: [],
		...initial,
	}));
	const historyStore = { store, refresh: vi.fn(async () => {}), preview: vi.fn(async () => {}), annotate: vi.fn() };
	const controller = { spaces: { store: spaces }, historyStore } as unknown as AgentController;
	const view = render(
		<HuhuProviders ownerDocument={document} visible>
			<SessionHistoryPanel controller={controller} close={() => {}} />
		</HuhuProviders>,
	);
	return { store, historyStore, ...view };
}
const shown = () =>
	[...document.querySelectorAll('[data-history-row]')].map((el) => el.getAttribute('data-history-row'));

test('matchesSpace treats missing or deleted owners as unassigned', () => {
	const spaces = { a: {} };
	expect(matchesSpace('a', spaces, SPACE_ALL)).toBe(true);
	expect(matchesSpace(undefined, spaces, SPACE_ALL)).toBe(true);
	expect(matchesSpace(undefined, spaces, SPACE_NONE)).toBe(true);
	expect(matchesSpace('deleted', spaces, SPACE_NONE)).toBe(true);
	expect(matchesSpace('a', spaces, SPACE_NONE)).toBe(false);
	expect(matchesSpace('a', spaces, 'a')).toBe(true);
	expect(matchesSpace(undefined, spaces, 'a')).toBe(false);
});

test('default state: fixed Vault title, no account-wide toggle, every Space listed', () => {
	fixture();
	expect(screen.getByRole('complementary', { name: t('agent.historyUI.title') })).toBeTruthy();
	expect(screen.getByRole('heading', { name: t('agent.historyUI.title') })).toBeTruthy();
	expect(screen.queryByRole('radio')).toBeNull();
	expect(shown()).toEqual(['ra', 'rb', 'free', 'dangling', 'ro']);
});

test('the Space filter works by keyboard alone and offers archived Spaces in their own group', async () => {
	fixture();
	const user = userEvent.setup();
	const trigger = screen.getByRole('button', { name: t('agent.historyUI.view') });
	trigger.focus();
	await user.keyboard('{Enter}');
	const menu = await screen.findByRole('menu');
	expect(within(menu).getByText(t('agent.historyUI.space.archivedGroup'))).toBeTruthy();
	// Keyboard navigation: move to the item and activate it with Enter.
	const alpha = within(menu).getByRole('menuitemcheckbox', { name: 'Alpha' });
	for (let guard = 0; guard < 40 && document.activeElement !== alpha; guard++) await user.keyboard('{ArrowDown}');
	expect(document.activeElement).toBe(alpha);
	await user.keyboard('{Enter}');
	expect(shown()).toEqual(['ra']);
	// Archived Space rows are reachable through the filter, not only under All.
	trigger.focus();
	await user.keyboard('{Enter}');
	const archivedItem = within(await screen.findByRole('menu')).getByRole('menuitemcheckbox', { name: 'Old' });
	for (let guard = 0; guard < 60 && document.activeElement !== archivedItem; guard++)
		await user.keyboard('{ArrowDown}');
	await user.keyboard('{Enter}');
	expect(shown()).toEqual(['ro']);
	trigger.focus();
	await user.keyboard('{Enter}');
	const none = within(await screen.findByRole('menu')).getByRole('menuitemcheckbox', {
		name: t('agent.historyUI.space.unassigned'),
	});
	for (let guard = 0; guard < 60 && document.activeElement !== none; guard++) await user.keyboard('{ArrowDown}');
	await user.keyboard('{Enter}');
	expect(shown()).toEqual(['free', 'dangling']);
});

test('loading, error and empty-search states', async () => {
	const f = fixture({ rows: [], loading: true });
	expect(screen.getByRole('status').textContent).toBe(t('agent.historyUI.loading'));
	act(() => f.store.setState({ loading: false, error: 'boom' }));
	const alert = screen.getByRole('alert');
	expect(alert.textContent).toContain('boom');
	const user = userEvent.setup();
	await user.click(within(alert).getByRole('button', { name: t('agent.historyUI.retry') }));
	expect(f.historyStore.refresh).toHaveBeenCalled();
	act(() => f.store.setState({ error: '', rows: [row('x', 'ref-a')] }));
	await user.type(screen.getByRole('textbox', { name: t('agent.historyUI.search') }), 'nomatch');
	expect(shown()).toEqual([]);
	await user.click(screen.getByRole('button', { name: t('agent.historyUI.clearSearch') }));
	expect(shown()).toEqual(['x']);
});

test('partial failures are summarized once instead of listing every raw warning', () => {
	const warnings = Array.from({ length: 128 }, (_, i) => `Provider ${i}: cannot read`);
	fixture({ warnings: [...warnings, 'history-owner:history-source-invalid'] });
	const summary = screen.getAllByRole('status')[0]!;
	expect(summary.textContent).toContain(t('agent.historyUI.partial', { count: 128 }));
	expect(summary.querySelectorAll('li').length).toBeLessThanOrEqual(20);
	expect(shown().length).toBe(5);
});

test('keyboard expands a row, shows provider/account/Space/source, keeps it open across a refresh and reports status', async () => {
	const f = fixture();
	const user = userEvent.setup();
	const toggle = document.querySelector<HTMLButtonElement>('[data-history-row="ra"] button[aria-expanded]')!;
	toggle.focus();
	await user.keyboard('{Enter}');
	expect(toggle.getAttribute('aria-expanded')).toBe('true');
	expect(f.historyStore.preview).toHaveBeenCalledWith('ra');
	const article = document.querySelector<HTMLElement>('[data-history-row="ra"]')!;
	for (const label of ['provider', 'account', 'space', 'source'])
		expect(
			within(article).getByText(t(`agent.historyUI.detail.${label}` as 'agent.historyUI.detail.source')),
		).toBeTruthy();
	expect(within(article).getByText('Alpha')).toBeTruthy();
	expect(within(article).getByText(t('agent.historyUI.account.system'))).toBeTruthy();
	// A refresh resets the preview; the open row loads it again instead of claiming there is no body.
	act(() =>
		f.store.setState((state) => ({
			rows: state.rows.map((item) => ({ ...item, previewState: 'ready' as const, firstPrompt: 'hello' })),
		})),
	);
	f.historyStore.preview.mockClear();
	act(() =>
		f.store.setState((state) => ({ rows: state.rows.map((item) => ({ ...item, previewState: 'idle' as const })) })),
	);
	expect(toggle.getAttribute('aria-expanded')).toBe('true');
	expect(f.historyStore.preview).toHaveBeenCalledWith('ra');
	// Missing source: status replaces the body.
	act(() =>
		f.store.setState((state) => ({
			rows: state.rows.map((item) =>
				item.key === 'ra'
					? {
							...item,
							sourceStatus: 'missing' as const,
							previewState: 'unavailable' as const,
							readError: t('agent.historyUI.source.missing'),
						}
					: item,
			),
		})),
	);
	expect(within(article).getAllByText(t('agent.historyUI.source.missing')).length).toBeGreaterThan(0);
	expect(within(article).queryByText(t('agent.historyUI.noPreview'))).toBeNull();
});

test('Export is offered for available rows and hidden for rows whose source is unavailable', async () => {
	fixture({ rows: [row('ok', 'ref-a'), row('gone', 'ref-b', { sourceStatus: 'missing' } as Partial<HistoryRow>)] });
	const user = userEvent.setup();
	const open = async (key: string) => {
		const article = document.querySelector<HTMLElement>(`[data-history-row="${key}"]`)!;
		await user.click(within(article).getByRole('button', { name: t('agent.historyUI.actions') }));
		return screen.findByRole('menu');
	};
	let menu = await open('ok');
	expect(within(menu).getByRole('menuitem', { name: t('agent.historyUI.export') })).toBeTruthy();
	await user.keyboard('{Escape}');
	menu = await open('gone');
	expect(within(menu).queryByRole('menuitem', { name: t('agent.historyUI.export') })).toBeNull();
	expect(within(menu).getByRole('menuitem', { name: t('agent.historyUI.copyResume') })).toBeTruthy();
});

test('a partial native body reaches the row as an incomplete prefix, never as latest turns', async () => {
	const { HistoryStore } = await import('../../services/history-store');
	const source = row('partial', 'ref-a');
	const history = {
		hasScanned: true, meta: () => ({}), scan: async () => [],
		query: async () => ({ rows: [source], total: 1, revision: 1 }),
		read: async () => ({ ...source, usage: { ...usage, partial: true }, text: '## user\nBeginning of a long conversation' }),
	} as unknown as import('../../platform/history/service').NativeHistory;
	const store = new HistoryStore(() => history, () => '/vault');
	try {
		await store.refresh(false);
		await store.preview('partial');
		fixture({ rows: store.store.getState().rows });
		await userEvent.setup().click(document.querySelector('[data-history-row="partial"] button[aria-expanded]')!);
		expect(screen.getByText(t('agent.historyUI.bodyPartial'))).toBeTruthy();
		expect(screen.getByRole('heading', { name: t('agent.historyUI.previewTurns') })).toBeTruthy();
		expect(screen.queryByRole('heading', { name: t('agent.historyUI.latest') })).toBeNull();
	} finally { store.dispose(); }
});

test('the time filter limits results by modification time', async () => {
	vi.useFakeTimers({ now: new Date('2026-10-29T12:00:00Z'), toFake: ['Date'] });
	try {
		fixture({ rows: [row('recent', 'ref-a', { modifiedAtMs: Date.now() - 86400000 }), row('old', 'ref-b', { modifiedAtMs: Date.now() - 30 * 86400000 })] });
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: t('agent.historyUI.view') }));
		await user.click(screen.getByRole('menuitemcheckbox', { name: t('agent.historyUI.time.week') }));
		expect(shown()).toEqual(['recent']);
	} finally { vi.useRealTimers(); }
});

test('ordinary terminal metadata is opt-in, keeps Space filtering and has no continue action', async () => {
	const shell = { ...row('terminal'), kind: 'shell', agentId: 'shell', spaceId: 'a', title: 'Build terminal', previewState: 'unavailable' } as HistoryRow;
	const f = fixture({ rows: [row('agent', 'ref-a')], terminalRows: [shell] });
	const user = userEvent.setup();
	expect(shown()).toEqual(['agent']);
	await user.click(screen.getByRole('button', { name: t('agent.historyUI.view') }));
	await user.click(screen.getByRole('menuitemcheckbox', { name: t('agent.historyUI.includeTerminals') }));
	await user.keyboard('{Escape}');
	expect(shown()).toEqual(['agent', 'terminal']);
	await user.click(document.querySelector('[data-history-row="terminal"] button[aria-expanded]')!);
	const terminal = document.querySelector<HTMLElement>('[data-history-row="terminal"]')!;
	expect(within(terminal).getByText(t('agent.historyUI.terminalMetadata'))).toBeTruthy();
	expect(within(terminal).queryByRole('button', { name: t('agent.historyResume.continue') })).toBeNull();
	expect(f.historyStore.preview).not.toHaveBeenCalled();
});
