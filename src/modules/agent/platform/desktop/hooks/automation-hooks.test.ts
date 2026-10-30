import path from 'node:path';
import { mkdtemp, mkdir, readdir, readFile, realpath, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { expect, test, vi } from 'vitest';
import { AutomationHooks, hookActivityConsumer } from './automation-hooks';
import { accountEnv } from '../agents/accounts';
import { AGENT_CATALOG } from '../../../core/launch/catalog';
import { TerminalSession } from '../../../services/terminal/session';

test('native hooks and per-terminal event spools use only the selected vault account for every provider', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-hooks-owned-')),
		vault = path.join(root, 'vault'),
		host = path.join(root, 'host');
	await mkdir(vault);
	await mkdir(host);
	const requireNode = createRequire(import.meta.url);
	const win = {
		require: (name: string) =>
			name === 'node:os' ? { homedir: () => host, tmpdir: () => host } : requireNode(name),
		setInterval: () => 1,
		clearInterval: () => {},
	} as unknown as Window;
	vi.stubGlobal('window', win);
	const hooks = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	try {
		for (const agent of AGENT_CATALOG) {
			const env = await accountEnv(agent, 'a.b', vault, 'fixture-device');
			const other = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
			const [handle, concurrent] = await Promise.all([
				hooks.prepare(agent.id, env, () => {}),
				other.prepare(agent.id, env, () => {}),
			]);
			expect(handle.env.HUHU_HOOK_DIR!.startsWith(handle.env.HUHU_HOOK_ROOT! + path.sep)).toBe(true);
			expect(handle.env.HUHU_HOOK_ROOT).toBe(concurrent.env.HUHU_HOOK_ROOT);
			expect(await readdir(host)).toEqual([]);
			await handle.close();
			await concurrent.close();
			await other.dispose();
		}
	} finally {
		await hooks.dispose();
		vi.unstubAllGlobals();
		await rm(root, { recursive: true, force: true });
	}
}, 30000);

test('a provider update arriving at the replacement boundary is preserved and reported', async () => {
	const vault = await mkdtemp(path.join(tmpdir(), 'huhu-hooks-race-'));
	const requireNode = createRequire(import.meta.url),
		fs = requireNode('node:fs/promises') as typeof import('node:fs/promises');
	const env = await accountEnv(AGENT_CATALOG[0]!, 'a.b', vault, 'fixture-device');
	const file = path.join(env.CLAUDE_CONFIG_DIR!, 'settings.json');
	await writeFile(file, '{"before":true}');
	let injected = false;
	const wrapped = {
		...fs,
		rename: async (from: string, to: string) => {
			if (!injected && (from === file || to === file)) {
				injected = true;
				await writeFile(file, '{"external":true}');
			}
			return fs.rename(from, to);
		},
	};
	const win = {
		require: (name: string) => (name === 'node:fs/promises' ? wrapped : requireNode(name)),
		setInterval: () => 1,
		clearInterval: () => {},
	} as unknown as Window;
	vi.stubGlobal('window', win);
	const hooks = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	try {
		await expect(hooks.prepare('claude-code', env, () => {})).rejects.toThrow();
		expect(injected).toBe(true);
		expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ external: true });
		const handle = await hooks.prepare('claude-code', env, () => {});
		expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({ external: true, hooks: expect.any(Object) });
		await handle.close();
	} finally {
		await hooks.dispose();
		vi.unstubAllGlobals();
		await rm(vault, { recursive: true, force: true });
	}
}, 30000);

test('two Hook owners and different accounts share one physical vault/device pool without changing HOME', async () => {
	const vault = await mkdtemp(path.join(tmpdir(), 'huhu-hooks-shared-'));
	const requireNode = createRequire(import.meta.url);
	const win = { require: requireNode, setInterval: () => 1, clearInterval: () => {} } as unknown as Window;
	vi.stubGlobal('window', win);
	const first = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	const second = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	try {
		const a = await accountEnv(AGENT_CATALOG[0]!, 'first', vault, 'fixture-device');
		const b = await accountEnv(AGENT_CATALOG[0]!, 'second', vault, 'fixture-device');
		const one = await first.prepare('claude-code', a, () => {}),
			two = await second.prepare('claude-code', b, () => {});
		expect(one.env.HUHU_HOOK_ROOT).toBeTruthy();
		expect(one.env.HUHU_HOOK_ROOT).toBe(two.env.HUHU_HOOK_ROOT);
		expect(one.env.HUHU_HOOK_DIR).not.toBe(two.env.HUHU_HOOK_DIR);
		expect(one.env.HOME).toBeUndefined();
		await first.dispose();
		expect((await readdir(two.env.HUHU_HOOK_DIR!)).includes('active.json')).toBe(true);
		await two.close();
	} finally {
		await Promise.all([first.dispose(), second.dispose()]);
		vi.unstubAllGlobals();
		await rm(vault, { recursive: true, force: true });
	}
});

test('a prepared Shell observes a real Pi registration, paired block and final settlement from one publication stream', async () => {
	const vault = await mkdtemp(path.join(tmpdir(), 'huhu-hook-runtime-'));
	const requireNode = createRequire(import.meta.url),
		win = { require: requireNode } as unknown as Window;
	vi.stubGlobal('window', win);
	const hooks = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	const { PI_EXTENSION } = await import('./native-extensions');
	const sources: Array<{
		meta: import('../../../core/workspace/managed-runtime').ActivitySourceMeta;
		observations: import('../../../core/workspace/managed-runtime').ActivityObservation[];
		closed: boolean;
	}> = [];
	let active = true;
	const binding: import('../../../core/workspace/managed-runtime').RuntimeActivityBinding = {
		runtimeId: 'runtime-fixture',
		active: () => active,
		invalidate: () => {},
		close: () => {
			active = false;
		},
		bindSource: (meta) => {
			const row = {
				meta,
				observations: [] as import('../../../core/workspace/managed-runtime').ActivityObservation[],
				closed: false,
			};
			sources.push(row);
			return {
				bindingId: 'source-' + sources.length,
				programEpoch: 'epoch-fixture',
				active: () => active && !row.closed,
				invalidate: () => {},
				close: () => {
					row.closed = true;
				},
				observe: (observation) => {
					row.observations.push(observation);
					return {
						status: 'accepted',
						at: { runtimeId: 'runtime-fixture', activitySequence: row.observations.length },
					};
				},
				observeOrdered: (values) => {
					row.observations.push(...values);
					return {
						status: 'accepted',
						at: { runtimeId: 'runtime-fixture', activitySequence: row.observations.length },
					};
				},
			};
		},
	};
	let prepared: Awaited<ReturnType<typeof hooks.prepareRuntimeHooks>> | undefined;
	const saved = Object.fromEntries(
		['HUHU_HOOK_ROOT', 'HUHU_HOOK_DIR', 'HUHU_HOOK_TOKEN', 'HUHU_HOOK_NODE', 'HUHU_NATIVE_OWNER'].map((key) => [
			key,
			process.env[key],
		]),
	);
	try {
		prepared = await hooks.prepareRuntimeHooks(
			{
				target: { spaceId: 'space', sessionId: 'session', runtimeId: binding.runtimeId },
				env: { HOME: 'untouched' },
			},
			binding,
		);
		expect(prepared.env.HOME).toBeUndefined();
		for (const [key, value] of Object.entries(prepared.env)) process.env[key] = value;
		delete process.env.HUHU_NATIVE_OWNER;
		const plugin = await import(`data:text/javascript,${encodeURIComponent(PI_EXTENSION)}#runtime-${Date.now()}`);
		const handlers = new Map<string, (event: Record<string, unknown>, context: unknown) => void>();
		plugin.default({
			on: (name: string, fn: (event: Record<string, unknown>, context: unknown) => void) =>
				handlers.set(name, fn),
		});
		const context = {
			cwd: vault,
			sessionManager: { getSessionId: () => 'native-fixture', getSessionFile: () => 'fixture.jsonl' },
		};
		handlers.get('agent_start')!({}, context);
		handlers.get('ui_prompt_start')!({}, context);
		handlers.get('ui_prompt_end')!({}, context);
		handlers.get('agent_end')!(
			{ messages: [{ role: 'assistant', content: [{ type: 'text', text: '完整答案' }] }] },
			context,
		);
		handlers.get('agent_settled')!({}, context);
		const deadline = Date.now() + 1800;
		while ((sources[0]?.observations.length ?? 0) < 5 && Date.now() < deadline)
			await new Promise((r) => setTimeout(r, 5));
		expect(sources).toHaveLength(1);
		expect(sources[0]!.meta.lifetime).toMatchObject({
			kind: 'registration',
			sourceInstance: expect.stringMatching(/^[\da-f-]{36}$/),
		});
		const observations = sources[0]!.observations;
		expect(observations.map((row) => row.sourceSequence)).toEqual([1, 2, 3, 4, 5]);
		expect(observations[2]!.blocking).toMatchObject({ state: 'blocked', reason: 'permission' });
		expect(observations[3]!.blocking).toEqual({ state: 'clear', blockId: observations[2]!.blocking!.blockId });
		expect(observations[4]).toMatchObject({ event: 'agent_settled', state: 'done', completion: 'turn-finished' });
		expect(JSON.stringify(observations)).not.toContain('完整答案');
		await prepared.close();
		expect(sources[0]!.closed).toBe(true);
	} finally {
		if (prepared) await prepared.close();
		await hooks.dispose();
		for (const [key, value] of Object.entries(saved))
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		vi.unstubAllGlobals();
		await rm(vault, { recursive: true, force: true });
	}
});

test('dispose revokes a prepared runtime evidence binding synchronously before physical cleanup', async () => {
	const vault = await mkdtemp(path.join(tmpdir(), 'huhu-hook-revoke-'));
	const requireNode = createRequire(import.meta.url),
		win = { require: requireNode } as unknown as Window;
	vi.stubGlobal('window', win);
	const hooks = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	let active = true;
	const binding: import('../../../core/workspace/managed-runtime').RuntimeActivityBinding = {
		runtimeId: 'dispose-runtime',
		active: () => active,
		bindSource: () => undefined,
		invalidate: () => {},
		close: () => {
			active = false;
		},
	};
	try {
		await hooks.prepareRuntimeHooks(
			{ target: { spaceId: 'space', sessionId: 'session', runtimeId: binding.runtimeId }, env: {} },
			binding,
		);
		const cleanup = hooks.dispose();
		expect(active, 'evidence is withdrawn before awaiting physical cleanup').toBe(false);
		await cleanup;
	} finally {
		await hooks.dispose();
		vi.unstubAllGlobals();
		await rm(vault, { recursive: true, force: true });
	}
});

test('a closed binding cannot finish scope preparation even without an abort signal', async () => {
	const vault = await mkdtemp(path.join(tmpdir(), 'huhu-hook-late-binding-'));
	const requireNode = createRequire(import.meta.url),
		real = requireNode('node:fs/promises') as typeof import('node:fs/promises');
	let resume!: () => void, entered!: () => void;
	const blocked = new Promise<void>((resolve) => {
			entered = resolve;
		}),
		gate = new Promise<void>((resolve) => {
			resume = resolve;
		});
	let captured = false;
	const files = {
		...real,
		mkdir: async (...args: Parameters<typeof real.mkdir>) => {
			if (!captured && /[\\/]scopes[\\/]\d+$/.test(String(args[0]))) {
				captured = true;
				entered();
				await gate;
			}
			return real.mkdir(...args);
		},
	};
	const win = {
		require: (name: string) => (name === 'node:fs/promises' ? files : requireNode(name)),
	} as unknown as Window;
	vi.stubGlobal('window', win);
	const hooks = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	let active = true;
	const binding: import('../../../core/workspace/managed-runtime').RuntimeActivityBinding = {
		runtimeId: 'late-runtime',
		active: () => active,
		bindSource: () => undefined,
		invalidate: () => {},
		close: () => {
			active = false;
		},
	};
	const pending = hooks.prepareRuntimeHooks(
		{ target: { spaceId: 'space', sessionId: 'session', runtimeId: binding.runtimeId }, env: {} },
		binding,
	);
	// Register rejection observation before releasing the actual filesystem boundary.
	const outcome = pending.then(
		() => 'returned-env',
		() => 'rejected',
	);
	try {
		await Promise.race([
			blocked,
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error('scope barrier timeout')), 1200)),
		]);
		binding.close();
		resume();
		expect(await outcome).toBe('rejected');
	} finally {
		resume();
		await outcome;
		await hooks.dispose();
		vi.unstubAllGlobals();
		await rm(vault, { recursive: true, force: true });
	}
});

