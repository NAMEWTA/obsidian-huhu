import assert from 'node:assert/strict';
import { test } from 'vitest';
import { normalizeTarget, normalizeWorkbenchState, targetKey, panelWidth } from './navigation-state';
import { NavigationTransition } from './navigation-transition';
import { dashboardSaveStatuses } from '../app/workbench/status-policy';
import { focusLeafState as splitLeafState } from '../app/workbench/focus-state';


const deferred = () => { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; };
test('unknown targets fall back to the home board; settings is its own page', () => {
	for (const value of [null, [], {}, { feature: 'home' }, { feature: 'habit' }]) assert.deepEqual(normalizeTarget(value), { feature: 'dashboard' });
	assert.deepEqual(normalizeTarget({ feature: 'settings', section: 'appearance' }), { feature: 'settings', section: 'appearance' });
});
test('restoration accepts known sections and excludes unrelated or secret fields', () => {
	assert.deepEqual(normalizeTarget({ feature: 'contacts', section: 'person', resourceId: 'stable-id', token: 'secret', dom: {} }), { feature: 'contacts', section: 'person', resourceId: 'stable-id' });
	assert.deepEqual(normalizeTarget({ feature: 'not-a-feature', section: 'history', resourceId: '\u0000bad' }), { feature: 'dashboard' });
	assert.deepEqual(normalizeTarget({ feature: 'browser', section: 'history', resourceId: '\u0000bad' }), { feature: 'browser' });
});
test('panel width and open state are bounded and deterministic', () => {
	assert.equal(panelWidth(NaN), 280); assert.equal(panelWidth(100), 220); assert.equal(panelWidth(600), 500);
	assert.equal(normalizeWorkbenchState({ panelOpen: false }).panelOpen, false);
	assert.equal(normalizeWorkbenchState({}).panelOpen, true);
});

test('old icon bookmarks and restored routes go to the single settings location', () => {
	assert.deepEqual(normalizeTarget({ feature: 'icons', section: 'iconic-sidebars', focusId: 'file-icons' }), {
		feature: 'settings', section: 'iconic', resourceId: 'iconic-sidebars', focusId: 'file-icons',
	});
	assert.deepEqual(normalizeWorkbenchState({ target: { feature: 'icons', section: 'iconic-picker' } }).target, {
		feature: 'settings', section: 'iconic', resourceId: 'iconic-picker',
	});
	assert.deepEqual(normalizeTarget({ feature: 'icons', section: 'invalid/<script>' }), { feature: 'settings', section: 'iconic' });
});
test('resource identities cannot collide through separators', () => {
	assert.notEqual(targetKey({ feature: 'contacts', resourceId: 'a:b' }), targetKey({ feature: 'contacts', section: 'a', resourceId: 'b' }));
});
test('latest navigation wins and late completion cannot change selection', async () => {
	const navigation = new NavigationTransition(), first = deferred(); const commits: string[] = [];
	const a = navigation.navigate({ feature: 'dashboard' }, () => first.promise, () => commits.push('a'));
	await navigation.navigate({ feature: 'contacts' }, async () => {}, () => commits.push('b'));
	first.resolve(); assert.equal(await a, false); assert.deepEqual(commits, ['b']);
});
test('repeated targets do not remount or repeat side effects', async () => {
	const navigation = new NavigationTransition(), ready = deferred(); let calls = 0;
	const prepare = () => { calls++; return ready.promise; };
	const a = navigation.navigate({ feature: 'dashboard' }, prepare, () => {});
	const b = navigation.navigate({ feature: 'dashboard' }, prepare, () => {});
	assert.equal(a, b); ready.resolve(); await a;
	await navigation.navigate({ feature: 'dashboard' }, prepare, () => {}); assert.equal(calls, 1);
});
test('returning to the visible page cancels a pending different page and applies the return', async () => {
	const navigation = new NavigationTransition(), slow = deferred(); const commits: string[] = [];
	await navigation.navigate({ feature: 'dashboard' }, async () => {}, () => commits.push('home'));
	const pending = navigation.navigate({ feature: 'contacts' }, () => slow.promise, () => commits.push('contacts'));
	await navigation.navigate({ feature: 'dashboard' }, async () => {}, () => commits.push('home-again'));
	slow.resolve(); assert.equal(await pending, false); assert.deepEqual(commits, ['home', 'home-again']);
});
test('dispose and module invalidation cancel late requests', async () => {
	for (const action of ['dispose', 'invalidate'] as const) {
		const navigation = new NavigationTransition(), slow = deferred(); let committed = false;
		const pending = navigation.navigate({ feature: 'terminal' }, () => slow.promise, () => { committed = true; });
		navigation[action](); slow.resolve(); assert.equal(await pending, false); assert.equal(committed, false);
	}
});
test('genuine failures remain failures and permit retry', async () => {
	const navigation = new NavigationTransition();
	await assert.rejects(navigation.navigate({ feature: 'dashboard' }, async () => { throw new Error('save failed'); }, () => {}), /save failed/);
	assert.equal(await navigation.navigate({ feature: 'dashboard' }, async () => {}, () => {}), true);
});
test('a repeated target still skips when nothing is in flight and the live target matches', async () => {
	const navigation = new NavigationTransition();
	let calls = 0;
	let selected = '';
	const live = () => selected ? targetKey({ feature: 'contacts', resourceId: selected }) : undefined;
	const open = () => navigation.navigate({ feature: 'contacts', resourceId: 'X' }, async () => { calls++; selected = 'X'; }, () => {}, live);
	await open();
	await open();
	assert.equal(calls, 1);
	assert.equal(selected, 'X');
});

test('source X then related Y then source X runs prepare again on the same surface', async () => {
	const navigation = new NavigationTransition();
	let surfaces = 0;
	let selected = '';
	const live = () => selected ? targetKey({ feature: 'contacts', section: 'person', resourceId: selected }) : undefined;
	const open = (id: string) => navigation.navigate({ feature: 'contacts', section: 'person', resourceId: id }, async () => {
		if (surfaces === 0) surfaces++;
		selected = id;
	}, () => {}, live);
	assert.equal(await open('X'), true);
	selected = 'Y';
	assert.equal(await open('X'), true);
	assert.equal(selected, 'X');
	assert.equal(surfaces, 1);
});

test('a focus leaf retains the selected resource', () => {
	const contacts = splitLeafState({ feature: 'contacts', section: 'person', resourceId: 'person-a' }, { selectedId: 'person-a', query: { kind: 'person' } });
	assert.equal(contacts.target.resourceId, 'person-a');
	assert.equal((contacts.pages[0]?.state as { selectedId: string }).selectedId, 'person-a');
});

test('save errors stay on their board', () => {
	const statuses = dashboardSaveStatuses([
		{ path: 'alpha', status: 'saved', message: '' },
		{ path: 'alpha', status: 'saving', message: 'saving' },
		{ path: 'alpha', status: 'conflict-saved', message: 'conflict on alpha' },
		{ path: 'alpha', status: 'save-error', message: 'again' },
		{ path: 'beta', status: 'save-error', message: 'write failed' },
		{ path: '', status: 'save-error', message: 'no path' },
	]);
	assert.deepEqual(statuses.map((item) => item.id), ['dashboard-save:alpha', 'dashboard-save:beta']);
	assert.equal(statuses[0]?.target.resourceId, 'alpha');
	assert.equal(statuses[1]?.target.resourceId, 'beta');
	assert.equal(statuses[0]?.kind, 'error');
	assert.equal(statuses[0]?.label, 'conflict on alpha');
});
