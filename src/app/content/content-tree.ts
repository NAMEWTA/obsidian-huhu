import type { PanelItem, PanelModel } from '../contracts/workbench';
import type { TreeNode } from '../../ui/components/tree';
import { HUHU_VISIBLE_ROOT as CONTENT_ROOT } from '../../shared/storage/vault-layout';
import { defaultFileIcon, defaultFolderIcon, lucideIconId } from '../../shared/file-type-icons';
import { t } from '../../shared/i18n';

/** What the tree needs to know about a HUHU file. */
export interface ContentTreeFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	stat?: { mtime: number };
}

export interface ContentTree {
	nodes: TreeNode[];
	/** Top-level folders, so the first level of the hierarchy is open on arrival. */
	defaultExpandedIds: string[];
	/** Ids that open a file; folder ids only expand. */
	fileIds: ReadonlySet<string>;
}

/** A node while the tree is being assembled; `children` is mutable until the final sort. */
type Draft = Omit<TreeNode, 'children'> & { children?: Draft[] };

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const byName = (left: Draft, right: Draft) => collator.compare(left.label, right.label);

/**
 * The vault notes under the visible `huhu/` folder as a folder tree: folders first, each group sorted by name, empty folders
 * included. Node ids are full vault paths, so they match the page's `resourceId`.
 */
export function buildContentTree(files: readonly ContentTreeFile[], directories: readonly string[] = []): ContentTree {
	const prefix = CONTENT_ROOT + '/';
	const folders = new Map<string, Draft & { children: Draft[] }>();
	const top: Draft[] = [];
	const fileIds = new Set<string>();
	const folder = (path: string): Draft & { children: Draft[] } => {
		const existing = folders.get(path);
		if (existing) return existing;
		const relative = path.slice(prefix.length);
		const closed = defaultFolderIcon(relative);
		const node: Draft & { children: Draft[] } = {
			id: path,
			label: relative.slice(relative.lastIndexOf('/') + 1),
			icon: lucideIconId(closed.icon),
			iconOpen: lucideIconId(defaultFolderIcon(relative, true).icon),
			children: [],
			...(closed.color ? { iconColor: closed.color } : null),
		};
		folders.set(path, node);
		const slash = path.lastIndexOf('/');
		const parent = path.slice(0, slash);
		if (parent.length > CONTENT_ROOT.length) folder(parent).children.push(node);
		else top.push(node);
		return node;
	};
	for (const directory of directories) if (directory.startsWith(prefix)) folder(directory);
	for (const file of files) {
		if (!file.path.startsWith(prefix)) continue;
		const icon = defaultFileIcon(file.extension || file.name);
		const node: Draft = {
			id: file.path,
			label: file.extension === 'md' ? file.basename : file.name,
			icon: lucideIconId(icon.icon),
			...(icon.color ? { iconColor: icon.color } : null),
		};
		fileIds.add(file.path);
		const slash = file.path.lastIndexOf('/');
		const parent = file.path.slice(0, slash);
		if (parent.length > CONTENT_ROOT.length) folder(parent).children.push(node);
		else top.push(node);
	}
	// Folders before files, each sorted by name, at every level.
	const order = (nodes: Draft[]): TreeNode[] => [
		...nodes.filter((node) => node.children).sort(byName).map((node): TreeNode => ({ ...node, children: order(node.children ?? []) })),
		...nodes.filter((node) => !node.children).sort(byName),
	];
	const nodes = order(top);
	return { nodes, defaultExpandedIds: nodes.filter((node) => node.children).map((node) => node.id), fileIds };
}

/** The vault surface the tree reads; a subset of Obsidian's `Vault`. */
export interface VaultSnapshotSource {
	getFiles(): Array<ContentTreeFile>;
	getAllLoadedFiles(): Array<{ path: string; children?: unknown }>;
}

/** Every file and folder under the visible `huhu/` root, straight from the vault index. */
export function huhuVaultSnapshot(vault: VaultSnapshotSource): { files: ContentTreeFile[]; directories: string[] } {
	const prefix = CONTENT_ROOT + '/';
	return {
		files: vault.getFiles().filter((file) => file.path.startsWith(prefix)),
		directories: vault.getAllLoadedFiles().filter((entry) => entry.children !== undefined && entry.path.startsWith(prefix)).map((entry) => entry.path),
	};
}