test('dispose observes an early physical cleanup rejection while another preparation is still pending', async () => {
	const vault = await mkdtemp(path.join(tmpdir(), 'huhu-hook-early-cleanup-'));
	const requireNode = createRequire(import.meta.url),
		real = requireNode('node:fs/promises') as typeof import('node:fs/promises');
	let block = false,
		fail = false,
		entered!: () => void,
		resume!: () => void;
	const barrier = new Promise<void>((resolve) => {
			entered = resolve;
		}),
		gate = new Promise<void>((resolve) => {
			resume = resolve;
		});
	const files = {
		...real,
		mkdir: async (...args: Parameters<typeof real.mkdir>) => {
			if (block && /[\\/]scopes[\\/]\d+$/.test(String(args[0]))) {
				block = false;
				entered();
				await gate;
			}
			return real.mkdir(...args);
		},
		unlink: async (file: Parameters<typeof real.unlink>[0]) => {
			if (fail && String(file).endsWith('active.json'))
				throw Object.assign(new Error('injected cleanup denial'), { code: 'EACCES' });
			return real.unlink(file);
		},
	};
	const win = {
		require: (name: string) => (name === 'node:fs/promises' ? files : requireNode(name)),
	} as unknown as Window;
	vi.stubGlobal('window', win);
	const hooks = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	const binding = (runtimeId: string): import('../../../core/workspace/managed-runtime').RuntimeActivityBinding => {
		let active = true;
		return {
			runtimeId,
			active: () => active,
			bindSource: () => undefined,
			invalidate: () => {},
			close: () => {
				active = false;
			},
		};
	};
	let cleanup: Promise<void> | undefined, prepared: Awaited<ReturnType<typeof hooks.prepareRuntimeHooks>> | undefined;
	const unhandled: unknown[] = [],
		onUnhandled = (reason: unknown) => unhandled.push(reason);
	process.on('unhandledRejection', onUnhandled);
	let clock: { mockRestore(): void } | undefined;
	try {
		const first = binding('first-runtime');
		prepared = await hooks.prepareRuntimeHooks(
			{ target: { spaceId: 'space', sessionId: 'one', runtimeId: first.runtimeId }, env: {} },
			first,
		);
		block = true;
		const second = binding('second-runtime');
		const pending = hooks
			.prepareRuntimeHooks(
				{ target: { spaceId: 'space', sessionId: 'two', runtimeId: second.runtimeId }, env: {} },
				second,
			)
			.catch(() => {});
		await Promise.race([
			barrier,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('cleanup preparation barrier timeout')), 1000),
			),
		]);
		fail = true;
		cleanup = hooks.dispose();
		const now = Date.now();
		clock = vi.spyOn(Date, 'now').mockImplementation(() => now + 4000);
		await new Promise((resolve) => setTimeout(resolve, 450));
		expect(unhandled, 'every revoked cleanup Promise is observed before waiting for preparations').toEqual([]);
		fail = false;
		clock?.mockRestore();
		resume();
		await pending;
	} finally {
		fail = false;
		resume();
		clock?.mockRestore();
		const result = await (cleanup ?? hooks.dispose()).then(
			() => undefined,
			(error) => error,
		);
		expect(result).toBeInstanceOf(AggregateError);
		if (prepared) {
			const parent = path.dirname(prepared.env.HUHU_HOOK_DIR!);
			const deadline = Date.now() + 1500;
			while ((await real.readdir(parent)).length && Date.now() < deadline)
				await new Promise((resolve) => setTimeout(resolve, 10));
			expect(await real.readdir(parent)).toEqual([]);
		}
		process.off('unhandledRejection', onUnhandled);
		vi.unstubAllGlobals();
		await rm(vault, { recursive: true, force: true });
	}
});

function activityFixture() {
	type Meta = import('../../../core/workspace/managed-runtime').ActivitySourceMeta;
	type Observation = import('../../../core/workspace/managed-runtime').ActivityObservation;
	const sources: Array<{ meta: Meta; observations: Observation[]; reasons: string[]; closed: boolean }> = [];
	const reasons: string[] = [];
	let active = true;
	const runtime: import('../../../core/workspace/managed-runtime').RuntimeActivityBinding = {
		runtimeId: 'runtime',
		active: () => active,
		invalidate: (reason) => {
			reasons.push(reason);
			if (reason === 'capacity') active = false;
		},
		close: () => {
			active = false;
		},
		bindSource: (meta) => {
			const row = { meta, observations: [] as Observation[], reasons: [] as string[], closed: false };
			sources.push(row);
			return {
				bindingId: 'binding-' + sources.length,
				programEpoch: 'epoch',
				active: () => active && !row.closed,
				observe: (value) => {
					row.observations.push(value);
					return {
						status: 'accepted',
						at: { runtimeId: 'runtime', activitySequence: row.observations.length },
					};
				},
				observeOrdered: (values) => {
					row.observations.push(...values);
					return {
						status: 'accepted',
						at: { runtimeId: 'runtime', activitySequence: row.observations.length },
					};
				},
				invalidate: (reason) => row.reasons.push(reason),
				close: () => {
					row.closed = true;
				},
			};
		},
	};
	return { consumer: hookActivityConsumer(runtime), sources, reasons };
}
function nativeRow(
	sequence: number,
	instance = '00000000-0000-4000-8000-000000000001',
	event = 'UserPromptSubmit',
): import('./hook-spool').SpoolEvent {
	return {
		delivery: `delivery-${instance}-${sequence}`,
		at: 1,
		event,
		data: { session_id: 'same-native-id' },
		source: {
			provider: 'pi',
			instance,
			sequence,
			event: sequence === 1 ? 'registration' : event === 'Stop' ? 'agent_settled' : 'agent_start',
		},
	};
}

