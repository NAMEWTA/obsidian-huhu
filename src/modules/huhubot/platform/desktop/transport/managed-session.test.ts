import { expect, it, vi } from 'vitest';
import type { BotClient } from '../../../api';
import { DesktopHapTransport, launchManagedBotSession } from './managed';
import type { RunnerExit } from './managed-stop';
const mocks = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('../../../core/protocol/connection', async (original) => ({
 ...(await original<typeof import('../../../core/protocol/connection')>()),
 HapConnection: class { connect = mocks.connect; },
}));
const facts = { requested: true, executionDrained: true, persistenceComplete: true, profileReleased: true, finished: true, failures: [] };
function processOwner() {
 let exit!: (value: RunnerExit) => void;
 const result = new Promise<RunnerExit>(yes => { exit = yes; });
 const transport = { exit: result, exited: result.then(() => {}), close: vi.fn(), openCredentials: vi.fn().mockResolvedValue({}) };
 return { transport: transport as unknown as DesktopHapTransport, exit };
}
it('retains the Profile reservation across separate runtimes until final facts AND child close', async () => {
 const first = processOwner(), second = processOwner();
 const launch = vi.spyOn(DesktopHapTransport, 'launch').mockResolvedValueOnce(first.transport).mockResolvedValueOnce(second.transport);
 mocks.connect.mockResolvedValue({ hello: { profile: { profileId: 'profile:test' } }, service: { shutdown: vi.fn().mockResolvedValue(facts) } } as unknown as BotClient);
 const options = { binary: '/runner', cwd: '/', profileDir: '/profile-owner-success' };
 try {
  const owner = await launchManagedBotSession(options, { name: 'first', version: '1' });
  let releaseHost!: () => void;
  owner.retainUntil(new Promise<void>(resolve => { releaseHost = resolve; }));
  await expect(owner.stop({ timeoutMs: 1 })).rejects.toThrow('STOP_OBSERVATION_TIMEOUT');
  await expect(launchManagedBotSession(options, { name: 'second', version: '1' })).rejects.toThrow('HUHUBOT_PROFILE_ALREADY_OWNED');
  expect(launch).toHaveBeenCalledOnce();
  first.exit({ code: 0, signal: null, forced: false });
  await first.transport.exited;
  await expect(launchManagedBotSession(options, { name: 'host-still-owned', version: '1' })).rejects.toThrow('HUHUBOT_PROFILE_ALREADY_OWNED');
  releaseHost(); await owner.stop();
  const replacement = await launchManagedBotSession(options, { name: 'replacement', version: '1' });
  const stopping = replacement.stop(); second.exit({ code: 0, signal: null, forced: false }); await stopping;
 } finally { first.exit({ code: 0, signal: null, forced: false }); second.exit({ code: 0, signal: null, forced: false }); launch.mockRestore(); }
});
it('retains failed Profile recovery information across runtime instances', async () => {
 const process = processOwner();
 const launch = vi.spyOn(DesktopHapTransport, 'launch').mockResolvedValue(process.transport);
 mocks.connect.mockResolvedValue({ hello: { profile: { profileId: 'profile:failed' } }, service: { shutdown: vi.fn().mockResolvedValue({ ...facts, persistenceComplete: false, failures: ['PERSISTENCE_CLOSE_FAILED'] }) } } as unknown as BotClient);
 const options = { binary: '/runner', cwd: '/', profileDir: '/profile-owner-failure' };
 try {
  const owner = await launchManagedBotSession(options, { name: 'first', version: '1' });
  const stopping = owner.stop(); process.exit({ code: 1, signal: null, forced: false });
  await expect(stopping).rejects.toThrow('RUNNER_STOP_EXIT_FAILED');
  await expect(launchManagedBotSession(options, { name: 'second', version: '1' })).rejects.toThrow('HUHUBOT_RECOVERY_REQUIRED');
  expect(launch).toHaveBeenCalledOnce();
 } finally { process.exit({ code: 1, signal: null, forced: false }); launch.mockRestore(); }
});

vi.mock('../installation/binary', () => ({ ensureBotBinary: async () => '/runner' }));
vi.mock('node:fs/promises', async original => ({ ...(await original<typeof import('node:fs/promises')>()), realpath: async (path: string) => path }));
vi.mock('../../../../../host/obsidian/storage/device-id', () => ({ vaultIdentity: () => ({ vaultId: 'cleanup-vault', deviceId: 'cleanup-device' }) }));

it.each(['sync', 'async', 'reconnect'] as const)('retains the actual managed reservation after %s Host cleanup failure across runtimes', async mode => {
 const { createBotRuntime } = await import('../runtime/client-runtime');
 const process = processOwner(), shutdown = vi.fn().mockResolvedValue(facts);
 const launch = vi.spyOn(DesktopHapTransport, 'launch').mockResolvedValue(process.transport);
 const client = { state: 'ready', hello: { profile: { profileId: 'profile:host-failure' } }, service: { shutdown } };
 mocks.connect.mockResolvedValue(client);
 const storage = new Map<string, unknown>();
 const app = { vault: { adapter: { getBasePath: () => `/host-cleanup-${mode}` } },
  loadLocalStorage: (key: string) => storage.get(key), saveLocalStorage: (key: string, value: unknown) => storage.set(key, value) } as unknown as import('obsidian').App;
 const settings = { get: () => ({ binaryPath: '/runner', workingDirectory: '/', profileRoot: '' }) };
 const cleanup = vi.fn(() => {
  if (mode === 'async') return Promise.reject(new Error('HOST_DISPOSE_FAILED'));
  throw new Error('HOST_DISPOSE_FAILED');
 });
 const first = createBotRuntime(app, settings, { version: '1' }, async () => cleanup);
 const second = createBotRuntime(app, settings, { version: '1' });
 let reconnecting: Promise<unknown> | undefined;
 try {
  await first.start();
  if (mode === 'reconnect') { client.state = 'closed'; reconnecting = first.start().catch((error: unknown) => error); }
  else await expect(first.refreshHost()).rejects.toThrow('HOST_DISPOSE_FAILED');
  await expect(first.stop({ timeoutMs: 1 })).rejects.toThrow('STOP_OBSERVATION_TIMEOUT');
  await vi.waitFor(() => expect(shutdown).toHaveBeenCalledOnce());
  await expect(second.start()).rejects.toThrow('HUHUBOT_PROFILE_ALREADY_OWNED');
  expect(launch).toHaveBeenCalledOnce(); expect(first.state).toBe('stopping');
  process.exit({ code: 0, signal: null, forced: false });
  await expect(first.stop()).rejects.toThrow('HUHUBOT_STOP_FAILED');
  await reconnecting;
  expect(first.state).toBe('failed'); expect(cleanup).toHaveBeenCalledOnce();
  await expect(second.start()).rejects.toThrow('HUHUBOT_RECOVERY_REQUIRED');
  expect(launch).toHaveBeenCalledOnce();
 } finally { process.exit({ code: 0, signal: null, forced: false }); await first.stop().catch(() => {}); await reconnecting; launch.mockRestore(); }
});
