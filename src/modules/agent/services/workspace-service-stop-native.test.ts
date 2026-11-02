import { existsSync } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import { NativeHost } from '../../../host/desktop/native/host';
import { PtyHelper } from '../../../host/desktop/native/helper';
import type { NativeLease } from '../../../shared/native/host';
import type { TextStorage } from '../../../shared/storage/ports';
import { normalizeTerminalSettings } from '../core/terminal/settings';
import { createDesktopSpacePorts } from '../platform/desktop/spaces/ports';
import { SpaceService } from './spaces/space-service';
import { TerminalSessions } from './terminal/sessions';
import { WorkspaceService } from './workspace-service';
import { createSpaceWorkspaceStore } from './workspace-store';
import { freeWriterPorts } from '../platform/desktop/spaces/free-writer-port.fixture';
const requestedBinary = process.env.HUHU_TEST_PTY_BINARY;
if (requestedBinary !== undefined && !existsSync(requestedBinary))
	throw new Error(`HUHU_TEST_PTY_BINARY does not exist: ${requestedBinary}`);
const binary = resolve(requestedBinary ?? 'native/pty-server/target/debug/huhu-pty');
async function bounded<T>(operation: Promise<T>, label: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			operation,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 12000);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}
function gone(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return false;
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code === 'ESRCH') return true;
		throw cause;
	}
}
async function until(check: () => boolean, label: string, timeout = 5000): Promise<void> {
	const deadline = Date.now() + timeout;
	while (!check()) {
		if (Date.now() >= deadline) throw new Error(`Timed out: ${label}`);
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
}

test.skipIf(process.platform !== 'linux' || !existsSync(binary))(
	'natural root exit leaves an owned scope which explicit stop and force still clean',
	async () => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-t04-late-stop-'));
		let helper: PtyHelper | undefined, childPid: number | undefined;
		const requested = vi.fn();
		const native = new NativeHost(async (events) => {
			helper = await PtyHelper.start(binary, events, globalThis as unknown as Window, { HOME: root });
			const send = helper.requestStop!.bind(helper);
			vi.spyOn(helper, 'requestStop').mockImplementation((sid, options) => {
				requested(sid, options);
				send(sid, options);
			});
			return helper;
		});
		const sessions = new TerminalSessions({
			native,
			platform: 'linux',
			environment: async () => ({ HOME: root, PATH: '/bin:/usr/bin' }),
			settings: () => normalizeTerminalSettings({}),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		const ref = sessions.reserveManaged({
			id: 'stable',
			spaceId: 'space',
			kind: 'shell',
			title: 'natural',
			createdAt: 0,
			lastAttempt: { runtimeId: 'natural-runtime', acceptedAt: 0, state: 'unconfirmed' },
		});
		const browser = await native.acquire('cookies');
		let session: Awaited<ReturnType<TerminalSessions['create']>> | undefined;
		try {
			const sqlite = createRequire(import.meta.url)('node:sqlite') as {
				DatabaseSync: new (path: string) => { exec(sql: string): void; close(): void };
			};
			const path = join(root, 'cookie.sqlite'),
				db = new sqlite.DatabaseSync(path);
			try {
				db.exec(
					"CREATE TABLE moz_cookies(host TEXT,name TEXT,value TEXT,path TEXT,expiry INTEGER,isSecure INTEGER,isHttpOnly INTEGER,sameSite INTEGER); INSERT INTO moz_cookies VALUES('.example.test','owned','fixture','/',1800000000,1,1,2)",
				);
			} finally {
				db.close();
			}
			session = await sessions.create({
				runtime: ref,
				kind: 'shell',
				title: 'natural',
				file: '/bin/bash',
				args: [
					'--noprofile',
					'--norc',
					'-c',
					`trap '' HUP; (trap '' HUP TERM; while :; do sleep 0.1; done) & echo $! > '${root}/child.pid'; sleep 0.3; exit 0`,
				],
				cwd: root,
			});
			await until(
				() => sessions.managedSummary(ref)?.termination?.cleanup.state === 'partial',
				'natural partial',
				12000,
			);
			childPid = Number(await readFile(join(root, 'child.pid'), 'utf8'));
			expect(gone(childPid)).toBe(false);
			sessions.requestManagedStop(ref);
			const first = sessions.managedSummary(ref)!.stop!;
			sessions.requestManagedStop(ref, true);
			const second = sessions.managedSummary(ref)!.stop!;
			expect(requested).toHaveBeenCalledTimes(2);
			expect(second.requestId).toBe(first.requestId);
			expect(second.requestedAt).toBe(first.requestedAt);
			await until(
				() => sessions.managedSummary(ref)?.termination?.cleanup.state === 'confirmed',
				'explicit cleanup',
			);
			await until(() => gone(childPid!), 'descendant gone');
			const cookieReceipt = await browser.value.request('cookies', 'read', { path, kind: 'firefox' });
			expect(cookieReceipt).toMatchObject({ rows: [{ name: 'owned', value: 'fixture' }] });
			expect(browser.value.alive).toBe(true);
			console.log(
				JSON.stringify({
					binary,
					sha256: createHash('sha256')
						.update(await readFile(binary))
						.digest('hex'),
					rootPid: session.pid,
					childPid,
					requests: requested.mock.calls,
					termination: sessions.managedSummary(ref)?.termination,
					browserAlive: browser.value.alive,
					cookieReceipt,
				}),
			);
		} finally {
			const failures: unknown[] = [];
			const clean = async (task: () => Promise<unknown> | void) => {
				try {
					await task();
				} catch (cause) {
					failures.push(cause);
				}
			};
			if (helper && session && sessions.managedSummary(ref)?.termination?.cleanup.state !== 'confirmed') {
				await clean(async () => {
					helper!.requestStop!(session!.sid, { requestId: 'fixture-cleanup', force: true });
					await until(
						() => sessions.managedSummary(ref)?.termination?.cleanup.state === 'confirmed',
						'finally cleanup',
					);
				});
			}
			await clean(() => sessions.dispose());
			await clean(() => browser.release());
			await clean(() => native.dispose());
			if (childPid) await clean(() => until(() => gone(childPid!), 'owned descendant exit'));
			if (session?.pid) await clean(() => until(() => gone(session!.pid!), 'owned root exit'));
			if (helper) await clean(() => until(() => gone(helper!.pid), 'owned helper exit'));
			await clean(() => {
				if (childPid) expect(gone(childPid)).toBe(true);
				expect(helper?.alive).toBe(false);
				if (session?.pid) expect(gone(session.pid)).toBe(true);
				if (helper) expect(gone(helper.pid)).toBe(true);
			});
			console.log(
				JSON.stringify({
					rootPid: session?.pid,
					childPid,
					helperPid: helper?.pid,
					cleanup: {
						rootExited: session?.pid ? gone(session.pid) : true,
						childExited: childPid ? gone(childPid) : true,
						helperExited: helper ? gone(helper.pid) : true,
					},
					cleanupFailures: failures.length,
				}),
			);
			if (failures.length) throw new AggregateError(failures, `Retained failed fixture: ${root}`);
			await rm(root, { recursive: true, force: true });
		}
	},
	25000,
);

test.skipIf(process.platform !== 'linux' || !existsSync(binary))(
	'real managed stop checkpoints cleanup before Space archival, preserves records on reload, and leaves Browser ownership connected',
	async () => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-t04-stop-native-')),
			home = join(root, 'home');
		await mkdir(home);
		const ports = createDesktopSpacePorts({
			vaultRoot: root,
			vaultId: 'stop-fixture',
			deviceId: 'stop-fixture',
			win: { require: createRequire(import.meta.url) } as Window,
			writerPort: freeWriterPorts(),
		});
		const storage: TextStorage = {
			exists: async (p) => {
				try {
					await access(join(root, p));
					return true;
				} catch {
					return false;
				}
			},
			read: (p) => readFile(join(root, p), 'utf8'),
			write: (p, text) => writeFile(join(root, p), text),
			mkdir: async (p) => {
				await mkdir(join(root, p), { recursive: true });
			},
		};
		const errors: unknown[] = [],
			report = (cause: unknown) => {
				errors.push(cause);
			};
		const spaces = new SpaceService({ ...ports, storage, instanceId: 'stop-fixture', report });
		const pids = new Set<number>();
		let helper: PtyHelper | undefined, shellPid: number | undefined, browser: NativeLease | undefined;
		let nativeClosed = false,
			workspaceClosed = false,
			sessionsClosed = false;
		const acquired = vi.fn(),
			spawns = vi.fn();
		const native = new NativeHost(async (events) => {
			acquired();
			helper = await PtyHelper.start(binary, events, globalThis as unknown as Window, {
				HOME: home,
				USERPROFILE: home,
			});
			expect(helper.terminalTermination).toBe(1);
			const original = helper.spawnSession.bind(helper);
			vi.spyOn(helper, 'spawnSession').mockImplementation(async (sid, options) => {
				spawns();
				return original(sid, options);
			});
			return helper;
		});
		const sessions = new TerminalSessions({
			native,
			platform: 'linux',
			environment: async () => ({ HOME: home, PATH: '/usr/bin:/bin' }),
			settings: () => normalizeTerminalSettings({}),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		const workspace = new WorkspaceService(
			createSpaceWorkspaceStore(spaces, globalThis as unknown as Window, report),
			sessions,
			{
				shell: (options) =>
					sessions.create({
						...options,
						kind: 'shell',
						title: 'owned fixture',
						file: '/bin/bash',
						args: [
							'--noprofile',
							'--norc',
							'-c',
							'while :; do printf "HUHU_STOP_READY\\n"; if IFS= read -r -t 0.05 line; then printf "HUHU_CONTROL:%s\\n" "$line"; fi; done',
						],
						cwd: options.cwd!,
					}),
				agent: async () => {
					throw new Error('No Provider in this fixture');
				},
				resume: async () => {
					throw new Error('No Provider resume in this fixture');
				},
				account: () => '',
				report,
			},
			undefined,
			spaces,
		);
		try {
			await bounded(workspace.persistence.ready, 'load');
			const space = await bounded(spaces.create({ name: 'Stop fixture' }), 'create');
			const created = await bounded(
				workspace.createManaged({ kind: 'shell', shell: 'bash', spaceId: space.id }),
				'launch',
			);
			if (created.status !== 'created') throw new Error(JSON.stringify(created));
			const ref = {
					spaceId: space.id,
					sessionId: created.session.sessionId,
					runtimeId: created.session.runtime.runtimeId,
				},
				session = sessions.get(ref.runtimeId)!;
			shellPid = session.pid;
			expect(shellPid).toBeGreaterThan(0);
			if (shellPid) pids.add(shellPid);
			const otherSpace = await spaces.create({ name: 'Unrelated' });
			const other = await workspace.createManaged({ kind: 'shell', shell: 'bash', spaceId: otherSpace.id });
			if (other.status !== 'created') throw new Error(JSON.stringify(other));
			const otherSession = sessions.get(other.session.runtime.runtimeId)!;
			if (otherSession.pid) pids.add(otherSession.pid);
			await until(() => session.text().includes('HUHU_STOP_READY'), 'headless output');
			expect(Object.keys(workspace.store.getState().tabs)).toHaveLength(0);
			browser = await native.acquire('cookies', {}); // Capability only; no account, Cookie or user file is read.
			const stop = await bounded(workspace.stopManaged(ref), 'managed cleanup');
			expect(stop).toMatchObject({
				status: 'stopped',
				persisted: true,
				termination: {
					root: { state: 'exited' },
					cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 },
				},
			});
			await until(() => gone(shellPid!), 'Shell exit');
			expect(otherSession.running).toBe(true);
			expect(gone(otherSession.pid!)).toBe(false);
			const readyBefore = otherSession.text().split('HUHU_STOP_READY').length;
			otherSession.input('survives\r');
			await until(
				() => otherSession.text().includes('HUHU_CONTROL:survives'),
				'unrelated Session still accepts input/output',
			).catch((error: Error) => {
				// Failure-only evidence: did output keep flowing (input lost) or stall (output path)?
				const tail = otherSession.text();
				throw new Error(
					`${error.message}; running=${otherSession.running} readyLines ${readyBefore}->${tail.split('HUHU_STOP_READY').length}; tail=${JSON.stringify(tail.slice(-400))}`,
				);
			});
			const plan = await workspace.previewArchive({ kind: 'space', spaceId: space.id });
			expect(await bounded(workspace.archiveManaged(plan), 'archive')).toMatchObject({
				status: 'archived',
				rows: [{ persisted: true, status: 'stopped' }],
			});
			const disk = JSON.parse(await readFile(join(root, spaces.path), 'utf8'));
			expect(disk.spaces[space.id].archived).toBe(true);
			expect(disk.sessions[ref.sessionId]).toMatchObject({
				id: ref.sessionId,
				spaceId: space.id,
				shell: 'bash',
				lastAttempt: {
					runtimeId: ref.runtimeId,
					state: 'settled',
					termination: { cleanup: { state: 'confirmed' } },
				},
			});
			expect(disk.sessions[ref.sessionId].archived).not.toBe(true);
			expect(spawns).toHaveBeenCalledTimes(2);
			await bounded(workspace.drainManaged(), 'strict checkpoint drain');
			await bounded(sessions.dispose(), 'PTY release');
			sessionsClosed = true;
			expect(browser.value.alive).toBe(true);
			await bounded(workspace.dispose(), 'writer release');
			workspaceClosed = true;
			const reload = new SpaceService({ ...ports, storage, instanceId: 'reload', report });
			await reload.ready;
			expect(reload.store.getState().records.sessions[ref.sessionId]?.lastAttempt?.state).toBe('settled');
			expect(reload.list().map((row) => row.id)).toEqual([otherSpace.id]);
			await reload.dispose();
			expect(acquired).toHaveBeenCalledOnce();
			expect(spawns).toHaveBeenCalledTimes(2);
			const bytes = await readFile(binary);
			console.info(
				'[T04 managed native]',
				JSON.stringify({
					binary,
					binarySha256: createHash('sha256').update(bytes).digest('hex'),
					shellPid,
					otherPid: otherSession.pid,
					helperPid: helper!.pid,
					ref,
					termination: stop.termination,
					realSpawns: spawns.mock.calls.length,
					reloadZeroSpawn: true,
					browserSurvivedPtyRelease: true,
				}),
			);
			expect(errors).toEqual([]);
		} finally {
			const failures: unknown[] = [];
			const clean = async (task: () => Promise<unknown>) => {
				try {
					await bounded(task(), 'fixture cleanup');
				} catch (cause) {
					failures.push(cause);
				}
			};
			if (!sessionsClosed) {
				for (const session of sessions.list()) {
					if (session.pid) pids.add(session.pid);
					if (session.running) session.end(true);
				}
				await clean(() => sessions.dispose());
			}
			if (!workspaceClosed) await clean(() => workspace.dispose());
			if (browser) await clean(() => browser!.release());
			await clean(() => native.dispose());
			nativeClosed = true;
			if (helper) await clean(() => helper!.dispose());
			for (const pid of pids) await clean(() => until(() => gone(pid), `owned Shell ${pid} reaped`));
			if (helper) await clean(() => until(() => gone(helper!.pid), 'owned helper reaped'));
			if (failures.length) throw new AggregateError(failures, `Retained failed fixture: ${root}`);
			const writer = await ports.owners.acquire(await ports.directories.inspectVault(), 'after-stop-fixture');
			await writer.close();
			console.info(
				'[T04 managed native cleanup]',
				JSON.stringify({
					shellPid,
					helperPid: helper?.pid,
					nativeClosed,
					pids: [...pids],
					shellsExited: [...pids].every(gone),
					helperExited: helper ? gone(helper.pid) : true,
					writerReleased: true,
				}),
			);
			await rm(root, { recursive: true, force: true });
		}
	},
	35000,
);
