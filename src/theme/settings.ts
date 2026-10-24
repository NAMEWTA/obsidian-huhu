import { defineSettings, f } from '../shared/settings/schema';
import { CUSTOM_TOKEN_NAMES, DEFAULT_CUSTOM, deriveCustomTokens, normalizeCustom, type CustomTheme } from './custom';

/** Interface themes. `default` follows Obsidian untouched; `custom` derives from five user colours. */
export const THEME_PRESETS = [
	'default', 'pearl', 'soft', 'graphite', 'cobalt', 'sage', 'amber', 'blush',
	'vscode', 'idea', 'xcode', 'jetbrains', 'cursor', 'claude-code', 'eye-care', 'custom', 'suliworld',
] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];
/** Curated entry points. The remaining IDs stay valid as additional palettes, including old saved selections. */
export const CYCLE_THEME_PRESETS: readonly ThemePreset[] = ['default', 'suliworld', 'pearl', 'claude-code', 'eye-care', 'custom'];
export const ADDITIONAL_THEME_PRESETS = THEME_PRESETS.filter((id) => !CYCLE_THEME_PRESETS.includes(id));
/** Themes whose colours live in presets.css (each has a light and a dark palette). */
export const PALETTE_THEMES = THEME_PRESETS.filter((id) => id !== 'default' && id !== 'custom');

/** Editor (Markdown) colour schemes; `follow` takes the colours of the interface theme. */
export const EDITOR_SCHEMES = ['follow', 'github', 'one', 'solarized', 'nord', 'dracula', 'gruvbox', 'claude-code', 'eye-care', 'suliworld'] as const;
export type EditorScheme = (typeof EDITOR_SCHEMES)[number];
export const FEATURED_EDITOR_SCHEMES: readonly EditorScheme[] = ['follow', 'suliworld', 'github', 'claude-code', 'eye-care'];
export const ADDITIONAL_EDITOR_SCHEMES = EDITOR_SCHEMES.filter((id) => !FEATURED_EDITOR_SCHEMES.includes(id));
export const PALETTE_SCHEMES = EDITOR_SCHEMES.filter((id) => id !== 'follow');
export const SULIWORLD_VARIANTS = ['cream', 'forest'] as const;
export const SULIWORLD_CARDS = ['dark', 'always', 'never'] as const;

export const HEADING_STYLES = ['scheme', 'accented', 'plain'] as const;
export const EMPHASIS_STYLES = ['scheme', 'highlight', 'plain'] as const;

export const INTERFACE_FONTS = ['default', 'host', 'geist', 'inter', 'system', 'custom'] as const;
export const TEXT_FONTS = ['default', 'sans', 'serif', 'kai', 'custom'] as const;
export const MONO_FONTS = ['default', 'jetbrains', 'fira', 'cascadia', 'sfmono', 'custom'] as const;
export const FONT_SIZE_RANGE = { min: 12, max: 24 } as const;

