import { expect, onTestFinished, test, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import type DashboardPlugin from '../main';
import type { WorkbenchHost } from '../contracts/workbench-host';
import { BROWSER_WORKSPACE, type BrowserWorkspace } from '../../modules/browser/api';
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

function workbench(workspace?: Pick<BrowserWorkspace, 'getState' | 'subscribe'>) {
	let viewFactory!: (leaf: WorkspaceLeaf) => { host: WorkbenchHost };
	const cleanups: (() => void)[] = [];
	const plugin = {
		services: {
			peek: (token: unknown) => (token === BROWSER_WORKSPACE ? workspace : undefined),
			watch: () => () => {},
		},
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
	return viewFactory({} as WorkspaceLeaf).host.contributions.find((item) => item.id === 'browser')!;
}

test('Browser contribution addresses a Space and Page without owning the browser process', () => {
	const browser = workbench({
		getState: () => ({ spaces: [{ id: 'space-1', label: 'Task' }] }) as ReturnType<BrowserWorkspace['getState']>,
		subscribe: () => () => {},
	});
	expect(browser.resourcePages).toBeUndefined();
	expect(browser.closeResource).toBeUndefined();
	expect(browser.stateKeys).toEqual(['spaceId', 'pageId']);
	expect(browser.title?.({ feature: 'browser', resourceId: 'space-1' })).toBe('Task');
	expect(browser.availability().ready).toBe(true);
});

test('Browser contribution stays closed when the workspace service is absent', () => {
	const browser = workbench();
	expect(browser.availability().ready).toBe(false);
	expect(browser.title?.({ feature: 'browser', resourceId: 'space-1' })).toBeUndefined();
	expect(browser.closeResource).toBeUndefined();
});
