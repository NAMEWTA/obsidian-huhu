import { expect, test } from 'vitest';
import { applyTextEdits, textEdits, unchangedRange } from './text-edits';

test('exact edits preserve untouched paragraphs and UTF-16 text across separate changes', () => {
	const before = '第一段\r\nkeep TARGET 🌲\r\n尾部\r\n',
		after = '新第一段\r\nkeep TARGET 🌲\r\n新尾部\r\n';
	const edits = textEdits(before, after);
	expect(applyTextEdits(before, edits)).toBe(after);
	const target = before.indexOf('TARGET'),
		mapped = unchangedRange(target, target + 6, edits);
	expect(mapped).not.toBeNull();
	expect(after.slice(mapped!.start, mapped!.end)).toBe('TARGET');
	expect(edits.length).toBe(2);
});

test('bounded matching round trips additions, deletion, repeated lines, long lines and deterministic generated documents', () => {
	let seed = 721;
	const random = () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed;
	};
	const chars = ['中', '文', '\n', '\r', ' ', 'a', 'b', '🌲'];
	for (let sample = 0; sample < 250; sample++) {
		const text = () => Array.from({ length: random() % 120 }, () => chars[random() % chars.length]).join('');
		const before = text(),
			after = text();
		expect(applyTextEdits(before, textEdits(before, after))).toBe(after);
	}
	const before = Array.from({ length: 3_000 }, (_, i) => `line ${i}\n`).join(''),
		after = before.replace('line 0\n', 'changed\n').replace('line 2999\n', 'end\n');
	expect(applyTextEdits(before, textEdits(before, after))).toBe(after);
	const repeated = 'same\n'.repeat(900);
	expect(applyTextEdits(repeated, textEdits(repeated, 'other\n'.repeat(900)))).toBe('other\n'.repeat(900));
});
