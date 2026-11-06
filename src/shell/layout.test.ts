import assert from 'node:assert/strict';
import { test } from 'vitest';
import { layoutFor, railAction, rememberTarget } from './layout';
import { WORKBENCH_UI_SCHEMA, normalizeWorkbenchState } from './navigation-state';

test('layout follows actual leaf width at 599/600 and 959/960, independent of device', () => {
	assert.equal(layoutFor(1280), 'wide');
	assert.equal(layoutFor(960), 'wide');
	assert.equal(layoutFor(959), 'medium');
	assert.equal(layoutFor(600), 'medium');
	assert.equal(layoutFor(599), 'narrow');
});

test('the active rail icon toggles the panel; another icon restores that module’s last route', () => {
	let state = normalizeWorkbenchState({ schema: WORKBENCH_UI_SCHEMA, route: { feature: 'dashboard' } });
	assert.deepEqual(railAction(state, 'dashboard'), { kind: 'toggle-panel' });
	assert.deepEqual(railAction(state, 'contacts'), { kind: 'navigate', target: { feature: 'contacts' } });
	state = rememberTarget(state, { feature: 'contacts', section: 'company' });
	state = rememberTarget(state, { feature: 'dashboard' });
	assert.deepEqual(railAction(state, 'contacts'), {
		kind: 'navigate',
		target: { feature: 'contacts', section: 'company' },
	});
});

test('saved shell state is bounded and keeps per-module routes only for their own module', () => {
	const state = normalizeWorkbenchState({
		schema: WORKBENCH_UI_SCHEMA,
		mode: 'focus',
		navigation: {
			width: 999,
			open: false,
			lastRoutes: {
				contacts: { feature: 'contacts', section: 'person' },
				terminal: { feature: 'contacts' },
				bogus: {},
			},
		},
		route: { feature: 'settings', section: 'appearance' },
	});
	assert.equal(state.navigation.width, 480);
	assert.equal(state.navigation.open, false);
	assert.equal(state.mode, 'focus');
	assert.deepEqual(state.navigation.lastRoutes, { contacts: { feature: 'contacts', section: 'person' } });
	assert.deepEqual(state.route, { feature: 'settings', section: 'appearance' });
	assert.equal(
		normalizeWorkbenchState({ schema: WORKBENCH_UI_SCHEMA, route: { feature: 'settings', section: 'Bad Id' } })
			.route.section,
		undefined,
	);
});
