/**
 * The real Home content views: Inbox, RSS, Reading list, Dataview and the Library pinned-properties editor.
 * Only the edges are supplied here: an in-memory vault, a board store with recording callbacks, and a reading service.
 */
import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Component } from 'obsidian';
import { createStore } from 'zustand/vanilla';
import { setLanguage, t } from '../../../src/shared/i18n';
import { ContainerProviders } from '../../../src/ui/react/providers';
import { DesignScope } from '../../../src/ui/react/design-scope';
import { memoryVault } from '../../fixtures/memory-vault';
import { nowMoment } from '../../../src/host/obsidian/datetime';
import { contentFiles } from '../../../src/host/obsidian/storage/content-files';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../../src/modules/home/core/board/types/model';
import type { DataviewConfig, LibraryConfig, RssConfig } from '../../../src/modules/home/core/board/types';
import type { BoardStore } from '../../../src/modules/home/services/board-store';
import type { ReadingService, BookInfo } from '../../../src/modules/home/platform/reading/reading-service';
import { ThemeBridge } from '../../../src/modules/home/ui/theme/ThemeBridge';
import { InboxSection } from '../../../src/modules/home/ui/inbox/InboxSection';
import { RssSection } from '../../../src/modules/home/ui/rss/RssSection';
import { ReadingPanel } from '../../../src/modules/home/ui/reading/ReadingPanel';
import { DataviewPanel } from '../../../src/modules/home/ui/dataview/DataviewPanel';
import { PinnedProperties } from '../../../src/modules/home/ui/library/PinnedProperties';

// cmdk brings its own Radix copy, as in the production bundle; the owner-document adapter expects both.
import '../../../src/ui/components/command';
// The shared stub's Component has no lifecycle; the article reader loads and unloads one around the Markdown render.
Object.assign(Component.prototype, { load() {}, unload() {} });
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

const longTitle = 'Reconsidering the long-term maintenance cost of the quarterly planning workbook Averyveryveryveryverylongwordwithoutanyspacesatall 一个非常非常长的中文标题用来检验换行与截断是否都能正常工作';
const day = nowMoment().format('YYYY-MM-DD');
const root = 'huhu/inbox';
const now = Date.now();

type Calls = Record<string, unknown[]>;
const record = (calls: Calls, name: string, value: unknown = true) => { (calls[name] ??= []).push(value); };

/** The slice of BoardStore these views read; every write is recorded, and chosen ones fail until `calls.allow` is set. */
function boardStore(app: ReturnType<typeof memoryVault>['app'], files: unknown[], calls: Calls, behaviour: { failCapture?: boolean; failTrash?: boolean; failOpen?: boolean } = {}) {
	const settings = structuredClone(DEFAULT_DASHBOARD_SETTINGS);
	settings.memoSavePath = root;
	const state = createStore(() => ({ files, settings, captureDraft: '' }));
	const open = { ...behaviour };
	const store = {
		state, view: () => store, widgets: {}, ownerWindow: window,
		host: { app, settings, openExternal: (url: string) => record(calls, 'external', url) },
		openFile: async (path: string) => { if (open.failOpen) throw new Error('The tab could not be opened'); record(calls, 'open', path); },
		trash: async (file: { path: string }) => { record(calls, 'trash-try', file.path); if (open.failTrash) throw new Error('The file is locked by another program'); record(calls, 'trash', file.path); },
		capture: async (text: string) => { record(calls, 'capture-try', text); if (open.failCapture) throw new Error('offline'); record(calls, 'capture', text); },
		setCaptureDraft: (draft: string) => state.setState({ captureDraft: draft }),
		edit: async () => { record(calls, 'edit'); },
		heal: (kind: 'capture' | 'trash' | 'open') => { open[kind === 'capture' ? 'failCapture' : kind === 'trash' ? 'failTrash' : 'failOpen'] = false; },
	};
	return store as unknown as BoardStore & { heal(kind: 'capture' | 'trash' | 'open'): void };
}

async function inboxScene(name: string, notes: Record<string, string>, calls: Calls, behaviour = {}) {
	const vault = memoryVault(notes, window);
	await contentFiles(vault.app).refresh();
	const files = contentFiles(vault.app).getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime);
	return { id: name, store: boardStore(vault.app, files, calls, behaviour) };
}

const entry = (hash: string) => `---\n状态: 在用\n---\n${hash}`;
const inboxNotes: Record<string, string> = {
	[`${root}/2026-10-19-1405-买牛奶.md`]: entry(''),
	[`${root}/2026-10-20-0900-${longTitle}.md`]: entry(''),
	[`${root}/2026-10-21-1030-Short.md`]: entry(''),
	[`${root}/${day}-captures.md`]: `- 09:00 想法一\n- 10:30 ${longTitle}\n- 11:45 第三条\n`,
};

