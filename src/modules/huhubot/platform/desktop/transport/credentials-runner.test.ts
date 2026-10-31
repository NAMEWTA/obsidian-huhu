import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import type { AgentDraft } from '../../../api';
import { HapDecoder, encodeHapFrame, type HapMessage } from '../../../core/protocol/codec';
import { HapConnection } from '../../../core/protocol/connection';
import { AssistantClient } from '../../../services/assistant-client';
import { DesktopHapTransport, launchManagedBotSession, type ManagedRunnerOptions } from './managed';

const repository = fileURLToPath(new URL('../../../../../../', import.meta.url));
const temporary: string[] = [];
const sessions: Array<{ close(): void; exited: Promise<void> }> = [];
let binary: string;
let buildRoot: string;
beforeAll(async () => {
	buildRoot = await mkdtemp(join(tmpdir(), 'huhu-credential-build-'));
	binary = join(buildRoot, process.platform === 'win32' ? 'huhubot.exe' : 'huhubot');
	await promisify(execFile)('go', ['build', '-o', binary, './cmd/huhubot'], {
		cwd: join(repository, 'native/huhubot'),
		env: { ...process.env, GOTOOLCHAIN: 'go1.26.10', CGO_ENABLED: '0' }, timeout: 120_000,
	});
}, 130_000);
afterEach(async () => {
	const running = sessions.splice(0);
	for (const session of running) session.close();
	await Promise.all(running.map((session) => session.exited));
	await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
afterAll(async () => { await rm(buildRoot, { recursive: true, force: true }); });
async function configuration(): Promise<ManagedRunnerOptions> {
	const root = await mkdtemp(join(tmpdir(), 'huhu-credential-runner-')); temporary.push(root);
	const home = join(root, 'home'), state = join(root, 'state'), local = join(root, 'local');
	await mkdir(home, { recursive: true, mode: 0o700 });
	const profiles = process.platform === 'darwin' ? join(home, 'Library/Application Support/HUHU/huhubot/profiles')
		: process.platform === 'win32' ? join(local, 'HUHU/huhubot/profiles') : join(state, 'huhu/huhubot/profiles');
	return { binary, profileDir: join(profiles, 'test'), cwd: root, shutdownGraceMs: 1000,
		environment: { HOME: home, USERPROFILE: home, XDG_STATE_HOME: state, LOCALAPPDATA: local, SystemRoot: process.env.SystemRoot } };
}
async function start(options: ManagedRunnerOptions) {
	const session = await launchManagedBotSession(options, { name: 'credential-integration', version: '1' });
	sessions.push(session); return session;
}
const draft: AgentDraft = { name: 'Credential-free draft', description: '', persona: '', model: {
	providerId: 'fixture', modelId: 'fixture', endpoint: 'https://example.invalid', protocol: 'openai-responses', capabilities: [],
} };

it('uses real extra pipes for session memory, safe HAP snapshots, deletion and restart-missing', async () => {
	const options = await configuration();
	const first = await start(options);
	const sentinel = 'credential-only-sentinel';
	const registration = await first.credentials.register(Buffer.from(sentinel), 'session-memory');
	if (process.platform === 'linux') {
		const children = (await readFile(`/proc/self/task/${process.pid}/children`, 'utf8')).trim().split(/\s+/);
		const runner = (await Promise.all(children.map(async (pid) => ({ pid, executable: await readlink(`/proc/${pid}/exe`).catch(() => '') }))))
			.find((child) => child.executable === binary);
		expect(runner).toBeDefined();
		for (const name of ['cmdline', 'environ']) expect(await readFile(`/proc/${runner!.pid}/${name}`, 'utf8')).not.toContain(sentinel);
	}
	expect(registration).toMatchObject({ mode: 'session-memory', state: 'available' });
	await expect(first.credentials.status(registration.credentialRef)).resolves.toMatchObject({ mode: 'session-memory', state: 'available' });
	const assistant = new AssistantClient(first.client);
	const create = { commandId: 'cmd:draft', idempotencyKey: 'intent:draft', commandEpoch: first.client.hello.profile.commandEpoch, draft };
	const agent = await assistant.createAgent(create);
	expect(agent.model?.credentialStatus).toMatchObject({ mode: 'none', state: 'missing' });
	await expect(assistant.createAgent(create)).resolves.toEqual(agent);
	await expect(assistant.testModel(draft.model!)).rejects.toThrow('MODEL_UNAVAILABLE: CREDENTIAL_MISSING');
	const bound = await assistant.bindModel({ commandId: 'cmd:bind', idempotencyKey: 'intent:bind', commandEpoch: create.commandEpoch,
		expectedRevision: agent.revision, agentId: agent.id, model: { ...draft.model!, credentialRef: registration.credentialRef } });
	expect(bound.model?.credentialStatus).toMatchObject({ mode: 'session-memory', state: 'available' });
	await expect(assistant.updateAgent({ ...create, commandId: 'cmd:stale', idempotencyKey: 'intent:stale', id: agent.id, expectedRevision: agent.revision }))
		.rejects.toThrow('REVISION_CONFLICT');
	expect(JSON.stringify([first.client.hello, bound, await assistant.listAgents(), await assistant.listModels(), registration])).not.toContain(sentinel);
	await expect(first.credentials.delete(registration.credentialRef)).resolves.toMatchObject({ state: 'failed', reason: 'CREDENTIAL_IN_USE' });
	await assistant.bindModel({ commandId: 'cmd:unbind', idempotencyKey: 'intent:unbind', commandEpoch: create.commandEpoch,
		expectedRevision: bound.revision, agentId: agent.id, model: draft.model! });
	await expect(first.credentials.delete(registration.credentialRef)).resolves.toMatchObject({ state: 'missing', reason: 'CREDENTIAL_DELETED' });
	await expect(first.credentials.status(registration.credentialRef)).resolves.toMatchObject({ state: 'missing' });
	const volatile = await first.credentials.register(Buffer.from('restart-only-sentinel'), 'session-memory');
	first.close(); await first.exited;
	const restarted = await start(options);
	await expect(restarted.credentials.status(volatile.credentialRef)).resolves.toMatchObject({ mode: 'session-memory', state: 'missing', reason: 'CREDENTIAL_MISSING' });
	await expect(restarted.client.service.health({})).resolves.toEqual({ status: 'ok' });
});

it('binds private metadata and refs to the opened Profile without cross-Profile lookup', async () => {
	const owner = await start(await configuration());
	const credential = await owner.credentials.register(Buffer.from('profile-bound-sentinel'), 'session-memory');
	const other = await start(await configuration());
	await expect(other.credentials.status(credential.credentialRef)).resolves.toMatchObject({ mode: 'none', state: 'missing', reason: 'CREDENTIAL_MISSING' });
	const otherDraft = { ...draft, model: { ...draft.model!, credentialRef: credential.credentialRef } };
	await expect(new AssistantClient(other.client).createAgent({ commandId: 'cmd:foreign', idempotencyKey: 'intent:foreign', commandEpoch: other.client.hello.profile.commandEpoch, draft: otherDraft }))
		.rejects.toThrow('CREDENTIAL_MISSING');
	const transport = await DesktopHapTransport.launch({ ...await configuration(), credentialChannel: true }); sessions.push(transport);
	const bot = await new HapConnection(transport, { after: (ms, run) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } }).connect({ name: 'bad-profile', version: '1' });
	await expect(transport.openCredentials(`${bot.hello.profile.profileId}-other`)).rejects.toThrow('CREDENTIAL');
	await transport.exited;
});

it('ordinary HAP rejects credential resolution and cannot open private pipes', async () => {
	const transport = await DesktopHapTransport.launch({ ...await configuration(), managed: false }); sessions.push(transport);
	const decoder = new HapDecoder();
	const replies: HapMessage[] = [];
	let next: (() => void) | undefined;
	transport.onData((bytes) => { for (const payload of decoder.push(bytes)) replies.push(...(Array.isArray(payload) ? payload : [payload])); next?.(); });
	transport.onClose(() => next?.());
	async function exchange(method: string, params: Record<string, unknown>) {
		const arrived = new Promise<void>((resolve) => { next = resolve; });
		await transport.send(encodeHapFrame({ jsonrpc: '2.0', id: `c:${replies.length + 1}`, method, params: params as never }));
		await arrived; next = undefined; return replies.at(-1);
	}
	await exchange('protocol.hello', { protocolVersion: '0.1', client: { name: 'ordinary', version: '1' } });
	const denied = await exchange('credentials.resolve', { credentialRef: `credential:${'a'.repeat(32)}` });
	expect(denied).toMatchObject({ error: { data: { kind: 'CAPABILITY_DENIED', reason: 'METHOD_NOT_AVAILABLE' } } });
	await expect(transport.openCredentials('any-profile')).rejects.toThrow('CREDENTIAL_CHANNEL_UNAVAILABLE');
});

it('closes pending private writes and all pipes with the existing managed process lifecycle', async () => {
	const options = await configuration();
	const transport = await DesktopHapTransport.launch({ ...options, credentialChannel: true }); sessions.push(transport);
	const bot = await new HapConnection(transport, { after: (ms, run) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } }).connect({ name: 'cleanup', version: '1' });
	const credentials = await transport.openCredentials(bot.hello.profile.profileId);
	const pending = credentials.register(Buffer.from('shutdown-only-sentinel'), 'session-memory');
	transport.close();
	await expect(pending).resolves.toMatchObject({ state: 'unknown', reason: 'SESSION_CLOSED' });
	await transport.exited;
	expect(transport.diagnostics.stderr).not.toContain('shutdown-only-sentinel');
	const restarted = await start(options);
	await expect(restarted.client.service.health({})).resolves.toEqual({ status: 'ok' });
});
