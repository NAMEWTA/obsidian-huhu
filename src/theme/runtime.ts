import type { Plugin } from 'obsidian';
import type { SettingsHandle } from '../shared/settings/store';
import { contrastRatio, mixHex } from './color';
import { THEME_CLASS_PREFIXES, THEME_VARS, resolveTheme, themeBodyState, type ThemeSettings } from './settings';

const attributes = ['theme', 'accent', 'source', 'density', 'ui-size', 'motion'] as const;
const hostTokens: Record<string, string> = {
	canvas: 'background-secondary',
	surface: 'background-primary',
	raised: 'background-primary',
	sunken: 'background-secondary-alt',
	line: 'background-modifier-border',
	'line-strong': 'background-modifier-border-hover',
	fg: 'text-normal',
	'fg-2': 'text-muted',
	'fg-3': 'text-muted',
	accent: 'interactive-accent',
	'accent-fg': 'text-on-accent',
	'accent-text': 'text-accent',
};

function hex(value: string): string | null {
	if (/^#[\da-f]{6}$/i.test(value)) return value;
	const rgb =
		/^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:\s*[,/]\s*(1(?:\.0*)?))?\s*\)$/i.exec(
			value,
		);
	return rgb
		? `#${rgb
				.slice(1, 4)
				.map((channel) => Math.round(Number(channel)).toString(16).padStart(2, '0'))
				.join('')}`
		: null;
}

function composite(value: string, background: string): string | null {
	const solid = hex(value);
	if (solid) return solid;
	const rgba =
		/^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d*\.?\d+))\s*\)$/i.exec(
			value,
		);
	if (!rgba) return null;
	const foreground = `#${rgba
		.slice(1, 4)
		.map((channel) => Math.round(Number(channel)).toString(16).padStart(2, '0'))
		.join('')}`;
	return mixHex(background, foreground, Number(rgba[4]));
}

/** Applies one document's settings to a HUHU root. Unsafe host palettes fall back as a complete foreground/background group. */
export function applyInterfaceTheme(root: HTMLElement, settings: ThemeSettings): void {
	const doc = root.ownerDocument;
	root.style.removeProperty('--hu-font-ui');
	const font = settings.fontInterface;
	const fonts: Record<string, string> = {
		geist: '"Geist", sans-serif',
		inter: '"Inter", sans-serif',
		system: 'system-ui, sans-serif',
		host: 'var(--font-interface)',
		custom: settings.fontInterfaceCustom,
	};
	if (font !== 'default' && fonts[font]) root.style.setProperty('--hu-font-ui', fonts[font]);
	const theme =
		settings.preset === 'system' ? (doc.body.classList.contains('theme-dark') ? 'ink' : 'paper') : settings.preset;
	const values = [theme, settings.accent, settings.source, settings.density, settings.uiSize, settings.motion];
	attributes.forEach((name, index) => root.setAttribute(`data-${name}`, values[index] ?? ''));
	for (const name of Object.keys(hostTokens)) root.style.removeProperty(`--hu-${name}`);
	if (settings.source !== 'obsidian') return;
	const win = doc.defaultView;
	if (!win) return;
	const host = win.getComputedStyle(doc.body);
	const safe = win.getComputedStyle(root);
	const mapped: Record<string, string> = {};
	for (const [name, variable] of Object.entries(hostTokens)) {
		const value = hex(host.getPropertyValue(`--${variable}`).trim());
		if (value) mapped[name] = value;
	}
	const color = (name: string) => mapped[name] ?? hex(safe.getPropertyValue(`--hu-${name}`).trim());
	const surfaces = ['canvas', 'surface', 'raised', 'sunken'];
	// One failed pair invalidates the whole surface/text group: changing just the text can break another surface.
	const pairs: Array<[string, string, number]> = surfaces.flatMap(
		(background) =>
			[
				['fg', background, 7],
				['fg-2', background, 4.5],
				['fg-3', background, 4.5],
				['control-line', background, 3],
				['accent', background, 3],
				['accent-text', background, 4.5],
				...['success', 'warning', 'danger', 'info'].map(
					(name) => [name, background, 4.5] as [string, string, number],
				),
			] as Array<[string, string, number]>,
	);
	pairs.push(['accent-fg', 'accent', 4.5]);
	const soft = safe.getPropertyValue('--hu-accent-soft').trim();
	const accentText = color('accent-text');
	if (
		surfaces.some((name) => {
			const background = color(name);
			const actual = background && composite(soft, background);
			return !accentText || !actual || contrastRatio(accentText, actual) < 4.5;
		})
	)
		return;
	if (
		pairs.some(([fg, bg, minimum]) => {
			const a = color(fg),
				b = color(bg);
			return !a || !b || contrastRatio(a, b) < minimum;
		})
	)
		return;
	for (const [name, value] of Object.entries(mapped)) root.style.setProperty(`--hu-${name}`, value);
}

/** Owns main/popout roots, including portals inserted after attach; detach restores host editor styling. */
export class ThemeRuntime {
	private readonly documents = new Map<Document, MutationObserver | null>();
	constructor(private readonly handle: SettingsHandle<ThemeSettings>) {}
	attach(plugin: Plugin): void {
		this.add(document);
		plugin.app.workspace.iterateAllLeaves((leaf) => this.add(leaf.view.containerEl.ownerDocument));
		plugin.registerEvent(plugin.app.workspace.on('window-open', (win) => this.add(win.doc)));
		plugin.registerEvent(plugin.app.workspace.on('window-close', (win) => this.remove(win.doc)));
		plugin.registerEvent(plugin.app.workspace.on('css-change', () => this.applyAll()));
		plugin.register(this.handle.subscribe(() => this.applyAll()));
		plugin.register(() => {
			for (const doc of [...this.documents.keys()]) this.remove(doc);
		});
	}
	private add(doc: Document): void {
		if (this.documents.has(doc)) return;
		const Observer = doc.defaultView?.MutationObserver;
		const observer = Observer ? new Observer(() => this.applyRoots(doc)) : null;
		this.documents.set(doc, observer);
		observer?.observe(doc.body, { childList: true, subtree: true });
		this.apply(doc);
	}
	private applyRoots(doc: Document): void {
		for (const root of doc.querySelectorAll<HTMLElement>('.huhu-ui')) applyInterfaceTheme(root, this.handle.get());
	}
	private apply(doc: Document): void {
		clearEditor(doc.body);
		const state = themeBodyState(
			resolveTheme(this.handle.get()),
			doc.body.classList.contains('theme-dark') ? 'dark' : 'light',
		);
		doc.body.classList.add(...state.classes);
		for (const [name, value] of Object.entries(state.vars)) doc.body.style.setProperty(name, value);
		this.applyRoots(doc);
	}
	private applyAll(): void {
		for (const doc of this.documents.keys()) this.apply(doc);
	}
	private remove(doc: Document): void {
		this.documents.get(doc)?.disconnect();
		this.documents.delete(doc);
		clearEditor(doc.body);
		for (const root of doc.querySelectorAll<HTMLElement>('.huhu-ui')) {
			for (const name of attributes) root.removeAttribute(`data-${name}`);
			root.style.removeProperty('--hu-font-ui');
			for (const name of Object.keys(hostTokens)) root.style.removeProperty(`--hu-${name}`);
		}
	}
}
function clearEditor(body: HTMLElement): void {
	for (const name of Array.from(body.classList))
		if (THEME_CLASS_PREFIXES.some((prefix) => name.startsWith(prefix))) body.classList.remove(name);
	for (const name of THEME_VARS) body.style.removeProperty(name);
}
