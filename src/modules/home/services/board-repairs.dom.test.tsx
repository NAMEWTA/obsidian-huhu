import { afterEach, expect, test, vi } from 'vitest';
import { Scope } from 'obsidian';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useStore } from 'zustand';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { contentFiles } from '../../../host/obsidian/storage/content-files';
import { bindJournal } from '../platform/calendar/daily-notes';
import type { NavigatorPeriodic } from '../../navigator/api';
import { TestProviders } from '../../../ui/react/test-providers';
import { setLanguage, t } from '../../../shared/i18n';
import { DEFAULT_DASHBOARD_SETTINGS } from '../core/board/types/model';
import { memoCardText } from '../platform/board/card-move';
import { BoardStore } from './board-store';
import type { HomeHost } from './home-host';
import { Card } from '../ui/cards/Card';
import { MemoBody } from '../ui/cards/MemoBody';
import { TaskList } from '../ui/cards/TaskList';
import { CaptureComposer } from '../ui/inbox/CaptureComposer';
vi.mock('obsidian', async (original) => ({
	...(await original<typeof import('obsidian')>()),
	Component: class {
		load() {}
		unload() {}
	},
	MarkdownRenderer: {
		render: async (_app: unknown, text: string, el: HTMLElement) => {
			el.textContent = text;
		},
	},
}));
vi.mock('./instances', () => ({ homeServices: {} }));
import { convertToGrid } from '../core/board/canvas';
import { parse, serialize } from '../core/board/parser/parse';
import { withStableSectionIds } from '../core/board/section-identity';
const board = '.huhu/dashboards/board.md';
/** A board that already is on the grid, so opening it writes nothing. */
const source = serialize(
	withStableSectionIds(
		convertToGrid(
			parse(
				'# Board\n\n## Todo\n\n### Tasks\n- [ ] Parent\n  - [ ] Child\n- [x] Finished\n\n### Memo\nOriginal memo\n',
			),
			undefined,
		),
		() => `section-${crypto.randomUUID()}`,
	),
);
const stores: BoardStore[] = [];
let unbindJournal: (() => void) | undefined;
/** The key scopes the memo field pushes while it edits; Mod+Enter is delivered through the topmost one, as Obsidian does. */
let scopes: Scope[] = [];
function pressModEnter(field: HTMLElement) {
	field.focus();
	const handler = [...scopes]
		.reverse()
		.flatMap((scope) => (scope as unknown as { handlers: { modifiers: string[]; key: string; callback(e: KeyboardEvent): unknown }[] }).handlers)
		.find((entry) => entry.key === 'Enter' && entry.modifiers.includes('Mod'));
	expect(handler).toBeTruthy();
	act(() => {
		handler!.callback(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
	});
}
afterEach(async () => {
	cleanup();
	unbindJournal?.(); unbindJournal = undefined;
	for (const store of stores.splice(0)) await store.dispose();
});
async function fixture() {
	setLanguage('en');
	const vault = memoryVault({ [board]: source, '.huhu/dashboards/Archive.md': '# Existing archive' }, window);
	scopes = [];
	Object.assign(vault.app, {
		scope: new Scope(),
		keymap: {
			pushScope: (scope: Scope) => scopes.push(scope),
			popScope: (scope: Scope) => {
				scopes = scopes.filter((entry) => entry !== scope);
			},
		},
	});
	const files = contentFiles(vault.app);
	await files.refresh();
	const settings = { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), taskArchivePath: '.huhu/dashboards/Archive.md' };
	const host = {
		app: vault.app,
		settings,
		subscribeSettings: () => () => {},
		workbenchRefresh: () => {},
	} as unknown as HomeHost;
	const store = new BoardStore(host, '.huhu/dashboards/board', window);
	stores.push(store);
	await store.init();
	return { vault, files, store };
}
test('archive appends before the single board write; failed archive leaves all board bytes intact', async () => {
	const { vault, store } = await fixture();
	const process = vi.spyOn(vault.adapter, 'process');
	await store.archiveTasks('Todo');
	expect(vault.contents.get('.huhu/dashboards/Archive.md')).toContain('# Existing archive\n- ');
	expect(vault.contents.get('.huhu/dashboards/Archive.md')).toContain('Finished');
	expect(vault.contents.get(board)).not.toContain('Finished');
	expect(process.mock.calls.filter(([path]) => path === board)).toHaveLength(1);
	const first = process.mock.calls.findIndex(([path]) => path === '.huhu/dashboards/Archive.md');
	expect(first).toBeLessThan(process.mock.calls.findIndex(([path]) => path === board));
	const second = await fixture(),
		before = second.vault.contents.get(board);
	vi.spyOn(second.vault.adapter, 'process').mockRejectedValue(new Error('disk full'));
	await expect(second.store.archiveTasks('Todo')).rejects.toThrow('disk full');
	expect(second.vault.contents.get(board)).toBe(before);
	expect(second.store.completedTasks('Todo')).toHaveLength(1);
});
function archiveJournal(vault: ReturnType<typeof memoryVault>, enabled = true) {
	const path = (date: Date) => `Configured/Journal/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.md`;
	const ensure = vi.fn<NavigatorPeriodic['ensure']>(async (_period, date) => vault.app.vault.create(path(date), '# Configured daily template\n'));
	const journal: NavigatorPeriodic = {
		root: () => 'Configured/Journal', template: () => undefined, weekStart: () => 1,
		display: () => ({ weeks: 6, weekNumbers: true, images: false }), subscribe: () => () => {},
		inspect: (period, date) => ({ period, date: '', path: path(date), title: 'Daily', status: !enabled ? 'disabled' : vault.contents.has(path(date)) ? 'existing' : 'missing', active: false }),
		preview: async (period, date) => journal.inspect(period, date), prepare: async (_period, date) => ({ status: 'ready', path: path(date), content: '# Configured daily template\n' }),
		open: async () => true, active: () => undefined, ensure,
	};
	unbindJournal = bindJournal(() => journal);
	return ensure;
}
test.each(['unavailable', 'disabled'])('daily archive fails explicitly and retains source tasks when the journal is %s', async (status) => {
	const { vault, store } = await fixture();
	const ensure = status === 'disabled' ? archiveJournal(vault, false) : undefined;
	if (status === 'unavailable') unbindJournal = bindJournal(() => undefined);
	store.host.settings.taskArchiveTarget = 'daily';
	const before = [...vault.contents];
	await expect(store.archiveTasks('Todo')).rejects.toThrow(t('notice.archiveDailyUnavailable'));
	expect([...vault.contents]).toEqual(before);
	expect(store.completedTasks('Todo')).toEqual([expect.objectContaining({ task: 'Finished' })]);
	if (ensure) expect(ensure).not.toHaveBeenCalled();
});
test('daily archive uses the configured journal template before removing completed source tasks', async () => {
	const { vault, store } = await fixture();
	const ensure = archiveJournal(vault);
	store.host.settings.taskArchiveTarget = 'daily';
	await store.archiveTasks('Todo');
	const daily = [...vault.contents.entries()].find(([path]) => path.startsWith('Configured/Journal/'));
	expect(daily?.[0]).toMatch(/^Configured\/Journal\/\d{4}-\d{2}-\d{2}\.md$/);
	expect(daily?.[1]).toMatch(/^# Configured daily template\n/);
	expect(daily?.[1]).toContain('Finished');
	expect(vault.contents.get(board)).not.toContain('Finished');
	expect(ensure).toHaveBeenCalledOnce();
	expect(store.completedTasks('Todo')).toHaveLength(0);
	expect([...vault.contents.keys()].some((path) => path.startsWith('huhu/日志/日记/'))).toBe(false);
});
function Memo({ store }: { store: BoardStore }) {
	const data = useStore(store.state, (s) => s.data)!;
	const card = data.columns[0]!.cards.find((c) => c.title === 'Memo')!;
	return (
		<MemoBody
			store={store}
			cardId={card.id}
			text={memoCardText(card)}
			onSave={(text, original) => store.saveMemo(card.id, text, original)}
		/>
	);
}
test.each(['blur', 'shortcut', 'storage-retry-remount'])(
	'failed memo write can retry the latest draft via %s, then edit and save again',
	async (retry) => {
		const { vault, store } = await fixture();
		const view = render(
			<TestProviders>
				<Memo store={store} />
			</TestProviders>,
		);
		fireEvent.click(screen.getByRole('button', { name: t('common.edit') }));
		fireEvent.change(screen.getByRole('textbox'), { target: { value: '  FIRST FAILED SAVE  \n\n' } });
		const process = vi.spyOn(vault.adapter, 'process').mockRejectedValue(new Error('temporary I/O failure'));
		fireEvent.blur(screen.getByRole('textbox'));
		await screen.findByRole('alert');
		expect(store.state.getState().save.status).toBe('save-error');
		expect(vault.contents.get(board)).toBe(source);
		expect(store.state.getState().data!.columns[0]!.cards[1]!.body).toBe('FIRST FAILED SAVE');
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SECOND DRAFT AFTER FAILURE' } });
		process.mockRestore();
		if (retry === 'storage-retry-remount') {
			await act(() => store.sync.retrySave());
			expect(vault.contents.get(board)).toContain('FIRST FAILED SAVE');
			view.rerender(
				<TestProviders>
					<Memo key="remounted" store={store} />
				</TestProviders>,
			);
			expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('SECOND DRAFT AFTER FAILURE');
		}
		if (retry === 'shortcut') pressModEnter(screen.getByRole('textbox'));
		else fireEvent.blur(screen.getByRole('textbox'));
		await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
		expect(screen.queryByRole('alert')).toBeNull();
		expect(vault.contents.get(board)).toContain('SECOND DRAFT AFTER FAILURE');
		expect(store.state.getState().save.status).toBe('saved');
		expect(store.memoDrafts.size).toBe(0);
		fireEvent.click(screen.getByRole('button', { name: t('common.edit') }));
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'THIRD EDIT SAVED' } });
		fireEvent.blur(screen.getByRole('textbox'));
		await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
		expect(vault.contents.get(board)).toContain('THIRD EDIT SAVED');
		expect(vault.contents.get(board)).not.toContain('SECOND DRAFT AFTER FAILURE');
		expect(store.state.getState().save.status).toBe('saved');
	},
);
test('a retried local revision does not permit overwriting a later external edit during the same memo session', async () => {
	const { vault, files, store } = await fixture();
	render(
		<TestProviders>
			<Memo store={store} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('common.edit') }));
	fireEvent.change(screen.getByRole('textbox'), { target: { value: 'FAILED LOCAL REVISION' } });
	const process = vi.spyOn(vault.adapter, 'process').mockRejectedValue(new Error('temporary I/O failure'));
	fireEvent.blur(screen.getByRole('textbox'));
	await screen.findByRole('alert');
	process.mockRestore();
	await act(() => store.sync.retrySave());
	fireEvent.change(screen.getByRole('textbox'), { target: { value: 'LATEST UNSAVED DRAFT' } });
	await act(async () => {
		await vault.adapter.write(board, vault.contents.get(board)!.replace('FAILED LOCAL REVISION', 'REMOTE BODY'));
		await files.refresh();
	});
	await waitFor(() => expect(store.state.getState().data!.columns[0]!.cards[1]!.body).toBe('REMOTE BODY'));
	pressModEnter(screen.getByRole('textbox'));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t('home.dashboard.memoChanged')));
	expect(vault.contents.get(board)).toContain('REMOTE BODY');
	expect(vault.contents.get(board)).not.toContain('LATEST UNSAVED DRAFT');
	expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('LATEST UNSAVED DRAFT');
});
test('normal watcher update during inline editing cannot overwrite remote body; the draft survives remount', async () => {
	const { vault, files, store } = await fixture();
	const view = render(
		<TestProviders>
			<Memo store={store} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('common.edit') }));
	fireEvent.change(screen.getByRole('textbox'), { target: { value: 'LOCAL UNSAVED MEMO' } });
	await act(async () => {
		await vault.adapter.write(board, source.replace('Original memo', 'REMOTE MEMO UPDATE'));
		await files.refresh();
	});
	await waitFor(() =>
		expect(store.state.getState().data!.columns[0]!.cards[1]!.body).toContain('REMOTE MEMO UPDATE'),
	);
	fireEvent.blur(screen.getByRole('textbox'));
	await screen.findByRole('alert');
	expect(vault.contents.get(board)).toContain('REMOTE MEMO UPDATE');
	expect(vault.contents.get(board)).not.toContain('LOCAL UNSAVED MEMO');
	expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('LOCAL UNSAVED MEMO');
	view.unmount();
	render(
		<TestProviders>
			<Memo store={store} />
		</TestProviders>,
	);
	expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('LOCAL UNSAVED MEMO');
});
test('external edits to unrelated fields merge with the inline memo draft', async () => {
	const { vault, files, store } = await fixture();
	render(
		<TestProviders>
			<Memo store={store} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('common.edit') }));
	fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Local body' } });
	await act(async () => {
		await vault.adapter.write(board, source.replace('Parent', 'Remote parent'));
		await files.refresh();
	});
	await waitFor(() =>
		expect(store.state.getState().data!.columns[0]!.cards[0]!.tasks[0]!.text).toBe('Remote parent'),
	);
	fireEvent.blur(screen.getByRole('textbox'));
	await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
	expect(vault.contents.get(board)).toContain('Remote parent');
	expect(vault.contents.get(board)).toContain('Local body');
});
function Tasks({ store }: { store: BoardStore }) {
	const card = useStore(store.state, (s) => s.data!.columns[0]!.cards[0]!);
	return <TaskList store={store} card={card} />;
}
test('collapse and expand update DOM and disk exactly once per gesture', async () => {
	const { vault, store } = await fixture();
	const process = vi.spyOn(vault.adapter, 'process');
	render(
		<TestProviders>
			<Tasks store={store} />
		</TestProviders>,
	);
	const toggle = screen.getByRole('button', { name: t('home.dashboard.collapse') });
	fireEvent.click(toggle);
	await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('false'));
	expect(screen.queryByRole('checkbox', { name: 'Child' })).toBeNull();
	await waitFor(() => expect(vault.contents.get(board)).toContain('<!--collapsed-->'));
	expect(process.mock.calls.filter(([path]) => path === board)).toHaveLength(1);
	fireEvent.click(toggle);
	await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('true'));
	expect(screen.getByRole('checkbox', { name: 'Child' })).toBeTruthy();
	await waitFor(() => expect(vault.contents.get(board)).not.toContain('<!--collapsed-->'));
	expect(process.mock.calls.filter(([path]) => path === board)).toHaveLength(2);
});
test('layout remounts restore the controlled capture draft and skills read the same value', async () => {
	const { store } = await fixture();
	const view = render(
		<TestProviders>
			<CaptureComposer key="side" store={store} count={0} onOpenToday={() => {}} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByRole('textbox', { hidden: true }), { target: { value: 'Unsubmitted thought' } });
	for (const layout of ['mobile', 'side', 'stacked', 'side']) {
		view.rerender(
			<TestProviders>
				<CaptureComposer key={layout} store={store} count={0} onOpenToday={() => {}} />
			</TestProviders>,
		);
		expect((screen.getByRole('textbox', { hidden: true }) as HTMLTextAreaElement).value).toBe(
			'Unsubmitted thought',
		);
		expect(store.captureDraft).toBe('Unsubmitted thought');
	}
});

