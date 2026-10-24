// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { MarkdownView, TFile, TFolder, getFrontMatterInfo, normalizePath, parseYaml, type App } from 'obsidian';
import type { CreateNoteCommand } from '../core/create-commands';
import { resolveFolderTemplate } from '../core/folder-templates';
import { generateName } from '../core/note-name';
import { uniquePath } from '../core/ops';
import { checkFrontmatter } from '../core/template-check';
import { collectPromptLabels, pickEngine, renderTemplate, type TemplateContext } from '../core/template';
import { baseName, ROOT_FOLDER } from '../core/types';
import type { ConfigReader } from '../core/productivity-config';
import { obsidianLocale, resolveWeekStart } from './locale';
import { coreTemplatesFolder, resolveTemplateFile, templaterApi } from './templates';
import type { PeriodicPreparation } from '../api';

export interface NoteFactoryDeps {
	app: App;
	settings: ConfigReader;
	/** Ask for the value of a `{{prompt:Label}}`; undefined when the user cancels. */
	ask: (label: string) => Promise<string | undefined>;
	/** Open a note in the editor and put the cursor at `cursor` (a character offset) when given. */
	open: (file: TFile, options: { newTab?: boolean; split?: boolean; ownerWindow?: Window; cursor?: number; templaterCursor?: boolean }) => Promise<void>;
	/** Tell the user something (a message key with parameters). */
	notify: (key: string, params?: Record<string, string | number>) => void;
	/** The translated name a note gets when nothing else names it (e.g. "Untitled"). */
	defaultName: () => string;
	/** Add a tag to a note's frontmatter. */
	addTag: (file: TFile, tag: string) => Promise<void>;
}

export interface CreateNoteOptions {
	/** Target folder; '' or '/' is the vault root. */
	folder: string;
	/** File name without extension; made unique when `exact` is not set. */
	name: string;
	exact?: boolean;
	/** Template note path or name; empty means the folder template of `folder`, if any. */
	template?: string;
	noteDate?: Date;
	/** File name pattern of a periodic note: `{{date}}` is written in this format. */
	periodFormat?: string;
	weekDaysFromNoteDate?: boolean;
	number?: number;
	values?: Record<string, string>;
	tag?: string;
	/** Open the note after creating it (the default), or with `false` leave that to the caller, who gets `onCreated`. */
	open?: false | { newTab?: boolean; split?: boolean; ownerWindow?: Window };
	/** The caller may stop or disable its action while a template is being prepared. */
	isActive?: () => boolean;
	onCreated?: (info: { file: TFile; cursor?: number; templaterCursor?: boolean }) => void;
}

export interface NoteFactory {
	/** Render before creating anything; background callers never trigger a question or external template effect. */
	prepareNote(options: CreateNoteOptions & { interactive?: boolean; resolvedTemplate?: string | null }): Promise<PeriodicPreparation>;
	/** Create a note from the template that applies, optionally open it; undefined when cancelled. */
	createNote(options: CreateNoteOptions): Promise<TFile | undefined>;
	/** Run a user-defined create-note command. `selectedFolder` is the folder open in the navigator. */
	runCreateCommand(command: CreateNoteCommand, selectedFolder: string): Promise<TFile | undefined>;
	/** Create a note from a template chosen with `pickTemplate`, in `folder`. */
	createFromChosenTemplate(folder: string, template: string): Promise<TFile | undefined>;
	/** Template text and file for a new note in `folder`; the explicit template wins over the folder template. */
	readTemplate(template: string | undefined, folder: string): Promise<{ raw: string; file: TFile } | undefined>;
}

export async function ensureFolders(app: App, folder: string): Promise<void> {
	if (folder === '' || folder === ROOT_FOLDER) return;
	let current = '';
	for (const part of folder.split('/').filter(Boolean)) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(normalizePath(current))) await app.vault.createFolder(normalizePath(current));
	}
}

