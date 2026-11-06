import { afterEach, expect, test, vi } from 'vitest';
import type { App, PluginManifest } from 'obsidian';
import type { ModuleContext } from './contracts/module';
import type { VaultDevice } from '../shared/storage/vault-identity';
import DashboardPlugin from './main';
import { IntroModal } from './intro-modal';
import { domainEventKey } from '../shared/events/domain-events';

const harness = vi.hoisted(() => ({
	contexts: [] as ModuleContext[], mountSettings: new Error('host settings mount boundary'),
	initializeDevice: vi.fn(async (_app: App, _options: { chooseDevice: (devices: readonly VaultDevice[]) => Promise<unknown> }) => {}),
	chooseDevice: vi.fn(async (_app: App, _devices: readonly VaultDevice[], _signal?: AbortSignal) => 'selected'),
	contentRefresh: vi.fn(async () => {}),
	recoveryReady: vi.fn(async () => {}),
	settingsReady: vi.fn(async () => {}),
	afterSettingsReady: vi.fn(async () => {}),
	settingsDispose: vi.fn(async () => {}),
	realRecovery: false,
	notices: [] as string[],
}));

// The host owns Component unload and settings UI. Event ports, main.onload, context creation and registry are real.
vi.mock('obsidian', async importOriginal => {
	const original = await importOriginal<typeof import('obsidian')>();
	class Component {
		private cleanups: Array<() => void> = [];
		private children = new Set<Component>();
		register(cleanup: () => void) { this.cleanups.push(cleanup); }
		addChild<T extends Component>(child: T): T { this.children.add(child); return child; }
		removeChild(child: Component) { child.unload(); this.children.delete(child); }
		unload() {
			for (const child of this.children) child.unload();
			this.children.clear();
			for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
		}
	}
	return {
		...original,
		Notice: class { constructor(message: string) { harness.notices.push(message); } },
		Component,
		// Native modal rendering is outside this composition/lifetime wiring test.
		Modal: class { constructor(readonly app: App) {} open() {} close() {} },
		ItemView: class {},
		Plugin: class extends Component {
			constructor(readonly app: App, readonly manifest: PluginManifest) { super(); }
			registerEvent() {}
			registerView() {}
			registerEditorExtension() {}
			registerMarkdownPostProcessor() {}
			addCommand<T>(command: T): T { return command; }
			removeCommand() {}
			addSettingTab() { throw harness.mountSettings; }
		},
	};
});

// Filesystem/device initialization is outside the event assembly under test.
vi.mock('../host/obsidian/storage/device-id', () => ({ initializeDevice: harness.initializeDevice, desktopMachineIdentity: {}, vaultIdentity: () => ({}) }));
vi.mock('./device-choice', () => ({ chooseVaultDevice: harness.chooseDevice }));
vi.mock('../host/obsidian/storage/content-files', () => ({ contentFiles: () => ({ refresh: harness.contentRefresh }) }));
vi.mock('./recovery', () => ({
	createRecoveryHost: () => ({ recoverBeforeStart: harness.recoveryReady }), settingsOwner: vi.fn(),
}));
vi.mock('./recovery-start', async importOriginal => {
	const actual = await importOriginal<typeof import('./recovery-start')>();
	return {
		startRecovery: async (app: App, signal: AbortSignal) => {
			if (harness.realRecovery) return actual.startRecovery(app, signal);
			await harness.recoveryReady(); return {};
		},
		afterSettings: async () => { await harness.afterSettingsReady(); },
	};
});
vi.mock('./settings/runtime', async () => {
	const { appSchema } = await import('./settings/app-schema');
	const { themeSettings } = await import('../theme/settings');
	return {
		defaultLanguage: () => 'en',
		loadSettingsRuntime: async () => {
			const value = appSchema('en').defaults();
			await harness.settingsReady();
			return {
				ns: { app: { get: () => value, update: async (change: (draft: typeof value) => void) => { change(value); } } },
				store: { dispose: harness.settingsDispose },
				theme: { get: () => themeSettings.defaults(), subscribe: () => () => {} },
			};
		},
	};
});
vi.mock('./manifests', () => ({
	MANIFESTS: ['home', 'task'].map((id, order) => ({
		id, order, icon: 'file', titleKey: id, descriptionKey: id,
		platforms: { desktop: true, mobile: true }, defaultEnabled: true, activation: 'startup',
		load: async () => ({ default: (context: ModuleContext) => {
			harness.contexts.push(context);
			return { dispose() {} };
		} }),
	})),
}));

