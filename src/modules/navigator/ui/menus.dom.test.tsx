// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { beforeAll, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HuhuProviders } from '../../../ui/react/providers';
import { setLanguage } from '../../../shared/i18n';
import type { HostMenuNode } from '../core/host-menu';
import { createMemoryCache } from '../platform/cache-store';
import { PreviewStore } from '../platform/preview-store';
import { FakeVault, createTestService, note } from '../services/test-support';
import type { NavigatorEnv } from './env';
import { NavigatorContext } from './hooks';
import { ListPane } from './ListPane';
import { NavPane } from './NavPane';

vi.mock('obsidian', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), Platform: { isMacOS: false, isPhone: false, isMobile: false } }));

beforeAll(() => {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 600, width: 300, height: 600, toJSON: () => ({}) } as DOMRect);
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 600 });
	Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 300 });
	Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
	globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
	HTMLElement.prototype.scrollIntoView = () => {};
});

async function fixture(extra: Partial<NavigatorEnv>) {
	setLanguage('en');
	const vault = new FakeVault([note('Work/a.md', 3), note('Work/b.md', 2)], ['/', 'Work']);
	const { service } = await createTestService(vault);
	const previews = new PreviewStore({
		cache: createMemoryCache(),
		source: { mtime: () => 1, isMarkdown: () => true, readText: () => Promise.resolve(''), propertyImage: () => undefined, resolveImage: () => null, title: () => '', metadataReady: () => true },
		scheduler: { now: () => 0, yield: () => Promise.resolve(), later: (callback) => { const handle = setTimeout(callback, 0); return () => clearTimeout(handle); } },
		imageProperties: () => [],
	});
	const env: NavigatorEnv = {
		app: { scope: {}, keymap: { pushScope() {}, popScope() {} } } as never, service, previews, isMac: false,
		resolveIcon: () => ({ icon: null, emoji: false, color: null }), subscribeIcons: () => () => undefined, imageUrl: (path) => path,
		copyPath: () => undefined, openSettings: () => undefined, openAppearance: () => undefined, askName: (_title, value) => Promise.resolve(value),
		report: (error) => { throw error instanceof Error ? error : new Error(String(error)); },
		...extra,
	};
	const view = (node: React.ReactNode) => render(<HuhuProviders ownerDocument={document}><NavigatorContext.Provider value={env}><div className="huhu-ui">{node}</div></NavigatorContext.Provider></HuhuProviders>);
	return { service, view };
}

const host = (run: () => void): HostMenuNode[] => [
	{ kind: 'item', title: 'Bookmark...', icon: 'lucide-bookmark', disabled: false, warning: false, run },
	{ kind: 'item', title: 'Copy path', icon: 'lucide-clipboard', disabled: false, warning: false, run: () => undefined, children: [
		{ kind: 'item', title: 'as Obsidian URL', icon: 'lucide-link', disabled: false, warning: false, run },
	] },
];

test('a folder row offers Show in system explorer, and the host entries follow in their own group with a working submenu', async () => {
	const showInFolder = vi.fn(() => Promise.resolve());
	const bookmark = vi.fn();
	const t = await fixture({ showInFolder, hostMenu: () => host(bookmark) });
	t.view(<NavPane />);
	fireEvent.contextMenu((await screen.findByText('Work')).closest('[data-nav-key]')!);
	const entries = (await screen.findAllByRole('menuitem')).map((entry) => entry.textContent);
	// The host's "Copy path" submenu takes the place of the navigator's flat entry.
	expect(entries.slice(-4)).toEqual(['Show in system explorer', 'Bookmark...', 'Copy path', 'Delete']);
	// The host group is set off by a separator.
	expect(screen.getAllByRole('separator').length).toBeGreaterThan(1);
	choose(screen.getByRole('menuitem', { name: 'Bookmark...' }));
	expect(bookmark).toHaveBeenCalledOnce();
	fireEvent.contextMenu((await screen.findByText('Work')).closest('[data-nav-key]')!);
	choose(await screen.findByRole('menuitem', { name: 'Show in system explorer' }));
	expect(showInFolder).toHaveBeenCalledWith('Work');
});

