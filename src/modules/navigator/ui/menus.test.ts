// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test, vi } from 'vitest';
import { setLanguage } from '../../../shared/i18n';
import type { HostMenuItem, HostMenuNode } from '../core/host-menu';
import type { NavRow } from '../core/nav-tree';
import { FakeVault, createTestService, note } from '../services/test-support';
import type { NavigatorEnv } from './env';
import { navMenu, noteMenu } from './menus';

const item = (title: string, extra: Partial<HostMenuItem> = {}): HostMenuItem => ({ kind: 'item', title, disabled: false, warning: false, run: () => undefined, ...extra });

async function fixture(extra: Partial<NavigatorEnv> = {}, language: 'en' | 'zh' = 'en') {
	setLanguage(language);
	const vault = new FakeVault([note('Work/a.md', 3), note('Work/b.md', 2)], ['/', 'Work']);
	const t = await createTestService(vault);
	const reports: unknown[] = [];
	const env: NavigatorEnv = {
		app: {} as never,
		service: t.service,
		previews: undefined as never,
		isMac: false,
		resolveIcon: () => ({ icon: null, emoji: false, color: null }),
		subscribeIcons: () => () => undefined,
		imageUrl: (path) => path,
		copyPath: vi.fn(),
		openSettings: () => undefined,
		openAppearance: () => undefined,
		askName: (_title, value) => Promise.resolve(value),
		report: (error) => { reports.push(error); },
		...extra,
	};
	const row = (key: string): NavRow => {
		const found = t.service.navTree().rows.find((candidate) => candidate.key === key);
		if (!found) throw new Error(`no row ${key}`);
		return found;
	};
	return { env, row, reports, service: t.service };
}

const ids = (entries: ReadonlyArray<{ id: string }>) => entries.map((entry) => entry.id);
const find = <T extends { id: string }>(entries: readonly T[], id: string) => entries.find((entry) => entry.id === id);

test('a folder menu on desktop shows the folder in the system file manager, right above Copy path', async () => {
	const showInFolder = vi.fn(() => Promise.resolve());
	const t = await fixture({ showInFolder });
	const menu = navMenu(t.env, t.row('folder:Work'));
	const reveal = find(menu, 'reveal')!;
	expect(reveal.label).toBe('Show in system explorer');
	expect(reveal.separatorBefore).toBe(true);
	expect(ids(menu).slice(-3)).toEqual(['reveal', 'copy-path', 'delete']);
	expect(find(menu, 'copy-path')!.separatorBefore).toBe(false);
	await reveal.run();
	expect(showInFolder).toHaveBeenCalledWith('Work');
	// The vault folder itself can be shown too.
	await find(navMenu(t.env, t.row('folder:/')), 'reveal')!.run();
	expect(showInFolder).toHaveBeenLastCalledWith('/');
});

test('the entry is named after the platform and the language', async () => {
	const showInFolder = () => Promise.resolve();
	const mac = await fixture({ showInFolder, isMac: true });
	expect(find(navMenu(mac.env, mac.row('folder:Work')), 'reveal')!.label).toBe('Reveal in Finder');
	const zh = await fixture({ showInFolder }, 'zh');
	expect(find(navMenu(zh.env, zh.row('folder:Work')), 'reveal')!.label).toBe('在系统资源管理器中显示');
	const zhMac = await fixture({ showInFolder, isMac: true }, 'zh');
	expect(find(navMenu(zhMac.env, zhMac.row('folder:Work')), 'reveal')!.label).toBe('在访达中显示');
});

test('where there is no system file manager (mobile) folder and note menus do not offer it', async () => {
	const t = await fixture();
	expect(ids(navMenu(t.env, t.row('folder:Work')))).not.toContain('reveal');
	expect(ids(noteMenu(t.env, 'Work/a.md'))).not.toContain('reveal');
	expect(ids(noteMenu(t.env, 'Work/a.md'))).not.toContain('open-default');
	expect(ids(noteMenu(t.env, 'Work/a.md'))).not.toContain('open-right');
	expect(find(navMenu(t.env, t.row('folder:Work')), 'copy-path')!.separatorBefore).toBe(true);
});

test('a note menu on desktop opens the note to the right or in its default app, and shows it in the file manager', async () => {
	const showInFolder = vi.fn(() => Promise.resolve());
	const openInDefaultApp = vi.fn(() => Promise.resolve());
	const t = await fixture({ showInFolder, openInDefaultApp, canSplit: true });
	const menu = noteMenu(t.env, 'Work/a.md');
	expect(find(menu, 'open-default')!.label).toBe('Open in default app');
	expect(ids(menu).slice(-5)).toEqual(['hide', 'open-default', 'reveal', 'copy-path', 'delete']);
	await find(menu, 'reveal')!.run();
	await find(menu, 'open-default')!.run();
	expect(showInFolder).toHaveBeenCalledWith('Work/a.md');
	expect(openInDefaultApp).toHaveBeenCalledWith('Work/a.md');
	expect(find(menu, 'open-right')!.label).toBe('Open to the right');
	expect(ids(menu).indexOf('open-right')).toBe(ids(menu).indexOf('open-tab') + 1);
	void find(menu, 'open-right')!.run();
});

