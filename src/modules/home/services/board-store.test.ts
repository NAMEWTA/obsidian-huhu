import { expect, test, vi } from 'vitest';
import { DEFAULT_DASHBOARD_SETTINGS } from '../core/board/types/model';
import type { HomeHost } from './home-host';
const mock = vi.hoisted(() => ({
	events: [] as string[],
	close: vi.fn(),
	release: vi.fn(),
	open: vi.fn(),
	switchFile: vi.fn(async () => {}),
}));
vi.mock('../platform/board/sync', () => ({
	SyncEngine: class {
		getSaveState() {
			return { status: 'saved' };
		}
		onDataUpdate() {
			return mock.release;
		}
		onSaveStateUpdate() {
			return mock.release;
		}
		updateSettings(value: { dashboardFile: string }) {
			mock.events.push(value.dashboardFile);
		}
		async init() {}
		async flush() {}
		switchFile() {
			return mock.switchFile();
		}
		close() {
			mock.close();
			return Promise.resolve();
		}
	},
}));
vi.mock('../../../host/obsidian/storage/content-files', () => ({
	contentFiles: () => ({
		subscribe: () => mock.release,
		getMarkdownFiles: () => [],
		resolveLink: (path: string) => ({ path }),
		open: mock.open,
	}),
}));
vi.mock('./instances', () => ({ homeServices: {} }));
import { BoardStore } from './board-store';
test('workspace switches serialize and disposal releases subscriptions and closes the writer', async () => {
	const owner = {} as Window,
		host = {
			app: {},
			settings: structuredClone(DEFAULT_DASHBOARD_SETTINGS),
			subscribeSettings: () => mock.release,
			workbenchRefresh: () => {},
		} as unknown as HomeHost;
	let currentOwner = owner;
	const store = new BoardStore(host, '.huhu/dashboards/A', () => currentOwner);
	await store.init();
	await Promise.all([store.switch('.huhu/dashboards/B'), store.switch('.huhu/dashboards/C')]);
	expect(mock.events).toEqual(['.huhu/dashboards/B', '.huhu/dashboards/C']);
	expect(store.state.getState().path).toBe('.huhu/dashboards/C');
	await store.openFile('Note.md', true);
	expect(mock.open).toHaveBeenCalledWith('Note.md', owner);
	currentOwner = {} as Window;
	await store.openFile('Moved.md', true);
	expect(mock.open).toHaveBeenLastCalledWith('Moved.md', currentOwner);
	// a note always opens with Obsidian's editor, never in a preview dialog
	await store.openFile('Preview.md');
	expect(mock.open).toHaveBeenLastCalledWith('Preview.md', currentOwner);
	expect(mock.open).toHaveBeenCalledTimes(3);
	await store.dispose();
	expect(mock.release).toHaveBeenCalledTimes(4);
	expect(mock.close).toHaveBeenCalledOnce();
	await store.switch('.huhu/dashboards/D');
	expect(mock.events).toEqual(['.huhu/dashboards/B', '.huhu/dashboards/C']);
});
