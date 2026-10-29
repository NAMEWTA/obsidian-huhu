import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { t } from '../../../../shared/i18n';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { DirectoryPort, WriterLease, WriterOwnerPort } from '../../core/space/ports';
import type { VaultBinding } from '../../core/space/model';
import type { ManagedSessionSummary } from '../../core/workspace/managed-runtime';
import { NativeOccupancy, defaultOccupancyPorts } from '../../platform/desktop/native-reference/occupancy';
import type { NativeSessionSummary } from '../../platform/desktop/server/agent-data-client';
import { SpaceService } from '../spaces/space-service';
import { ManagedLaunchError, managedFailure } from './managed-errors';
import { NativeResumeError, NativeResumeService, historyActionMessage, type NativeResumePorts } from './native-resume';

const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
const row = (extra: Partial<NativeSessionSummary> = {}): NativeSessionSummary => ({
	key: 'k1',
	agentId: 'codex',
	accountKey: '{"HUHU_ACCOUNT_NAME":"work"}',
	sessionId: 'native-1',
	cwd: '/same-cwd',
	title: 'Native one',
	transcriptPath: '/log/one.jsonl',
	modifiedAtMs: 1,
	usage,
	sourceStatus: 'available',
	sourceRef: 'codex:work:/log/one.jsonl',
	...extra,
});

let dir: string;
beforeEach(async () => {
	dir = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-native-resume-'));
});
afterEach(async () => {
	await fs.rm(dir, { recursive: true, force: true });
});

async function instance(
	name: string,
	pid: number,
	world: Map<number, string | undefined>,
	cwd = '/same-cwd',
	deviceId = 'device',
	realPorts = false,
) {
	const files = new Map<string, string>();
	const storage: TextStorage = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p)!,
		write: async (p, text) => void files.set(p, text),
		mkdir: async () => {},
	};
	const vault: VaultBinding = {
		vaultId: `vault-${name}`,
		deviceId,
		rootPath: '/vault',
		root: { canonicalPath: '/vault', dev: '1', ino: '2' },
	};
	const lease: WriterLease = {
		instanceId: name,
		port: 1,
		lost: new AbortController().signal,
		assertHeld: async () => {},
		close: async () => {},
	};
	const directories: DirectoryPort = {
		inspectVault: async () => vault,
		assertVault: async () => {},
		bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: vault.root }),
		chooseExternalDirectory: async () => undefined,
		resolveDirectory: async () => ({ cwd }),
	};
	const owners: WriterOwnerPort = { acquire: vi.fn(async () => lease) };
	const spaces = new SpaceService({ storage, directories, owners, instanceId: name, report: vi.fn() });
	const space = await spaces.create({ name: `Space ${name}`, relativePath: '' });
	// The managed-runtime facts the service observes, mutable by each test.
	const runtimes = new Map<string, ManagedSessionSummary['runtime']>();
	const listeners = new Set<() => void>();
	const key = (t: { spaceId: string; sessionId: string }) => `${t.spaceId}/${t.sessionId}`;
	const setRuntime = (t: { spaceId: string; sessionId: string }, runtime: ManagedSessionSummary['runtime']) => {
		if (runtime) runtimes.set(key(t), runtime);
		else runtimes.delete(key(t));
		for (const listener of [...listeners]) listener();
	};
	const attach = vi.fn(async () => {});
	const launch = vi.fn<NativePorts['launch']>();
	type NativePorts = NativeResumePorts;
	const verify = vi.fn(async (_row: NativeSessionSummary) => {});
	const occupancy = realPorts
		? new NativeOccupancy(defaultOccupancyPorts(path.join(dir, 'locks')))
		: new NativeOccupancy({
				directory: path.join(dir, 'locks'),
				pid,
				hostname: 'host',
				now: Date.now,
				processStart: async (value) => (world.has(value) ? world.get(value) : null),
			});
	// Default launch reserves a generation through the real SpaceService, like the controller does.
	launch.mockImplementation(async (request, reserved) => {
		const admission = await spaces.prepareSession(
			request.spaceId,
			{
				kind: 'agent',
				title: request.session.title,
				agentId: request.session.agentId,
				accountId: request.session.accountId ?? '',
				nativeSessionId: request.session.nativeSessionId,
				transcriptPath: request.session.transcriptPath,
			},
			request.session.id,
		);
		setRuntime({ spaceId: request.spaceId, sessionId: request.session.id }, {
			runtimeId: admission.runtimeId,
			phase: 'launch-pending',
		} as ManagedSessionSummary['runtime']);
		reserved(admission.runtimeId);
		return { runtimeId: admission.runtimeId };
	});
	const service = new NativeResumeService({
		deviceId,
		instanceId: name,
		vaultId: vault.vaultId,
		spaces,
		occupancy,
		managed: (t) => {
			const runtime = runtimes.get(key(t));
			return runtime ? ({ ...t, runtime } as ManagedSessionSummary) : undefined;
		},
		subscribeManaged: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		attach,
		samePath: async (a, b) => a === b,
		canonicalPath: async (file) => file,
		verify,
		launch,
	});
	return { spaces, space, service, setRuntime, attach, launch, verify, occupancy, runtimes, listeners, files };
}
const sessionCount = (i: { spaces: SpaceService }) => Object.keys(i.spaces.store.getState().records.sessions).length;
const lockFiles = async () =>
	(await fs.readdir(path.join(dir, 'locks')).catch(() => [])).filter((n) => n.endsWith('.lock'));
