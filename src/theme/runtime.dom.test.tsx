import { readFileSync } from 'node:fs';
import { afterEach, expect, test } from 'vitest';
import type { Plugin } from 'obsidian';
import { applyInterfaceTheme, ThemeRuntime } from './runtime';
import { themeSettings, type ThemeSettings } from './settings';
const disposals: Array<() => void> = [];
afterEach(() => {
	for (const dispose of disposals.splice(0).reverse()) dispose();
});
function fixture(initial: Partial<ThemeSettings>, docs: Document[] = []) {
	let value = { ...themeSettings.defaults(), ...initial };
	const listeners = new Set<() => void>();
	const events = new Map<string, (arg: { doc: Document }) => void>();
	const plugin = {
		app: {
			workspace: {
				on: (name: string, fn: (arg: { doc: Document }) => void) => {
					events.set(name, fn);
					return {};
				},
				iterateAllLeaves: (visit: (leaf: { view: { containerEl: { ownerDocument: Document } } }) => void) => {
					docs.forEach((doc) => visit({ view: { containerEl: { ownerDocument: doc } } }));
				},
			},
		},
		registerEvent: () => {},
		register: (dispose: () => void) => disposals.push(dispose),
	} as unknown as Plugin;
	const handle = {
		get: () => value,
		subscribe: (fn: () => void) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
	};
	new ThemeRuntime(handle as never).attach(plugin);
	return {
		set(patch: Partial<ThemeSettings>) {
			value = { ...value, ...patch };
			listeners.forEach((fn) => fn());
		},
		fire(name: string, doc = document) {
			events.get(name)?.({ doc });
		},
	};
}
function mount(doc = document) {
	const root = doc.createElement('div');
	root.className = 'huhu-ui';
	doc.body.append(root);
	disposals.push(() => root.remove());
	return root;
}
test('settings reach existing and new roots/portals in both documents and detach cleans each root', async () => {
	const root = mount();
	const other = document.implementation.createHTMLDocument();
	const portal = mount(other);
	portal.classList.add('huhu-portal-root');
	const f = fixture({ editor: 'github' }, [other]);
	expect(root.dataset.theme).toBe('paper');
	expect(portal.dataset.theme).toBe('paper');
	f.set({ preset: 'ink', accent: 'plum', density: 'comfortable', uiSize: '15', motion: 'reduce' });
	for (const el of [root, portal])
		expect({ ...el.dataset }).toMatchObject({
			theme: 'ink',
			accent: 'plum',
			density: 'comfortable',
			uiSize: '15',
			motion: 'reduce',
			source: 'huhu',
		});
	const later = mount();
	await Promise.resolve();
	await Promise.resolve();
	expect(later.dataset.accent).toBe('plum');
	expect(document.body.classList.contains('huhu-editor--github')).toBe(true);
	expect(document.body.style.getPropertyValue('--background-primary')).toBe('');
	f.fire('window-close', other);
	expect(portal.hasAttribute('data-theme')).toBe(false);
	f.set({ accent: 'teal' });
	expect(portal.hasAttribute('data-accent')).toBe(false);
	f.fire('window-open', other);
	expect(portal.dataset.accent).toBe('teal');
	for (const dispose of disposals.splice(0).reverse()) dispose();
	expect(root.hasAttribute('data-theme')).toBe(false);
	expect(portal.hasAttribute('data-theme')).toBe(false);
	expect(document.body.classList.contains('huhu-editor--github')).toBe(false);
});
test('system mode follows each document and preserves its explicit editor appearance', () => {
	const root = mount();
	const f = fixture({ editor: 'suliworld', fontText: 'serif' });
	document.body.classList.add('theme-dark');
	disposals.push(() => document.body.classList.remove('theme-dark'));
	f.fire('css-change');
	expect(root.dataset.theme).toBe('ink');
	expect(document.body.classList.contains('huhu-editor--suliworld')).toBe(true);
	f.set({ preset: 'paper' });
	expect(root.dataset.theme).toBe('paper');
	expect(document.body.classList.contains('huhu-font-text--serif')).toBe(true);
});
test('unsafe host foreground/background pairs fall back together without changing host variables', () => {
	const root = mount();
	const style = document.createElement('style');
	style.textContent = readFileSync('src/ui/styles/tokens.css', 'utf8');
	document.head.append(style);
	disposals.push(() => style.remove());
	const host = document.body.style;
	const old = host.cssText;
	disposals.push(() => {
		host.cssText = old;
	});
	for (const name of [
		'background-primary',
		'background-secondary',
		'background-secondary-alt',
		'text-normal',
		'text-muted',
		'interactive-accent',
		'text-on-accent',
	])
		host.setProperty(`--${name}`, '#eeeeee');
	applyInterfaceTheme(root, themeSettings.normalize({ source: 'obsidian' }));
	expect(root.dataset.source).toBe('obsidian');
	expect(root.style.getPropertyValue('--hu-surface')).toBe('');
	expect(root.style.getPropertyValue('--hu-fg')).toBe('');
	expect(host.getPropertyValue('--background-primary')).toBe('#eeeeee');
});
test('readable host colors map to HUHU roots and are removed when switching back', () => {
	const root = mount();
	const style = document.createElement('style');
	style.textContent = readFileSync('src/ui/styles/tokens.css', 'utf8');
	document.head.append(style);
	disposals.push(() => style.remove());
	const host = document.body.style;
	const previous = host.cssText;
	disposals.push(() => {
		host.cssText = previous;
	});
	const colors = {
		'background-primary': '#ffffff',
		'background-secondary': '#f4f4f4',
		'background-secondary-alt': '#eeeeee',
		'background-modifier-border': '#d0d0d0',
		'background-modifier-border-hover': '#aaaaaa',
		'text-normal': '#111111',
		'text-muted': '#444444',
		'interactive-accent': '#24575a',
		'text-on-accent': '#ffffff',
		'text-accent': '#22585b',
	};
	for (const [name, value] of Object.entries(colors)) host.setProperty(`--${name}`, value);
	applyInterfaceTheme(root, themeSettings.normalize({ source: 'obsidian' }));
	expect(root.style.getPropertyValue('--hu-surface')).toBe('#ffffff');
	expect(root.style.getPropertyValue('--hu-fg')).toBe('#111111');
	expect(root.style.getPropertyValue('--hu-accent')).toBe('#24575a');
	applyInterfaceTheme(root, themeSettings.defaults());
	expect(root.style.getPropertyValue('--hu-surface')).toBe('');
	expect(root.style.getPropertyValue('--hu-fg')).toBe('');
});

