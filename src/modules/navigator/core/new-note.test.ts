// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test } from 'vitest';
import { datedName, DEFAULT_NOTE_PROPERTIES, isoDate, nameSelection, newNoteContent } from './new-note';

test('new files are named after the local date and the placeholder', () => {
	const date = new Date(2026, 0, 5, 23, 59);
	expect(isoDate(date)).toBe('2026-01-05');
	expect(datedName('未命名', date)).toBe('2026-01-05-未命名');
	expect(datedName('Untitled', date)).toBe('2026-01-05-Untitled');
});

test('the inline rename selects the Name after a date prefix and everything otherwise', () => {
	expect(nameSelection('2026-10-21-未命名')).toEqual({ start: 11, end: 14 });
	expect(nameSelection('2026-10-21-Untitled 2')).toEqual({ start: 11, end: 21 });
	expect(nameSelection('Meeting notes')).toEqual({ start: 0, end: 13 });
	expect(nameSelection('2026-10-21 notes')).toEqual({ start: 0, end: 16 });
	expect(nameSelection('2026-10-21-')).toEqual({ start: 0, end: 11 });
});

test('a new note starts with the default properties as frontmatter', () => {
	expect(newNoteContent(DEFAULT_NOTE_PROPERTIES)).toBe('---\n状态: 在用\ntags:\n  - \n  - \n---\n');
	expect(newNoteContent('')).toBe('');
	expect(newNoteContent('\n\n  \n')).toBe('');
	expect(newNoteContent('status: draft\r\n')).toBe('---\nstatus: draft\n---\n');
});

test('a note made inside a tag puts the tag in the first free tags item or adds one', () => {
	expect(newNoteContent(DEFAULT_NOTE_PROPERTIES, 'work/plan')).toBe('---\n状态: 在用\ntags:\n  - work/plan\n  - \n---\n');
	expect(newNoteContent('tags:\n  - a\n  - b\nstatus: x', 'c')).toBe('---\ntags:\n  - a\n  - b\n  - c\nstatus: x\n---\n');
	expect(newNoteContent('status: x', 'c')).toBe('---\nstatus: x\ntags:\n  - c\n---\n');
	expect(newNoteContent('', 'c')).toBe('---\ntags:\n  - c\n---\n');
});
