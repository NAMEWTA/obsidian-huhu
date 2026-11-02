import { mountIntroContent } from '../../../src/app/intro-content';
/** Real workbench and settings. Only Obsidian lifecycle and service I/O are supplied here. */
import { Component } from 'obsidian';
import type { App } from 'obsidian';
import type DashboardPlugin from '../../../src/app/main';
import type { WorkbenchHost, WorkbenchLeafView } from '../../../src/app/contracts/workbench-host';
import { createWorkbenchSurface } from '../../../src/shell/host/workbench-surface';
import { createSettingsPage } from '../../../src/app/workbench/settings-page';
import { NativeSurface } from '../../../src/ui/native-surface';
import { SettingsStore, type SettingsFile } from '../../../src/shared/settings/store';
import { themeSettings } from '../../../src/theme/settings';
import type { AppSettings } from '../../../src/app/settings/app-schema';
import { setLanguage, t } from '../../../src/shared/i18n';
import { registerMessages } from '../../../src/shared/i18n';
import { messages } from '../../../src/shared/i18n/lazy/appearance';
registerMessages(messages);
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
		if (!Object.getOwnPropertyDescriptor(proto, name))
			Object.defineProperty(proto, name, { configurable: true, ...descriptor });
	};
	define('win', {
		get(this: HTMLElement) {
			return this.ownerDocument.defaultView;
		},
	});
	define('doc', {
		get(this: HTMLElement) {
			return this.ownerDocument;
		},
	});
	define('addClass', {
		value(this: HTMLElement, ...names: string[]) {
			this.classList.add(...names);
		},
	});
	define('removeClass', {
		value(this: HTMLElement, ...names: string[]) {
			this.classList.remove(...names);
		},
	});
	define('empty', {
		value(this: HTMLElement) {
			this.replaceChildren();
		},
	});
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
	define('createDiv', {
		value(this: HTMLElement, options?: { cls?: string; text?: string }) {
			return this.createEl('div', options);
		},
	});
}
for (const doc of Object.values(docs)) {
	extensions(doc);
	Object.defineProperty(doc.defaultView!.navigator, 'clipboard', {
		configurable: true,
		value: { writeText: async () => {}, readText: async () => '{}' },
	});
}
function model<T>(initial: T) {
	let value = initial;
	const listeners = new Set<() => void>();
	return {
		get: () => value,
		subscribe(fn: () => void) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		async update(recipe: (draft: T) => void | T) {
			const next = structuredClone(value);
			value = recipe(next) ?? next;
			for (const fn of listeners) fn();
		},
	};
}
class Payload extends NativeSurface {
	getViewType() {
		return 'review-service';
	}
	getDisplayText() {
		return 'Retained page';
	}
	getIcon() {
		return 'file';
	}
	override onOpen() {
		const input = this.contentEl.ownerDocument.createElement('input');
		input.value = 'Retained service data';
		input.setAttribute('aria-label', 'Retained service data');
		this.contentEl.append(input);
		return Promise.resolve();
	}
}
async function mount(doc: Document) {
	const appSettings = model({
		language: 'en',
		devGallery: false,
		introSeen: true,
		modules: {},
		statusBar: { segments: {}, usageMode: 'verbose', usageDisplay: 'used' },
	} as AppSettings);
	let saving: { resolve: () => void; reject: (error: Error) => void } | undefined;
	let hold = false,
		calls = 0,
		navigations = 0,
		navigation: { resolve: () => void; reject: (error: Error) => void } | undefined;
	let available = true;
	const files: Record<string, SettingsFile | null> = {
		vault: { version: 1, namespaces: { theme: { ...themeSettings.defaults(), fontText: 'custom' } } },
		device: null,
	};
	const store = new SettingsStore(
		{
			load: async (scope) => files[scope] ?? null,
			save: async (scope, file) => {
				if (hold)
					await new Promise<void>((resolve, reject) => {
						saving = { resolve, reject };
					});
				files[scope] = structuredClone(file);
				return structuredClone(file);
			},
		},
		{
			timers: {
				set: (fn, ms) => doc.defaultView!.setTimeout(fn, ms),
				clear: (timer) => doc.defaultView!.clearTimeout(timer as number),
			},
			debounceMs: 0,
		},
	);
	await store.load();
	const theme = store.bind('theme', themeSettings),
		update = theme.update;
	theme.update = (...args) => {
		calls++;
		return update(...args);
	};
	const app = {
		workspace: { requestSaveLayout() {}, revealLeaf: async () => {}, on: () => ({}), offref() {} },
	} as unknown as App;
	const plugin = {
		app,
		manifest: { version: 'review' },
		appSettings,
		theme,
		onModuleChanged: () => () => {},
		moduleManifests: () => [],
		moduleEnabled: () => false,
		moduleState: () => 'idle',
	} as unknown as DashboardPlugin;
	const contentEl = doc.createElement('section');
	contentEl.dataset.review = 'workbench';
	contentEl.style.height = '860px';
	doc.body.append(contentEl);
	const view = {
		contentEl,
		app,
		leaf: { detach() {} },
		addChild: (child: Component) => child,
		removeChild: (child: Component) => child.unload(),
	} as unknown as WorkbenchLeafView;
	const host: WorkbenchHost = {
		contributions: [
			{
				id: 'settings',
				title: () => `${t('workbench.settings')} — Long workspace settings / 长工作区设置名称`,
				rail: { slot: 'bottom' },
				navigation: { id: 'settings', labelKey: 'workbench.settings', icon: 'settings' },
				availability: () => ({ enabled: true, supported: true, ready: true }),
				panel: () => ({
					searchable: true,
					sections: [
						{
							id: 'settings',
							items: ['general', 'appearance', 'about'].map((section) => ({
								id: section,
								label:
									section === 'appearance'
										? t('appearance.title')
										: section === 'general'
											? t('settings.tabGeneral')
											: t('settings.tabAbout'),
								target: { feature: 'settings', section },
							})),
						},
					],
				}),
				stateKeys: [],
				create: createSettingsPage(plugin),
			},
			{
				id: 'contacts',
				rail: { slot: 'top' },
				navigation: { id: 'contacts', labelKey: 'contacts.title', icon: 'users' },
				availability: () => ({ enabled: true, supported: true, ready: available, reason: 'Not configured / 未配置' }),
				stateKeys: [],
				create: async (context) => {
					navigations++;
					await new Promise<void>((resolve, reject) => {
						navigation = { resolve, reject };
					});
					return { surface: new Payload(context) };
				},
			},
		],
		subscribe: () => () => {},
		failed: () => false,
		report() {},
		openSettings() {},
		openFocus: async () => {},
		openInWorkbench: async () => {},
	};
	const intro = doc.createElement('section');
	intro.dataset.review = 'intro';
	doc.body.append(intro);
	const disposeIntro = mountIntroContent(intro, () => { disposeIntro(); intro.remove(); });
	const surface = createWorkbenchSurface(view, host, {
		target: { feature: 'settings', section: 'appearance' },
		panelOpen: true,
	});
	void surface.ensureActivePage();
	return {
		surface,
		disposeIntro,
		plugin,
		contentEl,
		theme,
		store,
		files,
		calls: () => calls,
		saving: () => !!saving,
		hold: (value: boolean) => {
			hold = value;
		},
		settle: (error?: string) => {
			if (error) saving?.reject(new Error(error));
			else saving?.resolve();
			saving = undefined;
		},
		navigations: () => navigations,
		settleNavigation: (error?: string) => {
			if (error) navigation?.reject(new Error(error));
			else navigation?.resolve();
			navigation = undefined;
		},
		available: (value: boolean) => {
			available = value;
		},
	};
}
void (async () => {
	const mounts = { main: await mount(docs.main), other: await mount(docs.other) };
	Object.assign(window, {
		uiReview: {
			docs,
			mounts,
			t,
			async configure(language: 'en' | 'zh', theme: string) {
				setLanguage(language);
			await Promise.all(Object.values(mounts).map(mount => mount.plugin.appSettings.update(draft => { draft.language = language; })));
				for (const doc of Object.values(docs)) {
					doc.documentElement.lang = language;
					doc.body.className = theme;
				}
			},
			async unmount() {
				await Promise.all(
					Object.values(mounts).map(async (mount) => {
						mount.disposeIntro();
				await mount.surface.dispose();
						await mount.store.dispose();
					}),
				);
			},
		},
	});
})();
