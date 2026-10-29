import { createRequire } from 'node:module';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { mkdtemp, readFile, writeFile, mkdir, access, rm, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import type { NativeEvents } from '../../../shared/native/host';
import { NativeHost } from '../../../host/desktop/native/host';
import type { TextStorage } from '../../../shared/storage/ports';
import { createDesktopSpacePorts } from '../platform/desktop/spaces/ports';
import { createServer } from 'node:net';
import { writerPort } from '../platform/desktop/spaces/writer-owner';
import { freeWriterPorts } from '../platform/desktop/spaces/free-writer-port.fixture';
import { normalizeTerminalSettings } from '../core/terminal/settings';
import { SpaceService } from './spaces/space-service';
import { createSpaceWorkspaceStore } from './workspace-store';
import { TerminalSessions } from './terminal/sessions';
import type { BrowserPage, BrowserSpace, BrowserWorkspaceState } from '../../browser/core/contracts';
import { WorkspaceService, type WorkspaceBrowserHost, type WorkspaceLaunchPort } from './workspace-service';

const browserPage = (spaceId: string): BrowserPage => ({
	id: 'browser',
	spaceId,
	url: 'about:blank',
	title: 'browser',
	documentId: 'document',
	status: 'open',
	zoom: 1,
	viewportVersion: 0,
});
const browserSpace = (id: string): BrowserSpace => ({
	id,
	label: id,
	kind: 'task',
	retention: 'persistent',
	status: 'ready',
	pages: [],
	control: { mode: 'paused', epoch: 0 },
	createdAt: 1,
	updatedAt: 1,
});
const browserState = (): BrowserWorkspaceState => ({
	ready: true,
	readOnly: false,
	availability: { state: 'ready' },
	persistence: 'secure',
	ephemeralConsent: false,
	spaces: [],
	requests: [],
	cleanupPending: 0,
});

const clock = { setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number, clearTimeout: (id: number) => clearTimeout(id) } as Pick<Window, 'setTimeout' | 'clearTimeout'>;
async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'huhu-space-workspace-'));
	const portFor = freeWriterPorts();
	const ports = createDesktopSpacePorts({ vaultRoot: root, vaultId: 'vault', deviceId: 'device', win: { require: createRequire(import.meta.url) } as Window, writerPort: portFor });
	const adapter: TextStorage = { exists: async p => { try { await access(join(root, p)); return true; } catch { return false; } }, read: p => readFile(join(root, p), 'utf8'), write: (p, text) => writeFile(join(root, p), text), mkdir: async p => { await mkdir(join(root, p)); } };
	const chooser = vi.fn(async () => undefined as string | undefined);
	const spaces = new SpaceService({ ...ports, storage: adapter, instanceId: 'integration', selectSpace: chooser, report: vi.fn() });
	const spawn = vi.fn(async (_sid: number, _request: { cwd?: string }) => 42), acquired = vi.fn();
	let nativeEvents!: NativeEvents, sequence = 0;
	const exit = (sid: number, code = 0) => { nativeEvents.termination?.(sid, { version: 1, sequence: ++sequence, evidence: { root: { state: 'exited', code, signal: null }, cleanup: { state: 'confirmed', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 0 }, output: 'drained' } }); nativeEvents.exit(sid, code, null); };
	const native = new NativeHost(async events => { nativeEvents = events; acquired(); return { alive: true, terminalTermination: 1, requestStop: (sid: number) => exit(sid), version: 'fixture', spawnSession: spawn, input() {}, resize() {}, acknowledge() {}, end(sid) { queueMicrotask(() => exit(sid)); }, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => { events.closed('closed'); } }; });
	const environment = vi.fn(async () => ({}));
	const sessions = new TerminalSessions({ native, environment, settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	const launch: WorkspaceLaunchPort = {
		shell: options => sessions.create({ kind: 'shell', title: 'shell', file: 'sh', args: [], cwd: options.cwd!, runtime: options.runtime, beforeSpawn: options.beforeSpawn }),
		agent: (id, options) => sessions.create({ kind: 'agent', agentId: id, title: id, file: id, args: [], cwd: options.cwd!, runtime: options.runtime, beforeSpawn: options.beforeSpawn }),
		resume: (info, title, beforeSpawn) => sessions.create({ kind: 'agent', agentId: info.agentId, title, file: 'agent', args: [], cwd: info.cwd, beforeSpawn }),
		account: () => 'system', report: vi.fn(),
	};
	const workspace = new WorkspaceService(createSpaceWorkspaceStore(spaces, clock, vi.fn()), sessions, launch, (): WorkspaceBrowserHost => ({
		resolveInput: (value: string) => value,
		getState: browserState,
		createSpace: async () => browserSpace('browser-space'),
		openPage: async () => browserPage('browser-space'),
	}), spaces);
	await workspace.persistence.ready;
	return { root, ports, portFor, spaces, adapter, workspace, sessions, native, launch, spawn, acquired, chooser, environment, exit, async cleanup() { try { await workspace.dispose(); } finally { await sessions.dispose(); await native.dispose(); await rm(root, { recursive: true, force: true }); } } };
}

/** The port the fixture's own lease holds; child processes must contend for exactly that one. */
async function ownerPort(f: Awaited<ReturnType<typeof fixture>>): Promise<number> {
	return await f.portFor('device', (await f.ports.directories.inspectVault()).root);
}

test('a foreign process holding the hashed writer port cannot fail the fixture', async () => {
	const f = await fixture();
	const foreign = createServer();
	try {
		const hashed = writerPort('device', (await f.ports.directories.inspectVault()).root);
		await new Promise<void>((resolve, reject) => { foreign.once('error', reject); foreign.listen({ host: '127.0.0.1', port: hashed, exclusive: true }, () => resolve()); });
		expect(await ownerPort(f)).not.toBe(hashed);
		expect(await f.spaces.create({ name: 'occupied', relativePath: '' })).toMatchObject({ name: 'occupied' });
	} finally { await new Promise<void>(resolve => foreign.close(() => resolve())); await f.cleanup(); }
});

for (const mode of ['foreground', 'background', 'cross-space', 'reattach'] as const) {
	test(`managed ${mode} attachment keeps the admitted Shell when the global default differs`, async () => {
		const f = await fixture(), choices: unknown[] = [];
		f.launch.shell = options => {
			choices.push(options.shell);
			return f.sessions.create({ kind: 'shell', title: 'choice', file: options.shell === 'bash' ? 'explicit-bash' : 'global-default-zsh', args: [], cwd: options.cwd!, runtime: options.runtime, beforeSpawn: options.beforeSpawn });
		};
		try {
			const a = await f.spaces.create({ name: 'A', relativePath: '' }), b = await f.spaces.create({ name: 'B', relativePath: '' });
			await f.workspace.selectSpace(a.id);
			const result = await f.workspace.createManagedInteractive({ kind: 'shell', shell: 'bash', spaceId: mode === 'cross-space' ? b.id : a.id, foreground: mode === 'foreground' || mode === 'reattach' });
			if (result.status !== 'created') throw new Error('Missing fixture runtime');
			const target = result.session, runtime = target.runtime.runtimeId;
			if (mode === 'background' || mode === 'cross-space') expect(await f.workspace.attachManaged(target, { focus: mode !== 'cross-space' })).toMatchObject({ status: 'attached' });
			if (mode === 'cross-space') await f.workspace.selectSpace(b.id);
			if (mode === 'reattach') {
				await f.workspace.close(f.workspace.active!.id, async () => { throw new Error('Detach must not confirm stop'); });
				expect(await f.workspace.attachManaged(target)).toMatchObject({ status: 'attached' });
			}
			const tab = f.workspace.active;
			if (tab?.kind !== 'terminal') throw new Error('Missing attached view');
			expect(tab.panes[runtime]).toMatchObject({ shell: 'bash', persistentSessionId: target.sessionId });
			await f.workspace.persistence.flush();
			const disk = JSON.parse(await readFile(join(f.root, f.spaces.path), 'utf8'));
			expect(disk.layouts[target.spaceId].tabs[tab.id].panes[runtime].shell).toBe('bash');
			f.exit(f.sessions.get(runtime)!.sid);
			await f.spaces.flush();
			await f.workspace.restore(tab.id, runtime, true);
			expect(choices).toEqual(['bash', 'bash']);
			expect(f.spawn).toHaveBeenCalledTimes(2);
			expect(f.spawn.mock.calls[1]?.[1]).toMatchObject({ file: 'explicit-bash' });
		} finally { await f.cleanup(); }
	});
}

test('disk-read restored views restart from the persistent Session Shell even if an older layout lost that field', async () => {
	const f = await fixture();
	let reopened: WorkspaceService | undefined, sessions: TerminalSessions | undefined;
	try {
		const space = await f.spaces.create({ name: 'Persisted', relativePath: '' });
		await f.workspace.selectSpace(space.id);
		const result = await f.workspace.createManagedInteractive({ kind: 'shell', shell: 'bash', spaceId: space.id });
		if (result.status !== 'created' || f.workspace.active?.kind !== 'terminal') throw new Error('Missing saved view');
		const tabId = f.workspace.active.id, oldId = result.session.runtime.runtimeId;
		await f.workspace.persistence.flush();
		f.exit(f.sessions.get(oldId)!.sid);
		await f.workspace.stopManaged({ spaceId: space.id, sessionId: result.session.sessionId, runtimeId: oldId });
		const disk = JSON.parse(await readFile(join(f.root, f.spaces.path), 'utf8'));
		expect(disk.layouts[space.id].tabs[tabId].panes[oldId].shell).toBe('bash');
		await f.workspace.dispose(); await f.sessions.dispose();
		// Preserve the authoritative record while emulating a display reference from the buggy version.
		delete disk.layouts[space.id].tabs[tabId].panes[oldId].shell;
		await f.adapter.write(f.spaces.path, JSON.stringify(disk));
		const spaces = new SpaceService({ ...f.ports, storage: f.adapter, instanceId: 'readback', report: vi.fn() });
		sessions = new TerminalSessions({ native: f.native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
		const current = sessions, shell = vi.fn((options: Parameters<WorkspaceLaunchPort['shell']>[0]) => current.create({ kind: 'shell', title: 'readback', file: options.shell === 'bash' ? 'explicit-bash' : 'global-default-zsh', args: [], cwd: options.cwd!, runtime: options.runtime, beforeSpawn: options.beforeSpawn }));
		reopened = new WorkspaceService(createSpaceWorkspaceStore(spaces, clock, vi.fn()), current, { ...f.launch, shell }, undefined, spaces);
		await reopened.persistence.ready;
		expect(f.spawn).toHaveBeenCalledTimes(1); // Reading/opening a restored view must not launch.
		await reopened.restore(tabId, oldId, true);
		expect(shell).toHaveBeenCalledWith(expect.objectContaining({ shell: 'bash' }));
		expect(f.spawn.mock.calls[1]?.[1]).toMatchObject({ file: 'explicit-bash' });
	} finally { await reopened?.dispose(); await sessions?.dispose(); await f.cleanup(); }
});

test('real desktop owner + JsonStore + WorkspaceService preserve independent Space/layout/Session identity and never write v1', async () => {
	const f = await fixture();
	try {
		await f.workspace.newBrowser();
		await f.workspace.persistence.flush();
		expect(f.acquired).not.toHaveBeenCalled();
		expect(f.spawn).not.toHaveBeenCalled();
		const a = await f.spaces.create({ name: 'same', relativePath: '' }), b = await f.spaces.create({ name: 'same', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		// A directory outside the Space is refused outright (it never silently becomes the Space directory).
		await expect(f.workspace.newTerminal({ spaceId: a.id, cwd: '/forged' })).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED' });
		expect(f.spawn).not.toHaveBeenCalled();
		const first = await f.workspace.newTerminal({ spaceId: a.id });
		await f.workspace.persistence.flush();
		const tab = f.workspace.active;
		expect(tab?.kind).toBe('terminal');
		if (tab?.kind !== 'terminal') throw new Error('missing tab');
		const info = tab.panes[first!]!;
		expect(info.spaceId).toBe(a.id);
		expect(info.persistentSessionId).not.toBe(first);
		expect(f.spaces.store.getState().records.sessions[info.persistentSessionId!]?.spaceId).toBe(a.id);
		expect(f.spawn.mock.calls[0]?.[1]).toMatchObject({ cwd: f.root });
		await f.workspace.selectSpace(b.id);
		await f.workspace.newTerminal({ spaceId: b.id });
		await f.workspace.persistence.flush();
		const records = JSON.parse(await readFile(join(f.root, f.spaces.path), 'utf8'));
		expect(Object.keys(records.layouts[a.id].tabs)).toHaveLength(1);
		expect(Object.keys(records.layouts[b.id].tabs)).toHaveLength(1);
		expect(Object.values(records.sharedLayout.tabs)).toMatchObject([{ kind: 'browser' }]);
		await expect(access(join(f.root, '.huhu/terminal-agent/device/workspace.json'))).rejects.toThrow();
		const second = new SpaceService({ ...f.ports, storage: f.adapter, instanceId: 'competing', report: vi.fn() });
		await second.ready;
		await expect(second.create({ name: 'conflict', relativePath: '' })).rejects.toMatchObject({ code: 'OWNER_CONFLICT' });
		await expect(second.dispose()).rejects.toBeDefined();
	} finally { await f.cleanup(); }
});

test('production creation with one candidate still requires explicit choice; cancellation is zero admission/native acquisition', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'one', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		expect(await f.workspace.newTerminal()).toBeUndefined();
		expect(f.chooser).toHaveBeenCalledOnce();
		expect(Object.keys(f.spaces.store.getState().records.sessions)).toHaveLength(0);
		expect(f.acquired).not.toHaveBeenCalled();
		expect(f.spawn).not.toHaveBeenCalled();
		await expect(f.spaces.requireSpace(undefined)).rejects.toMatchObject({ code: 'TARGET_REQUIRED' });
		expect(f.chooser).toHaveBeenCalledOnce();
	} finally { await f.cleanup(); }
});

test('real adapter persistence failure keeps valid bytes and cannot enter helper or launch; verified retry recovers strict drain', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'a', relativePath: '' });
		const before = await readFile(join(f.root, f.spaces.path), 'utf8');
		const write = f.adapter.write;
		f.adapter.write = async () => { throw new Error('ENOSPC fixture'); };
		await expect(f.workspace.newTerminal({ spaceId: a.id })).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED' });
		expect(f.acquired).not.toHaveBeenCalled();
		expect(f.spawn).not.toHaveBeenCalled();
		expect(await readFile(join(f.root, f.spaces.path), 'utf8')).toBe(before);
		await expect(f.spaces.flush()).rejects.toBeDefined();
		f.adapter.write = write;
		await f.spaces.rename(a.id, 'recovered');
		await f.spaces.flush();
		expect(f.spaces.store.getState().error).toBeUndefined();
	} finally { await f.cleanup(); }
});

