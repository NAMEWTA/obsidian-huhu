import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { DesktopHapTransport, type ManagedRunnerOptions } from '../../platform/desktop/transport/managed';
import type { BotClient } from '../../api';
import { HapConnection } from '../../core/protocol/connection';
import { EventClient } from './event-client';

const repository = fileURLToPath(new URL('../../../../../', import.meta.url));
const timers = { after: (ms: number, run: () => void) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } };
let root: string, binary: string;
function goFailureText(error: unknown) {
	const stderr = typeof error === 'object' && error !== null && 'stderr' in error ? String((error as { stderr?: unknown }).stderr ?? '') : '';
	const message = error instanceof Error ? error.message : String(error);
	return `${stderr}\n${message}`;
}
async function buildHuhubot(output: string) {
	const options = { cwd: join(repository, 'native/huhubot'), env: { ...process.env, GOTOOLCHAIN: 'go1.26.10', CGO_ENABLED: '0' }, timeout: 120000 };
	let last: unknown;
	for (let attempt = 1; attempt <= 4; attempt++) {
		try {
			await promisify(execFile)('go', ['build', '-o', output, './cmd/huhubot'], options);
			return;
		} catch (error) {
			last = error;
			if (!/INTERNAL_ERROR|proxy\.golang\.org|connection reset|ECONNRESET|ETIMEDOUT|TLS handshake|i\/o timeout|temporary error|502|503|504/.test(goFailureText(error)) || attempt === 4) throw error;
			await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
		}
	}
	throw last;
}
beforeAll(async () => {
	root = await mkdtemp(join(tmpdir(), 'huhu-events-runner-'));
	binary = join(root, process.platform === 'win32' ? 'huhubot.exe' : 'huhubot');
	await buildHuhubot(binary);
}, 130000);
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
async function options(): Promise<ManagedRunnerOptions> {
	const home = join(root, 'home'), state = join(root, 'state'), local = join(root, 'local');
	await mkdir(home, { recursive: true, mode: 0o700 });
	const profiles = process.platform === 'darwin' ? join(home, 'Library/Application Support/HUHU/huhubot/profiles')
		: process.platform === 'win32' ? join(local, 'HUHU/huhubot/profiles') : join(state, 'huhu/huhubot/profiles');
	return { binary, cwd: root, profileDir: join(profiles, 'events'), shutdownGraceMs: 2000,
		environment: { HOME: home, USERPROFILE: home, XDG_STATE_HOME: state, LOCALAPPDATA: local, SystemRoot: process.env.SystemRoot } };
}
async function start(configuration: ManagedRunnerOptions) {
	const transport = await DesktopHapTransport.launch(configuration);
	try {
		const client = await new HapConnection(transport, timers).connect({ name: 'event-e2e', version: '1' });
		return { transport, client };
	} catch (error) { transport.close(); await transport.exited; throw error; }
}
function command(bot: BotClient, id: string) {
	return { profileId: bot.hello.profile.profileId, commandEpoch: bot.hello.profile.commandEpoch, commandId: id, idempotencyKey: id };
}

it('tails a real durable Run through production BotClient/EventClient, detaches without cancellation and reopens its cursor', async () => {
	const configuration = await options();
	const first = await start(configuration);
	let reopened: Awaited<ReturnType<typeof start>> | undefined;
	const projections: EventClient[] = [];
	try {
		const bot = first.client, profileId = bot.hello.profile.profileId;
		const agent = (await bot.agents.list({ profileId })).items[0]!;
		const session = await bot.sessions.create({ ...command(bot, 'event-session'), kind: 'direct', title: 'offline events', memberIds: [agent.id] });
		const accepted = await bot.runs.start({ ...command(bot, 'event-run'), expectedRevision: session.revision, sessionId: session.id,
			intent: 'offline event fixture', sourceRefs: [] });
		const events = new EventClient(bot, timers, { poll: false }); projections.push(events);
		const stream = events.attach(accepted.runId);
		await stream.refresh();
		expect(BigInt(stream.getSnapshot().projection.seq)).toBeGreaterThanOrEqual(1n);
		stream.dispose();
		// Page detach does not invoke runs.cancel or own/close the process. The real executor still reaches its offline failure.
		const until = Date.now() + 5000;
		let run = await bot.runs.get({ profileId, id: accepted.runId });
		while (!['failed', 'succeeded', 'canceled'].includes(run.status) && Date.now() < until) {
			await bot.runs.subscribe({ profileId, runId: accepted.runId, afterSeq: '0', waitMillis: 50 });
			run = await bot.runs.get({ profileId, id: accepted.runId });
		}
		expect(run.status).toBe('failed'); // No model adapter or real credentials are installed in this test.
		const tail = events.attach(accepted.runId);
		await tail.refresh();
		expect(tail.getSnapshot().projection.status).toBe(run.status);
		const finalSeq = tail.getSnapshot().projection.seq;
		await expect(bot.runs.subscribe({ profileId, runId: accepted.runId, afterSeq: '9223372036854775807' }))
			.rejects.toMatchObject({ data: { kind: 'INVALID_ARGUMENT', reason: 'EVENT_CURSOR_AHEAD' } });
		await expect(bot.service.health({})).resolves.toEqual({ status: 'ok' });
		bot.close(); await first.transport.exited;
		expect(tail.getSnapshot().projection.pendingText).toBe('');
		reopened = await start(configuration);
		const after = await reopened.client.runs.subscribe({ profileId, runId: accepted.runId, afterSeq: finalSeq });
		expect(after).toMatchObject({ runId: accepted.runId, events: [], nextSeq: finalSeq, headSeq: finalSeq, hasMore: false });
		const rebuilt = new EventClient(reopened.client, timers, { poll: false }); projections.push(rebuilt);
		const restored = rebuilt.attach(accepted.runId); await restored.refresh();
		expect(restored.getSnapshot().projection).toMatchObject({ status: run.status, seq: finalSeq });
	} finally {
		for (const projection of projections) projection.dispose();
		first.client.close(); reopened?.client.close();
		await Promise.all([first.transport.exited, ...(reopened ? [reopened.transport.exited] : [])]);
	}
}, 20000);
