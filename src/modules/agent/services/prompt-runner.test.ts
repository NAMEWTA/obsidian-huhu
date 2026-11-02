import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import type { AgentRunContextProvider } from '../api';
import type { AgentRunHandle } from '../../../shared/automation/types';
import type { AgentExecution } from './agent-runtime';
import { PromptRunner, submitInteractivePrompt } from './prompt-runner';
import { TerminalSession } from './terminal/session';
import { NATIVE_INPUT_LIMITS } from '../../../shared/native/input';

const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
};
const clock = {
	setTimeout: (fn: () => void, ms: number) => Number(setTimeout(fn, ms)),
	clearTimeout: (id: number) => clearTimeout(id),
};
afterEach(() => vi.useRealTimers());

test('an interactive prompt rejected as a whole never sends a separate carriage return', async () => {
	const calls: Array<string | Uint8Array> = [];
	const session = new TerminalSession({
		id: 'prompt-runtime',
		sid: 7,
		kind: 'agent',
		agentId: 'codex',
		title: 'Prompt',
		cwd: '/fixture',
		cols: 80,
		rows: 24,
		scrollback: 100,
		platform: 'linux',
		colors: () => ({ foreground: '#cccccc', background: '#111111', cursor: '#ffffff' }),
	});
	session.attach(
		{
			inputAdmission: 1,
			inputLimits: NATIVE_INPUT_LIMITS,
			input: () => assert.fail('legacy write'),
			resize: () => undefined,
			acknowledge: () => undefined,
			end: () => undefined,
			submitInput: (_sid, data) => {
				calls.push(data);
				const result = { op: 1, state: 'none', reason: 'capacity' } as const;
				return {
					op: 1,
					queued: Promise.resolve(result),
					finished: Promise.resolve(result),
					cancel: () => undefined,
				};
			},
		},
		1234,
	);
	try {
		session.receive(new TextEncoder().encode('\x1b[?2004h'));
		await session.whenParsed();
		const result = await submitInteractivePrompt(session, 'whole prompt', clock);
		assert.equal(calls.length, 1);
		assert.equal(calls[0], '\x1b[200~whole prompt\x1b[201~\r');
		assert.equal((result as unknown as { status: string }).status, 'none');
	} finally {
		session.dispose();
	}
});

test('interactive quick prompts wait for readiness and never submit to an unready agent', async () => {
	vi.useFakeTimers();
	let ready = false;
	const writes: string[] = [];
	const target = {
		running: true,
		inputReady: () => ready,
		prompts: () => ({ lines: [] }),
		submitPaste: (text: string, options?: { appendEnter?: boolean }) => {
			writes.push(text + (options?.appendEnter ? '\r' : ''));
			return {
				runtimeId: 'prompt',
				op: 1,
				queued: Promise.resolve({ op: 1, state: 'queued' as const }),
				finished: Promise.resolve({ op: 1, state: 'written' as const }),
				cancel: () => undefined,
			};
		},
	};
	const first = submitInteractivePrompt(target, 'prompt', clock);
	await vi.advanceTimersByTimeAsync(200);
	assert.deepEqual(writes, []);
	ready = true;
	await vi.advanceTimersByTimeAsync(100);
	assert.equal((await first).status, 'queued');
	assert.deepEqual(writes, ['prompt\r']);
	ready = false;
	writes.length = 0;
	const timeout = submitInteractivePrompt(target, 'unsafe', clock, true, 200);
	await vi.advanceTimersByTimeAsync(200);
	assert.equal((await timeout).status, 'not-ready');
	assert.deepEqual(writes, []);
	const closing = submitInteractivePrompt(target, 'late', clock);
	target.running = false;
	await vi.advanceTimersByTimeAsync(100);
	assert.equal((await closing).status, 'not-ready');
	assert.equal(vi.getTimerCount(), 0);
});

