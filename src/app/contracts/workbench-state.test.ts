import { describe, expect, it } from 'vitest';
import {
	WORKBENCH_UI_SCHEMA,
	cleanPageState,
	normalizeTarget,
	normalizeWorkbenchState,
	panelWidth,
	targetKey,
} from './workbench-state';

describe('workbench UI state', () => {
	it('initializes one new envelope without reading old layout or page fields', () => {
		const state = normalizeWorkbenchState({
			target: { feature: 'safe', resourceId: 'secret' },
			focus: true,
			panelWidth: 480,
			panelOpen: false,
			lastTargets: { task: { feature: 'task' } },
			pages: [{ target: { feature: 'task' }, state: { query: 'old' } }],
		});
		expect(state).toEqual({
			schema: WORKBENCH_UI_SCHEMA,
			route: { feature: 'dashboard' },
			navigation: { width: 272, open: true, lastRoutes: {} },
			mode: 'workbench',
			pageViews: [],
		});
	});

	it.each([undefined, 'huhu-workbench-ui/0', 'huhu-workbench-ui/2'])(
		'rejects a missing or unknown tag as a whole: %s',
		(schema) => {
			expect(
				normalizeWorkbenchState({
					schema,
					route: { feature: 'task' },
					mode: 'focus',
					navigation: { width: 440, open: false, lastRoutes: { task: { feature: 'task' } } },
					pageViews: [{ target: { feature: 'task' }, state: { query: 'new-looking' } }],
				}),
			).toEqual(normalizeWorkbenchState(null));
		},
	);

	it('round-trips bounded current routes and module page projections', () => {
		const state = normalizeWorkbenchState({
			schema: WORKBENCH_UI_SCHEMA,
			route: { feature: 'automations', section: 'templates', resourceId: 'rule-1' },
			mode: 'focus',
			navigation: {
				width: 900,
				open: false,
				lastRoutes: {
					task: { feature: 'task' },
					terminal: { feature: 'task' },
				},
			},
			pageViews: [{ target: { feature: 'task' }, state: { query: 'find', password: 'drop' } }],
		});
		expect(state.route).toEqual({ feature: 'automations', section: 'templates', resourceId: 'rule-1' });
		expect(state.navigation).toEqual({ width: 480, open: false, lastRoutes: { task: { feature: 'task' } } });
		expect(state.mode).toBe('focus');
		expect(state.pageViews).toEqual([{ target: { feature: 'task' }, state: { query: 'find' } }]);
		expect(normalizeWorkbenchState(state)).toEqual(state);
	});

	it('never restores a safe resource, focus target or page draft', () => {
		const state = normalizeWorkbenchState({
			schema: WORKBENCH_UI_SCHEMA,
			route: { feature: 'safe', section: 'find', resourceId: 'entry', focusId: 'password' },
			pageViews: [
				{ target: { feature: 'safe', resourceId: 'entry' }, state: { draft: 'plaintext', query: 'secret' } },
			],
		});
		expect(state.route).toEqual({ feature: 'safe' });
		expect(state.pageViews).toEqual([{ target: { feature: 'safe' }, state: {} }]);
	});

	it('keeps module routes opaque while rejecting unknown features and unsafe identifiers', () => {
		expect(normalizeTarget({ feature: 'not-a-feature' })).toEqual({ feature: 'dashboard' });
		expect(normalizeTarget({ feature: 'settings', section: '../escape', focusId: 'bad\nfocus' })).toEqual({
			feature: 'settings',
		});
		expect(normalizeTarget({ feature: 'contacts', section: 'type_1', resourceId: 'huhu/a.md' })).toEqual({
			feature: 'contacts',
			section: 'type_1',
			resourceId: 'huhu/a.md',
		});
		expect(targetKey({ feature: 'task', resourceId: 'a' })).not.toBe(
			targetKey({ feature: 'task', resourceId: 'b' }),
		);
	});

	it('clamps finite panel widths and gives each default independent mutable state', () => {
		expect([panelWidth(100), panelWidth(900), panelWidth(271.6), panelWidth(Number.NaN)]).toEqual([
			220, 480, 272, 272,
		]);
		const a = normalizeWorkbenchState(null),
			b = normalizeWorkbenchState(null);
		a.navigation.lastRoutes.task = { feature: 'task' };
		expect(b.navigation.lastRoutes).toEqual({});
	});

	it('bounds saved views and keeps only finite, allowed, non-secret page state', () => {
		const state = normalizeWorkbenchState({
			schema: WORKBENCH_UI_SCHEMA,
			pageViews: Array.from({ length: 110 }, (_, index) => ({
				target: { feature: 'task', resourceId: String(index) },
				state: { selected: index },
			})),
		});
		expect(state.pageViews).toHaveLength(100);
		expect(
			cleanPageState({ allowed: { token: 'drop', n: Infinity, text: 'x'.repeat(9000) }, outside: true }, [
				'allowed',
			]),
		).toEqual({ allowed: { text: 'x'.repeat(8192) } });
	});
});
