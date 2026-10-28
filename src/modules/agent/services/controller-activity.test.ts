import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Window as TestWindow } from 'happy-dom';
import { expect, test, vi } from 'vitest';
import { Notice, type App } from 'obsidian';
import { t } from '../../../shared/i18n';
import type { ModuleContext } from '../../../app/contracts/module';
import { SettingsStore } from '../../../shared/settings/store';
import { initializeDevice, deviceId } from '../../../host/obsidian/storage/device-id';
import { createDesktopSpacePorts } from '../platform/desktop/spaces/ports';
import type { NativeEvents, NativeSpawnOptions } from '../../../shared/native/host';
import { NativeHost } from '../../../host/desktop/native/host';
import { agentSettings } from '../settings';
import { AgentController } from './controller';
import { accountEnv } from '../platform/desktop/agents/accounts';
import { terminalEnvironment } from '../platform/desktop/pty/runtime-environment';

// These adapters would read the real user's shell, CLI install registry or account files.
vi.mock('../platform/desktop/detection/shell-path', () => ({
	loginShellEnvironment: async () => ({}),
	loginShellPath: async () => '',
}));
vi.mock('../platform/desktop/detection/probe', () => ({ probeAgents: () => ({}) }));
vi.mock('../platform/desktop/agents/legacy-default', () => ({
	legacyDefaultAccountsToAdopt: async () => [],
	markLegacyDefaultAdopted: async () => {},
	inLegacyDefaultAccount: async () => false,
}));
vi.mock('../platform/desktop/install/exec', async (importOriginal) => ({
	...(await importOriginal<object>()),
	fetchNpmLatest: async () => undefined,
}));
vi.mock('../platform/desktop/agents/accounts', async (importOriginal) => ({
	...(await importOriginal<object>()),
	accountEnv: vi.fn(async (_agent: unknown, account: string) => ({
		HUHU_ACCOUNT_ID: `fixture/${account ? 'managed' : 'system'}`,
		HUHU_ACCOUNT_NAME: account,
		...(account ? { HOME: '/fixture/account', CODEX_HOME: '/fixture/codex' } : {}),
	})),
}));
vi.mock('../platform/desktop/pty/runtime-environment', () => ({
	terminalEnvironment: vi.fn(async () => ({})),
	userHome: () => '/fixture-home',
}));
vi.mock('../platform/desktop/files', () => ({ openPath: vi.fn(), revealPath: vi.fn() }));

async function fixture(prepare?: () => Promise<void>) {
	const root = await mkdtemp(join(tmpdir(), 'huhu-managed-controller-'));
	const window = new TestWindow(),
		doc = window.document;
	const container = doc.createElement('div');
	doc.body.append(container);
	Object.defineProperties(container, { win: { value: window }, doc: { value: doc } });
	Object.defineProperty(window, 'require', { value: createRequire(import.meta.url) });
	const files = new Map<string, string>();
	const adapter = {
		getBasePath: () => root,
		exists: async (p: string) => files.has(p),
		read: async (p: string) => files.get(p)!,
		write: async (p: string, text: string) => {
			files.set(p, text);
		},
		mkdir: async () => {},
	};
	const leaf = { view: { containerEl: container } };
	const leafListeners = new Set<() => void>();
	const app = {
		vault: { adapter },
		workspace: {
			containerEl: container,
			getMostRecentLeaf: () => leaf,
			on: (_name: string, listener: () => void) => {
				leafListeners.add(listener);
				return { listener };
			},
			offref: (ref: { listener: () => void }) => leafListeners.delete(ref.listener),
		},
		loadLocalStorage: () => null,
		saveLocalStorage() {},
	} as unknown as App;
	await initializeDevice(app, {
		machineIdentity: async () => 'fixture-machine',
		label: 'fixture',
		chooseDevice: async () => ({ label: 'fixture' }),
	});
	const settingsStore = new SettingsStore(
		{ load: async () => null, save: async (_scope, file) => file },
		{
			timers: {
				set: (fn, ms) => setTimeout(fn, ms),
				clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
			},
		},
	);
	await settingsStore.load();
	const settings = settingsStore.bind('agent', agentSettings);
	await settings.update(
		(draft) => {
			draft.notifications = false;
			draft.statusHooks = false;
		},
		{ persist: 'immediate' },
	);
	const spawn = vi.fn(async (_sid: number, _request: NativeSpawnOptions) => 42),
		opened = vi.fn(async () => {}),
		cleanups: (() => void)[] = [];
	let nativeEvents!: NativeEvents,
		automaticStop = true,
		sequence = 0;
	const input = vi.fn(),
		ack = vi.fn();
	const native = new NativeHost(async (events) => {
		nativeEvents = events;
		return {
			alive: true,
			version: 'fixture',
			terminalTermination: 1,
			localControl: 1,
			prepareControl(
				message: import('../../../shared/native/control-wire').ControlMessage,
				valid?: () => boolean,
			) {
				let handed = false;
				return {
					get handed() {
						return handed;
					},
					settled: Promise.resolve(),
					cancel: () => !handed,
					send: () => {
						if (valid && !valid()) return false;
						handed = true;
						queueMicrotask(() => {
							if (message.type === 'control-register')
								events.control?.({
									type: 'control-registered',
									controlId: message.controlId,
									endpoint: '/fixture/socket',
									locator: '/fixture/locator',
								});
							if (message.type === 'control-unregister')
								events.control?.({ type: 'control-unregistered', controlId: message.controlId });
							if (message.type === 'control-result')
								events.control?.({
									type: 'control-settled',
									controlId: message.controlId,
									bridgeId: message.bridgeId,
								});
						});
						return true;
					},
				};
			},
			requestStop: (sid, options) => {
				if (!automaticStop) return;
				events.termination?.(sid, {
					version: 1,
					requestId: options.requestId,
					sequence: ++sequence,
					evidence: {
						root: { state: 'exited', code: 0, signal: null },
						cleanup: {
							state: 'confirmed',
							scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
							remainingKnown: 0,
						},
						output: 'drained',
					},
				});
				events.exit(sid, 0, null);
			},
			spawnSession: spawn,
			input,
			resize() {},
			acknowledge: ack,
			end: (sid) => {
				queueMicrotask(() => events.exit(sid, 0, null));
			},
			history: async <T>() => [] as T,
			request: async <T>() => ({}) as T,
			dispose: async () => {
				events.closed('fixture closed');
			},
		};
	});
	let choice: string | undefined;
	const context = {
		app,
		native,
		manifest: { dir: 'plugin-fixture' },
		shell: { open: opened, refresh() {} },
		lifetime: { register: (off: () => void) => cleanups.push(off) },
		services: { peek: () => undefined, watch: () => () => {} },
		contributions: { collect: async () => [] },
	} as unknown as ModuleContext;
	const controller = new AgentController(context, settings, {
		prepare,
		confirm: async () => false,
		selectSpace: async () => choice,
	});
	await controller.workspace.persistence.ready;
	return {
		controller,
		settings,
		spawn,
		opened,
		doc,
		container,
		win: window as unknown as Window,
		leafListeners,
		app,
		adapter,
		files,
		root,
		native,
		events: () => nativeEvents,
		holdNativeStop: () => {
			automaticStop = false;
		},
		input,
		ack,
		choose: (id?: string) => {
			choice = id;
		},
		async cleanup() {
			try {
				await controller.dispose();
			} finally {
				cleanups.reverse().forEach((off) => off());
				await native.dispose();
				await settingsStore.dispose();
				await window.happyDOM.close();
				await rm(root, { recursive: true, force: true });
			}
		},
	};
}

