import assert from 'node:assert/strict';
import { test } from 'vitest';
import { contrastRatio } from './color';
import { DEFAULT_CUSTOM, deriveCustomTokens, normalizeCustom } from './custom';

test('normalization keeps valid hex colours, lower-cases them and falls back per colour', () => {
	const value = normalizeCustom({ light: { background: '#ABCDEF', foreground: 'red' }, dark: 5 });
	assert.equal(value.light.background, '#abcdef');
	assert.equal(value.light.foreground, DEFAULT_CUSTOM.light.foreground);
	assert.deepEqual(value.dark, DEFAULT_CUSTOM.dark);
});

const samples = [
	['light', DEFAULT_CUSTOM.light],
	['dark', DEFAULT_CUSTOM.dark],
	['light', { background: '#fdf6e3', foreground: '#586e75', primary: '#cb4b16', border: '#d6cfb8', sidebar: '#eee8d5' }],
	['dark', { background: '#002b36', foreground: '#839496', primary: '#b58900', border: '#073642', sidebar: '#00212b' }],
	['light', { background: '#e3ebdc', foreground: '#6f7f74', primary: '#7fb08f', border: '#b9cab0', sidebar: '#d9e4d1' }],
	['dark', { background: '#101010', foreground: '#777777', primary: '#303030', border: '#202020', sidebar: '#0a0a0a' }],
] as const;

for (const [mode, colors] of samples) {
	test(`derived text stays readable (${mode}, background ${colors.background})`, () => {
		const t = deriveCustomTokens(colors, mode);
		for (const surface of ['--nt-background', '--nt-card', '--nt-sidebar']) {
			// Muted text can only be as readable as the text colour the user chose.
			const reachable = Math.min(4.5, contrastRatio(t['--nt-foreground']!, t[surface]!) - 0.01);
			assert.ok(contrastRatio(t['--nt-muted-foreground']!, t[surface]!) >= reachable, `muted on ${surface}`);
		}
		for (const surface of ['--nt-background', '--nt-sidebar']) {
			const reachable = Math.min(4.5, contrastRatio(t['--nt-foreground']!, t[surface]!) - 0.01);
			assert.ok(contrastRatio(t['--nt-link']!, t[surface]!) >= reachable, `link on ${surface}`);
		}
		assert.ok(contrastRatio(t['--nt-primary-foreground']!, t['--nt-primary']!) >= 4.5, 'text on accent');
		assert.ok(contrastRatio(t['--nt-destructive']!, t['--nt-background']!) >= 4.5, 'destructive text');
		assert.ok(contrastRatio(t['--nt-destructive-foreground']!, t['--nt-destructive']!) >= 4.5, 'text on destructive');
		for (const [name, value] of Object.entries(t)) assert.match(value, /^#[0-9a-f]{6}$/, name);
	});
}
