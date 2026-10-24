// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { afterEach, expect, test, vi } from 'vitest';

/** A `Menu` with the internals the collector reads: items with DOM-like parts, sections and `sort()`. */
const fakes = vi.hoisted(() => {
	const classes = (...names: string[]) => ({ contains: (name: string) => names.includes(name) });
	class Item {
		titleEl = { textContent: '' };
		svg: string[] | null = null;
		iconEl = { querySelector: () => (this.svg ? { classList: this.svg } : null) };
		flags = new Set<string>(['menu-item']);
		dom = { classList: { contains: (name: string) => this.flags.has(name) } };
		disabled = false;
		checked: boolean | null = null;
		section = '';
		callback: ((event: unknown) => unknown) | undefined;
		submenu: InstanceType<typeof Menu> | null = null;
		setTitle(title: string) { this.titleEl.textContent = title; return this; }
		setIcon(icon: string) { this.svg = ['svg-icon', icon]; return this; }
		setSection(section: string) { this.section = section; return this; }
		setDisabled(disabled: boolean) { this.disabled = disabled; return this; }
		setChecked(checked: boolean) { this.checked = checked; return this; }
		setWarning(warning: boolean) { if (warning) this.flags.add('is-warning'); return this; }
		setIsLabel(label: boolean) { if (label) this.flags.add('is-label'); return this; }
		onClick(callback: (event: unknown) => unknown) { this.callback = callback; return this; }
		setSubmenu() { this.submenu ??= new Menu(); return this.submenu; }
	}
	class Separator { dom = { classList: classes('menu-separator') }; }
	class Menu {
		items: Array<Item | Separator> = [];
		sections: string[] = [];
		shown = 0;
		addSections(sections: string[]) { this.sections.push(...sections); return this; }
		addItem(callback: (item: Item) => void) { const item = new Item(); this.items.push(item); callback(item); return this; }
		addSeparator() { this.items.push(new Separator()); return this; }
		/** Groups by section in the order of `sections`, with a separator between groups, like Obsidian's. */
		sort() {
			const order = (item: Item | Separator) => { const at = this.sections.indexOf(item instanceof Item ? item.section : ''); return at < 0 ? this.sections.length : at; };
			const sorted = this.items.filter((entry) => entry instanceof Item).sort((a, b) => order(a) - order(b));
			const out: Array<Item | Separator> = [];
			sorted.forEach((entry, index) => { if (index > 0 && order(sorted[index - 1]!) !== order(entry)) out.push(new Separator()); out.push(entry); });
			this.items = out;
		}
		showAtPosition() { if (this.items.length) this.shown++; return this; }
	}
	return { Menu, Item };
});
vi.mock('obsidian', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), Menu: fakes.Menu }));
import { Menu, type App, type TAbstractFile } from 'obsidian';
import { collectHostMenu, HOST_MENU_SOURCE } from './host-menu';

type FakeMenu = InstanceType<typeof fakes.Menu>;
type Handler = (menu: FakeMenu, ...rest: unknown[]) => void;
const original = (Menu as unknown as { prototype: { showAtPosition: unknown } }).prototype.showAtPosition;
afterEach(() => { (Menu as unknown as { prototype: { showAtPosition: unknown } }).prototype.showAtPosition = original; });

class Click { constructor(public type: string, public init: { ctrlKey: boolean; metaKey: boolean }) {} }

function fixture() {
	const handlers: Record<string, Handler[]> = {};
	const triggered: Array<[string, unknown[]]> = [];
	const root = { path: '/', isRoot: () => true };
	const files: Record<string, unknown> = { 'Work/a.md': { path: 'Work/a.md' }, 'Work/b.md': { path: 'Work/b.md' }, Work: { path: 'Work' } };
	const app = {
		vault: { getRoot: () => root, getAbstractFileByPath: (path: string) => files[path] ?? null },
		workspace: {
			containerEl: { ownerDocument: { defaultView: { MouseEvent: Click } } },
			trigger: (name: string, ...args: unknown[]) => { triggered.push([name, args.slice(1)]); for (const handler of handlers[name] ?? []) (handler as (...all: unknown[]) => void)(...args); },
		},
	} as unknown as App;
	const on = (name: string, handler: Handler) => { (handlers[name] ??= []).push(handler); };
	return { app, on, triggered, root, files };
}

const titles = (nodes: ReturnType<typeof collectHostMenu>) => nodes.map((node) => (node.kind === 'separator' ? '|' : node.title));