test('actual second process stays excluded throughout an accepted write/drain and obtains ownership only after close', async () => {
	const f = await fixture();
	const childFile = join(f.root, 'owner-probe.cjs');
	await build({ entryPoints: [fileURLToPath(new URL('../platform/desktop/spaces/writer-owner.fixture.ts', import.meta.url))], bundle: true, platform: 'node', format: 'cjs', outfile: childFile, logLevel: 'silent' });
	let entered!: () => void, release!: () => void;
	const waiting = new Promise<void>(resolve => { entered = resolve; });
	const blocked = new Promise<void>(resolve => { release = resolve; });
	const write = f.adapter.write;
	f.adapter.write = async (p, text) => { entered(); await blocked; await write(p, text); };
	const creating = f.spaces.create({ name: 'draining', relativePath: '' });
	await waiting;
	const closing = f.workspace.dispose();
	const competitor = fork(childFile, [f.root, 'vault', 'device', 'second', 'hold', String(await ownerPort(f))], { silent: true });
	const competitorExit = once(competitor, 'exit');
	try {
		const [message] = await once(competitor, 'message');
		expect(message).toMatchObject({ type: 'failed', code: 'OWNER_CONFLICT', reason: 'port-in-use' });
		await competitorExit;
		await expect(f.spaces.rename('missing', 'bad')).rejects.toMatchObject({ code: 'OWNER_CONFLICT' });
		release(); await creating; await closing;
		const next = fork(childFile, [f.root, 'vault', 'device', 'replacement', 'hold', String(await ownerPort(f))], { silent: true });
		const nextExit = once(next, 'exit');
		try { const [message] = await once(next, 'message'); expect(message).toMatchObject({ type: 'held' }); next.send('close'); await nextExit; }
		finally { if (next.exitCode === null && next.signalCode === null) next.kill(); await nextExit; }
	} finally { release(); if (competitor.exitCode === null && competitor.signalCode === null) competitor.kill(); await competitorExit; await f.cleanup(); }
});

