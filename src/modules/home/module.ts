import { ARCHIVES_QUERY } from '../archives/api';
import { closeRssStore } from './platform/rss/rss-store';
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { deviceId } from '../../host/obsidian/storage/device-id';
import {
	AGENT_DIRECTORY,
	AGENT_DISPATCH,
	AGENT_SESSIONS,
	AGENT_SKILLS,
	AGENT_SKILL_CATALOG,
	AGENT_USAGE,
	AGENT_QUICK_COMMANDS,
} from '../agent/api';
import { NAVIGATOR_LISTS, NAVIGATOR_PERIODIC } from '../navigator/api';
import { AUTOMATIONS, AUTOMATION_SOURCES, type AutomationSource } from '../automations/api';
import { HOME_WIDGETS, HOME_WORKBENCH, type HomeWorkbench } from './api';
import { TASK_CALENDAR, TASK_VIEWS } from '../task/api';
import { indexWidgetProviders } from './core/board/widget-registry';
import { builtinHomeWidgets } from './contrib/widgets';
import { dashboardAutomationSource } from './contrib/automation-source';
import { ExpenseService } from './platform/expense/expense-service';
import { bindJournal } from './platform/calendar/daily-notes';
import { HabitService } from './platform/habit/habit-service';
import { MediaTagService } from './platform/media/media-tags';
import { MusicService } from './platform/music/music-service';
import { PomodoroService } from './platform/pomodoro/pomodoro-service';
import { ReadingService } from './platform/reading/reading-service';
import { BoardRegistry } from './services/board-registry';
import { startBoardBackups } from './services/board-backups';
import { registerHomeCommands } from './services/commands';
import { createHomeHost, repointBoards } from './services/home-host';
import { homeServices } from './services/instances';
import { homeSettings } from './settings';
import { registerMessages } from '../../shared/i18n/index';
import { messages } from './i18n';
import { messages as calendarStrings } from '../../shared/i18n/lazy/calendar';
import { messages as automationStrings } from '../../shared/i18n/lazy/automation';
import { messages as browserStrings } from '../../shared/i18n/lazy/browser';
import { messages as commonStrings } from '../../shared/i18n/lazy/common';

registerMessages(automationStrings);
registerMessages(browserStrings);
registerMessages(commonStrings);
registerMessages(messages);
registerMessages(calendarStrings);

/**
 * Home (board) module: the boards and their registry, widget services (one each per activation), board
 * commands and the dashboard automation source. Board code reads and writes the `home`
 * settings namespace through the module's host.
 */
