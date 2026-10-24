// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { NAVIGATOR_LISTS, NAVIGATOR_PANEL, NAVIGATOR_PERIODIC, NAVIGATOR_VIEW_TYPE, type NavigatorLists, type NavigatorListsSnapshot, type NavigatorPanel, type NavigatorPeriodic } from './api';
import { periodicNotePath } from '../../shared/periodic-paths';
import { navigatorSchema } from './settings';
import { registerMessages } from '../../shared/i18n/index';
import { messages } from './i18n';
import { messages as calendarStrings } from '../../shared/i18n/lazy/calendar';

registerMessages(messages);
registerMessages(calendarStrings);

type NavigatorRuntime = Awaited<ReturnType<typeof import('./ui/runtime')['createNavigatorRuntime']>>;

/**
 * Notes navigator module: a two-pane folder/tag tree and note list in the left sidebar view
 * (`huhu-navigator-view`). Each activation creates a runtime; turning the module off releases it.
 * The module switch owns the sidebar entry: switching on (or loading while on) makes sure the left sidebar has the
 * navigator, switching off removes it. Unloading the plugin leaves the layout alone.
 */
export default function createNavigatorModule(context: ModuleContext): ModuleInstance {
	const settings = context.settings.bind('navigator', navigatorSchema);
	let runtime: NavigatorRuntime | undefined;
	const panel: NavigatorPanel = {
		mount: (container) => runtime?.panel.mount(container) ?? (() => undefined),
		reveal: (path) => runtime?.panel.reveal(path),
		focus: (pane) => runtime?.panel.focus(pane),
	};
	// Widgets may subscribe before the runtime exists (or across a restart); their listeners follow the live runtime.
	const empty: NavigatorListsSnapshot = { recent: [], shortcuts: [] };
	const listeners = new Set<() => void>();
	let detach: (() => void) | undefined;
	const periodicListeners = new Set<() => void>();
	const firePeriodic = () => { for (const listener of [...periodicListeners]) listener(); };
	let detachPeriodic: (() => void) | undefined;
	const lists: NavigatorLists = {
		snapshot: () => runtime?.lists.snapshot() ?? empty,
		subscribe(listener) {
			listeners.add(listener);
			return () => { listeners.delete(listener); };
		},
		open: (target) => runtime?.lists.open(target),
	};
	const fire = () => { for (const listener of [...listeners]) listener(); };
	// The journal settings follow the settings store; week start and note creation need the live runtime.
	const periodic: NavigatorPeriodic = {
		root: () => settings.get().periodicRoot,
		template: (period, date) => runtime?.journal.template(period, date) ?? (date ? undefined : settings.get().periods[period].template || undefined),
		weekStart: () => runtime?.journal.weekStart() ?? 1,
		ensure: async (period, date) => runtime?.journal.ensure(period, date),
		display: () => runtime?.journal.display() ?? { weekNumbers: settings.get().calendarWeekNumbers, images: settings.get().calendarImages, weeks: settings.get().calendarWeeks },
		inspect: (period, date) => runtime?.journal.inspect(period, date) ?? { period, date: '', path: periodicNotePath(settings.get().periodicRoot, period, date, 1), title: '', status: 'unavailable', active: false },
		subscribe: (listener) => { periodicListeners.add(listener); return () => { periodicListeners.delete(listener); }; },
		preview: async (period, date) => runtime ? runtime.journal.preview(period, date) : periodic.inspect(period, date),
		prepare: async (period, date, options) => runtime ? runtime.journal.prepare(period, date, options) : { status: 'unavailable', code: 'periodic-unavailable' },
		open: async (period, date, options) => runtime?.journal.open(period, date, options) ?? false,
		active: () => runtime?.journal.active(),
	};
	return {
		services: [[NAVIGATOR_PANEL, panel], [NAVIGATOR_LISTS, lists], [NAVIGATOR_PERIODIC, periodic]],
		settingsPage: async () => (await import('./ui/settings-page')).navigatorSettingsPage(settings, () => runtime, context.app),
		async activate(signal) {
			const { createNavigatorRuntime } = await import('./ui/runtime');
			const next = await createNavigatorRuntime(context, settings);
			if (signal.aborted) { await next.dispose(); return; }
			runtime = next;
			detach = next.lists.subscribe(fire);
			detachPeriodic = next.journal.subscribe(firePeriodic);
			fire(); firePeriodic();
			// An existing leaf is reused, so a layout that already has the navigator is not touched. A leaf the user closed
			// while the module stays on comes back with the next load, not while HUHU is running.
			context.app.workspace.onLayoutReady(() => {
				if (signal.aborted || !runtime) return;
				void context.app.workspace.ensureSideLeaf(NAVIGATOR_VIEW_TYPE, 'left', { active: false, reveal: false }).catch((error: unknown) => console.error('[HUHU navigator] Could not place the side panel', error));
			});
		},
		async dispose(reason) {
			if (reason === 'disabled') context.app.workspace.detachLeavesOfType(NAVIGATOR_VIEW_TYPE);
			const current = runtime;
			runtime = undefined;
			detach?.();
			detach = undefined;
			detachPeriodic?.(); detachPeriodic = undefined;
			fire(); firePeriodic();
			await current?.dispose();
		},
	};
}
