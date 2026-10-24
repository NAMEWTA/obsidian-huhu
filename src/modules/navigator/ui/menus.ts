// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import {
	ArrowDown,
	ArrowUp,
	ArrowUpRight,
	Copy,
	CopyPlus,
	EyeOff,
	ExternalLink,
	FilePlus,
	FileStack,
	FileText,
	FolderInput,
	FolderOpen,
	FolderPlus,
	History,
	LayoutList,
	Merge,
	Pencil,
	Pin,
	PinOff,
	SeparatorVertical,
	Star,
	StarOff,
	Tag,
	Tags,
	Trash2,
	Unlink,
} from 'lucide-react';
import { t } from '../../../shared/i18n';
import { isFolderNote } from '../core/folder-notes';
import { OWN } from '../core/host-menu';
import { normalizeSections } from '../core/sections';
import { makeShortcut, shortcutForContext } from '../core/shortcuts';
import { ROOT_FOLDER } from '../core/types';
import type { NavRow } from '../core/nav-tree';
import type { NavigatorEnv } from './env';
import { withHostEntries } from './host-menu';
import type { MenuEntry } from './menu-entry';

export type { MenuEntry } from './menu-entry';

/** "Show in system explorer" (Finder on macOS) for a vault path; none where the system file manager is out of reach. */
function revealEntry(env: NavigatorEnv, path: string, options: { disabled?: boolean; separatorBefore?: boolean } = {}): MenuEntry[] {
	const reveal = env.showInFolder;
	if (!reveal) return [];
	return [{ id: OWN.reveal, label: t(env.isMac ? 'navigator.revealInFinder' : 'navigator.showInSystemExplorer'), icon: FolderOpen, disabled: options.disabled, separatorBefore: options.separatorBefore, run: () => reveal(path).catch(env.report) }];
}

/** Menu entries for the host's `file-menu` items of these paths, or nothing in hosts that cannot provide them. */
const hostNodes = (env: NavigatorEnv, paths: readonly string[]) => env.hostMenu?.(paths) ?? [];

/** "New note from template" and the user's create-note commands, for menus that act on the navigator's folder. */
function templateEntries(env: NavigatorEnv): MenuEntry[] {
	const actions = env.actions;
	if (!actions) return [];
	const guard = (task: Promise<unknown>) => task.catch(env.report);
	return [
		{ id: 'new-from-template', label: t('navigator.newNoteFromTemplate'), icon: FileText, run: () => guard(actions.newNoteFromTemplate()) },
		...env.service.settings.get().createCommands.map((command): MenuEntry => ({ id: `create-${command.id}`, label: command.name, icon: FileStack, run: () => guard(actions.runCreateCommand(command.id)) })),
	];
}

