import assert from 'node:assert/strict';
import { test } from 'vitest';
import { resolveTheme, themeBodyState, themeSettings, THEME_PRESETS, EDITOR_SCHEMES, CYCLE_THEME_PRESETS, ADDITIONAL_THEME_PRESETS, FEATURED_EDITOR_SCHEMES, ADDITIONAL_EDITOR_SCHEMES, resetCurrentStyle } from './settings';

const state = (patch: object = {}, mode: 'light' | 'dark' = 'light') =>
	themeBodyState(resolveTheme({ ...themeSettings.defaults(), ...patch }), mode);

test('the defaults touch nothing', () => {
	assert.deepEqual(state(), { classes: [], vars: {} });
});

test('a palette theme is one pair of body classes and no inline variables', () => {
	assert.deepEqual(state({ preset: 'soft' }), { classes: ['huhu-themed', 'huhu-theme--soft'], vars: {} });
});

test('the editor scheme is independent of the interface theme', () => {
	assert.deepEqual(state({ editor: 'github' }).classes, ['huhu-editor-themed', 'huhu-editor--github', 'huhu-md-style--github', 'huhu-md-headings--github']);
	assert.deepEqual(state({ preset: 'cobalt', editor: 'nord' }).classes, ['huhu-themed', 'huhu-theme--cobalt', 'huhu-editor-themed', 'huhu-editor--nord']);
});

test('Claude Code and Eye care bring their Markdown decoration unless the user picks one', () => {
	assert.ok(state({ editor: 'claude-code' }).classes.includes('huhu-md-headings--accented'));
	assert.ok(state({ preset: 'claude-code' }).classes.includes('huhu-md-headings--accented'));
	assert.ok(state({ editor: 'eye-care' }).classes.includes('huhu-md-emphasis--highlight'));
	const plain = state({ editor: 'claude-code', headings: 'plain', emphasis: 'highlight' }).classes;
	assert.ok(!plain.includes('huhu-md-headings--accented') && plain.includes('huhu-md-emphasis--highlight'));
	// A scheme other than the theme's own does not inherit the theme's decoration.
	assert.ok(!state({ preset: 'claude-code', editor: 'github' }).classes.includes('huhu-md-headings--accented'));
});

test('custom colours become variables for the current mode only', () => {
	const settings = themeSettings.normalize({ preset: 'custom', custom: { light: { background: '#FFEEDD' }, dark: { background: '#101010' } } });
	const light = state(settings, 'light');
	const dark = state(settings, 'dark');
	assert.deepEqual(light.classes, ['huhu-themed', 'huhu-theme--custom']);
	assert.equal(light.vars['--nt-background'], '#ffeedd');
	assert.equal(dark.vars['--nt-background'], '#101010');
});

test('fonts: presets are classes, custom lists are variables, unsafe characters are dropped', () => {
	const settings = themeSettings.normalize({ fontInterface: 'inter', fontText: 'custom', fontTextCustom: 'Lora; } body { x: url(1)', fontMono: 'custom', fontMonoCustom: '' });
	assert.equal(settings.fontTextCustom, 'Lora  body  x url1');
	const body = state(settings);
	assert.deepEqual(body.classes, ['huhu-font-interface--inter', 'huhu-font-text--custom']);
	assert.ok(!/[;{}()]/.test(body.vars['--huhu-user-font-text']!));
});

test('font size and line height become classes plus variables; invalid values are dropped', () => {
	const settings = themeSettings.normalize({ fontSize: 99, lineHeight: 9, preset: 'nope', editor: 7 });
	assert.equal(settings.fontSize, 24);
	assert.equal(settings.lineHeight, 2.2);
	assert.equal(settings.preset, 'default');
	assert.equal(settings.editor, 'follow');
	const body = state(settings);
	assert.deepEqual(body.vars, { '--huhu-user-font-size': '24px', '--huhu-user-line-height': '2.2' });
	assert.equal(themeSettings.normalize({ fontSize: 3 }).fontSize, 12);
	assert.equal(themeSettings.normalize({ fontSize: 0 }).fontSize, 0);
});

test('every theme and scheme id is listed once', () => {
	assert.equal(new Set(THEME_PRESETS).size, THEME_PRESETS.length);
	assert.equal(new Set(EDITOR_SCHEMES).size, EDITOR_SCHEMES.length);
});