test('Provider waiting leaves the disk queue free and Space switching never changes the admitted target', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' }), b = await f.spaces.create({ name: 'B', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		let entered!: () => void, release!: () => void;
		const waiting = new Promise<void>(resolve => { entered = resolve; }), blocked = new Promise<void>(resolve => { release = resolve; });
		const agent = f.launch.agent;
		f.launch.agent = async (id, options) => { entered(); await blocked; return agent(id, options); };
		const creating = f.workspace.newAgent('codex', { spaceId: a.id });
		await waiting;
		await f.workspace.selectSpace(b.id);
		await f.spaces.rename(b.id, 'B renamed while provider waits');
		release();
		const runtime = await creating;
		await f.spaces.flush();
		const records = f.spaces.store.getState().records;
		expect(records.selectedSpaceId).toBe(b.id);
		expect(Object.values(records.sessions)).toMatchObject([{ spaceId: a.id }]);
		expect(Object.values(records.layouts[a.id]!.tabs)).toEqual([]);
		expect(f.workspace.listManaged(a.id)).toMatchObject([{ runtime: { runtimeId: runtime }, viewState: 'background' }]);
		expect(Object.keys(f.workspace.store.getState().tabs)).toHaveLength(0);
	} finally { await f.cleanup(); }
});

test('a real directory replacement during helper environment preparation fails at the final spawn gate with a locatable saved Session', async () => {
	const f = await fixture();
	try {
		await mkdir(join(f.root, 'project'));
		const a = await f.spaces.create({ name: 'Project', relativePath: 'project' });
		await f.workspace.selectSpace(a.id);
		let entered!: () => void, release!: () => void;
		const waiting = new Promise<void>(resolve => { entered = resolve; }), blocked = new Promise<void>(resolve => { release = resolve; });
		f.environment.mockImplementation(async () => { entered(); await blocked; return {}; });
		const creating = f.workspace.newTerminal({ spaceId: a.id });
		await waiting;
		await rename(join(f.root, 'project'), join(f.root, 'project-old'));
		await mkdir(join(f.root, 'project'));
		release();
		const runtimeId = await creating;
		expect(f.spawn).not.toHaveBeenCalled();
		expect(f.sessions.get(runtimeId!)?.connection).toBe('failed');
		expect(Object.values(f.spaces.store.getState().records.sessions)).toMatchObject([{ spaceId: a.id }]);
		expect(f.workspace.active).toBeUndefined();
		expect(f.workspace.listManaged(a.id)).toMatchObject([{ runtime: { phase: 'failed', error: { code: 'DIRECTORY_NOT_AUTHORIZED' } } }]);
	} finally { await f.cleanup(); }
});