const alive = (...pids: number[]) => new Map<number, string | undefined>(pids.map((pid) => [pid, `s${pid}`]));
async function flush() {
	await new Promise((resolve) => setTimeout(resolve, 20));
}

test('import is explicit and exact: the same full reference is one Session; another account with the same native id is not merged', async () => {
	const a = await instance('A', 100, alive(100));
	const first = await a.service.importSource({ spaceId: a.space.id, row: row() });
	expect(first.created).toBe(true);
	const again = await a.service.importSource({ spaceId: a.space.id, row: row({ title: 'renamed later' }) });
	expect(again).toMatchObject({ created: false, sessionId: first.sessionId });
	const otherAccount = await a.service.importSource({
		spaceId: a.space.id,
		row: row({ accountKey: '{"HUHU_ACCOUNT_NAME":"home"}', sourceRef: 'codex:home:/log/one.jsonl', key: 'k2' }),
	});
	expect(otherAccount.created).toBe(true);
	expect(otherAccount.sessionId).not.toBe(first.sessionId);
	expect(sessionCount(a)).toBe(2);
	const records = a.spaces.store.getState().records;
	expect(records.sessions[first.sessionId]?.accountId).toBe('work');
	expect(records.sessions[otherAccount.sessionId]?.accountId).toBe('home');
	// An incomplete identity is refused, not guessed.
	await expect(
		a.service.importSource({ spaceId: a.space.id, row: row({ sourceRef: undefined }) }),
	).rejects.toMatchObject({
		code: 'SOURCE_UNAVAILABLE',
		reason: 'source-incomplete',
	});
	expect(a.launch).not.toHaveBeenCalled();
});

test('an ended session resumes as the SAME Session with a new runtime generation and holds the machine lock', async () => {
	const a = await instance('A', 100, alive(100));
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	const first = await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	expect(first).toMatchObject({ mode: 'resumed', sessionId: imported.sessionId });
	expect(sessionCount(a)).toBe(1);
	expect(a.launch.mock.calls[0]![0].session.id).toBe(imported.sessionId);
	expect(await lockFiles()).toHaveLength(1);
	const lock = await a.occupancy.inspect({
		provider: 'codex',
		storePath: '/log/one.jsonl',
		nativeSessionId: 'native-1',
	});
	expect(lock).toMatchObject({ sessionId: imported.sessionId, runtimeId: first.runtimeId, instanceId: 'A' });
	// While that generation runs, continue only attaches: no second launch, no second Session.
	a.setRuntime({ spaceId: a.space.id, sessionId: imported.sessionId }, {
		runtimeId: first.runtimeId!,
		phase: 'connected',
	} as ManagedSessionSummary['runtime']);
	const attached = await a.service.resumeSource({ spaceId: a.space.id, row: row(), foreground: true });
	expect(attached).toMatchObject({ mode: 'attached', runtimeId: first.runtimeId });
	expect(a.attach).toHaveBeenCalledWith(
		{ spaceId: a.space.id, sessionId: imported.sessionId, runtimeId: first.runtimeId },
		true,
	);
	expect(a.launch).toHaveBeenCalledTimes(1);
	expect(sessionCount(a)).toBe(1);
	// After verified exit the lock is released and the next continue is a NEW generation of the same Session.
	const exited = {
		runtimeId: first.runtimeId!,
		phase: 'exited',
		exit: { code: 0, signal: null, confirmed: true },
	} as ManagedSessionSummary['runtime'];
	a.setRuntime({ spaceId: a.space.id, sessionId: imported.sessionId }, exited);
	await flush();
	expect(await lockFiles()).toHaveLength(0);
	// The business owner settles the finished attempt (as the workspace does on exit) before the next generation.
	await a.spaces.checkpointAttempt(
		{ spaceId: a.space.id, sessionId: imported.sessionId, runtimeId: first.runtimeId! },
		{
			root: { state: 'exited', code: 0, signal: null },
			cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 },
			output: 'drained',
		},
	);
	const second = await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	expect(second.sessionId).toBe(imported.sessionId);
	expect(second.runtimeId).not.toBe(first.runtimeId);
	expect(second.previousRuntimeId).toBe(first.runtimeId);
	expect(sessionCount(a)).toBe(1);
});

