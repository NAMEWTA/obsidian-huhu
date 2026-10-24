import { expect, test } from 'vitest';
import { defaultFrontmatter, withDefaultProperties } from './note-defaults';

test('a new note starts with the status property and an empty tags list', () => {
	expect(defaultFrontmatter()).toBe('---\n状态: 在用\ntags:\n  - \n---\n');
	expect(withDefaultProperties('')).toBe('---\n状态: 在用\ntags:\n  - \n---\n');
	expect(withDefaultProperties('# 标题\n')).toBe('---\n状态: 在用\ntags:\n  - \n---\n# 标题\n');
});

test('a body that already opens with properties keeps them', () => {
	const own = '---\nstatus: draft\n---\n正文\n';
	expect(withDefaultProperties(own)).toBe(own);
	expect(withDefaultProperties('\uFEFF---\r\na: 1\r\n---\r\n')).toBe('\uFEFF---\r\na: 1\r\n---\r\n');
	expect(withDefaultProperties('---\n未闭合\n')).toBe('---\n状态: 在用\ntags:\n  - \n---\n---\n未闭合\n');
});
