import { afterEach, expect, test, vi } from 'vitest';
import { Platform, type Command, type WorkspaceLeaf } from 'obsidian';
import type DashboardPlugin from '../main';
import type { ModuleContext, ModuleId, ModuleManifest } from '../contracts/module';
import type { PageCreate, WorkbenchHost } from '../contracts/workbench-host';
import type { NativeSurfaceContext } from '../../ui/native-surface';
import { ModuleRegistry } from '../modules/registry';
import { MANIFESTS } from '../manifests';
import { registerShellCommands } from '../commands';
import { composeWorkbench } from './compose-workbench';
import { cleanPageState, normalizeTarget, normalizeWorkbenchState } from '../../shell/navigation-state';

vi.mock('./surfaces/obsidian-status', () => ({ registerObsidianStatus: () => ({ refresh() {}, dispose() {} }) }));
vi.mock('./surfaces/ribbon', () => ({ registerWorkbenchRibbon() {} }));
vi.mock('./workbench-leaf', () => ({
	WORKBENCH_VIEW_TYPE: 'huhu-workbench-view',
	WorkbenchView: class { constructor(_leaf: unknown, readonly host: WorkbenchHost) {} },
}));

afterEach(() => { Reflect.set(Platform, 'isDesktopApp', true); });

function fixture(desktop = true) {
	Reflect.set(Platform, 'isDesktopApp', desktop);
	const manifest = MANIFESTS.find(item => item.id === 'safe')!;
	let enabled = manifest.defaultEnabled;
	const dispose = vi.fn();
	const pageCreate = vi.fn<PageCreate>(async () => ({ surface: {} as never, navigate: async () => {} }));
	const factory = vi.fn(() => ({ pages: { safe: async () => pageCreate }, dispose }));
	const descriptor: ModuleManifest = { ...manifest, load: async () => ({ default: factory }) };
	const registry = new ModuleRegistry([descriptor], {
		env: { desktop, mobile: !desktop, phone: !desktop },
		enabled: () => enabled,
		createContext: () => ({}) as ModuleContext,
		releaseContext() {}, report: vi.fn(),
	});
	const commands: Command[] = [];
	let viewFactory!: (leaf: WorkspaceLeaf) => unknown;
	const openWorkbench = vi.fn(async () => {});
	const plugin = {
		services: registry.services,
		moduleEnabled: (id: ModuleId) => id === 'safe' && enabled,
		moduleState: (id: ModuleId) => registry.state(id),
		activateModule: async (id: ModuleId) => await registry.activate(id) ? registry.instance(id) : undefined,
		registerView: (_type: string, create: (leaf: WorkspaceLeaf) => unknown) => { viewFactory = create; },
		register() {}, onModuleChanged: () => () => {},
		appSettings: { subscribe: () => () => {} },
		app: { workspace: { getLeavesOfType: () => [] } },
		addCommand: (command: Command) => { commands.push(command); return command; },
		openWorkbench,
	} as unknown as DashboardPlugin;
	composeWorkbench(plugin);
	registerShellCommands(plugin);
	const host = (viewFactory({} as WorkspaceLeaf) as { host: WorkbenchHost }).host;
	return { registry, commands, openWorkbench, factory, pageCreate, dispose, safe: host.contributions.find(item => item.id === 'safe')!, disable: () => { enabled = false; } };
}

test('the default-enabled safe remains idle until its first page opens, which can activate through the workbench', async () => {
	const f = fixture();
	await f.registry.apply();
	expect(f.registry.state('safe')).toBe('idle');
	expect(f.factory).not.toHaveBeenCalled();
	const available = f.safe.availability();
	expect(available).toEqual({ enabled: true, supported: true, ready: true });
	if (available.enabled && available.supported && available.ready) {
		await f.safe.create({} as NativeSurfaceContext, { feature: 'safe' }, {}, new AbortController().signal);
	}
	expect(f.registry.state('safe')).toBe('active');
	expect(f.factory).toHaveBeenCalledOnce();
	expect(f.pageCreate).toHaveBeenCalledOnce();
	f.disable();
	await f.registry.apply();
	expect(f.dispose).toHaveBeenCalledWith('disabled');
	expect(f.safe.availability().enabled).toBe(false);
	await f.registry.dispose();
});

test('the open-safe palette command works before activation and disappears when disabled or on mobile', async () => {
	const f = fixture();
	await f.registry.apply();
	const command = f.commands.find(item => item.id === 'open-safe')!;
	expect(command.checkCallback?.(true)).toBe(true);
	expect(f.openWorkbench).not.toHaveBeenCalled();
	expect(command.checkCallback?.(false)).toBe(true);
	expect(f.openWorkbench).toHaveBeenCalledWith({ feature: 'safe' });
	f.disable();
	expect(command.checkCallback?.(true)).toBe(false);
	Reflect.set(Platform, 'isDesktopApp', false);
	expect(command.checkCallback?.(true)).toBe(false);
	await f.registry.dispose();
	const mobile = fixture(false);
	await mobile.registry.apply();
	expect(mobile.safe.availability().supported).toBe(false);
	expect(await mobile.registry.activate('safe')).toBe(false);
	expect(mobile.factory).not.toHaveBeenCalled();
	await mobile.registry.dispose();
});

test('safe page state and all normalized routes discard record identifiers and drafts', () => {
	const f = fixture();
	const draft = { query: 'private@example.test', password: 'private-password', notes: 'private notes', selected: 'private-id' };
	expect(cleanPageState(draft, f.safe.stateKeys)).toEqual({});
	const raw = { feature: 'safe', section: 'trash', resourceId: 'private@example.test', focusId: 'private-password' };
	expect(normalizeTarget(raw)).toEqual({ feature: 'safe' });
	const restored = normalizeWorkbenchState({ target: raw, lastTargets: { safe: raw } });
	expect(restored.target).toEqual({ feature: 'safe' });
	expect(restored.lastTargets.safe).toEqual({ feature: 'safe' });
});
