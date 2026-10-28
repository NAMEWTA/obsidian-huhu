import { expect, test, vi } from 'vitest';
import { NativeHost } from '../../../host/desktop/native/host';
import type { NativeEvents, TerminationEvidence } from '../../../shared/native/host';
import type { TextStorage } from '../../../shared/storage/ports';
import type { DirectoryPort, WriterLease } from '../core/space/ports';
import { normalizeTerminalSettings } from '../core/terminal/settings';
import { SpaceService } from './spaces/space-service';
import { TerminalSessions } from './terminal/sessions';
import { createSpaceWorkspaceStore } from './workspace-store';
import { WorkspaceService, type WorkspaceLaunchPort } from './workspace-service';
const confirmed = (code = 0): TerminationEvidence => ({ root: { state: 'exited', code, signal: null }, cleanup: { state: 'confirmed', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 0 }, output: 'drained' });
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
async function fixture() {
	const files = new Map<string, string>(), root = { canonicalPath: '/fixture', dev: '1', ino: '2' };
	const vault = { vaultId: 'fixture', deviceId: 'fixture', rootPath: '/fixture', root };
	const lease: WriterLease = { instanceId: 'fixture', port: 1, lost: new AbortController().signal, assertHeld: async () => {}, close: vi.fn(async () => {}) };
	const directories: DirectoryPort = { inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }), chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/fixture' }) };
	const storage: TextStorage = { exists: async p => files.has(p), read: async p => files.get(p)!, mkdir: async () => {}, write: vi.fn(async (p, text) => { files.set(p, text); }) };
	const report = vi.fn(), spaces = new SpaceService({ storage, directories, owners: { acquire: async () => lease }, instanceId: 'fixture', report });
	let events!: NativeEvents, autoStop = false, sequence = 0;
	const emit = (sid: number, evidence: TerminationEvidence, requestId?: string) => events.termination?.(sid, { version: 1, sequence: ++sequence, evidence, requestId });
	const spawn = vi.fn(async () => 42), input = vi.fn(), ack = vi.fn(), requested = vi.fn((sid: number, options: { requestId: string; force: boolean }) => { if (autoStop) { emit(sid, confirmed(), options.requestId); events.exit?.(sid, 0, null); } });
	const native = new NativeHost(async e => { events = e; return { alive: true, version: 'fixture', terminalTermination: 1, spawnSession: spawn, input, acknowledge: ack, resize() {}, end(sid) { emit(sid, confirmed()); events.exit?.(sid, 0, null); }, requestStop: requested, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => {} }; });
	const environment = vi.fn(async () => ({}));
	const sessions = new TerminalSessions({ native, environment, platform: 'linux', settings: () => normalizeTerminalSettings({}), colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	const launchPort: WorkspaceLaunchPort = { shell: options => sessions.create({ ...options, kind: 'shell', title: 'shell', file: 'sh', args: [], cwd: options.cwd! }), agent: async () => undefined, resume: async () => undefined, account: () => '', report };
	const workspace = new WorkspaceService(createSpaceWorkspaceStore(spaces, globalThis as unknown as Window, report), sessions, launchPort, undefined, spaces);
	await workspace.persistence.ready;
	const space = await spaces.create({ name: 'A' });
	async function launch() { const result = await workspace.createManaged({ kind: 'shell', spaceId: space.id }); if (result.status !== 'created') throw new Error(JSON.stringify(result)); return { spaceId: space.id, sessionId: result.session.sessionId, runtimeId: result.session.runtime.runtimeId }; }
	return { files, storage, directories, report, lease, spaces, native, sessions, workspace, space, spawn, input, ack, environment, requested, emit, launchPort, events: () => events, launch,
		async cleanup() { autoStop = true; for (const s of sessions.list()) { emit(s.sid, confirmed()); events.exit?.(s.sid, 0, null); } await workspace.dispose(); await sessions.dispose(); await native.dispose(); } };
}

for (const cancel of ['abort', 'timeout'] as const) test(`archive observes ${cancel} before a stalled final flush completes`, async () => {
	const f = await fixture(), entered = deferred(), blocked = deferred(), abort = new AbortController();
	let operation: ReturnType<WorkspaceService['archiveManaged']> | undefined;
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!;
		f.emit(session.sid, confirmed()); f.events().exit(session.sid, 0, null); await f.workspace.waitManagedStop(ref);
		const plan = await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id });
		const flush = f.workspace.persistence.flush.bind(f.workspace.persistence);
		f.workspace.persistence.flush = async () => { entered.resolve(); await blocked.promise; await flush(); };
		operation = f.workspace.archiveManaged(plan, { timeoutMs: 50, signal: abort.signal });
		await entered.promise; if (cancel === 'abort') abort.abort();
		const result = await Promise.race([operation, new Promise<'hung'>(resolve => setTimeout(() => resolve('hung'), 200))]);
		expect(result).not.toBe('hung');
		expect(result).toMatchObject({ status: 'incomplete', effect: 'partial', error: { code: cancel === 'abort' ? 'WAIT_CANCELLED' : 'WAIT_TIMEOUT' }, rows: [{ persisted: true }] });
		expect(f.spaces.store.getState().records.spaces[f.space.id]?.archived).toBe(false);
		blocked.resolve(); await operation; await f.spaces.flush();
		expect(f.spaces.store.getState().records.spaces[f.space.id]?.archived).toBe(false);
	} finally { blocked.resolve(); await operation; await f.cleanup(); }
});

