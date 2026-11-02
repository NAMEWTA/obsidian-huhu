import { MarkdownView, TFile, type App, type Component, type WorkspaceLeaf } from 'obsidian';
import { isHistoryPath } from '../../core/local-history';
import type { HistoryTrigger } from '../../core/local-history';

interface HistoryCapture { path: string; text: string; sourceId: string }
interface CaptureControl {
	readonly snapshot: { enabled: boolean };
	sample(trigger: HistoryTrigger, captures?: readonly HistoryCapture[]): Promise<void>;
	subscribe(listener: () => void): () => void;
	relocate(from: string, to: string | null): Promise<void>;
}

/** Reads editor buffers directly, including popouts. It has no save, note-write, or Git capability. */
export function createHistoryCapture(app: App, enabled: () => boolean) {
	const ids = new WeakMap<WorkspaceLeaf, string>();
	const retired = new WeakSet<TFile>();
	const read = (leaf: WorkspaceLeaf): HistoryCapture | undefined => {
		const view = leaf.view;
		if (!enabled() || !(view instanceof MarkdownView) || !view.file || retired.has(view.file) || !isHistoryPath(view.file.path, app.vault.configDir)) return;
		let sourceId = ids.get(leaf);
		if (!sourceId) { sourceId = crypto.randomUUID(); ids.set(leaf, sourceId); }
		return { path: view.file.path, text: view.editor.getValue(), sourceId };
	};
	const capture = () => app.workspace.getLeavesOfType('markdown').flatMap(leaf => { const item = read(leaf); return item ? [item] : []; });
	return {
		capture,
		attach(lifetime: Component, automatic: CaptureControl, report: (error: unknown) => void) {
			let current = app.workspace.getActiveViewOfType(MarkdownView);
			let previous = current ? read(current.leaf) : undefined;
			const follow = () => {
				current = app.workspace.getActiveViewOfType(MarkdownView);
				const next = current ? read(current.leaf) : undefined;
				if (previous && (!next || next.path !== previous.path || next.sourceId !== previous.sourceId))
					void automatic.sample('switch', [previous]);
				previous = next;
			};
			lifetime.register(automatic.subscribe(() => {
				if (!automatic.snapshot.enabled) previous = undefined;
				else if (!previous && current) previous = read(current.leaf);
			}));
			lifetime.registerEvent(app.workspace.on('editor-change', (_editor, info) => {
				if (info instanceof MarkdownView && current?.leaf === info.leaf) previous = read(info.leaf);
			}));
			lifetime.registerEvent(app.workspace.on('active-leaf-change', follow));
			lifetime.registerEvent(app.workspace.on('file-open', follow));
			lifetime.registerEvent(app.vault.on('modify', file => {
				if (file instanceof TFile && isHistoryPath(file.path, app.vault.configDir))
					void automatic.sample('important', enabled() ? capture().filter(item => item.path === file.path) : []);
			}));
			lifetime.registerEvent(app.vault.on('rename', (file, oldPath) => {
				if (!(file instanceof TFile)) return;
				const target = isHistoryPath(file.path, app.vault.configDir) ? file.path : null;
				if (previous?.path === oldPath) previous = target ? { ...previous, path: target } : undefined;
				void automatic.relocate(oldPath, target)
					.then(() => automatic.sample('important')).catch(report);
			}));
			lifetime.registerEvent(app.vault.on('delete', file => {
				if (file instanceof TFile) {
					retired.add(file);
					if (previous?.path === file.path) previous = undefined;
					void automatic.relocate(file.path, null).catch(report);
				}
			}));
		},
	};
}