const plugins: DashboardPlugin[] = [];
afterEach(() => {
	for (const plugin of plugins.splice(0)) {
		plugin.onunload();
		plugin.unload();
	}
	harness.contexts.length = 0;
	harness.initializeDevice.mockClear();
	harness.chooseDevice.mockClear();
	harness.contentRefresh.mockClear();
	harness.recoveryReady.mockClear();
	harness.settingsReady.mockClear();
	harness.afterSettingsReady.mockClear();
	harness.settingsDispose.mockClear();
	harness.realRecovery = false;
	harness.notices.length = 0;
	vi.restoreAllMocks();
});

function createPlugin() {
	const app = {
		vault: { adapter: {} },
		workspace: {
			containerEl: document.createElement('div'), layoutReady: false,
			on: () => ({}), offref() {}, iterateAllLeaves() {}, getActiveViewOfType: () => null,
		},
	} as unknown as App;
	const plugin = new DashboardPlugin(app, { id: 'huhu', name: 'HUHU', version: '0.0.2', minAppVersion: '1.13.0', author: 'test', description: '' });
	plugins.push(plugin);
	return { plugin, app };
}

async function start() {
	const { plugin, app } = createPlugin();
	// Stop at the external settings UI boundary, after the real registry activated the fixture modules.
	await expect(plugin.onload()).rejects.toBe(harness.mountSettings);
	return { plugin, contexts: harness.contexts.filter(context => context.app === app) };
}

const changed = domainEventKey<{ id: string }>('archives:changed');

test('main injects one shared port per plugin and keeps two plugin instances isolated', async () => {
	const first = await start();
	const second = await start();
	expect(first.contexts).toHaveLength(2);
	expect(second.contexts).toHaveLength(2);
	const one = first.contexts[0]!;
	const two = second.contexts[0]!;
	expect(one.events).toBeDefined();
	expect(first.contexts[1]!.events).toBe(one.events);
	expect(two.events).not.toBe(one.events);
	const received: string[] = [];
	one.events.on(changed, ({ id }) => { received.push(`one:${id}`); }, { lifetime: one.lifetime });
	two.events.on(changed, ({ id }) => { received.push(`two:${id}`); }, { lifetime: two.lifetime });
	one.events.emit(changed, { id: 'a' });
	two.events.emit(changed, { id: 'b' });
	expect(received).toEqual(['one:a', 'two:b']);
	await first.plugin.setModuleEnabled('home', false);
	one.events.emit(changed, { id: 'after-module-unload' });
	two.events.emit(changed, { id: 'c' });
	expect(received).toEqual(['one:a', 'two:b', 'two:c']);
	await first.plugin.setModuleEnabled('home', true);
	const reopened = harness.contexts.filter(context => context.app === one.app && context.id === 'home').at(-1)!;
	expect(reopened).not.toBe(one);
	expect(reopened.events).toBe(one.events);
	reopened.events.on(changed, ({ id }) => { received.push(`reopened:${id}`); }, { lifetime: reopened.lifetime });
	reopened.events.emit(changed, { id: 'd' });
	expect(received).toEqual(['one:a', 'two:b', 'two:c', 'reopened:d']);
});

