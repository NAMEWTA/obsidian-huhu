// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test, vi } from 'vitest';
import type { App, Component, Editor, MarkdownView, TFile } from 'obsidian';
import { registerAttachmentHandlers, saveAttachments, wantsPastedFiles, type AttachmentPorts } from './attachments';

const now = new Date(2026, 9, 21, 7, 5, 9);

function ports(existing: string[] = []) {
	const files = new Map<string, number>(existing.map((path) => [path, 0]));
	const folders: string[] = [];
	const api: AttachmentPorts = {
		exists: (path) => files.has(path),
		ensureFolder: (path) => { folders.push(path); return Promise.resolve(); },
		write: (path, data) => { files.set(path, data.byteLength); return Promise.resolve({ path, extension: path.slice(path.lastIndexOf('.') + 1) } as TFile); },
		link: (file, source) => `${file.extension === 'png' ? '!' : ''}[[${file.path}|from ${source}]]`,
	};
	return { api, files, folders };
}

const png = (name = 'image.png', bytes = 4) => new File([new Uint8Array(bytes)], name, { type: 'image/png' });

test('files are saved beside the note in assets, named by date, time and a random token', async () => {
	const p = ports();
	const result = await saveAttachments(p.api, { notePath: 'Projects/Alpha/plan.md', files: [png(), new File(['%PDF'], 'Spec Sheet.PDF', { type: 'application/pdf' })], folderName: 'assets', now, random: () => 0.25 });
	expect(result.failed).toEqual([]);
	// The same token on two extensions is two different paths.
	expect([...p.files.keys()].sort()).toEqual(['Projects/Alpha/assets/2026-10-21-070509-4000.pdf', 'Projects/Alpha/assets/2026-10-21-070509-4000.png']);
	expect(p.folders[0]).toBe('Projects/Alpha/assets');
	expect(result.links).toHaveLength(2);
	expect(result.links[0]).toMatch(/^!\[\[Projects\/Alpha\/assets\/2026-10-21-\d{6}-[0-9a-f]{4}\.png\|from Projects\/Alpha\/plan\.md\]\]$/);
});

test('files added in the same second get different names, even when the random token repeats', async () => {
	const p = ports(['assets/2026-10-21-070509-4000.png']);
	let calls = 0;
	const result = await saveAttachments(p.api, { notePath: 'top.md', files: [png(), png(), png()], folderName: 'assets', now, random: () => (calls++ < 2 ? 0.25 : 0.5 + calls / 100) });
	expect(result.links).toHaveLength(3);
	expect(new Set([...p.files.keys()]).size).toBe(4);
	expect([...p.files.keys()]).toContain('assets/2026-10-21-070509-4000.png');
});

test('a file that cannot be written is reported and the others are still saved', async () => {
	const p = ports();
	const failing: AttachmentPorts = { ...p.api, write: (path, data) => (path.endsWith('.pdf') ? Promise.reject(new Error('disk')) : p.api.write(path, data)) };
	const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
	const result = await saveAttachments(failing, { notePath: 'n.md', files: [png('a.png'), new File(['x'], 'b.pdf', { type: 'application/pdf' })], folderName: 'assets', now });
	error.mockRestore();
	expect(result.failed).toEqual(['b.pdf']);
	expect(result.links).toHaveLength(1);
});

const transfer = (files: File[], text = '') => ({ files: files as unknown as FileList, getData: (type: string) => (type === 'text/plain' ? text : '') });

test('only a payload of files is taken; text, and a text copy with its picture, stay with Obsidian', () => {
	expect(wantsPastedFiles(null)).toBe(false);
	expect(wantsPastedFiles(transfer([], 'hello'))).toBe(false);
	expect(wantsPastedFiles(transfer([png()]))).toBe(true);
	expect(wantsPastedFiles(transfer([png()], 'A1\tB1'))).toBe(false);
	expect(wantsPastedFiles(transfer([new File(['x'], 'doc.pdf', { type: 'application/pdf' })], '/home/me/doc.pdf'))).toBe(true);
});

function editorFixture(options: { enabled?: boolean; note?: { path: string; extension: string } | null } = {}) {
	const handlers = new Map<string, (...args: never[]) => void>();
	const app = { workspace: { on: (name: string, handler: (...args: never[]) => void) => { handlers.set(name, handler); return { name }; } } } as unknown as App;
	const scope = { registerEvent: () => undefined } as unknown as Component;
	const p = ports();
	const failures: string[][] = [];
	registerAttachmentHandlers({ app, scope, ports: p.api, enabled: () => options.enabled ?? true, folderName: () => 'assets', notifyFailed: (names) => failures.push(names), now: () => now });
	const inserted: string[] = [];
	const editor = { replaceSelection: (text: string) => inserted.push(text), replaceRange: (text: string) => inserted.push(`range:${text}`), offsetToPos: () => ({ line: 0, ch: 0 }) } as unknown as Editor;
	const info = { file: options.note === undefined ? { path: 'a/n.md', extension: 'md' } : options.note } as unknown as MarkdownView;
	const event = (data: ReturnType<typeof transfer>) => { const e = { defaultPrevented: false, clipboardData: data, dataTransfer: data, clientX: 0, clientY: 0, preventDefault() { this.defaultPrevented = true; } }; return e; };
	return { handlers, p, inserted, editor, info, event, failures };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('pasting an image saves it, blocks Obsidian\'s own paste and inserts the link at the caret', async () => {
	const f = editorFixture();
	const event = f.event(transfer([png()]));
	(f.handlers.get('editor-paste') as (...args: unknown[]) => void)(event, f.editor, f.info);
	expect(event.defaultPrevented).toBe(true);
	await settle();
	expect(f.inserted).toHaveLength(1);
	expect(f.inserted[0]).toMatch(/^!\[\[a\/assets\/2026-10-21-070509-[0-9a-f]{4}\.png/);
});

test('dropping files inserts one link per line; text, other plugins\' events, a disabled setting and non-Markdown notes are left alone', async () => {
	const f = editorFixture();
	const drop = f.event(transfer([png('a.png'), png('b.png')]));
	(f.handlers.get('editor-drop') as (...args: unknown[]) => void)(drop, f.editor, f.info);
	expect(drop.defaultPrevented).toBe(true);
	await settle();
	expect(f.inserted[0]!.split('\n')).toHaveLength(2);

	const text = f.event(transfer([], 'plain text'));
	(f.handlers.get('editor-paste') as (...args: unknown[]) => void)(text, f.editor, f.info);
	expect(text.defaultPrevented).toBe(false);

	const taken = f.event(transfer([png()]));
	taken.defaultPrevented = true;
	(f.handlers.get('editor-paste') as (...args: unknown[]) => void)(taken, f.editor, f.info);
	await settle();
	expect(f.inserted).toHaveLength(1);

	const off = editorFixture({ enabled: false });
	const ignored = off.event(transfer([png()]));
	(off.handlers.get('editor-paste') as (...args: unknown[]) => void)(ignored, off.editor, off.info);
	expect(ignored.defaultPrevented).toBe(false);

	const canvas = editorFixture({ note: { path: 'x.canvas', extension: 'canvas' } });
	const other = canvas.event(transfer([png()]));
	(canvas.handlers.get('editor-paste') as (...args: unknown[]) => void)(other, canvas.editor, canvas.info);
	expect(other.defaultPrevented).toBe(false);
});
