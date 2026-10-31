import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import { NativeHost } from '../../../../host/desktop/native/host';
import { PtyHelper } from '../../../../host/desktop/native/helper';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { ControlResponse } from '../../../../shared/native/control-wire';
import type { ManagedRuntimeRef } from '../../core/workspace/managed-runtime';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { ControlEnvironment } from '../../platform/desktop/control/environment';
import { createDesktopSpacePorts } from '../../platform/desktop/spaces/ports';
import { SpaceService } from '../spaces/space-service';
import { WorkspaceService } from '../workspace-service';
import { createSpaceWorkspaceStore } from '../workspace-store';
import { TerminalSessions } from '../terminal/sessions';
import { ControlCommands } from './commands';
import { ControlRouter } from './router';
import { freeWriterPorts } from '../../platform/desktop/spaces/free-writer-port.fixture';
function binary(variable: string, name: string): string {
	const requested = process.env[variable],
		file = resolve(
			requested ?? `native/pty-server/target/debug/${name}${process.platform === 'win32' ? '.exe' : ''}`,
		);
	if (!existsSync(file))
		throw Error(`${variable} is required: ${file}; first run pnpm run check:native and supply both built binaries`);
	return file;
}
async function until(predicate: () => boolean, label: string, ms = 5000): Promise<void> {
	const end = Date.now() + ms;
	while (!predicate()) {
		if (Date.now() >= end) throw Error(`Timed out: ${label}`);
		await new Promise<void>((r) => setTimeout(r, 10));
	}
}
async function bounded<T>(value: Promise<T>, label: string, ms = 12000): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			value,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(Error(`Timed out: ${label}`)), ms);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}
function windowsControlEnv(): Record<string, string> {
	if (process.platform !== 'win32') return {};
	const inherited: Record<string, string> = {};
	for (const key of [
		'LOCALAPPDATA',
		'APPDATA',
		'SystemRoot',
		'SYSTEMROOT',
		'WINDIR',
		'PATHEXT',
		'TEMP',
		'TMP',
		'COMSPEC',
	]) {
		const value = process.env[key];
		if (value) inherited[key] = value;
	}
	return inherited;
}
function gone(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return false;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true;
		throw error;
	}
}

test('required real CLI routes background create/read/rename/stop through the production owners without blocking query behind disk', async () => {
	const ptyBinary = binary('HUHU_TEST_PTY_BINARY', 'huhu-pty'),
		cliBinary = binary('HUHU_TEST_CONTROL_BINARY', 'huhu');
	const root = await mkdtemp(join(tmpdir(), 'ht7-')),
		home = join(root, 'home'),
		win = globalThis as unknown as Window;
	await mkdir(home, { mode: 0o700 });
	const errors: unknown[] = [],
		pids = new Set<number>(),
		report = (error: unknown) => errors.push(error);
	const consumerError = vi.spyOn(console, 'error').mockImplementation((...args) => {
		errors.push(args);
	});
	const ports = createDesktopSpacePorts({
		vaultRoot: root,
		vaultId: 'control-fixture-vault',
		deviceId: 'control-fixture-device',
		win: { require: createRequire(import.meta.url) } as Window,
		writerPort: freeWriterPorts(),
	});
	let holdWrite: Promise<void> | undefined,
		releaseWrite: (() => void) | undefined,
		writeEntered = false;
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
		mkdir: async (p) => {
			await mkdir(join(root, p), { recursive: true });
		},
		write: async (p, data) => {
			if (holdWrite) {
				writeEntered = true;
				await holdWrite;
			}
			await writeFile(join(root, p), data);
		},
	};
	const spaces = new SpaceService({ ...ports, storage, instanceId: `control-${crypto.randomUUID()}`, report });
	let helper: PtyHelper | undefined,
		spawnCount = 0,
		stops = 0;
	const native = new NativeHost(async (events) => {
		helper = await PtyHelper.start(ptyBinary, events, win, {
			HOME: home,
			USERPROFILE: home,
			XDG_RUNTIME_DIR: root,
		});
		const original = helper.spawnSession.bind(helper);
		vi.spyOn(helper, 'spawnSession').mockImplementation(async (sid, options) => {
			spawnCount++;
			const pid = await original(sid, options);
			if (pid !== null) pids.add(pid);
			return pid;
		});
		const stop = helper.requestStop!.bind(helper);
		vi.spyOn(helper, 'requestStop').mockImplementation((sid, options) => {
			stops++;
			stop(sid, options);
		});
		return helper;
	});
	let environment!: ControlEnvironment, router!: ControlRouter;
	const routes = new Map<string, Readonly<Record<string, string>>>();
	const sessions = new TerminalSessions({
		native,
		platform: process.platform,
		environment: async () => ({ HOME: home, USERPROFILE: home, PATH: process.env.PATH ?? '' }),
		routeEnvironment: async (ref, lease) => {
			const route = await environment.routeEnvironment(ref, lease);
			routes.set(ref.runtimeId, route.env);
			return route;
		},
		settings: () => normalizeTerminalSettings({ statusHooks: false }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const shown = vi.fn(async () => {});
	const workspace = new WorkspaceService(
		createSpaceWorkspaceStore(spaces, win, report),
		sessions,
		{
			shell: (options) =>
				sessions.create({
					kind: 'shell',
					title: 'isolated producer',
					file: process.execPath,
					args: ['-e', "let n=0;setInterval(()=>process.stdout.write('HUHU_CONTROL_TICK:'+ ++n +'\\n'),20)"],
					cwd: options.cwd!,
					runtime: options.runtime,
					beforeSpawn: options.beforeSpawn,
				}),
			agent: async () => {
				throw Error('No real Provider is used');
			},
			resume: async () => {
				throw Error('No resume is used');
			},
			account: () => '',
			show: shown,
			report,
		},
		undefined,
		spaces,
	);
	router = new ControlRouter(new ControlCommands(spaces, workspace, sessions));
	environment = new ControlEnvironment({
		native,
		scope: () => spaces.getControlScope(),
		capture: (call, scope) => router.capture(call, scope),
		closed: () => {
			void router.close().catch(report);
		},
	});
	let browser: Awaited<ReturnType<NativeHost['acquire']>> | undefined;
	const cliProcesses = new Set<ReturnType<typeof spawn>>();
	const pendingCli = new Set<Promise<unknown>>();
	const cli = (
		args: string[],
		route: Readonly<Record<string, string>>,
	): Promise<{ exit: number | null; value: ControlResponse; stderr: string }> => {
		const child = spawn(cliBinary, [...args, '--json', '--timeout-ms', '10000'], {
			// The helper inherits this process, so its locator root is LOCALAPPDATA.
			// Unix already passes XDG_RUNTIME_DIR; a cleared Windows environment makes
			// every command SOURCE_UNAVAILABLE (exit 5) before it reaches the broker.
			env: {
				HOME: home,
				USERPROFILE: home,
				XDG_RUNTIME_DIR: root,
				PATH: process.env.PATH ?? '',
				...windowsControlEnv(),
				...route,
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		cliProcesses.add(child);
		let stdout = '',
			stderr = '';
		const done = new Promise<{ exit: number | null; value: ControlResponse; stderr: string }>((resolve, reject) => {
			child.on('error', reject);
			child.stdout!.on('data', (b: Buffer) => {
				stdout += b.toString('utf8');
				if (stdout.length > 131072) {
					child.kill();
					reject(Error('CLI stdout bound exceeded'));
				}
			});
			child.stderr!.on('data', (b: Buffer) => {
				stderr += b.toString('utf8');
				if (stderr.length > 131072) {
					child.kill();
					reject(Error('CLI stderr bound exceeded'));
				}
			});
			child.on('close', (exit) => {
				cliProcesses.delete(child);
				try {
					resolve({ exit, value: JSON.parse(stdout) as ControlResponse, stderr });
				} catch (cause) {
					reject(new Error(`CLI output was not JSON: ${stdout} / ${stderr}`, { cause }));
				}
			});
		});
		const operation = bounded(done, `CLI ${args.join(' ')}`, 15000);
		pendingCli.add(operation);
		void operation.then(
			() => pendingCli.delete(operation),
			() => pendingCli.delete(operation),
		);
		return operation;
	};
	try {
		await workspace.persistence.ready;
		const a = await spaces.create({ name: 'A' }),
			b = await spaces.create({ name: 'B' });
		await workspace.selectSpace(a.id);
		const first = await workspace.createManaged({ kind: 'shell', spaceId: a.id, foreground: true });
		if (first.status !== 'created') throw Error(JSON.stringify(first));
		const aRef: ManagedRuntimeRef = {
			spaceId: a.id,
			sessionId: first.session.sessionId,
			runtimeId: first.session.runtime.runtimeId,
		};
		const route = routes.get(aRef.runtimeId)!;
		expect(route).toBeDefined();
		const layout = structuredClone(workspace.store.getState());
		// The new record commit is deliberately stalled. Scope/query/stop must still enter independently.
		holdWrite = new Promise<void>((r) => {
			releaseWrite = r;
		});
		const creating = cli(['terminal', 'start', '--space', b.id, '--name', 'B'], route);
		await until(() => writeEntered, 'B primary write begins');
		const query = await cli(['space', 'get', '--space', a.id], route);
		expect(query.exit).toBe(0);
		expect(query.value).toMatchObject({ ok: true, data: { id: a.id } });
		const stopA = cli(['terminal', 'stop', '--session', aRef.sessionId, '--runtime', aRef.runtimeId], route);
		await until(() => stops > 0, 'real stop reaches the captured helper while disk is stalled');
		holdWrite = undefined;
		releaseWrite!();
		expect((await stopA).value).toMatchObject({ ok: true, phase: 'exited' });
		const created = await creating;
		expect(created.exit).toBe(0);
		expect(created.value).toMatchObject({ ok: true, phase: 'running', target: { spaceId: b.id } });
		const target = created.value.target!;
		expect(target.sessionId).toBeTypeOf('string');
		expect(target.runtimeId).toBeTypeOf('string');
		expect(spaces.store.getState().records.selectedSpaceId).toBe(a.id);
		expect(workspace.store.getState().activeGroupId).toBe(layout.activeGroupId);
		expect(shown).toHaveBeenCalledOnce();
		expect(Object.keys(spaces.store.getState().records.layouts[b.id]!.tabs)).toHaveLength(0);
		const bSession = sessions.get(target.runtimeId!)!;
		await until(() => bSession.text().includes('HUHU_CONTROL_TICK:'), 'background parsed output');
		const mark = vi.spyOn(workspace, 'markManagedSeen');
		const read = await cli(
			['terminal', 'read', '--session', target.sessionId!, '--runtime', target.runtimeId!, '--limit', '1000'],
			route,
		);
		expect(read.exit).toBe(0);
		expect(read.value).toMatchObject({ ok: true, data: { maxRows: 200 } });
		expect(JSON.stringify(read.value.data)).toContain('HUHU_CONTROL_TICK:');
		expect(mark).not.toHaveBeenCalled();
		const renamed = await cli(['session', 'rename', '--session', target.sessionId!, '--name', 'Renamed'], route);
		expect(renamed.exit).toBe(0);
		expect(spaces.store.getState().records.sessions[target.sessionId!]!.title).toBe('Renamed');
		const stale = await cli(['terminal', 'get', '--session', target.sessionId!, '--runtime', 'old-runtime'], route);
		expect(stale.value).toMatchObject({ ok: false, effect: 'none', error: { code: 'STALE_RUNTIME' } });
		const conflict = await cli(
			['terminal', 'get', '--space', a.id, '--session', target.sessionId!, '--runtime', target.runtimeId!],
			route,
		);
		expect(conflict.value).toMatchObject({ ok: false, effect: 'none', error: { code: 'SCOPE_MISMATCH' } });
		const noSpace = { ...route };
		delete noSpace.HUHU_SPACE_ID;
		const missing = await cli(['terminal', 'start'], noSpace);
		expect(missing.value).toMatchObject({ ok: false, effect: 'none', error: { code: 'TARGET_REQUIRED' } });
		const stopped = await cli(
			['terminal', 'stop', '--session', target.sessionId!, '--runtime', target.runtimeId!],
			route,
		);
		expect(stopped.value).toMatchObject({ ok: true, phase: 'exited' });
		expect(spawnCount).toBe(2);
		browser = await native.acquire('cookies');
		const sqlite = createRequire(import.meta.url)('node:sqlite') as {
				DatabaseSync: new (path: string) => { exec(sql: string): void; close(): void };
			},
			cookiePath = join(root, 'cookie.sqlite'),
			db = new sqlite.DatabaseSync(cookiePath);
		try {
			db.exec(
				"CREATE TABLE moz_cookies(host TEXT,name TEXT,value TEXT,path TEXT,expiry INTEGER,isSecure INTEGER,isHttpOnly INTEGER,sameSite INTEGER); INSERT INTO moz_cookies VALUES('.example.test','owned','fixture','/',1800000000,1,1,2)",
			);
		} finally {
			db.close();
		}
		await environment.close();
		expect(await browser.value.request('cookies', 'read', { path: cookiePath, kind: 'firefox' })).toMatchObject({
			rows: [{ name: 'owned', value: 'fixture' }],
		});
		console.info(
			'[control-native observed]',
			JSON.stringify({
				ptyBinary,
				ptySha256: createHash('sha256')
					.update(await readFile(ptyBinary))
					.digest('hex'),
				cliBinary,
				cliSha256: createHash('sha256')
					.update(await readFile(cliBinary))
					.digest('hex'),
				spawnCount,
				stops,
				pids: [...pids],
				helperPid: helper?.pid,
				readBytes: JSON.stringify(read.value).length,
				seenCalls: mark.mock.calls.length,
				cookieRequestAwaited: true,
			}),
		);
		expect(errors).toEqual([]);
	} finally {
		holdWrite = undefined;
		releaseWrite?.();
		for (const child of cliProcesses) child.kill();
		await Promise.allSettled([...pendingCli]);
		const failures: unknown[] = [];
		const clean = async (fn: () => void | Promise<unknown>) => {
			try {
				await bounded(Promise.resolve().then(fn), 'fixture cleanup');
			} catch (error) {
				failures.push(error);
			}
		};
		await clean(() => environment.close());
		await clean(() => router.close());
		await clean(() => workspace.drainManaged());
		await clean(() => sessions.dispose());
		await clean(() => browser?.release());
		await clean(() => native.dispose());
		await clean(() => workspace.dispose());
		await clean(() => spaces.dispose());
		for (const pid of [...pids, ...(helper?.pid ? [helper.pid] : [])])
			await clean(() => until(() => gone(pid), `owned PID ${pid} exits`));
		consumerError.mockRestore();
		if (errors.length) failures.push(...errors);
		console.info(
			'[control-native cleanup]',
			JSON.stringify({ pids: [...pids], helperPid: helper?.pid, failures: failures.length }),
		);
		if (failures.length) throw new AggregateError(failures, `Retained failed fixture ${root}`);
		await rm(root, { recursive: true, force: true });
	}
}, 45000);
