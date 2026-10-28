import { expect, test } from 'vitest';
import { applySelectedHunks, restoreHunks, type HunkDiff } from './hunk-restore';

const source = '\uFEFF旧一\r\n保持😀\r\n旧二', target = '\uFEFF新一\r\n保持😀\r\n新二';
const diff: HunkDiff = { left: '旧一\n保持😀\n旧二', right: '新一\n保持😀\n新二', precise: true,
	chunks: [{ fromA: 0, toA: 3, fromB: 0, toB: 3, precise: true }, { fromA: 8, toA: 11, fromB: 8, toB: 11, precise: true }] };

test('selected raw chunks preserve BOM, CRLF and unselected Chinese/emoji text, including the EOF sentinel', () => {
	const hunks = restoreHunks(source, target, diff);
	expect(hunks).toHaveLength(2);
	expect(applySelectedHunks(source, target, diff, [hunks[0]!.id])).toBe('\uFEFF旧一\r\n保持😀\r\n新二');
	expect(applySelectedHunks(source, target, diff, [hunks[1]!.id])).toBe('\uFEFF新一\r\n保持😀\r\n旧二');
	expect(applySelectedHunks(source, target, diff, hunks.map(hunk => hunk.id))).toBe(source);
});

test('precision flags alone never authorize truncated, reordered, overlapping or unrelated raw ranges', () => {
	for (const invalid of [
		{ ...diff, precise: false }, { ...diff, chunks: [{ ...diff.chunks[0]!, precise: false }, diff.chunks[1]!] },
		{ ...diff, chunks: [diff.chunks[0]!] }, { ...diff, left: 'truncated', right: 'truncated', chunks: [] },
		{ ...diff, chunks: [...diff.chunks].reverse() }, { ...diff, chunks: [diff.chunks[0]!, diff.chunks[0]!, diff.chunks[1]!] },
		{ ...diff, chunks: [{ ...diff.chunks[0]!, toA: 100 }, diff.chunks[1]!] },
	]) expect(() => restoreHunks(source, target, invalid)).toThrow('versioning.restore.hunks-unavailable');
	expect(() => restoreHunks(source + 'unread suffix', target, diff)).toThrow('versioning.restore.hunks-unavailable');
	const id = restoreHunks(source, target, diff)[0]!.id;
	for (const selected of [[], ['unknown'], [id, id]])
		expect(() => applySelectedHunks(source, target, diff, selected)).toThrow('versioning.restore.hunks-unavailable');
});

test('raw splicing cannot merge a selected CR with an unselected blank LF line', () => {
	const diff: HunkDiff = { left: 'old\n\nkeep', right: 'new\n\nkeep', precise: true,
		chunks: [{ fromA: 0, toA: 4, fromB: 0, toB: 4, precise: true }] };
	const selected = restoreHunks('old\r\rkeep', 'new\n\nkeep', diff).map(hunk => hunk.id);
	expect(() => applySelectedHunks('old\r\rkeep', 'new\n\nkeep', diff, selected)).toThrow('versioning.restore.hunks-unavailable');
});

test('the writer conversion must preserve the authorized result, including every unselected range', () => {
	const selected = [restoreHunks(source, target, diff)[0]!.id];
	expect(applySelectedHunks(source, target, diff, selected, text => text.replace(/\r\n?/g, '\n')))
		.toBe('\uFEFF旧一\n保持😀\n新二');
	expect(() => applySelectedHunks(source, target, diff, selected, text => text.replace('保持😀', '')))
		.toThrow('versioning.restore.hunks-unavailable');
});