export default function createHomeModule(context: ModuleContext): ModuleInstance {
	const app = context.app;
	const host = createHomeHost(context, context.settings.bind('home', homeSettings));
	const widgets = builtinHomeWidgets(
		() => host.settings,
		async (key, root, ctx) => {
			const ui = await import('./ui/widgets/widget-loader');
			if (!ctx.signal.aborted) await ui.mountBuiltinWidget(host, key, root, ctx);
		},
		async (key, ctx, create) => {
			const ui = await import('./ui/widgets/widget-loader');
			return ctx.signal.aborted ? null : ui.configureBuiltinWidget(host, key, ctx, create);
		},
	);
	let widgetGeneration = 0;
	let widgetSubscriptions: (() => void)[] = [];
	const widgetListeners = new Set<() => void>();
	const listeners = new Set<() => void>();
	const changed = () => {
		for (const listener of [...listeners]) listener();
	};
	let ui: { closeModals: (app: typeof context.app) => void; teardown: (app: typeof context.app) => void } | undefined;
	let automationSource: AutomationSource | undefined;
	let workbench: HomeWorkbench | undefined;
	let owned: typeof homeServices = {};
	return {
		/** Read after `activate()`. */
		get services() {
			return [...(workbench ? [[HOME_WORKBENCH, workbench] as const] : [])];
		},
		get contributions() {
			const contribution = [HOME_WIDGETS, widgets] as const;
			return automationSource ? [contribution, [AUTOMATION_SOURCES, automationSource] as const] : [contribution];
		},
		pages: {
			board: async () => (await import('./ui/workbench-page')).boardPage(host),
		},
		settingsPage: async () => (await import('./ui/settings-page')).homeSettingsPage(host),
		async activate() {
			// A non-owning projection; task survives Home being disabled or the last board closing.
			homeServices.calendar = context.services.peek(TASK_CALENDAR);
			homeServices.taskViews = context.services.peek(TASK_VIEWS);
			context.lifetime.register(
				context.services.watch(TASK_CALENDAR, (calendar) => {
					homeServices.calendar = calendar;
					host.refreshAllDashboards();
				}),
			);
			context.lifetime.register(
				context.services.watch(TASK_VIEWS, (views) => {
					homeServices.taskViews = views;
					host.refreshAllDashboards();
				}),
			);
			homeServices.archives = () => context.services.peek(ARCHIVES_QUERY);
			homeServices.watchArchives = (listener) => {
				let inner = context.services.peek(ARCHIVES_QUERY)?.subscribe(listener);
				const stop = context.services.watch(ARCHIVES_QUERY, (archives) => {
					inner?.();
					inner = archives?.subscribe(listener);
					listener();
				});
				return () => {
					inner?.();
					stop();
				};
			};
			homeServices.periodic = () => context.services.peek(NAVIGATOR_PERIODIC);
			homeServices.watchPeriodic = (listener) => {
				let inner = context.services.peek(NAVIGATOR_PERIODIC)?.subscribe(listener);
				const stop = context.services.watch(NAVIGATOR_PERIODIC, (periodic) => {
					inner?.();
					inner = periodic?.subscribe(listener);
					listener();
				});
				return () => {
					inner?.();
					stop();
				};
			};
			// Board UI helpers that must run on dispose (synchronously) and the workbench panel load now.
			const [{ closeDashboardPanelModals }, { teardownBasenameIndex }, { closeRecordDialogs }] =
				await Promise.all([
					import('./ui/ui/panel-modal'),
					import('./ui/renderer/render-context'),
					import('./ui/dialogs/record-lifetime'),
				]);
			ui = {
				closeModals: (app) => {
					closeRecordDialogs();
					closeDashboardPanelModals(app);
				},
				teardown: teardownBasenameIndex,
			};
			const media = new MediaTagService(host);
			media.load();
			const habit = new HabitService(host);
			const expense = new ExpenseService(host);
			const pomodoro = new PomodoroService(host);
			const reading = new ReadingService(host);
			const music = context.env.phone ? undefined : new MusicService(host);
			// Disposed with the module even if loading fails; published to widgets once loaded.
			owned = { mediaTags: media, habit, expense, pomodoro, reading, music };
			await Promise.all([
				habit.load(),
				expense.load(),
				pomodoro.loadSessions(),
				reading.loadSessions(),
				music?.load(),
			]);
			Object.assign(homeServices, owned);
			homeServices.acquireDispatch = () => Promise.resolve(context.services.peek(AGENT_DISPATCH));
			homeServices.agents = () => context.services.peek(AGENT_DIRECTORY)?.list() ?? [];
			homeServices.spaces = () => context.services.peek(AGENT_DIRECTORY)?.spaces() ?? [];
			homeServices.sessions = () => context.services.peek(AGENT_SESSIONS);
			homeServices.skills = () => context.services.peek(AGENT_SKILLS);
			homeServices.skillCatalog = () => context.services.peek(AGENT_SKILL_CATALOG);
			homeServices.watchAgents = (listener) => {
				const stopDirectory = context.services.watch(AGENT_DIRECTORY, listener);
				const stopSkills = context.services.watch(AGENT_SKILLS, listener);
				return () => {
					stopDirectory();
					stopSkills();
				};
			};
			homeServices.quickCommands = () => context.services.peek(AGENT_QUICK_COMMANDS);
			homeServices.usage = () => context.services.peek(AGENT_USAGE);
			homeServices.watchUsage = (listener) => context.services.watch(AGENT_USAGE, () => listener());
			homeServices.navigatorLists = () => context.services.peek(NAVIGATOR_LISTS);
			homeServices.watchNavigatorLists = (listener) => context.services.watch(NAVIGATOR_LISTS, () => listener());
			// Daily notes follow the navigator's journal settings while that module is active.
			context.lifetime.register(bindJournal(() => context.services.peek(NAVIGATOR_PERIODIC)));
			homeServices.watchWidgets = (listener) => {
				widgetListeners.add(listener);
				return () => {
					widgetListeners.delete(listener);
				};
			};
			context.lifetime.register(() => widgetListeners.clear());
			context.lifetime.register(() => {
				for (const off of widgetSubscriptions.splice(0)) off();
			});
			const notifyWidgets = () => {
				homeServices.widgetRevision = (homeServices.widgetRevision ?? 0) + 1;
				for (const listener of widgetListeners) listener();
				host.refreshAllDashboards();
			};
			context.lifetime.register(context.services.watch(AUTOMATIONS, notifyWidgets));
			const publishWidgets = async () => {
				const generation = ++widgetGeneration;
				try {
					const contributed = await context.contributions.collect(HOME_WIDGETS, { activate: false });
					if (generation !== widgetGeneration) return;
					const next = indexWidgetProviders([
						{ module: 'home', bundle: widgets },
						...contributed
							.filter((item) => item.module !== 'home')
							.map((item) => ({ module: item.module, bundle: item.value })),
					]);
					const previous = homeServices.widgets;
					if (
						previous &&
						previous.byKey.size === next.byKey.size &&
						[...next.byKey].every(([key, value]) => previous.byKey.get(key)?.kind === value.kind) &&
						previous.errors.join() === next.errors.join()
					)
						return;
					homeServices.widgets = next;
					for (const off of widgetSubscriptions.splice(0)) off();
					for (const item of contributed) {
						try {
							const off = item.value.subscribeInstances?.(() => {
								if (homeServices.widgets === next) notifyWidgets();
							});
							if (off) widgetSubscriptions.push(off);
						} catch (error) {
							console.error('Home widget instance subscription failed', item.module, error);
						}
					}
					notifyWidgets();
				} catch (error) {
					console.error('Home widget registry update failed', error);
				}
			};
			homeServices.widgets = indexWidgetProviders([{ module: 'home', bundle: widgets }]);
			homeServices.widgetRevision = 0;
			context.lifetime.register(
				context.contributions.watch(HOME_WIDGETS, () => {
					void publishWidgets();
				}),
			);
			void publishWidgets();
			const boards = new BoardRegistry({
				settings: () => host.settings,
				app,
				read: () => ({
					workspaceFiles: host.settings.workspaceFiles,
					workspaceNames: host.settings.workspaceNames,
					dashboardFile: host.settings.dashboardFile,
				}),
				write: async (next) => {
					host.settings = { ...host.settings, ...next };
					await host.saveSettings();
					changed();
				},
				repointAll: () => repointBoards(host),
				refreshAll: () => host.refreshAllDashboards(),
			});
			await boards.recoverMoves();
			boards.watch((dispose) => context.lifetime.register(dispose));
			app.workspace.onLayoutReady(() => {
				if (host.boards === boards) void boards.prune();
			});
			host.boards = boards;
			host.closeOverlays = () => ui?.closeModals(app);
			automationSource = dashboardAutomationSource({
				app,
				settings: () => host.settings,
				deviceId: deviceId(app),
				saveSettings: () => host.saveSettings(),
				shell: context.shell,
				registerEvent: (ref) => context.lifetime.registerEvent(ref),
			});
			workbench = {
				saveStatuses: () =>
					host.boardSurfaces().map((surface) => ({
						path: surface.plugin.settings.dashboardFile,
						status: surface.sync.getSaveState().status,
						message: surface.saveMessage(),
					})),
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
			};
			// Board saves change the save statuses.
			context.lifetime.register(context.settings.bind('home', homeSettings).subscribe(changed));
			registerHomeCommands(
				host,
				context.commands,
				() => context.shell.open({ feature: 'dashboard' }),
				async () => {
					const { openAppearanceStudio } = await import('./ui/appearance/open-appearance-studio');
					await openAppearanceStudio(
						host,
						app.workspace.getMostRecentLeaf()?.view.containerEl.ownerDocument ??
							app.workspace.containerEl.ownerDocument,
					);
				},
			);
			context.lifetime.register(startBoardBackups(host));
			if (app.workspace.layoutReady) host.refreshAllDashboards();
		},
		dispose(reason) {
			widgetGeneration++;
			ui?.closeModals(app);
			if (reason === 'unload') ui?.teardown(app);
			host.boards = undefined;
			host.closeOverlays = undefined;
			workbench = undefined;
			listeners.clear();
			const { mediaTags, habit, expense, pomodoro, reading, music } = owned;
			owned = {};
			for (const key of Object.keys(homeServices) as Array<keyof typeof homeServices>) delete homeServices[key];
			if (mediaTags) void mediaTags.flush();
			mediaTags?.destroy();
			habit?.destroy();
			expense?.destroy();
			pomodoro?.destroy();
			reading?.destroy();
			music?.destroy();
			void closeRssStore(app).catch((error) => console.error('[HUHU RSS save]', error));
			if (reason === 'disabled' && app.workspace.layoutReady) host.refreshAllDashboards();
		},
	};
}