test('every refusal is explicit and creates no Session, no process and no lock', async () => {
	const a = await instance('A', 100, alive(100));
	const fail = async (request: Parameters<NativeResumeService['resumeSource']>[0], reason: string, code: string) => {
		await expect(a.service.resumeSource(request)).rejects.toMatchObject({ code, reason });
		expect(a.launch).not.toHaveBeenCalled();
		expect(await lockFiles()).toHaveLength(0);
	};
	// Unknown source: must be imported first, never silently created.
	await fail({ spaceId: a.space.id, row: row() }, 'not-imported', 'SOURCE_UNAVAILABLE');
	expect(sessionCount(a)).toBe(0);
	await a.service.importSource({ spaceId: a.space.id, row: row() });
	const before = sessionCount(a);
	await fail(
		{ spaceId: a.space.id, row: row({ sourceStatus: 'missing' }) },
		'source-unavailable',
		'SOURCE_UNAVAILABLE',
	);
	await fail(
		{ spaceId: a.space.id, row: row({ cwd: '/elsewhere' }) },
		'cwd-not-authorized',
		'DIRECTORY_NOT_AUTHORIZED',
	);
	a.verify.mockRejectedValueOnce(new Error(t('agent.accountScopeMismatch')));
	await fail({ spaceId: a.space.id, row: row() }, 'account-mismatch', 'SOURCE_UNAVAILABLE');
	a.verify.mockRejectedValueOnce(
		new ManagedLaunchError(managedFailure('CAPABILITY_UNAVAILABLE', 'provider-disabled'), 'none'),
	);
	await fail({ spaceId: a.space.id, row: row() }, 'provider-disabled', 'CAPABILITY_UNAVAILABLE');
	a.verify.mockRejectedValueOnce(
		new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'program-missing'), 'none'),
	);
	await fail({ spaceId: a.space.id, row: row() }, 'program-missing', 'SOURCE_UNAVAILABLE');
	await fail({ spaceId: a.space.id, row: row({ sourceRef: 'unknown-ref' }) }, 'not-imported', 'SOURCE_UNAVAILABLE');
	await expect(a.service.resumeSource({ spaceId: 'missing-space', row: row() })).rejects.toThrow('TARGET_NOT_FOUND');
	expect(sessionCount(a)).toBe(before);
	// Messages are localized, stable-coded and name the reason.
	expect(new NativeResumeError('SOURCE_UNAVAILABLE', 'source-unavailable', { status: 'missing' }).message).toContain(
		'missing',
	);
	expect(historyActionMessage(new NativeResumeError('OWNER_CONFLICT', 'occupied'))).toBeTruthy();
});

test('a confirmation the user declines starts nothing, leaves no lock and keeps the Session', async () => {
	const a = await instance('A', 100, alive(100));
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	a.launch.mockImplementationOnce(async (request, reserved) => {
		const admission = await a.spaces.prepareSession(
			request.spaceId,
			{ kind: 'agent', title: 't', agentId: 'codex', accountId: 'work', nativeSessionId: 'native-1' },
			request.session.id,
		);
		a.setRuntime({ spaceId: request.spaceId, sessionId: request.session.id }, {
			runtimeId: admission.runtimeId,
			phase: 'cancelled',
			termination: {
				root: { state: 'not-started', code: null, signal: null },
				cleanup: { state: 'confirmed', scope: 'not-started', remainingKnown: 0 },
				output: 'drained',
			},
		} as ManagedSessionSummary['runtime']);
		reserved(admission.runtimeId);
		return undefined;
	});
	expect(await a.service.resumeSource({ spaceId: a.space.id, row: row() })).toMatchObject({
		mode: 'cancelled',
		sessionId: imported.sessionId,
	});
	await flush();
	expect(await lockFiles()).toHaveLength(0);
	expect(sessionCount(a)).toBe(1);
});

test('two HUHU instances racing to continue one native reference: one writable runtime, the other a conflict, no fork', async () => {
	const world = alive(100, 200);
	const a = await instance('A', 100, world),
		b = await instance('B', 200, world);
	await a.service.importSource({ spaceId: a.space.id, row: row() });
	await b.service.importSource({ spaceId: b.space.id, row: row() });
	const results = await Promise.allSettled([
		a.service.resumeSource({ spaceId: a.space.id, row: row() }),
		b.service.resumeSource({ spaceId: b.space.id, row: row() }),
	]);
	expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
	const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
	expect(rejected.reason).toMatchObject({ code: 'OWNER_CONFLICT', reason: 'occupied' });
	expect(a.launch.mock.calls.length + b.launch.mock.calls.length).toBe(1);
	expect(sessionCount(a)).toBe(1);
	expect(sessionCount(b)).toBe(1);
	expect(await lockFiles()).toHaveLength(1);
});

test('a stale lock is reclaimed only with evidence the owner instance is gone', async () => {
	const world = alive(100, 200);
	const a = await instance('A', 100, world),
		b = await instance('B', 200, world);
	await a.service.importSource({ spaceId: a.space.id, row: row() });
	await b.service.importSource({ spaceId: b.space.id, row: row() });
	await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	// Owner alive (even though it never reported an exit): B stays refused.
	await expect(b.service.resumeSource({ spaceId: b.space.id, row: row() })).rejects.toMatchObject({
		reason: 'occupied',
	});
	expect(b.launch).not.toHaveBeenCalled();
	// The owner process disappears: only now may B take over.
	world.delete(100);
	await expect(b.service.resumeSource({ spaceId: b.space.id, row: row() })).resolves.toMatchObject({
		mode: 'resumed',
	});
	expect(b.launch).toHaveBeenCalledTimes(1);
});

test('the lock is kept through an unconfirmed runtime and released only on verified exit', async () => {
	const a = await instance('A', 100, alive(100));
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	const target = { spaceId: a.space.id, sessionId: imported.sessionId };
	const started = await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	// The transport was lost: the process may still run. The lock stays and continue refuses.
	a.setRuntime(target, { runtimeId: started.runtimeId!, phase: 'disconnected' } as ManagedSessionSummary['runtime']);
	await flush();
	expect(await lockFiles()).toHaveLength(1);
	await expect(a.service.resumeSource({ spaceId: a.space.id, row: row() })).rejects.toMatchObject({
		reason: 'runtime-unconfirmed',
	});
	expect(a.launch).toHaveBeenCalledTimes(1);
	// An exit without confirmation does not release either.
	a.setRuntime(target, {
		runtimeId: started.runtimeId!,
		phase: 'exited',
		exit: { code: null, signal: null, confirmed: false },
	} as ManagedSessionSummary['runtime']);
	await flush();
	expect(await lockFiles()).toHaveLength(1);
	a.setRuntime(target, {
		runtimeId: started.runtimeId!,
		phase: 'exited',
		exit: { code: 1, signal: null, confirmed: true },
	} as ManagedSessionSummary['runtime']);
	await flush();
	expect(await lockFiles()).toHaveLength(0);
});

test('a launch that fails before any generation is reserved releases the lock immediately', async () => {
	const a = await instance('A', 100, alive(100));
	await a.service.importSource({ spaceId: a.space.id, row: row() });
	a.launch.mockRejectedValueOnce(new Error('spawn refused'));
	await expect(a.service.resumeSource({ spaceId: a.space.id, row: row() })).rejects.toThrow('spawn refused');
	expect(await lockFiles()).toHaveLength(0);
	expect(sessionCount(a)).toBe(1);
});

test('a row owned by another Space is neither continued nor re-imported here; the other Space keeps the Session', async () => {
	const a = await instance('A', 100, alive(100));
	const other = await a.spaces.create({ name: 'Other', relativePath: '' });
	await a.service.importSource({ spaceId: a.space.id, row: row() });
	await expect(a.service.importSource({ spaceId: other.id, row: row() })).rejects.toThrow('OWNER_CONFLICT');
	await expect(a.service.resumeSource({ spaceId: other.id, row: row() })).rejects.toMatchObject({
		reason: 'not-in-space',
	});
	expect(sessionCount(a)).toBe(1);
	expect(a.launch).not.toHaveBeenCalled();
});

test('open locates a running conversation and only describes an ended one', async () => {
	const a = await instance('A', 100, alive(100));
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	expect(await a.service.open({ sessionId: imported.sessionId })).toMatchObject({
		state: 'ended',
		attached: false,
		sourceRef: row().sourceRef,
	});
	expect(a.attach).not.toHaveBeenCalled();
	const started = await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	const live = await a.service.open({ sessionId: imported.sessionId, spaceId: a.space.id, foreground: true });
	expect(live).toMatchObject({ state: 'live', attached: true, runtimeId: started.runtimeId });
	await expect(a.service.open({ sessionId: 'nope' })).rejects.toMatchObject({ reason: 'session-missing' });
	await expect(a.service.open({ sessionId: imported.sessionId, spaceId: 'wrong' })).rejects.toMatchObject({
		reason: 'session-missing',
	});
});

test('an unconfirmed previous attempt is refused with recovery guidance, releasing the lock and creating nothing', async () => {
	const a = await instance('A', 100, alive(100));
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	// A HUHU run that never settled (e.g. a crash): the record keeps an unconfirmed attempt.
	await a.spaces.prepareSession(
		a.space.id,
		{ kind: 'agent', title: 't', agentId: 'codex', accountId: 'work', nativeSessionId: 'native-1' },
		imported.sessionId,
	);
	await expect(a.service.resumeSource({ spaceId: a.space.id, row: row() })).rejects.toMatchObject({
		code: 'EFFECT_UNKNOWN',
		reason: 'attempt-unconfirmed',
	});
	await expect(a.service.resumeSource({ spaceId: a.space.id, row: row() })).rejects.toThrow(
		/Check in the provider|确认没有仍在运行/,
	);
	expect(await lockFiles()).toHaveLength(0);
	expect(sessionCount(a)).toBe(1);
});

const exitedRuntime = (runtimeId: string) =>
	({
		runtimeId,
		phase: 'exited',
		exit: { code: 0, signal: null, confirmed: true },
	}) as ManagedSessionSummary['runtime'];
const runtimeKey = (spaceId: string, sessionId: string) => `${spaceId}/${sessionId}`;