function sessionActivityFixture() {
	const session = new TerminalSession({
		id: 'consumer-runtime',
		sid: 7,
		kind: 'shell',
		title: 'Shell',
		cwd: '/fixture',
		cols: 80,
		rows: 24,
		scrollback: 100,
		platform: 'linux',
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const consumer = hookActivityConsumer(session.bindActivityRuntime());
	const snapshots: ReturnType<TerminalSession['getActivitySnapshot']>[] = [];
	const observer = session.observeActivity((snapshot) => snapshots.push(snapshot));
	return {
		session,
		consumer,
		snapshots,
		close: () => {
			observer.dispose();
			consumer.close();
			session.dispose();
		},
	};
}

test('the production consumer reports a gap immediately and atomically delivers all pending facts only after every hole closes', () => {
	const { session, consumer, snapshots, close } = sessionActivityFixture();
	try {
		consumer.receive(nativeRow(1));
		consumer.receive(nativeRow(2));
		const before = session.getActivitySnapshot();
		session.markActivitySeen(before.at);
		const notifications = snapshots.length;
		consumer.receive(nativeRow(4, undefined, 'Stop'));
		const gap = session.getActivitySnapshot();
		expect(gap).toMatchObject({
			state: 'unknown',
			source: { health: 'unknown', reason: 'sequence-gap' },
			lastFact: { state: 'working' },
		});
		expect(gap.at.activitySequence).toBe(before.at.activitySequence + 1);
		consumer.receive(nativeRow(6));
		consumer.receive(nativeRow(4, undefined, 'Stop'));
		consumer.receive(nativeRow(3, undefined, 'Stop'));
		expect(session.getActivitySnapshot()).toBe(gap);
		expect(session.getActivitySnapshot().completion).toBeUndefined();
		consumer.receive(nativeRow(5));
		const after = session.getActivitySnapshot();
		expect(after.state).toBe('working');
		expect(after.source.health).toBe('current');
		expect(after.at.activitySequence).toBe(gap.at.activitySequence + 4);
		expect(after.completion?.activitySequence).toBe(gap.at.activitySequence + 2);
		expect(after.seenThrough).toBe(before.at.activitySequence);
		expect(after.unreadCompletion).toBe(true);
		expect(snapshots.slice(notifications)).toEqual([gap, after]);
		consumer.receive(nativeRow(4, undefined, 'Stop'));
		expect(session.getActivitySnapshot()).toBe(after);
	} finally {
		close();
	}
});

test.each(['fill-eight', 'overflow-nine'] as const)(
	'a consumer keeps the original eight-fact reorder boundary: %s',
	(mode) => {
		const { session, consumer, snapshots, close } = sessionActivityFixture();
		try {
			consumer.receive(nativeRow(1));
			consumer.receive(nativeRow(2));
			const before = session.getActivitySnapshot();
			consumer.receive(nativeRow(mode === 'fill-eight' ? 10 : 11, undefined, 'Stop'));
			expect(session.getActivitySnapshot().source.reason).toBe('sequence-gap');
			for (let sequence = 3; sequence <= 9; sequence++) consumer.receive(nativeRow(sequence));
			if (mode === 'fill-eight') {
				expect(session.getActivitySnapshot().state).toBe('done');
				expect(session.getActivitySnapshot().completion?.activitySequence).toBe(before.at.activitySequence + 9);
				expect(snapshots.filter((row) => row.completion).length).toBe(1);
			} else {
				expect(session.getActivitySnapshot().state).toBe('unknown');
				expect(session.getActivitySnapshot().completion).toBeUndefined();
			}
		} finally {
			close();
		}
	},
);

test.each(['consumer-close', 'transport-lost', 'hook-error', 'registered-close'] as const)(
	'a gap cannot revive activity after %s',
	(ending) => {
		const { session, consumer, snapshots, close } = sessionActivityFixture();
		try {
			consumer.receive(nativeRow(1));
			consumer.receive(nativeRow(2));
			consumer.receive(nativeRow(4, undefined, 'Stop'));
			const count = snapshots.length;
			if (ending === 'consumer-close') consumer.close();
			else if (ending === 'transport-lost') session.invalidateActivity('transport-lost');
			else {
				const row = nativeRow(3, undefined, ending === 'hook-error' ? 'HookError' : 'AdapterClose');
				row.source!.event = ending === 'hook-error' ? 'HookError' : 'session_shutdown';
				consumer.receive(row);
			}
			consumer.receive(nativeRow(3));
			consumer.receive(nativeRow(5, undefined, 'Stop'));
			expect(session.getActivitySnapshot().source.health).not.toBe('current');
			expect(session.getActivitySnapshot().completion).toBeUndefined();
			expect(snapshots.slice(count).every((row) => row.source.health !== 'current')).toBe(true);
		} finally {
			close();
		}
	},
);

test.each(['session_shutdown', 'HookError'] as const)(
	'an ordered %s preserves an earlier Stop mark but never publishes current or applies later facts',
	(event) => {
		const { session, consumer, snapshots, close } = sessionActivityFixture();
		try {
			consumer.receive(nativeRow(1));
			consumer.receive(nativeRow(2));
			consumer.receive(nativeRow(6, undefined, 'Stop'));
			const gap = session.getActivitySnapshot(),
				count = snapshots.length;
			consumer.receive(nativeRow(3, undefined, 'Stop'));
			const ending = nativeRow(4, undefined, event === 'HookError' ? 'HookError' : 'AdapterClose');
			ending.source!.event = event;
			consumer.receive(ending);
			expect(session.getActivitySnapshot()).toBe(gap);
			consumer.receive(nativeRow(5));
			const after = session.getActivitySnapshot();
			expect(after.source.health).not.toBe('current');
			expect(after.completion?.activitySequence).toBe(gap.at.activitySequence + 1);
			expect(snapshots.slice(count)).toEqual([after]);
			consumer.receive(nativeRow(7, undefined, 'Stop'));
			expect(session.getActivitySnapshot()).toBe(after);
		} finally {
			close();
		}
	},
);

test('native sequence reorder is bounded, duplicate facts do not repeat, and equal native IDs do not collapse source instances', () => {
	const { consumer, sources } = activityFixture();
	consumer.receive(nativeRow(1));
	consumer.receive(nativeRow(3, undefined, 'Stop'));
	consumer.receive(nativeRow(2));
	consumer.receive(nativeRow(3, undefined, 'Stop'));
	expect(sources[0]!.observations.map((row) => row.sourceSequence)).toEqual([1, 2, 3]);
	consumer.receive(nativeRow(1, '00000000-0000-4000-8000-000000000002'));
	expect(sources).toHaveLength(2);
	expect(sources[0]!.meta.lifetime).not.toEqual(sources[1]!.meta.lifetime);
	consumer.receive(nativeRow(13));
	expect(sources[0]!.reasons).toContain('sequence-gap');
	consumer.receive(nativeRow(4, undefined, 'Stop'));
	expect(sources[0]!.observations).toHaveLength(3);
	consumer.close();
	consumer.settle();
});

test('command facts remain unproven and the 4096-delivery fence never forgets an old completion', () => {
	const { consumer, sources, reasons } = activityFixture();
	const row = (id: number): import('./hook-spool').SpoolEvent => ({
		delivery: 'command-' + id,
		provider: 'codex',
		at: 1,
		event: 'Stop',
		data: { session_id: 'same-native-id' },
	});
	for (let id = 0; id < 4096; id++) consumer.receive(row(id));
	consumer.receive(row(0));
	expect(sources).toHaveLength(1);
	expect(sources[0]!.meta.lifetime).toEqual({ kind: 'unproven' });
	expect(sources[0]!.observations).toHaveLength(4096);
	expect(
		sources[0]!.observations.every((value) => value.completion === undefined && value.sourceSequence === undefined),
	).toBe(true);
	consumer.receive(row(4096));
	consumer.receive(row(0));
	expect(reasons).toEqual(['capacity']);
	expect(sources[0]!.observations).toHaveLength(4096);
	consumer.close();
	consumer.settle();
});

test('closed native registrations retain all eight lifetime fences and cannot be reopened by a delivery', () => {
	const { consumer, sources, reasons } = activityFixture();
	for (let i = 0; i < 8; i++) {
		const instance = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
		consumer.receive(nativeRow(1, instance));
		const close = nativeRow(2, instance, 'AdapterClose');
		close.source!.event = 'session_shutdown';
		consumer.receive(close);
		consumer.receive(nativeRow(3, instance, 'Stop'));
	}
	expect(sources).toHaveLength(8);
	expect(sources.every((row) => row.closed && row.observations.length === 2)).toBe(true);
	consumer.receive(nativeRow(1, '00000000-0000-4000-8000-999999999999'));
	expect(reasons).toEqual(['capacity']);
	expect(sources).toHaveLength(8);
	consumer.close();
	consumer.settle();
});

test('an oversized activity identity rejects its whole summary without modifying the original full answer', () => {
	const { consumer, sources } = activityFixture();
	const row = nativeRow(1);
	row.data = { transcript_path: '中'.repeat(3000), last_assistant_message: '完整原答案' };
	consumer.receive(row);
	expect(sources[0]!.observations).toHaveLength(0);
	expect(sources[0]!.reasons).toEqual(['capacity']);
	expect(row.data.last_assistant_message).toBe('完整原答案');
	expect(row.data.transcript_path).toBe('中'.repeat(3000));
	consumer.close();
	consumer.settle();
});

test('malformed native source arrays are not coerced into registrations or allowed to alter the old raw answer', () => {
	const { consumer, sources, reasons } = activityFixture();
	const row = nativeRow(1);
	row.data.last_assistant_message = '原生完整答案';
	(row.source as unknown as Record<string, unknown>).instance = ['00000000-0000-4000-8000-000000000001'];
	consumer.receive(row);
	expect(sources).toHaveLength(0);
	expect(reasons).toEqual(['source-mismatch']);
	expect(row.data.last_assistant_message).toBe('原生完整答案');
	consumer.close();
	consumer.settle();
});

test('abort withdraws runtime evidence while the scope filesystem reservation is still pending', async () => {
	const vault = await mkdtemp(path.join(tmpdir(), 'huhu-hook-abort-'));
	const requireNode = createRequire(import.meta.url),
		real = requireNode('node:fs/promises') as typeof import('node:fs/promises');
	let resume!: () => void,
		entered!: () => void,
		intercepted = false;
	const gate = new Promise<void>((resolve) => {
			resume = resolve;
		}),
		barrier = new Promise<void>((resolve) => {
			entered = resolve;
		});
	const files = {
		...real,
		mkdir: async (...args: Parameters<typeof real.mkdir>) => {
			if (!intercepted && /[\\/]scopes[\\/]\d+$/.test(String(args[0]))) {
				intercepted = true;
				entered();
				await gate;
			}
			return real.mkdir(...args);
		},
	};
	const win = {
		require: (name: string) => (name === 'node:fs/promises' ? files : requireNode(name)),
	} as unknown as Window;
	vi.stubGlobal('window', win);
	const hooks = new AutomationHooks(win, () => ({ vault, device: 'fixture-device' }));
	let active = true;
	const controller = new AbortController();
	const binding: import('../../../core/workspace/managed-runtime').RuntimeActivityBinding = {
		runtimeId: 'aborted-runtime',
		active: () => active,
		bindSource: () => undefined,
		invalidate: () => {},
		close: () => {
			active = false;
		},
	};
	const pending = hooks.prepareRuntimeHooks(
		{
			target: { spaceId: 'space', sessionId: 'session', runtimeId: binding.runtimeId },
			env: {},
			signal: controller.signal,
		},
		binding,
	);
	const result = pending.then(
		() => 'returned-env',
		() => 'rejected',
	);
	try {
		await Promise.race([
			barrier,
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error('abort scope barrier timeout')), 1200)),
		]);
		controller.abort();
		expect(active, 'abort revocation must not wait for a filesystem Promise').toBe(false);
		resume();
		expect(await result).toBe('rejected');
	} finally {
		resume();
		await result;
		await hooks.dispose();
		vi.unstubAllGlobals();
		await rm(vault, { recursive: true, force: true });
	}
});

