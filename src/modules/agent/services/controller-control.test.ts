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
import { freeWriterPorts } from '../platform/desktop/spaces/free-writer-port.fixture';
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
	const controlSent: import('../../../shared/native/control-wire').ControlMessage[] = [];
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
						controlSent.push(message);
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
	const controller = new AgentController(
		context,
		settings,
		{
			prepare,
			confirm: async () => false,
			selectSpace: async () => choice,
		},
		undefined,
		freeWriterPorts(),
	);
	await controller.workspace.persistence.ready;
	return {
		controller,
		settings,
		controlSent,
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

test('Controller activation and settings-only prepare are passive; explicit workbench registers actual control exactly once', async () => {
	const f = await fixture();
	const acquire = vi.spyOn(f.native, 'acquire');
	try {
		expect(f.controller.inbox).toBeDefined();
		expect(f.controller.inbox.available('system')).toBe(true);
		expect(acquire).not.toHaveBeenCalled();
		await f.controller.prepare();
		expect(acquire).not.toHaveBeenCalled();
		await f.controller.prepareWorkbench();
		await f.controller.prepareWorkbench();
		expect(acquire.mock.calls.filter(([kind]) => kind === 'control')).toHaveLength(1);
		expect(f.controlSent.filter((row) => row.type === 'control-register')).toHaveLength(1);
		expect(f.spawn).not.toHaveBeenCalled();
	} finally {
		await f.cleanup();
	}
});

test('lazy ControlCommands receives the controller-owned InboxService instance exactly once', async () => {
	const f = await fixture();
	try {
		await f.controller.prepareWorkbench();
		const owner = (f.controller as unknown as {
			controlOwner?: { router: { commands: { inboxHandler?: { inbox: unknown } } } };
		}).controlOwner;
		expect(owner?.router.commands.inboxHandler?.inbox).toBe(f.controller.inbox);
		expect(f.controller.inbox.available('cli')).toBe(true);
	} finally {
		await f.cleanup();
	}
});
test('first managed Controller launch registers through its real bound lease and passes protected same-generation identity to spawn', async () => {
	const f = await fixture();
	try {
		const space = await f.controller.spaces.create({ name: 'B' });
		const creating = f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		const result = await creating;
		expect(result.status).toBe('created');
		if (result.status !== 'created') throw Error(JSON.stringify(result));
		expect(f.controlSent.filter((row) => row.type === 'control-register')).toHaveLength(1);
		expect(f.spawn.mock.calls[0]?.[1].env).toMatchObject({
			HUHU_SPACE_ID: space.id,
			HUHU_STABLE_SESSION_ID: result.session.sessionId,
			HUHU_SESSION_ID: result.session.runtime.runtimeId,
			HUHU_CONTROL_LOCATOR: '/fixture/locator',
		});
		expect(Object.keys(f.controller.workspace.store.getState().tabs)).toHaveLength(0);
	} finally {
		await f.cleanup();
	}
});

test.each([false, true])(
	'an actual NativeHost closed generation permits only a later explicit new launch, preserving instance identity and old uncertainty (settled error %s)',
	async (failedRetirement) => {
		const f = await fixture();
		let lost = false;
		try {
			const space = await f.controller.spaces.create({ name: 'recovery' }),
				scope = await f.controller.spaces.getControlScope();
			const first = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
			if (first.status !== 'created') throw Error(JSON.stringify(first));
			const old = f.controller.sessions.get(first.session.runtime.runtimeId)!;
			if (failedRetirement) {
				const owner = Reflect.get(f.controller, 'controlOwner') as { environment: { close(): Promise<void> } },
					close = owner.environment.close.bind(owner.environment);
				vi.spyOn(owner.environment, 'close').mockImplementationOnce(async () => {
					await close();
					throw Error('controlled settled retirement failure');
				});
			}
			f.events().closed('controlled transport EOF');
			lost = true;
			await vi.waitFor(() => expect(old.connection).toBe('disconnected'));
			expect(
				f.controller.sessions.managedSummary({
					spaceId: space.id,
					sessionId: first.session.sessionId,
				})?.termination?.cleanup.state,
			).toBe('unknown');
			expect(f.spawn).toHaveBeenCalledOnce();
			// The controlled transport's release settles in the microtask turn; no action is replayed on closed.
			await new Promise<void>((resolve) => setImmediate(resolve));
			expect(f.spawn).toHaveBeenCalledOnce();
			const second = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
			expect(second.status).toBe('created');
			expect(f.spawn).toHaveBeenCalledTimes(2);
			expect((await f.controller.spaces.getControlScope()).instanceId).toBe(scope.instanceId);
			expect(f.controller.workspace.getManaged(first.session)).toMatchObject({
				runtime: { runtimeId: first.session.runtime.runtimeId, phase: 'disconnected' },
			});
		} finally {
			if (lost) {
				let rejected: unknown;
				try {
					await f.cleanup();
				} catch (error) {
					rejected = error;
				}
				expect(rejected).toBeInstanceOf(AggregateError);
				const flat = (error: unknown): unknown[] =>
					error instanceof AggregateError ? error.errors.flatMap(flat) : [error];
				console.info(
					'[controller recovery retained cleanup]',
					JSON.stringify(
						flat(rejected).map((error) =>
							error instanceof Error ? { name: error.name, message: error.message } : error,
						),
					),
				);
			} else await f.cleanup();
		}
	},
);

test('unsettled retirement blocks a new control pair until real settlement, without automatic replay', async () => {
	const f = await fixture();
	let release!: () => void,
		lost = false;
	try {
		const space = await f.controller.spaces.create({ name: 'retiring' }),
			first = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (first.status !== 'created') throw Error(JSON.stringify(first));
		const owner = Reflect.get(f.controller, 'controlOwner') as { environment: { close(): Promise<void> } },
			close = owner.environment.close.bind(owner.environment),
			gate = new Promise<void>((r) => {
				release = r;
			});
		vi.spyOn(owner.environment, 'close').mockImplementationOnce(async () => {
			await close();
			await gate;
		});
		const old = f.controller.sessions.get(first.session.runtime.runtimeId)!;
		f.events().closed('controlled EOF');
		lost = true;
		await vi.waitFor(() => expect(old.connection).toBe('disconnected'));
		const blocked = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		expect(blocked.status).toBe('failed');
		if (blocked.status === 'failed') expect(blocked.error.details).toMatchObject({ controlCode: 'BUSY' });
		expect(f.spawn).toHaveBeenCalledOnce();
		expect(f.controlSent.filter((row) => row.type === 'control-register')).toHaveLength(1);
		release();
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(f.spawn).toHaveBeenCalledOnce();
		const explicit = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		expect(explicit.status).toBe('created');
		expect(f.spawn).toHaveBeenCalledTimes(2);
		expect(f.controlSent.filter((row) => row.type === 'control-register')).toHaveLength(2);
	} finally {
		release?.();
		if (lost) await expect(f.cleanup()).rejects.toBeInstanceOf(AggregateError);
		else await f.cleanup();
	}
});

test('real Controller terminalControl captures the exact target before scope await and show retains its existing attach path', async () => {
	const f = await fixture();
	let release!: (value: Awaited<ReturnType<typeof f.controller.spaces.getControlScope>>) => void;
	try {
		const space = await f.controller.spaces.create({ name: 'B' });
		const created = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (created.status !== 'created') throw Error('fixture failed');
		const target = {
			spaceId: space.id,
			sessionId: created.session.sessionId,
			runtimeId: created.session.runtime.runtimeId,
		};
		const scope = await f.controller.spaces.getControlScope();
		vi.spyOn(f.controller.spaces, 'getControlScope').mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					release = resolve;
				}),
		);
		const request = {
			protocolVersion: 1 as const,
			requestId: 'local-read',
			operation: 'terminal.read' as const,
			target: { ...target },
			params: { limit: 80, maxBytes: 1024 },
		};
		const pending = f.controller.terminalControl(request, { signal: new AbortController().signal });
		request.target.runtimeId = 'must-not-retarget';
		request.params.limit = 1;
		release(scope);
		expect(await pending).toMatchObject({ target, effect: 'none', phase: 'read' });
		const attach = vi.spyOn(f.controller.workspace, 'attachManaged');
		f.controller.show(target.runtimeId);
		expect(attach).toHaveBeenCalledWith(target, { expectedRuntimeId: target.runtimeId });
		await vi.waitFor(() =>
			expect(
				f.controller.workspace.getManagedSnapshot().sessions.find((row) => row.sessionId === target.sessionId)
					?.viewState,
			).toBe('attached'),
		);
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally {
		await f.cleanup();
	}
});