test('two admitted launches completing together append both tabs to the latest background Space layout without changing B', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' }), b = await f.spaces.create({ name: 'B', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		const releases: (() => void)[] = [];
		let entered!: () => void;
		const waiting = new Promise<void>(resolve => { entered = resolve; });
		const shell = f.launch.shell;
		f.launch.shell = async options => { await new Promise<void>(resolve => { releases.push(resolve); if (releases.length === 2) entered(); }); return shell(options); };
		const first = f.workspace.newTerminal({ spaceId: a.id }), second = f.workspace.newTerminal({ spaceId: a.id });
		await waiting;
		await f.workspace.selectSpace(b.id);
		await f.workspace.newBrowser();
		await f.workspace.persistence.flush();
		const bLayout = structuredClone(f.spaces.store.getState().records.layouts[b.id]);
		releases.forEach(release => release());
		const runtimes = await Promise.all([first, second]);
		expect(f.workspace.listManaged(a.id).every(row => row.viewState === 'background')).toBe(true);
		await Promise.all(f.workspace.listManaged(a.id).map(row => f.workspace.attachManaged(row, { expectedRuntimeId: row.runtime!.runtimeId, focus: false })));
		await f.spaces.flush();
		const records = f.spaces.store.getState().records;
		expect(records.selectedSpaceId).toBe(b.id);
		expect(records.layouts[b.id]).toEqual(bLayout);
		expect(Object.keys(records.sessions)).toHaveLength(2);
		expect(Object.values(records.layouts[a.id]!.tabs).flatMap(tab => tab.kind === 'terminal' ? tab.sessionIds : []).sort()).toEqual([...runtimes].sort());
		await f.workspace.selectSpace(a.id);
		expect(Object.values(f.workspace.store.getState().tabs).flatMap(tab => tab.kind === 'terminal' ? tab.sessionIds : []).sort()).toEqual([...runtimes].sort());
	} finally { await f.cleanup(); }
});

