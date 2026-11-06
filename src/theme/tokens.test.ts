import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { contrastRatio } from './color';

const css = readFileSync('src/ui/styles/tokens.css', 'utf8');
test('paper and ink expose the approved readable palette and six accent families', () => {
	expect(css).toContain('--hu-canvas:#F2EFE8');
	expect(css).not.toContain('--nt-');
	for (const name of ['teal', 'indigo', 'pine', 'ochre', 'plum', 'graphite'])
		expect(css).toContain(`data-accent="${name}"`);
	for (const [foreground, background, minimum] of [
		['#1D1A16', '#FBFAF7', 7],
		['#EDE9E1', '#1D1C19', 7],
		['#6B655B', '#EFEBE3', 4.5],
		['#9C958A', '#25231F', 4.5],
		['#8C8577', '#FBFAF7', 3],
		['#7A746A', '#25231F', 3],
	] as const)
		expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
});
