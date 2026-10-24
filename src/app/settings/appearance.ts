import { EDITOR_SCHEMES, THEME_PRESETS, themeSettings, type ThemeSettings } from '../../theme/settings';

/** The `kind` of the JSON that Settings -> Appearance copies and pastes. */
export const EXPORT_KIND = 'huhu-appearance';
export const EXPORT_VERSION = 2;

/** Appearance settings from exported JSON, or null when the text is not an export. */
export function parseExport(text: string): ThemeSettings | null {
	try {
		const value: unknown = JSON.parse(text);
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		const envelope = value as { kind?: unknown; version?: unknown; settings?: unknown };
		if (envelope.kind !== EXPORT_KIND || (envelope.version !== 1 && envelope.version !== EXPORT_VERSION)) return null;
		if (!envelope.settings || typeof envelope.settings !== 'object' || Array.isArray(envelope.settings)) return null;
		const settings = envelope.settings as Record<string, unknown>;
		// A newer/unknown choice must not silently reset a user's appearance during paste.
		if (settings.preset !== undefined && !THEME_PRESETS.includes(settings.preset as ThemeSettings['preset'])) return null;
		if (settings.editor !== undefined && !EDITOR_SCHEMES.includes(settings.editor as ThemeSettings['editor'])) return null;
		// Version 1 uses the same stable IDs. Missing style fields obtain their defaults; personal overrides survive.
		return themeSettings.normalize(settings);
	} catch {
		return null;
	}
}