test('Pi enrollment requires one actual explicit HUHU extension after official argument consumption', async () => {
	const api = await import('./automation-hooks');
	expect(typeof api.piEditorArgumentsSupported).toBe('function');
	const accepted = api.piEditorArgumentsSupported;
	// Host-native absolute paths: on Windows `/isolated` resolves onto the current drive.
	const isolated = path.resolve('/isolated');
	const extension = path.join(isolated, 'pi', 'extensions', 'huhu-status.ts');
	expect(accepted(['-ne', '-e', extension, '--offline', '--model', 'local'], extension, isolated)).toBe(true);
	for (const args of [
		['--model', '-ne', '-e', extension],
		['--', '-ne', '-e', extension],
		['-ne', '--model', '-e', extension],
		['-ne', '-e', extension, '-e', extension],
		['-ne', '-e', '/foreign.ts'],
		['-ne', '-e', extension, '--unknown', 'value'],
		['-ne', '-e', extension, '--print', 'task'],
		['-ne', '-e', extension, '--tui-mode', 'fullscreen'],
		['-ne', '-e'],
	]) expect(accepted(args, extension, isolated)).toBe(false);
	expect(accepted(['--no-extensions', '--extension', 'pi/extensions/huhu-status.ts'], extension, isolated)).toBe(true);
});