test('shutdown observer expires while its real checkpoint and writer stay owned', async () => {
	const f = await fixture(), entered = deferred(), blocked = deferred();
	let draining: Promise<void> | undefined;
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!, write = f.storage.write;
		f.storage.write = async (p, text) => { entered.resolve(); await blocked.promise; await write(p, text); };
		f.emit(session.sid, confirmed()); f.events().exit(session.sid, 0, null); await entered.promise;
		vi.useFakeTimers(); let settled = false;
		draining = f.workspace.drainManaged(); void draining.then(() => { settled = true; }, () => { settled = true; });
		await vi.advanceTimersByTimeAsync(60000);
		expect(settled).toBe(true); expect(f.lease.close).not.toHaveBeenCalled();
		expect(JSON.parse(f.files.get(f.spaces.path)!).sessions[ref.sessionId].lastAttempt.state).toBe('unconfirmed');
	} finally { vi.useRealTimers(); blocked.resolve(); await draining?.catch(() => {}); await f.cleanup(); }
});

test('an archive with no observation budget has no stop or persistence effects', async () => {
	const f = await fixture();
	try {
		await f.launch(); const plan = await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id }), writes = vi.mocked(f.storage.write).mock.calls.length;
		expect(await f.workspace.archiveManaged(plan, { timeoutMs: 0 })).toMatchObject({ status: 'incomplete', effect: 'none', rows: [], error: { code: 'WAIT_TIMEOUT' } });
		expect(f.requested).not.toHaveBeenCalled(); expect(vi.mocked(f.storage.write).mock.calls).toHaveLength(writes);
	} finally { await f.cleanup(); }
});

for (const failure of [false, true]) test(`an already admitted archive primary remains owned after observer abort and late ${failure ? 'rejection' : 'success'}`, async () => {
	const f = await fixture(), entered = deferred(), gate = deferred(), abort = new AbortController();
	let operation: ReturnType<WorkspaceService['archiveManaged']> | undefined;
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!;
		f.emit(session.sid, confirmed()); f.events().exit(session.sid, 0, null); await f.workspace.waitManagedStop(ref); await f.spaces.flush();
		const plan = await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id }), write = f.storage.write;
		const primary = vi.fn();
		f.storage.write = async (path, text) => {
			if (path === f.spaces.path && JSON.parse(text).spaces[f.space.id].archived) { primary(); entered.resolve(); await gate.promise; if (failure) throw new Error('fixture late primary rejected'); }
			await write(path, text);
		};
		operation = f.workspace.archiveManaged(plan, { signal: abort.signal }); await entered.promise; abort.abort();
		const result = await Promise.race([operation, new Promise<'hung'>(resolve => setTimeout(() => resolve('hung'), 200))]);
		expect(result).toMatchObject({ status: 'incomplete', effect: 'unknown', rows: [{ persisted: true }], error: { code: 'WAIT_CANCELLED' } });
		await expect(f.spaces.prepareSession(f.space.id, { kind: 'shell', title: 'must stay gated' })).rejects.toMatchObject({ reason: 'archive-in-progress' });
		expect(f.lease.close).not.toHaveBeenCalled(); const before = JSON.stringify(result);
		gate.resolve(); await f.spaces.flush().catch(() => {});
		expect(primary).toHaveBeenCalledOnce(); expect(JSON.stringify(result)).toBe(before);
		expect(f.spaces.store.getState().records.spaces[f.space.id]?.archived).toBe(!failure);
		if (failure) expect(f.report).toHaveBeenCalledWith(expect.objectContaining({ code: 'PERSISTENCE_FAILED' }));
	} finally { gate.resolve(); await operation; await f.cleanup().catch(() => {}); }
});

for (const phase of ['acquire', 'unreserved-checkpoint'] as const) test(`archive abort returns before ${phase} IO settles and cannot later start archival`, async () => {
	const f = await fixture(), entered = deferred(), gate = deferred(), abort = new AbortController();
	let operation: ReturnType<WorkspaceService['archiveManaged']> | undefined, rename: Promise<void> | undefined;
	try {
		if (phase === 'unreserved-checkpoint') await f.spaces.prepareSession(f.space.id, { kind: 'shell', title: 'commit before reserve' });
		const plan = await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id }), write = f.storage.write;
		f.storage.write = async (path, text) => { entered.resolve(); await gate.promise; await write(path, text); };
		if (phase === 'acquire') { rename = f.spaces.rename(f.space.id, 'pending rename'); await entered.promise; }
		operation = f.workspace.archiveManaged(plan, { signal: abort.signal });
		if (phase === 'unreserved-checkpoint') await entered.promise;
		abort.abort();
		const result = await Promise.race([operation, new Promise<'hung'>(resolve => setTimeout(() => resolve('hung'), 200))]);
		expect(result).toMatchObject({ status: 'incomplete', effect: phase === 'acquire' ? 'none' : 'partial', error: { code: 'WAIT_CANCELLED' } });
		if (phase === 'unreserved-checkpoint') expect(result).toMatchObject({ rows: [{ status: 'not-running', persisted: false }] });
		const before = JSON.stringify(result); gate.resolve(); await rename; await f.spaces.flush(); await Promise.resolve();
		expect(JSON.stringify(result)).toBe(before); expect(f.requested).not.toHaveBeenCalled();
		expect(f.spaces.store.getState().records.spaces[f.space.id]?.archived).toBe(false);
	} finally { gate.resolve(); await rename; await operation; await f.cleanup(); }
});