test.each(['cancel', 'deadline'] as const)(
	'Controller local %s during scope await cannot renew admission or send raw input',
	async (cause) => {
		const f = await fixture();
		let release!: (value: Awaited<ReturnType<typeof f.controller.spaces.getControlScope>>) => void;
		try {
			const space = await f.controller.spaces.create({ name: 'B' });
			const created = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
			if (created.status !== 'created') throw Error('fixture failed');
			const target = {
				spaceId: space.id,
				sessionId: created.session.sessionId,
				runtimeId: created.session.runtime.runtimeId,
			};
			const scope = await f.controller.spaces.getControlScope();
			vi.spyOn(f.controller.spaces, 'getControlScope').mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						release = resolve;
					}),
			);
			vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
			const controller = new AbortController();
			const pending = f.controller.terminalControl(
				{
					protocolVersion: 1,
					requestId: cause,
					operation: 'terminal.send-text',
					target,
					params: { text: 'must not send' },
					timeoutMs: 100,
				},
				{ signal: controller.signal },
			);
			const rejection = expect(pending).rejects.toMatchObject({
				code: cause === 'cancel' ? 'WAIT_CANCELLED' : 'WAIT_TIMEOUT',
			});
			let settled = false;
			void pending.then(
				() => {
					settled = true;
				},
				() => {
					settled = true;
				},
			);
			if (cause === 'cancel') controller.abort();
			else await vi.advanceTimersByTimeAsync(101);
			await vi.advanceTimersByTimeAsync(0);
			try {
				expect(settled).toBe(true);
			} finally {
				release(scope);
				await rejection;
			}
			await vi.advanceTimersByTimeAsync(0);
			expect(f.input).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
			await f.cleanup();
		}
	},
);
