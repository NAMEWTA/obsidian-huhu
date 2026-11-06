import { configureFixtureHost } from '../shared/fixture-theme';
import type { App, Plugin, WorkspaceLeaf } from 'obsidian';
import { Platform } from 'obsidian';
import { readyDocuments } from '../shared/ready-documents';
import { memoryVault } from '../../../../fixtures/memory-vault';
import { AutomationService } from '../../../../../src/modules/automations/core/service';
import { createAutomationViewStore } from '../../../../../src/modules/automations/services/view-store';
import { createAutomationsPage } from '../../../../../src/modules/automations/ui/workbench-page';
import type { AutomationViewHost } from '../../../../../src/modules/automations/ui/panel-contract';
import type { WorkbenchPageBinding } from '../../../../../src/app/contracts/workbench-host';
import type {
	AutomationDefinition,
	AutomationAction,
	AgentRuntimePort,
} from '../../../../../src/shared/automation/types';
import { ThemeRuntime } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import { registerMessages, setLanguage } from '../../../../../src/shared/i18n';
import { messages } from '../../../../../src/modules/automations/i18n';

type Entry = {
	host: HTMLElement;
	service: AutomationService;
	binding: WorkbenchPageBinding;
	controller: AbortController;
	view: ReturnType<typeof createAutomationViewStore>;
	io: {
		fail: boolean;
		readFail: boolean;
		calls: number;
		saveCalls: number;
		gate: Promise<void> | null;
		release: (() => void) | null;
	};
	dispose: () => Promise<void>;
};
let docs: { main: Document; second: Document },
	theme = themeSettings.defaults();
const subscribers = new Set<() => void>(),
	cleanup: Array<() => void> = [],
	entries: Record<string, Entry> = {},
	events: unknown[] = [];
