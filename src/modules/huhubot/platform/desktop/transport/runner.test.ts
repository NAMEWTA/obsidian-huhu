import { execFile } from 'node:child_process';
import { link, mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { HapConnection } from '../../../core/protocol/connection';
import { HapDecoder, encodeHapFrame, type HapPayload } from '../../../core/protocol/codec';
import type { App } from 'obsidian';
import { createBotRuntime } from '../runtime/client-runtime';
import { managedStop, observeStop } from './managed-stop';
import { DesktopHapTransport, launchBotClient, type ManagedRunnerOptions } from './managed';

vi.mock('../installation/binary', () => ({ ensureBotBinary: async (options: { override: string }) => options.override }));
vi.mock('../../../../../host/obsidian/storage/device-id', () => ({ vaultIdentity: () => ({ vaultId: 'runtime-stop-vault', deviceId: 'runtime-stop-device' }) }));

const repository = fileURLToPath(new URL('../../../../../../', import.meta.url));
const childProcesses: DesktopHapTransport[] = [];
const temporary: string[] = [];
let binary: string;
let buildRoot: string;
// These cases launch and tear down a real Go runner. Under the full Vitest
// suite a cold subprocess can exceed the unit-test default of five seconds.
vi.setConfig({ testTimeout: 30_000 });
beforeAll(async () => {
	buildRoot = await mkdtemp(join(tmpdir(), 'huhu-bot-client-build-'));
	binary = join(buildRoot, process.platform === 'win32' ? 'huhubot.exe' : 'huhubot');
	await promisify(execFile)('go', ['build', '-o', binary, './cmd/huhubot'], {
		cwd: join(repository, 'native/huhubot'),
		env: { ...process.env, GOTOOLCHAIN: 'go1.26.10', CGO_ENABLED: '0' },
		timeout: 120_000,
	});
}, 130_000);
afterAll(async () => {
	await rm(buildRoot, { recursive: true, force: true });
});
afterEach(async () => {
	const processes = childProcesses.splice(0);
	for (const transport of processes) transport.close();
	await Promise.all(processes.map((transport) => transport.exited));
	await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function options(): Promise<ManagedRunnerOptions> {
	const root = await mkdtemp(join(tmpdir(), 'huhu-bot-client-'));
	temporary.push(root);
	const home = join(root, 'home');
	const state = join(root, 'state');
	const local = join(root, 'local');
	await mkdir(home, { recursive: true, mode: 0o700 });
	const profiles =
		process.platform === 'darwin'
			? join(home, 'Library/Application Support/HUHU/huhubot/profiles')
			: process.platform === 'win32'
				? join(local, 'HUHU/huhubot/profiles')
				: join(state, 'huhu/huhubot/profiles');
	return {
		binary,
		cwd: root,
		profileDir: join(profiles, 'test'),
		environment: {
			HOME: home,
			USERPROFILE: home,
			XDG_STATE_HOME: state,
			LOCALAPPDATA: local,
			SystemRoot: process.env.SystemRoot,
		},
		};
}
async function start(configuration: ManagedRunnerOptions, clientInfo = { name: 'vitest', version: '1' }) {
	const transport = await DesktopHapTransport.launch(configuration);
	childProcesses.push(transport);
	const connection = new HapConnection(transport, {
		after: (ms, run) => {
			const timer = setTimeout(run, ms);
			return () => clearTimeout(timer);
		},
	}, { requestTimeoutMs: 60_000 });
	const client = await connection.connect(clientInfo);
	return { transport, client, stop: managedStop(client, transport).stop };
}

it('starts the real runner, reads durable profile metadata, and reopens the same profile', async () => {
	const configuration = await options();
	const first = await start(configuration);
	const profile = first.client.hello.profile;
	await expect(first.client.service.health({})).resolves.toEqual({ status: 'ok' });
	await expect(first.client.profile.status({})).resolves.toMatchObject({ state: 'ready', schemaVersion: 1, profile });
	const lease = await first.client.host.attach({ workspaceId: 'workspace:fixture', capabilities: ['note.read'] });
	expect(lease.workspaceId).toBe('workspace:fixture');
	await expect(first.client.service.status({})).resolves.toMatchObject({ profile, hostAttached: true });
	await expect(first.client.host.detach({ leaseId: lease.leaseId })).resolves.toEqual({ detached: true });
	await expect(first.client.agents.get({ profileId: profile.profileId, id: 'agent:missing' })).rejects.toThrow(
		'NOT_FOUND: AGENT_NOT_FOUND',
	);
	await first.stop();
	await first.transport.exited;
	const second = await start(configuration);
	expect(second.client.hello.profile).toEqual(profile);
	second.client.close();
	await second.transport.exited;
});

it('rejects a competing managed writer and ordinary clients cannot attach Host or shutdown', async () => {
	const configuration = await options();
	const first = await start(configuration);
	await expect(launchBotClient(configuration, { name: 'competitor', version: '1' })).rejects.toThrow(
		'INSTANCE_CONFLICT',
	);
	await expect(first.client.service.health({})).resolves.toEqual({ status: 'ok' });
	first.client.close();
	await first.transport.exited;
	const ordinary = await start({ ...configuration, managed: false });
	await expect(ordinary.client.host.attach({ workspaceId: 'w', capabilities: ['note.read'] })).rejects.toThrow(
		'CAPABILITY_DENIED',
	);
	await expect(ordinary.client.service.shutdown({})).rejects.toThrow('CAPABILITY_DENIED');
	ordinary.client.close();
	await ordinary.transport.exited;
});

it('uses the shared Go/TS golden frame bytes', async () => {
	const fixtures: { valid: Array<{ payload: HapPayload; frameHex: string }> } = JSON.parse(
		await readFile(join(repository, 'contracts/hap/v0.1/fixtures/golden.json'), 'utf8'),
	) as never;
	for (const fixture of fixtures.valid) {
		const expected = new Uint8Array(Buffer.from(fixture.frameHex, 'hex'));
		expect(encodeHapFrame(fixture.payload)).toEqual(expected);
		const decoder = new HapDecoder();
		expect(decoder.push(expected.subarray(0, 2))).toEqual([]);
		expect(decoder.push(expected.subarray(2))).toEqual([fixture.payload]);
		decoder.finish();
	}
});

it('rejects unbounded writes and releases the runner on malformed protocol input', async () => {
	const configuration = await options();
	const transport = await DesktopHapTransport.launch(configuration);
	childProcesses.push(transport);
	const decoder = new HapDecoder();
	const frames: HapPayload[] = [];
	transport.onData((bytes) => {
		frames.push(...decoder.push(bytes));
	});
	transport.onClose(() => undefined);
	await transport.send(Uint8Array.of(0, 0, 0, 0));
	await transport.exited;
	expect(frames).toHaveLength(1);
	expect(frames[0]).toMatchObject({ jsonrpc: '2.0', id: null, error: { data: { kind: 'INVALID_ARGUMENT' } } });
	const restarted = await start(configuration);
	restarted.client.close();
	await restarted.transport.exited;
	const bounded = await DesktopHapTransport.launch({ ...configuration, maxQueuedBytes: 32 });
	childProcesses.push(bounded);
	await expect(bounded.send(new Uint8Array(33))).rejects.toThrow('STREAM_SLOW_CONSUMER');
	await bounded.exited;
});

it('rejects the shared Go/TS malformed frames with the same deterministic reasons', async () => {
	const fixtures: { invalid: Array<{ name: string; frameHex: string; reason: string }> } = JSON.parse(
		await readFile(join(repository, 'contracts/hap/v0.1/fixtures/golden.json'), 'utf8'),
	) as never;
	for (const fixture of fixtures.invalid) {
		const decoder = new HapDecoder();
		expect(() => {
			decoder.push(new Uint8Array(Buffer.from(fixture.frameHex, 'hex')));
			decoder.finish();
		}, fixture.name).toThrow(fixture.reason);
	}
});

it('reports the precise hardlink startup rejection and preserves the original Profile', async () => {
	const configuration = await options();
	const first = await start(configuration);
	const profile = first.client.hello.profile;
	first.client.close();
	await first.transport.exited;
	const database = join(configuration.profileDir, 'profile.sqlite3');
	const original = await readFile(database);
	const aliasDir = join(dirname(configuration.profileDir), 'alias');
	await mkdir(aliasDir, { recursive: true, mode: 0o700 });
	const aliasDatabase = join(aliasDir, 'profile.sqlite3');
	await link(database, aliasDatabase);
	await expect(
		launchBotClient({ ...configuration, profileDir: aliasDir }, { name: 'hardlink', version: '1' }),
	).rejects.toThrow('CAPABILITY_DENIED: PROFILE_DB_HARDLINK_UNSAFE');
	expect(await readFile(database)).toEqual(original);
	await rm(aliasDatabase);
	const reopened = await start(configuration);
	expect(reopened.client.hello.profile).toEqual(profile);
	reopened.client.close();
	await reopened.transport.exited;
});

it.each([
	{ name: 'ASCII', token: 'x' },
	{ name: 'Chinese', token: '测' },
	{ name: 'supplementary plane', token: '😀' },
])('keeps the public Unicode character bounds aligned through the real Runner: $name', async ({ token }) => {
	const accepted = token.repeat(128);
	const rejected = token.repeat(129);
	for (const field of ['name', 'version'] as const) {
		const configuration = await options();
		const identity = { name: 'vitest', version: '1', [field]: accepted };
		const current = await start(configuration, identity);
		await expect(current.client.service.health({})).resolves.toEqual({ status: 'ok' });
		current.client.close();
		await current.transport.exited;
		await expect(launchBotClient(configuration, { ...identity, [field]: rejected })).rejects.toThrow(
			'INVALID_METHOD_PARAMS',
		);
	}
	const current = await start(await options());
	for (const field of ['workspaceId', 'capability'] as const) {
		const params =
			field === 'workspaceId'
				? { workspaceId: accepted, capabilities: ['note.read'] }
				: { workspaceId: 'workspace:unicode', capabilities: [accepted] };
		const registered = await current.client.host.attach(params);
		expect(registered.workspaceId).toBe(params.workspaceId);
		expect(registered.capabilities).toEqual(params.capabilities);
		await expect(current.client.host.detach({ leaseId: registered.leaseId })).resolves.toEqual({ detached: true });
		const invalid =
			field === 'workspaceId' ? { ...params, workspaceId: rejected } : { ...params, capabilities: [rejected] };
		await expect(current.client.host.attach(invalid)).rejects.toThrow('INVALID_METHOD_PARAMS');
		await expect(current.client.service.status({})).resolves.toMatchObject({ hostAttached: false });
	}
	current.client.close();
	await current.transport.exited;
});

// SIGSTOP controls this transport's own child, not disk speed. T04 separately
// proves a slow actual WAL sync; this proves the TS caller/process/lock boundary.
it.skipIf(process.platform !== 'linux')('keeps a paused real Go owner and Profile after caller timeout, then resumes the same stop and reopens durable data', async () => {
 const configuration = await options();
 const first = await start(configuration);
 const profile = first.client.hello.profile;
 const agent = (await first.client.agents.list({ profileId: profile.profileId })).items[0]!;
 const record = await first.client.sessions.create({ profileId: profile.profileId, commandEpoch: profile.commandEpoch,
  commandId: 'cmd:stop-record', idempotencyKey: 'intent:stop-record', kind: 'direct', title: 'Stop ownership record', memberIds: [agent.id] });
 const committedProfile = (await first.client.service.status({})).profile;
 const pid = first.transport.pid;
 expect(pid).toBeTypeOf('number');
 let paused = false;
 try {
  process.kill(pid!, 'SIGSTOP'); paused = true;
  await expect.poll(async () => /State:\s+T/.test(await readFile(`/proc/${pid}/status`, 'utf8'))).toBe(true);
  await expect(first.stop({ timeoutMs: 20 })).rejects.toThrow('STOP_OBSERVATION_TIMEOUT');
  await expect(launchBotClient(configuration, { name: 'stop-competitor', version: '1' })).rejects.toThrow('INSTANCE_CONFLICT');
  expect(await readFile(join(configuration.profileDir, 'profile.sqlite3'))).not.toHaveLength(0);
  process.kill(pid!, 'SIGCONT'); paused = false;
  await first.stop();
  await expect(first.transport.exit).resolves.toEqual({ code: 0, signal: null, forced: false });
  const reopened = await start(configuration);
  expect(reopened.client.hello.profile).toEqual(committedProfile);
  await expect(reopened.client.sessions.get({ profileId: profile.profileId, id: record.id })).resolves.toMatchObject({ title: 'Stop ownership record' });
  await reopened.stop();
 } finally {
  if (paused) process.kill(pid!, 'SIGCONT');
  // Only the process launched above is eligible for explicit failed-test recovery.
  try { await first.stop({ timeoutMs: 5000 }); }
  catch (error) { first.transport.forceTerminate(); await first.transport.exited; throw error; }
 }
});

it.skipIf(process.platform !== 'linux')('keeps real runtime Profile ownership through timeout and actual exit, and requires recovery after an explicit forced exit', async () => {
 const configuration = await options();
 for (const key of ['HOME', 'USERPROFILE', 'LOCALAPPDATA', 'XDG_STATE_HOME']) vi.stubEnv(key, configuration.environment![key]!);
 const bindings = new Map<string, unknown>();
 const app = { vault: { adapter: { getBasePath: () => configuration.cwd } },
  loadLocalStorage: (key: string) => bindings.get(key), saveLocalStorage: (key: string, value: unknown) => bindings.set(key, value) } as unknown as App;
 const settings = { get: () => ({ binaryPath: binary, workingDirectory: configuration.cwd, profileRoot: '' }) };
 const create = () => createBotRuntime(app, settings, { dir: '.', version: '1.0.0' });
 let releaseHost!: () => void;
 const hostCleanup = new Promise<void>(resolve => { releaseHost = resolve; });
 const first = createBotRuntime(app, settings, { dir: '.', version: '1.0.0' }, async () => () => hostCleanup), second = create();
 const launch = vi.spyOn(DesktopHapTransport, 'launch');
 const owned: DesktopHapTransport[] = [];
 let paused: DesktopHapTransport | undefined;
 try {
  const client = await first.start();
  const firstProcess = await launch.mock.results[0]!.value as DesktopHapTransport;
  owned.push(firstProcess); childProcesses.push(firstProcess);
  process.kill(firstProcess.pid!, 'SIGSTOP'); paused = firstProcess;
  await expect.poll(async () => /State:\s+T/.test(await readFile(`/proc/${firstProcess.pid}/status`, 'utf8'))).toBe(true);
  await expect(first.stop({ timeoutMs: 20 })).rejects.toThrow('STOP_OBSERVATION_TIMEOUT');
  expect(first.state).toBe('stopping');
  await expect(second.start()).rejects.toThrow('HUHUBOT_PROFILE_ALREADY_OWNED');
  expect(launch).toHaveBeenCalledOnce();
  process.kill(firstProcess.pid!, 'SIGCONT'); paused = undefined;
  await firstProcess.exited;
  expect(first.state).toBe('stopping');
  await expect(second.start()).rejects.toThrow('HUHUBOT_PROFILE_ALREADY_OWNED');
  expect(launch).toHaveBeenCalledOnce();
  releaseHost();
  await first.stop();
  expect(first.state).toBe('closed');
  expect(first.stopFacts).toMatchObject({ finished: true, persistenceComplete: true, profileReleased: true, failures: [] });
  const replacement = await second.start();
  expect(replacement.hello.profile.profileId).toBe(client.hello.profile.profileId);
  expect(launch).toHaveBeenCalledTimes(2);
  const secondProcess = await launch.mock.results[1]!.value as DesktopHapTransport;
  owned.push(secondProcess); childProcesses.push(secondProcess);
  secondProcess.forceTerminate(); await secondProcess.exited;
  await expect(second.stop()).rejects.toThrow('HUHUBOT_STOP_FAILED');
  expect(second.state).toBe('failed');
  await expect(create().start()).rejects.toThrow('HUHUBOT_RECOVERY_REQUIRED');
  expect(launch).toHaveBeenCalledTimes(2);
 } finally {
  if (paused) process.kill(paused.pid!, 'SIGCONT');
  releaseHost();
  for (const transport of owned) {
   transport.close();
   try { await observeStop(transport.exited, { timeoutMs: 5000 }); }
   catch { transport.forceTerminate(); await transport.exited; }
  }
  launch.mockRestore(); vi.unstubAllEnvs();
 }
});

it.each(['sync', 'async'] as const)('keeps a real Runner Profile reserved after settled %s Host cleanup failure', async mode => {
 const configuration = await options();
 for (const key of ['HOME', 'USERPROFILE', 'LOCALAPPDATA', 'XDG_STATE_HOME']) vi.stubEnv(key, configuration.environment![key]!);
 const bindings = new Map<string, unknown>();
 const app = { vault: { adapter: { getBasePath: () => configuration.cwd } },
  loadLocalStorage: (key: string) => bindings.get(key), saveLocalStorage: (key: string, value: unknown) => bindings.set(key, value) } as unknown as App;
 const settings = { get: () => ({ binaryPath: binary, workingDirectory: configuration.cwd, profileRoot: '' }) };
 const cleanup = vi.fn(() => {
  if (mode === 'async') return Promise.reject(new Error('HOST_DISPOSE_FAILED'));
  throw new Error('HOST_DISPOSE_FAILED');
 });
 const first = createBotRuntime(app, settings, { dir: '.', version: '1' }, async () => cleanup);
 const second = createBotRuntime(app, settings, { dir: '.', version: '1' });
 const launch = vi.spyOn(DesktopHapTransport, 'launch');
 let owned: DesktopHapTransport | undefined;
 try {
  await first.start();
  owned = await launch.mock.results[0]!.value as DesktopHapTransport;
  childProcesses.push(owned);
  await expect(first.refreshHost()).rejects.toThrow('HOST_DISPOSE_FAILED');
  await expect(first.stop()).rejects.toThrow('HUHUBOT_STOP_FAILED');
  await owned.exited;
  expect(await owned.exit).toEqual({ code: 0, signal: null, forced: false });
  expect(first.stopFacts).toMatchObject({ finished: true, persistenceComplete: true, profileReleased: true, failures: [] });
  expect(first.state).toBe('failed'); expect(cleanup).toHaveBeenCalledOnce();
  await expect(second.start()).rejects.toThrow('HUHUBOT_RECOVERY_REQUIRED');
  expect(launch).toHaveBeenCalledOnce();
 } finally {
  if (owned) {
   owned.close();
   try { await observeStop(owned.exited, { timeoutMs: 5000 }); }
   catch { owned.forceTerminate(); await owned.exited; }
  }
  await first.stop().catch(() => {});
  launch.mockRestore(); vi.unstubAllEnvs();
 }
});
