import { expect, test } from 'vitest';
import type { ResolvedEndpoint } from '../../core/history';
import { endpointFile } from './endpoint';
import { selectedText } from './selection';

function text(path: string, contents: string): ResolvedEndpoint {
	return {
		id: 'revision',
		repositoryId: 'repository',
		path,
		label: path,
		ref: { kind: 'worktree', path },
		status: 'text',
		snapshot: {
			text: contents,
			hash: contents,
			byteLength: contents.length,
			encoding: 'utf-8',
			eol: 'none',
			hasBom: false,
			endsWithNewline: false,
		},
	};
}
test('endpoint adapter distinguishes missing from empty and changes cache identity for every source dimension', () => {
	const empty = text('empty.md', '');
	expect(endpointFile(empty)).toMatchObject({ name: 'empty.md', contents: '', lang: 'markdown' });
	expect(endpointFile({ ...empty, status: 'missing', reason: 'not-present' })).toBeNull();
	const first = endpointFile(text('script.bash', 'echo hello'))!;
	expect(first.lang).toBe('shellscript');
	for (const endpoint of [
		{ ...text('script.bash', 'echo hello'), id: 'another-revision' },
		text('script.bash', 'echo changed'),
		text('script.sh', 'echo hello'),
		text('script.py', 'echo hello'),
	])
		expect(endpointFile(endpoint)!.cacheKey).not.toBe(first.cacheKey);
	expect(endpointFile(text('script.py', 'hello'))!.lang).toBe('text');
});
test('line copy preserves selected display lines and refuses cross-version ambiguity', () => {
	expect(selectedText('\uFEFFone\r\n😀two\r\nlast', { start: 2, end: 3, side: 'additions' })).toBe('😀two\nlast');
	expect(selectedText('one\ntwo\n', { start: 2, end: 1, side: 'deletions' })).toBe('one\ntwo\n');
	expect(selectedText('one\n', { start: 1, end: 1, side: 'deletions', endSide: 'additions' })).toBeNull();
	expect(selectedText('one\n', { start: 0, end: 1 })).toBeNull();
});
