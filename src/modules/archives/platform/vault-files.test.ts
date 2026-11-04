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
	return { file, view, other, app, files: vaultContactsFiles(app) };
}
describe('archive production editor guard adapter', () => {
	test('checks all Markdown leaves, not only the active leaf', () => {
		const { file, other, files } = fixture();
		expect(() => files.checkEditor(file, 'disk')).not.toThrow();
		other.editor.getValue = () => 'unsaved in another window';
		expect(() => files.checkEditor(file, 'disk')).toThrow('unsavedEditor');
	});
});
