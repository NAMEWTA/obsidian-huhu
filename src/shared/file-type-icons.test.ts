import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defaultFileIcon, defaultFolderIcon, defaultIconNames, fileExtension, lucideIconId } from './file-type-icons';

/** lucide-react ships one module per icon name (aliases included), so a file existing means the name resolves. */
const lucideReactIcons = join(dirname(createRequire(import.meta.url).resolve('lucide-react/package.json')), 'dist', 'esm', 'icons',
);

test('files map to type icons with theme color variables', () => {
	expect(defaultFileIcon('notes/a.md')).toEqual({ icon: 'file-text', color: null });
	expect(defaultFileIcon('a/b/Report.PDF')).toEqual({ icon: 'file-text', color: 'var(--color-red)' });
	expect(defaultFileIcon('deck.pptx')).toEqual({ icon: 'presentation', color: 'var(--color-orange)' });
	expect(defaultFileIcon('ppt')).toEqual(defaultFileIcon('slides.ppt'));
	expect(defaultFileIcon('.docx')).toEqual({ icon: 'file-type', color: 'var(--color-blue)' });
	expect(defaultFileIcon('budget.xlsx').icon).toBe('file-spreadsheet');
	expect(defaultFileIcon('rows.csv').icon).toBe('file-spreadsheet');
	expect(defaultFileIcon('board.canvas').icon).toBe('layout-dashboard');
	expect(defaultFileIcon('table.base').icon).toBe('database');
	expect(defaultFileIcon('photo.JPG').icon).toBe('file-image');
	expect(defaultFileIcon('song.flac').icon).toBe('file-audio');
	expect(defaultFileIcon('clip.mkv').icon).toBe('file-video');
	expect(defaultFileIcon('bundle.tar').icon).toBe('file-archive');
	expect(defaultFileIcon('src/main.rs').icon).toBe('file-code');
	expect(defaultFileIcon('package.json').icon).toBe('file-json');
	expect(defaultFileIcon('config.yaml').icon).toBe('file-braces');
	expect(defaultFileIcon('readme.txt').icon).toBe('file');
});

test('unknown files, dotfiles and extensionless names fall back to the plain file icon', () => {
	for (const path of ['LICENSE', 'dir/LICENSE', '.gitignore', 'dir/.gitignore', 'weird.unknownext', '']) {
		expect(defaultFileIcon(path)).toEqual({ icon: 'file', color: null });
	}
	expect(fileExtension('a.b.c.MD')).toBe('md');
	expect(fileExtension('dir.v2/name')).toBe('');
});

test('folders switch icons when open and special folders keep theirs', () => {
	expect(defaultFolderIcon('Projects').icon).toBe('folder-closed');
	expect(defaultFolderIcon('Projects', true).icon).toBe('folder-open');
	expect(defaultFolderIcon('journal').icon).toBe('calendar-days');
	expect(defaultFolderIcon('journal', true).icon).toBe('calendar-days');
	expect(defaultFolderIcon('journal/daily').icon).toBe('calendar-1');
	expect(defaultFolderIcon('journal/weekly').icon).toBe('calendar-range');
	expect(defaultFolderIcon('journal/monthly').icon).toBe('calendar');
	expect(defaultFolderIcon('journal/quarterly').icon).toBe('calendar-fold');
	expect(defaultFolderIcon('journal/yearly').icon).toBe('calendar-clock');
	expect(defaultFolderIcon('journal/daily/2026').icon).toBe('folder-closed');
	expect(defaultFolderIcon('其他/journal').icon).toBe('folder-closed');
	expect(defaultFolderIcon('huhu/archives').icon).toBe('contact-round');
	expect(defaultFolderIcon('huhu/archives/people').icon).toBe('user');
	expect(defaultFolderIcon('huhu/archives/companies').icon).toBe('building-2');
	expect(defaultFolderIcon('people').icon).toBe('folder-closed');
	expect(defaultFolderIcon('notes/Attachments').icon).toBe('paperclip');
	expect(defaultFolderIcon('notes/附件').icon).toBe('paperclip');
	expect(defaultFolderIcon('Templates').icon).toBe('layout-template');
	expect(defaultFolderIcon('模板').icon).toBe('layout-template');
});

test('every icon name exists in lucide-react and Obsidian ids are prefixed once', () => {
	for (const name of defaultIconNames()) expect(existsSync(join(lucideReactIcons, `${name}.js`)), name).toBe(true);
	expect(lucideIconId('file-text')).toBe('lucide-file-text');
	expect(lucideIconId('lucide-file-text')).toBe('lucide-file-text');
	for (const value of [defaultFileIcon('a.pdf'), defaultFolderIcon('journal')]) {
		if (value.color) expect(value.color).toMatch(/^var\(--color-[a-z]+\)$/);
	}
});