test('a single entry triggers file-menu with the file explorer source, and the added items are read back in section order', () => {
	const t = fixture();
	t.on('file-menu', (menu) => {
		menu.addItem((item) => item.setSection('danger').setTitle('Delete forever').setWarning(true).setIcon('lucide-trash-2'));
		menu.addItem((item) => item.setSection('system').setTitle('Open in default app').setIcon('lucide-arrow-up-right'));
		menu.addItem((item) => item.setSection('action').setTitle('Bookmark…').setChecked(true).setDisabled(true));
		menu.addItem((item) => item.setSection('action').setTitle('A heading').setIsLabel(true));
	});
	const nodes = collectHostMenu(t.app, ['Work/a.md'], false);
	expect(t.triggered).toEqual([['file-menu', [t.files['Work/a.md'], HOST_MENU_SOURCE, null]]]);
	expect(HOST_MENU_SOURCE).toBe('file-explorer-context-menu');
	expect(titles(nodes)).toEqual(['Bookmark…', '|', 'Open in default app', '|', 'Delete forever']);
	expect(nodes[0]).toMatchObject({ kind: 'item', title: 'Bookmark…', disabled: true, checked: true, warning: false, icon: undefined });
	expect(nodes[2]).toMatchObject({ icon: 'lucide-arrow-up-right', warning: false });
	expect(nodes[4]).toMatchObject({ icon: 'lucide-trash-2', warning: true });
});

test('several entries trigger files-menu with all of them; the vault folder is the root', () => {
	const t = fixture();
	collectHostMenu(t.app, ['Work/a.md', 'Work/b.md'], false);
	expect(t.triggered).toEqual([['files-menu', [[t.files['Work/a.md'], t.files['Work/b.md']], HOST_MENU_SOURCE, null]]]);
	t.triggered.length = 0;
	collectHostMenu(t.app, ['/'], false);
	expect(t.triggered[0]![1][0]).toBe(t.root);
});

test('paths that no longer exist give an empty menu without triggering anything', () => {
	const t = fixture();
	expect(collectHostMenu(t.app, ['Gone.md'], false)).toEqual([]);
	expect(t.triggered).toEqual([]);
});

test('submenus are read, and running an entry calls its handler with a modifier click so it opens in a tab of its own', async () => {
	const t = fixture();
	const run = vi.fn();
	t.on('file-menu', (menu) => {
		menu.addItem((item) => {
			item.setSection('info').setTitle('Copy path').setIcon('lucide-clipboard');
			item.setSubmenu().addItem((child) => child.setTitle('as Obsidian URL').setIcon('lucide-link').onClick(run));
		});
	});
	const [copy] = collectHostMenu(t.app, ['Work'], false);
	expect(copy).toMatchObject({ title: 'Copy path', icon: 'lucide-clipboard' });
	const child = (copy as { children: Array<{ title: string; run(): Promise<unknown> }> }).children[0]!;
	expect(child.title).toBe('as Obsidian URL');
	await child.run();
	expect(run.mock.calls[0]![0]).toMatchObject({ type: 'click', init: { ctrlKey: true, metaKey: false } });
	const [mac] = collectHostMenu(t.app, ['Work'], true);
	await (mac as { children: Array<{ run(): Promise<unknown> }> }).children[0]!.run();
	expect(run.mock.calls[1]![0]).toMatchObject({ init: { ctrlKey: false, metaKey: true } });
});

test('entries a plugin queues for the next shown menu (Iconic) land in the collected menu and nothing is shown or left queued', () => {
	const t = fixture();
	const proto = (Menu as unknown as { prototype: { showAtPosition(this: FakeMenu, ...args: unknown[]): unknown } }).prototype;
	const unpatched = proto.showAtPosition;
	let queued: Array<(menu: FakeMenu) => void> = [];
	proto.showAtPosition = function (this: FakeMenu, ...args: unknown[]) {
		for (const action of queued.splice(0)) action(this);
		return unpatched.apply(this, args);
	};
	t.on('file-menu', () => { queued.push((menu) => menu.addItem((item) => item.setSection('action').setTitle('Change icon').setIcon('lucide-image-plus'))); });
	const nodes = collectHostMenu(t.app, ['Work/a.md'], false);
	expect(titles(nodes)).toEqual(['Change icon']);
	expect(queued).toEqual([]);
	// A native menu shown afterwards is not given the entries of a menu that was never shown.
	const later = new fakes.Menu();
	later.showAtPosition();
	expect(later.items).toEqual([]);
	queued = [];
});

test('a failing handler gives an empty menu instead of an error', () => {
	const t = fixture();
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	t.on('file-menu', () => { throw new Error('plugin bug'); });
	expect(collectHostMenu(t.app, ['Work/a.md'], false)).toEqual([]);
	expect(warn).toHaveBeenCalled();
	warn.mockRestore();
});
