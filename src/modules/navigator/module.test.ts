// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test, vi } from 'vitest';
import type { TFile } from 'obsidian';
import type { ModuleContext } from '../../app/contracts/module';
import type { SettingsHandle } from '../../shared/settings/store';
import { NAVIGATOR_PERIODIC, NAVIGATOR_VIEW_TYPE, type NavigatorPeriodic } from './api';
import { navigatorSchema, type NavigatorSettings } from './settings';
import createNavigatorModule from './module';

const ensured: Array<{ date: Date; period: string }> = [];

vi.mock('./ui/runtime', () => ({
	createNavigatorRuntime: (_context: ModuleContext, settings: SettingsHandle<NavigatorSettings>) => {
		const journal: NavigatorPeriodic = {
			root: () => settings.get().periodicRoot,
			template: (period) => settings.get().periods[period].template || undefined,
			weekStart: () => 0,
			display: () => ({ weekNumbers: settings.get().calendarWeekNumbers, images: settings.get().calendarImages, weeks: settings.get().calendarWeeks }),
			inspect: (period) => ({ period, date: '2026-10-17', path: 'made.md', title: 'made', status: 'missing', active: false }),
			subscribe: () => () => undefined,
			preview: (period, date) => Promise.resolve(journal.inspect(period, date)),
			prepare: () => Promise.resolve({ status: 'ready', path: 'made.md', content: '' }),
			open: () => Promise.resolve(true),
			active: () => undefined,
			ensure: (period, date) => { ensured.push({ period, date }); return Promise.resolve({ path: 'made.md' } as TFile); },
		};
		return Promise.resolve({
			lists: { snapshot: () => ({ recent: [], shortcuts: [] }), subscribe: () => () => undefined, open: () => undefined },
			panel: { mount: () => () => undefined, reveal: () => undefined, focus: () => undefined },
			journal,
			dispose: () => Promise.resolve(),
		});
	},
}));

function fixture(settingOverrides: Record<string, unknown> = {}) {
	let value = { ...navigatorSchema.defaults(), ...settingOverrides };
	const update = vi.fn((change: (draft: typeof value) => void) => { const draft = structuredClone(value); change(draft); value = draft; return Promise.resolve(); });
	const workspace = {
		onLayoutReady: (callback: () => void) => callback(),
		ensureSideLeaf: vi.fn(() => Promise.resolve({})),
		detachLeavesOfType: vi.fn(),
	};
	const context = { app: { workspace }, settings: { bind: () => ({ get: () => value, update, subscribe: () => () => undefined }) } } as unknown as ModuleContext;
	return { instance: createNavigatorModule(context), workspace, update };
}

test('switching the module on puts the navigator in the left sidebar without taking focus', async () => {
	const { instance, workspace, update } = fixture();
	await instance.activate?.(new AbortController().signal);
	expect(workspace.ensureSideLeaf).toHaveBeenCalledTimes(1);
	expect(workspace.ensureSideLeaf).toHaveBeenCalledWith(NAVIGATOR_VIEW_TYPE, 'left', { active: false, reveal: false });
	// no one-time "placed" flag any more
	expect(update).not.toHaveBeenCalled();
	expect('panelAutoPlaced' in navigatorSchema.defaults()).toBe(false);
});

test('every switch-on places the navigator again; the leaf of an earlier session is reused by Obsidian', async () => {
	const { instance, workspace } = fixture();
	await instance.activate?.(new AbortController().signal);
	await instance.dispose('disabled');
	await instance.activate?.(new AbortController().signal);
	expect(workspace.ensureSideLeaf).toHaveBeenCalledTimes(2);
});

test('switching the module off removes the navigator leaves, unloading the plugin keeps the layout', async () => {
	const off = fixture();
	await off.instance.activate?.(new AbortController().signal);
	await off.instance.dispose('disabled');
	expect(off.workspace.detachLeavesOfType).toHaveBeenCalledWith(NAVIGATOR_VIEW_TYPE);

	const unload = fixture();
	await unload.instance.activate?.(new AbortController().signal);
	await unload.instance.dispose('unload');
	expect(unload.workspace.detachLeavesOfType).not.toHaveBeenCalled();
});

test('an activation that was cancelled places nothing', async () => {
	const { instance, workspace } = fixture();
	const controller = new AbortController();
	controller.abort();
	await instance.activate?.(controller.signal);
	expect(workspace.ensureSideLeaf).not.toHaveBeenCalled();
});

test('the module no longer registers a workbench page, so the rail has no Notes entry to open', () => {
	const { instance } = fixture();
	expect(instance.pages).toBeUndefined();
});

test('the journal service tells the dashboard where daily notes live and creates them with the navigator templates', async () => {
	const { instance } = fixture({ periodicRoot: 'Notes/Journal', periods: { day: { enabled: true, template: 'T/day.md' }, week: { enabled: true, template: '' } } });
	const provided = instance.services?.find(([key]) => key === NAVIGATOR_PERIODIC)?.[1] as NavigatorPeriodic;
	const onChange = vi.fn();
	const unsubscribe = provided.subscribe(onChange);
	const date = new Date(2026, 9, 17);
	expect(provided.inspect('day', date).status).toBe('unavailable');
	expect(await provided.open('day', date)).toBe(false);
	await instance.activate?.(new AbortController().signal);
	expect(onChange).toHaveBeenCalledTimes(1);
	expect(provided.root()).toBe('Notes/Journal');
	expect(provided.template('day')).toBe('T/day.md');
	expect(provided.template('week')).toBeUndefined();
	expect(provided.weekStart()).toBe(0);
	expect(await provided.ensure('day', date)).toMatchObject({ path: 'made.md' });
	expect(ensured).toEqual([{ period: 'day', date }]);
	await instance.dispose('unload');
	// without a live runtime nothing is created and the week starts on Monday
	expect(await provided.ensure('day', date)).toBeUndefined();
	expect(provided.weekStart()).toBe(1);
	expect(provided.inspect('day', date).status).toBe('unavailable');
	expect(await provided.prepare('day', date)).toEqual({ status: 'unavailable', code: 'periodic-unavailable' });
	expect(onChange).toHaveBeenCalledTimes(2);
	unsubscribe();
});
