import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { EDITOR_SCHEMES, PALETTE_SCHEMES } from './settings';
import { CUSTOM_EDITOR_VARS, customEditorVariables, DEFAULT_CUSTOM } from './custom';

const read = (name: string) =>
	readFileSync(new URL(`./styles/${name}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const schemes = read('editor-schemes.css');

/** Tokens declared by the rule whose selector is exactly `selector`. */
function declarations(css: string, selector: string): Record<string, string> {
	const match = new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
	assert.ok(match, `missing rule ${selector}`);
	return Object.fromEntries([...match[1]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

type Rgb = [number, number, number];
type Rgba = { rgb: Rgb; a: number };
function parse(value: string): Rgba {
	const hex = /^#([0-9a-f]{6})$/i.exec(value);
	if (hex) return { rgb: [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16)) as Rgb, a: 1 };
	const rgba = /^rgba\(([^)]+)\)$/.exec(value);
	assert.ok(rgba, `unsupported colour ${value}`);
	const [r, g, b, a] = rgba[1]!.split(',').map((part) => Number(part.trim()));
	return { rgb: [r!, g!, b!], a: a! };
}
const over = (top: Rgba, bottom: Rgb): Rgb =>
	[0, 1, 2].map((i) => top.rgb[i]! * top.a + bottom[i]! * (1 - top.a)) as Rgb;
const luminance = ([r, g, b]: Rgb) =>
	[r, g, b]
		.map((c) => c / 255)
		.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
		.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
function ratio(a: Rgb, b: Rgb): number {
	const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (high! + 0.05) / (low! + 0.05);
}
const solid = (value: string): Rgb => parse(value).rgb;

const MODES = ['light', 'dark'] as const;
// HUHU interface palettes no longer change the editor background; preserve the host reference checks.
const REFERENCE: Record<(typeof MODES)[number], Array<[string, Rgb]>> = {
	light: [['obsidian', [255, 255, 255]]],
	dark: [
		['obsidian', [30, 30, 30]],
		['minimal', [28, 28, 28]],
	],
};

const THEME_BACKGROUNDS = REFERENCE;
for (const scheme of PALETTE_SCHEMES) {
	for (const mode of MODES) {
		test(`editor scheme ${scheme} ${mode}: Markdown colours are readable on every ${mode} theme`, () => {
			const v = declarations(schemes, `.huhu-editor--${scheme}.theme-${mode}`);
			const body = [
				'bold',
				'italic',
				'code',
				'link',
				'quote-text',
				'tag',
				'c-function',
				'c-keyword',
				'c-string',
				'c-property',
				'c-value',
				'c-tag',
				'c-punct',
				'c-important',
			];
			const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
			for (const [theme, background] of THEME_BACKGROUNDS[mode]) {
				for (const token of [...body, ...headings, 'c-comment']) {
					const r = ratio(solid(v[`--ne-${token}`]!), background);
					assert.ok(r >= 4.5, `${token} on ${theme}: ${r.toFixed(2)}`);
				}
				for (const token of ['marker', 'check']) {
					const r = ratio(solid(v[`--ne-${token}`]!), background);
					assert.ok(r >= 3, `${token} on ${theme}: ${r.toFixed(2)}`);
				}
				const codeBackground = over(parse(v['--ne-code-bg']!), background);
				assert.ok(
					ratio(solid(v['--ne-code']!), codeBackground) >= 4.5,
					`inline code on its background over ${theme}`,
				);
				const highlighted = over(parse(v['--ne-highlight']!), background);
				const text = ratio(mode === 'light' ? [34, 34, 34] : [238, 238, 238], highlighted);
				assert.ok(text >= 4.5, `ordinary text on highlight over ${theme}: ${text.toFixed(2)}`);
			}
			// The swatch shows the scheme on its own page colour.
			const preview = solid(v['--ne-preview-bg']!);
			for (const token of ['h1', 'link', 'bold', 'code'])
				assert.ok(ratio(solid(v[`--ne-${token}`]!), preview) >= 4.5, `${token} on the preview`);
		});
	}
}

test('every editor scheme retains both modes and the complete token contract', () => {
	const found = [...schemes.matchAll(/(?:^|\n)\.huhu-editor--([\w-]+)\.theme-(light|dark) \{/g)].map(
		(m) => `${m[1]}.${m[2]}`,
	);
	const reference = Object.keys(declarations(schemes, '.huhu-editor--github.theme-light')).sort();
	assert.deepEqual([...CUSTOM_EDITOR_VARS].sort(), reference);
	for (const colors of Object.values(DEFAULT_CUSTOM))
		assert.deepEqual(Object.keys(customEditorVariables(colors)).sort(), reference);
	for (const scheme of PALETTE_SCHEMES)
		for (const mode of MODES) {
			assert.ok(found.includes(`${scheme}.${mode}`));
			assert.deepEqual(
				Object.keys(declarations(schemes, `.huhu-editor--${scheme}.theme-${mode}`)).sort(),
				reference,
			);
		}
	assert.deepEqual(
		PALETTE_SCHEMES,
		EDITOR_SCHEMES.filter((id) => id !== 'follow' && id !== 'custom'),
	);
});
for (const mode of MODES)
	test(`SuliWorld ${mode}: actual quote, heading-chip, tag and callout surfaces meet AA`, () => {
		const css = read('suliworld-editor.css');
		const v = declarations(css, `body.huhu-md-style--suliworld.theme-${mode}`);
		for (const tint of ['mint', 'lavender', 'peach', 'blue', 'yellow']) {
			const contrast = ratio(solid(v[`--nsw-ink-${tint}`]!), solid(v[`--nsw-tint-${tint}`]!));
			assert.ok(contrast >= 4.5, `${tint}: ${contrast.toFixed(2)}`);
		}
	});

test('SuliWorld fenced-code and green embedded-note surfaces use their own accessible foregrounds', () => {
	const css = read('suliworld-editor.css');
	const v = declarations(css, 'body.huhu-md-style--suliworld');
	for (const token of [
		'normal',
		'comment',
		'function',
		'keyword',
		'string',
		'property',
		'value',
		'punctuation',
		'important',
	]) {
		const contrast = ratio(solid(v[`--nsw-code-${token}`]!), solid(v['--nsw-pre-bg']!));
		assert.ok(contrast >= 4.5, `code ${token}: ${contrast.toFixed(2)}`);
	}
	assert.ok(ratio(solid(v['--nsw-on-green']!), solid(v['--nsw-green']!)) >= 7);
	assert.ok(ratio(solid(v['--nsw-on-green-muted']!), solid(v['--nsw-green']!)) >= 4.5);
	const embed = declarations(
		css,
		'body.huhu-md-style--suliworld:not(.huhu-md-embeds--plain) .internal-embed.markdown-embed',
	);
	assert.ok(ratio(solid(embed['--link-color']!), solid(v['--nsw-green']!)) >= 4.5);
});

for (const mode of MODES)
	test(`GitHub ${mode}: fenced syntax is readable on its real code surface`, () => {
		const css = read('github-editor.css');
		const background = solid(declarations(css, `body.huhu-md-style--github.theme-${mode}`)['--ngh-code-bg']!);
		const v = declarations(schemes, `.huhu-editor--github.theme-${mode}`);
		for (const token of [
			'code',
			'c-comment',
			'c-function',
			'c-keyword',
			'c-string',
			'c-property',
			'c-value',
			'c-tag',
			'c-punct',
			'c-important',
		]) {
			const contrast = ratio(solid(v[`--ne-${token}`]!), background);
			assert.ok(contrast >= 4.5, `${token}: ${contrast.toFixed(2)}`);
		}
	});
