// Adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), src/quick-note-section.ts
/** Preserve frontmatter and list boundaries when inserting a captured thought. */
export function placeCaptureLine(raw: string, line: string, position: 'start' | 'end'): string {
	if (position === 'end') return `${raw}${raw === '' || raw.endsWith('\n') ? '' : '\n'}${line}\n`;
	const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
	const fm = match?.[0] ?? '',
		body = raw.slice(fm.length);
	return `${fm}${fm && !fm.endsWith('\n') ? '\n' : ''}${line}\n${body && !body.startsWith('\n') ? '\n' : ''}${body}`;
}

/** One line of a capture file: when it was written (`HH:mm`) and what, line breaks kept. */
export interface CaptureEntry {
	time: string;
	text: string;
}

const FRONTMATTER = /^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
const ENTRY = /^[-*+] (\d{2}:\d{2})(?: (.*))?$/;

/**
 * The entries of a capture file, oldest first: list items that start with a time (`- 16:54 text`), each followed by
 * its indented continuation lines. Properties, headings and anything else a template put in the file are skipped.
 */
export function parseCaptureEntries(raw: string): CaptureEntry[] {
	const entries: { time: string; lines: string[] }[] = [];
	let open = false;
	for (const line of raw.replace(FRONTMATTER, '').split(/\r?\n/)) {
		const start = ENTRY.exec(line);
		if (start) {
			entries.push({ time: start[1]!, lines: [start[2] ?? ''] });
			open = true;
		} else if (open && /^[ \t]{2,}\S/.test(line)) entries[entries.length - 1]!.lines.push(line.replace(/^[ \t]{2}/, ''));
		else if (open && line.trim() === '') entries[entries.length - 1]!.lines.push('');
		else open = false;
	}
	return entries
		.map((entry) => ({ time: entry.time, text: entry.lines.join('\n').trim() }))
		.filter((entry) => entry.text);
}