test('pending stop fences spawn and persists a proven not-started outcome before explicit retry', async () => {
	const f = await fixture(), gate = deferred();
	f.environment.mockImplementation(() => gate.promise.then(() => ({})));
	try {
		const creating = f.workspace.createManaged({ kind: 'shell', spaceId: f.space.id });
		await vi.waitFor(() => expect(f.workspace.listManaged(f.space.id)).toHaveLength(1));
		const row = f.workspace.listManaged(f.space.id)[0]!, ref = { ...row, runtimeId: row.runtime!.runtimeId };
		expect(await f.workspace.openManagedRecord(row)).toMatchObject({ status: 'failed', error: { reason: 'attempt-pending' } });
		expect(Object.keys(f.workspace.store.getState().tabs)).toHaveLength(0);
		const stopped = await f.workspace.stopManaged(ref);
		expect(stopped).toMatchObject({ status: 'stopped', persisted: true, termination: { root: { state: 'not-started' } } });
		gate.resolve(); await creating;
		expect(f.spawn).not.toHaveBeenCalled();
		expect(f.spaces.store.getState().records.sessions[ref.sessionId]?.lastAttempt?.runtimeId).toBe(ref.runtimeId);
	} finally { gate.resolve(); await f.cleanup(); }
});

test('a settled partial scope accepts force without renewing its request or observation deadline', async () => {
	const f = await fixture();
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!;
		const partial: TerminationEvidence = { root: { state: 'exited', code: 0, signal: null }, cleanup: { state: 'partial', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 1, reason: 'deadline' }, output: 'truncated' };
		f.emit(session.sid, partial); f.events().exit(session.sid, 0, null);
		f.sessions.requestManagedStop(ref); const first = f.sessions.managedSummary(ref)!.stop!, deadline = f.sessions.stopObservation(ref).deadline;
		expect(f.requested).toHaveBeenCalledOnce(); expect(f.sessions.stopObservation(ref).settled).toBe(false);
		f.emit(session.sid, partial); expect(f.sessions.managedSummary(ref)!.stop!.phase).toBe('settled');
		vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(deadline + 1);
		f.sessions.requestManagedStop(ref, true); f.sessions.requestManagedStop(ref, true);
		expect(f.requested).toHaveBeenCalledTimes(2);
		expect(f.requested.mock.calls.map(call => call[1].requestId)).toEqual([first.requestId, first.requestId]);
		expect(f.sessions.stopObservation(ref).deadline).toBe(deadline); expect(f.sessions.managedSummary(ref)!.stop!.requestedAt).toBe(first.requestedAt);
		vi.useRealTimers(); f.emit(session.sid, confirmed());
		expect(await f.workspace.waitManagedStop(ref)).toMatchObject({ status: 'stopped', persisted: true });
	} finally { vi.useRealTimers(); await f.cleanup(); }
});

test('a disconnected captured scope remains unknown without acquiring another helper or retrying spawn', async () => {
	const f = await fixture();
	try {
		const ref = await f.launch(); f.events().closed('fixture connection lost');
		const result = await f.workspace.stopManaged(ref, { force: true });
		expect(result).toMatchObject({ status: 'pending', termination: { cleanup: { state: 'unknown' } } });
		expect(f.requested).not.toHaveBeenCalled(); expect(f.spawn).toHaveBeenCalledOnce();
	} finally { await f.cleanup().catch(() => {}); }
});

test('archive cancellation returns completed and pending member effects without late mutation of its rows', async () => {
	const f = await fixture(), abort = new AbortController(); let operation: ReturnType<WorkspaceService['archiveManaged']> | undefined;
	try {
		const first = await f.launch(), second = await f.launch(), a = f.sessions.get(first.runtimeId)!, b = f.sessions.get(second.runtimeId)!;
		f.emit(a.sid, confirmed()); f.events().exit(a.sid, 0, null); await f.workspace.waitManagedStop(first);
		operation = f.workspace.archiveManaged(await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id }), { signal: abort.signal });
		await vi.waitFor(() => expect(f.requested).toHaveBeenCalledOnce()); await f.spaces.flush(); await Promise.resolve(); abort.abort();
		const result = await operation;
		expect(result).toMatchObject({ status: 'incomplete', effect: 'partial' });
		expect(result.rows.find(row => row.target.sessionId === first.sessionId)).toMatchObject({ status: 'stopped', persisted: true, effect: 'completed' });
		expect(result.rows.find(row => row.target.sessionId === second.sessionId)).toMatchObject({ status: 'incomplete', persisted: false, effect: 'unknown' });
		const before = JSON.stringify(result); f.emit(b.sid, confirmed()); f.events().exit(b.sid, 0, null); await f.spaces.flush(); await Promise.resolve();
		expect(JSON.stringify(result)).toBe(before); expect(f.spaces.store.getState().records.spaces[f.space.id]?.archived).toBe(false);
	} finally { abort.abort(); await operation; await f.cleanup(); }
});