test('production creation rejects changed disk version/scope before any recovery write or native acquisition', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' });
		const valid = await readFile(join(f.root, f.spaces.path), 'utf8');
		const backup = await readFile(join(f.root, f.spaces.path + '.backup'), 'utf8');
		const records = JSON.parse(valid);
		const write = vi.spyOn(f.adapter, 'write'), makeDirectory = vi.spyOn(f.adapter, 'mkdir');
		for (const replacement of [{ version: 3 }, { ...records, vaultId: 'foreign' }, { ...records, deviceId: 'foreign' }, { ...records, physicalRoot: { ...records.physicalRoot, ino: '999' } }]) {
			const bytes = JSON.stringify(replacement);
			await writeFile(join(f.root, f.spaces.path), bytes);
			await expect(f.workspace.newTerminal({ spaceId: a.id })).rejects.toMatchObject({ code: replacement.version === 3 ? 'PERSISTENCE_FAILED' : 'SCOPE_MISMATCH' });
			expect(write).not.toHaveBeenCalled(); expect(makeDirectory).not.toHaveBeenCalled();
			expect(f.acquired).not.toHaveBeenCalled(); expect(f.spawn).not.toHaveBeenCalled();
			expect(await readFile(join(f.root, f.spaces.path), 'utf8')).toBe(bytes);
			expect(await readFile(join(f.root, f.spaces.path + '.backup'), 'utf8')).toBe(backup);
		}
		await writeFile(join(f.root, f.spaces.path), valid);
		await f.spaces.rename(a.id, 'explicit valid retry');
	} finally { await f.cleanup(); }
});

