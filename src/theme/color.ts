/** Small sRGB helpers for the custom theme: hex parsing, mixing and WCAG contrast. */
export type Rgb = readonly [number, number, number];

const HEX = /^#[0-9a-f]{6}$/i;
export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX.test(value);

export function hexToRgb(hex: string): Rgb {
	return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as unknown as Rgb;
}

export function rgbToHex(rgb: Rgb): string {
	return `#${rgb.map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, '0')).join('')}`;
}

/** `from` moved towards `to` by `weight` (0 = from, 1 = to). */
export function mixHex(from: string, to: string, weight: number): string {
	const [a, b] = [hexToRgb(from), hexToRgb(to)];
	return rgbToHex(a.map((channel, index) => channel + (b[index]! - channel) * weight) as unknown as Rgb);
}

const linear = (channel: number) => {
	const value = channel / 255;
	return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
	const [r, g, b] = hexToRgb(hex);
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2 contrast ratio, 1..21. */
export function contrastRatio(a: string, b: string): number {
	const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (high! + 0.05) / (low! + 0.05);
}

/** White or near-black, whichever reads better on `hex`. */
export function readableTextOn(hex: string): string {
	return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#0a0a0a') ? '#ffffff' : '#0a0a0a';
}

/** Moves `hex` towards `target` in `step` increments until it meets `minimum` against every background; `target` itself when it never does. */
export function ensureContrast(hex: string, backgrounds: readonly string[], minimum: number, target: string, step = 0.05): string {
	const failing = (color: string) => backgrounds.some((background) => contrastRatio(color, background) < minimum);
	let color = hex;
	for (let attempt = 0; attempt < 40 && failing(color); attempt++) color = mixHex(color, target, step);
	return failing(color) ? target : color;
}
