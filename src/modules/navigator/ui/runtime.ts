// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { Notice, Platform, TFile, moment, normalizePath } from 'obsidian';
import { AUTOMATION_COMPOSER } from '../../automations/api';
import { HOME_CALENDAR } from '../../home/api';
import { registerMoment } from '../core/moment-format';
import type { ModuleContext } from '../../../app/contracts/module';
import { vaultIdentity } from '../../../host/obsidian/storage/device-id';
import { t } from '../../../shared/i18n';
import type { SettingsHandle } from '../../../shared/settings/store';
import { ICONS_SERVICE, type IconTarget, type ResolvedIcon } from '../../icons/api';
import { NAVIGATOR_VIEW_TYPE, type NavigatorLists, type NavigatorListTarget, type NavigatorPanel, type NavigatorPeriodic } from '../api';
import { datedName } from '../core/new-note';
import { makeShortcut } from '../core/shortcuts';
import { remapFolderTemplates, resolveFolderTemplate } from '../core/folder-templates';
import { parentFolder, ROOT_FOLDER } from '../core/types';
import { createNoteFactory, placeCursor } from '../platform/note-factory';
import { createPeriodicNotes } from '../platform/periodic-notes';
import { createMemoryCache, openIndexedDbCache, type CacheStore } from '../platform/cache-store';
import { MetadataTracker } from '../platform/metadata-tracker';
import { PreviewStore } from '../platform/preview-store';
import { VaultIndex, isListed } from '../platform/vault-index';
import { vaultPreviewSource, windowScheduler } from '../platform/vault-source';
import { createNavigatorService, type NavigatorService, type OpsPort } from '../services/navigator';
import type { NavigatorSettings } from '../settings';
import { createProductivityActions, type ProductivityActions } from './actions';
import { coreTemplatesFolder, isTemplaterInstalled, listTemplateFiles, resolveTemplateFile } from '../platform/templates';
import { registerNavigatorCommands } from './commands';
import type { NavigatorEnv } from './env';
import { DialogRegistry } from './dialog-registry';
import { createObsidianOps } from './ops';
import { addTag } from '../platform/file-ops';
import { registerAttachmentHandlers } from '../platform/attachments';
import { collectHostMenu } from '../platform/host-menu';

const NO_ICON: ResolvedIcon = { icon: null, emoji: false, color: null };

export interface NavigatorRuntime {
	readonly actions: ProductivityActions;
	/** Paths of the notes in the template folder, for the settings page's suggestions. */
	templateFiles(): string[];
	templaterInstalled(): boolean;
	readonly panel: NavigatorPanel;
	readonly lists: NavigatorLists;
	/** The journal behind `NAVIGATOR_PERIODIC`: week start and note creation need the live platform. */
	readonly journal: NavigatorPeriodic;
	readonly service: NavigatorService;
	rebuildCache(): Promise<void>;
	dispose(): Promise<void>;
}

async function openCache(context: ModuleContext): Promise<CacheStore> {
	const name = `huhu-navigator-${vaultIdentity(context.app).vaultId}`;
	try {
		return await openIndexedDbCache(window.indexedDB, name);
	} catch (error) {
		console.warn('[HUHU navigator] IndexedDB is unavailable; previews are kept for this session only', error);
		return createMemoryCache();
	}
}

