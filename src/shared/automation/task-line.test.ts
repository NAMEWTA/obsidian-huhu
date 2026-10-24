import { expect, test } from 'vitest';
import { taskMetaSuffix } from './metadata';
import { locateTaskLine } from './task-line';

test('stable task identity follows insertion, changed title and checked status instead of the recorded line', () => {
	const reference = { id: 'original', effectKey: 'scheduled-friday', line: 0 };
	const task = `- [x] Edited title${taskMetaSuffix(reference)}`;
	expect(locateTaskLine(`# Header\r\n- [ ] New task\r\n${task}\r\n`, reference)).toBe(2);
});

test('missing or duplicated identity never falls back to an unrelated task at the old line', () => {
	const reference = { id: 'original', effectKey: 'scheduled-friday', line: 0 };
	const task = `- [ ] Original${taskMetaSuffix(reference)}`;
	expect(locateTaskLine('- [ ] Other task\n', reference)).toBeUndefined();
	expect(locateTaskLine(`${task}\n${task}\n`, reference)).toBeUndefined();
	expect(locateTaskLine(`- [ ] Other effect${taskMetaSuffix({ id: 'original', effectKey: 'next-week' })}\n`, reference)).toBeUndefined();
});

test('legacy tasks without identity relocate only by their exact original content', () => {
	const reference = { line: 0, originalLine: '- [ ] Original\r', mtime: 10 };
	expect(locateTaskLine('# Added header\n- [ ] Original\n', reference, 11)).toBe(1);
	expect(locateTaskLine('- [ ] Changed\n', reference, 11)).toBeUndefined();
	expect(locateTaskLine('- [ ] Original\n- [ ] Original\n', reference, 11)).toBeUndefined();
});

test('an unchanged source version disambiguates identical legacy lines at the recorded position', () => {
	const content = '- [ ] Same\n- [ ] Same\n';
	expect(locateTaskLine(content, { line: 1, originalLine: '- [ ] Same', mtime: 10 }, 10)).toBe(1);
	expect(locateTaskLine(content, { line: 1, originalLine: '- [ ] Same', mtime: 10 }, 11)).toBeUndefined();
});

test('plain line-only note links keep their existing bounds-checked navigation semantics', () => {
	expect(locateTaskLine('Title\nBody', { line: 1 })).toBe(1);
	for (const line of [-1, 2, 0.5, NaN]) expect(locateTaskLine('Title\nBody', { line })).toBeUndefined();
});
