import { FuzzySuggestModal, MarkdownView, TFile, TFolder, type App, type WorkspaceLeaf } from 'obsidian';
import { t } from '../../../../../shared/i18n';
import type { SourceScope, SourceSnapshot } from '../../../api';
import type { ObsidianSources } from './sources';

function pick<T>(app: App, items: T[], label: (item: T) => string, signal: AbortSignal): Promise<T | undefined> {
	return new Promise(resolve => {
		let chosen: T | undefined;
		class Picker extends FuzzySuggestModal<T> {
			getItems() { return items; }
			getItemText(item: T) { return label(item); }
			onChooseItem(item: T) { chosen = item; resolve(item); }
			onClose() { signal.removeEventListener('abort', close); queueMicrotask(() => resolve(chosen)); }
		}
		const picker = new Picker(app);
		const close = () => picker.close();
		picker.setPlaceholder(t('huhubot.chat.attach'));
		signal.addEventListener('abort', close, { once: true });
		if (signal.aborted) resolve(undefined); else picker.open();
	});
}
function origin(app: App): WorkspaceLeaf {
	const leaf = app.workspace.getMostRecentLeaf();
	if (!leaf) throw new Error('HUHUBOT_SOURCE_VIEW_UNAVAILABLE');
	return leaf;
}
function visible(path: string, config: string): boolean {
	return !path.split('/').some(part => part.startsWith('.')) && path !== config && !path.startsWith(`${config}/`);
}
/** A host file object is chosen explicitly; model-provided paths never enter the registry. */
export async function selectBotSource(app: App, sources: ObsidianSources, signal: AbortSignal): Promise<SourceSnapshot | undefined> {
	const views = app.workspace.getLeavesOfType('markdown').map(leaf => leaf.view).filter((view): view is MarkdownView => view instanceof MarkdownView);
	type Choice = { file: TFile; view?: MarkdownView; selection?: boolean };
	const notes: Choice[] = app.vault.getMarkdownFiles().filter(file => visible(file.path, app.vault.configDir)).map(file => ({ file, view: views.find(view => view.file === file) }));
	const selections: Choice[] = views.filter(view => view.file && view.editor.getSelection()).map(view => ({ file: view.file!, view, selection: true }));
	const choice = await pick(app, [...selections, ...notes], item => item.selection ? `${t('huhubot.chat.selection')}: ${item.file.path}` : item.file.path, signal);
	if (!choice || signal.aborted) return undefined;
	return choice.selection && choice.view ? sources.captureSelection(choice.view, signal) : sources.captureNote(choice.file, choice.view?.leaf ?? origin(app), signal);
}
export async function selectBotScope(app: App, sources: ObsidianSources, kind: 'folder' | 'vault', signal: AbortSignal): Promise<SourceScope | undefined> {
	const leaf = origin(app);
	if (kind === 'vault') return sources.captureVault(leaf, signal);
	const folders = app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder && visible(file.path, app.vault.configDir));
	const folder = await pick(app, folders, item => item.path, signal);
	return folder && !signal.aborted ? sources.captureFolder(folder, leaf, signal) : undefined;
}
