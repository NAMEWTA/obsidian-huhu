import { expect, test } from 'vitest';
import { displayedFocalPoint, editImageFocal, focalPosition, formatFocalPoint, parseFocalPoint, renamedImagePath } from './focal-point';
import { parse, serialize } from './parser';

test('focal input clamps finite coordinates, uses center for malformed input and writes integer percentages', () => {
	expect(parseFocalPoint('140, -3')).toEqual({ x: 100, y: 0 });
	expect(parseFocalPoint('31.7, 60.1')).toEqual({ x: 32, y: 60 });
	for (const raw of [undefined, '', 'x,20', 'NaN,Infinity', { x: 20, y: 30 }]) expect(displayedFocalPoint(raw)).toEqual({ x: 50, y: 50 });
	expect(focalPosition('140,-3')).toBe('100% 0%');
	expect(formatFocalPoint({ x: 50, y: 50 })).toBeUndefined();
});

test('resource rename follows exact file and folder paths, never substrings or remote URLs', () => {
	expect(renamedImagePath('Images/A.png', 'Images/A.png', 'Images/B.png', false)).toBe('Images/B.png');
	expect(renamedImagePath('Images/A.png.bak', 'Images/A.png', 'Images/B.png', false)).toBe('Images/A.png.bak');
	expect(renamedImagePath('Images/A.png', 'Images', 'Pictures', true)).toBe('Pictures/A.png');
	expect(renamedImagePath('Images2/A.png', 'Images', 'Pictures', true)).toBe('Images2/A.png');
	expect(renamedImagePath('https://example.com/Images/A.png', 'Images/A.png', 'Images/B.png', false)).toBe('https://example.com/Images/A.png');
});

test('reading or editing a cover preserves malformed focal values and author text', () => {
	const original = '---\r\ncustom: keep\r\n---\r\n## Projects\r\n### A\r\ncover: Images/A.png\r\ncoverPos: nonsense\r\nMy prose.\r\n';
	const board = parse(original);
	expect(serialize(board)).toBe(original);
	expect(focalPosition(board.columns[0]!.cards[0]!.coverPos)).toBe('50% 50%');
	board.columns[0]!.cards[0]!.coverPos = '30,70';
	const saved = serialize(board);
	expect(saved).toBe(original.replace('coverPos: nonsense', 'coverPos: 30,70'));
	expect(saved).toContain('custom: keep');
});

test('editing one image leaves the other stored focal values, even malformed or unknown ones, as they were', () => {
	const stored = { 'Images/A.png': '140,-3', 'Images/B.png': 'bad', 'Missing.png': { future: 'retain' } };
	expect(focalPosition(stored['Images/A.png'])).toBe('100% 0%');
	expect(editImageFocal(stored, 'Images/A.png', { x: 20, y: 80 })).toEqual({ ...stored, 'Images/A.png': '20,80' });
	expect(editImageFocal(stored, 'Images/A.png', { x: 50, y: 50 })).toEqual({ 'Images/B.png': 'bad', 'Missing.png': { future: 'retain' } });
});