test('short stop observers do not settle global deadline or block on checkpoint IO; root notice preserves output and parser ACK', async () => {
	const f = await fixture(), blocked = deferred();
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!;
		const original = f.storage.write;
		f.storage.write = async (p, text) => { await blocked.promise; await original(p, text); };
		const result = await Promise.race([f.workspace.stopManaged(ref, { timeoutMs: 0 }), new Promise<'hung'>(resolve => setTimeout(() => resolve('hung'), 100))]);
		expect(result).not.toBe('hung');
		expect(result).toMatchObject({ status: 'pending', persisted: false, error: { code: 'WAIT_TIMEOUT' } });
		expect(f.workspace.getManaged(ref)?.runtime?.stop?.phase).toBe('stop-requested');
		session.input('blocked'); expect(f.input).not.toHaveBeenCalled();
		f.emit(session.sid, { root: { state: 'exited', code: 7, signal: null }, cleanup: { state: 'pending', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 1 }, output: 'unknown' });
		expect(session.connection).toBe('connected');
		f.events().output?.(session.sid, new TextEncoder().encode('descendant-output\x1b[5n'));
		await vi.waitFor(() => expect(f.ack).toHaveBeenCalled());
		expect(session.snapshot()).toContain('descendant-output');
		await vi.waitFor(() => expect(f.input).toHaveBeenCalled()); // parser reply remains allowed
		blocked.resolve();
		f.emit(session.sid, confirmed(7)); f.events().exit?.(session.sid, 7, null);
		expect(await f.workspace.waitManagedStop(ref)).toMatchObject({ status: 'stopped', persisted: true });
		expect(f.requested).toHaveBeenCalledTimes(1);
	} finally { blocked.resolve(); await f.cleanup(); }
});

test('Space archive only archives the parent and a changed preview has zero stop effects', async () => {
	const f = await fixture();
	try {
		const first = await f.launch(), plan = await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id });
		await f.launch();
		expect(await f.workspace.archiveManaged(plan)).toMatchObject({ status: 'failed', effect: 'none', error: { code: 'STALE_RUNTIME' } });
		expect(f.requested).not.toHaveBeenCalled();
		for (const s of f.sessions.list()) { f.emit(s.sid, confirmed()); f.events().exit?.(s.sid, 0, null); }
		const current = await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id });
		expect(await f.workspace.archiveManaged(current)).toMatchObject({ status: 'archived', rows: [{ persisted: true }, { persisted: true }] });
		expect(f.spaces.store.getState().records.spaces[f.space.id]?.archived).toBe(true);
		expect(f.spaces.store.getState().records.sessions[first.sessionId]?.archived).not.toBe(true);
		expect(f.workspace.getManaged(first)?.archived).toBe(true);
	} finally { await f.cleanup(); }
});

test('an aborted observer leaves an independent observer and the same stop effect active', async () => {
	const f = await fixture();
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!, abort = new AbortController();
		const first = f.workspace.stopManaged(ref, { signal: abort.signal });
		const second = f.workspace.waitManagedStop(ref, { timeoutMs: 1000 });
		abort.abort();
		expect(await first).toMatchObject({ status: 'pending', persisted: false, error: { code: 'WAIT_CANCELLED' } });
		expect(f.workspace.getManaged(ref)?.runtime?.stop?.phase).toBe('stop-requested');
		f.emit(session.sid, confirmed()); f.events().exit?.(session.sid, 0, null);
		expect(await second).toMatchObject({ status: 'stopped', persisted: true });
		expect(f.requested).toHaveBeenCalledTimes(1);
	} finally { await f.cleanup(); }
});

test('archive keeps accurate per-object effects when a later runtime stop throws', async () => {
	const f = await fixture();
	try {
		const first = await f.launch(), second = await f.launch(), plan = await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id });
		const stop = f.sessions.requestManagedStop.bind(f.sessions);
		vi.spyOn(f.sessions, 'requestManagedStop').mockImplementation(ref => { if (ref.sessionId === second.sessionId) throw new Error('fixture stop refusal'); stop(ref); });
		const result = await f.workspace.archiveManaged(plan, { timeoutMs: 50 });
		expect(result).toMatchObject({ status: 'incomplete', effect: 'partial' });
		expect(result.rows).toHaveLength(2);
		expect(result.rows.find(row => row.target.sessionId === first.sessionId)).toMatchObject({ status: 'incomplete', persisted: false });
		expect(result.rows.find(row => row.target.sessionId === second.sessionId)).toMatchObject({ status: 'failed', persisted: false });
		expect(f.requested).toHaveBeenCalledTimes(1);
		expect(f.spaces.list()).toHaveLength(1);
		vi.restoreAllMocks();
	} finally { vi.restoreAllMocks(); await f.cleanup(); }
});

