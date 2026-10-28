import { expect, onTestFinished, test, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import type DashboardPlugin from '../main';
import type { WorkbenchHost } from '../contracts/workbench-host';
import { BROWSER_HOST } from '../../modules/browser/api';
import { composeWorkbench } from './compose-workbench';

vi.mock('./surfaces/obsidian-status', () => ({ registerObsidianStatus: () => ({ refresh() {}, dispose() {} }) }));
vi.mock('./surfaces/ribbon', () => ({ registerWorkbenchRibbon() {} }));
vi.mock('./workbench-leaf', () => ({
	WORKBENCH_VIEW_TYPE: 'huhu-workbench-view',
	WorkbenchView: class {
		constructor(
			_leaf: unknown,
			readonly host: WorkbenchHost,
		) {}
	},
}));

test('Browser contribution keeps each persisted page as an independent workbench resource', () => {
	let viewFactory!: (leaf: WorkspaceLeaf) => { host: WorkbenchHost };
	const cleanups: (() => void)[] = [];
	const plugin = {
		services: { peek: () => undefined, watch: () => () => {} },
		moduleEnabled: () => true,
		moduleState: () => 'idle',
		registerView: (_type: string, create: typeof viewFactory) => {
			viewFactory = create;
		},
		register: (cleanup: () => void) => {
			cleanups.push(cleanup);
		},
		onModuleChanged: () => () => {},
		appSettings: { subscribe: () => () => {} },
		app: { workspace: { getLeavesOfType: () => [] } },
	} as unknown as DashboardPlugin;
	composeWorkbench(plugin);
	onTestFinished(() => {
		for (const cleanup of cleanups.reverse()) cleanup();
	});

	const browser = viewFactory({} as WorkspaceLeaf).host.contributions.find((item) => item.id === 'browser')!;
	expect(browser.resourcePages).toBe(true);
	expect(browser.stateKeys).toEqual(['pageId']);
});

test('Browser contribution removes a saved page through the Browser service and keeps it when the service is absent', async () => {
	let viewFactory!: (leaf: WorkspaceLeaf) => { host: WorkbenchHost };
	const cleanups: (() => void)[] = [];
	const closePage = vi.fn(async () => {});
	let service: { closePage: typeof closePage; getPage: () => undefined } | undefined = {
		closePage,
		getPage: () => undefined,
	};
	const plugin = {
		services: { peek: (token: unknown) => (token === BROWSER_HOST ? service : undefined), watch: () => () => {} },
		moduleEnabled: () => true,
		moduleState: () => 'idle',
		registerView: (_type: string, create: typeof viewFactory) => {
			viewFactory = create;
		},
		register: (cleanup: () => void) => {
			cleanups.push(cleanup);
		},
		onModuleChanged: () => () => {},
		appSettings: { subscribe: () => () => {} },
		app: { workspace: { getLeavesOfType: () => [] } },
	} as unknown as DashboardPlugin;
	composeWorkbench(plugin);
	onTestFinished(() => {
		for (const cleanup of cleanups.reverse()) cleanup();
	});
	const browser = viewFactory({} as WorkspaceLeaf).host.contributions.find((item) => item.id === 'browser')!;
	await browser.closeResource!({ feature: 'browser', resourceId: 'page-1' });
	expect(closePage).toHaveBeenCalledExactlyOnceWith('page-1');
	await browser.closeResource!({ feature: 'browser' });
	expect(closePage).toHaveBeenCalledTimes(1);
	service = undefined;
	await expect(browser.closeResource!({ feature: 'browser', resourceId: 'page-2' })).rejects.toThrow();
});