test('Pi editor installation facts read only the exact existing production extension under the frozen agent home', async () => {
	const api = await import('./automation-hooks');
	expect(typeof api.installedPiEditorExtension).toBe('function');
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-pi-enrollment-'));
	try {
		const target = path.join(root, 'extensions', 'huhu-status.ts');
		await mkdir(path.dirname(target));
		expect(await api.installedPiEditorExtension({ PI_CODING_AGENT_DIR: root }, { deadline: performance.now() + 2000 })).toBeUndefined();
		await writeFile(target, 'export default () => {}');
		expect(await api.installedPiEditorExtension({ PI_CODING_AGENT_DIR: root }, { deadline: performance.now() + 2000 })).toBeUndefined();
		const { PI_EXTENSION } = await import('./native-extensions');
		await writeFile(target, PI_EXTENSION);
		// The fact is the canonical path (Windows temp may be spelled with an 8.3 short name).
		expect(await api.installedPiEditorExtension({ PI_CODING_AGENT_DIR: root }, { deadline: performance.now() + 2000 })).toBe(await realpath(target));
		expect(await api.installedPiEditorExtension({}, { deadline: performance.now() + 2000 })).toBeUndefined();
		expect(await readFile(target, 'utf8')).toBe(PI_EXTENSION);
	} finally { await rm(root, { recursive: true, force: true }); }
});

