// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.

const pad = (value: number) => String(value).padStart(2, '0');

/** `YYYY-MM-DD` of a local date. */
export function isoDate(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Default name of a new file: today's date, a dash and the (translated) placeholder, e.g. `2026-10-21-未命名`. */
export function datedName(label: string, date: Date): string {
	return `${isoDate(date)}-${label}`;
}

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

/**
 * Which part of a name the inline rename selects: for a `YYYY-MM-DD-Name` name only `Name`, so typing replaces the
 * placeholder and keeps the date; any other name is selected whole.
 */
export function nameSelection(name: string): { start: number; end: number } {
	const prefix = DATE_PREFIX.exec(name)?.[0].length ?? 0;
	// A name that is nothing but the prefix has no Name part to select.
	return prefix > 0 && prefix < name.length ? { start: prefix, end: name.length } : { start: 0, end: name.length };
}

/** Properties every new note starts with; the user fills in the details. */
export const DEFAULT_NOTE_PROPERTIES = '状态: 在用\ntags:\n  - \n  - ';

const TAGS_KEY = /^tags:\s*$/;
const BULLET = /^\s+-(\s.*)?$/;
const EMPTY_BULLET = /^\s+-\s*$/;

/** Put `tag` into the `tags` list of the properties text: the first empty item takes it, otherwise it is appended. */
function withTag(lines: string[], tag: string): string[] {
	const start = lines.findIndex((line) => TAGS_KEY.test(line));
	if (start < 0) return [...lines, 'tags:', `  - ${tag}`];
	let end = start + 1;
	while (end < lines.length && BULLET.test(lines[end]!)) end++;
	const empty = lines.findIndex((line, index) => index > start && index < end && EMPTY_BULLET.test(line));
	const next = [...lines];
	if (empty >= 0) next[empty] = `  - ${tag}`; else next.splice(end, 0, `  - ${tag}`);
	return next;
}

/**
 * The text of a new note that has no template: the default properties as frontmatter, with `tag` filled into the
 * `tags` list when the note is made inside a tag. No properties and no tag give an empty note.
 */
export function newNoteContent(properties: string, tag?: string): string {
	let lines = properties.replace(/\r\n?/g, '\n').split('\n');
	while (lines.length && !lines[lines.length - 1]!.trim()) lines.pop();
	if (tag) lines = withTag(lines, tag);
	return lines.length ? `---\n${lines.join('\n')}\n---\n` : '';
}