for (const editB of [false, true]) test(`select primary write overlapping a late attach adopts the same-ID append${editB ? ' with a later B edit' : ''} and later UI flush preserves its runtime reference`, async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' }), b = await f.spaces.create({ name: 'B', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		let launchEntered!: () => void, releaseLaunch!: () => void;
		const launchWaiting = new Promise<void>(resolve => { launchEntered = resolve; }), launchBlocked = new Promise<void>(resolve => { releaseLaunch = resolve; });
		const shell = f.launch.shell;
		f.launch.shell = async options => { launchEntered(); await launchBlocked; return shell(options); };
		const creating = f.workspace.newTerminal({ spaceId: a.id });
		await launchWaiting;
		await f.workspace.selectSpace(b.id);
		let writeEntered!: () => void, releaseWrite!: () => void;
		const writeWaiting = new Promise<void>(resolve => { writeEntered = resolve; }), writeBlocked = new Promise<void>(resolve => { releaseWrite = resolve; });
		const write = f.adapter.write; let armed = true;
		f.adapter.write = async (p, text) => { if (armed && p === f.spaces.path && JSON.parse(text).selectedSpaceId === a.id) { armed = false; writeEntered(); await writeBlocked; } await write(p, text); };
		const selecting = f.workspace.selectSpace(a.id);
		await writeWaiting;
		if (editB) f.workspace.openPage('board');
		releaseLaunch(); const runtime = await creating;
		const row = f.workspace.listManaged(a.id)[0]!;
		const attaching = f.workspace.attachManaged(row, { expectedRuntimeId: row.runtime!.runtimeId, focus: false });
		releaseWrite(); await selecting; await attaching; await f.spaces.flush();
		const refs = () => Object.values(f.workspace.store.getState().tabs).flatMap(tab => tab.kind === 'terminal' ? tab.sessionIds : []);
		expect(refs()).toEqual([runtime]);
		f.workspace.openPage('board'); await f.workspace.persistence.flush();
		expect(Object.values(f.spaces.store.getState().records.layouts[a.id]!.tabs).flatMap(tab => tab.kind === 'terminal' ? tab.sessionIds : [])).toEqual([runtime]);
		if (editB) expect(Object.values(f.spaces.store.getState().records.layouts[b.id]!.tabs)).toMatchObject([{ kind: 'page', page: 'board' }]);
		else expect(f.spaces.store.getState().records.layouts[b.id]!.tabs).toEqual({});
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(a.id);
		expect(f.sessions.get(runtime!)?.running).toBe(true);
	} finally { await f.cleanup(); }
});

test('closing the last terminal view preserves its runtime and reattaches the same screen without another spawn', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'detached', relativePath: '' });
		await f.workspace.selectSpace(space.id);
		const id = await f.workspace.newTerminal({ spaceId: space.id });
		const session = f.sessions.get(id!)!;
		const tabId = f.workspace.active!.id;
		const confirm = vi.fn(async () => false);
		await f.workspace.close(tabId, confirm);
		expect(f.workspace.active).toBeUndefined();
		expect(confirm).not.toHaveBeenCalled();
		expect(f.sessions.get(id!)).toBe(session);
		expect(session.running).toBe(true);
		f.workspace.attach(session);
		expect(f.sessions.get(id!)).toBe(session);
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally { await f.cleanup(); }
});

