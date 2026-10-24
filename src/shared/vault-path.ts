/**
 * Vault-relative paths typed by hand. Every path field resolves them the same way: from the vault root, no leading
 * slash, no `..`, `/` as the separator. A folder that does not exist yet is created when the value is used.
 */
/** One vault entry offered by a path input. */
export interface VaultPathItem {
	path: string;
	kind: 'file' | 'folder';
}

export type VaultPathResult = { ok: true; path: string } | { ok: false; reason: 'absolute' | 'traversal' | 'hidden' | 'invalid' };

/** Normalise what the user typed; `''` is the vault root. `./a//b/` becomes `a/b`; hidden (dot) folders are refused. */
export function normalizeVaultPath(input: string): VaultPathResult {
	const text = input.trim().replaceAll('\\', '/');
	// Windows drive letters and UNC prefixes name a place outside the vault.
	if (/^[a-z]:/i.test(text) || text.startsWith('//')) return { ok: false, reason: 'absolute' };
	if (text.includes('\0')) return { ok: false, reason: 'invalid' };
	const segments: string[] = [];
	for (const segment of text.split('/')) {
		if (segment === '' || segment === '.') continue;
		if (segment === '..') return { ok: false, reason: 'traversal' };
		// `.obsidian`, `.huhu`, `.git`: not part of the visible vault, so not somewhere a user path should point.
		if (segment.startsWith('.')) return { ok: false, reason: 'hidden' };
		segments.push(segment);
	}
	return { ok: true, path: segments.join('/') };
}

export interface FuzzyHit {
	score: number;
	/** Half-open `[start, end)` ranges of the matched characters in the text. */
	ranges: Array<[number, number]>;
}

const isBoundary = (text: string, index: number) => index === 0 || /[\s/_.-]/.test(text[index - 1]!);

/**
 * Obsidian-style fuzzy match: every character of the query appears in order. Contiguous runs, word starts and
 * matches in the last path segment (the file or folder name) score higher; a null result means no match.
 */
export function fuzzyPathMatch(query: string, text: string): FuzzyHit | null {
	const needle = query.trim().toLocaleLowerCase().replaceAll('\\', '/').replace(/^\/+/, '');
	if (!needle) return { score: 0, ranges: [] };
	const haystack = text.toLocaleLowerCase();
	const lastSegment = haystack.lastIndexOf('/') + 1;
	let best: FuzzyHit | null = null;
	for (let start = haystack.indexOf(needle[0]!); start >= 0; start = haystack.indexOf(needle[0]!, start + 1)) {
		const positions = [start];
		let cursor = start + 1;
		let ok = true;
		for (let i = 1; i < needle.length; i++) {
			const next = haystack.indexOf(needle[i]!, cursor);
			if (next < 0) { ok = false; break; }
			positions.push(next);
			cursor = next + 1;
		}
		if (!ok) break;
		let score = 0;
		positions.forEach((position, i) => {
			score += 1;
			if (i > 0 && position === positions[i - 1]! + 1) score += 3;
			if (isBoundary(haystack, position)) score += 2;
			if (position >= lastSegment) score += 1;
		});
		score -= positions[0]! * 0.05 + (haystack.length - needle.length) * 0.02;
		if (haystack.includes(needle)) score += 6;
		if (!best || score > best.score) {
			const ranges: Array<[number, number]> = [];
			for (const position of positions) {
				const last = ranges[ranges.length - 1];
				if (last && last[1] === position) last[1] = position + 1;
				else ranges.push([position, position + 1]);
			}
			best = { score, ranges };
		}
	}
	return best;
}

/** The part of Obsidian's `Vault` that path inputs need, so shared code and tests do not import the host. */
export interface VaultFolderPort {
	getAbstractFileByPath(path: string): { path: string; children?: unknown } | null;
	getAllLoadedFiles(): Array<{ path: string; children?: unknown }>;
	createFolder(path: string): Promise<unknown>;
	adapter: { exists(path: string): Promise<boolean> };
}

/** Folders (and optionally files) of the vault for a path input, sorted naturally. The vault root is not listed. */
export function vaultPathItems(vault: Pick<VaultFolderPort, 'getAllLoadedFiles'>, kind?: VaultPathItem['kind']): VaultPathItem[] {
	const items: VaultPathItem[] = [];
	for (const entry of vault.getAllLoadedFiles()) {
		if (!entry.path || entry.path === '/') continue;
		const entryKind = entry.children ? 'folder' : 'file';
		if (!kind || kind === entryKind) items.push({ path: entry.path, kind: entryKind });
	}
	return items.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}

/**
 * Make sure a vault-relative folder exists, creating each missing level; returns the normalised path. Typed paths
 * are taken as they are, so the folder is created when the value is first used. Throws for a path that is not
 * vault-relative, or when a file is in the way.
 */
export async function ensureVaultFolder(vault: VaultFolderPort, input: string): Promise<string> {
	const normalized = normalizeVaultPath(input);
	if (!normalized.ok) throw new Error(`huhu-path.${normalized.reason}`);
	let current = '';
	for (const segment of normalized.path.split('/').filter(Boolean)) {
		current = current ? `${current}/${segment}` : segment;
		const existing = vault.getAbstractFileByPath(current);
		if (existing?.children) continue;
		if (existing) throw new Error(`huhu-path.not-a-folder: ${current}`);
		// A folder created a moment ago may not be in the vault index yet; the adapter knows.
		if (await vault.adapter.exists(current)) continue;
		await vault.createFolder(current);
	}
	return normalized.path;
}
