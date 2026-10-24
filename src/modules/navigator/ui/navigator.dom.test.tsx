// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HuhuProviders } from '../../../ui/react/providers';
import { setLanguage } from '../../../shared/i18n';
import { createMemoryCache } from '../platform/cache-store';
import { PreviewStore } from '../platform/preview-store';
import { FakeVault, createTestService, note } from '../services/test-support';
import type { NavigatorEnv } from './env';
import { NavigatorContext } from './hooks';
import { ListPane } from './ListPane';
import { EntryIcon } from './EntryIcon';
import { NavPane } from './NavPane';
import { NavigatorRoot } from './NavigatorRoot';

vi.mock('obsidian', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), Platform: { isMacOS: false, isPhone: false, isMobile: false } }));

beforeAll(() => {
	// happy-dom has no layout: give every element a size so the virtualizer renders rows.
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 600, width: 300, height: 600, toJSON: () => ({}) } as DOMRect);
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 600 });
	Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 300 });
	Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
	globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
	HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(() => { vi.useRealTimers(); });

const files = () => [note('Work/a.md', 30, ['plan']), note('Work/b.md', 20), note('Work/c.md', 10), note('Home/d.md', 5, ['plan'])];

async function fixture(options: Parameters<typeof createTestService>[1] = {}) {
	setLanguage('en');
	const vault = new FakeVault(files(), ['/', 'Work', 'Home']);
	const { service, calls, settings } = await createTestService(vault, options);
	const previews = new PreviewStore({
		cache: createMemoryCache(),
		source: { mtime: () => 1, isMarkdown: () => true, readText: (path) => Promise.resolve(`Preview of ${path}`), propertyImage: () => undefined, resolveImage: () => null, title: () => '', metadataReady: () => true },
		scheduler: { now: () => 0, yield: () => Promise.resolve(), later: (callback) => { const handle = setTimeout(callback, 0); return () => clearTimeout(handle); } },
		imageProperties: () => [],
	});
	const env: NavigatorEnv = {
		app: { scope: {}, keymap: { pushScope() {}, popScope() {} } } as never,
		service,
		previews,
		isMac: false,
		resolveIcon: () => ({ icon: null, emoji: false, color: null }),
		subscribeIcons: () => () => undefined,
		imageUrl: (path) => path,
		copyPath: () => undefined,
		openSettings: () => undefined,
		openAppearance: () => undefined,
		askName: (_title, value) => Promise.resolve(value),
		report: (error) => { throw error instanceof Error ? error : new Error(String(error)); },
	};
	const view = (node: React.ReactNode) => render(<HuhuProviders ownerDocument={document}><NavigatorContext.Provider value={env}><div className="huhu-ui">{node}</div></NavigatorContext.Provider></HuhuProviders>);
	return { vault, service, calls, settings, env, view };
}

const notePaths = () => [...document.querySelectorAll<HTMLElement>('[data-note-path]')].map((row) => row.dataset.notePath);
const selectedPaths = () => [...document.querySelectorAll<HTMLElement>('[data-note-path][aria-selected=true]')].map((row) => row.dataset.notePath);

test('the navigation pane lists folders and tags with counts; clicking selects the folder and lists its notes', async () => {
	const t = await fixture();
	t.view(<><NavPane /><ListPane /></>);
	await screen.findByRole('tree');
	const work = await screen.findByText('Work');
	expect(within(work.closest('[data-nav-key]') as HTMLElement).getByText('3')).toBeTruthy();
	expect(screen.getByText('plan')).toBeTruthy();
	fireEvent.click(work);
	await waitFor(() => expect(notePaths()).toEqual(['Work/a.md', 'Work/b.md', 'Work/c.md']));
	expect(within(document.querySelector('[data-navigator-pane=list] header') as HTMLElement).getByText('Work')).toBeTruthy();
});

