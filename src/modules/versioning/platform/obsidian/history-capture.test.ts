import { MarkdownView, TFile, type App, type Component, type WorkspaceLeaf } from 'obsidian';
import { expect, test, vi } from 'vitest';
import { createHistoryCapture } from './history-capture';

test('the host reads unsaved buffers across windows, captures the outgoing note on switch and excludes hidden/config content', async () => {
	let enabled = false;
	const leaf = (path: string, text: string) => {
		const view = Object.assign(new MarkdownView({} as WorkspaceLeaf), { file: Object.assign(new TFile(), { path }), editor: { getValue: () => text } });
		const leaf = { view } as unknown as WorkspaceLeaf;
		Object.assign(view, { leaf });
		return leaf;
	};
	const a = leaf('note.md', 'unsaved A'), b = leaf('other.md', 'unsaved B'), hidden = leaf('.huhu/browser/secret.md', 'secret'), config = leaf('host-config/secret.md', 'config');
	let active = a;
	const listeners = new Map<string, (...args: unknown[]) => void>();
	const app = { vault: { configDir: 'host-config', on: (event: string, listener: (...args: unknown[]) => void) => { listeners.set(event, listener); } }, workspace: {
		getActiveViewOfType: () => active.view,
		getLeavesOfType: () => [a, b, hidden, config],
		on: (event: string, listener: (...args: unknown[]) => void) => { listeners.set(event, listener); },
	} } as unknown as App;
	const capture = createHistoryCapture(app, () => enabled);
	expect(capture.capture()).toEqual([]);
	enabled = true;
	expect(capture.capture().map(item => [item.path, item.text])).toEqual([['note.md', 'unsaved A'], ['other.md', 'unsaved B']]);
	const sample = vi.fn(async () => {});
	const rename = vi.fn(async () => {});
	capture.attach({ register() {}, registerEvent() {} } as unknown as Component,
		{ snapshot: { enabled: true }, sample, subscribe: () => () => {}, relocate: rename }, () => {});
	active = b; listeners.get('active-leaf-change')?.(b);
	expect(sample).toHaveBeenCalledWith('switch', [expect.objectContaining({ path: 'note.md', text: 'unsaved A' })]);
	listeners.get('modify')?.((b.view as MarkdownView).file);
	expect(sample).toHaveBeenCalledWith('important', [expect.objectContaining({ path: 'other.md', text: 'unsaved B' })]);
	listeners.get('rename')?.(Object.assign(new TFile(), { path: 'moved.md' }), 'other.md');
	await Promise.resolve(); expect(rename).toHaveBeenCalledWith('other.md', 'moved.md');
});
