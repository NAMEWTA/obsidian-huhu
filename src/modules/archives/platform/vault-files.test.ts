import { describe, expect, test } from 'vitest';
import { MarkdownView, TFile, TFolder, type App, type WorkspaceLeaf } from 'obsidian';
import { vaultContactsFiles } from './vault-files';

function fixture() {
	const file = Object.assign(Object.create(TFile.prototype) as TFile, { path: 'archives/A/info.md' });
	const folder = Object.assign(Object.create(TFolder.prototype) as TFolder, { path: 'archives/A', children: [file] });
	const view: MarkdownView = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, {
		file,
		editor: { getValue: () => 'disk' },
	});
	const other: MarkdownView = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, {
		file,
		editor: { getValue: () => 'disk' },
	});
	const leaves = [{ view }, { view: other }] as unknown as WorkspaceLeaf[];
	const app = {
		vault: { getFileByPath: () => file, getAbstractFileByPath: () => folder, read: () => Promise.resolve('disk') },
		workspace: { getLeavesOfType: () => leaves },
	} as unknown as App;
	return { file, view, other, app, files: vaultContactsFiles(app, () => '') };
}
describe('archive production editor guard adapter', () => {
	test('checks all Markdown leaves, not only the active leaf', () => {
		const { file, other, files } = fixture();
		expect(() => files.checkEditor(file, 'disk')).not.toThrow();
		other.editor.getValue = () => 'unsaved in another window';
		expect(() => files.checkEditor(file, 'disk')).toThrow('unsavedEditor');
	});
	test('folder checks reject dirty descendants without matching sibling prefixes', async () => {
		const { other, files } = fixture();
		other.editor.getValue = () => 'unsaved';
		await expect(files.checkFolderEditors('archives/A')).rejects.toThrow('unsavedEditor');
		await expect(files.checkFolderEditors('archives/AB')).resolves.toBeUndefined();
	});
	test('folder checks reject a rename that finishes during disk read', async () => {
		const { file, app, files } = fixture();
		app.vault.read = () => {
			file.path = 'archives/B/info.md';
			return Promise.resolve('disk');
		};
		await expect(files.checkFolderEditors('archives/A')).rejects.toThrow('conflict');
	});
});
