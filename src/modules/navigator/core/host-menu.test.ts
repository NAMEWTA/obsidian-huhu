// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test } from 'vitest';
import { OWN, planHostMenu, type HostMenuItem, type HostMenuNode } from './host-menu';

const item = (title: string, extra: Partial<HostMenuItem> = {}): HostMenuItem => ({ kind: 'item', title, disabled: false, warning: false, run: () => undefined, ...extra });
const separator: HostMenuNode = { kind: 'separator' };
const titles = (nodes: readonly HostMenuNode[]): string[] => nodes.map((node) => (node.kind === 'separator' ? '|' : node.title));
const ids = (...own: string[]) => new Set(own);

test('entries the navigator has of its own are left out, whatever language the host speaks', () => {
	const host: HostMenuNode[] = [
		item('Move file to...', { icon: 'lucide-folder-tree' }),
		separator,
		item('Open in default app', { icon: 'lucide-arrow-up-right' }),
		item('Show in system explorer', { icon: 'lucide-arrow-up-right' }),
		item('Bookmark...', { icon: 'lucide-bookmark' }),
	];
	expect(titles(planHostMenu(host, ids(OWN.move, OWN.reveal, OWN.openDefault), []).nodes)).toEqual(['Bookmark...']);
	// Without the own versions (a folder has no move entry; mobile has no system file manager) the host's stay.
	expect(titles(planHostMenu(host, ids(), []).nodes)).toEqual(['Move file to...', '|', 'Open in default app', 'Show in system explorer', 'Bookmark...']);
	// Each own entry only covers its own host twin.
	expect(titles(planHostMenu(host, ids(OWN.reveal), []).nodes)).toEqual(['Move file to...', '|', 'Bookmark...']);
});

test('an entry whose title equals one of the navigator labels is a duplicate, ignoring case and a trailing ellipsis', () => {
	const host = [item('Open in new tab'), item('Rename…'), item('Bookmark...')];
	expect(titles(planHostMenu(host, ids(), ['open in new tab', 'Rename...']).nodes)).toEqual(['Bookmark...']);
});

test('the host copy-path submenu replaces the own copy-path entry', () => {
	const copy = item('Copy path', { icon: 'lucide-clipboard', children: [item('as Obsidian URL', { icon: 'lucide-link' }), item('from vault folder', { icon: 'vault' })] });
	const plan = planHostMenu([copy, item('Bookmark...')], ids(OWN.copyPath), []);
	expect(plan.replaced).toEqual([OWN.copyPath]);
	expect(titles(plan.nodes)).toEqual(['Copy path', 'Bookmark...']);
	expect(planHostMenu([copy], ids(), []).replaced).toEqual([]);
});

test('separators are tidy: none first, none last, none twice, and none left around dropped entries', () => {
	const host: HostMenuNode[] = [separator, item('A'), separator, item('Move file to...', { icon: 'lucide-folder-tree' }), separator, item('B'), separator, separator];
	expect(titles(planHostMenu(host, ids(OWN.move), []).nodes)).toEqual(['A', '|', 'B']);
});

test('submenus are cleaned and dropped when nothing is left in them', () => {
	const empty = item('Empty', { children: [item('Move file to...', { icon: 'lucide-folder-tree' })] });
	const full = item('More', { children: [item('One'), separator, separator, item('Two'), separator] });
	const plan = planHostMenu([empty, full], ids(OWN.move), []);
	expect(titles(plan.nodes)).toEqual(['More']);
	expect(titles((plan.nodes[0] as HostMenuItem).children!)).toEqual(['One', '|', 'Two']);
});