const actions: AutomationAction[] = [
	{ kind: 'notify', body: 'A real notification definition' },
	{
		kind: 'agent',
		agentId: 'codex',
		prompt: 'Review the plan',
		cwd: '/vault',
		spaceId: 'space-one',
		sessionMode: 'fresh',
	},
	{ kind: 'script', script: 'echo fixture', cwd: '/vault', spaceId: 'space-one', shell: 'bash' },
	{
		kind: 'create-task',
		text: 'Independent task deadline',
		date: '2030-01-02',
		time: '14:30',
		timezone: 'UTC',
		reminderAt: Date.parse('2030-01-01T09:00:00Z'),
	},
	{ kind: 'obsidian-command', command: 'app:test' },
	{ kind: 'open-file', path: 'Plan.md' },
	{ kind: 'open-url', url: 'https://example.com' },
];
function hostDOM(doc: Document) {
	const win = doc.defaultView!;
	Object.defineProperty(win.Node.prototype, 'instanceOf', {
		configurable: true,
		value(this: Node, type: typeof HTMLElement) {
			return this instanceof type;
		},
	});
	for (const [method, add] of [
		['addClass', true],
		['removeClass', false],
	] as const)
		Object.defineProperty(win.HTMLElement.prototype, method, {
			configurable: true,
			value(this: HTMLElement, ...classes: string[]) {
				for (const cls of classes)
					if (add) this.classList.add(cls);
					else this.classList.remove(cls);
			},
		});
	Object.defineProperty(win.HTMLElement.prototype, 'createDiv', {
		configurable: true,
		value(this: HTMLElement, options: { cls?: string } = {}) {
			const child = this.ownerDocument.createElement('div');
			child.className = options.cls ?? '';
			this.append(child);
			return child;
		},
	});
	Object.defineProperty(win.HTMLElement.prototype, 'win', {
		configurable: true,
		get(this: HTMLElement) {
			return this.ownerDocument.defaultView;
		},
	});
}
async function mount(name: string, scenario = 'normal') {
	await entries[name]?.dispose();
	Platform.isDesktopApp = scenario !== 'unsupported';
	const doc = docs[name as keyof typeof docs],
		m = memoryVault({ 'Plan.md': '# Plan' }, doc.defaultView),
		controller = new AbortController();
	const io: Entry['io'] = { fail: false, readFail: false, calls: 0, saveCalls: 0, gate: null, release: null };
	const originalWrite = m.adapter.write,
		originalRead = m.adapter.read;
	m.adapter.write = async (path, text) => {
		io.calls++;
		if (io.gate) await io.gate;
		if (io.fail) throw Error('Fixture write rejected');
		await originalWrite(path, text);
	};
	m.adapter.read = async (path) => {
		if (io.readFail) throw Error('Fixture read rejected');
		return originalRead(path);
	};
	const agent: AgentRuntimePort = {
		listAgents: () => [{ id: 'codex', title: 'Codex', enabled: true, installed: true }],
		listSpaces: () => [{ id: 'space-one', name: 'Fixture Space', directoryLabel: '/vault' }],
		boundCwd: async () => '/vault',
		listSessions: async () => [
			{
				agentId: 'codex',
				sessionId: 'session-one',
				cwd: '/vault',
				title: 'Existing session',
				modifiedAtMs: 1,
				accountKey: 'account-one',
			},
		],
		start: async () => ({ terminalId: 'fixture-terminal', completion: new Promise(() => {}) }),
		stop: async (id) => {
			events.push({ name, stop: id });
		},
		open: async (id) => {
			events.push({ name, terminal: id });
		},
	};
	const runtimeOptions = { desktop: true };
	const service = new AutomationService(
		m.adapter,
		'.huhu/automation/fixture.json',
		'fixture-device',
		{
			list: async () => [],
			save: async () => {},
			remove: async () => {},
			open: async (source) => {
				events.push({ name, source });
			},
			createTask: async (action, runId, execution) => {
				events.push({ name, task: action, runId, delivery: execution?.run.taskDelivery });
			},
		},
		() => agent,
		async (run) => {
			events.push({ name, notified: run.id });
		},
		true,
		runtimeOptions,
	);
	await service.load();
	if (scenario !== 'empty')
		for (const action of actions)
			await service.save({
				id: action.kind,
				name: `${action.kind} automation`,
				enabled: true,
				deviceId: 'fixture-device',
				revision: 1,
				schedule:
					action.kind === 'notify'
						? { kind: 'once', at: Date.parse('2030-01-02T09:30:00Z') }
						: { kind: 'manual' },
				action,
				channels: ['in-app', 'system'],
				notifyOn: 'always',
				graceMinutes: 60,
				precheck: action.kind === 'script' ? { command: 'echo ready', shell: 'bash' } : undefined,
				link: { path: 'Plan.md', line: 0 },
				createdAt: 1,
				updatedAt: 1,
			});
	if (scenario !== 'empty') await service.run(service.definitions.find((d) => d.id === 'notify')!);
	const originalSave = service.save.bind(service);
	service.save = async (definition) => {
		io.saveCalls++;
		await originalSave(definition);
	};
	const view = createAutomationViewStore(service),
		host = doc.createElement('main');
	host.className = 'huhu-native';
	host.style.cssText = 'height:100%;min-width:0';
	host.dataset.huhuLeaf = '';
	doc.body.append(host);
	const leaf = { view: { containerEl: host } } as unknown as WorkspaceLeaf;
	Object.assign(m.app.workspace, {
		containerEl: doc.body,
		getMostRecentLeaf: () => leaf,
		revealLeaf: async () => {},
	});
	const panel: AutomationViewHost = {
		service,
		store: view.store,
		cwd: '/vault',
		inbox: () => events.push({ name, inbox: true }),
		retry: async () => {
			io.readFail = false;
			await service.load();
		},
		refresh: async () => {
			if (io.gate) await io.gate;
			await service.refresh();
		},
		paths: () => [
			{ path: '/', kind: 'folder' },
			{ path: 'Plan.md', kind: 'file' },
		],
		commands: () => [{ id: 'app:test', name: 'Test command' }],
		openLink: async (link) => {
			events.push({ name, link });
		},
		openCalendarSource: async (delivery, owner) => {
			events.push({ name, delivery, physicalOwner: owner === doc.defaultView });
		},
	};
	const binding = await createAutomationsPage(
		() => panel,
		() => Error('Unavailable'),
	)(
		{
			app: m.app,
			leaf,
			contentEl: host,
			containerEl: host,
			close: () => {},
			changed: () => events.push({ name, target: binding.getTarget?.() }),
		},
		{ feature: 'automations' },
		{},
		controller.signal,
	);
	const entry: Entry = {
		host,
		service,
		binding,
		controller,
		view,
		io,
		dispose: async () => {
			io.release?.();
			io.fail = false;
			io.readFail = false;
			controller.abort();
			await binding.surface.onClose();
			view.dispose();
			// The injected read failure is over; reload the real failed store before durable shutdown.
			if (service.loadError) await service.load();
			await service.shutdown();
			host.remove();
		},
	};
	entries[name] = entry;
	await binding.surface.onOpen();
	if (scenario === 'unsupported') runtimeOptions.desktop = false;
	if (scenario === 'unavailable') await service.setExecutionEnabled(false);
	if (scenario === 'error') {
		io.readFail = true;
		await service.load().catch(() => {});
	}
	if (scenario === 'failed') io.fail = true;
	if (scenario === 'missing')
		await binding.navigate(
			{ feature: 'automations', section: 'tasks', resourceId: 'removed-definition' },
			controller.signal,
		);
}
async function bootstrap() {
	docs = await readyDocuments(document);
	Object.values(docs).forEach(hostDOM);
	registerMessages(messages);
	const handle: ConstructorParameters<typeof ThemeRuntime>[0] = {
		get: () => theme,
		subscribe: (fn) => {
			subscribers.add(fn);
			return () => {
				subscribers.delete(fn);
			};
		},
		async update(recipe) {
			const draft = structuredClone(theme);
			theme = recipe(draft) ?? draft;
			subscribers.forEach((fn) => fn());
		},
		select(selector, listener, equal = Object.is) {
			let before = selector(theme);
			const fn = () => {
				const next = selector(theme);
				if (!equal(next, before)) {
					const previous = before;
					before = next;
					listener(next, previous);
				}
			};
			subscribers.add(fn);
			return () => {
				subscribers.delete(fn);
			};
		},
		async touch() {
			subscribers.forEach((fn) => fn());
		},
	};
	new ThemeRuntime(handle).attach({
		app: {
			workspace: {
				iterateAllLeaves: (visit: (leaf: unknown) => void) =>
					visit({ view: { containerEl: docs.second.body } }),
				on: () => ({}),
			},
		},
		registerEvent: () => {},
		register: (fn: () => void) => cleanup.push(fn),
	} as unknown as Plugin);
	await mount('main');
	await mount('second');
	Object.assign(globalThis, {
		uiReview: {
			docs,
			entries,
			events,
			async configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
				await mount('main');
				await mount('second');
				theme = themeSettings.normalize({
					preset: sample.theme,
					accent: sample.accent,
					source: sample.source,
					density: sample.density,
					uiSize: sample.uiSize,
					motion: sample.motion ?? 'system',
				});
				Object.values(docs).forEach((doc) => {
					doc.body.className = sample.theme === 'ink' ? 'theme-dark' : 'theme-light';
				});
				configureFixtureHost(docs,sample);
subscribers.forEach((fn) => fn());
			},
			async scenario(value: string) {
				await mount('main', value);
				await mount('second', value);
			},
			hold(name: string) {
				const io = entries[name]!.io;
				io.gate = new Promise((done) => {
					io.release = () => {
						io.gate = null;
						io.release = null;
						done();
					};
				});
			},
			release(name: string) {
				entries[name]!.io.release?.();
			},
			async deepLink(name: string, section: string, id: string) {
				const entry = entries[name]!;
				await entry.binding.navigate(
					{ feature: 'automations', section, resourceId: id },
					entry.controller.signal,
				);
			},
			hide(name: string, visible: boolean) {
				const entry = entries[name]!;
				entry.host.hidden = !visible;
				entry.binding.surface.setVisible(visible);
			},
			async dispose() {
				for (const entry of Object.values(entries)) await entry.dispose();
				cleanup.forEach((fn) => fn());
			},
		},
	});
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });
