import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, test } from 'vitest';
import { NativeHost } from '../../../host/desktop/native/host';
import { PtyHelper } from '../../../host/desktop/native/helper';
import type { TextStorage } from '../../../shared/storage/ports';
import { normalizeTerminalSettings } from '../core/terminal/settings';
import { createDesktopSpacePorts } from '../platform/desktop/spaces/ports';
import { SpaceService } from './spaces/space-service';
import { TerminalSessions } from './terminal/sessions';
import { WorkspaceService } from './workspace-service';
import { createSpaceWorkspaceStore } from './workspace-store';
import { freeWriterPorts } from '../platform/desktop/spaces/free-writer-port.fixture';

const requestedBinary = process.env.HUHU_TEST_PTY_BINARY;
if (requestedBinary !== undefined && !existsSync(requestedBinary)) throw new Error(`HUHU_TEST_PTY_BINARY does not exist: ${requestedBinary}`);
const binary = requestedBinary ?? 'native/pty-server/target/debug/huhu-pty';

function gone(pid: number): boolean {
	try { process.kill(pid, 0); return false; }
	catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true; throw error; }
}
async function until(predicate: () => boolean): Promise<void> {
	const deadline = Date.now() + 5000;
	while (!predicate()) { if (Date.now() >= deadline) throw new Error('Timed out waiting for fixture exit'); await new Promise(resolve => setTimeout(resolve, 10)); }
}

for (const lostReply of [false, true]) test.skipIf(process.platform !== 'linux')(lostReply
	? 'a real launched Shell with a lost transport reply remains unknown and cannot be blindly retried'
	: 'real missing Shell is a known partial failure with a saved Session and a correctable program configuration', async () => {
	const root = await mkdtemp(join(tmpdir(), 'huhu-t03-launch-failure-'));
	const ports = createDesktopSpacePorts({ vaultRoot: root, vaultId: 'fixture', deviceId: 'fixture', win: { require: createRequire(import.meta.url) } as Window, writerPort: freeWriterPorts() });
	const storage: TextStorage = { exists: async p => { try { await access(join(root, p)); return true; } catch { return false; } },
		read: p => readFile(join(root, p), 'utf8'), write: (p, text) => writeFile(join(root, p), text), mkdir: async p => { await mkdir(join(root, p), { recursive: true }); } };
	const errors: unknown[] = [], report = (error: unknown) => { errors.push(error); };
	const spaces = new SpaceService({ ...ports, storage, instanceId: 'fixture', report });
	let helper: PtyHelper | undefined, shellPid: number | undefined;
	const native = new NativeHost(async events => {
		helper = await PtyHelper.start(binary, lostReply ? { ...events, exit() {} } : events, globalThis as unknown as Window, { HOME: root, USERPROFILE: root });
		if (!lostReply) return helper;
		const active = helper;
		return {
			get alive() { return active.alive; }, get version() { return active.version; },
			spawnSession: async (sid, options) => {
				// The helper really starts a process; only its last-mile reply/exit evidence is lost.
				shellPid = (await active.spawnSession(sid, options)) ?? undefined;
				await active.dispose();
				throw new Error('Fixture lost the native reply after launch');
			}, input: active.input.bind(active), resize: active.resize.bind(active), acknowledge: active.acknowledge.bind(active),
			end: active.end.bind(active), history: active.history.bind(active), request: active.request.bind(active), dispose: () => active.dispose(),
		};
	});
	const sessions = new TerminalSessions({ native, environment: async () => ({ HOME: root, PATH: '/usr/bin:/bin' }), platform: 'linux',
		settings: () => normalizeTerminalSettings({}), colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	const workspace = new WorkspaceService(createSpaceWorkspaceStore(spaces, globalThis as unknown as Window, report), sessions, {
		shell: options => sessions.create({ kind: 'shell', title: 'missing', file: lostReply ? '/bin/bash' : join(root, 'no-such-shell'), args: lostReply ? ['--noprofile', '--norc', '-c', 'read -r -t 8'] : [], cwd: options.cwd!, runtime: options.runtime, beforeSpawn: options.beforeSpawn }),
		agent: async () => undefined, resume: async () => undefined, account: () => '', report,
	}, undefined, spaces);
	try {
		await workspace.persistence.ready;
		const space = await spaces.create({ name: 'Launch fixture', relativePath: '' });
		const result = await workspace.createManaged({ kind: 'shell', spaceId: space.id, shell: 'custom' });
		expect(result).toMatchObject(lostReply
			? { status: 'failed', effect: 'unknown', error: { code: 'EFFECT_UNKNOWN', nextAction: 'inspect-runtime' }, session: { runtime: { phase: 'disconnected' } } }
			: { status: 'failed', effect: 'partial', error: { code: 'SOURCE_UNAVAILABLE', reason: 'program-rejected', messageKey: 'agent.managed.programMissing', nextAction: 'configure-program' }, session: { runtime: { phase: 'failed' } } });
		if (!result.session?.runtime) throw new Error('Missing saved target');
		const record = spaces.store.getState().records.sessions[result.session.sessionId]!;
		expect(JSON.parse(await readFile(join(root, spaces.path), 'utf8')).sessions[record.id]).toMatchObject({ spaceId: space.id, shell: 'custom' });
		if (lostReply) {
			expect(shellPid).toBeGreaterThan(0);
			expect(() => sessions.reserveManaged(record)).toThrow('STALE_RUNTIME');
			console.info(JSON.stringify({ kind: 'lost-reply-after-real-launch', helperPid: helper?.pid, shellPid, stableSessionId: record.id, effect: result.effect }));
			return;
		}
		expect(sessions.get(result.session.runtime.runtimeId)?.pid).toBeUndefined();
		expect(helper?.alive).toBe(true);
		// A known rejection permits an explicit corrected attempt for the same stable Session.
		const admission = await spaces.prepareSession(space.id, record, record.id), runtime = sessions.reserveManaged(admission.record);
		const corrected = await sessions.create({ kind: 'shell', title: 'corrected', file: '/bin/sh', args: ['-c', 'exit 7'], cwd: admission.cwd, beforeSpawn: admission.beforeSpawn, runtime });
		shellPid = corrected.pid;
		await until(() => corrected.connection === 'exited');
		expect(corrected.exitCode).toBe(7);
		expect(helper?.alive).toBe(true);
		expect(errors).toEqual([]);
		console.info(JSON.stringify({ kind: 'known-launch-rejection', helperPid: helper?.pid, shellPid, stableSessionId: record.id, correctedExit: corrected.exitCode }));
	} finally {
		await workspace.dispose();
		if (lostReply) await expect(sessions.dispose()).rejects.toBeInstanceOf(AggregateError); else await sessions.dispose();
		await native.dispose();
		if (helper) expect(gone(helper.pid)).toBe(true);
		if (shellPid) await until(() => gone(shellPid!));
		await rm(root, { recursive: true, force: true });
		console.info(JSON.stringify({ kind: 'launch-fixture-cleanup', helperExited: helper ? gone(helper.pid) : true, shellExited: shellPid ? gone(shellPid) : true, vaultRemoved: true }));
	}
}, 15_000);
