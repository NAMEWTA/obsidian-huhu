import {
	MarkdownView,
	TFile,
	type App,
	type Component,
	type Editor,
	type EditorPosition,
	type EditorTransaction,
	type WorkspaceLeaf,
} from 'obsidian';
import { expect, test, vi } from 'vitest';
import { DocumentMutationCoordinator } from './document-mutation';

function fixture(initial: Record<string, string>) {
	const contents = new Map(Object.entries(initial)),
		files = new Map<string, TFile>(),
		leaves = new Map<string, WorkspaceLeaf>();
	let onChange: ((editor: Editor) => void) | undefined;
	const makeFile = (path: string) =>
		Object.assign(Object.create(TFile.prototype) as TFile, {
			path,
			stat: { size: contents.get(path)?.length ?? 0 },
		});
	for (const path of contents.keys()) files.set(path, makeFile(path));
	const read = vi.fn(async (file: TFile) => contents.get(file.path)!);
	const process = vi.fn(async (file: TFile, change: (text: string) => string) => {
		const result = change(contents.get(file.path)!);
		contents.set(file.path, result);
		return result;
	});
	const create = vi.fn(async (path: string, text: string) => {
		if (files.has(path)) throw new Error('File already exists');
		contents.set(path, text);
		const file = makeFile(path);
		files.set(path, file);
		return file;
	});
	const trashFile = vi.fn(async (file: TFile) => {
		files.delete(file.path);
		contents.delete(file.path);
	});
	const app = {
		vault: {
			adapter: {},
			getFileByPath: (path: string) => files.get(path) ?? null,
			getAbstractFileByPath: (path: string) => files.get(path) ?? null,
			read,
			process,
			create,
		},
		workspace: {
			getLeavesOfType: () => [...leaves.values()],
			on: (_name: string, listener: (editor: Editor) => void) => {
				onChange = listener;
				return {};
			},
		},
		fileManager: { trashFile },
	} as unknown as App;
	const lifetime = { registerEvent: vi.fn() } as unknown as Component;
	const draftGuard = vi.fn<(path: string, text: string) => void>();
	const documents = new DocumentMutationCoordinator(app, {
		lifetime,
		resolveLeaf: (id) => leaves.get(id),
		checkDrafts: draftGuard,
	});
	function open(id: string, path: string, initialText = contents.get(path)!) {
		let text = initialText;
		const offsetToPos = (offset: number): EditorPosition => {
			const lines = text.slice(0, offset).split('\n');
			return { line: lines.length - 1, ch: lines.at(-1)!.length };
		};
		const posToOffset = (pos: EditorPosition) => {
			const lines = text.split('\n');
			return lines.slice(0, pos.line).reduce((length, line) => length + line.length + 1, 0) + pos.ch;
		};
		const transaction = vi.fn((input: EditorTransaction) => {
			const changes = (input.changes ?? []).map((change) => ({
				from: posToOffset(change.from),
				to: posToOffset(change.to ?? change.from),
				insert: change.text,
			}));
			for (const change of changes.reverse())
				text = text.slice(0, change.from) + change.insert + text.slice(change.to);
			onChange?.(editor);
		});
		const editor = { getValue: () => text, offsetToPos, transaction } as unknown as Editor;
		const save = vi.fn(async () => {
			contents.set(path, text);
		});
		const view = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, {
			file: files.get(path)!,
			editor,
			save,
		});
		leaves.set(id, { view } as unknown as WorkspaceLeaf);
		return {
			editor,
			view,
			save,
			transaction,
			edit(next: string) {
				text = next;
				onChange?.(editor);
			},
		};
	}
	return {
		documents,
		contents,
		files,
		leaves,
		open,
		read,
		process,
		create,
		trashFile,
		draftGuard,
		replace(path: string) {
			files.set(path, makeFile(path));
		},
	};
}

test('source binding preserves the dirty buffer and uses one native transaction plus public save', async () => {
	const f = fixture({ 'note.md': 'disk baseline', 'other.md': 'other note' });
	const source = f.open('origin', 'note.md', 'draft top\nTARGET\ndraft bottom'),
		other = f.open('focused', 'other.md');
	const before = await f.documents.capture('note.md', 'origin');
	expect(before).toMatchObject({ text: 'draft top\nTARGET\ndraft bottom', diskText: 'disk baseline' });
	const after = await f.documents.apply(before, 'old top\nTARGET\nold bottom', 'restore-1');
	expect(after.text).toBe('old top\nTARGET\nold bottom');
	expect(after.diskText).toBe(after.text);
	expect(source.transaction).toHaveBeenCalledOnce();
	expect(source.save).toHaveBeenCalledOnce();
	expect(source.transaction.mock.calls[0]![0].changes).toHaveLength(2);
	expect(other.transaction).not.toHaveBeenCalled();
	expect(f.process).not.toHaveBeenCalled();
	expect(f.draftGuard).toHaveBeenCalledWith('note.md', before.text);
});

test('closed notes use Vault.process with a disk comparison and preserve BOM and CRLF bytes', async () => {
	const f = fixture({ 'note.md': 'before' }),
		before = await f.documents.capture('note.md');
	const target = '\uFEFFfirst\r\nsecond\r\n';
	expect((await f.documents.apply(before, target, 'restore')).diskText).toBe(target);
	expect(f.process).toHaveBeenCalledOnce();
	const next = await f.documents.capture('note.md');
	f.process.mockImplementationOnce(async (file, change) => {
		f.contents.set(file.path, 'external write');
		return change('external write');
	});
	await expect(f.documents.apply(next, 'replacement', 'conflict')).rejects.toThrow('changed');
	expect(f.contents.get('note.md')).toBe('external write');
});

