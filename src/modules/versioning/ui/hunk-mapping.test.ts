import { expect, test } from 'vitest';
import { applySelectedHunks, restoreHunks } from '../core/hunk-restore';
import { calculateDiff } from './diff-model';

test.each([
	['a\nb', 'a'], ['a', 'a\nb'], ['new\n', 'old'], ['', '😀\r\n'], ['添加😀\r\n', ''],
	['a\r\nnew\r\n', 'a\r\nold\r\n'], ['\uFEFF旧😀\r\n尾', '\uFEFF新🧠\r\n尾'], ['头\r\n尾\n', '旧头\r\n旧尾\n'],
])('the installed CM chunk contract maps raw insertion/deletion and EOF correctly: %j ← %j', (source, target) => {
	const model = calculateDiff({ id: 'raw', left: source, right: target });
	const hunks = restoreHunks(source, target, model);
	expect(applySelectedHunks(source, target, model, hunks.map(hunk => hunk.id))).toBe(source);
});
