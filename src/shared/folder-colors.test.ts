import { expect, test } from 'vitest';
import { FOLDER_PALETTE, folderPaletteColor, topFolderColors } from './folder-colors';

test('the palette is eight Obsidian theme colors, no literal colors', () => {
	expect(FOLDER_PALETTE).toHaveLength(8);
	expect(new Set(FOLDER_PALETTE).size).toBe(8);
	for (const color of FOLDER_PALETTE) expect(color).toMatch(/^var\(--color-(red|orange|yellow|green|cyan|blue|purple|pink)\)$/);
});

test('top-level folders are colored in natural name order and wrap around the palette', () => {
	const colors = topFolderColors(['10_档案', '2_Work', '00_Inbox', '.obsidian', '', '2_Work']);
	expect([...colors.keys()]).toEqual(['00_Inbox', '2_Work', '10_档案']);
	expect([...colors.values()]).toEqual(FOLDER_PALETTE.slice(0, 3));
	const many = topFolderColors(Array.from({ length: 10 }, (_, index) => `f${String(index).padStart(2, '0')}`));
	expect(many.get('f08')).toBe(FOLDER_PALETTE[0]);
	expect(many.get('f09')).toBe(FOLDER_PALETTE[1]);
});

test('a folder takes the color of its top-level folder at any depth, the vault root has none', () => {
	const colors = topFolderColors(['a', 'b']);
	expect(folderPaletteColor('b', colors)).toBe(FOLDER_PALETTE[1]);
	expect(folderPaletteColor('b/c/d/e', colors)).toBe(FOLDER_PALETTE[1]);
	expect(folderPaletteColor('a/b', colors)).toBe(FOLDER_PALETTE[0]);
	expect(folderPaletteColor('missing/x', colors)).toBeUndefined();
	expect(folderPaletteColor('', colors)).toBeUndefined();
});