/** Everything one activation of the navigator owns; `dispose()` releases it all. */
export async function createNavigatorRuntime(context: ModuleContext, settings: SettingsHandle<NavigatorSettings>): Promise<NavigatorRuntime> {
	const { app, lifetime } = context;
	// Date formats are Obsidian's own Moment, so they behave as in the core Daily notes plugin.
	registerMoment(moment);
	const win = app.workspace.containerEl.ownerDocument.defaultView ?? window;
	let alive = true;
	const report = (error: unknown) => {
		console.error('[HUHU navigator]', error);
		new Notice(error instanceof Error ? error.message : String(error));
	};

	/** A new file is named after today's date: `YYYY-MM-DD-Untitled`. */
	const newNoteName = () => datedName(t('navigator.untitled'), new Date());

	const index = new VaultIndex(app);
	index.start(lifetime, settings.get().showAllFiles);
	const cache = await openCache(context);
	const metadata = new MetadataTracker();
	const previews = new PreviewStore({
		cache,
		source: vaultPreviewSource(app, metadata),
		scheduler: windowScheduler(win),
		imageProperties: () => settings.get().imageProperties,
		onError: (error) => console.warn('[HUHU navigator] preview cache', error),
	});
	const dialogs = new DialogRegistry();
	const baseOps = createObsidianOps(app, report, dialogs, { defaultProperties: () => settings.get().defaultProperties });
	// A note made from a template is opened by the navigator, which then puts the cursor where the template asked.
	let pendingCursor: { path: string; cursor?: number; templaterCursor?: boolean } | undefined;
	const ops: OpsPort = {
		...baseOps,
		async open(path, options) {
			await baseOps.open(path, options);
			const pending = pendingCursor;
			if (pending?.path !== path) return;
			pendingCursor = undefined;
			const file = app.vault.getFileByPath(path);
			if (alive && file) placeCursor(app, file, pending);
		},
		async createNote(folder, tag) {
			const parent = folder ?? app.fileManager.getNewFileParent(app.workspace.getActiveFile()?.path ?? '').path;
			const target = parent === '' ? ROOT_FOLDER : parent;
			// Without a template that applies, the plain note of the file operations is created.
			if (!(await factory.readTemplate(undefined, target))) return baseOps.createNote(folder, tag);
			const file = await factory.createNote({ folder: target, name: newNoteName(), tag, open: false, onCreated: (info) => { pendingCursor = { path: info.file.path, cursor: info.cursor, templaterCursor: info.templaterCursor }; } });
			return file?.path;
		},
	};
	const service = createNavigatorService({
		settings,
		index,
		ops,
		isMac: Platform.isMacOS,
		timers: { set: (callback, ms) => win.setTimeout(callback, ms), clear: (handle) => win.clearTimeout(handle as number) },
		labels: () => ({ folders: t('navigator.folders'), tags: t('navigator.tags'), untagged: t('navigator.untagged'), root: t('navigator.rootFolder'), shortcuts: t('navigator.shortcuts'), recent: t('navigator.recent'), properties: t('navigator.properties'), defaultProfile: t('navigator.profileDefault') }),
	});

	// Notes made from templates, periodic notes, merging and tag edits.
	const factory = createNoteFactory({
		app,
		settings,
		ask: async (label) => (await import('./dialogs')).askName(app, dialogs, { title: t('navigator.promptTitle'), label, value: '', confirm: t('navigator.ok') }),
		open: async (file, options) => {
			if (!alive) return;
			await ops.open(file.path, { focus: true, newTab: options.newTab, split: options.split, ownerWindow: options.ownerWindow });
			if (alive) placeCursor(app, file, options);
		},
		notify: (key, params) => { new Notice(t(key, params)); },
		defaultName: newNoteName,
		addTag: (file, tag) => addTag(app, file, tag),
	});
	const periodic = createPeriodicNotes({
		app,
		settings,
		factory,
		openFile: async (file, options) => { if (!alive) return; await ops.open(file.path, { focus: true, newTab: options.newTab, split: options.split, ownerWindow: options.ownerWindow }); if (alive) placeCursor(app, file, options); },
		isActive: () => alive,
		entry: (path) => index.get(path),
		notify: (key) => new Notice(t(key)),
		report,
	});
	const actions = createProductivityActions({ app, service, factory, periodic, dialogs, report, isStopped: () => !alive, askName: (titleKey, value) => ops.askName(titleKey, value), open: (path) => ops.open(path, { focus: true }) });

	const warm = () => {
		if (!alive || !settings.get().indexInBackground) return;
		const paths = index.notes().filter((note) => note.ext === 'md' || settings.get().showAllFiles).sort((a, b) => b.mtime - a.mtime).map((note) => note.path);
		previews.enqueue(paths);
	};
	let warmTimer: number | undefined;
	void previews.load().then(() => app.workspace.onLayoutReady(() => {
		if (alive) warmTimer = win.setTimeout(warm, 1500);
	}));

	const journalListeners = new Set<() => void>();
	const notifyJournal = () => { if (alive) for (const listener of [...journalListeners]) listener(); };
	const iso = (date: Date) => `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	const inspect: NavigatorPeriodic['inspect'] = (period, date) => {
		const path = periodic.pathFor(period, date);
		const file = app.vault.getFileByPath(path);
		return { period, date: iso(date), path, title: file?.basename ?? path.split('/').pop()!.replace(/\.md$/, ''),
			status: !alive ? 'unavailable' : !periodic.config().rules[period].enabled ? 'disabled' : file ? 'existing' : 'missing',
			active: app.workspace.getActiveFile()?.path === path };
	};
	const journal: NavigatorPeriodic = {
		root: () => settings.get().periodicRoot,
		template: (period, date) => {
			const current = settings.get();
			const wanted = current.periods[period].template?.trim() || (date ? resolveFolderTemplate(current.folderTemplates, parentFolder(periodic.pathFor(period, date)))?.template : undefined);
			return wanted && date ? resolveTemplateFile(app, [current.templateFolder, coreTemplatesFolder(app)], wanted)?.path ?? wanted : wanted || undefined;
		},
		weekStart: () => periodic.config().weekStart,
		display: () => ({ weekNumbers: settings.get().calendarWeekNumbers, images: settings.get().calendarImages, weeks: settings.get().calendarWeeks }),
		inspect,
		subscribe(listener) { journalListeners.add(listener); return () => { journalListeners.delete(listener); }; },
		async preview(period, date) {
			const before = inspect(period, date);
			if (before.status !== 'existing') return before;
			const record = await previews.read(before.path);
			const current = inspect(period, date);
			if (current.path !== before.path || current.status !== 'existing') return current;
			const image = settings.get().calendarImages && record?.image ? app.vault.getFileByPath(record.image) : null;
			return { ...current, summary: record?.preview, image: image ? app.vault.getResourcePath(image) : undefined };
		},
		prepare: (period, date, options) => alive ? periodic.prepare(period, date, options) : Promise.resolve({ status: 'unavailable', code: 'periodic-unavailable' }),
		async open(period, date, options = {}) {
			if (options.ownerWindow?.closed) return false;
			const info = inspect(period, date);
			if (info.status === 'disabled' || info.status === 'unavailable') return false;
			if (info.status === 'missing' && options.create) return periodic.open(period, date, { newTab: options.newTab, split: options.split && !Platform.isPhone, ownerWindow: options.ownerWindow });
			const file = info.status === 'existing' ? app.vault.getFileByPath(info.path) : undefined;
			if (!file || !alive) return false;
			await ops.open(file.path, { focus: true, newTab: options.newTab, split: options.split && !Platform.isPhone, ownerWindow: options.ownerWindow });
			notifyJournal();
			return true;
		},
		ensure: (period, date) => alive ? periodic.ensure(period, date) : Promise.resolve(undefined),
		active() {
			const path = app.workspace.getActiveFile()?.path;
			const ref = path ? periodic.identify(path) : undefined;
			return ref ? { period: ref.period, date: iso(ref.start) } : undefined;
		},
	};
	lifetime.register(settings.subscribe(notifyJournal));
	lifetime.register(previews.subscribe(notifyJournal));
	lifetime.registerEvent(app.vault.on('create', notifyJournal));
	lifetime.registerEvent(app.vault.on('modify', notifyJournal));
	lifetime.registerEvent(app.vault.on('delete', notifyJournal));
	lifetime.registerEvent(app.vault.on('rename', notifyJournal));
	lifetime.registerEvent(app.workspace.on('file-open', notifyJournal));
	const env: NavigatorEnv = {
		app,
		service,
		previews,
		periodic: journal,
		calendar: () => context.services.peek(HOME_CALENDAR),
		get remindCalendarTask() {
			if (!context.services.peek(AUTOMATION_COMPOSER)) return undefined;
			return (task: import('../../home/api').CalendarTask, date: string, owner?: Window) => {
				const time = context.services.peek(HOME_CALENDAR)?.dayTime(task, date) || '09:00';
				const at = new Date(`${date}T${time}:00`).getTime();
				void context.services.peek(AUTOMATION_COMPOSER)?.open({ action: 'notify', prefill: { name: task.text, at: at > Date.now() ? at : undefined, link: { path: task.path, line: task.line } }, ownerWindow: owner ?? win }).catch(report);
			};
		},
		watchCalendar(listener) {
			let inner = context.services.peek(HOME_CALENDAR)?.subscribe(listener);
			const stopComposer = context.services.watch(AUTOMATION_COMPOSER, () => listener());
			const stop = context.services.watch(HOME_CALENDAR, (calendar) => { inner?.(); inner = calendar?.subscribe(listener); listener(); });
			return () => { inner?.(); stop(); stopComposer(); };
		},
		isMac: Platform.isMacOS,
		resolveIcon: (target: IconTarget) => context.services.peek(ICONS_SERVICE)?.resolve(target) ?? NO_ICON,
		subscribeIcons(listener) {
			let inner = context.services.peek(ICONS_SERVICE)?.subscribe(listener);
			const stop = context.services.watch(ICONS_SERVICE, (icons) => {
				inner?.();
				inner = icons?.subscribe(listener);
				listener();
			});
			return () => { inner?.(); stop(); };
		},
		imageUrl(path) {
			const file = app.vault.getFileByPath(path);
			return file ? app.vault.getResourcePath(file) : '';
		},
		copyPath: (path) => ops.copyPath(path),
		// The system file manager and default applications exist on desktop only; Electron stays behind a dynamic import.
		showInFolder: Platform.isDesktopApp ? async (path) => { await (await import('../platform/desktop/system-files')).showInSystemExplorer(app, path); } : undefined,
		openInDefaultApp: Platform.isDesktopApp ? async (path) => { await (await import('../platform/desktop/system-files')).openInDefaultApp(app, path); } : undefined,
		hostMenu: (paths) => (alive ? collectHostMenu(app, paths, Platform.isMacOS) : []),
		canSplit: !Platform.isPhone,
		openSettings: () => { void context.shell.open({ feature: 'settings', section: 'navigator' }); },
		// A dialog whose module loads after the navigator stopped is closed as it opens (the registry refuses it).
		openAppearance: (target) => { void import('./dialogs').then(({ openAppearanceDialog }) => { if (!dialogs.isStopped) openAppearanceDialog(app, dialogs, service, target); }); },
		askName: (titleKey, value) => ops.askName(titleKey, value),
		actions,
		report,
	};

	// Pasted and dropped files go to the `assets` folder next to the note.
	registerAttachmentHandlers({
		app,
		scope: lifetime,
		enabled: () => settings.get().attachmentsNextToNote,
		folderName: () => settings.get().attachmentsFolder,
		notifyFailed: (names) => { new Notice(t('navigator.attachmentFailed', { names: names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '') })); },
	});

	// Vault events keep selection, expansion, pins and previews in step with renames and deletions.
	lifetime.registerEvent(app.vault.on('rename', (file, oldPath) => {
		service.onRenamed(oldPath, file.path);
		metadata.renamed(oldPath, file.path);
		if (file instanceof TFile) previews.rename(oldPath, file.path);
		else if (settings.get().folderTemplates.some((entry) => entry.folder === oldPath || entry.folder.startsWith(`${oldPath}/`))) {
			void settings.update((draft) => { draft.folderTemplates = remapFolderTemplates(draft.folderTemplates, oldPath, file.path); }).catch(report);
		}
	}));
	lifetime.registerEvent(app.vault.on('delete', (file) => {
		service.onDeleted(file.path);
		metadata.forget(file.path);
		if (file instanceof TFile) previews.remove(file.path);
		else if (settings.get().folderTemplates.some((entry) => entry.folder === file.path || entry.folder.startsWith(`${file.path}/`))) {
			void settings.update((draft) => { draft.folderTemplates = draft.folderTemplates.filter((entry) => entry.folder !== file.path && !entry.folder.startsWith(`${file.path}/`)); }).catch(report);
		}
	}));
	lifetime.registerEvent(app.vault.on('create', (file) => {
		if (file instanceof TFile && isListed(file.extension, settings.get().showAllFiles)) previews.enqueue([file.path]);
	}));
	// A change, in the text or in the parsed metadata (frontmatter images), refreshes that note's preview.
	const refresh = (path: string) => { if (alive && index.get(path)) previews.enqueue([path]); };
	lifetime.registerEvent(app.vault.on('modify', (file) => { metadata.modified(file.path); refresh(file.path); }));
	lifetime.registerEvent(app.metadataCache.on('changed', (file) => { metadata.parsed(file.path); refresh(file.path); }));
	lifetime.registerEvent(app.metadataCache.on('resolved', () => warm()));
	lifetime.registerEvent(app.workspace.on('file-open', (file) => {
		if (!file || !index.get(file.path)) return;
		service.recordRecent(file.path);
		if (settings.get().autoReveal) service.reveal(file.path);
	}));
	// The file-type filter and image properties change what the index and previews contain.
	let lastShowAll = settings.get().showAllFiles;
	let lastImages = settings.get().imageProperties.join();
	lifetime.register(settings.subscribe(() => {
		const next = settings.get();
		if (next.showAllFiles !== lastShowAll) {
			lastShowAll = next.showAllFiles;
			index.setShowAllFiles(next.showAllFiles);
			warm();
		}
		if (next.imageProperties.join() !== lastImages) {
			lastImages = next.imageProperties.join();
			warm();
		}
	}));

	const rebuildCache = async () => {
		// Emptying the store is enough; the connection stays open and keeps receiving the rebuilt records.
		await previews.clear();
		index.rebuild();
		warm();
		new Notice(t('navigator.cacheRebuilt'));
	};

	const mounted = new Set<() => void>();
	const panel: NavigatorPanel = {
		mount(container) {
			let unmount: (() => void) | undefined;
			let live = true;
			void import('./mount').then(({ mountNavigator }) => { if (live && alive) unmount = mountNavigator(container, env); });
			const cleanup = () => { if (!live) return; live = false; unmount?.(); mounted.delete(cleanup); };
			mounted.add(cleanup);
			return cleanup;
		},
		reveal: (path) => service.reveal(normalizePath(path)),
		focus: (pane) => service.focusPane(pane),
	};

	const listeners = new Set<() => void>();
	const lists: NavigatorLists = {
		snapshot: () => service.listsSnapshot(),
		subscribe(listener) {
			const stop = service.subscribeLists(listener);
			listeners.add(stop);
			return () => { listeners.delete(stop); stop(); };
		},
		open(target: NavigatorListTarget) {
			if (!alive) return;
			if (target.kind === 'note') { service.openShortcut(makeShortcut('note', target.key)); return; }
			// Folders, tags, properties and searches are shown in the navigator, so bring it up first.
			void app.workspace.ensureSideLeaf(NAVIGATOR_VIEW_TYPE, 'left', { active: true, reveal: true }).then(() => { if (alive) service.openShortcut(makeShortcut(target.kind, target.key)); }, report);
		},
	};

	registerNavigatorCommands({ context, env, service, rebuildCache, actions });
	if (app.workspace.getActiveFile()) app.workspace.onLayoutReady(() => {
		const active = app.workspace.getActiveFile();
		if (alive && active && settings.get().autoReveal && index.get(active.path)) service.reveal(active.path);
	});

	return {
		actions,
		templateFiles: () => listTemplateFiles(app, settings.get().templateFolder),
		templaterInstalled: () => isTemplaterInstalled(app),
		panel,
		lists,
		journal,
		service,
		rebuildCache,
		async dispose() {
			alive = false;
			journalListeners.clear();
			if (warmTimer !== undefined) win.clearTimeout(warmTimer);
			for (const cleanup of [...mounted]) cleanup();
			dialogs.stop();
			actions.dispose();
			for (const stop of [...listeners]) stop();
			listeners.clear();
			service.dispose();
			await previews.dispose();
			cache.close();
		},
	};
}
