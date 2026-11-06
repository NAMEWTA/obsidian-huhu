/** Real navigator and note-history mounts. Only the vault, Git service and editor context are supplied here. */
import { Component } from 'obsidian';
import { SettingsStore, type SettingsFile } from '../../../src/shared/settings/store';
import { setLanguage, t } from '../../../src/shared/i18n';
import { navigatorSchema } from '../../../src/modules/navigator/settings';
import { FolderCounts } from '../../../src/modules/navigator/core/folder-counts';
import type { NoteEntry } from '../../../src/modules/navigator/core/types';
import { createNavigatorService, type IndexPort, type OpsPort } from '../../../src/modules/navigator/services/navigator';
import { createMemoryCache } from '../../../src/modules/navigator/platform/cache-store';
import { PreviewStore } from '../../../src/modules/navigator/platform/preview-store';
import type { NavigatorEnv } from '../../../src/modules/navigator/ui/env';
import { mountNavigator } from '../../../src/modules/navigator/ui/mount';
import { mountNoteHistoryPanel } from '../../../src/modules/versioning/ui/history/history-panel-page';
import type { NoteHistoryHost } from '../../../src/modules/versioning/ui/history/NoteHistoryPanel';
import type { FileHistoryEntry } from '../../../src/modules/versioning/core/history';
import { EMPTY_DEVICE_STATE } from '../../../src/modules/versioning/core/ports';

// cmdk brings its own Radix Dialog copy, as in the production bundle; the owner-document adapter expects both.
import '../../../src/ui/components/command';
void Component;
const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };

function extensions(doc: Document) {
	const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
	const define = (name: string, descriptor: PropertyDescriptor) => {
		if (!Object.getOwnPropertyDescriptor(proto, name)) Object.defineProperty(proto, name, { configurable: true, ...descriptor });
	};
	define('win', { get(this: HTMLElement) { return this.ownerDocument.defaultView; } });
	define('doc', { get(this: HTMLElement) { return this.ownerDocument; } });
	define('addClass', { value(this: HTMLElement, ...names: string[]) { this.classList.add(...names); } });
	define('removeClass', { value(this: HTMLElement, ...names: string[]) { this.classList.remove(...names); } });
	define('empty', { value(this: HTMLElement) { this.replaceChildren(); } });
	define('onWindowMigrated', { value: () => () => {} });
	define('createEl', { value(this: HTMLElement, tag: string, options?: { cls?: string; text?: string }) {
		const el = this.ownerDocument.createElement(tag);
		if (options?.cls) el.className = options.cls;
		if (options?.text) el.textContent = options.text;
		this.append(el);
		return el;
	} });
	define('createDiv', { value(this: HTMLElement, options?: { cls?: string; text?: string }) { return this.createEl('div', options); } });
}
for (const doc of Object.values(docs)) extensions(doc);

const note = (path: string, mtime: number, tags: string[] = []): NoteEntry => {
	const slash = path.lastIndexOf('/');
	return { path, name: path.slice(slash + 1).replace(/\.md$/, ''), ext: 'md', folder: slash < 0 ? '/' : path.slice(0, slash), ctime: mtime, mtime, tags };
};
const longName = 'An-extraordinarilyLongUnbrokenNoteNameForNarrowContainers_使用很长的中文笔记名称检查折行与省略';
const sampleNotes = () => [note('Work/plan.md', 30, ['plan']), note(`Work/${longName}.md`, 20), note('Home/diary.md', 10), note('Home/ideas.md', 5, ['plan'])];

class Vault implements IndexPort {
	version = 1;
	files: NoteEntry[] = sampleNotes();
	private listeners = new Set<() => void>();
	notes() { return this.files; }
	folders() { return ['/', 'Work', 'Home']; }
	counts() { return FolderCounts.from(this.files); }
	get(path: string) { return this.files.find((entry) => entry.path === path); }
	subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
	set(files: NoteEntry[]) { this.files = files; this.version++; for (const fn of this.listeners) fn(); }
}