test('strict background launch is queryable during environment preparation without a Pane or focus change', async () => {
	const f = await fixture();
	let release!: () => void;
	try {
		const space = await f.spaces.create({ name: 'background', relativePath: '' });
		await f.workspace.selectSpace(space.id);
		await f.workspace.newBrowser();
		const before = f.workspace.store.getState();
		let entered!: () => void;
		const waiting = new Promise<void>(resolve => { entered = resolve; });
		const blocked = new Promise<void>(resolve => { release = resolve; });
		f.environment.mockImplementation(async () => { entered(); await blocked; return {}; });
		const launching = f.workspace.createManaged({ kind: 'shell', spaceId: space.id, title: 'Named background' });
		await waiting;
		const pending = f.workspace.listManaged(space.id);
		expect(pending).toMatchObject([{ spaceId: space.id, title: 'Named background', runtime: { phase: 'launch-pending' }, viewState: 'background' }]);
		expect(pending[0]?.sessionId).not.toBe(pending[0]?.runtime?.runtimeId);
		expect(f.workspace.store.getState()).toBe(before);
		expect(f.spawn).not.toHaveBeenCalled();
		release();
		const result = await launching;
		expect(result).toMatchObject({ status: 'created', session: { title: 'Named background', runtime: { phase: 'connected', pid: 42 }, viewState: 'background' } });
		expect(f.workspace.store.getState()).toBe(before);
		expect(f.chooser).not.toHaveBeenCalled();
	} finally { release?.(); await f.cleanup(); }
});

test('a foreground display failure does not relabel a connected runtime as a failed launch', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'display failure', relativePath: '' });
		await f.workspace.selectSpace(space.id);
		f.launch.show = async () => { throw new Error('shell display unavailable'); };
		const result = await f.workspace.createManagedInteractive({ kind: 'shell', spaceId: space.id });
		expect(result).toMatchObject({ status: 'failed', effect: 'partial', session: { runtime: { phase: 'connected' } } });
		const row = f.workspace.listManaged(space.id)[0]!;
		expect(row.runtime?.phase).toBe('connected');
		expect(f.sessions.get(row.runtime!.runtimeId)?.running).toBe(true);
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally { await f.cleanup(); }
});

test('a GUI background Space choice binds B without selecting it or displaying its runtime', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' }), b = await f.spaces.create({ name: 'B', relativePath: '' });
		await f.workspace.selectSpace(a.id); await f.workspace.newBrowser();
		const before = f.workspace.store.getState();
		f.chooser.mockResolvedValueOnce(b.id);
		const result = await f.workspace.createManagedInteractive({ kind: 'shell', foreground: false });
		expect(result).toMatchObject({ status: 'created', session: { spaceId: b.id, viewState: 'background' } });
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(a.id);
		expect(f.workspace.store.getState()).toBe(before);
		expect(Object.keys(f.spaces.store.getState().records.layouts[b.id]!.tabs)).toHaveLength(0);
		const refused = await f.workspace.createManaged({ kind: 'shell', spaceId: '' });
		expect(refused).toMatchObject({ status: 'failed', effect: 'none', error: { code: 'TARGET_REQUIRED' } });
		expect(f.chooser).toHaveBeenCalledOnce();
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally { await f.cleanup(); }
});

test('foreground display intent is captured before Space resolution yields to a new user action', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		const launching = f.workspace.createManagedInteractive({ kind: 'shell', spaceId: a.id });
		f.workspace.openPage('board');
		const selected = f.workspace.active!.id;
		const result = await launching;
		expect(result).toMatchObject({ status: 'created', session: { viewState: 'background', runtime: { phase: 'connected' } } });
		expect(f.workspace.active?.id).toBe(selected);
	} finally { await f.cleanup(); }
});

