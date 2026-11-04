import { afterEach, expect, test, vi } from 'vitest';
import type { App, PluginManifest } from 'obsidian';
import type { ModuleContext } from './contracts/module';
import DashboardPlugin from './main';
import { domainEventKey } from '../shared/events/domain-events';

const harness = vi.hoisted(() => ({ contexts: [] as ModuleContext[], mountSettings: new Error('host settings mount boundary') }));

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
		Component,
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
vi.mock('../host/obsidian/storage/device-id', () => ({ initializeDevice: async () => {}, desktopMachineIdentity: {}, vaultIdentity: () => ({}) }));
vi.mock('../host/obsidian/storage/content-files', () => ({ contentFiles: () => ({ refresh: async () => {} }) }));
vi.mock('./recovery-start', () => ({ startRecovery: async () => ({}), afterSettings: async () => {} }));
vi.mock('./settings/runtime', async () => {
	const { appSchema } = await import('./settings/app-schema');
	const { themeSettings } = await import('../theme/settings');
	return {
		defaultLanguage: () => 'en',
		loadSettingsRuntime: async () => {
			const value = appSchema('en').defaults();
			return {
				ns: { app: { get: () => value, update: async (change: (draft: typeof value) => void) => { change(value); } } },
				store: { dispose: async () => {} },
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
	vi.restoreAllMocks();
});

async function start() {
	const app = {
		vault: { adapter: {} },
		workspace: {
			containerEl: document.createElement('div'), layoutReady: false,
			on: () => ({}), offref() {}, iterateAllLeaves() {}, getActiveViewOfType: () => null,
		},
	} as unknown as App;
	const plugin = new DashboardPlugin(app, { id: 'huhu', name: 'HUHU', version: '0.0.2', minAppVersion: '1.13.0', author: 'test', description: '' });
	plugins.push(plugin);
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
