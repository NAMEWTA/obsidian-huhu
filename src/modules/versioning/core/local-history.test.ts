import { expect, test } from 'vitest';
import { isHistoryPath } from './local-history';

test('automatic history accepts visible notes and rejects private, host and noncanonical paths', () => {
	for (const path of ['note.md', '中文 目录/笔记.md', 'huhu/日志/日记.md']) expect(isHistoryPath(path, 'host-config')).toBe(true);
	for (const path of ['.huhu/browser/secret.md', '.huhu/safe/export.md', 'a/.private/note.md', '../note.md', '/note.md', 'C:/note.md', 'a\\note.md', 'a//note.md', 'host-config/plugins/secret.md', 'note.txt'])
		expect(isHistoryPath(path, 'host-config'), path).toBe(false);
});