test('with several notes selected the per-file entries are disabled', async () => {
	const t = await fixture({ showInFolder: () => Promise.resolve(), openInDefaultApp: () => Promise.resolve(), canSplit: true });
	t.service.selectContext({ kind: 'folder', key: 'Work' });
	t.service.selectNote('Work/a.md', 'only');
	t.service.selectNote('Work/b.md', 'toggle');
	const menu = noteMenu(t.env, 'Work/a.md');
	for (const id of ['reveal', 'open-default', 'open-right', 'copy-path']) expect(find(menu, id)!.disabled).toBe(true);
});

test('a failure to show the file is reported, not thrown', async () => {
	const t = await fixture({ showInFolder: () => Promise.reject(new Error('no file manager')) });
	await find(navMenu(t.env, t.row('folder:Work')), 'reveal')!.run();
	expect(t.reports).toEqual([new Error('no file manager')]);
});

test("the host's menu items follow the navigator's own after a separator, without duplicates", async () => {
	const bookmark = vi.fn();
	const hostMenu = vi.fn((): HostMenuNode[] => [
		item('Move file to...', { icon: 'lucide-folder-tree' }),
		{ kind: 'separator' },
		item('Bookmark...', { icon: 'lucide-bookmark', run: bookmark }),
		item('Open in new window', { icon: 'lucide-picture-in-picture-2' }),
		item('Copy path', { icon: 'lucide-clipboard', children: [item('as Obsidian URL', { icon: 'lucide-link' }), item('from vault folder', { icon: 'vault' })] }),
		item('Change icon', { icon: 'lucide-image-plus' }),
	]);
	const t = await fixture({ showInFolder: () => Promise.resolve(), openInDefaultApp: () => Promise.resolve(), hostMenu });
	const menu = noteMenu(t.env, 'Work/a.md');
	expect(hostMenu).toHaveBeenCalledWith(['Work/a.md']);
	const own = ids(menu).findIndex((id) => id.startsWith('host-'));
	// Own entries first, then the host's after a separator, and Delete stays last behind its own separator.
	expect(menu[own]!.separatorBefore).toBe(true);
	expect(menu.at(-1)).toMatchObject({ id: 'delete', separatorBefore: true });
	const host = menu.slice(own, -1);
	expect(host.map((entry) => entry.label)).toEqual(['Bookmark...', 'Open in new window', 'Copy path', 'Change icon']);
	// "Move to…" and the flat "Copy path" are the host's or the navigator's, never both.
	expect(host.map((entry) => entry.label)).not.toContain('Move file to...');
	expect(ids(menu)).not.toContain('copy-path');
	expect(ids(menu)).toContain('move');
	expect(host[0]!.separatorBefore).toBe(true);
	expect(host[2]!.children!.map((entry) => entry.label)).toEqual(['as Obsidian URL', 'from vault folder']);
	expect(host[2]!.iconName).toBe('lucide-clipboard');
	await host[0]!.run();
	expect(bookmark).toHaveBeenCalledOnce();
});

test("a folder keeps the host's Move entry, which the navigator's folder menu lacks", async () => {
	const hostMenu = () => [item('Move folder to...', { icon: 'lucide-folder-tree' }), item('New canvas', { icon: 'lucide-layout-dashboard' })];
	const t = await fixture({ hostMenu });
	const menu = navMenu(t.env, t.row('folder:Work'));
	expect(menu.slice(-3).map((entry) => entry.label)).toEqual(['Move folder to...', 'New canvas', 'Delete']);
	expect(menu.at(-3)!.separatorBefore).toBe(true);
	expect(menu.at(-1)!.separatorBefore).toBe(true);
});

test("a host that throws or has nothing to add leaves the navigator's menu as it was", async () => {
	const plain = await fixture();
	const empty = await fixture({ hostMenu: () => [] });
	expect(ids(noteMenu(empty.env, 'Work/a.md'))).toEqual(ids(noteMenu(plain.env, 'Work/a.md')));
	expect(ids(navMenu(empty.env, empty.row('folder:Work')))).toEqual(ids(navMenu(plain.env, plain.row('folder:Work'))));
});

test('failures of a host entry are reported', async () => {
	const t = await fixture({ hostMenu: () => [item('Broken', { run: () => Promise.reject(new Error('plugin failed')) })] });
	const broken = noteMenu(t.env, 'Work/a.md').find((entry) => entry.label === 'Broken')!;
	await broken.run();
	expect(t.reports).toEqual([new Error('plugin failed')]);
});

test('recent rows get the host menu and Show in system explorer too', async () => {
	const hostMenu = vi.fn(() => [item('Bookmark...')]);
	const t = await fixture({ showInFolder: () => Promise.resolve(), hostMenu });
	const row = { kind: 'recent', key: 'recent:Work/a.md', path: 'Work/a.md', label: 'a', depth: 1, context: null, hasChildren: false, expanded: false, count: 0 } as unknown as NavRow;
	const menu = navMenu(t.env, row);
	expect(ids(menu)).toEqual(['open-tab', 'reveal', 'remove', 'clear', 'host-0']);
	expect(hostMenu).toHaveBeenCalledWith(['Work/a.md']);
});