test('divergent native leaves and editor ABA changes fail before mutation', async () => {
	const f = fixture({ 'note.md': 'same' }),
		source = f.open('origin', 'note.md'),
		second = f.open('second-window', 'note.md', 'different draft');
	await expect(f.documents.capture('note.md', 'origin')).rejects.toThrow('editor-conflict');
	second.edit('same');
	const before = await f.documents.capture('note.md', 'origin');
	source.edit('typed');
	source.edit('same');
	await expect(f.documents.apply(before, 'older', 'restore')).rejects.toThrow('changed');
	expect(source.transaction).not.toHaveBeenCalled();
	expect(source.save).not.toHaveBeenCalled();
});

test('matching leaves are verified after the native save broadcasts and stale leaves are not overwritten', async () => {
	const f = fixture({ 'note.md': 'same' }),
		source = f.open('origin', 'note.md'),
		second = f.open('second-window', 'note.md');
	const before = await f.documents.capture('note.md', 'origin');
	source.save.mockImplementationOnce(async () => {
		f.contents.set('note.md', source.editor.getValue());
		second.edit(source.editor.getValue());
	});
	expect(
		(await f.documents.apply(before, 'older', 'restore')).buffers.every((buffer) => buffer.text === 'older'),
	).toBe(true);
	const next = await f.documents.capture('note.md', 'origin');
	await expect(f.documents.apply(next, 'oldest', 'restore-again')).rejects.toThrow('editor-conflict');
	expect(second.transaction).not.toHaveBeenCalled();
	expect(second.editor.getValue()).toBe('older');
});

test('same-path replacement and retargeted source leaves invalidate prepared snapshots', async () => {
	const f = fixture({ 'note.md': 'same', 'other.md': 'other' }),
		source = f.open('origin', 'note.md');
	const before = await f.documents.capture('note.md', 'origin');
	f.replace('note.md');
	await expect(f.documents.apply(before, 'old', 'restore')).rejects.toThrow('changed');
	source.view.file = f.files.get('other.md')!;
	await expect(f.documents.capture('note.md', 'origin')).rejects.toThrow('origin-unavailable');
	expect(source.transaction).not.toHaveBeenCalled();
});

test('a save failure leaves the changed buffer available for recovery and never reports success', async () => {
	const f = fixture({ 'note.md': 'disk' }),
		source = f.open('origin', 'note.md', 'draft');
	const before = await f.documents.capture('note.md', 'origin');
	source.save.mockRejectedValueOnce(new Error('Save failed'));
	await expect(f.documents.apply(before, 'older\r\ntext', 'restore')).rejects.toThrow('Save failed');
	expect(source.editor.getValue()).toBe('older\ntext');
	expect(f.contents.get('note.md')).toBe('disk');
	expect(source.transaction).toHaveBeenCalledOnce();
});

test('copy creation cannot overwrite a competing file and deletion refuses unsaved drafts', async () => {
	const f = fixture({ 'note.md': 'current' }),
		absent = await f.documents.capture('copy.md');
	f.create.mockImplementationOnce(async (path) => {
		f.contents.set(path, 'competitor');
		f.replace(path);
		throw new Error('File already exists');
	});
	await expect(f.documents.apply(absent, 'history', 'copy')).rejects.toThrow('already exists');
	expect(f.contents.get('copy.md')).toBe('competitor');
	f.open('origin', 'note.md', 'unsaved');
	const dirty = await f.documents.capture('note.md', 'origin');
	await expect(f.documents.apply(dirty, null, 'undo-copy')).rejects.toThrow('editor-conflict');
	expect(f.trashFile).not.toHaveBeenCalled();
});

test.each(['../note.md', '.huhu/config/settings.json', '.huhu/dashboards/note.md', '/note.md', 'image.png'])(
	'recovery cannot write a private or non-note path: %s',
	async (path) => {
		const f = fixture({});
		await expect(f.documents.capture(path)).rejects.toThrow();
		expect(f.create).not.toHaveBeenCalled();
	},
);

test('read-only structured-write checks reject dirty or changed native leaves without saving them', async () => {
	const f = fixture({ 'note.md': 'disk' });
	expect(f.documents).toHaveProperty('assertClean');
	const first = f.open('main', 'note.md');
	const before = await f.documents.capture('note.md');
	expect(() => f.documents.assertClean(before, 'disk')).not.toThrow();
	first.edit('new draft');
	expect(() => f.documents.assertClean(before, 'disk')).toThrow();
	first.edit('disk');
	expect(() => f.documents.assertClean(before, 'disk')).toThrow();
	const clean = await f.documents.capture('note.md');
	f.open('popout', 'note.md', 'other draft');
	expect(() => f.documents.assertClean(clean, 'disk')).toThrow();
	expect(first.save).not.toHaveBeenCalled();
	expect(first.transaction).not.toHaveBeenCalled();
	expect(f.contents.get('note.md')).toBe('disk');
});

test('read-only archive capture does not inherit the restore writer size limit', async () => {
	const f = fixture({ 'large.md': 'x'.repeat(5 * 1024 * 1024 + 1) });
	expect(f.documents).toHaveProperty('captureClean');
	await expect(f.documents.capture('large.md')).rejects.toMatchObject({ code: 'unsupported' });
	const snapshot = await f.documents.captureClean('large.md');
	expect(() => f.documents.assertClean(snapshot, snapshot.diskText!)).not.toThrow();
	expect(f.process).not.toHaveBeenCalled();
});
