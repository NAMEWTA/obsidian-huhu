import type { CommentThread, HighlightColorId } from './model';

export interface CustomHighlightColor { id: `custom-${string}`; name: string; hex: string }
export interface HighlightPalette { customColors: readonly CustomHighlightColor[] }
export const HIGHLIGHT_PRESETS = [
	{ id: 'yellow', name: 'Yellow', hex: '#f7dc70' },
	{ id: 'pink', name: 'Pink', hex: '#ee9abc' },
	{ id: 'blue', name: 'Blue', hex: '#8ccbe7' },
	{ id: 'green', name: 'Green', hex: '#94d6a6' },
] as const;
export const SAFE_HEX = /^#[0-9a-f]{6}$/i;
export function normalizeHighlightColors(value: unknown): CustomHighlightColor[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	return value.flatMap((entry: unknown) => {
		if (!entry || typeof entry !== 'object') return [];
		const rec = entry as Record<string, unknown>;
		if (typeof rec.id !== 'string' || !/^custom-[a-z0-9]{6,16}$/i.test(rec.id)
			|| typeof rec.name !== 'string' || typeof rec.hex !== 'string'
			|| !SAFE_HEX.test(rec.hex) || seen.has(rec.id)) return [];
		seen.add(rec.id);
		return [{ id: rec.id as CustomHighlightColor['id'], name: rec.name.trim().slice(0, 60), hex: rec.hex.toLowerCase() }];
	}).slice(0, 32);
}
export function colorHex(color: HighlightColorId | undefined, palette: HighlightPalette, snapshot?: string): string {
	if (snapshot && SAFE_HEX.test(snapshot)) return snapshot;
	const preset = HIGHLIGHT_PRESETS.find(item => item.id === color);
	if (preset) return preset.hex;
	return palette.customColors.find(item => item.id === color)?.hex ?? 'var(--interactive-accent)';
}
export function threadHighlightHex(thread: CommentThread, palette: HighlightPalette): string {
	return colorHex(thread.color, palette, thread.colorHex);
}
export function colorOptions(palette: HighlightPalette) {
	return [...HIGHLIGHT_PRESETS, ...palette.customColors];
}
export function validHighlightColor(color: string, palette: HighlightPalette): color is HighlightColorId {
	return color === 'legacy' || HIGHLIGHT_PRESETS.some(item => item.id === color)
		|| palette.customColors.some(item => item.id === color);
}
