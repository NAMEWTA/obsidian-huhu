import { expect, test } from 'vitest';
import { themeSettings } from '../../theme/settings';
import { EXPORT_KIND, EXPORT_VERSION, parseExport } from './appearance';

const envelope = (settings: unknown, version: unknown = EXPORT_VERSION) =>
	JSON.stringify({ kind: EXPORT_KIND, version, settings });

test('obsolete version 1 is rejected even for valid current settings', () => {
	expect(parseExport(envelope(themeSettings.defaults(), 1))).toBeNull();
});

test('version 2 round-trips SuliWorld variants, independent editor and all overrides', () => {
	const settings = themeSettings.normalize({
		preset: 'ink',
		editor: 'github',
		suliworldVariant: 'forest',
		suliworldCards: 'never',
		suliworldPlainQuotes: true,
		suliworldPlainEmbeds: true,
		fontInterface: 'host',
		fontMono: 'fira',
	});
	expect(parseExport(envelope(settings))).toEqual(settings);
});

test('unknown versions and style IDs are rejected before normalizing an import', () => {
	for (const version of [undefined, 0, 3, '2', null])
		expect(parseExport(JSON.stringify({ kind: EXPORT_KIND, version, settings: { preset: 'pearl' } }))).toBeNull();
	for (const settings of [[], null, 'theme', { preset: 'removed-theme' }, { editor: 'unknown-editor' }])
		expect(parseExport(envelope(settings))).toBeNull();
	for (const text of ['not json', '[]', '{}', JSON.stringify({ kind: 'another-plugin', version: 2, settings: {} })])
		expect(parseExport(text)).toBeNull();
});
