// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { normalizePath, type App, type Component, type Editor, type MarkdownFileInfo, type MarkdownView, type TFile } from 'obsidian';
import { attachmentExtension, attachmentFolder, uniqueAttachmentPath } from '../core/attachment-name';
import { ensureFolders } from './note-factory';

/** What saving attachments needs from the vault; Obsidian's implementation is {@link vaultAttachmentPorts}. */
export interface AttachmentPorts {
	exists: (path: string) => boolean;
	ensureFolder: (path: string) => Promise<void>;
	write: (path: string, data: ArrayBuffer) => Promise<TFile>;
	/** The link text to put in the note (Obsidian's own link format, `!` embed for images and the like). */
	link: (file: TFile, sourcePath: string) => string;
}

export function vaultAttachmentPorts(app: App): AttachmentPorts {
	return {
		exists: (path) => app.vault.getAbstractFileByPath(normalizePath(path)) !== null,
		ensureFolder: (path) => ensureFolders(app, path),
		write: (path, data) => app.vault.createBinary(normalizePath(path), data),
		link: (file, sourcePath) => {
			const link = app.fileManager.generateMarkdownLink(file, sourcePath);
			// Obsidian embeds images, audio, video and PDFs when they are dropped in; the same here.
			return !link.startsWith('!') && EMBEDDED.has(file.extension.toLowerCase()) ? `!${link}` : link;
		},
	};
}

const EMBEDDED = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'avif', 'pdf', 'mp3', 'wav', 'ogg', 'm4a', 'webm', 'flac', 'mp4', 'mov', 'mkv', 'ogv', '3gp', 'opus']);

export interface SaveAttachmentsInput {
	/** Path of the note the files are added to. */
	notePath: string;
	files: readonly File[];
	/** Name of the folder next to the note (`assets`). */
	folderName: string;
	now: Date;
	random?: () => number;
}

export interface SavedAttachments {
	/** One link per saved file, in order. */
	links: string[];
	/** Names of the files that could not be saved. */
	failed: string[];
}

/** Save each file as `<note folder>/<folderName>/YYYY-MM-DD-HHMMSS-xxxx.<ext>` and build the links to put in the note. */
export async function saveAttachments(ports: AttachmentPorts, input: SaveAttachmentsInput): Promise<SavedAttachments> {
	const folder = attachmentFolder(input.notePath, input.folderName);
	const links: string[] = [];
	const failed: string[] = [];
	for (const file of input.files) {
		try {
			await ports.ensureFolder(folder);
			const path = uniqueAttachmentPath(folder, input.now, attachmentExtension(file.name, file.type), ports.exists, input.random ?? Math.random);
			const saved = await ports.write(path, await file.arrayBuffer());
			links.push(ports.link(saved, input.notePath));
		} catch (error) {
			console.error('[HUHU navigator] Could not save attachment', error);
			failed.push(file.name);
		}
	}
	return { links, failed };
}

/**
 * Whether a clipboard or drag payload is files to save: it holds files, and is not a text copy that merely carries
 * a picture of itself. A plain text payload has no files and stays with Obsidian.
 */
export function wantsPastedFiles(clipboard: Pick<DataTransfer, 'files' | 'getData'> | null): clipboard is Pick<DataTransfer, 'files' | 'getData'> {
	if (!clipboard || clipboard.files.length === 0) return false;
	// A spreadsheet or a web page puts a picture of itself next to its text: that is a text paste.
	const hasText = clipboard.getData('text/plain').trim() !== '';
	return !(hasText && [...clipboard.files].every((file) => file.type.startsWith('image/')));
}

export interface AttachmentHandlerDeps {
	app: App;
	scope: Component;
	/** Current settings. */
	enabled: () => boolean;
	folderName: () => string;
	/** Tell the user a file could not be saved. */
	notifyFailed: (names: string[]) => void;
	ports?: AttachmentPorts;
	now?: () => Date;
}

/** Route pasted and dropped files of the Markdown editors into the note's attachment folder until `scope` unloads. */
export function registerAttachmentHandlers(deps: AttachmentHandlerDeps): void {
	const { app, scope } = deps;
	const ports = deps.ports ?? vaultAttachmentPorts(app);

	/** The note and files to save, when this payload is files for a Markdown note and the feature is on. */
	const claim = (transfer: DataTransfer | null, info: MarkdownView | MarkdownFileInfo): { note: TFile; files: File[] } | undefined => {
		const note = info.file;
		if (!deps.enabled() || !note || note.extension !== 'md' || !wantsPastedFiles(transfer)) return undefined;
		return { note, files: [...transfer.files] };
	};
	const save = (claimed: { note: TFile; files: File[] }, insert: (text: string) => void): void => {
		const now = (deps.now ?? (() => new Date()))();
		void saveAttachments(ports, { notePath: claimed.note.path, files: claimed.files, folderName: deps.folderName(), now }).then(({ links, failed }) => {
			if (links.length) insert(links.join('\n'));
			if (failed.length) deps.notifyFailed(failed);
		});
	};

	scope.registerEvent(app.workspace.on('editor-paste', (event, editor, info) => {
		if (event.defaultPrevented) return;
		const claimed = claim(event.clipboardData, info);
		if (!claimed) return;
		// Decided now, before anything is awaited: Obsidian's own paste handling must not also run.
		event.preventDefault();
		save(claimed, (text) => editor.replaceSelection(text));
	}));
	scope.registerEvent(app.workspace.on('editor-drop', (event, editor, info) => {
		if (event.defaultPrevented) return;
		const claimed = claim(event.dataTransfer, info);
		if (!claimed) return;
		event.preventDefault();
		// The drop lands where the pointer is, not where the caret was.
		const at = dropPosition(editor, event);
		save(claimed, (text) => { if (at) editor.replaceRange(text, at); else editor.replaceSelection(text); });
	}));
}

function dropPosition(editor: Editor, event: DragEvent): ReturnType<Editor['getCursor']> | undefined {
	try {
		const cm = (editor as unknown as { cm?: { posAtCoords?: (coords: { x: number; y: number }) => number | null } }).cm;
		const offset = cm?.posAtCoords?.({ x: event.clientX, y: event.clientY });
		return typeof offset === 'number' ? editor.offsetToPos(offset) : undefined;
	} catch {
		return undefined;
	}
}