function feed(guidPrefix: string, title: string, count: number, error?: string) {
	return {
		title, link: `https://example.com/${guidPrefix}`, fetchedAt: now, error,
		items: Array.from({ length: count }, (_, i) => ({
			guid: `${guidPrefix}-${i}`, title: i === 1 ? longTitle : `${title}: article ${i + 1}`, link: `https://example.com/${guidPrefix}/${i}`,
			author: 'A. Writer', pubDate: now - i * 86400000, summaryHtml: `<p>Short summary of article ${i + 1}.</p>`,
		})),
	};
}
function rssVault(withCache: boolean, read = false) {
	const urls = ['https://example.com/news', 'https://example.com/broken'];
	const file = withCache ? {
		version: 1,
		feeds: {
			[urls[0]!]: feed('news', 'Daily News', 4),
			[urls[1]!]: { ...feed('broken', 'Broken Blog', 1), fetchedAt: now, error: 'HTTP 503' },
		},
		readGuids: read ? Object.fromEntries([0, 1, 2, 3].map((i) => [`news-${i}`, now]).concat([['broken-0', now]])) : {},
		savedGuids: {}, webCache: {},
	} : { version: 1, feeds: {}, readGuids: {}, savedGuids: {}, webCache: {} };
	return { vault: memoryVault({ '.huhu/cache/rss/rss.json': JSON.stringify(file) }, window), urls };
}
function rssScene(name: string, mode: 'none' | 'items' | 'failed' | 'read', calls: Calls) {
	const { vault, urls } = rssVault(mode === 'items' || mode === 'read', mode === 'read');
	const store = boardStore(vault.app, [], calls);
	const column = {
		name: 'RSS', type: 'rss', rssConfig: mode === 'none' ? { feeds: [], downloadFolder: '' } : {
			feeds: mode === 'failed' ? [{ url: 'https://example.com/never-fetched', name: 'Never fetched feed with a rather long display name 名字很长的订阅源' }] : urls.map((url, i) => ({ url, name: i ? 'Broken Blog' : 'Daily News' })),
			downloadFolder: 'RSS', pageSize: 10,
		} satisfies RssConfig,
	};
	return { id: name, store, column };
}

function readingService(books: BookInfo[], calls: Calls) {
	const listeners = new Set<() => void>();
	const status = { status: 'idle' as 'idle' | 'running' | 'paused', currentBook: null as BookInfo | null, elapsedSeconds: 0 };
	const service = {
		saveState: { status: 'saved' as const, error: undefined },
		subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
		subscribeTick: undefined, retrySave: async () => {},
		getState: () => status, getActiveBooks: () => books, getTodaySecondsForBook: (title: string) => (title.startsWith('Short') ? 2700 : 0),
		getApp: () => memoryVault({}, window).app,
		startReading(book: BookInfo) { record(calls, 'start', book.title); status.status = 'running'; status.currentBook = book; status.elapsedSeconds = 65; listeners.forEach((l) => l()); },
		pause() { record(calls, 'pause'); status.status = 'paused'; listeners.forEach((l) => l()); }, resume() { status.status = 'running'; listeners.forEach((l) => l()); },
		removeActiveBook: async (title: string) => { record(calls, 'remove', title); },
	};
	return service as unknown as ReadingService;
}
const book = (title: string, over: Partial<BookInfo> = {}): BookInfo => ({ title, author: '', coverUrl: '', isbn: title.slice(0, 6), totalPages: 0, currentPage: 0, finished: false, source: 'manual', ...over } as BookInfo);

const taskNote = '- [ ] Write the quarterly report for the whole team\n- [x] Send the invoice\n- [ ] ' + longTitle + '\n';
function dataviewScene(name: string, query: string, config: Partial<DataviewConfig> = {}) {
	const vault = memoryVault({
		'Notes/Alpha.md': '---\nstatus: draft\n---\nAlpha',
		'Notes/Beta.md': '---\nstatus: done\n---\nBeta',
		[`Notes/${longTitle}.md`]: '---\nstatus: done\n---\nLong',
		'Tasks/Plan.md': taskNote,
	}, window);
	return { id: name, app: vault.app, config: { query, pageSize: 10, ...config } as DataviewConfig };
}

const libraryConfig: LibraryConfig = { filters: [], viewMode: 'list', sortBy: 'file.name', sortDesc: false, visibleProperties: ['status'] } as unknown as LibraryConfig;

function PinnedScene({ onChange }: { onChange(value: LibraryConfig): void }) {
	const [config, setConfig] = useState(libraryConfig);
	return <PinnedProperties config={config} keys={['status', 'rating', 'a-property-name-that-is-extremely-long-and-has-no-spaces-at-all']} onChange={(value) => { setConfig(value); onChange(value); }} />;
}

function Scene({ id, title, children, height = 340 }: { id: string; title: string; children: React.ReactNode; height?: number }) {
	return (
		<article data-scene={id} aria-labelledby={`scene-${id}`} className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-0.5 text-card-foreground">
			<h3 id={`scene-${id}`} className="m-0 shrink-0 truncate pb-1 text-sm font-medium">{title}</h3>
			<div data-slot="widget-body" className="@container min-h-0 min-w-0 overflow-hidden px-3" style={{ height }}>{children}</div>
		</article>
	);
}

