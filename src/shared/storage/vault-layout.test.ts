import { dashboardPath } from './dashboard-paths';
import { expect, test } from 'vitest';
import { isContentPath } from './content-paths';
import {
	AUTOMATION_DEFINITIONS_ROOT,
	captureDayOf,
	captureDayPath,
	captureDayPathFor,
	captureLine,
	DASHBOARDS_ROOT,
	datedName,
	DEFAULT_DASHBOARD_FILE,
	inboxFileName,
	INBOX_ROOT,
	isVisibleHuhuPath,
	huhuName,
	HUHU_VISIBLE_ROOT,
	TASK_ARCHIVE_PATH,
} from './vault-layout';

const at = (iso: string) => {
	const date = new Date(iso), pad = (n: number) => String(n).padStart(2, '0');
	const parts: Record<string, string> = { YYYY: String(date.getFullYear()), MM: pad(date.getMonth() + 1), DD: pad(date.getDate()), HH: pad(date.getHours()), mm: pad(date.getMinutes()) };
	return { format: (pattern: string) => pattern.replace(/YYYY|MM|DD|HH|mm/g, (token) => parts[token]!) };
};

test('every visible default lives under huhu/ and none is hidden', () => {
	for (const path of [INBOX_ROOT, TASK_ARCHIVE_PATH]) {
		expect(path.startsWith(HUHU_VISIBLE_ROOT + '/')).toBe(true);
		expect(path.split('/').some((part) => part.startsWith('.'))).toBe(false);
		expect(isVisibleHuhuPath(path)).toBe(true);
	}
	expect(TASK_ARCHIVE_PATH).toBe('huhu/待办/已完成.md');
	expect(isVisibleHuhuPath('huhux/a.md')).toBe(false);
});

test('only boards and automation definitions are hidden HUHU documents', () => {
	expect(DASHBOARDS_ROOT).toBe('.huhu/dashboards');
	expect(AUTOMATION_DEFINITIONS_ROOT).toBe('.huhu/automation/definitions');
	expect(isContentPath(`${DEFAULT_DASHBOARD_FILE}.md`)).toBe(true);
	expect(isContentPath('.huhu/content/old.md')).toBe(false);
	expect(isContentPath('.huhu/automation/dev/runs/1.json')).toBe(false);
	expect(isContentPath('huhu/日志/a.md')).toBe(false);
	expect(() => dashboardPath('Work')).toThrow();
	expect(dashboardPath('.huhu/dashboards/Work')).toBe('.huhu/dashboards/Work');
	expect(dashboardPath()).toBe(DEFAULT_DASHBOARD_FILE);
	expect(() => dashboardPath('.git/x')).toThrow();
});

test('generated names never contain whitespace or characters a filesystem refuses', () => {
	expect(huhuName('First article')).toBe('First-article');
	expect(huhuName('  a\tb \n c  ')).toBe('a-b-c');
	expect(huhuName('a/b:c*?"<>|d')).toBe('a-b-c-d');
	expect(huhuName('张 三  企业')).toBe('张-三-企业');
	expect(huhuName('...')).toBe('未命名');
	expect(huhuName('', 'Untitled')).toBe('Untitled');
	expect(huhuName('x'.repeat(300))).toHaveLength(100);
});

test('inbox and dated file names join the stamp and the title with dashes', () => {
	const now = at('2026-10-21T16:54:00');
	expect(inboxFileName('新备忘', now)).toBe('2026-10-21-1654-新备忘');
	expect(inboxFileName('Buy  milk', now)).toBe('2026-10-21-1654-Buy-milk');
	expect(datedName('First article', at('2026-10-20T08:00:00'))).toBe('2026-10-20-First-article');
});

test('a capture goes to the file of its day in the inbox, one list item per capture', () => {
	const now = at('2026-10-21T16:54:00');
	expect(captureDayPath(INBOX_ROOT, now)).toBe('huhu/收件箱/2026-10-21-闪念.md');
	expect(captureDayPath('huhu/收件箱/', now)).toBe('huhu/收件箱/2026-10-21-闪念.md');
	expect(captureDayPathFor('huhu/收件箱', '2026-10-22')).toBe('huhu/收件箱/2026-10-22-闪念.md');
	expect(captureDayOf('2026-10-21-闪念')).toBe('2026-10-21');
	expect(captureDayOf('2026-10-21-1654-闪念')).toBeUndefined();
	expect(captureDayOf('2026-10-21-闪念-草稿')).toBeUndefined();
	expect(captureLine('  想法 ', now)).toBe('- 16:54 想法');
	expect(captureLine('第一行\n第二行', now)).toBe('- 16:54 第一行\n  第二行');
});
