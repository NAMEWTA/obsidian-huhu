/** The real Home media panel (grid, list, groups, filters, lightbox, tag editor, delete and rename). Only the vault and tag-service edges are supplied here. */
import { createRoot, type Root } from 'react-dom/client';
import { memoryVault } from '../../fixtures/memory-vault';
import { setLanguage, t } from '../../../src/shared/i18n';
import { ContainerProviders } from '../../../src/ui/react/providers';
import { DesignScope } from '../../../src/ui/react/design-scope';
import { MediaPanel } from '../../../src/modules/home/ui/media/MediaPanel';
import { bindVaultPreferences } from '../../../src/host/obsidian/storage/preferences';
import type { DashboardColumn } from '../../../src/modules/home/core/board/types';
import type { MediaTagService } from '../../../src/modules/home/platform/media/media-tags';

// cmdk brings its own Radix copy, as in the production bundle; the owner-document adapter expects both.
import '../../../src/ui/components/command';
import '../../../src/ui/components/dropdown-menu';
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
// The second window is a hidden frame, where lazy images would never load; the production attribute stays lazy and the fixture decodes eagerly.
for (const doc of Object.values(docs)) {
	const proto = (doc.defaultView as Window & typeof globalThis).HTMLImageElement.prototype, set = proto.setAttribute;
	proto.setAttribute = function (this: HTMLImageElement, name: string, value: string) { return set.call(this, name, name === 'loading' ? 'eager' : value); };
}

const longName = 'Quarterly-planning-offsite-whiteboard-photo-with-a-very-long-descriptive-name-季度规划会议白板照片包含很长的描述性名称';
const swatch = (color: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${color}"/><circle cx="120" cy="110" r="60" fill="#fff" fill-opacity=".6"/></svg>`)}`;
const colors = ['#d97706', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2'];
const imagePaths = [
	`Images/${longName}.png`, 'Images/sunrise.png', 'Images/harbour.png', 'Images/forest.png', 'Images/broken-file.png',
	'Photos/2026/portrait.png', 'Photos/2026/market.png', 'Photos/2025/lake.png',
];
const videoPaths = ['Videos/demo-reel.mp4', 'Videos/standup-recording-with-an-extremely-long-file-name-for-wrapping.mp4'];

// Size preference stays in memory; the production store is a settings handle.
const values: Record<string, unknown> = {};
const handle = { get: () => ({ migrated: true, values }), update: async (recipe: (draft: { migrated: boolean; values: Record<string, unknown> }) => unknown) => { const draft = { migrated: true, values: structuredClone(values) }; recipe(draft); Object.assign(values, draft.values); }, touch: async () => {}, subscribe: () => () => {}, select: () => () => {} };
type Control = { failTrash: boolean; failRename: boolean; failTags: boolean; trashed: string[]; renamed: string[]; saved: number };
function fakeApp(doc: Document, paths: string[], control: Control) {
	const vault = memoryVault(Object.fromEntries(paths.map((p, i) => [p, 'x'.repeat(2048 * (i + 1))])), doc.defaultView);
	const app = vault.app as unknown as Record<string, unknown> & { vault: { adapter: Record<string, unknown> } };
	const resource = (path: string) => path.includes('broken-file') ? 'data:image/png;base64,AAAA' : path.endsWith('.mp4') ? 'data:video/mp4;base64,AAAA' : swatch(colors[paths.indexOf(path) % colors.length]!);
	app.vault.adapter.getResourcePath = resource;
	const folders = [...new Set(paths.map((p) => p.split('/').slice(0, -1).join('/')))].map((path) => ({ path, children: [] }));
	(app.vault as unknown as Record<string, unknown>).getAllLoadedFiles = () => folders;
	app.fileManager = {
		trashFile: async (file: { path: string }) => {
			if (control.failTrash) throw new Error('Permission denied: the file is read-only');
			await (app.vault.adapter.remove as (p: string) => Promise<void>)(file.path);
			control.trashed.push(file.path);
		},
		renameFile: async (file: { path: string }, to: string) => {
			if (control.failRename) throw new Error('locked');
			await (app.vault.adapter.rename as (a: string, b: string) => Promise<void>)(file.path, to);
			control.renamed.push(to);
		},
	};
	bindVaultPreferences(vault.app, handle as never);
	return vault.app;
}

function mountMedia(doc: Document, name: string, sectionType: string, paths: string[], height: number, taggable: boolean, control: Control) {
	const app = fakeApp(doc, paths, control);
	const tags: Record<string, string[]> = taggable ? { [imagePaths[1]!]: ['travel', 'dawn', 'sky'], [imagePaths[2]!]: ['travel'] } : {};
	const service = {
		getTags: (path: string) => tags[path] ?? [],
		getAllTags: () => [...new Set(Object.values(tags).flat()), 'archive'].sort(),
		setTags: (path: string, next: string[]) => { if (control.failTags) throw new Error('locked'); tags[path] = next; control.saved++; },
	} as unknown as MediaTagService;
	const column: DashboardColumn = { name, cards: [], color: '', sectionType };
	const container = doc.createElement('section');
	container.dataset.review = name;
	container.classList.add('huhu-ui');
	container.style.cssText = `height:${height}px;margin-bottom:16px;border:1px solid var(--background-modifier-border)`;
	doc.body.append(container);
	const root: Root = createRoot(container);
	const draw = () => root.render(<ContainerProviders container={container}><DesignScope className="h-full min-h-0 p-3"><MediaPanel app={app} column={column} tagService={taggable ? service : undefined} openNote={() => {}} /></DesignScope></ContainerProviders>);
	draw();
	return { container, root, draw, control, app, tags };
}

function mountAll(doc: Document) {
	const control = (): Control => ({ failTrash: false, failRename: false, failTags: false, trashed: [], renamed: [], saved: 0 });
	const images = mountMedia(doc, 'media-images', 'images', imagePaths, 780, true, control());
	const videos = mountMedia(doc, 'media-videos', 'videos', videoPaths, 340, false, control());
	const empty = mountMedia(doc, 'media-empty', 'images', [], 300, false, control());
	const unsupported = mountMedia(doc, 'media-unsupported', 'rss', [], 300, false, control());
	const all = { images, videos, empty, unsupported };
	return { ...all, draw() { for (const m of Object.values(all)) m.draw(); }, dispose() { for (const m of Object.values(all)) m.root.unmount(); } };
}

void (() => {
	const mounts = { main: mountAll(docs.main), other: mountAll(docs.other) };
	Object.assign(window, {
		uiReview: {
			docs, mounts, longName, t, values,
			configure(language: 'en' | 'zh', theme: string) {
				setLanguage(language);
				for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
				for (const mount of Object.values(mounts)) mount.draw();
			},
			unmount() { for (const mount of Object.values(mounts)) mount.dispose(); },
		},
	});
})();
