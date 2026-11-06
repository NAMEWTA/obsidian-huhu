import type { SelectedLineRange } from '@pierre/diffs';
import { displayText } from './preferences';

/** A cross-version span has no single source body. Copy only explicit ranges on one side. */
export function selectedText(text: string, range: SelectedLineRange): string | null {
	if (range.endSide && range.side && range.endSide !== range.side) return null;
	const start = Math.min(range.start, range.end),
		end = Math.max(range.start, range.end);
	if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1) return null;
	return (displayText(text).match(/[^\n]*\n|[^\n]+$/g) ?? []).slice(start - 1, end).join('');
}
