import { expect, test, vi } from 'vitest';
import { createPeriodicHealth } from './health';
import type { App } from 'obsidian';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';

test('periodic checks validate canonical paths and missing templates without reading bodies or executing templates', async () => {
	const exists = vi.fn(async () => false);
	const check = createPeriodicHealth({ available: () => true, root: () => 'huhu/journal', weekStart: () => 1,
		paths: () => ['huhu/journal/daily/2026/02/2026-02-30.md', 'huhu/journal/daily/2026/02/2026-02-02.md', 'ordinary.md'],
		templates: () => ['Private-template.md'], exists });
	const chunks = [];
	for await (const chunk of check.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 100 })) chunks.push(chunk);
	expect(chunks.flatMap(chunk => chunk.issues ?? []).map(issue => issue.code)).toEqual(['unparseable', 'dangling-reference']);
	expect(JSON.stringify(chunks)).not.toMatch(/Private|journal|ordinary/);
	expect(exists.mock.calls).toHaveLength(1);
});

test.each([
	['Daily', 'Templates', '', 'Templates/Daily.md'],
	['Templates/Daily', '', '', 'Templates/Daily.md'],
	['Daily.md', 'Templates', '', 'Templates/Daily.md'],
	['Templates/Daily.md', '', '', 'Templates/Daily.md'],
	['Daily', '', 'CoreTemplates', 'CoreTemplates/Daily.md'],
	['Daily.md', 'OtherTemplates', 'CoreTemplates', 'CoreTemplates/Daily.md'],
])('period and folder template reference %s uses normal name resolution', async (name, templateFolder, coreFolder, path) => {
	const vault = memoryVault({ [path]: 'PRIVATE TEMPLATE BODY' });
	Object.assign(vault.app, { internalPlugins: { getPluginById: () => ({ enabled: !!coreFolder, instance: { options: { folder: coreFolder } } }) } });
	const read = vi.spyOn(vault.app.vault, 'read'), write = vi.spyOn(vault.adapter, 'write');
	const check = createPeriodicHealth({ available: () => true,
		periodic: { root: () => 'huhu/journal', weekStart: () => 1, template: period => period === 'day' ? name : undefined },
		app: vault.app, settings: { get: () => ({ templateFolder, folderTemplates: [{ template: name }] }) } });
	const chunks = [];
	for await (const chunk of check.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 10 })) chunks.push(chunk);
	expect(chunks.flatMap(chunk => chunk.issues ?? [])).toEqual([]);
	expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
	expect(vault.reads).toBe(0); expect(vault.writes).toBe(0);
});

test('owner registration stays inert until a scan and still resolves template references through its read-only ports', async () => {
	const paths = vi.fn(() => [{ path: 'huhu/journal/daily/2026/01/2026-01-01.md' }]);
	const lookup = vi.fn(() => null);
	const settings = vi.fn(() => ({ templateFolder: '', folderTemplates: [{ template: 'missing.md' }] }));
	const check = createPeriodicHealth({ available: () => true,
		periodic: { root: () => 'huhu/journal', weekStart: () => 1, template: () => undefined },
		app: { vault: { getMarkdownFiles: paths, getAbstractFileByPath: lookup } } as unknown as App, settings: { get: settings } });
	const signal = new AbortController().signal;
	expect(await check.permission(signal)).toBe('allowed');
	expect(paths).not.toHaveBeenCalled(); expect(settings).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled();
	const chunks = [];
	for await (const chunk of check.scan({ signal, batchSize: 1, remainingItems: 10 })) chunks.push(chunk);
	const issues = chunks.flatMap(chunk => chunk.issues ?? []);
	expect(issues.map(issue => issue.code)).toEqual(['dangling-reference']);
	expect(check.resolve(issues[0]!.reference!)).toBe('missing.md');
	check.dispose();
	expect(check.resolve(issues[0]!.reference!)).toBeUndefined();
});

test('normal template resolution still reports genuinely missing references without reading or writing notes', async () => {
	const vault = memoryVault({ 'Templates/Daily.md': 'PRIVATE TEMPLATE' });
	Object.assign(vault.app, { internalPlugins: { getPluginById: () => ({ enabled: true, instance: { options: { folder: 'Templates' } } }) } });
	const check = createPeriodicHealth({ available: () => true,
		periodic: { root: () => 'huhu/journal', weekStart: () => 1, template: period => period === 'day' ? 'Missing' : undefined },
		app: vault.app, settings: { get: () => ({ templateFolder: 'Templates', folderTemplates: [{ template: 'Missing' }] }) } });
	const chunks = [];
	for await (const chunk of check.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 10 })) chunks.push(chunk);
	const issues = chunks.flatMap(chunk => chunk.issues ?? []);
	expect(issues.map(issue => issue.code)).toEqual(['dangling-reference']);
	expect(check.resolve(issues[0]!.reference!)).toBe('Missing');
	expect(vault.reads).toBe(0); expect(vault.writes).toBe(0);
});

test('template lookup stops at cancellation and never starts a later slice', async () => {
	const controller = new AbortController();
	const exists = vi.fn(async () => { controller.abort(); return false; });
	const check = createPeriodicHealth({ available: () => true, root: () => 'huhu/journal', weekStart: () => 1,
		paths: () => [], templates: () => ['a.md', 'b.md'], exists });
	await expect(check.scan({ signal: controller.signal, batchSize: 1, remainingItems: 10 })[Symbol.asyncIterator]().next()).rejects.toThrow();
	expect(exists).toHaveBeenCalledTimes(1);
});
