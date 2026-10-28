import { existsSync } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test, vi, type MockInstance } from 'vitest';
import { NativeHost } from '../../../host/desktop/native/host';
import { PtyHelper } from '../../../host/desktop/native/helper';
import type { TextStorage } from '../../../shared/storage/ports';
import { normalizeTerminalSettings } from '../core/terminal/settings';
import { createDesktopSpacePorts } from '../platform/desktop/spaces/ports';
import { SpaceService } from './spaces/space-service';
import { TerminalSessions } from './terminal/sessions';
import type { TerminalSession } from './terminal/session';
import { WorkspaceService, type WorkspaceLaunchPort } from './workspace-service';
import { createSpaceWorkspaceStore } from './workspace-store';
import { freeWriterPorts } from '../platform/desktop/spaces/free-writer-port.fixture';

const requestedBinary = process.env.HUHU_TEST_PTY_BINARY;
if (requestedBinary !== undefined && !existsSync(requestedBinary)) throw new Error(`HUHU_TEST_PTY_BINARY does not exist: ${requestedBinary}`);
const binary = requestedBinary ?? ['release', 'debug']
	.map(profile => resolve(`native/pty-server/target/${profile}/huhu-pty`))
	.find(file => existsSync(file));
const shell = '/bin/bash';
const unavailable = process.platform !== 'linux' ? 'requires the Linux PTY fixture'
	: !binary ? 'build native/pty-server huhu-pty first'
		: !existsSync(shell) ? 'requires /bin/bash' : undefined;
if (unavailable) console.info(`[managed-native skip] ${unavailable}`);

async function bounded<T>(operation: Promise<T>, label: string, timeout = 8000): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([operation, new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), timeout);
		})]);
	} finally { clearTimeout(timer); }
}

async function until(predicate: () => boolean, label: string, timeout = 5000): Promise<void> {
	const deadline = Date.now() + timeout;
	while (!predicate()) {
		if (Date.now() >= deadline) throw new Error(`Timed out: ${label}`);
		await new Promise<void>(resolve => setTimeout(resolve, 20));
	}
}

function gone(pid: number): boolean {
	try { process.kill(pid, 0); return false; }
	catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true;
		throw error;
	}
}

function tick(session: TerminalSession): number {
	return Number([...session.text().matchAll(/HUHU_NATIVE_TICK:(\d+):\d+/g)].at(-1)?.[1] ?? 0);
}

// Only Bash builtins are used: no profile, Provider, background child or user command.
const script = `n=0
while :; do
  n=$((n+1))
  printf 'HUHU_NATIVE_TICK:%s:%s\\n' "$n" "$$"
  if IFS= read -r -t 0.04 command; then
    if [ "$command" = exit ]; then printf 'HUHU_NATIVE_EXIT\\n'; exit 0; fi
  fi
done`;

