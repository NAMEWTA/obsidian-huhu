/** Where a changed file sits in the change list. */
export type RowKind = 'conflict' | 'staged' | 'changed' | 'untracked';

export interface ChangeRow {
	kind: RowKind;
	/** Repository path. */
	path: string;
	from?: string;
	/** Status letter shown for the row (`M`, `A`, `D`, `R`, `U`, or a two-letter conflict code). */
	code: string;
}

/** A folder or file in the tree view of one group. A node with `children` is a folder. */
export interface ChangeTreeNode {
	/** Folder path (compact: `a/b` when `b` is the only child of `a`) or the file's repository path. */
	path: string;
	/** Display name: the file name, or the folder path relative to its parent. */
	name: string;
	row?: ChangeRow;
	children?: ChangeTreeNode[];
	/** Files below this folder (1 for a file). */
	count: number;
}

interface Mutable {
	name: string;
	path: string;
	row?: ChangeRow;
	dirs: Map<string, Mutable>;
	files: Mutable[];
}

/**
 * Group rows by folder like VS Code's source-control tree: folders first, then files, both sorted by name;
 * a folder whose only content is one folder is joined with it (`src/modules/sync`).
 */
export function buildChangeTree(rows: readonly ChangeRow[]): ChangeTreeNode[] {
	const root: Mutable = { name: '', path: '', dirs: new Map(), files: [] };
	for (const row of rows) {
		const parts = row.path.split('/');
		const file = parts.pop() ?? row.path;
		let node = root;
		for (const part of parts) {
			let next = node.dirs.get(part);
			if (!next) {
				next = { name: part, path: node.path ? `${node.path}/${part}` : part, dirs: new Map(), files: [] };
				node.dirs.set(part, next);
			}
			node = next;
		}
		node.files.push({ name: file, path: row.path, row, dirs: new Map(), files: [] });
	}
	const compare = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true });
	const finish = (node: Mutable): ChangeTreeNode => {
		if (node.row) return { path: node.path, name: node.name, row: node.row, count: 1 };
		let current = node;
		let name = node.name;
		while (current.files.length === 0 && current.dirs.size === 1) {
			current = [...current.dirs.values()][0]!;
			name = `${name}/${current.name}`;
		}
		const children = [...current.dirs.values()].sort(compare).map(finish).concat([...current.files].sort(compare).map(finish));
		return { path: current.path, name, children, count: children.reduce((sum, child) => sum + child.count, 0) };
	};
	return [...root.dirs.values()].sort(compare).map(finish).concat([...root.files].sort(compare).map(finish));
}
