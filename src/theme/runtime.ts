import type { Plugin } from 'obsidian';
import type { SettingsHandle } from '../shared/settings/store';
import { THEME_CLASS_PREFIXES, THEME_VARS, resolveTheme, themeBodyState, type ThemeSettings } from './settings';

/** Applies the global theme to the main window and every popout window, and removes it on unload. */
export class ThemeRuntime {
	private readonly documents = new Set<Document>();

	constructor(private readonly handle: SettingsHandle<ThemeSettings>) {}

	attach(plugin: Plugin): void {
		this.add(document);
		// Popout windows that already exist (the plugin was just enabled) never fire `window-open`; their leaves know them.
		plugin.app.workspace.iterateAllLeaves((leaf) => this.add(leaf.view.containerEl.ownerDocument));
		plugin.registerEvent(plugin.app.workspace.on('window-open', (win) => this.add(win.doc)));
		plugin.registerEvent(plugin.app.workspace.on('window-close', (win) => this.documents.delete(win.doc)));
		// Switching Obsidian between light and dark changes which custom palette applies.
		plugin.registerEvent(plugin.app.workspace.on('css-change', () => this.applyAll()));
		plugin.register(this.handle.subscribe(() => this.applyAll()));
		plugin.register(() => this.detach());
	}

	private add(doc: Document): void {
		this.documents.add(doc);
		this.apply(doc);
	}

	private applyAll(): void {
		for (const doc of this.documents) this.apply(doc);
	}

	private apply(doc: Document): void {
		const mode = doc.body.classList.contains('theme-dark') ? 'dark' : 'light';
		const state = themeBodyState(resolveTheme(this.handle.get()), mode);
		clear(doc.body);
		doc.body.classList.add(...state.classes);
		for (const [name, value] of Object.entries(state.vars)) doc.body.style.setProperty(name, value);
	}

	private detach(): void {
		for (const doc of this.documents) clear(doc.body);
		this.documents.clear();
	}
}

function clear(body: HTMLElement): void {
	for (const name of Array.from(body.classList)) if (THEME_CLASS_PREFIXES.some((prefix) => name.startsWith(prefix))) body.classList.remove(name);
	for (const name of THEME_VARS) body.style.removeProperty(name);
}
