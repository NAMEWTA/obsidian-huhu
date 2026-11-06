import { AnalyticsRangeControl, useAnalyticsRange } from '../../../../../src/ui/components/huhu/analytics/Analytics';
import { SettingsStore } from '../../../../../src/shared/settings/store';
import { initializeVaultPreferences } from '../../../../../src/host/obsidian/storage/preferences';
import { configureFixtureHost } from '../shared/fixture-theme';
import { DEFAULT_RSS_FOLDER } from '../../../../../src/modules/home/core/board/default-paths';
import { DashboardSettings as DashboardSettingsPage } from '../../../../../src/modules/home/ui/settings/DashboardSettings';
import { createTaskService } from '../../../../../src/modules/task/services/service';
import { createTaskRepository } from '../../../../../src/modules/task/platform/repository';
import { createTaskCalendar } from '../../../../../src/modules/task/services/calendar';
import { mountTasks, editTask } from '../../../../../src/modules/task/ui/runtime';
import type { TaskResources, TaskViews } from '../../../../../src/modules/task/api';
import { messages as taskWords } from '../../../../../src/modules/task/i18n';
import { widgetPresentationKey } from '../../../../../src/modules/home/core/board/widget-members';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Component, type Plugin } from 'obsidian';
import { readyDocuments } from '../shared/ready-documents';
import { memoryVault } from '../../../../fixtures/memory-vault';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { DesignScope } from '../../../../../src/ui/react/design-scope';
import { DashboardPage } from '../../../../../src/modules/home/ui/DashboardPage';
import { CountdownEditor } from '../../../../../src/modules/home/ui/widgets/CountdownWidget';
import { AnniversaryEditor } from '../../../../../src/modules/home/ui/widgets/AnniversaryEditor';
import { AlbumEditor } from '../../../../../src/modules/home/ui/widgets/AlbumEditor';
import { AppearanceStudio } from '../../../../../src/modules/home/ui/appearance/AppearanceStudio';
import { BoardStore } from '../../../../../src/modules/home/services/board-store';
import type { HomeHost } from '../../../../../src/modules/home/services/home-host';
import { homeServices } from '../../../../../src/modules/home/services/instances';
import { builtinHomeWidgets } from '../../../../../src/modules/home/contrib/widgets';
import { indexWidgetProviders } from '../../../../../src/modules/home/core/board/widget-registry';
import { BUILTIN_WIDGETS, SECTION_WIDGETS } from '../../../../../src/modules/home/core/board/widget-table';
import {
	DEFAULT_DASHBOARD_SETTINGS,
	type DashboardData,
	type DashboardSettings,
} from '../../../../../src/modules/home/core/board/types/model';
import { serialize } from '../../../../../src/modules/home/core/board/parser/parse';
import { contentFiles } from '../../../../../src/host/obsidian/storage/content-files';
import { HabitService } from '../../../../../src/modules/home/platform/habit/habit-service';
import { ExpenseService } from '../../../../../src/modules/home/platform/expense/expense-service';
import { PomodoroService } from '../../../../../src/modules/home/platform/pomodoro/pomodoro-service';
import { ReadingService } from '../../../../../src/modules/home/platform/reading/reading-service';
import type { WidgetSettingsHost } from '../../../../../src/modules/home/platform/widget-settings-host';
import { ThemeRuntime } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import { setLanguage, registerMessages, t } from '../../../../../src/shared/i18n';
import { messages } from '../../../../../src/modules/home/i18n';
import { messages as calendarWords } from '../../../../../src/shared/i18n/lazy/calendar';
import { messages as commonWords } from '../../../../../src/shared/i18n/lazy/common';
registerMessages(messages);
registerMessages(calendarWords);
registerMessages(commonWords);
registerMessages(taskWords);
Object.assign(Component.prototype, { load() {}, unload() {} });
const specs = [...BUILTIN_WIDGETS, ...SECTION_WIDGETS];
const states = [
	'default',
	'empty',
	'loading',
	'unavailable',
	'query-error',
	'countdown-config',
	'anniversary-config',
	'album-config',
	'appearance',
	'settings',
	'catalog',
	'analytics-custom',
	...specs.map((s) => s.key),
];
function CustomAnalyticsRange() {
	const state = useAnalyticsRange('custom', '2020-01-01');
	return (
		<div className="p-4">
			<AnalyticsRangeControl state={state} />
		</div>
	);
}
const countdown = {
	id: 'countdown',
	label: 'Publication',
	targetDate: '2027-01-01T09:30',
	displayMode: 'days' as const,
	reminderDays: 3,
};
const anniversary = {
	id: 'anniversary',
	label: 'Our first note',
	startDate: '2024-03-12T10:25:30+08:00',
	precision: 'ymd' as const,
	annualReminder: true,
};
const album = {
	id: 1,
	folder: 'Pictures',
	intervalSec: 8,
	recursive: true,
	ratio: '1:1' as const,
	transition: 'fade' as const,
	heightRatio: 'full' as const,
};
function boardFor(state: string): DashboardData {
	const active =
		state === 'default'
			? specs.filter((s) => ['clock', 'year-progress', 'section-memo', 'section-sticky'].includes(s.key))
			: specs.filter((s) => s.key === state);
	const board: DashboardData = { quickActions: [], widgets: [], columns: [], grid: { v: 2, lg: [] } };
	for (const [i, spec] of active.entries()) {
		const id = spec.section
			? `section-${spec.section}`
			: `home:${spec.key}:${spec.key === 'album' ? '1' : ['countdown', 'anniversary'].includes(spec.key) ? spec.key : 'default'}`;
		if (spec.section)
			board.columns.push({
				id,
				name: t(`home.dashboard.section.${spec.section}`),
				color: '',
				sectionType: spec.section,
				cards: [],
				...(spec.section === 'dataview'
					? { dataviewConfig: { query: 'TABLE file.name FROM "Notes"', excludeFolders: [] } }
					: {}),
				...(spec.section === 'rss' ? { rssConfig: { feeds: [], downloadFolder: DEFAULT_RSS_FOLDER } } : {}),
			});
		else
			board.widgets!.push({
				memberId: id,
				provider: 'home',
				kind: spec.key,
				instanceId:
					spec.key === 'album' ? '1' : ['countdown', 'anniversary'].includes(spec.key) ? spec.key : 'default',
			});
		board.grid!.lg.push({
			i: spec.section ? id : `widget:${widgetPresentationKey(board.widgets!.at(-1)!)}`,
			x: 0,
			y: i * 4,
			w: 12,
			h: 4,
		});
	}
	return board;
}
async function bootstrap() {
	const docs = await readyDocuments(document);
	Object.defineProperty(globalThis, 'activeWindow', { configurable: true, get: () => docs.main.defaultView });
	Object.defineProperty(globalThis, 'activeDocument', { configurable: true, get: () => docs.main });
	let currentTheme = themeSettings.defaults();
	const themeListeners = new Set<() => void>(),
		themeCleanup: Array<() => void> = [];
	const themeHandle: ConstructorParameters<typeof ThemeRuntime>[0] = {
		get: () => currentTheme,
		async update(recipe) {
			const draft = structuredClone(currentTheme);
			currentTheme = recipe(draft) ?? draft;
			for (const notify of themeListeners) notify();
		},
		select(selector, listener, equal = Object.is) {
			let previous = selector(currentTheme);
			const notify = () => {
				const next = selector(currentTheme);
				if (!equal(next, previous)) {
					const old = previous;
					previous = next;
					listener(next, old);
				}
			};
			themeListeners.add(notify);
			return () => {
				themeListeners.delete(notify);
			};
		},
		subscribe(fn) {
			themeListeners.add(fn);
			return () => {
				themeListeners.delete(fn);
			};
		},
		async touch() {
			for (const notify of themeListeners) notify();
		},
	};
	new ThemeRuntime(themeHandle).attach({
		app: {
			workspace: {
				iterateAllLeaves: (visit: (leaf: unknown) => void) =>
					visit({ view: { containerEl: docs.second.body } }),
				on: () => ({}),
			},
		},
		registerEvent: () => {},
		register: (cleanup: () => void) => themeCleanup.push(cleanup),
	} as unknown as Plugin);
	const owners: Record<
		string,
		{
			root: Root;
 preferenceStore:SettingsStore;
 metadataEvents:Set<object>;
			host: HTMLElement;
			store: BoardStore;
			home: HomeHost;
			configure(sample: Record<string, unknown>): void;
			render(): void;
			show(state: string): Promise<void>;
			fail: boolean;
			state: string;
			vault: ReturnType<typeof memoryVault>;
		}
	> = {};
	let rawTasks: string | null = null;
	const tasks = createTaskService({
		deviceId: 'home-review',
		repository: createTaskRepository({
			read: async () => rawTasks,
			process: async (update) => {
				rawTasks = update(rawTasks);
				return rawTasks;
			},
		}),
	});
	await tasks.load();
	const today = new Date().toLocaleDateString('sv-SE');
	await tasks.execute({
		kind: 'create',
		commandId: 'home-review',
		draft: {
			title: 'Review the draft',
			description: 'Keep metadata outside completion styling',
			timezone: 'UTC',
			relations: [],
			due: { date: today },
			planDate: today,
		},
	});
	const resources: TaskResources = {
		search: async () => [],
		resolve: async (resource) => ({
			resource,
			status: 'missing',
			label: resource.kind === 'archive' ? resource.id : resource.path,
		}),
		open: async () => {},
	};
	const taskAbort = new AbortController();
	const views: TaskViews = {
		mount: (host, options) => mountTasks(host, tasks, resources, views, options?.compact),
		open: async () => {},
		edit: (request) => editTask(request, tasks, resources, taskAbort.signal),
	};
	homeServices.taskViews = views;
	const taskCalendar = createTaskCalendar(tasks, views);
	homeServices.calendar = taskCalendar;
	let records:
		| { habit: HabitService; expense: ExpenseService; pomodoro: PomodoroService; reading: ReadingService }
		| undefined;
	for (const [name, doc] of Object.entries(docs)) {
		const win = doc.defaultView as Window & typeof globalThis;
		Object.defineProperties(win.HTMLElement.prototype, {
			win: {
				configurable: true,
				get(this: HTMLElement) {
					return this.ownerDocument.defaultView;
				},
			},
			doc: {
				configurable: true,
				get(this: HTMLElement) {
					return this.ownerDocument;
				},
			},
		});
		Object.assign(win.HTMLElement.prototype, {
			createDiv(this: HTMLElement, o: { cls?: string; text?: string } = {}) {
				const n = doc.createElement('div');
				n.className = o.cls ?? '';
				n.textContent = o.text ?? '';
				this.append(n);
				return n;
			},
			empty(this: HTMLElement) {
				this.replaceChildren();
			},
			addClass(this: HTMLElement, ...classes: string[]) {
				this.classList.add(...classes);
			},
			removeClass(this: HTMLElement, ...classes: string[]) {
				this.classList.remove(...classes);
			},
			setCssProps(this: HTMLElement, props: Record<string, string>) {
				for (const [key, value] of Object.entries(props)) this.style.setProperty(key, value);
			},
		});
		const host = doc.createElement('main');
		host.className = 'huhu-ui';
		host.dataset.huhuLeaf = '';
		host.style.height = '100vh';
		doc.body.append(host);
		const settings: DashboardSettings = {
			...structuredClone(DEFAULT_DASHBOARD_SETTINGS),
			countdowns: [countdown],
			anniversaries: [anniversary],
			albums: [album],
			bgImage: '',
			widgetWeatherCity: '',
			widgetWeatherLat: 0,
			widgetWeatherLon: 0,
		};
		const vault = memoryVault(
			{
				'.huhu/dashboards/Review.md': serialize(boardFor('default')),
				'Notes/Welcome.md': '# Welcome\nA real note.',
				'huhu/inbox/2026-11-05-0900-Read.md': '# Read this\nInbox content',
				'Pictures/cover.svg':
					'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="teal"/></svg>',
			},
			win,
		);
		Object.assign(vault.app.vault,{getAllLoadedFiles:()=>{const folders=new Set<string>();for(const file of vault.app.vault.getFiles()){const parts=file.path.split('/');for(let i=1;i<parts.length;i++)folders.add(parts.slice(0,i).join('/'));}return [...vault.app.vault.getFiles(),...[...folders].map(path=>({path,children:[]}))];}});
		const preferenceStore=new SettingsStore({load:async()=>null,save:async(_scope,file)=>file},{timers:{set:(cb,ms)=>win.setTimeout(cb,ms),clear:id=>win.clearTimeout(id as number)}});await preferenceStore.load();await initializeVaultPreferences(vault.app,preferenceStore);
		const metadataEvents=new Set<object>();Object.assign(vault.app.metadataCache,{on:(event:string,callback:(...args:unknown[])=>void)=>{const ref={event,callback};metadataEvents.add(ref);return ref;},offref:(ref:object)=>metadataEvents.delete(ref)});
		Object.assign(vault.app.workspace, { containerEl: host, onLayoutReady: (callback: () => void) => callback() });
		const listeners = new Set<() => void>();
		const home = {
			app: vault.app,
			settings,
			manifest: { id: 'huhu' },
			saveSettings: async () => {
				if (owners[name]?.fail) throw Error('Controlled save rejection');
				for (const fn of listeners) fn();
			},
			subscribeSettings: (fn: () => void) => {
				listeners.add(fn);
				return () => listeners.delete(fn);
			},
			workbenchRefresh: () => {},
			refreshAllDashboards: () => {},
			openSettings: () => {},
			runCommand: () => false,
		} as unknown as HomeHost;
		if (!records) {
			const serviceHost = home as unknown as WidgetSettingsHost;
			const habit = new HabitService(serviceHost),
				expense = new ExpenseService(serviceHost),
				pomodoro = new PomodoroService(serviceHost),
				reading = new ReadingService(serviceHost);
			await Promise.all([habit.load(), expense.load(), pomodoro.loadSessions(), reading.loadSessions()]);
			habit.addHabit('Write one paragraph');
			await reading.addActiveBook({
				id: 'fixture-book',
				title: 'The craft of notes',
				author: 'A. Reader',
				coverUrl: '',
				isbn: '',
				source: 'manual',
				currentPage: 12,
				totalPages: 200,
				finished: false,
			});
			expense.addRecord({ type: 'expense', amount: 12.5, category: 'food', date: today, note: 'Lunch' });
			records = { habit, expense, pomodoro, reading };
			Object.assign(homeServices, records);
			homeServices.widgets = indexWidgetProviders([
				{
					module: 'home',
					bundle: builtinHomeWidgets(
						() => home.settings,
						() => {},
					),
				},
			]);
		}
		await contentFiles(vault.app).refresh();
		const store = new BoardStore(home, '.huhu/dashboards/Review', win);
		await store.init();
		const root = createRoot(host);
		let state = 'default';
		const render = () =>
			flushSync(() =>
				root.render(
					<HuhuProviders ownerDocument={doc}>
						<DesignScope>
							<div data-review-state={state} className="h-full min-h-0">
								{state === 'analytics-custom' ? (
									<CustomAnalyticsRange />
								) : state === 'countdown-config' ? (
									<CountdownEditor
										initial={countdown}
										onSave={async () => {
											if (owners[name]!.fail) throw Error('Controlled save rejection');
										}}
										onClose={() => {}}
									/>
								) : state === 'anniversary-config' ? (
									<AnniversaryEditor initial={anniversary} onSave={() => {}} onClose={() => {}} />
								) : state === 'album-config' ? (
									<AlbumEditor app={vault.app} initial={album} onSave={() => {}} onClose={() => {}} />
								) : state === 'settings' ? (
									<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 pb-12 @min-[600px]:p-6"><DashboardSettingsPage host={home} /></div>
								) : state === 'appearance' ? (
									<AppearanceStudio host={home} onClose={() => {}} />
								) : (
									<DashboardPage store={store} context={{} as never} />
								)}
							</div>
						</DesignScope>
					</HuhuProviders>,
				),
			);
		const owner = {
			root,
 preferenceStore,
 metadataEvents,
			host,
			store,
			home,
			configure(sample: Record<string, unknown>) {
				currentTheme = themeSettings.normalize({
					preset: sample.theme,
					accent: sample.accent,
					density: sample.density,
					uiSize: sample.uiSize,
					motion: sample.motion,
					source: sample.source,
				});
				for (const notify of themeListeners) notify();
			},
			render,
			fail: false,
			state,
			vault,
			async show(next: string) {
 store.setDialog(null);
				state = next;
				owner.state = next;
				owner.fail = false;
				if (next !== 'loading')
					await store.sync.replaceData(
						next === 'empty'
							? { quickActions: [], columns: [], widgets: [], grid: { v: 2, lg: [] } }
							: boardFor(
									next === 'unavailable'
										? 'usage'
										: next === 'query-error'
											? 'section-dataview'
											: next,
								),
					);
				if (next === 'loading') store.state.setState({ data: null });
				if (next === 'query-error') {
					const data = structuredClone(store.state.getState().data!);
					data.columns[0]!.dataviewConfig!.query = 'THIS IS NOT A QUERY';
					await store.sync.replaceData(data);
				}
				if (next === 'catalog') store.setDialog('section');
				render();
			},
		};
		owners[name] = owner;
		const write = vault.adapter.write.bind(vault.adapter);
		vault.adapter.write = async (path, text) => {
			if (owner.fail) throw Error('Controlled write rejection');
			return write(path, text);
		};
	}
	for (const owner of Object.values(owners)) owner.render();
	Object.assign(globalThis, {
		uiReview: {
			docs,
			owners,
			states,
			surfaces: specs.map((s) => ({ key: s.key, sizes: s.sizes, multiple: !!s.multiple })),
			text: t,
			async show(name: string, state: string) {
				await owners[name]!.show(state);
			},
			configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
 configureFixtureHost(docs,sample);
				for (const [name, doc] of Object.entries(docs)) {
					doc.body.className = sample.theme === 'ink' ? 'theme-dark' : 'theme-light';
					owners[name]!.configure(sample);
					owners[name]!.render();
				}
			},
			async dispose() {
				for (const owner of Object.values(owners)) {
					owner.root.unmount();
					await owner.store.dispose();await owner.preferenceStore.dispose();if(owner.metadataEvents.size)throw Error('Fixture metadata listeners were not disposed');
					owner.host.remove();
				}
				for (const cleanup of themeCleanup) cleanup();
				taskCalendar.dispose();
				taskAbort.abort();
				await tasks.dispose();
				for (const service of Object.values(records!)) service.destroy();
			},
		},
	});
}
(globalThis as typeof globalThis & { uiReviewStartup?: Promise<void> }).uiReviewStartup = bootstrap();