/** Menu for a note row. A row outside the selection is selected first by the caller. */
export function noteMenu(env: NavigatorEnv, path: string): MenuEntry[] {
	const { service } = env;
	const selection = service.state.getState().selection.paths;
	const paths = selection.includes(path) ? selection : [path];
	const single = paths.length === 1;
	const pinned = paths.every((entry) => service.isPinned(entry));
	const report = env.report;
	const guard = (task: Promise<unknown>) => task.catch(report);
	const shortcut = makeShortcut('note', path);
	const starred = service.isShortcut('note', path);
	const entry = service.index.get(path);
	const settings = service.settings.get();
	const folderNote = !!entry && isFolderNote(entry, settings.folderNoteName);
	const menu: MenuEntry[] = [
		{ id: 'open-tab', label: t('navigator.openNewTab'), icon: ExternalLink, disabled: !single, run: () => service.openNote(path, { newTab: true, focus: true }) },
		...(env.canSplit ? [{ id: 'open-right', label: t('navigator.openToTheRight'), icon: SeparatorVertical, disabled: !single, run: () => service.openNote(path, { split: true, focus: true }) }] : []),
		{ id: 'new-note', label: t('navigator.newNote'), icon: FilePlus, run: () => guard(service.newNote()) },
		...templateEntries(env),
		{ id: 'rename', label: t('navigator.rename'), icon: Pencil, disabled: !single, separatorBefore: true, run: () => service.startRename(path, false) },
		{ id: 'duplicate', label: t('navigator.duplicate'), icon: CopyPlus, run: () => guard(service.duplicateSelected()) },
		{ id: 'move', label: t('navigator.moveTo'), icon: FolderInput, run: () => guard(service.moveSelected()) },
		{ id: 'pin', label: t(pinned ? 'navigator.unpin' : 'navigator.pin'), icon: pinned ? PinOff : Pin, run: () => service.togglePin(paths) },
		{ id: 'shortcut', label: t(starred ? 'navigator.shortcutRemove' : 'navigator.shortcutAdd'), icon: starred ? StarOff : Star, disabled: !single, run: () => service.toggleShortcut(shortcut) },
	];
	if (settings.folderNotes && single && entry?.ext === 'md') {
		menu.push(
			{ id: 'folder-note-set', label: t('navigator.setFolderNote'), icon: FolderInput, disabled: folderNote, separatorBefore: true, run: () => guard(service.setAsFolderNote(path)) },
			{ id: 'folder-note-convert', label: t('navigator.convertFolderNote'), icon: FolderPlus, run: () => guard(service.convertToFolderNote(path)) },
		);
	}
	const actions = env.actions;
	if (actions) {
		menu.push(
			{ id: 'merge', label: t('navigator.mergeNotes'), icon: Merge, disabled: paths.length < 2, separatorBefore: true, run: () => guard(actions.mergeSelected()) },
			{ id: 'tag-add', label: t('navigator.addTag'), icon: Tag, run: () => guard(actions.addTagToSelected()) },
			{ id: 'tag-remove', label: t('navigator.removeTag'), icon: Tags, run: () => guard(actions.removeTagFromSelected()) },
			{ id: 'tag-clear', label: t('navigator.clearTags'), icon: Tags, run: () => guard(actions.clearTagsOfSelected()) },
		);
	}
	menu.push({ id: 'hide', label: t('navigator.hide'), icon: EyeOff, separatorBefore: true, run: () => { for (const target of paths) service.hideEntry('file', target); } });
	const open = env.openInDefaultApp;
	if (open) menu.push({ id: OWN.openDefault, label: t('navigator.openInDefaultApp'), icon: ArrowUpRight, disabled: !single, separatorBefore: true, run: () => open(path).catch(report) });
	menu.push(
		...revealEntry(env, path, { disabled: !single, separatorBefore: !open }),
		{ id: OWN.copyPath, label: t('navigator.copyPath'), icon: Copy, disabled: !single, run: () => env.copyPath(path) },
		{ id: 'delete', label: t('navigator.delete'), icon: Trash2, danger: true, separatorBefore: true, run: () => guard(service.deleteSelected()) },
	);
	return withHostEntries(menu, hostNodes(env, paths), report);
}

