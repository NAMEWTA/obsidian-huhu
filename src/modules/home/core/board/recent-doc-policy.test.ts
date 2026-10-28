import { expect, test } from 'vitest';
import { isRecentUserDocument } from './recent-doc-policy';

test('archive resource classification follows moved metadata without excluding ordinary attachments', () => {
	const scope = {
		contacts: { rootFolder: 'Data' },
		classifyArchive: (path: string) =>
			path.endsWith('/moved.md') ? 'definition' : path.endsWith('/note.md') ? 'attachment' : 'ordinary',
	};
	expect(isRecentUserDocument('Data/Anywhere/moved.md', scope)).toBe(false);
	expect(isRecentUserDocument('Data/Project/note.md', scope)).toBe(true);
	expect(isRecentUserDocument('Elsewhere/note.md', scope)).toBe(true);
});
test('canonical schema, relation and migration directories are excluded even when archives is off', () => {
	const scope = { contacts: { rootFolder: 'Data' } };
	for (const path of ['档案集合.md', '档案定义/类型/project.md', '关联记录/member/edge.md', '迁移记录/op/原文/A.md'])
		expect(isRecentUserDocument(`Data/${path}`, scope)).toBe(false);
	expect(isRecentUserDocument('Data/Projects/A/research.md', scope)).toBe(true);
});