test('recovered unconfirmed attempts remain visible and block explicit restart without acquiring native resources', async () => {
	const f = await fixture();
	try {
		const admission = await f.spaces.prepareSession(f.space.id, { kind: 'shell', title: 'unconfirmed' });
		const target = { spaceId: f.space.id, sessionId: admission.record.id };
		expect(f.workspace.getManaged(target)).toMatchObject({ viewState: 'restored', restore: { state: 'unconfirmed', canRequestContinue: false } });
		await expect(f.spaces.prepareSession(f.space.id, admission.record, admission.record.id)).rejects.toMatchObject({ code: 'EFFECT_UNKNOWN' });
		expect(f.spawn).not.toHaveBeenCalled();
		expect(f.environment).not.toHaveBeenCalled();
		expect(f.requested).not.toHaveBeenCalled();
	} finally { await f.cleanup(); }
});

test('shutdown holds the writer until verified cleanup checkpoint drains and rejects a failed final save', async () => {
	const f = await fixture(), blocked = deferred(), entered = deferred();
	let draining: Promise<void> | undefined;
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!;
		const original = f.storage.write;
		f.storage.write = async (p, text) => { entered.resolve(); await blocked.promise; await original(p, text); };
		f.workspace.quiesce();
		f.emit(session.sid, confirmed()); f.events().exit?.(session.sid, 0, null);
		draining = f.workspace.drainManaged();
		await entered.promise;
		expect(f.lease.close).not.toHaveBeenCalled();
		expect(await f.workspace.createManaged({ kind: 'shell', spaceId: f.space.id })).toMatchObject({ status: 'failed', effect: 'none' });
		blocked.resolve(); await draining;
		expect(JSON.parse(f.files.get(f.spaces.path)!).sessions[ref.sessionId].lastAttempt).toMatchObject({ state: 'settled', termination: { cleanup: { state: 'confirmed' } } });
		expect(f.lease.close).not.toHaveBeenCalled();
	} finally { blocked.resolve(); await draining; await f.cleanup(); }
});

test('a final save failure preserves the pre-spawn unknown marker and prevents archival', async () => {
	const f = await fixture();
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!, original = f.storage.write;
		f.storage.write = async () => { throw new Error('fixture final save failure'); };
		f.emit(session.sid, confirmed()); f.events().exit?.(session.sid, 0, null);
		expect(await f.workspace.stopManaged(ref)).toMatchObject({ status: 'failed', persisted: false, error: { code: 'PERSISTENCE_FAILED' } });
		expect(JSON.parse(f.files.get(f.spaces.path)!).sessions[ref.sessionId].lastAttempt.state).toBe('unconfirmed');
		expect(await f.workspace.archiveManaged(await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id }))).toMatchObject({ status: 'incomplete' });
		expect(f.spaces.list()).toHaveLength(1);
		await expect(f.workspace.drainManaged()).rejects.toBeDefined();
		f.storage.write = original;
		await f.spaces.checkpointAttempt(ref, confirmed()); // Explicit verified storage recovery, no process retry.
	} finally { await f.cleanup(); }
});

test('captured parser replies and ACK survive lease release while new user input remains closed', async () => {
	const f = await fixture();
	let closing: Promise<void> | undefined;
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!;
		closing = f.sessions.dispose();
		session.input('forbidden'); expect(f.input).not.toHaveBeenCalled();
		f.events().output?.(session.sid, new TextEncoder().encode('release-output\x1b[5n'));
		await vi.waitFor(() => { expect(f.ack).toHaveBeenCalled(); expect(f.input).toHaveBeenCalled(); });
		expect(session.snapshot()).toContain('release-output');
		f.emit(session.sid, confirmed()); f.events().exit?.(session.sid, 0, null);
		await closing;
	} finally { if (closing) { for (const s of f.sessions.list()) { f.emit(s.sid, confirmed()); f.events().exit?.(s.sid, 0, null); } await closing; } await f.cleanup(); }
});

test('a stopped pending launch may be explicitly retried while its late provider completion cannot alter the new runtime', async () => {
	const f = await fixture(), blocked = deferred();
	f.environment.mockImplementationOnce(() => blocked.promise.then(() => ({})));
	try {
		const creating = f.workspace.createManaged({ kind: 'shell', spaceId: f.space.id });
		await vi.waitFor(() => expect(f.environment).toHaveBeenCalledOnce());
		const row = f.workspace.listManaged(f.space.id)[0]!, ref = { ...row, runtimeId: row.runtime!.runtimeId };
		expect(await f.workspace.stopManaged(ref)).toMatchObject({ status: 'stopped', persisted: true });
		const admission = await f.spaces.prepareSession(f.space.id, { kind: 'shell', title: 'retry' }, ref.sessionId), next = f.sessions.reserveManaged(admission.record);
		await f.sessions.create({ runtime: next, kind: 'shell', title: 'retry', file: 'sh', args: [], cwd: admission.cwd, beforeSpawn: admission.beforeSpawn });
		blocked.resolve();
		await expect(creating).resolves.toMatchObject({ status: 'failed' });
		expect(f.workspace.getManaged(ref)?.runtime).toMatchObject({ runtimeId: next.runtimeId, phase: 'connected' });
		expect(f.spawn).toHaveBeenCalledTimes(1);
	} finally { blocked.resolve(); await f.cleanup(); }
});