test.skipIf(!!unavailable)('real managed Shell stays alive and keeps its headless screen across background, detach and concurrent reattach', async () => {
	const root = await mkdtemp(join(tmpdir(), 'huhu-t03-managed-native-'));
	const home = join(root, 'home'), aDirectory = join(root, 'a'), bDirectory = join(root, 'b');
	const win = globalThis as unknown as Window;
	const ports = createDesktopSpacePorts({ vaultRoot: root, vaultId: 'native-fixture-vault', deviceId: 'native-fixture-device',
		win: { require: createRequire(import.meta.url) } as Window,
			writerPort: freeWriterPorts() });
	const storage: TextStorage = {
		exists: async path => { try { await access(join(root, path)); return true; } catch { return false; } },
		read: path => readFile(join(root, path), 'utf8'),
		write: (path, text) => writeFile(join(root, path), text),
		mkdir: async path => { await mkdir(join(root, path), { recursive: true }); },
	};
	const errors: unknown[] = [], report = (error: unknown) => { errors.push(error); };
	const chooser = vi.fn(async () => undefined as string | undefined);
	const spaces = new SpaceService({ ...ports, storage, instanceId: 'native-fixture-instance', selectSpace: chooser, report });
	let helper: PtyHelper | undefined;
	let spawn: MockInstance<PtyHelper['spawnSession']> | undefined;
	const native = new NativeHost(async events => {
		helper = await PtyHelper.start(binary!, events, win, { HOME: home, USERPROFILE: home });
		spawn = vi.spyOn(helper, 'spawnSession'); // Observes the real transport; no implementation is replaced.
		return helper;
	});
	const sessions = new TerminalSessions({ native, platform: 'linux', environment: async () => ({ HOME: home, PATH: '/usr/bin:/bin' }),
		settings: () => normalizeTerminalSettings({}), colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	const shown = vi.fn(async (_runtimeId: string) => {});
	const launch: WorkspaceLaunchPort = {
		shell: async options => {
			expect(options.runtime).toBeDefined();
			expect(options.beforeSpawn).toBeTypeOf('function');
			// A real JsonStore write must precede entry into the helper, even for a background launch.
			const disk = JSON.parse(await readFile(join(root, spaces.path), 'utf8'));
			expect(disk.sessions[options.runtime!.sessionId]).toMatchObject({ spaceId: options.runtime!.spaceId, kind: 'shell' });
			return sessions.create({ kind: 'shell', title: 'native fixture', file: shell, args: ['--noprofile', '--norc', '-c', script],
				cwd: options.cwd!, runtime: options.runtime, beforeSpawn: options.beforeSpawn });
		},
		agent: async () => { throw new Error('This fixture never starts a Provider'); },
		resume: async () => { throw new Error('Attach must not relaunch a runtime'); },
		account: () => 'system', show: shown, report,
	};
	const workspace = new WorkspaceService(createSpaceWorkspaceStore(spaces, win, report), sessions, launch, undefined, spaces);
	const pids = new Set<number>();
	let unsubscribe: (() => void) | undefined;
	try {
		await Promise.all([mkdir(home), mkdir(aDirectory), mkdir(bDirectory)]);
		await bounded(workspace.persistence.ready, 'load isolated Space records');
		expect(helper).toBeUndefined();
		const a = await bounded(spaces.create({ name: 'Foreground A', relativePath: 'a' }), 'create Space A');
		const b = await bounded(spaces.create({ name: 'Background B', relativePath: 'b' }), 'create Space B');
		await bounded(workspace.selectSpace(a.id), 'select Space A');
		const first = await bounded(workspace.createManaged({ kind: 'shell', spaceId: a.id, foreground: true, title: 'A' }), 'start foreground A');
		expect(first.status).toBe('created');
		if (first.status !== 'created') throw new Error(JSON.stringify(first));
		const aRuntime = first.session.runtime.runtimeId, aSession = sessions.get(aRuntime)!;
		if (aSession.pid) pids.add(aSession.pid);
		await until(() => tick(aSession) >= 2, 'A outputs without a renderer');
		const originalLayout = structuredClone(workspace.store.getState());
		expect(workspace.active?.kind).toBe('terminal');
		expect(sessions.focused?.id).toBe(aRuntime);
		expect(shown).toHaveBeenCalledExactlyOnceWith(aRuntime);

		const second = await bounded(workspace.createManaged({ kind: 'shell', spaceId: b.id, title: 'B' }), 'start background B');
		expect(second.status).toBe('created');
		if (second.status !== 'created') throw new Error(JSON.stringify(second));
		const target = { spaceId: b.id, sessionId: second.session.sessionId };
		const bRuntime = second.session.runtime.runtimeId, bSession = sessions.get(bRuntime)!;
		if (bSession.pid) pids.add(bSession.pid);
		expect(bSession.pid).toBeGreaterThan(0);
		expect(pids.size).toBe(2);
		expect(bSession.cwd).toBe(bDirectory);
		expect(spaces.store.getState().records.selectedSpaceId).toBe(a.id);
		expect(workspace.store.getState().activeGroupId).toBe(originalLayout.activeGroupId);
		expect(workspace.active?.id).toBe(originalLayout.groups[0]?.activeTabId);
		expect(sessions.focused?.id).toBe(aRuntime);
		expect(shown).toHaveBeenCalledOnce();
		expect(chooser).not.toHaveBeenCalled();
		expect(workspace.listManaged(b.id)).toMatchObject([{ ...target, runtime: { runtimeId: bRuntime, pid: bSession.pid, phase: 'connected' }, viewState: 'background' }]);
		expect(Object.values(workspace.store.getState().tabs).some(tab => tab.kind === 'terminal' && tab.sessionIds.includes(bRuntime))).toBe(false);
		expect(Object.keys(spaces.store.getState().records.layouts[b.id]?.tabs ?? {})).toHaveLength(0);
		await until(() => tick(bSession) >= 3, 'background B continues to output without a Pane');

		const attached = await bounded(Promise.all(Array.from({ length: 6 }, () => workspace.attachManaged(target, { expectedRuntimeId: bRuntime }))), 'concurrent initial attach');
		expect(attached.every(result => result.status === 'attached')).toBe(true);
		const ids = attached.map(result => result.status === 'attached' ? result.tabId : undefined);
		expect(new Set(ids).size).toBe(1);
		const tabId = ids[0]!;
		expect(spaces.store.getState().records.selectedSpaceId).toBe(b.id);
		expect(workspace.active?.id).toBe(tabId);
		expect(Object.keys(workspace.store.getState().tabs)).toEqual([tabId]);
		expect(sessions.get(bRuntime)).toBe(bSession);
		expect(spawn).toHaveBeenCalledTimes(2);
		const beforeDetach = tick(bSession);
		await bounded(workspace.close(tabId, async () => { throw new Error('Closing a Shell view must not ask to stop it'); }), 'close last B view');
		expect(workspace.active).toBeUndefined();
		expect(Object.keys(workspace.store.getState().tabs)).toHaveLength(0);
		expect(workspace.getManaged(target)).toMatchObject({ viewState: 'detached', runtime: { runtimeId: bRuntime, pid: bSession.pid, phase: 'connected' } });
		expect(bSession.running).toBe(true);
		expect(gone(bSession.pid!)).toBe(false);
		await until(() => tick(bSession) >= beforeDetach + 3, 'detached B continues real output into headless screen');
		const detachedTick = tick(bSession), retained = `HUHU_NATIVE_TICK:${detachedTick}:${bSession.pid}`;
		expect(bSession.snapshot()).toContain(retained);
		const reopened = await bounded(Promise.all(Array.from({ length: 6 }, () => workspace.attachManaged(target, { expectedRuntimeId: bRuntime }))), 'concurrent reattach');
		expect(reopened.every(result => result.status === 'attached')).toBe(true);
		expect(new Set(reopened.map(result => result.status === 'attached' ? result.tabId : undefined)).size).toBe(1);
		expect(Object.keys(workspace.store.getState().tabs)).toHaveLength(1);
		expect(workspace.getManaged(target)).toMatchObject({ viewState: 'attached', runtime: { runtimeId: bRuntime, pid: bSession.pid } });
		expect(sessions.get(bRuntime)).toBe(bSession);
		let replay = '';
		unsubscribe = bSession.subscribe(chunk => { replay += chunk; });
		await until(() => replay.includes(retained), 'reattached subscriber replays output received while detached');
		await until(() => tick(bSession) > detachedTick, 'reattached B continues output');
		expect(spawn).toHaveBeenCalledTimes(2);
		expect(sessions.list()).toHaveLength(2);
		await bounded(workspace.persistence.flush(), 'persist attached layout');
		const disk = JSON.parse(await readFile(join(root, spaces.path), 'utf8'));
		expect(disk.sessions[target.sessionId].spaceId).toBe(b.id);
		expect(Object.keys(disk.sessions)).toHaveLength(2);
		const bytes = await readFile(binary!);
		console.info('[managed-native observed]', JSON.stringify({ binary, binaryBytes: bytes.length, binarySha256: createHash('sha256').update(bytes).digest('hex'),
			aRuntime, bRuntime, bSessionId: target.sessionId, pids: [...pids], helperPid: helper!.pid, detachedTick, realSpawnCalls: spawn!.mock.calls.length }));
		expect(errors).toEqual([]);
	} finally {
		unsubscribe?.();
		const owned = sessions.list();
		for (const session of owned) { if (session.pid) pids.add(session.pid); if (session.running) session.end(true); }
		// Release this test's owners and await process exit before deleting its Vault.
		const cleanups = [() => sessions.dispose(), () => native.dispose(), () => helper?.dispose() ?? Promise.resolve(), () => workspace.dispose(), () => spaces.dispose()];
		const failures: unknown[] = [];
		for (const cleanup of cleanups) { try { await bounded(cleanup(), 'fixture owner shutdown'); } catch (error) { failures.push(error); } }
		for (const pid of [...pids, ...(helper?.pid ? [helper.pid] : [])]) {
			try { await until(() => gone(pid), `fixture process ${pid} exit`); } catch (error) { failures.push(error); }
		}
		if (failures.length) throw new AggregateError(failures, `Cleanup failed; retained fixture ${root}`);
		// Reacquisition proves the production writer listener has actually closed, not just stopped reporting held.
		const writer = await bounded(ports.owners.acquire(await ports.directories.inspectVault(), 'after-native-fixture-close'), 'writer released');
		await bounded(writer.close(), 'replacement writer close');
		console.info('[managed-native cleanup]', JSON.stringify({ pids: [...pids], helperPid: helper?.pid, processesExited: true, writerReleased: true, root }));
		await rm(root, { recursive: true, force: true });
	}
}, 35_000);