test('T06 production Controller delegates one managed Shell scope and root exit revokes evidence while drain ACK continues', async () => {
	const f = await fixture();
	const hooks = Reflect.get(
		f.controller,
		'hooks',
	) as import('../platform/desktop/hooks/automation-hooks').AutomationHooks;
	let binding!: import('../core/workspace/managed-runtime').RuntimeActivityBinding;
	const close = vi.fn(async () => {}),
		prepare = vi.spyOn(hooks, 'prepareRuntimeHooks').mockImplementation(async (request, b) => {
			expect(request.initialProvider).toBeUndefined();
			binding = b;
			return { env: { ACTIVITY_FIXTURE: 'one' }, close };
		});
	const legacy = vi.spyOn(hooks, 'prepare');
	try {
		await f.settings.update(
			(d) => {
				d.statusHooks = true;
			},
			{ persist: 'immediate' },
		);
		const space = await f.controller.spaces.create({ name: 'activity', relativePath: '' });
		const created = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		expect(created.status).toBe('created');
		if (created.status !== 'created') throw new Error('missing runtime');
		expect(prepare).toHaveBeenCalledOnce();
		expect(legacy).not.toHaveBeenCalled();
		expect(f.spawn).toHaveBeenCalledOnce();
		const session = f.controller.sessions.get(created.session.runtime.runtimeId)!;
		const source = binding.bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'pi' },
		})!;
		source.observe({
			deliveryId: 'one',
			sourceSequence: 1,
			event: 'ui_prompt_start',
			state: 'waiting',
			blocking: { state: 'blocked', blockId: 'question', reason: 'question' },
		});
		expect(f.controller.workspace.getManaged(created.session)?.runtime?.activityDetail).toMatchObject({
			blocking: { state: 'blocked' },
			promptEvidence: { foreground: 'unknown' },
		});
		expect(f.input).not.toHaveBeenCalled();
		f.events().termination?.(session.sid, {
			version: 1,
			sequence: 100,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: {
					state: 'pending',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: null,
				},
				output: 'unknown',
			},
		});
		expect(source.active()).toBe(false);
		expect(binding.active()).toBe(false);
		expect(session.connection).toBe('connected');
		expect(session.inputReady()).toBe(false);
		f.events().output(session.sid, new TextEncoder().encode('drain\x1b[6n'));
		await session.whenParsed();
		expect(f.ack).toHaveBeenCalled();
		expect(f.input).toHaveBeenCalled();
		expect(session.getActivitySnapshot().lastFact?.blocking.state).toBe('blocked');
		f.events().termination?.(session.sid, {
			version: 1,
			sequence: 101,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: {
					state: 'confirmed',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: 0,
				},
				output: 'drained',
			},
		});
		f.events().exit(session.sid, 0, null);
		await session.whenParsed();
		expect(session.getActivitySnapshot().completion).toBeUndefined();
	} finally {
		prepare.mockRestore();
		legacy.mockRestore();
		await f.cleanup();
		expect(close).toHaveBeenCalledOnce();
	}
});
