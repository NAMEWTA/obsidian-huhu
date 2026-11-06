import { expect, onTestFinished, test, vi } from 'vitest';
import type { App, TFile, WorkspaceLeaf } from 'obsidian';
import type DashboardPlugin from '../main';
import type { PanelContext, WorkbenchHost } from '../contracts/workbench-host';
import { composeWorkbench } from './compose-workbench';
import { normalizeTarget } from '../contracts/workbench-state';

const native = vi.hoisted(() => ({
	open: vi.fn<(app: App, file: TFile, options: { owner?: Window }) => Promise<void>>(), create: vi.fn(),
}));
// Both new-note helpers are real; only the vault and final native editor boundary are external ports.
vi.mock('../../host/obsidian/open-note', () => ({ openNoteAt: native.open, activateWindowLeaf: vi.fn() }));
vi.mock('./surfaces/obsidian-status', () => ({ registerObsidianStatus: () => ({ refresh() {}, dispose() {} }) }));
vi.mock('./surfaces/ribbon', () => ({ registerWorkbenchRibbon() {} }));
vi.mock('./workbench-leaf', () => ({ WORKBENCH_VIEW_TYPE: 'huhu-workbench-view', WorkbenchView: class {
	constructor(_leaf: unknown, readonly host: WorkbenchHost) {}
} }));

async function contentPanel() {
	native.open.mockReset().mockResolvedValue(undefined);
	native.create.mockReset().mockResolvedValue({ path: 'huhu/new.md' });
	let factory!: (leaf: WorkspaceLeaf) => { host: WorkbenchHost };
	const cleanups: (() => void)[] = [];
	const ownerWindow = {} as Window;
	const file = { path: 'huhu/a.md', name: 'a.md', basename: 'a', extension: 'md' };
	const created = { path: 'huhu/new.md', name: 'new.md', basename: 'new', extension: 'md' };
	native.create.mockResolvedValue(created);
	const plugin = {
		services: { peek: () => undefined, watch: () => () => {} },
		moduleEnabled: () => true, moduleState: () => 'idle',
		registerView: (_type: string, value: typeof factory) => { factory = value; },
		register: (cleanup: () => void) => { cleanups.push(cleanup); },
		onModuleChanged: () => () => {}, appSettings: { subscribe: () => () => {} },
		app: { workspace: { getLeavesOfType: () => [], containerEl: { win: ownerWindow } },
			vault: {
				getFiles: () => [file], getAllLoadedFiles: () => [file],
				getAbstractFileByPath: (path: string) => path.endsWith('.md') ? null : { path },
				getFileByPath: (path: string) => path === file.path ? file : path === created.path ? created : null,
				create: native.create,
			} },
	} as unknown as DashboardPlugin;
	composeWorkbench(plugin);
	onTestFinished(() => { for (const cleanup of cleanups.reverse()) cleanup(); });
	const host = factory({} as WorkspaceLeaf).host;
	const contribution = host.contributions.find(item => item.id === 'content')!;
	const context: PanelContext = { target: { feature: 'content' }, pages: () => [], navigate() {}, ownerWindow };
	await vi.waitFor(() => { expect(contribution.panel?.(context)?.primary).toBeDefined(); });
	return { host, panel: contribution.panel!(context)!, plugin, ownerWindow, file, created };
}

test('the real content contribution keeps its new-note promise pending until the native open completes', async () => {
	const { panel, plugin, ownerWindow, created } = await contentPanel();
	const gate = Promise.withResolvers<void>();
	native.open.mockReturnValue(gate.promise);
	try {
		const pending = panel.primary!.run();
		void Promise.resolve(pending).catch(() => {});
		expect(pending).toBeInstanceOf(Promise);
		await vi.waitFor(() => { expect(native.open).toHaveBeenCalledWith(plugin.app, created, { owner: ownerWindow }); });
		let settled = false;
		void Promise.resolve(pending).then(() => { settled = true; });
		await Promise.resolve();
		expect(settled).toBe(false);
		gate.resolve();
		await pending;
	} finally { gate.resolve(); }
});

test('the real content file selection returns the owner-window open promise', async () => {
	const { panel, plugin, ownerWindow, file } = await contentPanel();
	await panel.tree!.select!('huhu/a.md');
	expect(native.open).toHaveBeenCalledWith(plugin.app, file, { owner: ownerWindow });
});

test('a failed new-note action rejects to its UI caller before opening a native file', async () => {
	const { panel } = await contentPanel();
	const failure = new Error('create failed');
	native.create.mockRejectedValueOnce(failure);
	await expect(panel.primary!.run()).rejects.toBe(failure);
	expect(native.open).not.toHaveBeenCalled();
});


test('notifications keep section routes and badges without a second panel', async () => {
 const { host } = await contentPanel();
 const notification = host.contributions.find(item => item.id === 'notifications')!;
 expect(notification.panel).toBeUndefined();
 expect(notification.navigationContext).toBeUndefined();
 expect(notification.rail?.slot).toBe('bottom');
 expect(notification.rail?.badge?.()).toBe(0);
 for (const section of ['unread', 'all']) {
  const route = notification.navigation.children!.find(item => item.target?.section === section)!.target!;
  expect(normalizeTarget(route)).toEqual({ feature: 'notifications', section });
 }
 for (const feature of ['content', 'settings', 'contacts']) {
  expect(host.contributions.find(item => item.id === feature)?.panel).toBeTypeOf('function');
 }
});
