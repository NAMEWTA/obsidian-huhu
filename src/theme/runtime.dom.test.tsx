import { expect, test } from 'vitest';
import type { Plugin } from 'obsidian';
import { ThemeRuntime } from './runtime';
import { themeSettings, type ThemeSettings } from './settings';

type Handler = (arg?: { doc: Document }) => void;

function fixture(initial: Partial<ThemeSettings>, leafDocuments: Document[] = []) {
	let value = { ...themeSettings.defaults(), ...initial };
	const listeners = new Set<() => void>();
	const events = new Map<string, Handler[]>();
	const cleanups: Array<() => void> = [];
	const plugin = {
		app: { workspace: {
			on: (name: string, handler: Handler) => { events.set(name, [...(events.get(name) ?? []), handler]); return { name }; },
			iterateAllLeaves: (visit: (leaf: { view: { containerEl: { ownerDocument: Document } } }) => void) => { for (const doc of leafDocuments) visit({ view: { containerEl: { ownerDocument: doc } } }); },
		} },
		registerEvent: () => undefined,
		register: (cleanup: () => void) => { cleanups.push(cleanup); },
	} as unknown as Plugin;
	const handle = {
		get: () => value,
		subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
	};
	return {
		plugin, handle: handle as never, events, cleanups,
		set(next: Partial<ThemeSettings>) { value = { ...value, ...next }; for (const listener of [...listeners]) listener(); },
		fire(name: string, arg?: { doc: Document }) { for (const handler of events.get(name) ?? []) handler(arg); },
	};
}
const themeClasses = (doc: Document) => [...doc.body.classList].filter((name) => name.startsWith('huhu-')).sort();

test('the theme reaches the main window, popouts and later changes, and unload removes everything', () => {
	const f = fixture({ preset: 'soft', editor: 'github', fontText: 'serif' });
	const popout = document.implementation.createHTMLDocument('popout');
	new ThemeRuntime(f.handle).attach(f.plugin);
	const expected = ['huhu-editor--github', 'huhu-editor-themed', 'huhu-font-text--serif', 'huhu-md-headings--github', 'huhu-md-style--github', 'huhu-theme--soft', 'huhu-themed'];
	expect(themeClasses(document)).toEqual(expected);

	f.fire('window-open', { doc: popout });
	expect(themeClasses(popout)).toEqual(expected);

	f.set({ preset: 'default', editor: 'follow', fontText: 'default' });
	expect(themeClasses(document)).toEqual([]);
	expect(themeClasses(popout)).toEqual([]);

	f.fire('window-close', { doc: popout });
	f.set({ preset: 'cobalt' });
	expect(themeClasses(popout)).toEqual([]);

	f.fire('window-open', { doc: popout });
	for (const cleanup of f.cleanups) cleanup();
	expect(themeClasses(document)).toEqual([]);
	expect(themeClasses(popout)).toEqual([]);
});

test('custom colours follow Obsidian switching between light and dark', () => {
	const custom = themeSettings.normalize({ custom: { light: { background: '#fefefe' }, dark: { background: '#111111' } } }).custom;
	const f = fixture({ preset: 'custom', custom });
	document.body.classList.add('theme-light');
	new ThemeRuntime(f.handle).attach(f.plugin);
	expect(document.body.style.getPropertyValue('--nt-background')).toBe('#fefefe');
	document.body.classList.replace('theme-light', 'theme-dark');
	f.fire('css-change');
	expect(document.body.style.getPropertyValue('--nt-background')).toBe('#111111');
	for (const cleanup of f.cleanups) cleanup();
	expect(document.body.style.getPropertyValue('--nt-background')).toBe('');
	document.body.classList.remove('theme-dark');
});

test('a popout window that already exists when the plugin starts gets the theme and later updates', () => {
	const popout = document.implementation.createHTMLDocument('existing popout');
	const f = fixture({ preset: 'amber', fontSize: 18 }, [document, popout]);
	new ThemeRuntime(f.handle).attach(f.plugin);
	expect(themeClasses(popout)).toEqual(['huhu-theme--amber', 'huhu-theme-font-size', 'huhu-themed']);
	expect(popout.body.style.getPropertyValue('--huhu-user-font-size')).toBe('18px');
	f.set({ fontSize: 0 });
	expect(themeClasses(popout)).toEqual(['huhu-theme--amber', 'huhu-themed']);
	for (const cleanup of f.cleanups) cleanup();
	expect(themeClasses(popout)).toEqual([]);
	expect(themeClasses(document)).toEqual([]);
});

test('SuliWorld mode, variant, recommendations and local overrides are removed in every document', () => {
	const popout = document.implementation.createHTMLDocument('dark popout');
	popout.body.className = 'theme-dark community-theme';
	document.body.classList.add('theme-light', 'community-theme');
	const f = fixture({ preset: 'suliworld', suliworldVariant: 'forest', suliworldPlainQuotes: true, fontSize: 18 }, [popout]);
	new ThemeRuntime(f.handle).attach(f.plugin);
	expect(document.body.classList.contains('huhu-theme-cards')).toBe(false);
	expect(popout.body.classList.contains('huhu-theme-cards')).toBe(true);
	expect(popout.body.classList.contains('huhu-font-text--suliworld')).toBe(true);
	expect(popout.body.classList.contains('huhu-md-quotes--plain')).toBe(true);
	f.set({ editor: 'github', fontText: 'custom', fontTextCustom: 'Lora' });
	expect(popout.body.classList.contains('huhu-md-style--github')).toBe(true);
	expect(popout.body.classList.contains('huhu-md-quotes--plain')).toBe(false);
	expect(popout.body.classList.contains('huhu-font-text--suliworld')).toBe(false);
	expect(popout.body.style.getPropertyValue('--huhu-user-font-text')).toBe('Lora');
	document.body.classList.replace('theme-light', 'theme-dark');
	f.fire('css-change');
	expect(document.body.classList.contains('huhu-theme-cards')).toBe(true);
	for (const cleanup of f.cleanups) cleanup();
	for (const doc of [document, popout]) {
		expect(themeClasses(doc)).toEqual([]);
		expect(doc.body.style.getPropertyValue('--huhu-user-font-text')).toBe('');
		expect(doc.body.style.getPropertyValue('--huhu-user-font-size')).toBe('');
		expect(doc.body.classList.contains('community-theme')).toBe(true);
	}
	document.body.classList.remove('theme-dark', 'community-theme');
});
