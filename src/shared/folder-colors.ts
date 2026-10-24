/**
 * Folder colors by position: the folders directly under the vault root take the palette colors one after the
 * other (in natural name order, wrapping around), and every folder below a top-level folder keeps that folder's
 * color, however deep. Pure data, shared by the icons module (Obsidian file list and the navigator's icons).
 *
 * Colors are Obsidian theme variables, so they follow the theme and the light/dark mode.
 */

/** Ordered so that neighbouring folders differ clearly in hue. */
export const FOLDER_PALETTE: readonly string[] = [
	'var(--color-blue)',
	'var(--color-orange)',
	'var(--color-green)',
	'var(--color-purple)',
	'var(--color-red)',
	'var(--color-cyan)',
	'var(--color-yellow)',
	'var(--color-pink)',
];

const byName = (a: string, b: string): number => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);

/** Color of every top-level folder: the n-th folder in name order gets palette color n (modulo the palette size). */
export function topFolderColors(names: Iterable<string>): Map<string, string> {
	const colors = new Map<string, string>();
	[...new Set(names)]
		.filter((name) => name !== '' && !name.startsWith('.'))
		.sort(byName)
		.forEach((name, index) => colors.set(name, FOLDER_PALETTE[index % FOLDER_PALETTE.length]!));
	return colors;
}

/** The color of the folder at `path` (vault-relative) given the top-level colors; undefined for the vault root itself. */
export function folderPaletteColor(path: string, colors: ReadonlyMap<string, string>): string | undefined {
	const slash = path.indexOf('/');
	const top = slash < 0 ? path : path.slice(0, slash);
	return top === '' ? undefined : colors.get(top);
}