test('a background record without a Pane opens after reload with zero native work, then explicitly restarts its original Shell', async () => {
	const f = await fixture();
	let reopened: WorkspaceService | undefined, sessions: TerminalSessions | undefined;
	try {
		const result = await f.workspace.createManaged({ kind: 'shell', shell: 'bash', spaceId: f.space.id });
		if (result.status !== 'created') throw new Error('missing fixture runtime');
		const ref = { spaceId: f.space.id, sessionId: result.session.sessionId, runtimeId: result.session.runtime.runtimeId }, session = f.sessions.get(ref.runtimeId)!;
		f.emit(session.sid, confirmed()); f.events().exit?.(session.sid, 0, null);
		await f.workspace.stopManaged(ref);
		expect(Object.keys(f.workspace.store.getState().tabs)).toHaveLength(0);
		await f.workspace.dispose(); await f.sessions.dispose();
		const spaces = new SpaceService({ storage: f.storage, directories: f.directories, owners: { acquire: async () => ({ ...f.lease, close: async () => {} }) }, instanceId: 'reloaded', report: f.report });
		sessions = new TerminalSessions({ native: f.native, environment: f.environment, platform: process.platform, settings: () => normalizeTerminalSettings({}), colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
		const current = sessions;
		const launchShell = vi.fn((options: { shell?: import('../core/terminal/settings').ShellChoice; cwd?: string; runtime?: typeof ref; beforeSpawn?: () => Promise<void> }) => current.create({ ...options, kind: 'shell', title: 'restored', file: options.shell === 'bash' ? 'original-bash' : 'different-default', args: [], cwd: options.cwd! }));
		reopened = new WorkspaceService(createSpaceWorkspaceStore(spaces, globalThis as unknown as Window, f.report), sessions, { shell: launchShell, agent: async () => undefined, resume: async () => undefined, account: () => '', report: f.report }, undefined, spaces);
		await reopened.persistence.ready;
		const before = f.spawn.mock.calls.length;
		const opened = await reopened.openManagedRecord(ref);
		expect(opened).toMatchObject({ status: 'opened' });
		expect(f.spawn.mock.calls).toHaveLength(before);
		expect(f.environment).toHaveBeenCalledTimes(1);
		expect(sessions.list()).toHaveLength(0);
		if (opened.status !== 'opened') throw new Error('missing record view');
		await reopened.restore(opened.tabId, undefined, true);
		expect(launchShell).toHaveBeenCalledWith(expect.objectContaining({ shell: 'bash', runtime: { spaceId: ref.spaceId, sessionId: ref.sessionId, runtimeId: expect.any(String) } }));
		expect(f.spawn.mock.calls).toHaveLength(before + 1);
		expect(reopened.getManaged(ref)?.runtime?.runtimeId).not.toBe(ref.runtimeId);
		expect(Object.keys(spaces.store.getState().records.sessions)).toEqual([ref.sessionId]);
	} finally { if (sessions) for (const s of sessions.list()) { f.emit(s.sid, confirmed()); f.events().exit?.(s.sid, 0, null); } await reopened?.dispose(); await sessions?.dispose(); await f.cleanup(); }
});

test('opening an unknown record is zero spawn and neither unknown nor missing Agent resume source can continue', async () => {
	const f = await fixture();
	try {
		const admission = await f.spaces.prepareSession(f.space.id, { kind: 'agent', title: 'Agent', agentId: 'codex', accountId: '' });
		const target = { spaceId: f.space.id, sessionId: admission.record.id }, opened = await f.workspace.openManagedRecord(target);
		expect(opened).toMatchObject({ status: 'opened' });
		expect(f.sessions.list()).toHaveLength(0);
		expect(f.environment).not.toHaveBeenCalled();
		if (opened.status !== 'opened') throw new Error('missing record view');
		await expect(f.workspace.restore(opened.tabId, undefined, true)).rejects.toMatchObject({ code: 'EFFECT_UNKNOWN' });
		const evidence: TerminationEvidence = { root: { state: 'not-started', code: null, signal: null }, cleanup: { state: 'confirmed', scope: 'not-started', remainingKnown: 0 }, output: 'drained' };
		await f.spaces.checkpointAttempt({ ...target, runtimeId: admission.runtimeId }, evidence);
		await expect(f.workspace.restore(opened.tabId, undefined, false)).rejects.toMatchObject({ code: 'SOURCE_UNAVAILABLE', reason: 'resume-source-unavailable' });
		expect(f.spawn).not.toHaveBeenCalled();
		expect(f.environment).not.toHaveBeenCalled();
	} finally { await f.cleanup(); }
});

test('termination checkpoints capture existing native resume provenance and fence an older attempt from a new marker', async () => {
	const f = await fixture();
	try {
		const admission = await f.spaces.prepareSession(f.space.id, { kind: 'agent', title: 'Pi', agentId: 'pi', accountId: '' }), ref = f.sessions.reserveManaged(admission.record);
		const session = await f.sessions.create({ runtime: ref, kind: 'agent', agentId: 'pi', title: 'Pi', file: 'pi', args: [], cwd: admission.cwd, beforeSpawn: admission.beforeSpawn });
		session.setActivity('done', { session_id: 'original-native', transcript_path: '/fixture/pi-original.jsonl' });
		f.emit(session.sid, confirmed()); f.events().exit?.(session.sid, 0, null);
		expect(await f.workspace.waitManagedStop(ref)).toMatchObject({ status: 'stopped', persisted: true });
		expect(f.spaces.store.getState().records.sessions[ref.sessionId]).toMatchObject({ nativeSessionId: 'original-native', transcriptPath: '/fixture/pi-original.jsonl' });
		const next = await f.spaces.prepareSession(f.space.id, admission.record, ref.sessionId);
		await expect(f.spaces.checkpointAttempt(ref, confirmed(), undefined, { nativeSessionId: 'stale-native' })).rejects.toMatchObject({ code: 'STALE_RUNTIME' });
		expect(f.spaces.store.getState().records.sessions[ref.sessionId]).toMatchObject({ nativeSessionId: undefined, transcriptPath: undefined, lastAttempt: { runtimeId: next.runtimeId, state: 'unconfirmed' } });
	} finally { await f.cleanup(); }
});

for (const queued of [false, true]) test(`archive observer cancellation ${queued ? 'while final commit is queued' : 'during final layout drain'} keeps confirmed rows without late archival`, async () => {
	const f = await fixture(), entered = deferred(), release = deferred();
	let archiving: ReturnType<WorkspaceService['archiveManaged']> | undefined, rename: Promise<void> | undefined;
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!, abort = new AbortController();
		const b = await f.spaces.create({ name: 'B' });
		const flush = f.workspace.persistence.flush.bind(f.workspace.persistence), write = f.storage.write;
		vi.spyOn(f.workspace.persistence, 'flush').mockImplementationOnce(async () => {
			if (!queued) { entered.resolve(); await release.promise; }
			else {
				let first = true;
				f.storage.write = async (p, text) => { if (first) { first = false; entered.resolve(); await release.promise; } await write(p, text); };
				rename = f.spaces.rename(b.id, 'B2'); await entered.promise; return;
			}
			await flush();
		});
		const commit = vi.spyOn(f.spaces, 'commitArchive');
		archiving = f.workspace.archiveManaged(await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id }), { signal: abort.signal });
		await vi.waitFor(() => expect(f.requested).toHaveBeenCalledOnce());
		f.emit(session.sid, confirmed()); f.events().exit?.(session.sid, 0, null);
		await entered.promise;
		if (queued) await vi.waitFor(() => expect(commit).toHaveBeenCalledOnce());
		abort.abort(); release.resolve();
		const result = await archiving;
		expect(result).toMatchObject({ status: 'incomplete', effect: 'partial', error: { code: 'WAIT_CANCELLED' }, rows: [{ status: 'stopped', persisted: true }] });
		expect(f.spaces.store.getState().records.spaces[f.space.id]?.archived).toBe(false);
		if (rename) await rename;
	} finally { release.resolve(); await archiving; await rename; vi.restoreAllMocks(); await f.cleanup(); }
});