test('keyboard: arrows move and open, shift extends, ctrl+a selects all, Home/End jump', async () => {
	const t = await fixture();
	t.view(<ListPane />);
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	const list = await screen.findByRole('listbox');
	await waitFor(() => expect(notePaths()).toHaveLength(3));
	list.focus();
	fireEvent.keyDown(list, { key: 'ArrowDown' });
	await waitFor(() => expect(selectedPaths()).toEqual(['Work/a.md']));
	fireEvent.keyDown(list, { key: 'ArrowDown', shiftKey: true });
	fireEvent.keyDown(list, { key: 'ArrowDown', shiftKey: true });
	await waitFor(() => expect(selectedPaths()).toEqual(['Work/a.md', 'Work/b.md', 'Work/c.md']));
	fireEvent.keyDown(list, { key: 'End' });
	await waitFor(() => expect(selectedPaths()).toEqual(['Work/c.md']));
	fireEvent.keyDown(list, { key: 'Home' });
	await waitFor(() => expect(selectedPaths()).toEqual(['Work/a.md']));
	fireEvent.keyDown(list, { key: 'a', ctrlKey: true });
	await waitFor(() => expect(selectedPaths()).toHaveLength(3));
});

test('keyboard: left and right switch panes, Tab goes to the editor, Enter opens', async () => {
	const t = await fixture();
	t.view(<NavigatorRoot />);
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	await waitFor(() => expect(notePaths()).toHaveLength(3));
	const tree = screen.getByRole('tree');
	tree.focus();
	fireEvent.keyDown(tree, { key: 'ArrowRight' });
	await waitFor(() => expect(t.service.state.getState().pane).toBe('list'));
	expect(t.service.state.getState().selection.paths).toEqual(['Work/a.md']);
	const list = screen.getByRole('listbox');
	fireEvent.keyDown(list, { key: 'Enter' });
	expect(t.calls).toContainEqual(['open', 'Work/a.md', { focus: true, reuse: true }]);
	fireEvent.keyDown(list, { key: 'ArrowLeft' });
	await waitFor(() => expect(t.service.state.getState().pane).toBe('nav'));
});

test('mouse: ctrl-click toggles, shift-click selects a range, a plain click opens', async () => {
	const t = await fixture({ settings: { openOnSelect: true } });
	t.view(<ListPane />);
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	await waitFor(() => expect(notePaths()).toHaveLength(3));
	const row = (name: string) => document.querySelector(`[data-note-path="Work/${name}.md"]`) as HTMLElement;
	fireEvent.click(row('a'));
	// A click opens in a tab of its own, or activates the tab that already shows the note.
	expect(t.calls).toContainEqual(['open', 'Work/a.md', { newTab: true, reuse: true }]);
	fireEvent.click(row('c'), { ctrlKey: true });
	await waitFor(() => expect(selectedPaths()).toEqual(['Work/a.md', 'Work/c.md']));
	fireEvent.click(row('b'));
	fireEvent.click(row('c'), { shiftKey: true });
	await waitFor(() => expect(selectedPaths()).toEqual(['Work/b.md', 'Work/c.md']));
});

test('Alt flips where a click opens the note, and the setting can ask for the current tab', async () => {
	const t = await fixture({ settings: { openOnSelect: true } });
	t.view(<ListPane />);
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	await waitFor(() => expect(notePaths()).toHaveLength(3));
	const row = (name: string) => document.querySelector(`[data-note-path="Work/${name}.md"]`) as HTMLElement;
	fireEvent.click(row('b'), { altKey: true });
	expect(t.calls).toContainEqual(['open', 'Work/b.md', {}]);
	await t.settings.update((draft) => { draft.openFileIn = 'replace'; });
	fireEvent.click(row('c'));
	expect(t.calls).toContainEqual(['open', 'Work/c.md', {}]);
	fireEvent.click(row('a'), { altKey: true });
	expect(t.calls).toContainEqual(['open', 'Work/a.md', { newTab: true, reuse: true }]);
});

