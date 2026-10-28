import { beforeEach, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import type { BotClient } from '../../../api';
import { createBotRuntime, defaultProfileRoot, localProfileBinding } from './client-runtime';

const mocks = vi.hoisted(() => ({ launch: vi.fn(), verify: vi.fn() }));
vi.mock('../transport/managed', () => ({ launchManagedBotSession: mocks.launch }));
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
	const stopping = runtime.stop();
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
		cwd: '/vault/.obsidian/plugins/huhu',
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
	await runtime.stop();
	expect(close).toHaveBeenCalledOnce();
	expect(runtime.client).toBeUndefined();
	complete(cleanup);
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
