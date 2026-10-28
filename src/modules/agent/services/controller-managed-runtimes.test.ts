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
	const controlSent: import('../../../shared/native/control-wire').ControlMessage[] = [];
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

for (const lateFailure of [false, true])
	for (const stalled of ['registry', 'checkpoint', 'layout'] as const)
		test(`production shutdown keeps native cleanup moving while ${stalled} persistence is stalled (late ${lateFailure ? 'failure' : 'success'})`, async () => {
			const f = await fixture();
			let release!: () => void, enter!: () => void;
			const gate = new Promise<void>((resolve) => {
					release = resolve;
				}),
				entered = new Promise<void>((resolve) => {
					enter = resolve;
				});
			let operation: Promise<void> | undefined;
			const writer = createDesktopSpacePorts({
				vaultRoot: f.root,
				vaultId: 'fixture-probe',
				deviceId: deviceId(f.app),
				win: f.win,
			});
			let browser: Awaited<ReturnType<NativeHost['acquire']>> | undefined;
			const messages = Reflect.get(Notice, 'messages') as string[],
				messageCount = messages.length;
			try {
				const space = await f.controller.spaces.create({ name: 'shutdown' });
				const created = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
				if (created.status !== 'created') throw new Error(JSON.stringify(created));
				const session = f.controller.sessions.get(created.session.runtime.runtimeId)!;
				browser = await f.native.acquire('cookies');
				const released = vi.spyOn(f.controller.spaces, 'dispose');
				const nativeCleanup = vi.spyOn(f.controller.sessions, 'dispose');
				if (stalled === 'registry') {
					await (Reflect.get(f.controller.runtime, 'loaded') as Promise<void>);
					const write = f.adapter.write,
						file = `.huhu/terminal-agent/${deviceId(f.app)}/automation-sessions.json`;
					f.adapter.write = async (path, text) => {
						if (path === file) {
							enter();
							await gate;
							if (lateFailure) throw new Error('fixture registry late rejection');
						}
						await write(path, text);
					};
					Reflect.apply(
						Reflect.get(f.controller.runtime, 'receive') as (...args: unknown[]) => void,
						f.controller.runtime,
						[
							{
								since: 0,
								action: { agentId: 'codex', cwd: f.root, prompt: 'registry fixture' },
								accountKey: '{}',
							},
							{ event: 'SessionStart', at: 1, data: { session_id: 'owned-registry' } },
						],
					);
				} else if (stalled === 'layout') {
					const flush = f.controller.workspace.persistence.flush.bind(f.controller.workspace.persistence);
					vi.spyOn(f.controller.workspace.persistence, 'flush').mockImplementation(async () => {
						enter();
						await gate;
						if (lateFailure) throw new Error('fixture layout late rejection');
						await flush();
					});
				} else {
					const write = f.adapter.write;
					f.adapter.write = async (path, text) => {
						enter();
						await gate;
						if (lateFailure) throw new Error('fixture checkpoint late rejection');
						await write(path, text);
					};
				}
				vi.useFakeTimers();
				let result: unknown = 'pending';
				operation = f.controller.dispose();
				void operation.then(
					() => {
						result = 'completed';
					},
					(error) => {
						result = error;
					},
				);
				await entered;
				await vi.advanceTimersByTimeAsync(16000);
				expect(session.inputReady()).toBe(false);
				expect(session.connection).toBe('exited');
				expect(result).toBeInstanceOf(AggregateError);
				expect(nativeCleanup).toHaveBeenCalledOnce();
				expect(released).not.toHaveBeenCalled();
				await expect(
					writer.owners.acquire(await writer.directories.inspectVault(), 'second-owner'),
				).rejects.toMatchObject({ code: 'OWNER_CONFLICT' });
				await expect(browser.value.request('cookies', 'read', {})).resolves.toEqual({});
				if (stalled === 'checkpoint')
					expect(
						JSON.parse(f.files.get(f.controller.spaces.path)!).sessions[created.session.sessionId]
							.lastAttempt.state,
					).toBe('unconfirmed');
				vi.useRealTimers();
				release();
				await vi.waitFor(() => expect(released).toHaveBeenCalledOnce());
				await (released.mock.results[0]!.value as Promise<void>).catch(() => {});
				if (lateFailure)
					await vi.waitFor(() =>
						expect(messages.slice(messageCount)).toContain(t('agent.managed.shutdownIncomplete')),
					);
				else {
					expect(
						JSON.parse(f.files.get(f.controller.spaces.path)!).sessions[created.session.sessionId]
							.lastAttempt.state,
					).toBe('settled');
					if (stalled === 'registry')
						expect(
							JSON.parse(
								f.files.get(`.huhu/terminal-agent/${deviceId(f.app)}/automation-sessions.json`)!,
							),
						).toMatchObject([{ sessionId: 'owned-registry' }]);
				}
				const lease = await writer.owners.acquire(await writer.directories.inspectVault(), 'after-settlement');
				await lease.close();
			} finally {
				vi.useRealTimers();
				release();
				await operation?.catch(() => {});
				if (browser) await browser.release();
				await f.cleanup().catch(() => {});
			}
		});

test('the production controller new-shell wrapper never opens the workbench after Space selection is cancelled', async () => {
	const f = await fixture();
	try {
		expect(await f.controller.newShell()).toBeUndefined();
		expect(f.opened).not.toHaveBeenCalled();
		expect(f.spawn).not.toHaveBeenCalled();
		expect(f.controller.workspace.getManagedSnapshot().sessions).toEqual([]);
	} finally {
		await f.cleanup();
	}
});

test('production shutdown retains the final native notice, resume provenance and parsed drain before writer release', async () => {
	const f = await fixture();
	let closing: Promise<void> | undefined;
	try {
		const space = await f.controller.spaces.create({ name: 'last evidence' });
		const created = await f.controller.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (created.status !== 'created') throw new Error(JSON.stringify(created));
		const session = f.controller.sessions.get(created.session.runtime.runtimeId)!;
		session.setActivity('done', { session_id: 'final-native', transcript_path: '/fixture/final.jsonl' });
		f.holdNativeStop();
		closing = f.controller.dispose();
		expect(f.controller.dispose()).toBe(closing);
		expect(session.inputReady()).toBe(false);
		f.events().termination?.(session.sid, {
			version: 1,
			sequence: 1,
			evidence: {
				root: { state: 'exited', code: 7, signal: null },
				cleanup: {
					state: 'pending',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: null,
				},
				output: 'unknown',
			},
		});
		f.events().output(session.sid, new TextEncoder().encode('last-output\x1b[5n'));
		await vi.waitFor(() => {
			expect(f.ack).toHaveBeenCalled();
			expect(f.input).toHaveBeenCalledWith(session.sid, '\x1b[0n');
		});
		expect(session.text()).toContain('last-output');
		f.events().termination?.(session.sid, {
			version: 1,
			sequence: 2,
			evidence: {
				root: { state: 'exited', code: 7, signal: null },
				cleanup: {
					state: 'confirmed',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: 0,
				},
				output: 'drained',
			},
		});
		f.events().exit(session.sid, 7, null);
		await closing;
		const record = JSON.parse(f.files.get(f.controller.spaces.path)!).sessions[created.session.sessionId];
		expect(record).toMatchObject({
			nativeSessionId: 'final-native',
			transcriptPath: '/fixture/final.jsonl',
			lastAttempt: {
				runtimeId: session.id,
				state: 'settled',
				termination: { root: { code: 7 }, cleanup: { state: 'confirmed' }, output: 'drained' },
			},
		});
		expect(f.controller.sessions.list()).toEqual([]);
	} finally {
		if (closing) await closing.catch(() => {});
		await f.cleanup();
	}
});

test('controller assembly reserves pending before the environment and preserves an external new focus on late success', async () => {
	const f = await fixture();
	let release!: () => void;
	try {
		const space = await f.controller.spaces.create({ name: 'foreground', relativePath: '' });
		await f.controller.workspace.selectSpace(space.id);
		f.choose(space.id);
		const original = f.doc.createElement('button'),
			other = f.doc.createElement('input');
		f.container.append(original, other);
		original.focus();
		let entered!: () => void;
		const waiting = new Promise<void>((resolve) => {
				entered = resolve;
			}),
			blocked = new Promise<void>((resolve) => {
				release = resolve;
			});
		vi.mocked(terminalEnvironment).mockImplementationOnce(async () => {
			entered();
			await blocked;
			return {};
		});
		const launching = f.controller.newShell();
		await waiting;
		expect(f.controller.workspace.listManaged(space.id)).toMatchObject([{ runtime: { phase: 'launch-pending' } }]);
		other.focus();
		release();
		const session = await launching;
		expect(session?.connection).toBe('connected');
		expect(f.doc.activeElement).toBe(other);
		expect(f.opened).not.toHaveBeenCalled();
		expect(f.controller.workspace.listManaged(space.id)).toMatchObject([
			{ runtime: { runtimeId: session?.id, phase: 'connected' }, viewState: 'background' },
		]);
		expect(Object.keys(f.controller.workspace.store.getState().tabs)).toHaveLength(0);
		expect(f.leafListeners.size).toBe(0);
	} finally {
		release?.();
		await f.cleanup();
	}
});

test('controller admission freezes account, CLI arguments, environment and permission mode before preparation waits', async () => {
	let entered!: () => void, release!: () => void;
	const waiting = new Promise<void>((resolve) => {
			entered = resolve;
		}),
		blocked = new Promise<void>((resolve) => {
			release = resolve;
		});
	const f = await fixture(async () => {
		entered();
		await blocked;
	});
	try {
		const space = await f.controller.spaces.create({ name: 'frozen launch', relativePath: '' });
		await f.settings.update(
			(draft) => {
				draft.permissionMode = 'manual';
				draft.enabled.codex = true;
				draft.agents.agents.codex.accountId = '旧账号';
				draft.overrides.codex = {
					command: process.execPath,
					args: '--model "old model"',
					env: { FROZEN: 'old' },
				};
			},
			{ persist: 'immediate' },
		);
		const launching = f.controller.workspace.createManaged({ kind: 'agent', agentId: 'codex', spaceId: space.id });
		await waiting;
		expect(f.controller.workspace.listManaged(space.id)).toMatchObject([
			{ accountId: '旧账号', runtime: { phase: 'launch-pending' } },
		]);
		await f.settings.update(
			(draft) => {
				draft.permissionMode = 'yolo';
				draft.enabled.codex = false;
				draft.agents.agents.codex.accountId = 'new-account';
				draft.overrides.codex = { command: '/unavailable/new-cli', args: '--new-args', env: { FROZEN: 'new' } };
			},
			{ persist: 'immediate' },
		);
		release();
		const result = await launching;
		expect(result).toMatchObject({
			status: 'created',
			session: { accountId: '旧账号', viewState: 'background', runtime: { phase: 'connected' } },
		});
		expect(accountEnv).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'codex' }),
			'旧账号',
			expect.any(String),
			expect.any(String),
			true,
		);
		const request = f.spawn.mock.calls[0]?.[1] as unknown as {
			file: string;
			args: string[];
			env: Record<string, string>;
		};
		expect(request.file).toBe(process.execPath);
		expect(request.args.slice(0, 2)).toEqual(['--model', 'old model']);
		expect(request.env).toMatchObject({ FROZEN: 'old', HUHU_ACCOUNT_NAME: '旧账号' });
		expect(f.opened).not.toHaveBeenCalled();
	} finally {
		release?.();
		await f.cleanup();
	}
});
