// Custom-theme derivation, approach referenced from t8y2/dbx: five user colours expanded into surfaces and text
// shades, with contrast guarantees for muted text, links and destructive text.
import { ensureContrast, isHexColor, mixHex, readableTextOn } from './color';

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
	return { light: normalizeColors(source.light, DEFAULT_CUSTOM.light), dark: normalizeColors(source.dark, DEFAULT_CUSTOM.dark) };
}

/** The `--nt-*` tokens (see presets.css) for one mode of a custom theme. */
export function deriveCustomTokens(colors: CustomColors, mode: 'light' | 'dark'): Record<string, string> {
	const { background, foreground, primary, border, sidebar } = colors;
	const card = mixHex(background, foreground, 0.03);
	const secondary = mixHex(background, foreground, 0.06);
	const surfaces = [background, card, sidebar];
	const away = mode === 'light' ? '#000000' : '#ffffff';
	const muted = ensureContrast(mixHex(foreground, background, 0.4), surfaces, 4.5, foreground);
	const link = ensureContrast(primary, [background, sidebar], 4.5, foreground, 0.06);
	const destructive = ensureContrast(mode === 'light' ? '#dc2626' : '#f87171', surfaces, 4.5, away, 0.04);
	const primaryOn = readableTextOn(primary);
	const faint = ensureContrast(mixHex(muted, background, 0.3), [background, sidebar], 3, muted, 0.1);
	return {
		'--nt-background': background,
		'--nt-foreground': foreground,
		'--nt-card': card,
		'--nt-popover': card,
		'--nt-primary': primary,
		'--nt-primary-foreground': primaryOn,
		'--nt-secondary': secondary,
		'--nt-muted-foreground': muted,
		'--nt-accent': mixHex(background, foreground, 0.12),
		'--nt-accent-foreground': foreground,
		'--nt-destructive': destructive,
		'--nt-destructive-foreground': readableTextOn(destructive),
		'--nt-border': border,
		'--nt-input': mixHex(border, foreground, 0.12),
		'--nt-ring': primary,
		'--nt-sidebar': sidebar,
		'--nt-sidebar-accent': mixHex(sidebar, foreground, 0.07),
		'--nt-chrome': mixHex(background, foreground, 0.03),
		'--nt-chrome-muted': mixHex(background, foreground, 0.05),
		'--nt-chart-1': primary,
		'--nt-chart-2': mode === 'light' ? '#4f8f87' : '#6fbfb3',
		'--nt-chart-3': mode === 'light' ? '#b0832f' : '#d6b25e',
		'--nt-chart-4': mode === 'light' ? '#7d6fb3' : '#a799d9',
		'--nt-chart-5': mode === 'light' ? '#b8605a' : '#dc8b84',
		'--nt-faint': faint,
		'--nt-highlight': mode === 'light' ? '#facc15' : '#b8860b',
		'--nt-link': link,
	};
}

export const CUSTOM_TOKEN_NAMES = Object.keys(deriveCustomTokens(DEFAULT_CUSTOM.light, 'light'));
