// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { Menu, type App, type TAbstractFile } from 'obsidian';
import type { HostMenuItem, HostMenuNode } from '../core/host-menu';
import { ROOT_FOLDER } from '../core/types';

/**
 * The source Obsidian's file explorer passes with `file-menu`. The navigator is the file explorer's stand-in, and
 * several core entries (new canvas, new base) and plugin entries only appear for this source.
 */
export const HOST_MENU_SOURCE = 'file-explorer-context-menu';

/** Section order of the file explorer's own menu, so entries come out in the order Obsidian would show them. */
const SECTIONS = ['title', 'open', 'action-primary', 'action', 'info', 'info.copy', 'view', 'system', '', 'danger'];

/** What of Obsidian's `Menu` the `file-menu` handlers and the menu's own sorting leave behind. None of it is public API. */
interface InternalItem {
	titleEl?: HTMLElement;
	iconEl?: HTMLElement;
	dom?: HTMLElement;
	disabled?: boolean;
	checked?: boolean | null;
	submenu?: InternalMenu | null;
	callback?: (event: MouseEvent) => unknown;
}
interface InternalMenu {
	items?: unknown[];
	sections?: string[];
	addSections?: (sections: string[]) => unknown;
	sort?: () => unknown;
}

const internal = (menu: Menu): Menu & InternalMenu => menu;

/** The icon id of an item: its `<svg>` carries it next to the `svg-icon` class. */
function iconOf(iconEl: HTMLElement | undefined): string | undefined {
	const svg = iconEl?.querySelector('svg');
	if (!svg) return undefined;
	return Array.from(svg.classList).find((name) => name !== 'svg-icon' && !name.startsWith('svg-'));
}

/**
 * Plugins that add entries by patching `Menu.showAtPosition` (Iconic does) only act when a menu is shown, and keep
 * them queued until then. Run the patched method against an empty stand-in whose `addItem` hands over to `menu`: their
 * entries land in `menu` and nothing is shown, and no queue is left to surface in some later, unrelated menu.
 */
function completeMenu(menu: Menu): void {
	const standIn = new Menu();
	standIn.addItem = (callback) => { menu.addItem(callback); return standIn; };
	standIn.addSeparator = () => { menu.addSeparator(); return standIn; };
	internal(standIn).sections = internal(menu).sections;
	standIn.showAtPosition({ x: 0, y: 0 });
}

function nodesOf(items: readonly unknown[] | undefined, event: () => MouseEvent): HostMenuNode[] {
	const nodes: HostMenuNode[] = [];
	for (const entry of items ?? []) {
		const item = entry as InternalItem;
		if (item.dom?.classList.contains('menu-separator')) { nodes.push({ kind: 'separator' }); continue; }
		const title = item.titleEl?.textContent?.trim();
		// Labels (a section heading) are not actions.
		if (!title || item.dom?.classList.contains('is-label')) continue;
		let children: HostMenuNode[] | undefined;
		if (item.submenu) {
			item.submenu.sort?.();
			children = nodesOf(item.submenu.items, event);
		}
		const node: HostMenuItem = {
			kind: 'item',
			title,
			icon: iconOf(item.iconEl),
			disabled: !!item.disabled,
			checked: typeof item.checked === 'boolean' ? item.checked : undefined,
			warning: !!item.dom?.classList.contains('is-warning'),
			children,
			run: async () => { await item.callback?.(event()); },
		};
		nodes.push(node);
	}
	return nodes;
}

/**
 * What Obsidian and the other plugins add to the context menu of these vault entries: `file-menu` for one entry,
 * `files-menu` for several. Never shows a menu, and never throws: a plugin whose handler fails just contributes nothing.
 */
export function collectHostMenu(app: App, paths: readonly string[], isMac: boolean): HostMenuNode[] {
	const entries = paths.flatMap((path): TAbstractFile[] => {
		const found = path === ROOT_FOLDER || path === '' ? app.vault.getRoot() : app.vault.getAbstractFileByPath(path);
		return found ? [found] : [];
	});
	const first = entries[0];
	if (!first) return [];
	const win = app.workspace.containerEl?.ownerDocument.defaultView ?? window;
	// A modifier click: entries that open something do it in a tab of their own instead of replacing the workbench tab.
	const event = () => new win.MouseEvent('click', { ctrlKey: !isMac, metaKey: isMac });
	try {
		const menu = new Menu();
		internal(menu).addSections?.(SECTIONS);
		if (entries.length === 1) app.workspace.trigger('file-menu', menu, first, HOST_MENU_SOURCE, null);
		else app.workspace.trigger('files-menu', menu, entries, HOST_MENU_SOURCE, null);
		completeMenu(menu);
		internal(menu).sort?.();
		return nodesOf(internal(menu).items, event);
	} catch (error) {
		console.warn('[HUHU navigator] the file menu of the host could not be read', error);
		return [];
	}
}