test('F2 renames in place: Enter commits, a conflict keeps the editor with an error, Escape cancels', async () => {
	const t = await fixture();
	t.view(<ListPane />);
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	await waitFor(() => expect(notePaths()).toHaveLength(3));
	const list = screen.getByRole('listbox');
	list.focus();
	fireEvent.keyDown(list, { key: 'ArrowDown' });
	fireEvent.keyDown(list, { key: 'F2' });
	const input = await screen.findByRole('textbox', { name: 'Rename' });
	expect((input as HTMLInputElement).value).toBe('a');
	fireEvent.change(input, { target: { value: 'taken' } });
	fireEvent.keyDown(input, { key: 'Enter' });
	await screen.findByRole('alert');
	expect(screen.getByRole('textbox', { name: 'Rename' })).toBeTruthy();
	fireEvent.change(input, { target: { value: 'renamed' } });
	fireEvent.keyDown(input, { key: 'Enter' });
	await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Rename' })).toBeNull());
	expect(t.calls).toContainEqual(['rename', 'Work/a.md', 'renamed']);
	fireEvent.keyDown(list, { key: 'F2' });
	const again = await screen.findByRole('textbox', { name: 'Rename' });
	fireEvent.keyDown(again, { key: 'Escape' });
	await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Rename' })).toBeNull());
});

test('renaming a YYYY-MM-DD-Name note selects only the Name, any other name is selected whole', async () => {
	const t = await fixture();
	t.vault.change([...t.vault.files, note('Work/2026-10-21-Untitled.md', 50)]);
	t.view(<ListPane />);
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	await waitFor(() => expect(notePaths()).toHaveLength(4));
	t.service.startRename('Work/2026-10-21-Untitled.md', false);
	const dated = await screen.findByRole('textbox', { name: 'Rename' }) as HTMLInputElement;
	expect([dated.selectionStart, dated.selectionEnd]).toEqual([11, 19]);
	fireEvent.keyDown(dated, { key: 'Escape' });
	await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Rename' })).toBeNull());
	t.service.startRename('Work/a.md', false);
	const plain = await screen.findByRole('textbox', { name: 'Rename' }) as HTMLInputElement;
	expect([plain.selectionStart, plain.selectionEnd]).toEqual([0, 1]);
});

test('IME composition does not trigger shortcuts', async () => {
	const t = await fixture();
	t.view(<ListPane />);
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	await waitFor(() => expect(notePaths()).toHaveLength(3));
	const list = screen.getByRole('listbox');
	fireEvent.keyDown(list, { key: 'ArrowDown', isComposing: true });
	expect(selectedPaths()).toEqual([]);
});

test('drop on a folder row moves the dragged notes; drop on a tag adds the tag', async () => {
	const t = await fixture();
	t.view(<><NavPane /><ListPane /></>);
	fireEvent.click(await screen.findByText('Work'));
	await waitFor(() => expect(notePaths()).toHaveLength(3));
	const data = new Map<string, string>();
	const transfer = { types: [] as string[], setData: (type: string, value: string) => { data.set(type, value); transfer.types = [...data.keys()]; }, getData: (type: string) => data.get(type) ?? '', effectAllowed: '', dropEffect: '' };
	fireEvent.dragStart(document.querySelector('[data-note-path="Work/b.md"]')!, { dataTransfer: transfer });
	const home = document.querySelector('[data-nav-key="folder:Home"]')!;
	fireEvent.dragOver(home, { dataTransfer: transfer });
	fireEvent.drop(home, { dataTransfer: transfer });
	await waitFor(() => expect(t.calls).toContainEqual(['move', ['Work/b.md'], 'Home']));
	fireEvent.drop(document.querySelector('[data-nav-key="tag:plan"]')!, { dataTransfer: transfer });
	await waitFor(() => expect(t.calls).toContainEqual(['addTag', ['Work/b.md'], 'plan']));
});

test('a folder hovered during a drag expands after a short delay', async () => {
	const t = await fixture();
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	t.vault.folderList.push('Work/Deep');
	t.vault.change(t.vault.files);
	t.view(<NavPane />);
	await screen.findByText('Work');
	vi.useFakeTimers();
	const transfer = { types: ['application/x-huhu-navigator'], getData: () => '["Home/d.md"]', dropEffect: '' };
	const row = document.querySelector('[data-nav-key="folder:Work"]')!;
	expect(row.getAttribute('aria-expanded')).toBe('false');
	fireEvent.dragOver(row, { dataTransfer: transfer });
	await act(async () => { await vi.advanceTimersByTimeAsync(800); });
	expect(document.querySelector('[data-nav-key="folder:Work"]')!.getAttribute('aria-expanded')).toBe('true');
});