test('H1: two Vaults with different device ids and account roots reaching one provider store have exactly one winner', async () => {
	const world = alive(100, 200);
	const a = await instance('A', 100, world, '/same-cwd', 'device-A'),
		b = await instance('B', 200, world, '/same-cwd', 'device-B');
	// Same system account: the same transcript, but each Vault describes it with its own account root.
	const rowA = row({
		accountKey: '{"HUHU_ACCOUNT_ROOT":"/vaultA/.huhu/agents/device-A/system"}',
		sourceRef: 'codex:A:/log/one.jsonl',
	});
	const rowB = row({
		accountKey: '{"HUHU_ACCOUNT_ROOT":"/vaultB/.huhu/agents/device-B/system"}',
		sourceRef: 'codex:B:/log/one.jsonl',
	});
	await a.service.importSource({ spaceId: a.space.id, row: rowA });
	await b.service.importSource({ spaceId: b.space.id, row: rowB });
	const results = await Promise.allSettled([
		a.service.resumeSource({ spaceId: a.space.id, row: rowA }),
		b.service.resumeSource({ spaceId: b.space.id, row: rowB }),
	]);
	expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
	expect((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({
		reason: 'occupied',
	});
	expect(await lockFiles()).toHaveLength(1);
	// The full reference still keeps the two Vaults' imports apart (import de-dup is per full reference).
	expect(a.launch.mock.calls.length + b.launch.mock.calls.length).toBe(1);
});

test('M1: a tab restore (guard) is refused while another instance holds the conversation, and the reverse', async () => {
	const world = alive(100, 200);
	const a = await instance('A', 100, world),
		b = await instance('B', 200, world);
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	const restore = {
		provider: 'codex',
		nativeSessionId: 'native-1',
		transcriptPath: '/log/one.jsonl',
		spaceId: b.space.id,
		sessionId: 'b-session',
		runtime: { spaceId: b.space.id, sessionId: 'b-session', runtimeId: 'terminal-b' },
	};
	await expect(b.service.guard(restore)).rejects.toMatchObject({ code: 'OWNER_CONFLICT', reason: 'occupied' });
	// After A's runtime verifiably ends, B's restore may take it; then A's history resume is refused.
	a.setRuntime(
		{ spaceId: a.space.id, sessionId: imported.sessionId },
		exitedRuntime(a.runtimes.get(runtimeKey(a.space.id, imported.sessionId))!.runtimeId),
	);
	await flush();
	const guard = await b.service.guard(restore);
	expect(await lockFiles()).toHaveLength(1);
	await a.spaces.checkpointAttempt(
		{
			spaceId: a.space.id,
			sessionId: imported.sessionId,
			runtimeId: a.runtimes.get(runtimeKey(a.space.id, imported.sessionId))!.runtimeId,
		},
		{
			root: { state: 'exited', code: 0, signal: null },
			cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 },
			output: 'drained',
		},
	);
	await expect(a.service.resumeSource({ spaceId: a.space.id, row: row() })).rejects.toMatchObject({
		reason: 'occupied',
	});
	expect(a.launch).toHaveBeenCalledTimes(1);
	// The restore's lease follows its runtime: not released while it runs, released on verified exit.
	b.setRuntime({ spaceId: b.space.id, sessionId: 'b-session' }, {
		runtimeId: 'terminal-b',
		phase: 'connected',
	} as ManagedSessionSummary['runtime']);
	await flush();
	expect(await lockFiles()).toHaveLength(1);
	b.setRuntime({ spaceId: b.space.id, sessionId: 'b-session' }, exitedRuntime('terminal-b'));
	await flush();
	expect(await lockFiles()).toHaveLength(0);
	await guard.release();
});

test('M1: a new generation of the same Session continues under the same lease instead of releasing it', async () => {
	const a = await instance('A', 100, alive(100));
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	const target = { spaceId: a.space.id, sessionId: imported.sessionId };
	const first = await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	const lockBefore = await a.occupancy.inspect({
		provider: 'codex',
		storePath: '/log/one.jsonl',
		nativeSessionId: 'native-1',
	});
	// The earlier generation ended, but no sweep ran yet (silent change): the tab restore must not open a gap.
	a.runtimes.set(runtimeKey(target.spaceId, target.sessionId), exitedRuntime(first.runtimeId!));
	const guard = await a.service.guard({
		provider: 'codex',
		nativeSessionId: 'native-1',
		transcriptPath: '/log/one.jsonl',
		...target,
		runtime: { ...target, runtimeId: 'terminal-next' },
	});
	a.setRuntime(target, { runtimeId: 'terminal-next', phase: 'launch-pending' } as ManagedSessionSummary['runtime']);
	await flush();
	const lockAfter = await a.occupancy.inspect({
		provider: 'codex',
		storePath: '/log/one.jsonl',
		nativeSessionId: 'native-1',
	});
	expect(lockAfter?.lockId).toBe(lockBefore?.lockId);
	expect(lockAfter?.runtimeId).toBe('terminal-next');
	// A running generation of the same Session is not a second writer's invitation.
	await expect(
		a.service.guard({
			provider: 'codex',
			nativeSessionId: 'native-1',
			transcriptPath: '/log/one.jsonl',
			...target,
			runtime: { ...target, runtimeId: 'terminal-third' },
		}),
	).rejects.toMatchObject({ reason: 'resume-in-progress' });
	await guard.release();
});

test('M2: shutdown keeps unconfirmed claims under a post-dispose watch, releases them on a late confirmed exit, and releases confirmed ones at once', async () => {
	const world = alive(100);
	const a = await instance('A', 100, world);
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	const target = { spaceId: a.space.id, sessionId: imported.sessionId };
	const started = await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	expect(a.listeners.size).toBe(1);
	// Shutdown failed to confirm the end: the claim stays.
	a.setRuntime(target, { runtimeId: started.runtimeId!, phase: 'disconnected' } as ManagedSessionSummary['runtime']);
	await a.service.dispose();
	expect(await lockFiles()).toHaveLength(1);
	// The unconfirmed claim keeps a post-dispose watch.
	expect(a.listeners.size).toBe(1);
	await expect(a.service.resumeSource({ spaceId: a.space.id, row: row() })).rejects.toMatchObject({
		reason: 'module-closing',
	});
	await expect(
		a.service.guard({
			provider: 'codex',
			nativeSessionId: 'native-1',
			transcriptPath: '/log/one.jsonl',
			...target,
		}),
	).rejects.toMatchObject({ reason: 'module-closing' });
	// Another instance still sees it held (the process is alive), so nothing runs unprotected.
	const b = await instance('B', 200, alive(100, 200));
	await b.service.importSource({ spaceId: b.space.id, row: row() });
	await expect(b.service.resumeSource({ spaceId: b.space.id, row: row() })).rejects.toMatchObject({
		reason: 'occupied',
	});

	// A late confirmed exit releases the kept claim and ends the watch.
	a.setRuntime(target, exitedRuntime(started.runtimeId!));
	await flush();
	expect(await lockFiles()).toHaveLength(0);
	expect(a.listeners.size).toBe(0);

	// A confirmed end is released at shutdown.
	const c = await instance('C', 300, alive(300));
	await fs.rm(path.join(dir, 'locks'), { recursive: true, force: true });
	const importedC = await c.service.importSource({
		spaceId: c.space.id,
		row: row({ sourceRef: 'codex:c:/log/c.jsonl', transcriptPath: '/log/c.jsonl', sessionId: 'native-c' }),
	});
	const startedC = await c.service.resumeSource({
		spaceId: c.space.id,
		row: row({ sourceRef: 'codex:c:/log/c.jsonl', transcriptPath: '/log/c.jsonl', sessionId: 'native-c' }),
	});
	c.runtimes.set(runtimeKey(c.space.id, importedC.sessionId), exitedRuntime(startedC.runtimeId!));
	await c.service.dispose();
	await flush();
	expect(await lockFiles()).toHaveLength(0);
});

test('M2: a reservation that lands after shutdown is tracked under the same post-dispose watch and only released on verified exit', async () => {
	const a = await instance('A', 100, alive(100));
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	const target = { spaceId: a.space.id, sessionId: imported.sessionId };
	let reserve: ((runtimeId: string) => void) | undefined;
	let finish!: () => void;
	a.launch.mockImplementationOnce(async (_request, reserved) => {
		reserve = reserved;
		await new Promise<void>((resolve) => (finish = resolve));
		return { runtimeId: 'late' };
	});
	const pending = a.service.resumeSource({ spaceId: a.space.id, row: row() });
	let settled = false;
	void pending.then(
		() => {
			settled = true;
		},
		() => {
			settled = true;
		},
	);
	for (let i = 0; i < 250 && !reserve && !settled; i += 1) await flush();
	expect(reserve).toEqual(expect.any(Function));
	await a.service.dispose();
	a.setRuntime(target, { runtimeId: 'late', phase: 'launch-pending' } as ManagedSessionSummary['runtime']);
	reserve!('late');
	finish();
	await pending;
	expect(a.listeners.size).toBe(1);
	expect(await lockFiles()).toHaveLength(1);
	a.setRuntime(target, exitedRuntime('late'));
	await flush();
	expect(await lockFiles()).toHaveLength(0);
	expect(a.listeners.size).toBe(0);
});

test('M3: a Space whose directory is not the conversation directory is refused before anything is persisted', async () => {
	const a = await instance('A', 100, alive(100), '/another-dir');
	await expect(a.service.importSource({ spaceId: a.space.id, row: row() })).rejects.toMatchObject({
		code: 'DIRECTORY_NOT_AUTHORIZED',
		reason: 'cwd-not-authorized',
	});
	await expect(a.service.preflight({ spaceId: a.space.id, row: row() })).rejects.toMatchObject({
		reason: 'cwd-not-authorized',
	});
	expect(sessionCount(a)).toBe(0);
	expect(a.spaces.historySpaceFor(row().sourceRef!)).toBeUndefined();
	// A matching Space passes the whole preflight and persists nothing by itself.
	const b = await instance('B', 200, alive(200));
	await b.service.preflight({ spaceId: b.space.id, row: row() });
	expect(sessionCount(b)).toBe(0);
	expect(b.launch).not.toHaveBeenCalled();
});

test('L4: a failed verification reports the specific reason', async () => {
	const a = await instance('A', 100, alive(100));
	const cases: Array<[unknown, string]> = [
		[Object.assign(new Error('x'), { code: 'ENOENT' }), 'transcript-missing'],
		[new Error(t('agent.sessionMissing')), 'transcript-missing'],
		[new Error(t('agent.vaultMissing')), 'vault-missing'],
		[new Error(t('agent.accountScopeMismatch')), 'account-mismatch'],
		[new Error('something else'), 'verify-failed'],
		[new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'odd'), 'none'), 'verify-failed'],
	];
	for (const [failure, reason] of cases) {
		a.verify.mockRejectedValueOnce(failure);
		await expect(a.service.preflight({ spaceId: a.space.id, row: row() })).rejects.toMatchObject({
			code: 'SOURCE_UNAVAILABLE',
			reason,
		});
	}
});

