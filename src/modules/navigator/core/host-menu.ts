// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.

/**
 * The entries Obsidian itself and other plugins add to a file's context menu (the `file-menu` event), read out of
 * the menu they were added to so the navigator can show them in its own menu.
 */
export interface HostMenuItem {
	kind: 'item';
	title: string;
	/** An Obsidian icon id such as `lucide-link`. */
	icon?: string;
	disabled: boolean;
	checked?: boolean;
	/** Obsidian's red "warning" style, used for destructive entries. */
	warning: boolean;
	/** A submenu; the item itself does nothing then. */
	children?: HostMenuNode[];
	run(): void | Promise<unknown>;
}

export type HostMenuNode = HostMenuItem | { kind: 'separator' };

/** Icons Obsidian's core entries use, so they can be recognised in every language. */
const ICON_MOVE = 'lucide-folder-tree';
const ICON_SYSTEM = 'lucide-arrow-up-right';
const ICON_COPY_PATH = 'lucide-clipboard';

/** Ids of the navigator's own entries that stand in for entries the host adds. */
export const OWN = { move: 'move', copyPath: 'copy-path', reveal: 'reveal', openDefault: 'open-default' } as const;

export interface HostMenuPlan {
	/** The host entries to show, without duplicates and with tidy separators. */
	nodes: HostMenuNode[];
	/** Own entries the host version replaces (the host's "Copy path" submenu has the vault path, URL and full path). */
	replaced: string[];
}

const same = (left: string, right: string) => left.replace(/[….]+$/, '').trim().toLowerCase() === right.replace(/[….]+$/, '').trim().toLowerCase();

/**
 * Drop what the navigator's menu already offers, and tidy what is left.
 * - "Move file to…", "Open in default app" and "Show in system explorer" are the navigator's own entries when it has them.
 * - A host "Copy path" submenu replaces the navigator's single "Copy path" entry.
 * - Any other entry whose title equals one of the navigator's labels is a duplicate.
 */
export function planHostMenu(nodes: readonly HostMenuNode[], ownIds: ReadonlySet<string>, ownLabels: readonly string[]): HostMenuPlan {
	const replaced: string[] = [];
	const covered = (item: HostMenuItem): boolean => {
		if (item.icon === ICON_MOVE && ownIds.has(OWN.move)) return true;
		if (item.icon === ICON_SYSTEM && (ownIds.has(OWN.reveal) || ownIds.has(OWN.openDefault))) return true;
		return ownLabels.some((label) => same(label, item.title));
	};
	const clean = (list: readonly HostMenuNode[], top: boolean): HostMenuNode[] => {
		const out: HostMenuNode[] = [];
		for (const node of list) {
			if (node.kind === 'separator') {
				if (out.length && out[out.length - 1]!.kind !== 'separator') out.push(node);
				continue;
			}
			if (node.children) {
				const children = clean(node.children, false);
				if (!children.length) continue;
				if (top && node.icon === ICON_COPY_PATH && ownIds.has(OWN.copyPath)) replaced.push(OWN.copyPath);
				out.push({ ...node, children });
				continue;
			}
			if (covered(node)) continue;
			out.push(node);
		}
		while (out.length && out[out.length - 1]!.kind === 'separator') out.pop();
		return out;
	};
	return { nodes: clean(nodes, true), replaced };
}