/** Menu for a navigation row: a folder, tag, property, shortcut, recent note or section header. */
export function navMenu(env: NavigatorEnv, row: NavRow): MenuEntry[] {
	const { service } = env;
	const report = env.report;
	const guard = (task: Promise<unknown>) => task.catch(report);

	if (row.kind === 'section' && row.section) {
		const id = row.section;
		const order = normalizeSections(service.settings.get().sections);
		const at = order.indexOf(id);
		return [
			{ id: 'toggle', label: t(row.expanded ? 'navigator.collapse' : 'navigator.expand'), run: () => service.toggleSection(id) },
			{ id: 'up', label: t('navigator.moveUp'), icon: ArrowUp, disabled: at <= 0, separatorBefore: true, run: () => service.moveSection(id, order[at - 1] ?? null) },
			{ id: 'down', label: t('navigator.moveDown'), icon: ArrowDown, disabled: at < 0 || at >= order.length - 1, run: () => service.moveSection(id, order[at + 2] ?? null) },
		];
	}
	if (row.kind === 'shortcut' && row.shortcut) {
		const shortcut = row.shortcut;
		const list = service.settings.get().shortcuts;
		const at = list.findIndex((entry) => entry.id === shortcut.id);
		return [
			{ id: 'rename', label: t('navigator.shortcutRename'), icon: Pencil, run: () => env.askName('navigator.shortcutRename', row.label).then((name) => { if (name !== undefined) service.renameShortcut(shortcut.id, name); }) },
			{ id: 'up', label: t('navigator.moveUp'), icon: ArrowUp, disabled: at <= 0, run: () => service.moveShortcut(shortcut.id, list[at - 1]?.id ?? null) },
			{ id: 'down', label: t('navigator.moveDown'), icon: ArrowDown, disabled: at < 0 || at >= list.length - 1, run: () => service.moveShortcut(shortcut.id, list[at + 2]?.id ?? null) },
			{ id: 'remove', label: t('navigator.shortcutRemove'), icon: StarOff, separatorBefore: true, run: () => service.removeShortcut(shortcut.id) },
		];
	}
	if (row.kind === 'recent') {
		return withHostEntries([
			{ id: 'open-tab', label: t('navigator.openNewTab'), icon: ExternalLink, run: () => service.openNote(row.path, { newTab: true, focus: true }) },
			...revealEntry(env, row.path),
			{ id: 'remove', label: t('navigator.recentRemove'), icon: History, separatorBefore: true, run: () => service.removeRecent(row.path) },
			{ id: 'clear', label: t('navigator.recentClear'), icon: Trash2, run: () => service.clearRecent() },
		], hostNodes(env, [row.path]), report);
	}
	const context = row.context;
	if (!context) return [];
	const menu: MenuEntry[] = [];
	if (row.kind === 'folder') {
		const root = row.path === ROOT_FOLDER;
		menu.push(
			{ id: 'new-note', label: t('navigator.newNote'), icon: FilePlus, run: () => guard(service.newNote()) },
			...templateEntries(env),
			{ id: 'new-folder', label: t('navigator.newFolder'), icon: FolderPlus, run: () => guard(service.newFolder(row.path)) },
			{ id: 'rename', label: t('navigator.rename'), icon: Pencil, disabled: root, separatorBefore: true, run: () => service.startRename(row.path, true) },
		);
	} else {
		menu.push({ id: 'new-note', label: t('navigator.newNote'), icon: FilePlus, run: () => guard(service.newNote()) });
	}
	const shortcut = shortcutForContext(context);
	if (shortcut) {
		const starred = service.isShortcut(shortcut.kind, shortcut.key);
		menu.push({ id: 'shortcut', label: t(starred ? 'navigator.shortcutRemove' : 'navigator.shortcutAdd'), icon: starred ? StarOff : Star, separatorBefore: row.kind !== 'folder', run: () => service.toggleShortcut(shortcut) });
	}
	menu.push({ id: 'appearance', label: t('navigator.appearance'), icon: LayoutList, run: () => env.openAppearance(context) });
	if (row.kind === 'folder' && env.actions) {
		const actions = env.actions;
		menu.push({ id: 'folder-template', label: t(actions.hasFolderTemplate(row.path) ? 'navigator.changeFolderTemplate' : 'navigator.setFolderTemplate'), icon: FileText, run: () => guard(actions.setFolderTemplate(row.path)) });
	}
	if (row.kind === 'tag' && env.actions) {
		const actions = env.actions;
		const tag = row.display ?? row.path;
		menu.push(
			{ id: 'tag-rename', label: t('navigator.renameTag'), icon: Pencil, separatorBefore: true, run: () => guard(actions.renameTag(tag)) },
			{ id: 'tag-delete', label: t('navigator.deleteTag'), icon: Trash2, danger: true, run: () => guard(actions.deleteTag(tag)) },
		);
	}
	if (row.kind === 'folder' && service.folderNote(row.path)) {
		menu.push({ id: 'folder-note-detach', label: t('navigator.detachFolderNote'), icon: Unlink, run: () => guard(service.detachFolderNote(row.path)) });
	}
	if (row.kind === 'folder' && row.path !== ROOT_FOLDER) {
		menu.push({ id: 'hide', label: t('navigator.hide'), icon: EyeOff, separatorBefore: true, run: () => service.hideEntry('folder', row.path) });
	} else if (row.kind === 'tag') {
		menu.push({ id: 'hide', label: t('navigator.hide'), icon: EyeOff, separatorBefore: true, run: () => service.hideEntry('tag', row.path) });
	}
	if (row.kind === 'folder') {
		const root = row.path === ROOT_FOLDER;
		menu.push(
			...revealEntry(env, row.path, { separatorBefore: true }),
			{ id: OWN.copyPath, label: t('navigator.copyPath'), icon: Copy, disabled: root, separatorBefore: !env.showInFolder, run: () => env.copyPath(row.path) },
			{ id: 'delete', label: t('navigator.delete'), icon: Trash2, danger: true, disabled: root, run: () => guard(service.deleteFolder(row.path)) },
		);
		return withHostEntries(menu, hostNodes(env, [row.path]), report);
	}
	return menu;
}
