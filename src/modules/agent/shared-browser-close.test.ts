import { expect, test, vi } from 'vitest';
import type { App } from 'obsidian';

let layout: { tabs: Record<string, { id: string; kind: string; pageId: string }> } = {
	tabs: { t1: { id: 't1', kind: 'browser', pageId: 'p1' } },
};
const editLayout = vi.fn();
vi.mock('./platform/desktop/spaces/ports', () => ({ createDesktopSpacePorts: () => ({}) }));
vi.mock('./services/spaces/space-service', () => ({
	SpaceService: class {
		ready = Promise.resolve();
		store = { getState: () => ({ records: { selectedSpaceId: 's' } }), subscribe: () => () => {} };
		setSpaceChooser() {}
	},
}));
vi.mock('./services/workspace-store', () => ({
	createSpaceWorkspaceStore: () => ({
		ready: Promise.resolve(),
		store: { getState: () => layout, subscribe: () => () => {} },
		readLayoutNow: () => ({ view: layout }),
		editLayout,
		dispose: async () => {},
	}),
}));
vi.mock('./core/workspace/ops', () => ({
	closeTab: (state: typeof layout, id: string) => {
		const { [id]: _removed, ...tabs } = state.tabs;
		return { ...state, tabs };
	},
	openTab: (state: typeof layout, _at: unknown, tab: { id: string; pageId: string }) => ({
		...state,
		tabs: { ...state.tabs, [tab.id]: { kind: 'browser', ...tab } },
	}),
}));
vi.mock('../../host/obsidian/storage/device-id', () => ({ vaultIdentity: () => ({ vaultId: 'v', deviceId: 'd' }) }));
vi.mock('../../host/obsidian/storage/private-storage', () => ({ privateVaultStorage: () => ({}) }));

import { createSharedWorkspaceOwner } from './module';

const app = { workspace: { containerEl: { win: {} } }, vault: { adapter: {} } } as unknown as App;

test('SharedBrowserPort.close awaits the layout edit and rejects on failure or unexpected effect', async () => {
	const owner = await createSharedWorkspaceOwner(app, vi.fn());
	editLayout.mockResolvedValueOnce({ effect: 'completed' });
	await expect(owner.browser.close('p1')).resolves.toBeUndefined();
	editLayout.mockResolvedValueOnce({ effect: 'none', error: new Error('conflict') });
	await expect(owner.browser.close('p1')).rejects.toThrow('conflict');
	editLayout.mockResolvedValueOnce({ effect: 'unknown' });
	await expect(owner.browser.close('p1')).rejects.toThrow(/unknown/);
	editLayout.mockClear();
	await owner.browser.close('missing');
	expect(editLayout).not.toHaveBeenCalled();
});

test('closing right after opening waits for the queued edit and removes the new tab', async () => {
	layout = { tabs: {} };
	editLayout.mockReset();
	editLayout.mockImplementation(async (_space: unknown, transform: (state: typeof layout) => typeof layout) => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		layout = transform(layout);
		return { effect: 'completed' };
	});
	const owner = await createSharedWorkspaceOwner(app, vi.fn());
	const tab = {
		id: 'tab-new',
		pageId: 'p-new',
		title: '',
		url: 'https://example.com',
		profileId: 'default',
		zoom: 1,
		createdAt: 0,
	};
	await owner.browser.open(tab);
	await owner.browser.close('p-new');
	await new Promise((resolve) => setTimeout(resolve, 40));
	expect(layout.tabs).toEqual({});
});

test('close removes every record that shares the page id', async () => {
	layout = {
		tabs: {
			a: { id: 'a', kind: 'browser', pageId: 'dup' },
			b: { id: 'b', kind: 'browser', pageId: 'dup' },
			c: { id: 'c', kind: 'browser', pageId: 'other' },
		},
	};
	editLayout.mockReset();
	editLayout.mockImplementation(async (_space: unknown, transform: (state: typeof layout) => typeof layout) => {
		layout = transform(layout);
		return { effect: 'completed' };
	});
	const owner = await createSharedWorkspaceOwner(app, vi.fn());
	await owner.browser.close('dup');
	expect(Object.keys(layout.tabs)).toEqual(['c']);
});