test('card save action routes exactly once, and real note creation keeps templates, properties and collisions', async () => {
	const { vault, store, files } = await fixture();
	const card = store.state.getState().data!.columns[0]!.cards.find((c) => c.title === 'Memo')!;
	const save = vi.spyOn(store, 'saveCard').mockResolvedValue();
	render(
		<TestProviders>
			<Card store={store} card={card} index={0} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('home.dashboard.saveNote') }));
	expect(save).toHaveBeenCalledExactlyOnceWith(card);
	vi.spyOn(store, 'openFile').mockResolvedValue();
	await vault.adapter.write('.huhu/dashboards/Template.md', '---\ncustom: keep\nstatus: old\n---\n# {{title}}\nBody');
	await files.refresh();
	const first = await store.newNote('Notes', 'Test', 'Template.md', { status: 'draft' });
	const second = await store.newNote('Notes', 'Test', 'Template.md', { status: 'draft' });
	// a new note is a visible vault note, never a managed `.huhu` file
	expect(first).toBe('Notes/Test.md');
	expect(second).toBe('Notes/Test-2.md');
	expect(vault.contents.get(first)).toContain('custom: keep');
	expect(vault.contents.get(first)).toContain('status: draft');
	expect(vault.contents.get(first)).toContain('# Test');
	expect(vault.contents.get(first)).toContain('Body');
});
test('quick capture without a target note appends to the day file in the inbox folder, never under .huhu', async () => {
	const { vault, store } = await fixture();
	await store.capture('A passing thought');
	const made = [...vault.contents.keys()].filter((path) => path.startsWith('huhu/收件箱/'));
	expect(made).toHaveLength(1);
	expect(made[0]).toMatch(/^huhu\/收件箱\/\d{4}-\d{2}-\d{2}-闪念\.md$/);
	// the first capture creates the file with the default properties
	expect(vault.contents.get(made[0]!)).toMatch(/^---\n状态: 在用\ntags:\n {2}- \n---\n- \d{2}:\d{2} A passing thought\n$/);
	await store.capture('Second thought');
	// the same day: one file, two list items
	expect([...vault.contents.keys()].filter((path) => path.startsWith('huhu/收件箱/'))).toEqual(made);
	expect(vault.contents.get(made[0]!)).toMatch(
		/^---\n状态: 在用\ntags:\n {2}- \n---\n- \d{2}:\d{2} A passing thought\n- \d{2}:\d{2} Second thought\n$/,
	);
	store.host.settings.memoSavePath = 'Inbox/Ideas';
	await store.capture('Third thought');
	expect([...vault.contents.keys()].some((path) => /^Inbox\/Ideas\/\d{4}-\d{2}-\d{2}-闪念\.md$/.test(path))).toBe(true);
	expect([...vault.contents.keys()].some((path) => path.startsWith('huhu/闪念'))).toBe(false);
});
test('a new note opens in a new tab with the editor of Obsidian, not in a dialog', async () => {
	const { vault, store } = await fixture();
	const openFile = vi.fn(async () => {});
	(vault.app.workspace as unknown as { getLeaf: unknown }).getLeaf = vi.fn(() => ({ openFile }));
	const path = await store.newNote('Projects/Alpha', 'Spec');
	expect(path).toBe('Projects/Alpha/Spec.md');
	expect((vault.app.workspace as unknown as { getLeaf: ReturnType<typeof vi.fn> }).getLeaf).toHaveBeenCalledWith('tab');
	expect(openFile).toHaveBeenCalledWith(vault.file('Projects/Alpha/Spec.md'));
});
test('a web card opens in the browser tab or the system browser; the preview dialog is gone and an old "modal" value counts as the tab', async () => {
	const { store } = await fixture();
	const openBrowser = vi.fn(async () => {});
	(store.host as unknown as { openBrowser: typeof openBrowser }).openBrowser = openBrowser;
	const web = (openIn: string) => ({
		...store.state.getState().data!.columns[0]!.cards[0]!,
		id: 'w',
		title: 'Site',
		type: 'web' as const,
		url: 'https://example.com',
		openIn: openIn as 'tab',
	});
	const view = render(
		<TestProviders>
			<Card store={store} card={web('modal')} index={0} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: /example\.com/ }));
	expect(openBrowser).toHaveBeenCalledWith({ url: 'https://example.com' });
	expect(screen.queryByRole('dialog')).toBeNull();
	// the edit dialog offers exactly the two ways
	fireEvent.click(screen.getByRole('button', { name: t('common.edit') }));
	fireEvent.click(await screen.findByRole('combobox', { name: t('home.dashboard.openIn') }));
	const options = await screen.findAllByRole('option');
	expect(options.map((option) => option.textContent)).toEqual([t('home.dashboard.browserTab'), t('home.dashboard.systemBrowser')]);
	view.unmount();
});
