import { expect, test } from 'vitest';
import type { App, TFile } from 'obsidian';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import type { PmConfig } from '../core/board/types/model';
import { ProjectStore } from './projects';

const config: PmConfig = { rootFolder: '项目管理', archiveFolder: '项目管理/归档', stages: [{ label: '洽谈' }, { label: '执行' }] };

/** The shared memory vault plus the two Obsidian calls this store uses that it does not provide. */
function setup(files: Record<string, string> = {}) {
	const vault = memoryVault(files);
	const app = vault.app as unknown as App & { vault: Record<string, unknown> };
	app.vault.cachedRead = (file: TFile) => app.vault.read(file);
	(app as unknown as { fileManager: unknown }).fileManager = {
		trashFile: async (file: TFile) => { vault.contents.delete(file.path); vault.emit('delete', file); },
		renameFile: async (file: TFile, to: string) => { vault.contents.set(to, vault.contents.get(file.path)!); vault.contents.delete(file.path); vault.emit('rename', vault.file(to), file.path); },
	};
	return { vault, app: app as unknown as App };
}

test('new projects, work notes and archived notes are visible vault notes, never managed .huhu content', async () => {
	const { vault, app } = setup({ 'Elsewhere/Other.md': '---\ntype: project\n---\n' });
	const store = new ProjectStore(app, config);
	await store.create('Alpha/客户');
	const paths = [...vault.contents.keys()];
	expect(paths).toContain('项目管理/Alpha-客户.md');
	expect(paths.some((path) => path.startsWith('.huhu'))).toBe(false);
	await store.load();
	const [project] = store.state.getState().projects;
	expect(project!.title).toBe('Alpha-客户');
	expect(project!.fields.stage).toBe('洽谈');
	const note = await store.workNote(project!);
	expect(note).toMatch(/^项目管理\/Alpha-客户\/\d{4}-\d{2}-\d{2}\.md$/);
	await store.archive(project!, true);
	expect(vault.contents.has('项目管理/归档/Alpha-客户.md')).toBe(true);
	expect(vault.contents.has('项目管理/Alpha-客户.md')).toBe(false);
	expect(store.state.getState().projects.map((p) => p.path)).toEqual(['项目管理/归档/Alpha-客户.md']);
});

test('only notes under the project folder with type: project are listed, and changes in it reload', async () => {
	const { vault, app } = setup({ '项目管理/One.md': '---\ntype: project\n---\n', '项目管理/Plain.md': '# not a project', 'Other/Two.md': '---\ntype: project\n---\n' });
	const store = new ProjectStore(app, config);
	const stop = store.connect();
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect(store.state.getState().projects.map((p) => p.path)).toEqual(['项目管理/One.md']);
	await vault.adapter.write('项目管理/Three.md', '---\ntype: project\n---\n');
	vault.emit('create', vault.file('项目管理/Three.md'));
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect(store.state.getState().projects.map((p) => p.path).sort()).toEqual(['项目管理/One.md', '项目管理/Three.md']);
	await store.fields('项目管理/One.md', { archived: true });
	expect(vault.contents.get('项目管理/One.md')).toContain('archived: true');
	stop();
});
