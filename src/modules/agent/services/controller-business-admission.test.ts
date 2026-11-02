import { expect, test, vi } from 'vitest';
import { AgentController, businessAwareHooks } from './controller';
import { SpaceError } from '../core/space/errors';
import type { RuntimeHooksPort } from '../core/workspace/managed-runtime';

vi.mock('electron', () => ({ shell: {}, webUtils: {} }));

test('a business runtime keeps the hook scope that carries its native answer; other runtimes keep managed hooks', async () => {
	const real = {
		prepareRuntimeHooks: vi.fn(async () => ({ env: { HUHU_HOOK_DIR: 'managed' }, close: async () => {} })),
	};
	const hooks = businessAwareHooks(new Set(['business']), () => real as unknown as RuntimeHooksPort);
	const request = (runtimeId: string) =>
		({ target: { spaceId: 's', sessionId: 'x', runtimeId }, env: {} }) as Parameters<
			RuntimeHooksPort['prepareRuntimeHooks']
		>[0];
	const binding = {} as Parameters<RuntimeHooksPort['prepareRuntimeHooks']>[1];
	expect((await hooks.prepareRuntimeHooks(request('business'), binding)).env).toEqual({});
	expect(real.prepareRuntimeHooks).not.toHaveBeenCalled();
	expect((await hooks.prepareRuntimeHooks(request('manual'), binding)).env).toEqual({ HUHU_HOOK_DIR: 'managed' });
});

function fixture() {
	const record = { id: 'session-1', spaceId: 'space-a', lastAttempt: { runtimeId: 'runtime-1' } };
	const runtime = { spaceId: 'space-a', sessionId: 'session-1', runtimeId: 'runtime-1' };
	const self = {
		stopped: false,
		businessRuntimes: new Set<string>(),
		spaces: {
			requireSpace: vi.fn(async (spaceId?: string) => {
				if (!spaceId) throw new SpaceError('TARGET_REQUIRED', 'space-required');
				if (spaceId === 'gone') throw new SpaceError('TARGET_NOT_FOUND', 'archived-space');
				return { id: spaceId };
			}),
			prepareSession: vi.fn(async () => ({
				record,
				runtimeId: 'runtime-1',
				cwd: '/space',
				beforeSpawn: async () => {},
			})),
		},
		sessions: {
			reserveManaged: vi.fn(() => runtime),
			get: vi.fn(() => undefined),
			failManaged: vi.fn(),
		},
	};
	const admit = (request: { spaceId: string; kind: 'agent' | 'shell'; title: string }, signal?: AbortSignal) =>
		(
			AgentController.prototype as unknown as {
				admitBusiness(
					this: unknown,
					request: unknown,
					signal?: AbortSignal,
				): Promise<{
					cwd: string;
					created(session: { connection: string; failureCause?: unknown }): void;
					abandon(cause?: unknown): void;
				}>;
			}
		).admitBusiness.call(self, request, signal);
	return { self, admit };
}

test('admission commits the Session in the named Space first and never chooses one', async () => {
	const f = fixture();
	const admission = await f.admit({ spaceId: 'space-a', kind: 'agent', title: 'Run' });
	expect(f.self.spaces.requireSpace).toHaveBeenCalledWith('space-a');
	expect(f.self.spaces.prepareSession).toHaveBeenCalledWith(
		'space-a',
		expect.objectContaining({ kind: 'agent', title: 'Run' }),
	);
	expect(f.self.sessions.reserveManaged.mock.invocationCallOrder[0]!).toBeGreaterThan(
		f.self.spaces.prepareSession.mock.invocationCallOrder[0]!,
	);
	expect(admission.cwd).toBe('/space');
	expect(f.self.businessRuntimes.has('runtime-1')).toBe(true);
	admission.created({ connection: 'connected' });
	expect(f.self.businessRuntimes.has('runtime-1')).toBe(false);
	expect(f.self.sessions.failManaged).not.toHaveBeenCalled();
});

test('a missing or archived Space rejects before any record or runtime exists', async () => {
	const f = fixture();
	await expect(f.admit({ spaceId: '', kind: 'agent', title: 'Run' })).rejects.toMatchObject({
		code: 'TARGET_REQUIRED',
	});
	await expect(f.admit({ spaceId: 'gone', kind: 'shell', title: 'Run' })).rejects.toMatchObject({
		code: 'TARGET_NOT_FOUND',
	});
	expect(f.self.spaces.prepareSession).not.toHaveBeenCalled();
	expect(f.self.sessions.reserveManaged).not.toHaveBeenCalled();
});

test('a failed or lost spawn, or an abandoned launch, settles the reserved runtime exactly as the interactive path does', async () => {
	const f = fixture();
	const admission = await f.admit({ spaceId: 'space-a', kind: 'agent', title: 'Run' });
	admission.created({ connection: 'failed', failureCause: new Error('spawn failed') });
	expect(f.self.sessions.failManaged).toHaveBeenCalledTimes(1);
	const lost = fixture();
	(await lost.admit({ spaceId: 'space-a', kind: 'agent', title: 'Run' })).created({ connection: 'disconnected' });
	expect(lost.self.sessions.failManaged).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({ code: 'EFFECT_UNKNOWN' }),
		false,
	);
	const cancelled = fixture();
	const abort = new AbortController();
	const pending = await cancelled.admit({ spaceId: 'space-a', kind: 'agent', title: 'Run' }, abort.signal);
	abort.abort();
	pending.abandon(new Error('aborted'));
	expect(cancelled.self.sessions.failManaged).toHaveBeenCalledWith(expect.anything(), undefined, true);
});