test('fresh Agent restart clears prior attempt native provenance and cannot continue N1 when the new run captured no source', async () => {
	const f = await fixture();
	try {
		f.launchPort.agent = (id, options) => f.sessions.create({ ...options, kind: 'agent', agentId: id, title: id, file: id, args: [], cwd: options.cwd! });
		const created = await f.workspace.createManaged({ kind: 'agent', agentId: 'codex', spaceId: f.space.id });
		if (created.status !== 'created') throw new Error('missing fixture agent');
		const ref = { spaceId: f.space.id, sessionId: created.session.sessionId, runtimeId: created.session.runtime.runtimeId }, first = f.sessions.get(ref.runtimeId)!;
		first.setActivity('done', { session_id: 'N1', transcript_path: '/fixture/N1.jsonl' });
		f.emit(first.sid, confirmed()); f.events().exit?.(first.sid, 0, null);
		await f.workspace.waitManagedStop(ref);
		const opened = await f.workspace.openManagedRecord(ref); if (opened.status !== 'opened') throw new Error('missing record view');
		await f.workspace.restore(opened.tabId, undefined, true);
		const record = f.spaces.store.getState().records.sessions[ref.sessionId]!;
		expect(record.nativeSessionId).toBeUndefined(); expect(record.transcriptPath).toBeUndefined();
		const second = f.sessions.get(record.lastAttempt!.runtimeId)!;
		f.emit(second.sid, confirmed()); f.events().exit?.(second.sid, 0, null);
		await f.workspace.waitManagedStop({ ...ref, runtimeId: second.id });
		await expect(f.workspace.restore(opened.tabId, undefined, false)).rejects.toMatchObject({ code: 'SOURCE_UNAVAILABLE', reason: 'resume-source-unavailable' });
		expect(f.spawn).toHaveBeenCalledTimes(2);
		expect(f.spaces.store.getState().records.sessions[ref.sessionId]?.nativeSessionId).toBeUndefined();
	} finally { await f.cleanup(); }
});

