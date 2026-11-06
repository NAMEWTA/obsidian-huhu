import { useState, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { App, Plugin } from 'obsidian';
import { readyDocuments } from '../shared/ready-documents';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { TaskPage } from '../../../../../src/modules/task/ui/TaskPage';
import { editTask } from '../../../../../src/modules/task/ui/runtime';
import { createTaskRepository } from '../../../../../src/modules/task/platform/repository';
import { createTaskService, type OwnedTaskService } from '../../../../../src/modules/task/services/service';
import { createTaskCalendar } from '../../../../../src/modules/task/services/calendar';
import type { TaskDraft, TaskService, TaskResources, TaskViews } from '../../../../../src/modules/task/api';
import { wallTime } from '../../../../../src/modules/task/core/time';
import { CalendarAgenda } from '../../../../../src/ui/components/huhu/calendar/CalendarAgenda';
import { CalendarMonth } from '../../../../../src/ui/components/huhu/calendar/CalendarMonth';
import { HomeCalendarMonth } from '../../../../../src/modules/home/ui/calendar/HomeCalendarMonth';
import { MonthGrid, WeekTimeGrid } from '../../../../../src/modules/home/ui/calendar/CalendarGrids';
import { DashboardRenderContext } from '../../../../../src/modules/home/ui/renderer/render-context';
import type { VaultTask } from '../../../../../src/modules/home/platform/calendar/alltasks-scan';
import { ThemeRuntime } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import { setLanguage, registerMessages, t } from '../../../../../src/shared/i18n';
import { messages as taskWords } from '../../../../../src/modules/task/i18n';
import { messages as calendarWords } from '../../../../../src/shared/i18n/lazy/calendar';
import { messages as homeWords } from '../../../../../src/modules/home/i18n';

type Scenario = 'normal' | 'empty' | 'loading' | 'error' | 'unavailable' | 'failed';
type Entry = {
	root: Root;
	host: HTMLElement;
	tasks: OwnedTaskService;
	service: TaskService;
	scenario: Scenario;
	notify: () => void;
	writes: number;
	fail: boolean;
	controller: AbortController;
	calendar: ReturnType<typeof createTaskCalendar>;
};
const entries: Record<string, Entry> = {},
	events: unknown[] = [];
let documents: { main: Document; second: Document };
let currentTheme = themeSettings.defaults();
const themeSubscribers = new Set<() => void>(),
	themeCleanup: Array<() => void> = [];
function Probe({ entry, name }: { entry: Entry; name: string }) {
	const [anchor, setAnchor] = useState(new Date(2027, 0, 31)),
		[selected, setSelected] = useState('2027-01-31');
	const [weeks, setWeeks] = useState(1),
		[weekStart, setWeekStart] = useState<0 | 1 | 6>(1),
		[homeDay, setHomeDay] = useState<string>();
	const resources: TaskResources = {
		search: async () => [
			{ resource: { kind: 'file', path: 'Plan.md' }, status: 'available', label: 'Plan', path: 'Plan.md' },
		],
		resolve: async (resource) => ({
			resource,
			status: 'available',
			label: resource.kind === 'archive' ? resource.id : resource.path,
		}),
		open: async (resource, owner) => {
			events.push({ name, resource, owner: owner === entry.host.ownerDocument.defaultView });
		},
	};
	const views: TaskViews = {
		open: async (id) => {
			events.push({ name, open: id });
		},
		mount: () => () => {},
		edit: (request) => editTask(request, entry.service, resources, entry.controller.signal),
	};
	const state = useSyncExternalStore(entry.service.subscribe, entry.service.snapshot);
	const rows = entry.calendar.snapshot({ from: '2026-11-01', to: '2026-11-30' });
	const byDay = new Map(
		[...rows.byDay].map(([iso, tasks]) => [
			iso,
			tasks.map(
				(task) =>
					({
						...task,
						file: { path: task.path, name: 'tasks.json', basename: 'tasks', extension: 'json' },
					}) as VaultTask,
			),
		]),
	);
	const app = {} as App,
		context = new DashboardRenderContext(entry.host);
	return (
		<>
			<section data-review="tasks" style={{ height: 680, minWidth: 0 }}>
				<TaskPage tasks={entry.service} views={views} resources={resources} />
			</section>
			<section data-review="product-month" style={{ width: 272, maxWidth: '100%', marginTop: 24 }}>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						data-calendar-reset
						onClick={() => {
							setAnchor(new Date(2027, 0, 31));
							setSelected('2027-01-31');
						}}
					>
						Reset calendar
					</button>
					{[1, 2, 3, 4, 5, 6].map((value) => (
						<button type="button" data-week-count={value} key={value} onClick={() => setWeeks(value)}>
							{value}
						</button>
					))}
					{([0, 1, 6] as const).map((value) => (
						<button
							type="button"
							data-week-start={value}
							key={`start-${value}`}
							onClick={() => setWeekStart(value)}
						>{`Start ${value}`}</button>
					))}
				</div>
				<CalendarMonth
					anchor={anchor}
					onAnchor={setAnchor}
					selected={selected}
					onSelect={(value) => {
						setSelected(value);
						events.push({ name, date: value });
					}}
					weekStart={weekStart}
					weeks={weeks}
					weekNumbers
					day={(iso) => ({ note: iso === '2027-01-31' ? 'existing' : 'missing', tasks: 1, openTasks: 1 })}
					periods={[
						{ period: 'day', status: 'existing' },
						{ period: 'week', status: 'existing' },
					]}
					onNote={(period, iso, action) => events.push({ name, period, iso, action })}
					onToday={() => {
						setAnchor(new Date(2027, 0, 31));
						setSelected('2027-01-31');
					}}
				/>
			</section>
			<section data-review="home-month" style={{ maxWidth: '100%', marginTop: 24 }}>
				<HomeCalendarMonth
					anchor={new Date(2026, 10, 5)}
					selected="2026-11-05"
					onAnchor={() => {}}
					onSelect={(value) => events.push({ name, homeDate: value })}
					onToday={() => {}}
					byDay={byDay}
				/>
			</section>
			<section data-review="home-full-month" style={{ maxWidth: '100%', marginTop: 24 }}>
				<MonthGrid
					year={2026}
					month={10}
					byDay={byDay}
					context={context}
					opts={{
						app,
						compact: false,
						onDayNumClick: (value) => {
							setHomeDay(value);
							events.push({ name, agenda: value });
						},
						onToggle: async (task, checked) => {
							const result = await entry.calendar.toggleTask(task, checked);
							if ('code' in result) throw Error(result.code);
						},
						onOpenNote: (_file, _line, task) => {
							events.push({ name, task: task?.id });
						},
					}}
				/>
			</section>
			{homeDay && (
				<section data-review="home-real-agenda" style={{ minHeight: 320, marginTop: 16 }}>
					<CalendarAgenda
						date={homeDay}
						status={rows.status}
						tasks={(byDay.get(homeDay) ?? []).map((task) => ({
							id: task.id!,
							text: task.text,
							checked: task.checked,
							source: task.path,
							time: task.time,
						}))}
						onToggle={async (id, checked) => {
							const task = (byDay.get(homeDay) ?? []).find((task) => task.id === id);
							if (task) {
								const result = await entry.calendar.toggleTask(task, checked);
								if ('code' in result) throw Error(result.code);
							}
						}}
						onEdit={(id) => {
							void editTask({ owner: entry.host, id }, entry.service, resources, entry.controller.signal);
						}}
						onRemind={(id) => {
							events.push({ name, remind: id });
							void editTask({ owner: entry.host, id }, entry.service, resources, entry.controller.signal);
						}}
						onOpenSource={(id) => events.push({ name, source: id })}
						onAdd={async (text, time) => {
							const result = await entry.calendar.createTask({
								date: homeDay,
								text,
								time: time || undefined,
								strictTime: true,
							});
							return !('code' in result);
						}}
					/>
				</section>
			)}
			<section data-review="home-week" style={{ maxWidth: '100%', marginTop: 24 }}>
				<WeekTimeGrid
					weekStart={new Date(2026, 10, 2)}
					byDay={byDay}
					context={context}
					opts={{
						app,
						compact: false,
						onOpenNote: (_file, _line, task) => {
							events.push({ name, task: task?.id });
						},
					}}
				/>
			</section>
			<output data-fixture-status>{state.status}</output>
		</>
	);
}
async function mount(name: string, scenario: Scenario) {
	const doc = documents[name as keyof typeof documents];
	const previous = entries[name];
	if (previous) {
		previous.controller.abort();
		previous.root.unmount();
		previous.calendar.dispose();
		await previous.tasks.dispose();
		previous.host.remove();
	}
	let raw: string | null = null,
		writes = 0,
		fail = scenario === 'failed';
	const tasks = createTaskService({
		deviceId: `fixture-${name}`,
		now: () => wallTime('2026-11-05', '12:00', 'UTC'),
		remindersAvailable: () => true,
		repository: createTaskRepository({
			read: async () => raw,
			process: async (change) => {
				if (fail) throw Error('fixture write rejection');
				const next = change(raw);
				writes++;
				raw = next;
				return next;
			},
		}),
	});
	await tasks.load();
	if (scenario !== 'empty' && scenario !== 'loading') {
		fail = false;
		for (const [id, title, date] of [
			['today', 'Plan today', '2026-11-05'],
			['future', 'Future task', '2026-11-12'],
			['done', 'Completed task', '2026-11-04'],
		] as const) {
			const draft: TaskDraft = {
				title,
				description: 'Description · 说明',
				timezone: 'UTC',
				relations: [{ kind: 'file', path: 'Plan.md' }],
				due: { date },
				planDate: date,
			};
			await tasks.execute({ kind: 'create', commandId: id, draft });
		}
		await tasks.execute({ kind: 'complete', commandId: 'done-complete', id: 'task:done', expectedRevision: 1 });
		fail = scenario === 'failed';
	}
	let cachedBase = tasks.snapshot(),
		cached = cachedBase;
	const listeners = new Set<() => void>();
	const notify = () => {
		cachedBase = tasks.snapshot();
		cached =
			scenario === 'loading' || scenario === 'error' || scenario === 'unavailable'
				? {
						...cachedBase,
						status: scenario,
						...(scenario === 'error'
							? { error: { code: 'write-failed' as const, message: 'fixture load error' } }
							: {}),
					}
				: cachedBase;
		for (const listener of listeners) listener();
	};
	const service: TaskService = {
		...tasks,
		snapshot: () => {
			if (cachedBase !== tasks.snapshot()) notify();
			return cached;
		},
		subscribe: (listener) => {
			listeners.add(listener);
			const off = tasks.subscribe(notify);
			return () => {
				listeners.delete(listener);
				off();
			};
		},
		execute: (...args) => tasks.execute(...args),
	};
	notify();
	const host = doc.createElement('main');
	host.className = 'huhu-ui';
	host.dataset.huhuLeaf = '';
	doc.body.append(host);
	const controller = new AbortController(),
		calendar = createTaskCalendar(tasks, { edit: async () => {}, open: async () => {}, mount: () => () => {} });
	const entry: Entry = {
		host,
		root: createRoot(host),
		tasks,
		service,
		scenario,
		notify,
		get writes() {
			return writes;
		},
		set writes(_value) {},
		get fail() {
			return fail;
		},
		set fail(value) {
			fail = value;
		},
		controller,
		calendar,
	};
	entries[name] = entry;
	entry.root.render(
		<HuhuProviders ownerDocument={doc}>
			<Probe entry={entry} name={name} />
		</HuhuProviders>,
	);
}
async function bootstrap() {
	documents = await readyDocuments(document);
	const themeHandle: ConstructorParameters<typeof ThemeRuntime>[0] = {
		get: () => currentTheme,
		subscribe: (listener) => {
			themeSubscribers.add(listener);
			return () => {
				themeSubscribers.delete(listener);
			};
		},
		async update(recipe) {
			const draft = structuredClone(currentTheme);
			currentTheme = recipe(draft) ?? draft;
			for (const listener of themeSubscribers) listener();
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
			themeSubscribers.add(notify);
			return () => {
				themeSubscribers.delete(notify);
			};
		},
		async touch() {
			for (const listener of themeSubscribers) listener();
		},
	};
	new ThemeRuntime(themeHandle).attach({
		app: {
			workspace: {
				iterateAllLeaves: (visit: (leaf: unknown) => void) =>
					visit({ view: { containerEl: documents.second.body } }),
				on: () => ({}),
			},
		},
		registerEvent: () => {},
		register: (callback: () => void) => themeCleanup.push(callback),
	} as unknown as Plugin);
	registerMessages(taskWords);
	registerMessages(calendarWords);
	registerMessages(homeWords);
	for (const doc of Object.values(documents)) {
		Object.defineProperty(doc.defaultView!.Node.prototype, 'instanceOf', {
			configurable: true,
			value(this: Node, type: typeof HTMLElement) {
				return this instanceof type;
			},
		});
		Object.defineProperty(doc.body, 'createDiv', {
			configurable: true,
			value: (options?: { cls?: string }) => {
				const node = doc.createElement('div');
				node.className = options?.cls ?? '';
				doc.body.append(node);
				return node;
			},
		});
	}
	await mount('main', 'normal');
	await mount('second', 'normal');
	Object.assign(globalThis, {
		uiReview: {
			docs: documents,
			entries,
			events,
			async scenario(value: Scenario) {
				await mount('main', value);
				await mount('second', value);
			},
			async configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
				await mount('main', 'normal');
				await mount('second', 'normal');
				currentTheme = themeSettings.normalize({
					preset: sample.theme,
					accent: sample.accent,
					source: sample.source,
					density: sample.density,
					uiSize: sample.uiSize,
					motion: sample.motion ?? 'system',
				});
				for (const doc of Object.values(documents))
					doc.body.className = sample.theme === 'ink' ? 'theme-dark' : 'theme-light';
				for (const listener of themeSubscribers) listener();
			},
			async dispose() {
				for (const entry of Object.values(entries)) {
					entry.controller.abort();
					entry.root.unmount();
					entry.calendar.dispose();
					await entry.tasks.dispose();
					entry.host.remove();
				}
				for (const cleanup of themeCleanup) cleanup();
			},
		},
	});
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });
