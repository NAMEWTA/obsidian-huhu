import { resolve } from 'node:path';
import { beforeEach, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import type { BotClient } from '../../../api';
import { createBotRuntime, defaultProfileRoot, localProfileBinding } from './client-runtime';

const mocks = vi.hoisted(() => ({ launch: vi.fn(), verify: vi.fn() }));
vi.mock('../transport/managed', () => ({ launchManagedBotSession: async (...args: unknown[]) => {
 const value = await mocks.launch(...args);
 let hostCleanup: Promise<void> | undefined;
 return { ...value, retainUntil: value.retainUntil ?? ((cleanup: Promise<void>) => { hostCleanup = cleanup; void cleanup.catch(() => {}); }), exit: value.exit ?? value.exited.then(() => ({ code: 0, signal: null, forced: false })), stop: value.stop ?? (async () => { value.close(); await value.exited; await hostCleanup; }) };
} }));
vi.mock('../installation/binary', () => ({ ensureBotBinary: mocks.verify }));
vi.mock('node:fs/promises', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:fs/promises')>()),
	realpath: async (value: string) => value,
}));
vi.mock('../../../../../host/obsidian/storage/device-id', () => ({
	vaultIdentity: () => ({ vaultId: 'vault-1', deviceId: 'device-1' }),
}));

const bindings = new Map<string, unknown>();
const app = {
	vault: { adapter: { getBasePath: () => '/vault' } },
	loadLocalStorage: (key: string) => bindings.get(key),
	saveLocalStorage: (key: string, value: unknown) => bindings.set(key, value),
} as unknown as App;
const settings = { get: () => ({ binaryPath: '/runner', workingDirectory: '', profileRoot: '' }) };
const manifest = { dir: '.obsidian/plugins/huhu', version: '1.0.0' };

beforeEach(() => {
	vi.clearAllMocks();
	mocks.launch.mockReset();
	mocks.verify.mockResolvedValue('/verified/runner');
});

it('keeps local Profile bindings stable while isolating copied Vault locations', () => {
	const first = localProfileBinding(app, 'vault-1', '/one');
	expect(localProfileBinding(app, 'vault-1', '/one')).toBe(first);
	expect(localProfileBinding(app, 'vault-1', '/copy')).not.toBe(first);
});

it('treats an empty Linux state environment like Go and rejects relative roots', () => {
	if (process.platform !== 'linux') return;
	const prior = process.env.XDG_STATE_HOME;
	try {
		process.env.XDG_STATE_HOME = '';
		expect(defaultProfileRoot()).toMatch(/\/\.local\/state\/huhu\/huhubot\/profiles$/);
		process.env.XDG_STATE_HOME = 'relative';
		expect(() => defaultProfileRoot()).toThrow('HUHUBOT_PROFILE_ROOT_INVALID');
	} finally {
		if (prior === undefined) delete process.env.XDG_STATE_HOME;
		else process.env.XDG_STATE_HOME = prior;
	}
});

it('closes a runner whose launch completes after its module has stopped', async () => {
	let finish!: (value: unknown) => void;
	mocks.launch.mockReturnValue(
		new Promise((resolve) => {
			finish = resolve;
		}),
	);
	const client = { state: 'ready' } as BotClient;
	const close = vi.fn();
	const runtime = createBotRuntime(app, settings, manifest);
	const starting = runtime.start();
	const result = starting.catch((error) => error as unknown);
	await vi.waitFor(() => expect(mocks.launch).toHaveBeenCalled());
	let stopped = false;
	const stopping = runtime.stop().then(() => { stopped = true; });
	await Promise.resolve(); await Promise.resolve();
	expect(stopped).toBe(false);
	expect(runtime.state).toBe('stopping');
	finish({ client, close, exited: Promise.resolve(), credentials: {} });
	await stopping;
	expect(await result).toBeInstanceOf(Error);
	expect(close).toHaveBeenCalledOnce();
	expect(runtime.client).toBeUndefined();
	expect(runtime.state).toBe('closed');
});

it('resolves the vault-relative plugin directory and verifies the executable before launching', async () => {
	mocks.launch.mockResolvedValue({
		client: { state: 'ready' },
		close: vi.fn(),
		exited: new Promise(() => {}),
		credentials: {},
	});
	const runtime = createBotRuntime(app, settings, manifest);
	await runtime.start();
	expect(mocks.verify).toHaveBeenCalled();
	expect(mocks.launch.mock.calls[0]?.[0]).toMatchObject({
		binary: '/verified/runner',
		// The launch cwd is the native path of the vault plugin directory (D:\vault\... on Windows).
		cwd: resolve('/vault', '.obsidian/plugins/huhu'),
	});
});

it('closes an already launched process while its Host registration is pending', async () => {
	let complete!: (cleanup: () => void) => void;
	const registering = vi.fn(
		() =>
			new Promise<() => void>((resolve) => {
				complete = resolve;
			}),
	);
	const close = vi.fn(),
		cleanup = vi.fn();
	mocks.launch.mockResolvedValue({ client: { state: 'ready' }, close, exited: Promise.resolve(), credentials: {} });
	const runtime = createBotRuntime(app, settings, manifest, registering);
	const starting = runtime.start().catch((error) => error as unknown);
	await vi.waitFor(() => expect(registering).toHaveBeenCalled());
	const stopping = runtime.stop();
	expect(close).toHaveBeenCalledOnce();
	expect(runtime.client).toBeUndefined();
	expect(runtime.state).toBe('stopping');
	complete(cleanup);
	await stopping;
	expect(await starting).toBeInstanceOf(Error);
	expect(cleanup).toHaveBeenCalledOnce();
});

it('restores Host ownership after restricted cleanup without spawning another process', async () => {
	const first = vi.fn(),
		second = vi.fn();
	const onConnect = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
	mocks.launch.mockResolvedValue({
		client: { state: 'ready' },
		close: vi.fn(),
		exited: Promise.resolve(),
		credentials: {},
	});
	// Keep the process alive until explicit stop.
	let exit!: () => void;
	const exited = new Promise<void>((resolve) => {
		exit = resolve;
	});
	mocks.launch.mockResolvedValue({ client: { state: 'ready' }, close: exit, exited, credentials: {} });
	const runtime = createBotRuntime(app, settings, manifest, onConnect);
	await runtime.start();
	await runtime.refreshHost();
	expect(onConnect).toHaveBeenCalledTimes(2);
	expect(first).toHaveBeenCalledOnce();
	expect(mocks.launch).toHaveBeenCalledOnce();
	await runtime.stop();
	expect(second).toHaveBeenCalledOnce();
});

it('reaps a closed connection before reconnecting instead of reporting the old client as ready', async () => {
	let release!: () => void;
	const exited = new Promise<void>((resolve) => {
		release = resolve;
	});
	const oldClient = { state: 'ready' };
	const nextClient = { state: 'ready' };
	const close = vi.fn(),
		cleanup = vi.fn();
	mocks.launch
		.mockResolvedValueOnce({ client: oldClient, close, exited, credentials: {} })
		.mockResolvedValueOnce({ client: nextClient, close: vi.fn(), exited: new Promise(() => {}), credentials: {} });
	const runtime = createBotRuntime(app, settings, manifest, async () => cleanup);
	await runtime.start();
	oldClient.state = 'closed';
	const reconnecting = runtime.start();
	expect(runtime.state).toBe('starting');
	expect(runtime.client).toBeUndefined();
	expect(mocks.launch).toHaveBeenCalledOnce();
	expect(close).toHaveBeenCalledOnce();
	release();
	expect(await reconnecting).toBe(nextClient);
	expect(runtime.state).toBe('ready');
	expect(mocks.launch).toHaveBeenCalledTimes(2);
	expect(cleanup).toHaveBeenCalledOnce();
});

it('keeps repeated stop pending until the original process and cleanup finish', async () => {
	let exit!: () => void;
	const exited = new Promise<void>((resolve) => { exit = resolve; });
	mocks.launch.mockResolvedValue({ client: { state: 'ready' }, close: vi.fn(), exited, credentials: {} });
	const runtime = createBotRuntime(app, settings, manifest);
	await runtime.start();
	const first = runtime.stop();
	let secondDone = false;
	const second = runtime.stop().then(() => { secondDone = true; });
	await Promise.resolve(); await Promise.resolve();
	expect(secondDone).toBe(false);
	expect(runtime.state).toBe('stopping');
	exit();
	await Promise.all([first, second]);
});

it('keeps a timed-out stop owned and rejects restart until its process and Host cleanup finish', async () => {
 let release!: () => void;
 const completed = new Promise<void>(yes => { release = yes; });
 const stop = vi.fn(() => completed), cleanup = vi.fn();
 mocks.launch.mockResolvedValue({ client: { state: 'ready' }, close: vi.fn(), stop, exited: completed, credentials: {} });
 const runtime = createBotRuntime(app, settings, manifest, async () => cleanup);
 await runtime.start();
 await expect(runtime.stop({ timeoutMs: 1 })).rejects.toThrow('STOP_OBSERVATION_TIMEOUT');
 expect(runtime.state).toBe('stopping'); expect(runtime.exited).toBe(completed);
 await expect(runtime.start()).rejects.toThrow('HUHUBOT_RUNTIME_CLOSED');
 const again = runtime.stop(); release(); await again;
 expect(stop).toHaveBeenCalledOnce(); expect(cleanup).toHaveBeenCalledOnce(); expect(runtime.state).toBe('closed');
});

it('preserves failed cleanup instead of reporting closed on later stop calls', async () => {
 mocks.launch.mockResolvedValue({ client: { state: 'ready' }, close: vi.fn(), stop: vi.fn().mockRejectedValue(new Error('PERSISTENCE_CLOSE_FAILED')), exited: new Promise(() => {}), credentials: {} });
 const runtime = createBotRuntime(app, settings, manifest);
 await runtime.start();
 await expect(runtime.stop()).rejects.toThrow('HUHUBOT_STOP_FAILED');
 expect(runtime.state).toBe('failed');
 await expect(runtime.stop()).rejects.toThrow('HUHUBOT_STOP_FAILED');
 expect(runtime.state).toBe('failed');
});

it('joins late Host cleanup failure in the original stop owner', async () => {
 let registered!: (cleanup: () => Promise<void>) => void;
 const registering = new Promise<() => Promise<void>>(yes => { registered = yes; });
 mocks.launch.mockResolvedValue({ client: { state: 'ready' }, close: vi.fn(), exited: Promise.resolve(), credentials: {} });
 const runtime = createBotRuntime(app, settings, manifest, () => registering);
 const starting = runtime.start().catch(() => {});
 await vi.waitFor(() => expect(mocks.launch).toHaveBeenCalled());
 await Promise.resolve(); await Promise.resolve();
 const stopped = runtime.stop();
 registered(async () => { throw new Error('HOST_CLEANUP_FAILED'); });
 await expect(stopped).rejects.toThrow('HUHUBOT_STOP_FAILED');
 await starting; expect(runtime.state).toBe('failed');
});

it('does not bypass a failed old stop on a second reconnect attempt', async () => {
 const client = { state: 'ready' };
 const stop = vi.fn().mockRejectedValue(new Error('STOP_FACTS_UNAVAILABLE'));
 mocks.launch.mockResolvedValue({ client, close: vi.fn(), stop, exited: new Promise(() => {}), credentials: {} });
 const runtime = createBotRuntime(app, settings, manifest);
 await runtime.start(); client.state = 'closed';
 await expect(runtime.start()).rejects.toThrow('STOP_FACTS_UNAVAILABLE');
 const retryError = await runtime.start().catch((error: unknown) => error);
 expect(mocks.launch).toHaveBeenCalledOnce();
 expect(retryError).toBeInstanceOf(Error);
 expect((retryError as Error).message).toBe('HUHUBOT_RECOVERY_REQUIRED');
});

it('owns a pre-hello process through exit but does not invent final persistence facts from EOF', async () => {
 let exit!: (result: { code: number; signal: null; forced: boolean }) => void;
 const result = new Promise<{ code: number; signal: null; forced: boolean }>(yes => { exit = yes; });
 const transport = { close: vi.fn(), exit: result, exited: result.then(() => {}) };
 const launched = vi.fn();
 mocks.launch.mockImplementation(async (_options, _client, _call, _limits, onLaunch) => {
  onLaunch(transport); launched();
  await transport.exited;
  throw new Error('REQUEST_ABORTED');
 });
 const runtime = createBotRuntime(app, settings, manifest);
 const starting = runtime.start().catch(() => {});
 await vi.waitFor(() => expect(launched).toHaveBeenCalled());
 await expect(runtime.stop({ timeoutMs: 1 })).rejects.toThrow('STOP_OBSERVATION_TIMEOUT');
 expect(runtime.state).toBe('stopping'); expect(transport.close).toHaveBeenCalledOnce();
 exit({ code: 0, signal: null, forced: false });
 await expect(runtime.stop()).rejects.toThrow('HUHUBOT_STOP_FAILED');
 await starting; expect(runtime.state).toBe('failed'); expect(runtime.stopFacts).toBeUndefined();
});

it.each(['sync', 'async'] as const)('retains a settled %s refresh cleanup failure until stop', async mode => {
 let exit!: () => void;
 const exited = new Promise<void>(resolve => { exit = resolve; });
 const cleanup = vi.fn(() => {
  if (mode === 'sync') throw new Error('HOST_DISPOSE_FAILED');
  return Promise.reject(new Error('HOST_DISPOSE_FAILED'));
 });
 const close = vi.fn(() => exit());
 mocks.launch.mockResolvedValue({ client: { state: 'ready' }, close, exited, credentials: {} });
 const runtime = createBotRuntime(app, settings, manifest, async () => cleanup);
 await runtime.start();
 await expect(runtime.refreshHost()).rejects.toThrow('HOST_DISPOSE_FAILED');
 await expect(runtime.stop()).rejects.toThrow('HUHUBOT_STOP_FAILED');
 expect(runtime.state).toBe('failed'); expect(cleanup).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
});

it('starts process stop despite synchronous reconnect cleanup failure and retains its delayed exit owner', async () => {
 let exit!: () => void;
 const exited = new Promise<void>(resolve => { exit = resolve; });
 const client = { state: 'ready' }, close = vi.fn();
 const cleanup = vi.fn(() => { throw new Error('HOST_DISPOSE_FAILED'); });
 mocks.launch.mockResolvedValue({ client, close, exited, credentials: {} });
 const runtime = createBotRuntime(app, settings, manifest, async () => cleanup);
 await runtime.start(); client.state = 'closed';
 const reconnecting = runtime.start().catch((error: unknown) => error);
 try {
  await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  await expect(runtime.stop({ timeoutMs: 1 })).rejects.toThrow('STOP_OBSERVATION_TIMEOUT');
  expect(runtime.state).toBe('stopping'); expect(runtime.exited).toBe(exited);
 } finally { exit(); await reconnecting; }
 await expect(runtime.stop()).rejects.toThrow('HUHUBOT_STOP_FAILED');
 expect(runtime.state).toBe('failed'); expect(cleanup).toHaveBeenCalledOnce(); expect(mocks.launch).toHaveBeenCalledOnce();
});
