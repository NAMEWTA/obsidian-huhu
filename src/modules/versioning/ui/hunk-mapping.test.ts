import { expect, test } from 'vitest';
import { applySelectedHunks, restoreHunks } from '../core/hunk-restore';
import { parseDiffFromFile } from '@pierre/diffs';
import { hunkProof } from './diff/hunk-proof';
import { displayText } from './diff/preferences';

test.each([
	['a\nb', 'a'],
	['a', 'a\nb'],
	['new\n', 'old'],
	['', '😀\r\n'],
	['添加😀\r\n', ''],
	['a\r\nnew\r\n', 'a\r\nold\r\n'],
	['\uFEFF旧😀\r\n尾', '\uFEFF新🧠\r\n尾'],
	['头\r\n尾\n', '旧头\r\n旧尾\n'],
])('the fixed Pierre metadata contract maps raw insertion/deletion and EOF correctly: %j ← %j', (source, target) => {
	const metadata = parseDiffFromFile(
		{ name: 'a.md', contents: displayText(source) },
		{ name: 'a.md', contents: displayText(target) },
	);
	const model = hunkProof(source, target, metadata);
	const hunks = restoreHunks(source, target, model);
	expect(
		applySelectedHunks(
			source,
			target,
			model,
			hunks.map((hunk) => hunk.id),
		),
	).toBe(source);
});

test('library accept/reject candidates preserve the unselected raw hunk and line endings', async () => {
	const { hunkCandidate } = await import('./diff/hunk-proof');
	const middle = Array.from({ length: 12 }, (_, i) => `keep${i}\r\n`).join('');
	const source = `\uFEFFold😀\r\n${middle}old-end`;
	const target = `\uFEFFnew🧠\r\n${middle}new-end`;
	const metadata = parseDiffFromFile(
		{ name: 'a.md', contents: displayText(source) },
		{ name: 'a.md', contents: displayText(target) },
	);
	expect(metadata.hunks).toHaveLength(2);
	expect(hunkCandidate(source, target, metadata, 0, 'accept')).toBe(`\uFEFFnew🧠\r\n${middle}old-end`);
	expect(hunkCandidate(source, target, metadata, 0, 'reject')).toBe(`\uFEFFold😀\r\n${middle}new-end`);
});