/** A user-typed font-family list: letters, digits, spaces, commas, quotes, dots and hyphens only. */
export function normalizeFontFamily(value: unknown): string {
	return typeof value === 'string' ? value.replace(/[^\p{L}\p{N}\s,'".\-_]/gu, '').trim().slice(0, 200) : '';
}

/** Reading size in px; 0 keeps Obsidian's. */
function normalizeFontSize(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
	return Math.max(FONT_SIZE_RANGE.min, Math.min(FONT_SIZE_RANGE.max, Math.round(value)));
}

/** Settings namespace `theme`: the global look applied to Obsidian, Markdown and HUHU. */
export const themeSettings = defineSettings({
	preset: f.enum(THEME_PRESETS, { default: 'default' }),
	custom: f.custom<CustomTheme>({ default: DEFAULT_CUSTOM, normalize: normalizeCustom }),
	editor: f.enum(EDITOR_SCHEMES, { default: 'follow' }),
	headings: f.enum(HEADING_STYLES, { default: 'scheme' }),
	emphasis: f.enum(EMPHASIS_STYLES, { default: 'scheme' }),
	suliworldVariant: f.enum(SULIWORLD_VARIANTS, { default: 'cream' }),
	suliworldCards: f.enum(SULIWORLD_CARDS, { default: 'dark' }),
	suliworldPlainQuotes: f.boolean({ default: false }),
	suliworldPlainEmbeds: f.boolean({ default: false }),
	fontInterface: f.enum(INTERFACE_FONTS, { default: 'default' }),
	fontInterfaceCustom: f.custom({ default: '', normalize: normalizeFontFamily }),
	fontText: f.enum(TEXT_FONTS, { default: 'default' }),
	fontTextCustom: f.custom({ default: '', normalize: normalizeFontFamily }),
	fontMono: f.enum(MONO_FONTS, { default: 'default' }),
	fontMonoCustom: f.custom({ default: '', normalize: normalizeFontFamily }),
	/** Reading and editing text size in px; 0 keeps Obsidian's. */
	fontSize: f.custom({ default: 0, normalize: normalizeFontSize }),
	/** Reading line height; 0 keeps the theme's value. */
	lineHeight: f.number({ default: 0, min: 0, max: 2.2 }),
});
export type ThemeSettings = ReturnType<typeof themeSettings.defaults>;

/** Heading and bold decoration each scheme uses while the user leaves them on "scheme". */
const SCHEME_STYLES: Partial<Record<string, { headings: 'accented' | 'plain' | 'github' | 'suliworld'; emphasis: 'highlight' | 'plain' }>> = {
	'claude-code': { headings: 'accented', emphasis: 'plain' },
	'eye-care': { headings: 'plain', emphasis: 'highlight' },
	github: { headings: 'github', emphasis: 'plain' },
	suliworld: { headings: 'suliworld', emphasis: 'plain' },
};

export interface ResolvedTheme {
	preset: ThemePreset;
	custom: CustomTheme;
	editor: EditorScheme;
	/** The resolved palette, without overwriting the persisted follow/explicit choice. */
	effectiveEditor: EditorScheme;
	editorStructure: 'host' | 'plain' | 'github' | 'suliworld';
	headings: 'accented' | 'plain' | 'github' | 'suliworld';
	emphasis: 'highlight' | 'plain';
	suliworld: { variant: ThemeSettings['suliworldVariant']; cards: ThemeSettings['suliworldCards']; plainQuotes: boolean; plainEmbeds: boolean };
	fonts: { interface: string; interfaceCustom: string; text: string; textCustom: string; mono: string; monoCustom: string };
	fontSize: number;
	lineHeight: number;
}

export function resolveTheme(settings: ThemeSettings): ResolvedTheme {
	const styleKey = settings.editor === 'follow' ? settings.preset : settings.editor;
	const defaults = SCHEME_STYLES[styleKey] ?? { headings: 'plain', emphasis: 'plain' };
	const effectiveEditor = settings.editor === 'follow' && settings.preset === 'suliworld' ? 'suliworld' : settings.editor;
	const editorStructure = effectiveEditor === 'suliworld' || effectiveEditor === 'github' ? effectiveEditor : settings.preset === 'default' && effectiveEditor === 'follow' ? 'host' : 'plain';
	return {
		preset: settings.preset,
		custom: settings.custom,
		editor: settings.editor,
		effectiveEditor,
		editorStructure,
		headings: settings.headings === 'scheme' ? defaults.headings : settings.headings,
		emphasis: settings.emphasis === 'scheme' ? defaults.emphasis : settings.emphasis,
		suliworld: { variant: settings.suliworldVariant, cards: settings.suliworldCards, plainQuotes: settings.suliworldPlainQuotes, plainEmbeds: settings.suliworldPlainEmbeds },
		fonts: {
			interface: settings.fontInterface === 'default' && settings.preset === 'suliworld' ? 'suliworld' : settings.fontInterface, interfaceCustom: settings.fontInterfaceCustom,
			text: settings.fontText === 'default' && effectiveEditor === 'suliworld' ? 'suliworld' : settings.fontText, textCustom: settings.fontTextCustom,
			mono: settings.fontMono === 'default' && effectiveEditor === 'suliworld' ? 'suliworld' : settings.fontMono, monoCustom: settings.fontMonoCustom,
		},
		fontSize: settings.fontSize,
		lineHeight: settings.lineHeight,
	};
}

/** Reset only the active styles' decorations. Personal typography and inactive style preferences are retained. */
export function resetCurrentStyle(settings: ThemeSettings): ThemeSettings {
	const next = { ...settings, headings: 'scheme' as const, emphasis: 'scheme' as const };
	if (settings.preset === 'suliworld') Object.assign(next, { suliworldVariant: 'cream', suliworldCards: 'dark' });
	if (resolveTheme(settings).effectiveEditor === 'suliworld') Object.assign(next, { suliworldPlainQuotes: false, suliworldPlainEmbeds: false });
	return next;
}

/** Body classes and inline CSS variables for a resolved theme in one Obsidian mode. All defaults produce none. */
export function themeBodyState(theme: ResolvedTheme, mode: 'light' | 'dark'): { classes: string[]; vars: Record<string, string> } {
	const classes: string[] = [];
	const vars: Record<string, string> = {};
	if (theme.preset !== 'default') classes.push('huhu-themed', `huhu-theme--${theme.preset}`);
	// Custom colours are the one place a value is user data, so they are set as variables (the classes only say "custom").
	if (theme.preset === 'custom') Object.assign(vars, deriveCustomTokens(theme.custom[mode], mode));
	if (theme.effectiveEditor !== 'follow') classes.push('huhu-editor-themed', `huhu-editor--${theme.effectiveEditor}`);
	if (theme.editorStructure === 'suliworld' || theme.editorStructure === 'github') classes.push(`huhu-md-style--${theme.editorStructure}`);
	if (theme.headings !== 'plain') classes.push(`huhu-md-headings--${theme.headings}`);
	if (theme.emphasis === 'highlight') classes.push('huhu-md-emphasis--highlight');
	if (theme.preset === 'suliworld') {
		classes.push(`huhu-theme-variant--${theme.suliworld.variant}`);
		if (theme.suliworld.cards === 'always' || (theme.suliworld.cards === 'dark' && mode === 'dark')) classes.push('huhu-theme-cards');
	}
	if (theme.effectiveEditor === 'suliworld') {
		if (theme.suliworld.plainQuotes) classes.push('huhu-md-quotes--plain');
		if (theme.suliworld.plainEmbeds) classes.push('huhu-md-embeds--plain');
	}
	const font = (kind: 'interface' | 'text' | 'mono', id: string, custom: string) => {
		if (id === 'default') return;
		if (id === 'custom') {
			if (!custom) return;
			vars[`--huhu-user-font-${kind}`] = custom;
		}
		classes.push(`huhu-font-${kind}--${id}`);
	};
	font('interface', theme.fonts.interface, theme.fonts.interfaceCustom);
	font('text', theme.fonts.text, theme.fonts.textCustom);
	font('mono', theme.fonts.mono, theme.fonts.monoCustom);
	if (theme.fontSize > 0) {
		classes.push('huhu-theme-font-size');
		vars['--huhu-user-font-size'] = `${theme.fontSize}px`;
	}
	if (theme.lineHeight > 0) {
		classes.push('huhu-theme-line-height');
		vars['--huhu-user-line-height'] = String(theme.lineHeight);
	}
	return { classes, vars };
}

/** Every body class prefix and variable the runtime may set (used to clean up). */
export const THEME_CLASS_PREFIXES = ['huhu-themed', 'huhu-theme--', 'huhu-theme-', 'huhu-editor-themed', 'huhu-editor--', 'huhu-md-', 'huhu-font-'];
export const THEME_VARS = [
	...CUSTOM_TOKEN_NAMES,
	'--huhu-user-font-interface', '--huhu-user-font-text', '--huhu-user-font-mono', '--huhu-user-font-size', '--huhu-user-line-height',
];