test('SuliWorld follows the interface only while the editor is on follow, preserving explicit choices', () => {
	const settings = themeSettings.normalize({ preset: 'suliworld', suliworldVariant: 'forest', fontText: 'kai', headings: 'plain', emphasis: 'highlight' });
	const resolved = resolveTheme(settings);
	assert.equal(resolved.effectiveEditor, 'suliworld');
	assert.equal(resolved.editorStructure, 'suliworld');
	assert.equal(resolved.fonts.text, 'kai');
	assert.equal(resolved.fonts.interface, 'suliworld');
	assert.equal(resolved.fonts.mono, 'suliworld');
	const classes = state(settings).classes;
	assert.ok(classes.includes('huhu-theme-variant--forest'));
	assert.ok(classes.includes('huhu-md-style--suliworld'));
	assert.ok(!classes.includes('huhu-md-headings--suliworld'));
	assert.ok(classes.includes('huhu-md-emphasis--highlight'));
	assert.equal(settings.editor, 'follow');
	assert.equal(settings.fontMono, 'default');
	const independent = resolveTheme({ ...settings, editor: 'github' });
	assert.equal(independent.effectiveEditor, 'github');
	assert.equal(independent.editorStructure, 'github');
	assert.equal(independent.fonts.text, 'kai');
	assert.equal(independent.fonts.mono, 'default');
	assert.ok(!state({ ...settings, editor: 'github' }).classes.includes('huhu-md-style--suliworld'));
	assert.ok(state({ preset: 'default', editor: 'suliworld' }).classes.includes('huhu-md-style--suliworld'));
	assert.ok(!state({ preset: 'default', editor: 'suliworld' }).classes.includes('huhu-themed'));
});

test('floating cards default to dark and plain options are active only with the SuliWorld editor', () => {
	assert.ok(!state({ preset: 'suliworld' }, 'light').classes.includes('huhu-theme-cards'));
	assert.ok(state({ preset: 'suliworld' }, 'dark').classes.includes('huhu-theme-cards'));
	assert.ok(state({ preset: 'suliworld', suliworldCards: 'always' }, 'light').classes.includes('huhu-theme-cards'));
	assert.ok(!state({ preset: 'suliworld', suliworldCards: 'never' }, 'dark').classes.includes('huhu-theme-cards'));
	const options = { suliworldPlainQuotes: true, suliworldPlainEmbeds: true };
	assert.ok(state({ editor: 'suliworld', ...options }).classes.includes('huhu-md-quotes--plain'));
	assert.ok(state({ editor: 'suliworld', ...options }).classes.includes('huhu-md-embeds--plain'));
	assert.ok(!state({ editor: 'github', ...options }).classes.includes('huhu-md-quotes--plain'));
	assert.ok(!state({ preset: 'default', suliworldCards: 'always' }, 'dark').classes.includes('huhu-theme-cards'));
});

test('reset current style preserves fonts, selected styles and inactive SuliWorld options', () => {
	const settings = themeSettings.normalize({ preset: 'suliworld', editor: 'github', fontInterface: 'custom', fontInterfaceCustom: 'Inter', fontText: 'kai', fontMono: 'fira', fontSize: 18, lineHeight: 1.8, headings: 'accented', emphasis: 'highlight', suliworldVariant: 'forest', suliworldCards: 'always', suliworldPlainQuotes: true });
	const reset = resetCurrentStyle(settings);
	assert.deepEqual(reset, { ...settings, headings: 'scheme', emphasis: 'scheme', suliworldVariant: 'cream', suliworldCards: 'dark' });
	assert.equal(reset.suliworldPlainQuotes, true);
	const editorOnly = { ...settings, preset: 'pearl' as const, editor: 'suliworld' as const };
	assert.deepEqual(resetCurrentStyle(editorOnly), { ...editorOnly, headings: 'scheme', emphasis: 'scheme', suliworldPlainQuotes: false, suliworldPlainEmbeds: false });
	assert.equal(settings.suliworldVariant, 'forest');
});

test('curated entry points and additional palettes form a lossless partition of every stable ID', () => {
	const oldThemes = ['default', 'pearl', 'soft', 'graphite', 'cobalt', 'sage', 'amber', 'blush', 'vscode', 'idea', 'xcode', 'jetbrains', 'cursor', 'claude-code', 'eye-care', 'custom'];
	const oldEditors = ['follow', 'github', 'one', 'solarized', 'nord', 'dracula', 'gruvbox', 'claude-code', 'eye-care'];
	for (const preset of oldThemes) assert.equal(themeSettings.normalize({ preset }).preset, preset);
	for (const editor of oldEditors) assert.equal(themeSettings.normalize({ editor }).editor, editor);
	assert.deepEqual([...CYCLE_THEME_PRESETS, ...ADDITIONAL_THEME_PRESETS].sort(), [...THEME_PRESETS].sort());
	assert.deepEqual([...FEATURED_EDITOR_SCHEMES, ...ADDITIONAL_EDITOR_SCHEMES].sort(), [...EDITOR_SCHEMES].sort());
	assert.equal(CYCLE_THEME_PRESETS.length, 6);
	assert.equal(FEATURED_EDITOR_SCHEMES.length, 5);
});