function fixture(providers: readonly AgentRunContextProvider[] = []) {
	const actions: Array<Parameters<ConstructorParameters<typeof PromptRunner>[0]['execute']>[0]> = [];
	const complete = deferred<Awaited<AgentRunHandle['completion']>>();
	const entered = deferred<AgentExecution>();
	const env: Record<string, string>[] = [];
	const stopped: string[] = [];
	const opened: string[] = [];
	let calls = 0;
	const runner = new PromptRunner(
		{
			listAgents: () => [{ id: 'codex', title: 'Codex', enabled: true, installed: true }],
			execute: async (action, execution) => {
				calls++;
				actions.push(action);
				if (execution.resolveContext) env.push(await execution.resolveContext('C:/vault/canonical'));
				execution.signal?.throwIfAborted();
				execution.onTerminal?.('owned');
				entered.resolve(execution);
				return { terminalId: 'owned', completion: complete.promise };
			},
			stop: async (id) => {
				stopped.push(id);
			},
			open: async (id) => {
				opened.push(id);
			},
		},
		async () => providers,
		clock,
	);
	return { runner, complete, entered, env, stopped, opened, actions, calls: () => calls };
}

test('complete native answer and usage survive; short-lived context is revoked even with a retained terminal', async () => {
	const disposed = vi.fn();
	const resolve = vi.fn(async (_handle, run) => {
		assert.equal(run.cwd, 'C:/vault/canonical');
		assert.ok(run.runId);
		return { env: { FIXTURE_CONTEXT_TOKEN: 'one-run-secret' }, dispose: disposed };
	});
	const f = fixture([{ id: 'fixture', resolve }]);
	const answer = JSON.stringify(Array.from({ length: 3000 }, (_, id) => ({ id, text: '完整回答' })));
	const work = f.runner.run({
		prompt: 'score',
		spaceId: 'space-a', purpose: 'automation',
		runContext: { provider: 'fixture', handle: 'opaque' },
		keepTerminal: true,
	});
	await f.entered.promise;
	const usage = { input: 10, output: 20, cacheRead: 2, cacheWrite: 0, cost: null, known: true };
	f.complete.resolve({ status: 'succeeded', message: answer, output: '\x1b[31mnot an answer', usage });
	const result = await work;
	assert.equal(result.text, answer);
	assert.deepEqual(result.usage, usage);
	assert.ok(!JSON.stringify(result).includes('one-run-secret'));
	assert.equal(disposed.mock.calls.length, 1);
	assert.deepEqual(f.stopped, []);
	assert.equal(
		(await f.runner.run({ prompt: 'again', spaceId: 'space-a', purpose: 'automation', continueTerminalId: 'owned' })).errorCode,
		'runContextInvalid',
	);
	assert.equal(f.calls(), 1, 'a revoked contextual process cannot receive another prompt');
	await f.runner.open('manual');
	await f.runner.open('owned');
	assert.deepEqual(f.opened, ['owned']);
	await f.runner.dispose();
	assert.deepEqual(f.stopped, ['owned']);
	assert.equal(disposed.mock.calls.length, 1);
});

test('permission state opens the owned terminal; cancellation and module disable finish and stop only owned work', async () => {
	const disposed = vi.fn();
	const f = fixture([
		{ id: 'fixture', resolve: async () => ({ env: { FIXTURE_CONTEXT_TOKEN: 'secret' }, dispose: disposed }) },
	]);
	const controller = new AbortController();
	const states: string[] = [];
	const work = f.runner.run({
		prompt: 'run',
		spaceId: 'space-a', purpose: 'automation',
		signal: controller.signal,
		runContext: { provider: 'fixture', handle: 'h' },
		onState: (state) => states.push(state.status),
	});
	const execution = await f.entered.promise;
	execution.onState?.('running', 'owned');
	execution.onState?.('needs-attention', 'owned');
	await f.runner.open('owned');
	controller.abort();
	assert.equal((await work).status, 'cancelled');
	assert.deepEqual(states, ['needs-attention', 'running', 'needs-attention']);
	assert.deepEqual(f.stopped, ['owned']);
	assert.equal(disposed.mock.calls.length, 1);
	const g = fixture();
	const disabled = g.runner.run({ prompt: 'run', spaceId: 'space-a', purpose: 'automation' });
	await g.entered.promise;
	await g.runner.dispose();
	assert.equal((await disabled).status, 'interrupted');
	assert.deepEqual(g.stopped, ['owned']);
});