export function createNoteFactory(deps: NoteFactoryDeps): NoteFactory {
	const { app, settings } = deps;
	const exists = (path: string) => app.vault.getAbstractFileByPath(normalizePath(path)) !== null;

	function context(options: { title: string; folder: string; path: string; noteDate?: Date; periodFormat?: string; weekDaysFromNoteDate?: boolean; number?: number; values?: Record<string, string> }): TemplateContext {
		const s = settings.get();
		const locale = obsidianLocale();
		const now = new Date();
		return {
			title: options.title,
			folder: options.folder === ROOT_FOLDER || options.folder === '' ? '' : baseName(options.folder),
			path: options.path,
			noteDate: options.noteDate ?? now,
			dateFormat: options.periodFormat ?? s.templateDateFormat,
			todayFormat: s.templateDateFormat,
			timeFormat: s.templateTimeFormat,
			now,
			weekStart: resolveWeekStart(s.calendarWeekStart),
			locale,
			weekDaysFromNoteDate: options.weekDaysFromNoteDate,
			values: options.values,
			number: options.number,
		};
	}

	async function readTemplate(template: string | undefined, folder: string): Promise<{ raw: string; file: TFile } | undefined> {
		const s = settings.get();
		const wanted = template?.trim() || resolveFolderTemplate(s.folderTemplates, folder === '' ? ROOT_FOLDER : folder)?.template || '';
		const file = wanted ? resolveTemplateFile(app, [s.templateFolder, coreTemplatesFolder(app)], wanted) : undefined;
		return file ? { raw: await app.vault.cachedRead(file), file } : undefined;
	}

	async function createNote(options: CreateNoteOptions): Promise<TFile | undefined> {
		if (options.isActive?.() === false) return undefined;
		const folder = options.folder === '' ? ROOT_FOLDER : options.folder;
		const path = options.exact ? normalizePath(`${folder === ROOT_FOLDER ? '' : `${folder}/`}${options.name}.md`) : normalizePath(uniquePath(folder, options.name, 'md', exists));
		const name = baseName(path).replace(/\.md$/, '');
		const found = await readTemplate(options.template, folder);
		if (options.isActive?.() === false) return undefined;
		let file: TFile;
		let cursor: number | undefined;
		let templaterCursor = false;
		const templater = templaterApi(app);
		if (found && pickEngine(settings.get().templateEngine, found.raw, !!templater) === 'templater' && templater) {
			await ensureFolders(app, folder);
			if (options.isActive?.() === false) return undefined;
			const folderObject = folder === ROOT_FOLDER ? app.vault.getRoot() : app.vault.getAbstractFileByPath(normalizePath(folder));
			const created = await templater.create_new_note_from_template(found.file, folderObject instanceof TFolder ? folderObject : undefined, name, false);
			if (!created) return undefined;
			file = created;
			templaterCursor = /tp\.file\.cursor/.test(found.raw);
		} else {
			const values = { ...options.values };
			if (found) {
				for (const label of collectPromptLabels(found.raw)) {
					if (values[label] !== undefined) continue;
					const answer = await deps.ask(label);
					if (answer === undefined || options.isActive?.() === false) return undefined;
					values[label] = answer;
				}
			}
			const filled = context({ ...options, title: name, folder, path, values });
			const rendered = found ? renderTemplate(found.raw, filled) : { text: '' };
			if (found) {
				// Whatever the substitution did, the frontmatter must still say what the template means; otherwise nothing is written.
				const probe: string[] = [];
				const probed = renderTemplate(found.raw, { ...filled, probe }).text;
				const body = (text: string) => { const info = getFrontMatterInfo(text); return info.exists ? text.slice(info.contentStart) : text; };
				// A leading line break keeps a `---` at the start of the template's own text from being read as a frontmatter here.
				const expectedBody = renderTemplate(`\n${body(found.raw)}`, filled).text.slice(1);
				const check = checkFrontmatter(rendered.text, probed, probe, {
					parse: (yaml) => parseYaml(yaml) as unknown,
					split: (text) => { const info = getFrontMatterInfo(text); return info.exists ? { yaml: info.frontmatter, body: text.slice(info.contentStart) } : { yaml: undefined, body: text }; },
				}, { raw: found.raw, expectedBody });
				if (!check.ok) { deps.notify(check.reason === 'invalid' ? 'navigator.templateYamlInvalid' : check.reason === 'different' ? 'navigator.templateYamlDifferent' : 'navigator.templateYamlUnverifiable', { template: found.file.basename }); return undefined; }
			}
			cursor = rendered.cursor;
			await ensureFolders(app, folder);
			if (options.isActive?.() === false) return undefined;
			file = await app.vault.create(path, rendered.text);
		}
		if (options.isActive?.() === false) return undefined;
		if (options.tag) await deps.addTag(file, options.tag);
		if (options.open !== false) await deps.open(file, { newTab: options.open?.newTab, split: options.open?.split, ownerWindow: options.open?.ownerWindow, cursor, templaterCursor });
		else options.onCreated?.({ file, cursor, templaterCursor });
		return file;
	}

	async function prepareNote(options: CreateNoteOptions & { interactive?: boolean; resolvedTemplate?: string | null }): Promise<PeriodicPreparation> {
		if (options.isActive?.() === false) return { status: 'cancelled', code: 'periodic-unavailable' };
		const folder = options.folder === '' ? ROOT_FOLDER : options.folder;
		const path = normalizePath(`${folder === ROOT_FOLDER ? '' : `${folder}/`}${options.name}.md`);
		const wanted = options.resolvedTemplate !== undefined ? options.resolvedTemplate : options.template?.trim() || resolveFolderTemplate(settings.get().folderTemplates, folder)?.template;
		const exact = options.resolvedTemplate ? app.vault.getFileByPath(options.resolvedTemplate) : undefined;
		const found = options.resolvedTemplate === undefined ? await readTemplate(options.template, folder) : exact ? { file: exact, raw: await app.vault.cachedRead(exact) } : undefined;
		if (options.isActive?.() === false) return { status: 'cancelled', code: 'periodic-unavailable' };
		if (wanted && !found) return { status: 'failed', code: 'template-missing' };
		if (!found) return { status: 'ready', path, content: '' };
		// The installed Templater integration only exposes a create-file operation, not a pure renderer.
		// It cannot participate in an atomic note+task write, so never run it as a hidden side effect.
		if ((settings.get().templateEngine !== 'builtin' && found.raw.includes('<%')) || pickEngine(settings.get().templateEngine, found.raw, !!templaterApi(app)) === 'templater') {
			return { status: 'unavailable', code: 'template-engine-unavailable' };
		}
		const values = { ...options.values };
		for (const label of collectPromptLabels(found.raw)) {
			if (values[label] !== undefined) continue;
			if (!options.interactive) return { status: 'unavailable', code: 'template-input-required' };
			const answer = await deps.ask(label);
			if (options.isActive?.() === false) return { status: 'cancelled', code: 'periodic-unavailable' };
			if (answer === undefined) return { status: 'cancelled', code: 'template-input-required' };
			values[label] = answer;
		}
		const filled = context({ ...options, title: options.name, folder, path, values });
		const rendered = renderTemplate(found.raw, filled);
		const probe: string[] = [];
		const probed = renderTemplate(found.raw, { ...filled, probe }).text;
		const body = (text: string) => { const info = getFrontMatterInfo(text); return info.exists ? text.slice(info.contentStart) : text; };
		const check = checkFrontmatter(rendered.text, probed, probe, {
			parse: (yaml) => parseYaml(yaml) as unknown,
			split: (text) => { const info = getFrontMatterInfo(text); return info.exists ? { yaml: info.frontmatter, body: text.slice(info.contentStart) } : { yaml: undefined, body: text }; },
		}, { raw: found.raw, expectedBody: renderTemplate(`\n${body(found.raw)}`, filled).text.slice(1) });
		if (!check.ok) return { status: 'failed', code: 'template-invalid' };
		return { status: 'ready', path, content: rendered.text, cursor: rendered.cursor };
	}

	async function runCreateCommand(command: CreateNoteCommand, selectedFolder: string): Promise<TFile | undefined> {
		const folder = command.location === 'folder' ? (command.folder || ROOT_FOLDER) : selectedFolder;
		const found = await readTemplate(command.template, folder);
		// The engine is chosen first: Templater takes the template as a whole, so its text is never searched for HUHU prompts.
		const engine = found ? pickEngine(settings.get().templateEngine, found.raw, !!templaterApi(app)) : 'builtin';
		const values: Record<string, string> = {};
		// Labels in the file name and (for the built-in engine) in the template are asked once each, before the name is generated.
		for (const label of collectPromptLabels(command.fileName, engine === 'builtin' ? (found?.raw ?? '') : '')) {
			const answer = await deps.ask(label);
			if (answer === undefined) return undefined;
			values[label] = answer;
		}
		const target = app.vault.getAbstractFileByPath(normalizePath(folder === ROOT_FOLDER ? '/' : folder));
		const folderObject = folder === ROOT_FOLDER ? app.vault.getRoot() : target instanceof TFolder ? target : undefined;
		const existing = (folderObject?.children ?? []).filter((child): child is TFile => child instanceof TFile && child.extension === 'md').map((child) => child.basename);
		const generated = generateName(command.fileName, context({ title: '', folder, path: '', values }), existing);
		return createNote({ folder, name: generated.name || deps.defaultName(), template: command.template, number: generated.number, values, open: {} });
	}

	return {
		prepareNote,
		createNote,
		runCreateCommand,
		readTemplate,
		createFromChosenTemplate: (folder, template) => createNote({ folder, name: deps.defaultName(), template, open: {} }),
	};
}

/** Cursor placement for a freshly created note, used by the navigator's `open` implementation. */
export function placeCursor(app: App, file: TFile, options: { cursor?: number; templaterCursor?: boolean; ownerWindow?: Window }): void {
	if (options.ownerWindow?.closed) return;
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view || view.file?.path !== file.path || options.ownerWindow && view.containerEl.ownerDocument.defaultView !== options.ownerWindow) return;
	if (options.cursor !== undefined) {
		const position = view.editor.offsetToPos(options.cursor);
		view.editor.setCursor(position);
		view.editor.focus();
	} else if (options.templaterCursor) {
		(app as unknown as { commands?: { executeCommandById?: (id: string) => boolean } }).commands?.executeCommandById?.('templater-obsidian:jump-to-next-cursor-location');
	}
}

