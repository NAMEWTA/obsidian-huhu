import { afterEach, expect, test, vi } from 'vitest';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import type { ModuleContext } from '../../app/contracts/module';
import { musicVaultFixture } from '../../../scripts/music-vault-fixture';
import { localSession } from '../../../scripts/music-electron-stub';
import createHomeModule from './module';
import { homeServices } from './services/instances';
import { HOME_WORKBENCH } from './api';

// Isolate unrelated records and host UI; the Home → MusicService → NeteaseAccount
// → native session/Cookie chain is real, with only Electron at the external boundary.
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

class Audio {
	preload = ''; volume = 1; currentTime = 0; duration = 0;
	addEventListener() {} pause() {} removeAttribute() {} load() {}
}
afterEach(() => vi.unstubAllGlobals());

test('Home publishes usable services while native credentials remain pending, and reopening rejects old results', async () => {
	vi.stubGlobal('createEl', () => new Audio());
	vi.stubGlobal('window', { setTimeout, clearTimeout });
	const fixture = await musicVaultFixture(), get = localSession.cookies.get;
	let started!: () => void, release!: (value: { name: string; value: string }[]) => void;
	const reading = new Promise<void>(resolve => { started = resolve; });
	localSession.cookies.get = () => { started(); return new Promise(resolve => { release = resolve; }); };
	const disposers: Array<() => void> = [];
	Object.assign(fixture.app.workspace, { onLayoutReady() {}, layoutReady: false });
	const context = {
		app: fixture.app, env: { phone: false },
		settings: { bind: () => ({ subscribe: () => () => {} }) },
		lifetime: { register: (dispose: () => void) => disposers.push(dispose), registerEvent() {} },
		services: { peek: () => undefined, watch: () => () => {} },
		contributions: { collect: async () => [], watch: () => () => {} },
		commands: {}, shell: {},
	} as unknown as ModuleContext;
	let instance = createHomeModule(context), activation: Promise<unknown> | undefined;
	try {
		let active = false, activationMs = 0;
		const start = performance.now();
		activation = Promise.resolve(instance.activate?.(new AbortController().signal)).then(() => { activationMs = performance.now() - start; active = true; });
		await reading;
		// Observe the ready turn without releasing Cookie or advancing a deadline.
		await new Promise<void>(resolve => setImmediate(resolve));
		expect(active).toBe(true);
		expect(instance.services?.some(([key]) => key === HOME_WORKBENCH)).toBe(true);
		const old = homeServices.music!;
		expect(old.getState()).toMatchObject({ status: 'idle', playlist: [] });
		old.setVolume(0.5);
		expect(old.getState().volume).toBe(0.5);
		const listener = vi.fn(); old.subscribe(listener);
		await instance.dispose('disabled');
		for (const dispose of disposers.splice(0)) dispose();
		localSession.cookies.get = async () => [];
		instance = createHomeModule(context);
		await instance.activate?.(new AbortController().signal);
		await homeServices.music!.restoreAccount();
		release([{ name: 'MUSIC_U', value: 'old-vault' }]);
		await new Promise<void>(resolve => setImmediate(resolve));
		expect(old.account.loggedIn).toBe(false);
		expect(homeServices.music).not.toBe(old);
		expect(homeServices.music!.account.loggedIn).toBe(false);
		expect(listener).not.toHaveBeenCalled();
		if (process.env.HUHU_STARTUP_REPORT) writeFileSync(process.env.HUHU_STARTUP_REPORT, JSON.stringify({ fixture: 'home-native-cookie-pending', activationMs, lifecycleFixtureMs: performance.now() - start, mocked: 'unrelated records, host UI, Electron', real: 'Home/MusicService/NeteaseAccount/session files' }, null, 2) + '\n');
	} finally {
		release?.([]); await activation;
		await instance.dispose('unload'); for (const dispose of disposers.splice(0)) dispose();
		localSession.cookies.get = get; await fixture.dispose();
	}
});

test.each([false, true])('background restoration publishes one service update (rejected=%s)', async rejected => {
	vi.stubGlobal('createEl', () => new Audio());
	const fixture = await musicVaultFixture(), get = localSession.cookies.get;
	const { MusicService } = await import('./platform/music/music-service');
	const service = new MusicService({ app: fixture.app, settings: {}, saveSettings: async () => {} } as ConstructorParameters<typeof MusicService>[0]);
	let enter!: () => void, release!: (cookies: { name: string; value: string }[]) => void, reject!: (error: Error) => void;
	const started = new Promise<void>(resolve => { enter = resolve; });
	localSession.cookies.get = () => { enter(); return new Promise((yes, no) => { release = yes; reject = no; }); };
	try {
		await service.load();
		const listener = vi.fn(), off = service.subscribe(listener), restoring = service.restoreAccount();
		expect(service.restoreAccount()).toBe(restoring);
		await started;
		if (rejected) reject(new Error('browser_session_unavailable'));
		else release([{ name: 'MUSIC_U', value: 'member' }]);
		await restoring;
		expect(listener).toHaveBeenCalledTimes(1);
		expect(service.account.loggedIn).toBe(!rejected);
		expect(service.account.error).toBe(rejected ? 'browser_session_unavailable' : '');
		off();
	} finally { service.destroy(); localSession.cookies.get = get; await fixture.dispose(); }
});
