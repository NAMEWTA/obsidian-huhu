import assert from 'node:assert/strict';
import { test } from 'vitest';

import { visibleProducts } from './nav.ts';
import { DEFAULT_COMMENTS_SETTINGS, normalizeCommentsSettings } from '../../modules/comments/settings.ts';
import { settingsCategories } from '../workbench/settings-categories';
import type DashboardPlugin from '../main';

const ALL_ON = {
	browser: true,
	automation: true,
	dashboard: true,
	editor: true,
	navigator: true,
	terminal: true,
	iconic: true,
	contacts: true,
	versioning: true,
	safe: true,
	huhubot: true,
};
const ALL_OFF = { browser: false, automation: false, iconic: false, contacts: false, dashboard: false, editor: false, navigator: false, terminal: false, versioning: false, safe: false, huhubot: false };

test('settings list home first, then every module that is on', () => {
	assert.deepEqual(visibleProducts(ALL_ON), ['home', 'dashboard', 'browser', 'editor', 'navigator', 'terminal', 'huhubot', 'iconic', 'contacts', 'automation', 'versioning', 'safe']);
	assert.deepEqual(visibleProducts({ ...ALL_OFF, editor: true, terminal: true }), ['home', 'editor', 'terminal']);
	assert.deepEqual(visibleProducts({ ...ALL_OFF, dashboard: true, terminal: true }), ['home', 'dashboard', 'terminal']);
	assert.deepEqual(visibleProducts({ ...ALL_OFF, automation: true }), ['home', 'automation']);
	assert.deepEqual(visibleProducts(ALL_OFF), ['home']);
});

test('stored editor placeholder selections return to comments while preserving preferences', () => {
	for (const activeDomain of ['comments', 'writing-stats', 'focus', 'unknown']) {
		assert.deepEqual(
			normalizeCommentsSettings({ activeDomain, sidebarWidth: 300, highlightEnabled: false, popoverEnabled: false }),
			{ ...DEFAULT_COMMENTS_SETTINGS, sidebarWidth: 300, highlightEnabled: false, popoverEnabled: false },
		);
	}
});

test('archives respects its module gate', () => {
	assert.equal(visibleProducts({ ...ALL_ON, contacts: false }).includes('contacts'), false);
	assert.equal(visibleProducts({ ...ALL_ON, dashboard: false }).includes('contacts'), true);
});

test('icon preferences are a settings category only while their module is enabled', () => {
	let enabled = true;
	const plugin = {
		moduleEnabled: (id: string) => id === 'icons' && enabled,
		appSettings: { get: () => ({ devGallery: false }) },
	} as unknown as DashboardPlugin;
	assert.deepEqual(settingsCategories(plugin).map((item) => item.id), ['general', 'appearance', 'iconic', 'about']);
	enabled = false;
	assert.equal(settingsCategories(plugin).some((item) => item.id === 'iconic'), false);
});


test('browser settings remain available with dashboard and terminal disabled', () => {
	assert.deepEqual(visibleProducts({ ...ALL_OFF, browser: true }), ['home', 'browser']);
});