test('concurrent off-Space unfocused attachment commits one view and reports actual persistence failure without killing runtime', async () => {
	const f = await fixture();
	let release!: () => void;
	const write = f.adapter.write;
	let bId = '';
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' }), b = await f.spaces.create({ name: 'B', relativePath: '' }); bId = b.id;
		await f.workspace.selectSpace(a.id); await f.workspace.newBrowser();
		await f.workspace.createManaged({ kind: 'shell', spaceId: b.id });
		const row = f.workspace.listManaged(b.id)[0]!, before = f.workspace.store.getState();
		let entered!: () => void;
		const waiting = new Promise<void>(resolve => { entered = resolve; }), blocked = new Promise<void>(resolve => { release = resolve; });
		let armed = true;
		f.adapter.write = async (path, text) => { if (armed && path === f.spaces.path && Object.keys(JSON.parse(text).layouts[b.id].tabs).length) { armed = false; entered(); await blocked; } await write(path, text); };
		const attached = Array.from({ length: 6 }, () => f.workspace.attachManaged(row, { focus: false, expectedRuntimeId: row.runtime!.runtimeId }));
		await waiting;
		expect(f.workspace.store.getState()).toBe(before);
		release();
		const results = await Promise.all(attached);
		expect(results.every(result => result.status === 'attached' && !result.focused)).toBe(true);
		expect(new Set(results.map(result => result.status === 'attached' ? result.tabId : 'failed')).size).toBe(1);
		expect(Object.keys(f.spaces.store.getState().records.layouts[b.id]!.tabs)).toHaveLength(1);
		expect(f.workspace.store.getState()).toBe(before);
		await f.workspace.createManaged({ kind: 'shell', spaceId: b.id });
		const second = f.workspace.listManaged(b.id)[1]!;
		f.adapter.write = async () => { throw new Error('ENOSPC display fixture'); };
		const failed = await f.workspace.attachManaged(second, { focus: false, expectedRuntimeId: second.runtime!.runtimeId });
		expect(failed).toMatchObject({ status: 'failed', error: { code: 'PERSISTENCE_FAILED' } });
		expect(f.workspace.getManaged(second)).toMatchObject({ runtime: { phase: 'connected' }, viewState: 'background' });
		expect(f.sessions.get(second.runtime!.runtimeId)?.running).toBe(true);
		expect(f.spawn).toHaveBeenCalledTimes(2);
		const stale = await f.workspace.attachManaged(second, { expectedRuntimeId: 'wrong-generation' });
		expect(stale).toMatchObject({ status: 'failed', error: { code: 'STALE_RUNTIME' } });
	} finally { release?.(); f.adapter.write = write; if (bId) await f.spaces.rename(bId, 'recovered fixture'); await f.cleanup(); }
});

test('a quick-command directory is honoured inside the chosen Space and refused outside it, before any Session is written', async () => {
	const f = await fixture();
	try {
		await mkdir(join(f.root, 'inner', 'deeper'), { recursive: true });
		await mkdir(join(f.root, 'other'), { recursive: true });
		const space = await f.spaces.create({ name: 'Inner', relativePath: 'inner' });
		const inside = await f.workspace.createManagedInteractive({ kind: 'shell', spaceId: space.id, cwd: join(f.root, 'inner', 'deeper') });
		expect(inside.status).toBe('created');
		expect(f.spawn.mock.calls.at(-1)?.[1].cwd).toBe(join(f.root, 'inner', 'deeper'));
		const sessionsBefore = Object.keys(JSON.parse(await readFile(join(f.root, f.spaces.path), 'utf8')).sessions).length;
		const spawned = f.spawn.mock.calls.length;
		const outside = await f.workspace.createManagedInteractive({ kind: 'shell', spaceId: space.id, cwd: join(f.root, 'other') });
		expect(outside).toMatchObject({ status: 'failed', effect: 'none', error: { code: 'DIRECTORY_NOT_AUTHORIZED' } });
		expect(f.spawn.mock.calls.length).toBe(spawned);
		expect(Object.keys(JSON.parse(await readFile(join(f.root, f.spaces.path), 'utf8')).sessions)).toHaveLength(sessionsBefore);
		// A command saved with the whole-vault path keeps working in any Space: it starts in the Space directory.
		const whole = await f.workspace.createManagedInteractive({ kind: 'shell', spaceId: space.id, cwd: f.root, cwdScope: { vaultRoot: f.root, platform: process.platform } });
		expect(whole.status).toBe('created');
		expect(f.spawn.mock.calls.at(-1)?.[1].cwd).toBe(join(f.root, 'inner'));
		// No saved directory: the Space directory itself.
		const plain = await f.workspace.createManagedInteractive({ kind: 'shell', spaceId: space.id });
		expect(plain.status).toBe('created');
		expect(f.spawn.mock.calls.at(-1)?.[1].cwd).toBe(join(f.root, 'inner'));
	} finally {
		await f.cleanup();
	}
});