test('timeout also covers pending context resolution; a late grant is revoked and cannot start a terminal', async () => {
	vi.useFakeTimers();
	const lease = deferred<{ env: Record<string, string>; dispose(): void }>();
	const requested = deferred<void>();
	const disposed = vi.fn();
	const f = fixture([
		{
			id: 'fixture',
			resolve: async () => {
				requested.resolve();
				return lease.promise;
			},
		},
	]);
	const work = f.runner.run({
		prompt: 'run',
		spaceId: 'space-a', purpose: 'automation',
		timeoutMs: 50,
		runContext: { provider: 'fixture', handle: 'h' },
	});
	await requested.promise;
	await vi.advanceTimersByTimeAsync(51);
	assert.equal((await work).status, 'timeout');
	lease.resolve({ env: { FIXTURE_CONTEXT_TOKEN: 'late-secret' }, dispose: disposed });
	await vi.advanceTimersByTimeAsync(1);
	assert.equal(disposed.mock.calls.length, 1);
	assert.deepEqual(f.stopped, []);
	assert.deepEqual(f.env, []);
});

test('absent or invalid context fails before spawning, and a native failure never returns terminal output', async () => {
	const absent = fixture();
	assert.equal(
		(await absent.runner.run({ prompt: 'run', spaceId: 'space-a', purpose: 'automation', continueTerminalId: 'manual' })).errorCode,
		'sessionMissing',
	);
	assert.equal(
		(
			await absent.runner.run({
				prompt: 'run',
				spaceId: 'space-a', purpose: 'automation',
				runContext: { provider: 'missing', handle: 'h' },
			})
		).errorCode,
		'runContextUnavailable',
	);
	assert.equal(absent.calls(), 0);
	const invalid = fixture([{ id: 'fixture', resolve: async () => undefined }]);
	assert.equal(
		(
			await invalid.runner.run({
				prompt: 'run',
				spaceId: 'space-a', purpose: 'automation',
				runContext: { provider: 'fixture', handle: 'used' },
			})
		).errorCode,
		'runContextInvalid',
	);
	assert.deepEqual(invalid.env, []);
	const f = fixture();
	const work = f.runner.run({ prompt: 'run', spaceId: 'space-a', purpose: 'automation' });
	await f.entered.promise;
	f.complete.resolve({ status: 'failed', message: 'partial', output: 'screen tail', errorCode: 'answerTooLarge' });
	assert.deepEqual(await work, {
		status: 'failed',
		text: '',
		terminalId: 'owned',
		usage: undefined,
		errorCode: 'answerTooLarge',
	});
	assert.deepEqual(f.stopped, ['owned']);
});

test('module disposal waits for the active grant to be revoked', async () => {
	const release = deferred<void>();
	const releasing = deferred<void>();
	const f = fixture([
		{
			id: 'fixture',
			resolve: async () => ({
				env: {},
				dispose: async () => {
					releasing.resolve();
					await release.promise;
				},
			}),
		},
	]);
	const work = f.runner.run({
		prompt: 'run',
		spaceId: 'space-a', purpose: 'automation',
		runContext: { provider: 'fixture', handle: 'h' },
	});
	await f.entered.promise;
	let done = false;
	const disposal = f.runner.dispose().then(() => {
		done = true;
	});
	await releasing.promise;
	assert.equal(done, false);
	release.resolve();
	await disposal;
	assert.equal((await work).status, 'interrupted');
	assert.equal(done, true);
});

test('a prompt run is bound to its explicit Space and never starts without one', async () => {
	const missing = fixture();
	for (const spaceId of [undefined, '', 7 as unknown as string]) {
		const result = await missing.runner.run({ prompt: 'run', purpose: 'automation', spaceId: spaceId as string });
		assert.deepEqual(result, { status: 'failed', text: '', errorCode: 'spaceRequired' });
	}
	assert.equal(missing.calls(), 0, 'no runtime was asked to start');
	const bound = fixture();
	const work = bound.runner.run({ prompt: 'run', purpose: 'automation', spaceId: 'space-b', cwd: '/space-b/sub' });
	await bound.entered.promise;
	bound.complete.resolve({ status: 'succeeded', message: 'native answer' });
	assert.equal((await work).text, 'native answer');
	assert.equal(bound.actions.length, 1);
	assert.equal(bound.actions[0]!.spaceId, 'space-b');
	assert.equal(bound.actions[0]!.cwd, '/space-b/sub');
	const defaulted = fixture();
	const second = defaulted.runner.run({ prompt: 'run', purpose: 'automation', spaceId: 'space-a' });
	await defaulted.entered.promise;
	defaulted.complete.resolve({ status: 'succeeded', message: 'ok' });
	await second;
	assert.equal(defaulted.actions[0]!.cwd, '', 'no cwd means the Space directory, never the vault root');
});
