/**
 * What every note HUHU creates starts with: a `状态` property and an empty `tags` list for the user to fill in.
 * Notes that already open with their own properties (a template, an imported file) keep them untouched.
 */

/** The property lines (no fences). */
export const DEFAULT_NOTE_PROPERTIES = '状态: 在用\ntags:\n  - ';

/** The properties as a frontmatter block, ending with a line break. */
export function defaultFrontmatter(): string {
	return `---\n${DEFAULT_NOTE_PROPERTIES}\n---\n`;
}

const HAS_FRONTMATTER = /^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

/** `body` with the default properties in front, unless it already opens with a frontmatter block. */
export function withDefaultProperties(body: string): string {
	return HAS_FRONTMATTER.test(body) ? body : defaultFrontmatter() + body;
}
