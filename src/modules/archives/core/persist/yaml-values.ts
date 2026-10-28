import { isMap, isScalar, parseDocument, stringify, type Node } from 'yaml';
import { ContactsError } from '../model';

const frontPattern = /^(\uFEFF?---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/;
interface Edit {
	start: number;
	end: number;
	text: string;
}
const applyEdits = (raw: string, edits: Edit[]) =>
	edits
		.sort((a, b) => b.start - a.start)
		.reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), raw);
/** Replaces only owned value ranges. Unknown keys, whitespace, comments, delimiter spelling and body remain byte-for-byte. */
export function patchYamlValues(raw: string, values: ReadonlyMap<string, unknown>): string {
	const front = frontPattern.exec(raw);
	if (!front) throw new ContactsError('invalidYaml');
	const yaml = front[2]!,
		offset = front[1]!.length,
		document = parseDocument(yaml, { uniqueKeys: true, keepSourceTokens: true });
	if (document.errors.length || !isMap(document.contents)) throw new ContactsError('invalidYaml');
	const edits: Edit[] = [],
		additions: string[] = [],
		newline = front[1]!.endsWith('\r\n') ? '\r\n' : '\n';
	for (const [key, value] of values) {
		const pair = document.contents.items.find((pair) => isScalar(pair.key) && pair.key.value === key);
		const encoded =
			value === undefined ? '' : key.startsWith('huhu-') && (value === null || typeof value !== 'object') ? stringify(value).trimEnd() : JSON.stringify(value);
		if (!pair) {
			if (value !== undefined) additions.push(`${key}: ${encoded}`);
			continue;
		}
		const node = pair.value as Node | null,
			keyNode = pair.key as Node;
		if (!node?.range || !keyNode.range) throw new ContactsError('invalidYaml');
		const start = value === undefined ? keyNode.range[0] : node.range[0],
			end = node.range[1];
		// An implicit null has no value token: its range may touch the colon or comment.
		const empty = value !== undefined && start === end,
			prefix = empty && !/[ \t]/.test(yaml[start - 1] ?? '') ? ' ' : '',
			commentSpace = empty && yaml[end] === '#' ? ' ' : '';
		const suffix = value !== undefined && yaml.slice(node.range[0], end).endsWith(newline) ? newline : '';
		edits.push({ start: offset + start, end: offset + end, text: prefix + encoded + commentSpace + suffix });
	}
	if (additions.length)
		edits.push({
			start: offset + yaml.length,
			end: offset + yaml.length,
			text: `${newline}${additions.join(newline)}`,
		});
	return applyEdits(raw, edits);
}
