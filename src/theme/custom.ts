/** Explicit saved appearance colors remain validated user data; interface palettes live in tokens.css. */
import { isHexColor, mixHex } from './color';

/** The five colours a user edits; everything else is derived. */
export interface CustomColors {
	background: string;
	foreground: string;
	primary: string;
	border: string;
	sidebar: string;
}
export interface CustomTheme {
	light: CustomColors;
	dark: CustomColors;
}
export const CUSTOM_COLOR_KEYS = ['background', 'foreground', 'primary', 'border', 'sidebar'] as const;
export type CustomColorKey = (typeof CUSTOM_COLOR_KEYS)[number];

export const DEFAULT_CUSTOM: CustomTheme = {
	light: { background: '#ffffff', foreground: '#0a0a0a', primary: '#171717', border: '#e5e5e5', sidebar: '#fafafa' },
	dark: { background: '#131416', foreground: '#d7d7db', primary: '#d0d0d6', border: '#3a3a3e', sidebar: '#19191c' },
};

function normalizeColors(value: unknown, fallback: CustomColors): CustomColors {
	const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	const out = { ...fallback };
	for (const key of CUSTOM_COLOR_KEYS) {
		const candidate = source[key];
		if (isHexColor(candidate)) out[key] = candidate.toLowerCase();
	}
	return out;
}

export function normalizeCustom(value: unknown): CustomTheme {
	const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	return {
		light: normalizeColors(source.light, DEFAULT_CUSTOM.light),
		dark: normalizeColors(source.dark, DEFAULT_CUSTOM.dark),
	};
}


/** Markdown-only variables; the interface continues to use its approved --hu-* palettes. */
export function customEditorVariables(colors: CustomColors): Record<string, string> {
 const { background, foreground, primary, border, sidebar } = colors;
 const muted = mixHex(foreground, background, 0.25);
 return {
  '--ne-h1': primary, '--ne-h2': primary, '--ne-h3': foreground,
  '--ne-h4': foreground, '--ne-h5': muted, '--ne-h6': muted,
  '--ne-bold': foreground, '--ne-italic': muted,
  '--ne-highlight': mixHex(background, primary, 0.2),
  '--ne-code': primary, '--ne-code-bg': sidebar,
  '--ne-link': primary, '--ne-quote': border, '--ne-quote-text': muted,
  '--ne-marker': primary, '--ne-tag': primary, '--ne-hr': border, '--ne-check': primary,
  '--ne-c-comment': muted, '--ne-c-function': primary, '--ne-c-keyword': primary,
  '--ne-c-string': foreground, '--ne-c-property': primary, '--ne-c-value': foreground,
  '--ne-c-tag': primary, '--ne-c-punct': muted, '--ne-c-important': primary,
  '--ne-preview-bg': background, '--ne-preview-fg': foreground,
 };
}
export const CUSTOM_EDITOR_VARS = Object.keys(customEditorVariables(DEFAULT_CUSTOM.light));