test('host accent text is rejected against the actual selected soft background as an entire pair group', () => {
	const root = mount();
	const style = document.createElement('style');
	style.textContent = readFileSync('src/ui/styles/tokens.css', 'utf8');
	document.head.append(style);
	disposals.push(() => style.remove());
	const host = document.body.style;
	const previous = host.cssText;
	disposals.push(() => {
		host.cssText = previous;
	});
	for (const name of ['background-primary', 'background-secondary', 'background-secondary-alt'])
		host.setProperty(`--${name}`, '#ffffff');
	for (const [name, value] of Object.entries({
		'text-normal': '#111111',
		'text-muted': '#444444',
		'interactive-accent': '#24575a',
		'text-on-accent': '#ffffff',
		'text-accent': '#767676',
	}))
		host.setProperty(`--${name}`, value);
	applyInterfaceTheme(root, themeSettings.normalize({ source: 'obsidian', preset: 'paper' }));
	expect(root.style.getPropertyValue('--hu-accent-text')).toBe('');
	expect(root.style.getPropertyValue('--hu-surface')).toBe('');
});


test('custom editor colors follow each document mode, preserve interface colors and clean up on change and detach', () => {
 const root = mount();
 const other = document.implementation.createHTMLDocument();
 other.body.classList.add('theme-dark');
 const otherRoot = mount(other);
 const originalHost = document.body.style.getPropertyValue('--background-primary');
 const custom = {
  light: { background: '#faf9f6', foreground: '#20201c', primary: '#315c55', border: '#dad7ce', sidebar: '#efece4' },
  dark: { background: '#17191b', foreground: '#ededed', primary: '#70b7af', border: '#383d40', sidebar: '#202426' },
 };
 const f = fixture({ editor: 'custom', custom }, [other]);
 expect(document.body.style.getPropertyValue('--ne-preview-bg')).toBe(custom.light.background);
 expect(other.body.style.getPropertyValue('--ne-preview-bg')).toBe(custom.dark.background);
 expect(document.body.style.getPropertyValue('--background-primary')).toBe(originalHost);
 expect(root.style.getPropertyValue('--hu-surface')).toBe('');
 expect(root.dataset.theme).toBe('paper');
 expect(otherRoot.dataset.theme).toBe('ink');
 f.set({ preset: 'ink' });
 expect(document.body.style.getPropertyValue('--ne-preview-bg')).toBe(custom.light.background);
 f.set({ editor: 'follow' });
 expect(document.body.style.getPropertyValue('--ne-preview-bg')).toBe('');
 expect(other.body.style.getPropertyValue('--ne-link')).toBe('');
 f.set({ editor: 'custom' });
 f.fire('window-close', other);
 expect(other.body.style.getPropertyValue('--ne-preview-bg')).toBe('');
 expect(other.body.classList.contains('huhu-editor--custom')).toBe(false);
 for (const dispose of disposals.splice(0).reverse()) dispose();
 expect(document.body.style.getPropertyValue('--ne-preview-bg')).toBe('');
 expect(document.body.style.getPropertyValue('--ne-link')).toBe('');
 expect(document.body.style.getPropertyValue('--background-primary')).toBe(originalHost);
});
