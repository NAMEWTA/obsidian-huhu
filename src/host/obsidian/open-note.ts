import type { App, TFile } from 'obsidian';

/** Anchor navigation to the owner's central area; a sidebar leaf must not redirect it to another window. */
export function activateWindowLeaf(app: App, owner?: Window): void {
	if (!owner) return;
	const workspace = app.workspace;
	let anchor = workspace.getMostRecentLeaf(workspace.rootSplit);
	if (anchor?.view.containerEl.ownerDocument.defaultView !== owner) workspace.iterateAllLeaves((leaf) => {
		if (leaf.view.containerEl.ownerDocument.defaultView === owner) anchor = workspace.getMostRecentLeaf(leaf.getContainer());
	});
	if (anchor?.view.containerEl.ownerDocument.defaultView === owner) workspace.setActiveLeaf(anchor, { focus: false });
}

export async function openNoteAt(app: App, file: TFile, options: { owner?: Window; line?: number; split?: boolean } = {}): Promise<void> {
	activateWindowLeaf(app, options.owner);
	const leaf = options.split ? app.workspace.getLeaf('split') : app.workspace.getLeaf('tab');
	await leaf.openFile(file, { active: true, ...(options.line !== undefined ? { eState: { line: options.line } } : {}) });
}
