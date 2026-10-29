import { expect, test, vi } from 'vitest';
import { NativeHost } from '../../../../host/desktop/native/host';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { TerminalSessions } from './sessions';

for (const managed of [false, true]) for (const boundary of (managed ? ['hooks', 'beforeSpawn'] : ['hooks', 'beforeSpawn', 'legacy-script']) as readonly ('hooks' | 'beforeSpawn' | 'legacy-script')[]) test(`quiesce fences the final spawn gate after ${boundary} (${managed ? 'managed' : 'legacy'})`, async () => {
	let entered!: () => void, release!: () => void;
	const waiting = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
	const close = vi.fn(), spawn = vi.fn(async () => 42);
	const native = new NativeHost(async events => ({ alive: true, version: 'fixture', spawnSession: spawn, input() {}, resize() {}, acknowledge() {}, end(sid) { events.exit(sid, 0, null); }, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => { events.closed('closed'); } }));
	const sessions = new TerminalSessions({ native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }), agentHooks: async () => { entered(); await gate; return { env: {}, close }; } });
	try {
		const runtime = managed ? sessions.reserveManaged({ id: 'stable-before', spaceId: 'space', kind: 'agent', title: 'before', createdAt: 0, lastAttempt: { runtimeId: 'before-runtime', acceptedAt: 0, state: 'unconfirmed' } }) : undefined;
		const creating = sessions.create({ runtime, kind: boundary === 'legacy-script' ? 'script' : 'agent', automated: boundary === 'legacy-script', agentId: 'claude-code', title: 'late old consumer', file: 'sh', args: [], cwd: '/fixture',
			hooks: boundary === 'hooks', beforeSpawn: boundary === 'beforeSpawn' ? async () => { entered(); await gate; } : undefined,
			prepare: boundary === 'legacy-script' ? () => { queueMicrotask(() => sessions.quiesce()); } : undefined });
		if (boundary !== 'legacy-script') { await waiting; sessions.quiesce(); release(); }
		const session = await creating;
		expect(spawn).not.toHaveBeenCalled(); expect(session.running).toBe(false);
		if (boundary === 'hooks') expect(close).toHaveBeenCalledOnce();
	} finally { release?.(); await sessions.dispose().catch(() => {}); await native.dispose(); }
});

for (const managed of [false, true]) test(`quiesce cleans a late spawn reply without adopting it (${managed ? 'managed' : 'legacy'})`, async () => {
	let entered!: () => void, release!: (pid: number) => void;
	const waiting = new Promise<void>(resolve => { entered = resolve; }), reply = new Promise<number>(resolve => { release = resolve; });
	const end = vi.fn();
	const native = new NativeHost(async events => ({ alive: true, version: 'fixture', terminalTermination: 1, requestStop() {}, spawnSession: async () => { entered(); return reply; }, input() {}, resize() {}, acknowledge() {},
		end(sid) { end(sid); events.termination?.(sid, { version: 1, sequence: 1, evidence: { root: { state: 'exited', code: 0, signal: null }, cleanup: { state: 'confirmed', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 0 }, output: 'drained' } }); events.exit(sid, 0, null); }, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => {} }));
	const sessions = new TerminalSessions({ native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	try {
		const runtime = managed ? sessions.reserveManaged({ id: 'stable-late', spaceId: 'space', kind: 'shell', title: 'late', createdAt: 0, lastAttempt: { runtimeId: 'late-runtime', acceptedAt: 0, state: 'unconfirmed' } }) : undefined;
		const creating = sessions.create({ runtime, kind: 'shell', title: 'late', file: 'sh', args: [], cwd: '/fixture' });
		await waiting; sessions.quiesce(); release(42); const session = await creating;
		expect(end).toHaveBeenCalledWith(session.sid); expect(session.pid).toBeUndefined(); expect(session.connection).not.toBe('connected');
	} finally { release?.(42); for (const session of sessions.list()) session.end(true); await sessions.dispose().catch(() => {}); await native.dispose(); }
});

test('final Space check runs after hooks and preserves a failed record without spawning', async () => {
	let valid = true;
	let entered!: () => void, release!: () => void;
	const waiting = new Promise<void>(resolve => { entered = resolve; });
	const hooks = new Promise<void>(resolve => { release = resolve; });
	const spawn = vi.fn(async () => 42), close = vi.fn();
	const native = new NativeHost(async events => ({ alive: true, version: 'fixture', spawnSession: spawn, input() {}, resize() {}, acknowledge() {}, end() {}, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => { events.closed('closed'); } }));
	const sessions = new TerminalSessions({ native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }), agentHooks: async () => { entered(); await hooks; return { env: {}, close }; } });
	const beforeSpawn = vi.fn(async () => { if (!valid) throw new Error('DIRECTORY_NOT_AUTHORIZED:directory-changed'); });
	const creating = sessions.create({ kind: 'agent', title: 'bound', file: 'agent', args: [], cwd: '/vault', agentId: 'claude-code', hooks: true, beforeSpawn });
	await waiting;
	valid = false;
	release();
	const session = await creating;
	expect(beforeSpawn).toHaveBeenCalledOnce();
	expect(spawn).not.toHaveBeenCalled();
	expect(close).toHaveBeenCalledOnce();
	expect(sessions.get(session.id)).toBe(session);
	expect(session.connection).toBe('failed');
	expect(session.error).toContain('DIRECTORY_NOT_AUTHORIZED');
	await sessions.dispose();
	await native.dispose();
});

