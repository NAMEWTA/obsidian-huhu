import { dashboardFilePath, dashboardPath } from './dashboard-paths';
import { expect, test } from 'vitest';
import { contentPath, isContentPath, vaultDocumentPath } from './content-paths';

test.each(['.huhu/dashboards/团队 (100%).md', '.huhu\\dashboards\\团队 (100%).md', '.huhu/dashboards\\团队 (100%).md'])(
	'managed paths use one canonical spelling: %s',
	(input) => {
		expect(contentPath(input)).toBe('.huhu/dashboards/团队 (100%).md');
		expect(isContentPath(input)).toBe(true);
		expect(vaultDocumentPath(input)).toBe('.huhu/dashboards/团队 (100%).md');
	},
);
test('board references and filenames convert only at the shared boundary', () => {
	expect(dashboardPath()).toBe('.huhu/dashboards/dashboard');
	expect(dashboardPath('.huhu\\dashboards\\团队 (100%).md')).toBe('.huhu/dashboards/团队 (100%)');
	expect(dashboardFilePath('.huhu\\dashboards\\团队 (100%).md')).toBe('.huhu/dashboards/团队 (100%).md');
	expect(dashboardFilePath('.huhu/dashboards/Case.md')).toBe('.huhu/dashboards/Case.md');
});
test.each([
	'dashboard',
	'.huhu/content/a',
	'.huhu/automation/definitions/a',
	'/.huhu/dashboards/a',
	'C:\\vault\\.huhu\\dashboards\\a',
	'.huhu/dashboards/../a',
	'.huhu/dashboards//a',
	'.huhu/dashboards/CON.md',
])('a board reference cannot guess or escape its root: %s', (input) => {
	expect(() => dashboardPath(input)).toThrow();
});
test.each([
	'.huhu\\dashboards\\..\\safe\\a',
	'.huhu/config/settings.json',
	'.huhu/content/old.md',
	'./.huhu/dashboards/a',
	'a/../.huhu/dashboards/a',
	'C:\\vault\\a',
	'\\\\server\\vault\\a',
])('invalid or private document inputs never fall through to visible writes: %s', (input) => {
	expect(() => vaultDocumentPath(input)).toThrow();
});
test('ordinary filenames retain host semantics and canonical separators', () => {
	expect(vaultDocumentPath('笔记\\团队 (100%).md')).toBe('笔记/团队 (100%).md');
	expect(vaultDocumentPath('notes/CON.md')).toBe('notes/CON.md');
	expect(isContentPath('.huhu/dashboards/../safe/a')).toBe(false);
	expect(isContentPath('.huhu/dashboards-other/a')).toBe(false);
});
