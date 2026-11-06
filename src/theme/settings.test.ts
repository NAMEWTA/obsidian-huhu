import { expect, test } from 'vitest';
import { resolveTheme, themeBodyState, themeSettings, resetCurrentStyle } from './settings';
const state = (patch: object = {}) => themeBodyState(resolveTheme(themeSettings.normalize(patch)), 'light');
test('new interface defaults and invalid legacy selections normalize to the approved schema', () => {
	const defaults = themeSettings.defaults();
	expect(defaults).toMatchObject({
		preset: 'system',
		source: 'huhu',
		accent: 'teal',
		density: 'compact',
		uiSize: '14',
		motion: 'system',
	});
	expect(themeSettings.normalize({ preset: 'suliworld', accent: 'pink', uiSize: '11' })).toMatchObject({
		preset: 'system',
		accent: 'teal',
		uiSize: '14',
	});
	expect(state()).toEqual({ classes: [], vars: {} });
});
test('all interface choices leave explicit editor appearance independent', () => {
	for (const preset of ['system', 'paper', 'ink']) {
		expect(state({ preset, editor: 'github' }).classes).toEqual([
			'huhu-editor-themed',
			'huhu-editor--github',
			'huhu-md-style--github',
			'huhu-md-headings--github',
		]);
		expect(state({ preset, editor: 'follow' })).toEqual({ classes: [], vars: {} });
	}
	expect(state({ editor: 'claude-code' }).classes).toContain('huhu-md-headings--accented');
	expect(state({ editor: 'eye-care' }).classes).toContain('huhu-md-emphasis--highlight');
	expect(state({ editor: 'suliworld', suliworldPlainQuotes: true, suliworldPlainEmbeds: true }).classes).toEqual(
		expect.arrayContaining(['huhu-md-style--suliworld', 'huhu-md-quotes--plain', 'huhu-md-embeds--plain']),
	);
	expect(state({ editor: 'github', suliworldPlainQuotes: true }).classes).not.toContain('huhu-md-quotes--plain');
});
test('editor font sanitization, reading size and reset retain their contracts', () => {
	const settings = themeSettings.normalize({
		editor: 'suliworld',
		headings: 'accented',
		emphasis: 'highlight',
		fontText: 'custom',
		fontTextCustom: 'Lora; } body { x: url(1)',
		fontSize: 99,
		lineHeight: 9,
		suliworldPlainQuotes: true,
	});
	expect(settings.fontTextCustom).toBe('Lora  body  x url1');
	expect(state(settings).vars).toMatchObject({
		'--huhu-user-font-text': 'Lora  body  x url1',
		'--huhu-user-font-size': '24px',
		'--huhu-user-line-height': '2.2',
	});
	expect(resetCurrentStyle(settings)).toEqual({
		...settings,
		headings: 'scheme',
		emphasis: 'scheme',
		suliworldPlainQuotes: false,
		suliworldPlainEmbeds: false,
	});
	expect(themeSettings.normalize({ fontSize: 3 }).fontSize).toBe(12);
	expect(themeSettings.normalize({ fontSize: 0 }).fontSize).toBe(0);
});


test('custom Markdown colors remain an independent editor choice and never emit an interface palette', () => {
 const settings = themeSettings.normalize({ editor: 'custom', preset: 'ink' });
 expect(settings.editor).toBe('custom');
 for (const mode of ['light', 'dark'] as const) {
  const result = themeBodyState(resolveTheme(settings), mode);
  expect(result.classes).toContain('huhu-editor--custom');
  expect(result.vars['--ne-preview-bg']).toBe(settings.custom[mode].background);
  expect(result.vars['--ne-preview-fg']).toBe(settings.custom[mode].foreground);
  expect(result.vars['--ne-link']).toBe(settings.custom[mode].primary);
  expect(Object.keys(result.vars).every((key) => key.startsWith('--ne-'))).toBe(true);
 }
 expect(state({ editor: 'follow', custom: settings.custom })).toEqual({ classes: [], vars: {} });
});