test('plugin unload closes the port itself, including subscriptions without module lifetimes', async () => {
	const first = await start();
	const second = await start();
	const events = first.contexts[0]!.events;
	const otherEvents = second.contexts[0]!.events;
	const received: string[] = [];
	events.on(changed, ({ id }) => { received.push(`one:${id}`); });
	otherEvents.on(changed, ({ id }) => { received.push(`two:${id}`); });
	events.emit(changed, { id: 'before' });
	first.plugin.onunload();
	events.emit(changed, { id: 'after' });
	events.on(changed, () => { received.push('new-after-unload'); });
	events.emit(changed, { id: 'late' });
	otherEvents.emit(changed, { id: 'still-active' });
	expect(received).toEqual(['one:before', 'two:still-active']);
	first.plugin.unload();
});

test('registered owner cleanup closes the port when startup is rolled back by the host', async () => {
	const { plugin, contexts } = await start();
	const events = contexts[0]!.events;
	const received: string[] = [];
	events.on(changed, ({ id }) => { received.push(id); });
	plugin.unload();
	events.emit(changed, { id: 'after-rollback' });
	expect(received).toEqual([]);
});

test('unload rejects a late device request and prevents the pending startup from resuming', async () => {
	let request!: () => Promise<unknown>;
	let release!: () => void;
	harness.initializeDevice.mockImplementationOnce(async (_app, options) => {
		request = () => options.chooseDevice([]);
		await new Promise<void>(resolve => { release = resolve; });
	});
	const app = {
		vault: { adapter: {} },
		workspace: { containerEl: document.createElement('div'), on: () => ({}), offref() {}, iterateAllLeaves() {}, getActiveViewOfType: () => null },
	} as unknown as App;
	const plugin = new DashboardPlugin(app, { id: 'huhu', name: 'HUHU', version: '0.0.2', minAppVersion: '1.13.0', author: 'test', description: '' });
	plugins.push(plugin);
	const loading = plugin.onload().then(() => undefined, error => error as unknown);
	await vi.waitFor(() => { expect(request).toBeTypeOf('function'); });
	plugin.onunload();
	plugin.unload();
	const choice = await request().then(() => 'resolved', () => 'rejected');
	release();
	const outcome = await loading;
	expect(choice).toBe('rejected');
	expect(harness.chooseDevice).not.toHaveBeenCalled();
	expect(outcome).toBeUndefined();
	expect(harness.contexts.filter(context => context.app === app)).toHaveLength(0);
});

test('the active device dialog receives the plugin abort signal and startup exits on unload', async () => {
	harness.initializeDevice.mockImplementationOnce(async (_app, options) => { await options.chooseDevice([]); });
	harness.chooseDevice.mockImplementationOnce(async (_app, _devices, signal) => {
		if (!signal) throw new Error('missing plugin abort signal');
		return new Promise<string>((_resolve, reject) => {
			signal.addEventListener('abort', () => { reject(new Error('cancelled by plugin owner')); }, { once: true });
		});
	});
	const app = {
		vault: { adapter: {} },
		workspace: { containerEl: document.createElement('div'), on: () => ({}), offref() {}, iterateAllLeaves() {}, getActiveViewOfType: () => null },
	} as unknown as App;
	const plugin = new DashboardPlugin(app, { id: 'huhu', name: 'HUHU', version: '0.0.2', minAppVersion: '1.13.0', author: 'test', description: '' });
	plugins.push(plugin);
	const loading = plugin.onload().then(() => undefined, error => error as unknown);
	await vi.waitFor(() => { expect(harness.chooseDevice).toHaveBeenCalledOnce(); });
	const signal = harness.chooseDevice.mock.calls[0]?.[2];
	expect(signal).toBeInstanceOf(AbortSignal);
	plugin.onunload(); plugin.unload();
	expect(signal?.aborted).toBe(true);
	expect(await loading).toBeUndefined();
});