test('a host submenu opens and runs its entries', async () => {
	const url = vi.fn();
	const t = await fixture({ hostMenu: () => host(url) });
	t.view(<NavPane />);
	fireEvent.contextMenu((await screen.findByText('Work')).closest('[data-nav-key]')!);
	// The navigator's own flat "Copy path" gives way to the host's submenu of that name.
	const copies = await screen.findAllByRole('menuitem', { name: 'Copy path' });
	expect(copies).toHaveLength(1);
	expect(copies[0]!.getAttribute('aria-haspopup')).toBe('menu');
	copies[0]!.focus();
	fireEvent.keyDown(copies[0]!, { key: 'ArrowRight' });
	choose(await screen.findByRole('menuitem', { name: 'as Obsidian URL' }));
	expect(url).toHaveBeenCalledOnce();
});

test('a note row in the list offers the same entries', async () => {
	const showInFolder = vi.fn(() => Promise.resolve());
	const openInDefaultApp = vi.fn(() => Promise.resolve());
	const t = await fixture({ showInFolder, openInDefaultApp, canSplit: true });
	t.view(<><NavPane /><ListPane /></>);
	fireEvent.click(await screen.findByText('Work'));
	await waitFor(() => expect(document.querySelectorAll('[data-note-path]')).toHaveLength(2));
	fireEvent.contextMenu(document.querySelector('[data-note-path="Work/a.md"]')!);
	choose(await screen.findByRole('menuitem', { name: 'Show in system explorer' }));
	expect(showInFolder).toHaveBeenCalledWith('Work/a.md');
	fireEvent.contextMenu(document.querySelector('[data-note-path="Work/a.md"]')!);
	choose(await screen.findByRole('menuitem', { name: 'Open in default app' }));
	expect(openInDefaultApp).toHaveBeenCalledWith('Work/a.md');
	fireEvent.contextMenu(document.querySelector('[data-note-path="Work/a.md"]')!);
	expect(await screen.findByRole('menuitem', { name: 'Open to the right' })).toBeTruthy();
});

test('without the desktop capabilities none of those entries appear', async () => {
	const t = await fixture({});
	t.view(<><NavPane /><ListPane /></>);
	fireEvent.click(await screen.findByText('Work'));
	await waitFor(() => expect(document.querySelectorAll('[data-note-path]')).toHaveLength(2));
	fireEvent.contextMenu(document.querySelector('[data-note-path="Work/a.md"]')!);
	await screen.findByRole('menuitem', { name: 'Delete' });
	for (const name of ['Show in system explorer', 'Open in default app', 'Open to the right']) expect(screen.queryByRole('menuitem', { name })).toBeNull();
});

test('the release of the right click that opened the menu does not choose an item; a fresh press or a moment later does', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	try {
		const copyPath = vi.fn();
		const t = await fixture({ copyPath });
		t.view(<NavPane />);
		const row = (await screen.findByText('Work')).closest('[data-nav-key]')!;
		fireEvent.contextMenu(row);
		const copy = await screen.findByRole('menuitem', { name: 'Copy path' });
		// Released right away, as over a menu that flipped up under the pointer: nothing runs, the menu stays.
		fireEvent.pointerUp(copy);
		fireEvent.click(copy);
		expect(copyPath).not.toHaveBeenCalled();
		expect(screen.queryByRole('menuitem', { name: 'Copy path' })).toBeTruthy();
		// A new press inside the menu is a real choice.
		fireEvent.pointerDown(copy);
		fireEvent.click(copy);
		expect(copyPath).toHaveBeenCalledTimes(1);
		// Without a press, an item is accepted once the guard time has passed.
		fireEvent.contextMenu(row);
		const again = await screen.findByRole('menuitem', { name: 'Copy path' });
		vi.setSystemTime(Date.now() + 400);
		fireEvent.click(again);
		expect(copyPath).toHaveBeenCalledTimes(2);
	} finally { vi.useRealTimers(); }
});

/** Choosing a menu item takes a press inside the menu; the release of the right click that opened it does not count. */
function choose(item: Element) {
	fireEvent.pointerDown(item);
	fireEvent.click(item);
}
