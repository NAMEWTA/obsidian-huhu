/** Real Comments panel/popover/settings and Icons settings/picker. Only Obsidian lifecycle and storage I/O are supplied here. */
import { createRoot } from 'react-dom/client';
import { Component } from 'obsidian';
import type { App } from 'obsidian';
import type { EditorContextAccess } from '../../../src/app/contracts/editor-context';
import { HuhuProviders } from '../../../src/ui/react/providers';
import { DesignScope } from '../../../src/ui/react/design-scope';
import { registerMessages, setLanguage, t } from '../../../src/shared/i18n';
import { messages as commentMessages } from '../../../src/modules/comments/i18n';
import { messages as iconMessages } from '../../../src/modules/icons/i18n';
import { mountCommentsPanel } from '../../../src/modules/comments/ui/panel/mount';
import { mountCommentsOverlay } from '../../../src/modules/comments/ui/popover/CommentsOverlay';
import { commentsSettingsPage } from '../../../src/modules/comments/ui/settings-page';
import { createCommentsService } from '../../../src/modules/comments/services/comments';
import { createOverlayChannel } from '../../../src/modules/comments/services/overlay';
import { createAnchor } from '../../../src/modules/comments/core/anchor';
import { CommentStore, type CommentFs } from '../../../src/modules/comments/core/store';
import { DEFAULT_COMMENTS_SETTINGS, type CommentsSettings } from '../../../src/modules/comments/settings';
import type { CommentsEnv } from '../../../src/modules/comments/ui/env';
import { iconsSettingsPage } from '../../../src/modules/icons/ui/settings-page';
import { IconPickerContent } from '../../../src/modules/icons/ui/dialogs/icon-picker';
import { loadResources } from '../../../src/modules/icons/platform/resources';
import { DEFAULT_ICONIC_SETTINGS } from '../../../src/modules/icons/core/settings/model';
import type IconicController from '../../../src/modules/icons/platform/host/controller';
import type { SettingsHandle } from '../../../src/shared/settings/store';

registerMessages(commentMessages);
registerMessages(iconMessages);
const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };
const cleanups = new WeakMap<object, (() => void)[]>();
Object.assign(Component.prototype, {
	register(this: object, fn: () => void) {
		const list = cleanups.get(this) ?? [];
		list.push(fn);
		cleanups.set(this, list);
	},
	load() {},
	unload(this: object) {
		for (const fn of cleanups.get(this) ?? []) fn();
		cleanups.delete(this);
	},
});
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
	define('setText', { value(this: HTMLElement, text: string) { this.textContent = text; } });
	define('onWindowMigrated', { value: () => () => {} });
	define('createEl', {
		value(this: HTMLElement, tag: string, options?: { cls?: string; text?: string }) {
			const el = this.ownerDocument.createElement(tag);
			if (options?.cls) el.className = options.cls;
			if (options?.text) el.textContent = options.text;
			this.append(el);
			return el;
		},
	});
	define('createDiv', { value(this: HTMLElement, options?: { cls?: string; text?: string }) { return this.createEl('div', options); } });
}
for (const doc of Object.values(docs)) extensions(doc);

function handle<T extends object>(initial: T): SettingsHandle<T> & { fail: boolean } {
	let value = initial;
	const listeners = new Set<() => void>();
	const self = {
		fail: false,
		get: () => value,
		subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
		async update(recipe: (draft: T) => void) {
			if (self.fail) throw new Error('disk failed');
			const next = structuredClone(value);
			recipe(next);
			value = next;
			for (const fn of listeners) fn();
		},
	};
	return self as unknown as SettingsHandle<T> & { fail: boolean };
}