test('explicit Agent resume retains the exact accepted native source without a new Hook locator', async () => {
	const f = await fixture();
	try {
		f.launchPort.agent = (id, options) => f.sessions.create({ ...options, kind: 'agent', agentId: id, title: id, file: id, args: [], cwd: options.cwd! });
		const created = await f.workspace.createManaged({ kind: 'agent', agentId: 'codex', spaceId: f.space.id });
		if (created.status !== 'created') throw new Error('missing agent');
		const target = { spaceId: f.space.id, sessionId: created.session.sessionId }, first = f.sessions.get(created.session.runtime.runtimeId)!;
		first.setActivity('done', { session_id: 'N1', transcript_path: '/fixture/N1.jsonl' });
		f.emit(first.sid, confirmed()); f.events().exit?.(first.sid, 0, null);
		await f.workspace.waitManagedStop({ ...target, runtimeId: first.id });
		const opened = await f.workspace.openManagedRecord(target); if (opened.status !== 'opened') throw new Error('missing record view');
		const resume = vi.fn((info: Parameters<WorkspaceLaunchPort['resume']>[0], title: string, beforeSpawn?: () => Promise<void>, context?: Parameters<WorkspaceLaunchPort['resume']>[3]) => f.sessions.create({ ...context, beforeSpawn, kind: 'agent', agentId: info.agentId, title, file: 'codex', args: ['resume', info.nativeSessionId!], cwd: info.cwd }));
		f.launchPort.resume = resume;
		await f.workspace.restore(opened.tabId, undefined, false);
		expect(resume).toHaveBeenCalledWith(expect.objectContaining({ nativeSessionId: 'N1', transcriptPath: '/fixture/N1.jsonl' }), expect.any(String), expect.any(Function), expect.any(Object));
		const record = f.spaces.store.getState().records.sessions[target.sessionId]!;
		expect(record).toMatchObject({ nativeSessionId: 'N1', transcriptPath: '/fixture/N1.jsonl' });
		const second = f.sessions.get(record.lastAttempt!.runtimeId)!;
		f.emit(second.sid, confirmed()); f.events().exit?.(second.sid, 0, null);
		await f.workspace.waitManagedStop({ ...target, runtimeId: second.id });
		expect(f.spaces.store.getState().records.sessions[target.sessionId]?.nativeSessionId).toBe('N1');
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally { await f.cleanup(); }
});

test('the archive observation deadline is rechecked after final layout drain', async () => {
	const f = await fixture();
	try {
		const ref = await f.launch(), session = f.sessions.get(ref.runtimeId)!;
		f.emit(session.sid, confirmed()); f.events().exit?.(session.sid, 0, null);
		await f.workspace.waitManagedStop(ref);
		const now = Date.now(); vi.useFakeTimers({ toFake: ['Date'], now });
		const flush = f.workspace.persistence.flush.bind(f.workspace.persistence);
		vi.spyOn(f.workspace.persistence, 'flush').mockImplementationOnce(async () => { vi.setSystemTime(now + 200); await flush(); });
		const result = await f.workspace.archiveManaged(await f.workspace.previewArchive({ kind: 'space', spaceId: f.space.id }), { timeoutMs: 100 });
		expect(result).toMatchObject({ status: 'incomplete', effect: 'partial', error: { code: 'WAIT_TIMEOUT' }, rows: [{ persisted: true, status: 'stopped' }] });
		expect(f.spaces.store.getState().records.spaces[f.space.id]?.archived).toBe(false);
	} finally { vi.useRealTimers(); vi.restoreAllMocks(); await f.cleanup(); }
});

test('an imported native Session with no prior attempt presents as ended and resumable; HUHU-launched unconfirmed ones do not', async () => {
	const f = await fixture();
	try {
		const { session } = await f.spaces.importHistorySession({
			spaceId: f.space.id, sourceRef: 'codex:x:/log', accountKey: '{}', deviceId: 'd', agentId: 'codex',
			accountId: '', nativeSessionId: 'n1', title: 'imported',
		});
		const target = { spaceId: f.space.id, sessionId: session.id };
		expect(f.workspace.getManaged(target)).toMatchObject({ viewState: 'restored', restore: { state: 'ended', canRequestContinue: true } });
		const plain = await f.spaces.prepareSession(f.space.id, { kind: 'shell', title: 'unconfirmed' });
		expect(f.workspace.getManaged({ spaceId: f.space.id, sessionId: plain.record.id })).toMatchObject({ restore: { state: 'unconfirmed', canRequestContinue: false } });
	} finally { await f.cleanup(); }
});