test('L7: an over-long account description is refused before the writer queue and does not poison the service', async () => {
	const a = await instance('A', 100, alive(100));
	await expect(
		a.service.importSource({ spaceId: a.space.id, row: row({ accountKey: `{"x":"${'a'.repeat(5000)}"}` }) }),
	).rejects.toMatchObject({
		code: 'INVALID_ARGUMENT',
		reason: 'evidence-too-long',
	});
	await expect(
		a.spaces.importHistorySession({
			spaceId: a.space.id,
			sourceRef: 'r',
			accountKey: 'k'.repeat(5000),
			deviceId: 'd',
			agentId: 'codex',
			accountId: '',
			nativeSessionId: 'n',
			title: 't',
		}),
	).rejects.toThrow('INVALID_ARGUMENT');
	expect((await a.service.importSource({ spaceId: a.space.id, row: row() })).created).toBe(true);
	await a.spaces.dispose();
});

test('N1: shutdown that could not confirm an end can finish later; only then is the claim released', async () => {
	const a = await instance('A', 100, alive(100));
	const imported = await a.service.importSource({ spaceId: a.space.id, row: row() });
	const target = { spaceId: a.space.id, sessionId: imported.sessionId };
	const started = await a.service.resumeSource({ spaceId: a.space.id, row: row() });
	a.setRuntime(target, { runtimeId: started.runtimeId!, phase: 'disconnected' } as ManagedSessionSummary['runtime']);
	await a.service.dispose();
	expect(await lockFiles()).toHaveLength(1);
	await a.service.dispose();
	expect(await lockFiles()).toHaveLength(1);
	a.runtimes.set(runtimeKey(target.spaceId, target.sessionId), exitedRuntime(started.runtimeId!));
	await a.service.dispose();
	expect(await lockFiles()).toHaveLength(0);
});