let cached: { key: string; tree: ContentTree } | undefined;
/** The tree for the current files; the same inputs return the same tree so the panel does not rebuild on every render. */
export function contentTree(files: readonly ContentTreeFile[], directories: readonly string[]): ContentTree {
	const key = `${directories.join('\n')}\u0000${files.map((file) => file.path).join('\n')}`;
	if (cached?.key === key) return cached.tree;
	const tree = buildContentTree(files, directories);
	cached = { key, tree };
	return tree;
}

/** Reads a Markdown file's text so the panel search can look inside it. */
export interface ContentBodies {
	read(path: string): Promise<string>;
}

/**
 * Files whose path matches `text`, or whose Markdown body contains it (case-insensitive). Folders whose name matches
 * are hits too, so the tree keeps them open with their children.
 */
export async function searchContent(
	files: readonly ContentTreeFile[],
	directories: readonly string[],
	text: string,
	bodies: ContentBodies,
): Promise<PanelItem[]> {
	const term = text.trim().toLocaleLowerCase();
	if (!term) return [];
	const prefix = CONTENT_ROOT + '/';
	const hits: PanelItem[] = [];
	for (const directory of directories)
		if (directory.startsWith(prefix) && directory.slice(prefix.length).toLocaleLowerCase().includes(term))
			hits.push({ id: directory, label: directory.slice(directory.lastIndexOf('/') + 1) });
	for (const file of files) {
		if (!file.path.startsWith(prefix)) continue;
		const relative = file.path.slice(prefix.length);
		let detail: string | undefined;
		if (!relative.toLocaleLowerCase().includes(term)) {
			if (file.extension !== 'md') continue;
			const body = await bodies.read(file.path).catch(() => '');
			const at = body.toLocaleLowerCase().indexOf(term);
			if (at < 0) continue;
			detail = body.slice(Math.max(0, at - 24), at + term.length + 48).replace(/\s+/g, ' ').trim();
		}
		hits.push({ id: file.path, label: file.extension === 'md' ? file.basename : file.name, detail });
	}
	return hits;
}

/**
 * The HUHU files side panel: a folder tree; a file row opens the file in a new native tab, a folder row its overview. Its search field looks at file
 * names and, with `bodies`, inside Markdown; the tree then keeps just the hits and their folders.
 */
export function contentPanel(files: readonly ContentTreeFile[], directories: readonly string[], selected?: string, bodies?: ContentBodies, openFile?: (path: string) => void | Promise<void>): PanelModel {
	const tree = contentTree(files, directories);
	return {
		searchable: true,
		...(bodies ? { search: { query: (text: string) => searchContent(files, directories, text, bodies) } } : null),
		sections: [],
		tree: {
			label: t('content.title'),
			nodes: tree.nodes,
			defaultExpandedIds: tree.defaultExpandedIds,
			selectedId: selected,
			emptyText: t('content.noResults'),
			// A file opens in Obsidian's own editor (a new tab); a folder shows its overview on the page.
			select: (id) => (tree.fileIds.has(id) ? openFile?.(id) : undefined),
			target: (id) => (tree.fileIds.has(id) ? undefined : { feature: 'content', resourceId: id }),
		},
	};
}

export interface OverviewRow {
	path: string;
	label: string;
	/** Path of the folder that holds the file, relative to the root `huhu/`. */
	folder: string;
	mtime: number;
	icon: string;
	iconColor?: string;
}

/** The files under `folder` (any depth), most recently modified first, at most `limit`. */
export function folderOverview(files: readonly ContentTreeFile[], folder: string, limit = 200): { rows: OverviewRow[]; total: number } {
	const prefix = folder.replace(/\/+$/, '') + '/';
	const rootLength = CONTENT_ROOT.length + 1;
	const inside = files.filter((file) => file.path.startsWith(prefix)).sort((a, b) => (b.stat?.mtime ?? 0) - (a.stat?.mtime ?? 0));
	const rows = inside.slice(0, limit).map((file): OverviewRow => {
		const icon = defaultFileIcon(file.extension || file.name);
		return {
			path: file.path,
			label: file.extension === 'md' ? file.basename : file.name,
			folder: file.path.slice(rootLength, file.path.lastIndexOf('/')),
			mtime: file.stat?.mtime ?? 0,
			icon: lucideIconId(icon.icon),
			...(icon.color ? { iconColor: icon.color } : null),
		};
	});
	return { rows, total: inside.length };
}