async function mountNav(doc: Document) {
	const files: Record<string, SettingsFile | null> = { vault: null, device: null };
	const store = new SettingsStore(
		{ load: async (scope) => files[scope] ?? null, save: async (scope, file) => { files[scope] = file; return file; } },
		{ timers: { set: (callback) => { queueMicrotask(callback); return 0; }, clear: () => undefined } },
	);
	await store.load();
	const settings = store.bind('navigator', navigatorSchema);
	await settings.update((draft) => { Object.assign(draft, { openOnSelect: false, confirmDelete: false }); });
	const vault = new Vault();
	const noop = async () => undefined;
	const ops: OpsPort = {
		open: noop, activePath: () => undefined, isFolder: (path) => vault.folders().includes(path),
		createNote: noop, createFolder: noop, rename: async (path) => path, duplicate: noop,
		move: async () => ({ moved: new Map(), skipped: [] }), notifySkipped() {}, chooseFolder: noop, ensureFolder: async () => {},
		askName: async (_title, value) => value, notify() {}, confirmDelete: async () => true, trash: async () => {}, addTag: async () => {}, copyPath() {}, report() {},
	};
	const service = createNavigatorService({
		settings, index: vault, ops, isMac: false, now: () => new Date(2026, 9, 15, 12).getTime(),
		labels: () => ({ folders: 'Folders', tags: 'Tags', untagged: 'Untagged', root: 'Vault', shortcuts: 'Shortcuts', recent: 'Recent', properties: 'Properties' }),
	});
	const previews = new PreviewStore({
		cache: createMemoryCache(),
		source: { mtime: () => 1, isMarkdown: () => true, readText: async (path) => `Preview of ${path} with enough text to wrap in narrow containers`, propertyImage: () => undefined, resolveImage: () => null, title: () => '', metadataReady: () => true },
		scheduler: { now: () => 0, yield: async () => {}, later: (callback) => { const handle = setTimeout(callback, 0); return () => clearTimeout(handle); } },
		imageProperties: () => [],
	});
	const env: NavigatorEnv = {
		app: { scope: {}, keymap: { pushScope() {}, popScope() {} } } as never,
		service, previews, isMac: false,
		resolveIcon: () => ({ icon: null, emoji: false, color: null }), subscribeIcons: () => () => undefined,
		imageUrl: (path) => path, copyPath() {}, openSettings() {}, openAppearance() {}, askName: async (_t, value) => value, report() {},
	};
	service.selectContext({ kind: 'folder', key: 'Work' });
	const container = doc.createElement('section');
	container.dataset.review = 'navigator';
	container.style.cssText = 'height:420px;margin-bottom:16px;border:1px solid var(--background-modifier-border)';
	doc.body.append(container);
	const dispose = mountNavigator(container, env);
	return { container, service, vault, settings, dispose: () => { dispose(); service.dispose(); void store.dispose(); } };
}

type HistoryMode = 'ready' | 'empty' | 'error' | 'pending';
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => { resolve = done; });
	return { promise, resolve };
}
function mountHistory(doc: Document) {
	const control = { mode: 'ready' as HistoryMode, repo: true, document: true, fetches: 0, release: undefined as undefined | (() => void) };
	const listeners = new Set<() => void>();
	const source = { id: 'review-doc', path: `Projects/${longName}.md`, leafId: 'leaf', ownerWindow: doc.defaultView!, generation: 0 };
	const entry = (id: string, subject: string): FileHistoryEntry => ({ id, commitOid: `${id}0000000000`, parents: [], author: 'A reviewer / 评审者', time: 1760000000, subject, pathAtRevision: source.path, status: 'M', ref: { kind: 'commit', commit: `${id}0000000000`, path: source.path } });
	const entries = [entry('a1', 'Rewrite the planning section so the narrow history row must truncate gracefully / 重写计划章节'), entry('b2', 'Fix typo')];
	const cached = ({ phase: 'ready', gitVersion: '2.51', operation: null, locked: false, remotes: [], identity: { name: '', email: '' }, device: { ...EMPTY_DEVICE_STATE }, place: { cwd: '/repo', root: '/repo', toRepo: (path: string) => path, toVault: (path: string) => path } });
	const snapshot = () => cached;
	const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
	const sync = { get snapshot() { return snapshot(); }, get ready() { return control.repo; }, subscribe };
	const host = {
		documents: {
			current: () => (control.document ? source : undefined), get: () => (control.document ? source : undefined), capture: () => ({ context: source, text: '' }),
			resolveLeaf: () => undefined, resolveView: () => undefined, returnTo: async () => {}, subscribe,
		},
		queries: {
			fileHistory: async () => {
				control.fetches++;
				if (control.mode === 'error') throw new Error('git log failed: repository locked / 仓库被占用');
				if (control.mode === 'pending') { const wait = deferred<void>(); control.release = () => wait.resolve(); await wait.promise; }
				return { path: source.path, entries: control.mode === 'empty' ? [] : entries, tip: 'tip', complete: true, lineage: 'git-rename-detection' };
			},
		},
		restores: { initialize: async () => {}, readSnapshot: async () => '', receipts: () => [], subscribe },
		reviews: { openVersion: async () => {}, forDocument: () => undefined, compareWith: async () => {}, subscribe },
		sync, openSettings() {},
	} as unknown as NoteHistoryHost;
	const container = doc.createElement('aside');
	container.dataset.review = 'history';
	container.style.cssText = 'height:420px;border:1px solid var(--background-modifier-border)';
	doc.body.append(container);
	const panel = mountNoteHistoryPanel(container, host, true);
 const dispose = () => panel.dispose();
	return { container, control, notify: () => { for (const fn of listeners) fn(); }, dispose };
}

void (async () => {
	const mounts = { main: { nav: await mountNav(docs.main), history: mountHistory(docs.main) }, other: { nav: await mountNav(docs.other), history: mountHistory(docs.other) } };
	Object.assign(window, {
		uiReview: {
			docs, mounts,
			longName,
			t,
			configure(language: 'en' | 'zh', theme: string) {
				setLanguage(language);
				for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
			},
			unmount() { for (const mount of Object.values(mounts)) { mount.nav.dispose(); mount.history.dispose(); } },
		},
	});
})();