test('NR1: an automation-style claim (no runtime) keeps the instance registered across a reload until it is released', async () => {
	const a = await instance('RELOAD-1', process.pid, alive(process.pid), '/same-cwd', 'device', true);
	const request = {
		provider: 'codex',
		nativeSessionId: 'native-1',
		transcriptPath: '/log/one.jsonl',
		spaceId: '',
		sessionId: 'automation-run-1',
	};
	const claim = await a.service.guard(request);
	await a.service.dispose();
	expect(await lockFiles()).toHaveLength(1);
	// A fresh evaluation of the bundle (plugin reload) in the same process.
	vi.resetModules();
	const fresh = await import('../../platform/desktop/native-reference/occupancy');
	fresh.registerLocalInstance('RELOAD-2');
	const second = new fresh.NativeOccupancy(fresh.defaultOccupancyPorts(path.join(dir, 'locks')));
	const identity = { provider: 'codex', storePath: '/log/one.jsonl', nativeSessionId: 'native-1' };
	const owner = { instanceId: 'RELOAD-2', vaultId: 'v', spaceId: '', sessionId: 'automation-run-2' };
	expect(await second.acquire(identity, owner)).toMatchObject({ kind: 'conflict', reason: 'held' });
	await claim.release();
	const taken = await second.acquire(identity, owner);
	expect(taken.kind).toBe('acquired');
	if (taken.kind === 'acquired') await taken.lease.release();
});