function mount(doc: Document, scenes: {
	inboxes: Awaited<ReturnType<typeof inboxScene>>[]; rss: ReturnType<typeof rssScene>[]; calls: Calls; reading: { id: string; title: string; service: ReadingService }[];
	dataviews: ReturnType<typeof dataviewScene>[];
}) {
	const container = doc.createElement('section');
	container.dataset.review = 'content';
	container.classList.add('huhu-ui');
	doc.body.append(container);
	const theme = scenes.inboxes[0]!.store;
	const setPinned = (value: LibraryConfig) => record(scenes.calls, 'pinned', value.visibleProperties);
	const root: Root = createRoot(container);
	const titles: Record<string, string> = {
		'inbox-empty': 'Inbox, empty', 'inbox-items': 'Inbox with long titles', 'inbox-failing': 'Inbox, writes fail',
		'rss-none': 'RSS, no feeds', 'rss-items': 'RSS with a failing feed', 'rss-failed': 'RSS, first load fails', 'rss-read': 'RSS, all read',
		'dataview-table': 'Dataview table', 'dataview-list': 'Dataview list', 'dataview-tasks': 'Dataview tasks', 'dataview-error': 'Dataview, bad query', 'dataview-empty': 'Dataview, no results', 'dataview-blank': 'Dataview, empty query',
	};
	root.render(
		<ContainerProviders container={container}>
			<DesignScope>
				<ThemeBridge store={theme} layout="canvas">
					<div className="flex min-w-0 flex-col gap-3 p-0.5">
						{scenes.inboxes.map(({ id, store }) => <Scene key={id} id={id} title={titles[id]!}><InboxSection store={store} /></Scene>)}
						{scenes.rss.map(({ id, store, column }) => <Scene key={id} id={id} title={titles[id]!}><RssSection store={store} column={column as never} /></Scene>)}
						{scenes.reading.map(({ id, title, service }) => (
							<Scene key={id} id={id} title={title}>
								<ReadingPanel service={service} add={() => record(scenes.calls, 'add')} statistics={() => {}} edit={(b) => record(scenes.calls, 'edit-book', b.title)} finish={() => {}} />
							</Scene>
						))}
						{scenes.dataviews.map(({ id, app, config }) => (
							<Scene key={id} id={id} title={titles[id]!}>
								<DataviewPanel context={{ app, hoverParent: null, opener: (file) => record(scenes.calls, 'open-note', file.path) }} config={config} reloadRegister={() => {}} change={(value) => record(scenes.calls, 'dataview-config', value)} />
							</Scene>
						))}
						<Scene id="library-pinned" title="Library, pinned properties" height={260}>
							<div className="h-full overflow-auto p-1">
								<PinnedScene onChange={setPinned} />
							</div>
						</Scene>
					</div>
				</ThemeBridge>
			</DesignScope>
		</ContainerProviders>,
	);
	return { container, root, calls: scenes.calls, dispose: () => root.unmount() };
}

async function build(doc: Document) {
	const calls: Calls = {};
	const inboxes = [
		await inboxScene('inbox-empty', {}, calls),
		await inboxScene('inbox-items', inboxNotes, calls),
		await inboxScene('inbox-failing', inboxNotes, calls, { failCapture: true, failTrash: true, failOpen: true }),
	];
	const rss = [rssScene('rss-none', 'none', calls), rssScene('rss-items', 'items', calls), rssScene('rss-failed', 'failed', calls), rssScene('rss-read', 'read', calls)];
	const reading = [
		{ id: 'reading-empty', title: 'Reading, empty', service: readingService([], calls) },
		{ id: 'reading-books', title: 'Reading list', service: readingService([
			book(longTitle, { author: 'An Author With A Rather Long Name And Another Name 作者名也很长很长' }),
			book('Short', { author: 'Ann', totalPages: 300, currentPage: 120 }),
			book('Finished book', { totalPages: 100, currentPage: 100, finished: true }),
		], calls) },
	];
	const dataviews = [
		dataviewScene('dataview-table', 'TABLE status FROM "Notes"'),
		dataviewScene('dataview-list', 'LIST FROM "Notes"', { viewMode: 'list' }),
		dataviewScene('dataview-tasks', 'TASK FROM "Tasks"'),
		dataviewScene('dataview-error', 'TABLE FROM FROM'),
		dataviewScene('dataview-empty', 'TABLE status FROM "Nowhere"'),
		dataviewScene('dataview-blank', ''),
	];
	return { doc, scenes: { inboxes, rss, reading, dataviews, calls } };
}

void (async () => {
	const [mainParts, otherParts] = await Promise.all([build(docs.main), build(docs.other)]);
	const mounts = { main: mount(docs.main, mainParts.scenes), other: mount(docs.other, otherParts.scenes) };
	const inboxStores = { main: mainParts.scenes.inboxes, other: otherParts.scenes.inboxes };
	Object.assign(window, {
		uiReview: {
			docs, mounts, inboxStores,
			t,
			configure(language: 'en' | 'zh', theme: string) {
				setLanguage(language);
				for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
			},
			unmount() { for (const mount of Object.values(mounts)) mount.dispose(); },
		},
	});
})();
