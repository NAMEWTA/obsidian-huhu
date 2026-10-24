// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test, vi } from 'vitest';
import { TFile, type App, type WorkspaceLeaf } from 'obsidian';
import { setLanguage } from '../../../shared/i18n';
import { DEFAULT_NOTE_PROPERTIES, isoDate } from '../core/new-note';
import { DialogRegistry } from './dialog-registry';
import { createObsidianOps } from './ops';

const file = (path: string) => Object.assign(Object.create(TFile.prototype) as TFile, { path });

function leaf(shows?: string) {
	return { view: { file: shows ? { path: shows } : null, getViewType: () => 'markdown' }, getViewState: () => ({ pinned: false }), openFile: vi.fn(() => Promise.resolve()) } as unknown as WorkspaceLeaf & { openFile: ReturnType<typeof vi.fn> };
}

function fixture(leaves: Array<WorkspaceLeaf & { openFile: ReturnType<typeof vi.fn> }>) {
	const fresh = leaf();
	const setActiveLeaf = vi.fn();
	const created: Array<[string, string]> = [];
	const app = {
		workspace: {
			rootSplit: {},
			iterateRootLeaves: (callback: (leaf: WorkspaceLeaf) => void) => leaves.forEach(callback),
			getMostRecentLeaf: () => leaves[0],
			getLeaf: vi.fn(() => fresh),
			setActiveLeaf,
		},
		vault: {
			getFileByPath: (path: string) => file(path),
			getAbstractFileByPath: () => null,
			create: (path: string, content: string) => { created.push([path, content]); return Promise.resolve(file(path)); },
		},
	} as unknown as App;
	const ops = createObsidianOps(app, () => undefined, new DialogRegistry(), { defaultProperties: () => DEFAULT_NOTE_PROPERTIES });
	return { app, ops, fresh, setActiveLeaf, created };
}

test('a clicked note activates the tab that already shows it instead of opening another one', async () => {
	const showing = leaf('Work/a.md');
	const t = fixture([leaf('Other.md'), showing]);
	await t.ops.open('Work/a.md', { newTab: true, reuse: true });
	expect(t.setActiveLeaf).toHaveBeenCalledWith(showing, { focus: false });
	expect(t.app.workspace.getLeaf).not.toHaveBeenCalled();
	expect(showing.openFile).not.toHaveBeenCalled();
});

test('a note that is not open yet opens in a new tab; without the new-tab ask it replaces the current one', async () => {
	const current = leaf('Other.md');
	const t = fixture([current]);
	await t.ops.open('Work/b.md', { newTab: true, reuse: true });
	expect(t.app.workspace.getLeaf).toHaveBeenCalledWith('tab');
	expect(t.fresh.openFile).toHaveBeenCalledTimes(1);
	expect(current.openFile).not.toHaveBeenCalled();
	await t.ops.open('Work/c.md', {});
	expect(current.openFile).toHaveBeenCalledTimes(1);
});

test('a note made in the navigator is named after today and starts with the default properties', async () => {
	setLanguage('en');
	const t = fixture([]);
	const path = await t.ops.createNote('Projects', undefined);
	expect(path).toBe(`Projects/${isoDate(new Date())}-Untitled.md`);
	expect(t.created[0]![1]).toBe('---\n状态: 在用\ntags:\n  - \n  - \n---\n');
	await t.ops.createNote('Projects', 'work');
	expect(t.created[1]![1]).toBe('---\n状态: 在用\ntags:\n  - work\n  - \n---\n');
	setLanguage('zh');
	await t.ops.createNote('/', undefined);
	expect(t.created[2]![0]).toBe(`${isoDate(new Date())}-未命名.md`);
	setLanguage('en');
});

test('periodic note opens and reuse stay inside the owner window even when the main editor is most recent', async () => {
	const main = {} as Window, owner = {} as Window;
	const mainLeaf = leaf('Journal/Entry.md'), ownedLeaf = leaf('Other.md');
	const root = {}, popout = {};
	Object.assign(mainLeaf.view, { containerEl: { ownerDocument: { defaultView: main } } });
	Object.assign(ownedLeaf.view, { containerEl: { ownerDocument: { defaultView: owner } } });
	Object.assign(ownedLeaf, { getContainer: () => popout });
	const f = fixture([mainLeaf]);
	Object.assign(f.app.workspace, { rootSplit: root, iterateAllLeaves: (callback: (leaf: WorkspaceLeaf) => void) => [mainLeaf, ownedLeaf].forEach(callback), getMostRecentLeaf: (container: unknown) => container === popout ? ownedLeaf : mainLeaf });
	await f.ops.open('Journal/Entry.md', { focus: true, ownerWindow: owner, reuse: true });
	expect(ownedLeaf.openFile).toHaveBeenCalledTimes(1);
	expect(mainLeaf.openFile).not.toHaveBeenCalled();
	expect(f.setActiveLeaf).toHaveBeenLastCalledWith(ownedLeaf, { focus: true });
	for (const options of [{ newTab: true }, { split: true }]) {
		await f.ops.open('Journal/Another.md', { ...options, ownerWindow: owner });
		expect(f.setActiveLeaf).toHaveBeenLastCalledWith(ownedLeaf, { focus: false });
		expect(f.app.workspace.getLeaf).toHaveBeenLastCalledWith(options.newTab ? 'tab' : 'split');
	}
	expect(f.fresh.openFile).toHaveBeenCalledTimes(2);
});
