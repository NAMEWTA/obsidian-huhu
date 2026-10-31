import { execFile } from 'node:child_process';
import { link, mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { HapConnection } from '../../../core/protocol/connection';
import { HapDecoder, encodeHapFrame, type HapPayload } from '../../../core/protocol/codec';
import { DesktopHapTransport, launchBotClient, type ManagedRunnerOptions } from './managed';

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
		shutdownGraceMs: 2000,
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
	return { transport, client: await connection.connect(clientInfo) };
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
	await expect(first.client.service.shutdown({})).resolves.toEqual({ accepted: true });
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
