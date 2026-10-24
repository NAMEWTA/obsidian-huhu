import { expect, test, vi } from 'vitest';
import type { App, TFile, WorkspaceLeaf } from 'obsidian';
import { openNoteAt } from './open-note';

test('source navigation activates the invoking window central leaf before opening a tab at its line', async () => {
	const frame = document.createElement('iframe'); document.body.appendChild(frame);
	try {
		const owner = frame.contentWindow! as unknown as Window;
		const main = { view: { containerEl: document.createElement('div') }, getContainer: () => 'main' } as unknown as WorkspaceLeaf;
		const popout = { view: { containerEl: frame.contentDocument!.createElement('div') }, getContainer: () => 'popout' } as unknown as WorkspaceLeaf;
		let active = main;
		const openFile = vi.fn(async () => {});
		const getLeaf = vi.fn(() => { expect(active).toBe(popout); return { openFile }; });
		const app = { workspace: { rootSplit: 'main', getMostRecentLeaf: (container: string) => container === 'popout' ? popout : main, iterateAllLeaves: (visit: (leaf: WorkspaceLeaf) => void) => { visit(main); visit(popout); }, setActiveLeaf: (leaf: WorkspaceLeaf) => { active = leaf; }, getLeaf } } as unknown as App;
		const file = { path: 'Source.md' } as TFile;
		await openNoteAt(app, file, { owner, line: 42 });
		expect(getLeaf).toHaveBeenCalledWith('tab'); expect(openFile).toHaveBeenCalledWith(file, { active: true, eState: { line: 42 } });
	} finally { frame.remove(); }
});
