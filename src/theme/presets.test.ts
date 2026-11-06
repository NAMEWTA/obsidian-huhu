import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import postcss from 'postcss';
import { contrastRatio } from './color';
import { THEME_ACCENTS } from './settings';
const css = postcss.parse(readFileSync('src/ui/styles/tokens.css', 'utf8'));
function palette(theme: 'paper' | 'ink', accent: string) {
	const values: Record<string, string> = {};
	css.walkRules((rule) => {
		const match = rule.selectors.some(
			(selector) =>
				selector === '.huhu-ui' ||
				selector === `.huhu-ui[data-theme="${theme}"]` ||
				selector === `.huhu-ui[data-accent="${accent}"]` ||
				selector === `.huhu-ui[data-theme="${theme}"][data-accent="${accent}"]`,
		);
		if (match)
			rule.walkDecls((declaration) => {
				values[declaration.prop] = declaration.value;
			});
	});
	return (name: string) => values[`--hu-${name}`]!;
}
test.each(['paper', 'ink'] as const)('%s has readable text, controls and all six primary buttons', (theme) => {
	for (const accent of THEME_ACCENTS) {
		const color = palette(theme, accent);
		for (const background of ['canvas', 'surface', 'raised', 'sunken']) {
			for (const [text, minimum] of [
				['fg', 7],
				['fg-2', 4.5],
				['fg-3', 4.5],
				['control-line', 3],
				['accent', 3],
			] as const)
				expect(
					contrastRatio(color(text), color(background)),
					`${theme}/${accent}/${text}/${background}`,
				).toBeGreaterThanOrEqual(minimum);
		}
		expect(contrastRatio(color('accent-fg'), color('accent'))).toBeGreaterThanOrEqual(4.5);
	}
});
test('replaced UI presets cannot modify the host palette', () => {
	for (const file of ['presets.css', 'suliworld-ui.css'])
		expect(readFileSync(`src/theme/styles/${file}`, 'utf8')).not.toMatch(/--nt-|body\s*[.{]/);
});