test('Pi installation lookup respects the current cancellation/deadline and rejects linked or non-file targets', async () => {
	const { installedPiEditorExtension } = await import('./automation-hooks');
	const { PI_EXTENSION } = await import('./native-extensions');
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-pi-facts-'));
	try {
		const target = path.join(root, 'extensions', 'huhu-status.ts');
		await mkdir(path.dirname(target)); await writeFile(target, PI_EXTENSION);
		const abort = new AbortController(); abort.abort();
		expect(await installedPiEditorExtension({ PI_CODING_AGENT_DIR: root }, { signal: abort.signal, deadline: performance.now() + 1000 })).toBeUndefined();
		expect(await installedPiEditorExtension({ PI_CODING_AGENT_DIR: root }, { deadline: performance.now() - 1 })).toBeUndefined();
		const fs = await import('node:fs/promises');
		await fs.rename(target, target + '.original'); await fs.symlink(target + '.original', target);
		expect(await installedPiEditorExtension({ PI_CODING_AGENT_DIR: root }, { deadline: performance.now() + 1000 })).toBeUndefined();
	} finally { await rm(root, { recursive: true, force: true }); }
});

test('the real Pi session-start fact proves idle after registration while blocking stays unknown', () => {
	const { session, consumer, close } = sessionActivityFixture();
	try {
		consumer.receive(nativeRow(1, undefined, 'AdapterStart'));
		expect(session.getActivitySnapshot()).toMatchObject({ state: 'unknown', blocking: { state: 'unknown' } });
		const started = nativeRow(2, undefined, 'SessionStart');
		consumer.receive({ ...started, source: { ...started.source!, event: 'session_start' } });
		expect(session.getActivitySnapshot()).toMatchObject({ state: 'idle', source: { health: 'current' }, blocking: { state: 'unknown' } });
	} finally { close(); }
});