test('single-pane mode shows one pane at a time', async () => {
	const t = await fixture({ settings: { layout: 'single' } });
	t.view(<NavigatorRoot />);
	await screen.findByRole('tree');
	const panes = () => [...document.querySelectorAll<HTMLElement>('[data-navigator-pane]')].map((pane) => [pane.dataset.navigatorPane, pane.parentElement!.hasAttribute('inert')]);
	expect(panes()).toEqual([['nav', false], ['list', true]]);
	fireEvent.click(await screen.findByText('Work'));
	await waitFor(() => expect(panes()).toEqual([['nav', true], ['list', false]]));
	fireEvent.click(screen.getByRole('button', { name: 'Back to folders' }));
	await waitFor(() => expect(panes()).toEqual([['nav', false], ['list', true]]));
});

test('"open navigator" in single-pane mode shows the list and moves keyboard focus into it', async () => {
	const t = await fixture({ settings: { layout: 'single', singleView: 'nav' } });
	t.view(<NavigatorRoot />);
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	await screen.findByRole('tree');
	act(() => { t.service.focusPane('list'); });
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('listbox')));
	const panes = [...document.querySelectorAll<HTMLElement>('[data-navigator-pane]')].map((pane) => [pane.dataset.navigatorPane, pane.parentElement!.hasAttribute('inert')]);
	expect(panes).toEqual([['nav', true], ['list', false]]);
	act(() => { t.service.focusPane('nav'); });
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tree')));
});

test('timers of the panes use the window that owns the panel', async () => {
	const t = await fixture();
	const spy = vi.spyOn(window, 'setTimeout');
	t.view(<NavPane />);
	await screen.findByText('Work');
	const transfer = { types: ['application/x-huhu-navigator'], getData: () => '[]', dropEffect: '' };
	fireEvent.dragOver(document.querySelector('[data-nav-key="folder:Work"]')!, { dataTransfer: transfer });
	// The owner document here is the test window; the spring timer is created through it, not a captured global.
	expect(spy).toHaveBeenCalled();
	spy.mockRestore();
});

test('a folder row shows the color the icons service resolves for it, files keep their type color', async () => {
	const t = await fixture();
	const palette = 'var(--color-orange)';
	t.env.resolveIcon = (target) => (target.kind === 'folder' && target.key.startsWith('Work') ? { icon: 'lucide-folder-closed', emoji: false, color: palette, isDefault: true } : { icon: null, emoji: false, color: null });
	const folder = t.view(<EntryIcon env={t.env} version={0} target={{ kind: 'folder', key: 'Work/Deep' }} />);
	expect(folder.container.querySelector<HTMLElement>('span.inline-flex')?.style.color).toBe(palette);
	const file = t.view(<EntryIcon env={t.env} version={0} target={{ kind: 'file', key: 'Work/report.pdf' }} />);
	expect(file.container.querySelector<HTMLElement>('span.inline-flex')?.style.color).toBe('var(--color-red)');
});

/** A tree of nested folders in a navigation pane, with the rows looked up by folder path. */
async function foldTree() {
	setLanguage('en');
	const vault = new FakeVault([note('A/B/C/x.md', 3), note('A/B/y.md', 2), note('A/z.md', 1)], ['/', 'A', 'A/B', 'A/B/C']);
	const { service } = await createTestService(vault, { settings: { showRoot: false } });
	const env: NavigatorEnv = {
		app: { scope: {}, keymap: { pushScope() {}, popScope() {} } } as never, service, isMac: false, resolveIcon: () => ({ icon: null, emoji: false, color: null }), subscribeIcons: () => () => undefined,
		imageUrl: (path) => path, copyPath: () => undefined, openSettings: () => undefined, openAppearance: () => undefined, askName: (_t, value) => Promise.resolve(value), report: (error) => { throw error instanceof Error ? error : new Error(String(error)); },
		previews: undefined as never,
	};
	render(<HuhuProviders ownerDocument={document}><NavigatorContext.Provider value={env}><div className="huhu-ui"><NavPane /></div></NavigatorContext.Provider></HuhuProviders>);
	const row = (path: string) => document.querySelector<HTMLElement>(`[data-nav-key="folder:${path}"]`);
	const a = await waitFor(() => { const found = row('A'); expect(found).toBeTruthy(); return found!; });
	return { service, row, a };
}

