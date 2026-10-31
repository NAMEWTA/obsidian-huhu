import { expect, test, vi } from 'vitest';
import { NativeHost } from '../../../../host/desktop/native/host';
import type { NativeEvents } from '../../../../shared/native/host';
import { TerminalSessions } from './sessions';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { RuntimeActivityBinding, RuntimeHooksRequest } from '../../core/workspace/managed-runtime';

const record = {
	id: 'persistent',
	spaceId: 'space',
	kind: 'shell' as const,
	title: 'Shell',
	createdAt: 1,
	lastAttempt: { runtimeId: 'runtime', acceptedAt: 1, state: 'unconfirmed' as const },
};

test.each(['reserved', 'preparing'] as const)(
	'T06 remove never infers exited from an absent %s Session',
	async (stage) => {
		let release!: (env: Record<string, string>) => void;
		const gate = new Promise<Record<string, string>>((resolve) => (release = resolve));
		const spawn = vi.fn(async () => 42);
		const start = vi.fn(async (events: NativeEvents) => ({
			alive: true,
			version: 'fixture',
			spawnSession: spawn,
			input() {},
			resize() {},
			acknowledge() {},
			end() {},
			history: async <T>() => [] as T,
			request: async <T>() => ({}) as T,
			dispose: async () => events.closed('closed'),
		}));
		const native = new NativeHost(start);
		const environment = vi.fn(() => gate);
		const sessions = new TerminalSessions({
			native,
			environment,
			platform: process.platform,
			settings: () => normalizeTerminalSettings({ scrollback: 100 }),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		let creating: ReturnType<TerminalSessions['create']> | undefined;
		try {
			const ref = sessions.reserveManaged(record);
			if (stage === 'preparing') {
				creating = sessions.create({
					runtime: ref,
					kind: 'shell',
					title: 'Shell',
					file: 'sh',
					args: [],
					cwd: '/fixture',
				});
				await vi.waitFor(() => expect(environment).toHaveBeenCalledOnce());
			}
			expect(sessions.managedSummary(ref)?.phase).toBe('launch-pending');
			if (stage === 'reserved') expect(sessions.get(ref.runtimeId)).toBeUndefined();
			sessions.remove(ref.runtimeId);
			expect(sessions.get(ref.runtimeId)).toBeUndefined();
			expect(sessions.managedRef(ref.runtimeId)).toEqual(ref);
			expect(sessions.managedSummary(ref)).toMatchObject({
				phase: 'cancelled',
				termination: { root: { state: 'not-started' }, cleanup: { state: 'confirmed', scope: 'not-started' } },
			});
			release({});
			if (creating) await expect(creating).rejects.toMatchObject({ failure: { reason: 'attempt-cancelled' } });
			expect(sessions.managedSummary(ref)?.phase).toBe('cancelled');
			expect(spawn).not.toHaveBeenCalled();
			if (stage === 'reserved') expect(start).not.toHaveBeenCalled();
		} finally {
			release({});
			if (creating) await expect(creating).rejects.toMatchObject({ failure: { reason: 'attempt-cancelled' } });
			await sessions.dispose();
			await native.dispose();
		}
	},
);

test.each(['null-exit', 'lost-reply'] as const)(
	'T06 remove preserves uncertainty after a spawn-sent %s and never fabricates an exited runtime',
	async (failure) => {
		let events!: NativeEvents, release!: () => void, sid!: number;
		const gate = new Promise<void>((resolve) => (release = resolve));
		const requestStop = vi.fn();
		const spawn = vi.fn(async (id: number) => {
			sid = id;
			await gate;
			if (failure === 'lost-reply') throw new Error('The spawned reply was lost');
			events.exit(id, null, null);
			return 42;
		});
		const native = new NativeHost(async (e) => {
			events = e;
			return {
				alive: true,
				version: 'fixture',
				terminalTermination: 1,
				requestStop,
				spawnSession: spawn,
				input() {},
				resize() {},
				acknowledge() {},
				end() {},
				history: async <T>() => [] as T,
				request: async <T>() => ({}) as T,
				dispose: async () => e.closed('closed'),
			};
		});
		const sessions = new TerminalSessions({
			native,
			environment: async () => ({}),
			platform: process.platform,
			settings: () => normalizeTerminalSettings({ scrollback: 100 }),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		let creating: ReturnType<TerminalSessions['create']> | undefined;
		try {
			const ref = sessions.reserveManaged(record);
			creating = sessions.create({
				runtime: ref,
				kind: 'shell',
				title: 'Shell',
				file: 'sh',
				args: [],
				cwd: '/fixture',
			});
			await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
			expect(sessions.get(ref.runtimeId)?.sid).toBe(sid);
			expect(sessions.managedSummary(ref)?.phase).toBe('launch-pending');
			sessions.remove(ref.runtimeId);
			expect(sessions.get(ref.runtimeId)).toBeDefined();
			expect(sessions.managedSummary(ref)?.phase).toBe('launch-pending');
			release();
			const session = await creating;
			await session.whenParsed();
			sessions.remove(ref.runtimeId);
			expect(sessions.get(ref.runtimeId)).toBeUndefined();
			expect(sessions.managedRef(ref.runtimeId)).toEqual(ref);
			expect(sessions.managedSummary(ref)).toMatchObject({ phase: 'disconnected', inputReady: false });
			expect(sessions.managedSummary(ref)?.termination?.cleanup.state).not.toBe('confirmed');
			expect(session.exitCode).toBeUndefined();
			expect(spawn).toHaveBeenCalledOnce();
		} finally {
			release();
			await creating;
			events.closed('lost transport');
			await expect(sessions.dispose()).rejects.toBeInstanceOf(AggregateError);
			await native.dispose();
		}
	},
);

test('T06 managed Shell owns one hook scope; stop revokes before deferred preparation and disposal awaits cleanup', async () => {
	let events!: NativeEvents;
	const spawn = vi.fn(async () => 42),
		close = vi.fn(async () => {});
	const native = new NativeHost(async (e) => {
		events = e;
		return {
			alive: true,
			version: 'fixture',
			spawnSession: spawn,
			input() {},
			resize() {},
			acknowledge() {},
			end(sid) {
				e.exit(sid, 0, null);
			},
			history: async <T>() => [] as T,
			request: async <T>() => ({}) as T,
			dispose: async () => e.closed('closed'),
		};
	});
	let resolve!: (v: { env: Record<string, string>; close: () => Promise<void> }) => void;
	const gate = new Promise<{ env: Record<string, string>; close: () => Promise<void> }>((r) => (resolve = r));
	let captured!: RuntimeActivityBinding, request!: RuntimeHooksRequest;
	const prepareRuntimeHooks = vi.fn((r: RuntimeHooksRequest, b: RuntimeActivityBinding) => {
		request = r;
		captured = b;
		return gate;
	});
	const sessions = new TerminalSessions({
		native,
		environment: async () => ({}),
		platform: process.platform,
		settings: () => normalizeTerminalSettings({ statusHooks: true, scrollback: 100 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		runtimeHooks: { prepareRuntimeHooks },
	});
	const record = {
		id: 'persistent',
		spaceId: 'space',
		kind: 'shell' as const,
		title: 'Shell',
		createdAt: 1,
		lastAttempt: { runtimeId: 'runtime', acceptedAt: 1, state: 'unconfirmed' as const },
	};
	const ref = sessions.reserveManaged(record);
	const creating = sessions.create({
		runtime: ref,
		kind: 'shell',
		title: 'Shell',
		file: 'sh',
		args: [],
		cwd: '/fixture',
	});
	await vi.waitFor(() => expect(prepareRuntimeHooks).toHaveBeenCalledOnce());
	expect(captured.active()).toBe(true);
	sessions.requestManagedStop(ref);
	expect(captured.active()).toBe(false);
	expect(request.signal?.aborted).toBe(true);
	resolve({ env: {}, close });
	await creating;
	expect(spawn).not.toHaveBeenCalled();
	await sessions.dispose();
	expect(close).toHaveBeenCalledOnce();
	expect(events).toBeDefined();
	await native.dispose();
});

test.each(['stop', 'root-notice', 'numeric-exit', 'transport-lost'] as const)(
	'T06 native %s fence wins over a pending activity reorder batch',
	async (kind) => {
		let events!: NativeEvents,
			sid = 0,
			sequence = 0,
			finished = false;
		const finish = (id: number) => {
			if (finished) return;
			finished = true;
			events.termination?.(id, {
				version: 1,
				sequence: ++sequence,
				evidence: {
					root: { state: 'exited', code: 0, signal: null },
					cleanup: {
						state: 'confirmed',
						scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
						remainingKnown: 0,
					},
					output: 'drained',
				},
			});
			events.exit(id, 0, null);
		};
		const native = new NativeHost(async (e) => {
			events = e;
			return {
				alive: true,
				version: 'fixture',
				terminalTermination: 1,
				spawnSession: async (id) => {
					sid = id;
					return 42;
				},
				input() {},
				resize() {},
				acknowledge() {},
				requestStop: (id) => finish(id),
				end: (id) => finish(id),
				history: async <T>() => [] as T,
				request: async <T>() => ({}) as T,
				dispose: async () => e.closed('closed'),
			};
		});
		const sessions = new TerminalSessions({
			native,
			environment: async () => ({}),
			platform: process.platform,
			settings: () => normalizeTerminalSettings({ scrollback: 100, statusHooks: true }),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		let lost = false;
		try {
			const ref = sessions.reserveManaged(record),
				session = await sessions.create({
					runtime: ref,
					kind: 'shell',
					title: 'shell',
					file: 'sh',
					args: [],
					cwd: '/fixture',
				});
			// Explicit captured binding represents the registered source; no second hook scope is made.
			const runtime = session.bindActivityRuntime();
			const source = runtime.bindSource({
				provider: 'pi',
				kind: 'native-hook',
				adapterRevision: '1',
				lifetime: { kind: 'registration', sourceInstance: 'native-fence' },
			});
			expect(source).toBeDefined();
			source!.observe({ deliveryId: '1', sourceSequence: 1, event: 'agent_start', state: 'working' });
			source!.observeOrdered([], true);
			expect(session.getActivitySnapshot().source.reason).toBe('sequence-gap');
			if (kind === 'stop') sessions.requestManagedStop(ref);
			else if (kind === 'root-notice')
				events.termination?.(sid, {
					version: 1,
					sequence: ++sequence,
					evidence: {
						root: { state: 'exited', code: 0, signal: null },
						cleanup: {
							state: 'pending',
							scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
							remainingKnown: null,
						},
						output: 'unknown',
					},
				});
			else if (kind === 'numeric-exit') finish(sid);
			else {
				lost = true;
				events.closed('lost');
			}
			const invalid = session.getActivitySnapshot();
			expect(invalid.state).toBe('unknown');
			expect(
				source!.observeOrdered(
					[
						{
							deliveryId: '2',
							sourceSequence: 2,
							event: 'agent_settled',
							state: 'done',
							completion: 'turn-finished',
						},
					],
					false,
				).status,
			).toBe('rejected');
			expect(session.getActivitySnapshot()).toBe(invalid);
			expect(invalid.completion).toBeUndefined();
			if (kind === 'transport-lost') {
				await session.whenParsed();
				expect(session.connection).toBe('disconnected');
			}
		} finally {
			if (!lost) finish(sid);
			try {
				if (lost)
					await expect(sessions.dispose()).rejects.toMatchObject({
						name: 'AggregateError',
						errors: expect.arrayContaining([
							expect.objectContaining({
								name: 'Error',
								outcomes: [expect.objectContaining({ sid, reason: 'disconnected' })],
							}),
						]),
					});
				else await sessions.dispose();
			} finally {
				await native.dispose();
			}
		}
	},
);