test('cancellation while final validation waits cannot spawn afterwards', async () => {
	const abort = new AbortController();
	const spawn = vi.fn(async () => 42);
	const native = new NativeHost(async events => ({ alive: true, version: 'fixture', spawnSession: spawn, input() {}, resize() {}, acknowledge() {}, end() {}, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => { events.closed('closed'); } }));
	const sessions = new TerminalSessions({ native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	const session = await sessions.create({ signal: abort.signal, kind: 'shell', title: 'cancelled', file: 'sh', args: [], cwd: '/vault', beforeSpawn: async () => { abort.abort(); } });
	expect(spawn).not.toHaveBeenCalled();
	expect(session.running).toBe(false);
	await sessions.dispose(); await native.dispose();
});

test('old helper events cannot mutate a new runtime when native sid numbers are reused', async () => {
	const events: import('../../../../shared/native/host').NativeEvents[] = [];
	const native = new NativeHost(async callbacks => {
		events.push(callbacks);
		return { alive: true, version: 'fixture', terminalTermination: 1, requestStop: (sid: number, options: { requestId: string }) => { callbacks.termination?.(sid, { version: 1, sequence: 1, requestId: options.requestId, evidence: { root: { state: 'exited', code: 0, signal: null }, cleanup: { state: 'confirmed', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 0 }, output: 'drained' } }); callbacks.exit(sid, 0, null); }, spawnSession: async () => 42, input() {}, resize() {}, acknowledge() {}, end(sid) { queueMicrotask(() => callbacks.exit(sid, 0, null)); }, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => {} };
	});
	const sessions = new TerminalSessions({ native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	try {
		const old = await sessions.create({ kind: 'shell', title: 'old', file: 'sh', args: [], cwd: '/vault' });
		events[0]!.closed('generation closed');
		await new Promise<void>(resolve => setImmediate(resolve));
		const current = await sessions.create({ kind: 'shell', title: 'new', file: 'sh', args: [], cwd: '/vault' });
		expect(current.sid).toBe(old.sid);
		events[0]!.output(old.sid, new TextEncoder().encode('STALE OUTPUT'));
		events[0]!.exit(old.sid, 8, null);
		await new Promise<void>(resolve => { const off = current.subscribe(() => { off(); resolve(); }); });
		expect(current.connection).toBe('connected');
		expect(current.text()).not.toContain('STALE OUTPUT');
	} finally { await expect(sessions.dispose()).rejects.toBeInstanceOf(AggregateError); await native.dispose(); }
});

test('an exit received before the spawned reply keeps its outcome and parse acknowledgement', async () => {
	const ack = vi.fn();
	const native = new NativeHost(async events => ({ alive: true, version: 'fixture',
		spawnSession: async sid => { events.output(sid, new TextEncoder().encode('early-output')); events.exit(sid, 7, null); return 42; },
		input() {}, resize() {}, acknowledge: ack, end(sid) { queueMicrotask(() => events.exit(sid, 0, null)); }, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => { events.closed('closed'); } }));
	const sessions = new TerminalSessions({ native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	try {
		const session = await sessions.create({ kind: 'shell', title: 'early exit', file: 'sh', args: [], cwd: '/vault' });
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => { off(); reject(new Error('parse barrier did not settle')); }, 1000);
			const off = session.subscribe(() => { clearTimeout(timer); off(); resolve(); });
		});
		expect(session.connection).toBe('exited');
		expect(session.exitCode).toBe(7);
		expect(session.pid).toBe(42);
		expect(session.text()).toContain('early-output');
		expect(ack).toHaveBeenCalledWith(session.sid, 12);
	} finally { await expect(sessions.dispose()).rejects.toBeInstanceOf(AggregateError); await native.dispose(); }
});

test('an unconfirmed native exit is disconnected evidence and never an exit-code-zero success event', async () => {
	const observed: import('./session').SessionEvent[] = [];
	const native = new NativeHost(async events => ({ alive: true, version: 'fixture', spawnSession: async sid => { events.exit(sid, null, null); return 42; }, input() {}, resize() {}, acknowledge() {}, end() {}, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => { events.closed('closed'); } }));
	const sessions = new TerminalSessions({ native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	try {
		const session = await sessions.create({ kind: 'shell', title: 'unknown exit', file: 'sh', args: [], cwd: '/vault', prepare: current => current.observe(event => observed.push(event)) });
		expect(session.connection).toBe('disconnected');
		expect(session.exitCode).toBeUndefined();
		expect(session.exitEvidence).toEqual({ code: null, signal: null, confirmed: false });
		expect(observed).toEqual([{ kind: 'disconnected' }]);
	} finally { await expect(sessions.dispose()).rejects.toBeInstanceOf(AggregateError); await native.dispose(); }
});

test('a managed spawn with a lost reply stays uncertain while a confirmed early exit remains confirmed', async () => {
	for (const earlyExit of [false, true]) {
		const lost = new Error('spawn reply lost');
		let closed!: () => void;
		const native = new NativeHost(async events => { closed = () => events.closed('lost transport'); return { alive: true, version: 'fixture',
			spawnSession: async sid => { if (earlyExit) events.exit(sid, 7, null); throw lost; },
			input() {}, resize() {}, acknowledge() {}, end() {}, history: async <T>() => [] as T, request: async <T>() => ({}) as T,
			dispose: async () => { events.closed('closed'); } }; });
		const sessions = new TerminalSessions({ native, environment: async () => ({}), settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
		try {
			const runtime = sessions.reserveManaged({ id: 'stable', spaceId: 'space', kind: 'shell', title: 'uncertain', createdAt: 0, lastAttempt: { runtimeId: 'reserved', acceptedAt: 0, state: 'unconfirmed' } });
			const session = await sessions.create({ runtime, kind: 'shell', title: 'uncertain', file: 'sh', args: [], cwd: '/vault' });
			expect(session.connection).toBe(earlyExit ? 'exited' : 'disconnected');
			expect(sessions.managedSummary(runtime)?.phase).toBe(earlyExit ? 'exited' : 'disconnected');
			expect(session.exitCode).toBe(earlyExit ? 7 : undefined);
			if (earlyExit) expect(session.exitEvidence).toEqual({ code: 7, signal: null, confirmed: true });
			else expect(session.failureCause).toBe(lost);
		} finally { closed(); await expect(sessions.dispose()).rejects.toBeInstanceOf(AggregateError); await native.dispose(); }
	}
});
