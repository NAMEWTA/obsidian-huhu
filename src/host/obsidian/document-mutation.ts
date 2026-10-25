import { MarkdownView, TFile, type App, type Component, type Editor, type WorkspaceLeaf } from 'obsidian';
import {
	DocumentMutationError,
	sameDocumentSnapshot,
	type DocumentBuffer,
	type DocumentMutationPort,
	type DocumentSnapshot,
} from '../../shared/storage/document-mutation';
import { vaultDocumentPath } from '../../shared/storage/content-paths';
import { textEdits } from '../../shared/storage/text-edits';
import { storageWriteQueue } from '../../shared/storage/write-queue';

export interface DocumentMutationOptions {
	lifetime: Component;
	resolveLeaf(id: string): WorkspaceLeaf | undefined;
	/** Reuses the managed-content draft guard without importing an application service. */
	checkDrafts?: (path: string, expectedText: string) => void;
	allowPath?: (path: string) => boolean;
}

const MAX_NOTE_BYTES = 5 * 1024 * 1024;
const nativeText = (text: string) => text.replace(/\r\n?/g, '\n');

/** Only this adapter writes native notes; it never calls Git or changes the index. */
export class DocumentMutationCoordinator implements DocumentMutationPort {
	private readonly identities = new WeakMap<TFile, string>();
	private readonly editors = new WeakMap<Editor, { id: string; generation: number; text: string }>();
	constructor(
		private readonly app: App,
		private readonly options: DocumentMutationOptions,
	) {
		options.lifetime.registerEvent(
			app.workspace.on('editor-change', (editor) => {
				const state = this.editorState(editor);
				state.generation++;
				state.text = editor.getValue();
			}),
		);
	}
	private path(input: string): string {
		const path = vaultDocumentPath(input);
		if (path.startsWith('.') || !path.toLowerCase().endsWith('.md') || this.options.allowPath?.(path) === false)
			throw new DocumentMutationError('invalid-path', input);
		return path;
	}
	private key(file: TFile): string {
		let id = this.identities.get(file);
		if (!id) {
			id = crypto.randomUUID();
			this.identities.set(file, id);
		}
		return id;
	}
	private editorState(editor: Editor) {
		const text = editor.getValue();
		let state = this.editors.get(editor);
		if (!state) {
			state = { id: crypto.randomUUID(), generation: 0, text };
			this.editors.set(editor, state);
		} else if (state.text !== text) {
			state.generation++;
			state.text = text;
		}
		return state;
	}
	private views(path: string): MarkdownView[] {
		return this.app.workspace
			.getLeavesOfType('markdown')
			.flatMap((leaf) => (leaf.view instanceof MarkdownView && leaf.view.file?.path === path ? [leaf.view] : []));
	}
	private buffers(path: string): DocumentBuffer[] {
		return this.views(path).map((view) => ({ ...this.editorState(view.editor) }));
	}
	private origin(path: string, id?: string): MarkdownView | undefined {
		if (!id) return undefined;
		const view = this.options.resolveLeaf(id)?.view;
		if (!(view instanceof MarkdownView) || view.file?.path !== path)
			throw new DocumentMutationError('origin-unavailable', path);
		return view;
	}
	async capture(input: string, originLeafId?: string): Promise<DocumentSnapshot> {
		const path = this.path(input),
			source = this.origin(path, originLeafId),
			file = this.app.vault.getFileByPath(path);
		if (!file) {
			if (this.app.vault.getAbstractFileByPath(path) || source)
				throw new DocumentMutationError('invalid-path', path);
			return { path, documentKey: `missing:${path}`, exists: false, text: null, diskText: null, buffers: [] };
		}
		if (!(file instanceof TFile) || file.stat.size > MAX_NOTE_BYTES)
			throw new DocumentMutationError('unsupported', path);
		const initial = this.buffers(path),
			diskText = await this.app.vault.read(file);
		if (this.app.vault.getFileByPath(path) !== file) throw new DocumentMutationError('identity-changed', path);
		const buffers = this.buffers(path);
		if (
			initial.length !== buffers.length ||
			initial.some(
				(item) =>
					!buffers.some(
						(next) => item.id === next.id && item.generation === next.generation && item.text === next.text,
					),
			)
		)
			throw new DocumentMutationError('changed', path);
		const text = source?.editor.getValue() ?? buffers[0]?.text ?? diskText;
		if (buffers.some((buffer) => buffer.text !== text)) throw new DocumentMutationError('editor-conflict', path);
		this.options.checkDrafts?.(path, text);
		return {
			path,
			documentKey: this.key(file),
			exists: true,
			text,
			diskText,
			buffers,
			...(originLeafId ? { originLeafId } : {}),
		};
	}
	exclusive<T>(path: string, operation: () => Promise<T>): Promise<T> {
		return storageWriteQueue(this.app.vault.adapter).run(
			`huhu-content:write:${this.path(path)}`,
			operation,
			'versioning-restore',
		);
	}
	editableText(text: string, expected: DocumentSnapshot): string {
		return expected.buffers.length ? nativeText(text) : text;
	}
	private checkBuffers(expected: DocumentSnapshot): void {
		const actual = this.buffers(expected.path);
		if (
			actual.length !== expected.buffers.length ||
			expected.buffers.some(
				(item) =>
					!actual.some(
						(next) => item.id === next.id && item.generation === next.generation && item.text === next.text,
					),
			)
		)
			throw new DocumentMutationError('changed', expected.path);
		this.options.checkDrafts?.(expected.path, expected.text ?? '');
	}
	async apply(expected: DocumentSnapshot, text: string | null, operationId: string): Promise<DocumentSnapshot> {
		const current = await this.capture(expected.path, expected.originLeafId);
		if (!sameDocumentSnapshot(expected, current)) throw new DocumentMutationError('changed', expected.path);
		const file = this.app.vault.getFileByPath(expected.path);
		this.checkBuffers(expected);
		if (!expected.exists) {
			if (text === null) return current;
			await this.app.vault.create(expected.path, text);
		} else if (text === null) {
			if (
				!(file instanceof TFile) ||
				expected.buffers.some((buffer) => nativeText(buffer.text) !== nativeText(expected.diskText ?? ''))
			)
				throw new DocumentMutationError('editor-conflict', expected.path);
			await this.app.fileManager.trashFile(file);
		} else {
			if (!(file instanceof TFile) || this.key(file) !== expected.documentKey)
				throw new DocumentMutationError('identity-changed', expected.path);
			const source = this.origin(expected.path, expected.originLeafId) ?? this.views(expected.path)[0];
			if (source) {
				const editor = source.editor,
					wanted = this.editableText(text, expected);
				const changes = textEdits(expected.text ?? '', wanted).map((edit) => ({
					from: editor.offsetToPos(edit.from),
					to: editor.offsetToPos(edit.to),
					text: edit.insert,
				}));
				if (changes.length) editor.transaction({ changes }, `huhu-versioning:${operationId}`);
				if (editor.getValue() !== wanted) throw new DocumentMutationError('write-unverified', expected.path);
				await source.save();
			} else {
				await this.app.vault.process(file, (actual) => {
					if (actual !== expected.diskText || this.app.vault.getFileByPath(expected.path) !== file)
						throw new DocumentMutationError('changed', expected.path);
					this.checkBuffers(expected);
					return text;
				});
			}
		}
		const after = await this.capture(expected.path, text === null ? undefined : expected.originLeafId);
		const wanted = text === null ? null : this.editableText(text, expected);
		if (
			after.text !== wanted ||
			(wanted === null
				? after.diskText !== null
				: after.diskText === null ||
					(expected.buffers.length ? nativeText(after.diskText) !== wanted : after.diskText !== wanted))
		)
			throw new DocumentMutationError('write-unverified', expected.path);
		return after;
	}
}
