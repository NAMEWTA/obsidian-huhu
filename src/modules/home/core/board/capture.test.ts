import { expect, test } from 'vitest';
import { parseCaptureEntries, placeCaptureLine } from './capture';

test('captures preserve frontmatter and paragraph boundaries at either end', () => {
	const raw = '---\ntags: [idea]\n---\nParagraph';
	expect(placeCaptureLine(raw, '- New', 'start')).toBe('---\ntags: [idea]\n---\n- New\n\nParagraph');
	expect(placeCaptureLine(raw, '- New', 'end')).toBe(raw + '\n- New\n');
	expect(placeCaptureLine('---\ntags: x', '- New', 'start')).toBe('- New\n\n---\ntags: x');
});

test('a capture file reads back as its timed entries, oldest first, with line breaks kept', () => {
	const file = '---\n状态: 在用\ntags:\n  - \n---\n- 09:12 买牛奶\n- 10:30 第一行\n  第二行\n\n  第四行\n- 16:54 最后一条\n';
	expect(parseCaptureEntries(file)).toEqual([
		{ time: '09:12', text: '买牛奶' },
		{ time: '10:30', text: '第一行\n第二行\n\n第四行' },
		{ time: '16:54', text: '最后一条' },
	]);
});

test('lines that are not timed list items are not entries', () => {
	expect(parseCaptureEntries('')).toEqual([]);
	expect(parseCaptureEntries('# 标题\n\n- 没有时间\n- 9:5 不是两位\n正文')).toEqual([]);
	expect(parseCaptureEntries('- 08:00 早\n正文不属于上一条\n  缩进的续行也不属于\n- 08:30 晚')).toEqual([
		{ time: '08:00', text: '早' },
		{ time: '08:30', text: '晚' },
	]);
	expect(parseCaptureEntries('- 08:00\n- 08:05 有字')).toEqual([{ time: '08:05', text: '有字' }]);
});
