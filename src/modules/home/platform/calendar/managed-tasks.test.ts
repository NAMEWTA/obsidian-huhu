import { expect, test } from 'vitest';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { collectVaultTasks, removeTaskFromFile, toggleTaskInFile } from './alltasks-scan';

test('managed board tasks survive folder exclusions and use guarded writes when toggled', async () => {
	const path = '.huhu/dashboards/Boards/work.md';
	const vault = memoryVault({ [path]: '# Board\n- [ ] Review [due:: 2026-10-11]' });
	const tasks = await collectVaultTasks(vault.app, ['.huhu/dashboards/Boards'], '.huhu/dashboards/Boards/work');
	expect(tasks.map(task => task.path)).toEqual([path]);
	await toggleTaskInFile(vault.app, tasks[0]!, true);
	expect(vault.contents.get(path)).toContain('- [x] Review');
	expect(await collectVaultTasks(vault.app, ['.huhu/dashboards/Boards'])).toEqual([]);
});

test('removing a task deletes exactly its line, and nothing when the line moved ambiguously', async () => {
	const path = '.huhu/dashboards/Boards/day.md';
	const vault = memoryVault({ [path]: '# Day\n- [ ] Same [due:: 2026-10-11]\n- [ ] Other [due:: 2026-10-11]\n- [ ] Same [due:: 2026-10-11]' });
	const tasks = await collectVaultTasks(vault.app, []);
	const other = tasks.find((task) => task.text.startsWith('Other'))!;
	expect(await removeTaskFromFile(vault.app, other)).toBe(true);
	expect(vault.contents.get(path)).toBe('# Day\n- [ ] Same [due:: 2026-10-11]\n- [ ] Same [due:: 2026-10-11]');
	// the same line twice and a stale line number: ambiguous, so the file stays as it is
	const stale = { ...tasks.find((task) => task.text.startsWith('Same'))!, line: 99 };
	expect(await removeTaskFromFile(vault.app, stale)).toBe(false);
	expect(vault.contents.get(path)).toContain('Same');
});