async function mount(doc: Document, key: string) {
	const win = doc.defaultView!;
	const files = new Map<string, string>();
	let failWrites = false;
	const fs: CommentFs = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p)!,
		write: async (p, v) => { if (failWrites) throw new Error('EIO'); files.set(p, v); },
		remove: async (p) => { files.delete(p); },
	};
	const store = new CommentStore(fs, { timers: { set: (cb) => win.setTimeout(cb, 1e6), clear: (h) => win.clearTimeout(h as number) } });
	const settings = handle<CommentsSettings>({ ...DEFAULT_COMMENTS_SETTINGS, author: 'Reviewer' });
	const service = createCommentsService(store, () => settings.get());
	const channel = createOverlayChannel();
	const long = 'Averyveryveryverylongunbrokenwordthatmustwrapinsideanarrowcommentcardwithoutleavingthepanel_长文本没有空格的批注内容需要在窄容器里折行显示';
	const first = await store.add('a.md', { anchor: createAnchor(long, 0, long.length), text: 'First comment: ' + long, author: 'Reviewer' });
	await store.reply(first.id, 'A reply with 中文 and English mixed together for width checks.', 'Reviewer');
	const second = await store.add('a.md', { anchor: createAnchor('Second anchored text', 0, 20), text: 'Resolved discussion', author: 'Reviewer' });
	await store.resolve(second.id);
	const third = await store.highlight('a.md', { anchor: createAnchor('Plain highlight', 0, 15), color: 'yellow' });
	await store.setNote(third.id, 'Note on a highlight');
	await store.setTags(third.id, ['alpha', 'beta']);
	await store.add('b.md', { anchor: createAnchor('Other note', 0, 10), text: 'Other note comment', author: 'Reviewer' });
	await store.flush();
	await service.refresh();
	service.setPath('a.md');
	const app = {
		workspace: { containerEl: doc.body, openLinkText: async () => {} },
		vault: { getFileByPath: (path: string) => ({ path }) },
	} as unknown as App;
	let exportFails = false;
	const env = {
		app, service, editors: new Set(), alive: () => true,
		overlay: () => channel, open: (request: Parameters<typeof channel.open>[0]) => channel.open(request),
		openSettings: () => {},
		exportHighlights: async () => { if (exportFails) throw new Error('export'); return 'huhu/exports/highlights/review.md'; },
	} as unknown as CommentsEnv;

	const host = doc.createElement('section');
	host.dataset.review = `panel-${key}`;
	host.dataset.surface = 'comments-panel';
	host.style.height = '640px';
	doc.body.append(host);
	const context = { id: `comments-${key}`, path: 'a.md', leafId: `source-${key}`, ownerWindow: doc.defaultView!, generation: 0 };
 const documents: EditorContextAccess = {
  current: (win) => win === context.ownerWindow ? context : undefined,
  get: (id) => id === context.id ? context : undefined,
  capture: (id) => { if (id !== context.id) throw new Error('Unknown source'); return { context, text: long }; },
  resolveLeaf: () => undefined, resolveView: () => undefined, returnTo: async () => {}, subscribe: () => () => {},
 };
 const panel = mountCommentsPanel(host, env, documents, true);

	const unmountOverlay = mountCommentsOverlay(doc, channel, env);

	const settingsHost = doc.createElement('section');
	settingsHost.dataset.review = 'comments-settings';
	doc.body.append(settingsHost);
	const settingsRoot = createRoot(settingsHost);
	const CommentsSettings = commentsSettingsPage(settings);
	settingsRoot.render(<HuhuProviders ownerDocument={doc}><CommentsSettings /></HuhuProviders>);

	// Icons: only the controller (Obsidian vault, managers) is stubbed.
	const iconSettings = structuredClone(DEFAULT_ICONIC_SETTINGS);
	let iconFail = false;
	const controller = {
		settings: iconSettings,
		app: { vault: { adapter: { exists: async () => true } } },
		manifest: {},
		isActive: () => true,
		updatePreference: async (k: keyof typeof iconSettings, v: never) => { if (iconFail) throw new Error('EIO'); iconSettings[k] = v; },
		updateDialogState: (patch: object) => Object.assign(iconSettings.dialogState, patch),
		saveSettings: async () => {},
		refreshBody() {}, refreshManagers() {},
		isSettingEnabled: (k: keyof typeof iconSettings) => iconSettings[k] === 'on' || iconSettings[k] === 'desktop',
		ruleManager: { checkRuling: () => null },
		openRuleEditor() {},
		getFileItem: (id: string) => ({ id }),
	} as unknown as IconicController;
	await loadResources();
	const iconsHost = doc.createElement('section');
	iconsHost.dataset.review = 'icons-settings';
	doc.body.append(iconsHost);
	const iconsRoot = createRoot(iconsHost);
	const IconsSettings = iconsSettingsPage(() => controller);
	iconsRoot.render(<HuhuProviders ownerDocument={doc}><IconsSettings resourceId="iconic-general" {...({} as object)} /></HuhuProviders>);

	const pickerHost = doc.createElement('section');
	pickerHost.dataset.review = 'icon-picker';
	doc.body.append(pickerHost);
	const pickerRoot = createRoot(pickerHost);
	const accepted: unknown[] = [];
	pickerRoot.render(
		<HuhuProviders ownerDocument={doc}>
			<DesignScope className="min-w-0 space-y-4 break-words">
				<IconPickerContent plugin={controller} items={[{ id: 'a.md', name: 'a.md', category: 'file', icon: null, color: null } as never]} accept={(...args) => { accepted.push(args); }} close={() => {}} />
			</DesignScope>
		</HuhuProviders>,
	);

	return {
		channel, store, service, env, controller, accepted, settings,
		failWrites: (value: boolean) => { failWrites = value; },
		exportFails: (value: boolean) => { exportFails = value; },
		failIcons: (value: boolean) => { iconFail = value; },
		unmount() {
			panel.dispose(); unmountOverlay(); settingsRoot.unmount(); iconsRoot.unmount(); pickerRoot.unmount();
			for (const el of [host, settingsHost, iconsHost, pickerHost]) el.remove();
			service.dispose(); channel.dispose();
		},
	};
}
void (async () => {
	const mounts = { main: await mount(docs.main, 'main'), other: await mount(docs.other, 'other') };
	Object.assign(window, {
		uiReview: {
			docs, mounts, t, createAnchor,
			async configure(language: 'en' | 'zh', theme: string) {
				setLanguage(language);
				for (const doc of Object.values(docs)) {
					doc.documentElement.lang = language;
					doc.body.className = theme;
				}
			},
			unmount() { for (const mount of Object.values(mounts)) mount.unmount(); },
		},
	});
})();
