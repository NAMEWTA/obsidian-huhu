import { afterEach, expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../app/contracts/module';
import createHomeModule from './module';
import { homeServices } from './services/instances';
import { HOME_WORKBENCH } from './api';
import { memoryVault } from '../../../scripts/fixtures/memory-vault';
import { initializeDevice } from '../../host/obsidian/storage/device-id';

// Isolate unrelated records and host UI; the Home module lifecycle itself is real.
vi.mock('./services/home-host', () => ({ createHomeHost: (context: ModuleContext) => ({ app: context.app, settings: {}, saveSettings: async () => {}, refreshAllDashboards() {}, boardSurfaces: () => [] }), repointBoards() {} }));
vi.mock('./platform/habit/habit-service', () => ({ HabitService: class { async load() {} destroy() {} } }));
vi.mock('./platform/expense/expense-service', () => ({ ExpenseService: class { async load() {} destroy() {} } }));
vi.mock('./platform/pomodoro/pomodoro-service', () => ({ PomodoroService: class { async loadSessions() {} destroy() {} } }));
vi.mock('./platform/reading/reading-service', () => ({ ReadingService: class { async loadSessions() {} destroy() {} } }));
vi.mock('./platform/media/media-tags', () => ({ MediaTagService: class { load() {} async flush() {} destroy() {} } }));
vi.mock('./platform/calendar/daily-notes', () => ({ bindJournal: () => () => {} }));
vi.mock('./platform/rss/rss-store', () => ({ closeRssStore: async () => {} }));
vi.mock('./contrib/automation-source', () => ({ dashboardAutomationSource: () => ({}) }));
vi.mock('./services/board-registry', () => ({ BoardRegistry: class { async recoverMoves() {} watch() {} async prune() {} } }));
vi.mock('./services/board-backups', () => ({ startBoardBackups: () => () => {} }));
vi.mock('./services/commands', () => ({ registerHomeCommands() {} }));
vi.mock('./ui/ui/panel-modal', () => ({ closeDashboardPanelModals() {} }));
vi.mock('./ui/renderer/render-context', () => ({ teardownBasenameIndex() {} }));
vi.mock('./ui/dialogs/record-lifetime', () => ({ closeRecordDialogs() {} }));

afterEach(() => vi.unstubAllGlobals());

test('Home publishes its workbench service and widget services on activation, and disposal releases them', async () => {
	vi.stubGlobal('window', { setTimeout, clearTimeout });
	const { app } = memoryVault();
	Object.assign(app, { loadLocalStorage: () => null, saveLocalStorage: () => {} });
	await initializeDevice(app, { machineIdentity: async () => 'home-test-machine', label: 'test', chooseDevice: async () => ({ label: 'test' }) });
	const disposers: Array<() => void> = [];
	Object.assign(app.workspace, { onLayoutReady() {}, layoutReady: false });
	const context = {
		app, env: { phone: false },
		settings: { bind: () => ({ subscribe: () => () => {} }) },
		lifetime: { register: (dispose: () => void) => disposers.push(dispose), registerEvent() {} },
		services: { peek: () => undefined, watch: () => () => {} },
		contributions: { collect: async () => [], watch: () => () => {} },
		commands: {}, shell: {},
	} as unknown as ModuleContext;
	const instance = createHomeModule(context);
	try {
		await instance.activate?.(new AbortController().signal);
		expect(instance.services?.some(([key]) => key === HOME_WORKBENCH)).toBe(true);
		expect(homeServices.habit).toBeDefined();
		expect(homeServices.mediaTags).toBeDefined();
		await instance.dispose('disabled');
		expect(Object.keys(homeServices)).toEqual([]);
	} finally {
		await instance.dispose('unload');
		for (const dispose of disposers.splice(0)) dispose();
	}
});
