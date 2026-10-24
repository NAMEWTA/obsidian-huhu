import { expect, test } from 'vitest';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { fuzzyFilter, fuzzyScore } from '../../core/board/fuzzy';
import { createMemoFile, listMemos, memoTime, memoTitle } from './memo-files';
import { presetNoteName } from './quick-note-presets';
import { cleanVaultFolder, createVaultNote, notePathFor, notesInFolder, safeFileName, vaultFolders } from './vault-notes';

const at = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	const parts: Record<string, string> = {
		YYYY: String(date.getFullYear()),
		MM: pad(date.getMonth() + 1),
		DD: pad(date.getDate()),
		HH: pad(date.getHours()),
		mm: pad(date.getMinutes()),
	};
	return {
		format: (pattern = '') => pattern.replace(/YYYY|MM|DD|HH|mm/g, (token) => parts[token]!),
		startOf() { return this; },
		subtract() { return this; },
		clone() { return this; },
		valueOf: () => date.getTime(),
		isValid: () => true,
	} as never;
};

test('folders are vault paths: slashes cleaned, hidden folders and .. refused', () => {
	expect(cleanVaultFolder(' /Projects\\Alpha/ ')).toBe('Projects/Alpha');
	expect(cleanVaultFolder('')).toBe('');
	expect(() => cleanVaultFolder('../x')).toThrow();
	expect(() => cleanVaultFolder('.huhu/content')).toThrow();
	expect(safeFileName('a/b:c*  d')).toBe('a-b-c-d');
	expect(notePathFor('Archive/Done')).toBe('Archive/Done.md');
	expect(notePathFor('.huhu/content/Archive/Done')).toBe('.huhu/content/Archive/Done.md');
});

test('a note is created in its vault folder, the folder is made when missing, and a taken name gets a number', async () => {
	const { app, contents } = memoryVault({});
	const first = await createVaultNote(app, 'Projects/Alpha', 'Spec', 'body');
	const second = await createVaultNote(app, 'Projects/Alpha', 'Spec', 'body');
	expect(first.path).toBe('Projects/Alpha/Spec.md');
	expect(second.path).toBe('Projects/Alpha/Spec-2.md');
	expect([...contents.keys()].every((path) => !path.startsWith('.huhu'))).toBe(true);
	expect(vaultFolders(app)).toEqual(['Projects', 'Projects/Alpha']);
	expect(notesInFolder(app, 'Projects/Alpha').map((file) => file.path).sort()).toEqual([
		'Projects/Alpha/Spec-2.md',
		'Projects/Alpha/Spec.md',
	]);
	expect(notesInFolder(app, 'Projects/Be')).toEqual([]);
});

test('an inbox item is one flat Markdown file at <root>/YYYY-MM-DD-HHmm-<title>.md, listed by modification time', async () => {
	const { app, contents } = memoryVault({});
	const now = at('2026-10-19T14:05:00');
	const memo = await createMemoFile(app, 'huhu/收件箱', '买 牛奶', '', now);
	expect(memo.path).toBe('huhu/收件箱/2026-10-19-1405-买-牛奶.md');
	await createMemoFile(app, 'huhu/收件箱', '旧的', '', at('2026-09-02T08:30:00'));
	await createMemoFile(app, '自定义/收集', '别处', '', now);
	expect([...contents.keys()].every((path) => !path.includes(' '))).toBe(true);
	const stat = (mtime: number) => ({ ctime: 0, mtime });
	const listed = listMemos(
		[
			{ path: 'huhu/收件箱/2026-09-02-0830-旧的.md', basename: '2026-09-02-0830-旧的', stat: stat(2) },
			{ path: 'huhu/收件箱/2026-10-19-1405-买-牛奶.md', basename: '2026-10-19-1405-买-牛奶', stat: stat(9) },
			{ path: 'huhu/收件箱/深/2026-10-20-0900-子目录.md', basename: '2026-10-20-0900-子目录', stat: stat(5) },
			{ path: '其他/2026-10-20-0900-无关.md', basename: '2026-10-20-0900-无关', stat: stat(99) },
		],
		'huhu/收件箱',
	);
	expect(listed.map(memoTitle)).toEqual(['买-牛奶', '子目录', '旧的']);
	expect(new Date(memoTime(listed[0]!)).getHours()).toBe(14);
});

test('a quick-note button names its note by the date format, YYYY-MM-DD-HHmm unless it has one', () => {
	const now = at('2026-10-19T14:05:00');
	expect(presetNoteName('', now)).toBe('2026-10-19-1405');
	expect(presetNoteName('YYYY-MM-DD', now)).toBe('2026-10-19');
	expect(presetNoteName('{{date:YYYY-MM}}', now)).toBe('2026-10');
});

test('fuzzy search matches letters in order, best first', () => {
	expect(fuzzyScore('rdmp', 'Roadmap')).not.toBeNull();
	expect(fuzzyScore('xyz', 'Roadmap')).toBeNull();
	expect(fuzzyFilter(['Planning notes', 'Plan', 'p-l-a'], 'plan', (s) => s)).toEqual(['Plan', 'Planning notes']);
});