test('unload during the initial content refresh prevents later module activation', async () => {
	let release!: () => void;
	harness.contentRefresh.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
	const app = {
		vault: { adapter: {} },
		workspace: { containerEl: document.createElement('div'), on: () => ({}), offref() {}, iterateAllLeaves() {}, getActiveViewOfType: () => null },
	} as unknown as App;
	const plugin = new DashboardPlugin(app, { id: 'huhu', name: 'HUHU', version: '0.0.2', minAppVersion: '1.13.0', author: 'test', description: '' });
	plugins.push(plugin);
	const loading = plugin.onload().then(() => undefined, error => error as unknown);
	await vi.waitFor(() => { expect(release).toBeTypeOf('function'); });
	plugin.onunload(); plugin.unload(); release();
	const outcome = await loading;
	expect(harness.contexts.filter(context => context.app === app)).toHaveLength(0);
	expect(outcome).toBeUndefined();
});

test.each(['recoveryReady', 'settingsReady', 'afterSettingsReady'] as const)(
	'unload while %s waits prevents later startup and disposes any late settings owner', async phase => {
		let release!: () => void;
		harness[phase].mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
		const { plugin, app } = createPlugin();
		const loading = plugin.onload().then(() => undefined, error => error as unknown);
		await vi.waitFor(() => { expect(release).toBeTypeOf('function'); });
		plugin.onunload(); plugin.unload(); release();
		expect(await loading).toBeUndefined();
		expect(harness.contexts.filter(context => context.app === app)).toHaveLength(0);
		expect(harness.settingsDispose).toHaveBeenCalledTimes(phase === 'recoveryReady' ? 0 : 1);
	},
);

test.each([true, false])('real recovery failure preserves reporting only for a live owner; stopped=%s', async stopped => {
	harness.realRecovery = true;
	const gate = Promise.withResolvers<void>();
	harness.recoveryReady.mockImplementationOnce(() => gate.promise);
	const { plugin, app } = createPlugin();
	const failure = new Error('external recovery failed');
	const loading = plugin.onload().then(() => undefined, error => error as unknown);
	await vi.waitFor(() => { expect(harness.recoveryReady).toHaveBeenCalledOnce(); });
	if (stopped) { plugin.onunload(); plugin.unload(); }
	gate.reject(failure);
	const outcome = await loading;
	expect(outcome).toBe(stopped ? undefined : failure);
	expect(harness.notices).toHaveLength(stopped ? 0 : 1);
	expect(harness.contexts.filter(context => context.app === app)).toHaveLength(0);
});

test.each(['settingsReady', 'afterSettingsReady'] as const)('a late %s rejection is silent after the owner stops', async phase => {
	const gate = Promise.withResolvers<void>();
	harness[phase].mockImplementationOnce(() => gate.promise);
	const { plugin } = createPlugin();
	const loading = plugin.onload().then(() => undefined, error => error as unknown);
	await vi.waitFor(() => { expect(harness[phase]).toHaveBeenCalledOnce(); });
	plugin.onunload(); plugin.unload(); gate.reject(new Error('late startup failure'));
	expect(await loading).toBeUndefined();
	expect(harness.notices).toHaveLength(0);
});

test('a deferred enable callback cannot open the workbench after plugin unload', async () => {
	const { plugin } = await start();
	let layout!: () => unknown;
	plugin.app.workspace.onLayoutReady = callback => { layout = callback; };
	const open = vi.spyOn(plugin, 'openWorkbench').mockResolvedValue();
	plugin.onUserEnable(); plugin.onunload(); plugin.unload();
	layout(); await Promise.resolve();
	expect(open).not.toHaveBeenCalled();
});

test('the intro opened by user enable is registered with plugin cleanup', async () => {
	const { plugin } = await start();
	plugin.app.workspace.onLayoutReady = callback => { callback(); };
	vi.spyOn(plugin, 'openWorkbench').mockResolvedValue();
	const opened = vi.spyOn(IntroModal.prototype, 'open').mockImplementation(() => {});
	const cancelled = vi.spyOn(IntroModal.prototype, 'cancel');
	plugin.onUserEnable();
	await vi.waitFor(() => { expect(opened).toHaveBeenCalledOnce(); });
	plugin.onunload(); plugin.unload();
	expect(cancelled).toHaveBeenCalledOnce();
	expect(plugin.appSettings.get().introSeen).toBe(false);
});