test('clicking a folder row selects it and unfolds it; children get indent guides and deep counts', async () => {
	const { service, row, a } = await foldTree();
	expect(within(a).getByText('3')).toBeTruthy();
	expect(row('A/B')).toBeNull();
	fireEvent.click(within(a).getByText('A'));
	await waitFor(() => expect(row('A/B')).toBeTruthy());
	expect(service.state.getState().context).toEqual({ kind: 'folder', key: 'A' });
	expect(within(row('A/B')!).getByText('2')).toBeTruthy();
	expect(row('A/B')!.querySelectorAll('[data-nav-guide]')).toHaveLength(1);
	fireEvent.click(row('A/B')!);
	await waitFor(() => expect(row('A/B/C')).toBeTruthy());
	expect(row('A/B/C')!.querySelectorAll('[data-nav-guide]')).toHaveLength(2);
	expect(row('A/B/C')!.querySelector('[data-nav-guide="1"]')?.getAttribute('data-active')).not.toBeNull();
});

test('a single click on an unfolded folder selects it without folding it', async () => {
	const { service, row } = await foldTree();
	fireEvent.click(row('A')!);
	await waitFor(() => expect(row('A/B')).toBeTruthy());
	fireEvent.click(row('A/B')!);
	await waitFor(() => expect(row('A/B/C')).toBeTruthy());
	// Back on the parent: it stays open, so its subfolders can be clicked next.
	fireEvent.click(row('A')!);
	expect(service.state.getState().context).toEqual({ kind: 'folder', key: 'A' });
	expect(row('A')!.getAttribute('aria-expanded')).toBe('true');
	expect(row('A/B')).toBeTruthy();
	expect(row('A/B/C')).toBeTruthy();
});

test('a double click folds an unfolded folder; its first click does not fold it first', async () => {
	const { row } = await foldTree();
	fireEvent.click(row('A')!, { detail: 1 });
	await waitFor(() => expect(row('A/B')).toBeTruthy());
	// The browser's double click: click, click (count 2), dblclick.
	fireEvent.click(row('A')!, { detail: 1 });
	expect(row('A/B')).toBeTruthy();
	fireEvent.click(row('A')!, { detail: 2 });
	expect(row('A/B')).toBeTruthy();
	fireEvent.doubleClick(row('A')!, { detail: 2 });
	await waitFor(() => expect(row('A/B')).toBeNull());
	expect(row('A')!.getAttribute('aria-expanded')).toBe('false');
});

test('a double click on a folded folder unfolds it once and leaves it open', async () => {
	const { service, row } = await foldTree();
	expect(row('A')!.getAttribute('aria-expanded')).toBe('false');
	fireEvent.click(row('A')!, { detail: 1 });
	await waitFor(() => expect(row('A/B')).toBeTruthy());
	fireEvent.click(row('A')!, { detail: 2 });
	fireEvent.doubleClick(row('A')!, { detail: 2 });
	expect(row('A/B')).toBeTruthy();
	expect(row('A')!.getAttribute('aria-expanded')).toBe('true');
	expect(service.state.getState().context).toEqual({ kind: 'folder', key: 'A' });
});

test('a lone double click toggles a folder, and the arrow toggles with every click', async () => {
	const { row } = await foldTree();
	fireEvent.doubleClick(row('A')!);
	await waitFor(() => expect(row('A/B')).toBeTruthy());
	fireEvent.doubleClick(row('A')!);
	await waitFor(() => expect(row('A/B')).toBeNull());
	const arrow = row('A')!.querySelector<HTMLElement>('span.inline-flex')!;
	fireEvent.click(arrow);
	await waitFor(() => expect(row('A/B')).toBeTruthy());
	fireEvent.click(arrow);
	await waitFor(() => expect(row('A/B')).toBeNull());
});
