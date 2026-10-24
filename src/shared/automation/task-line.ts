import { readTaskMeta } from './metadata';

export interface TaskLineReference {
	line: number;
	id?: string;
	effectKey?: string;
	originalLine?: string;
	mtime?: number;
}

/** Resolve a navigation reference against current bytes; never reuse a stale line for an identified task. */
export function locateTaskLine(content: string, reference: TaskLineReference, currentMtime?: number): number | undefined {
	const lines = content.split('\n');
	const validLine = Number.isInteger(reference.line) && reference.line >= 0 && reference.line < lines.length;
	const identity = !!reference.id || !!reference.effectKey;
	const normalized = (line: string) => line.replace(/\r$/, '');
	if (!identity && reference.originalLine === undefined) return validLine ? reference.line : undefined;
	if (!identity && validLine && reference.mtime !== undefined && reference.mtime === currentMtime &&
		normalized(lines[reference.line]!) === normalized(reference.originalLine!)) return reference.line;
	let match: number | undefined;
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]!;
		const meta = identity ? readTaskMeta(line) : undefined;
		const matches = identity
			? (!reference.id || meta?.id === reference.id) && (!reference.effectKey || meta?.effectKey === reference.effectKey)
			: normalized(line) === normalized(reference.originalLine!);
		if (!matches) continue;
		if (match !== undefined) return undefined;
		match = index;
	}
	return match;
}
