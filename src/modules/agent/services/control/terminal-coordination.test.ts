import { expect, test, vi } from 'vitest';
import { TerminalSession } from '../terminal/session';
import {
	captureControlExecutionContext,
	terminalWaitOutcome,
	captureTerminalCoordination,
} from './terminal-coordination';

function fixture(onSource?: (source: import('../../core/workspace/managed-runtime').ActivitySourceBinding) => void) {
	const session = new TerminalSession({
		id: 'original-runtime',
		sid: 7,
		kind: 'agent',
		agentId: 'pi',
		title: 'Pi',
		cwd: '/fixture',
		cols: 80,
		rows: 24,
		scrollback: 100,
		platform: 'linux',
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const source = session.bindActivityRuntime().bindSource({
		provider: 'pi',
		kind: 'native-hook',
		adapterRevision: '1',
		lifetime: { kind: 'registration', sourceInstance: 'original' },
	})!;
	source.observe({ deliveryId: '1', sourceSequence: 1, event: 'registration', state: 'idle' });
	onSource?.(source);
	return session;
}

test('the first request capture freezes the original signal and monotonic deadline before admission awaits', async () => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
	const session = fixture();
	try {
		const controller = new AbortController();
		const context = captureControlExecutionContext(controller.signal, 100);
		expect(context.signal).toBe(controller.signal);
		await vi.advanceTimersByTimeAsync(70);
		const result = session.waitActivity({ state: 'done', context });
		const settled = vi.fn();
		void result.then(settled);
		await vi.advanceTimersByTimeAsync(30);
		expect(settled).toHaveBeenCalledWith(expect.objectContaining({ status: 'timeout' }));
	} finally {
		session.dispose();
		vi.useRealTimers();
	}
});

test.each(['timeout', 'cancel', 'source-lost'] as const)(
	'known PTY submission stays completed after wait %s, including an unknown abort reason',
	async (kind) => {
		const session = fixture();
		try {
			const target = { spaceId: 'original-space', sessionId: 'original-session', runtimeId: session.id };
			const controller = new AbortController();
			const wait = session.captureActivityWait({
				state: 'done',
				afterInput: true,
				context: captureControlExecutionContext(controller.signal, 1000),
			});
			wait.activate();
			if (kind === 'source-lost') session.invalidateActivity('transport-lost');
			else
				controller.abort(
					kind === 'timeout' ? { code: 'WAIT_TIMEOUT' } : { code: 'EFFECT_UNKNOWN', effect: 'unknown' },
				);
			const result = await wait.finished;
			const input = { runtimeId: session.id, op: 12, state: 'written' as const };
			const outcome = terminalWaitOutcome(target, result, input);
			expect(outcome).toMatchObject({
				target,
				phase: 'input-submitted',
				effect: 'completed',
				input,
				error:
					kind === 'source-lost'
						? 'SOURCE_UNAVAILABLE'
						: kind === 'timeout'
							? 'WAIT_TIMEOUT'
							: 'WAIT_CANCELLED',
			});
			expect(terminalWaitOutcome(target, result)).toMatchObject({ effect: 'none', phase: 'failed' });
		} finally {
			session.dispose();
		}
	},
);

test('a current state match is observation only and stale targets or another input runtime are refused', async () => {
	const session = fixture();
	try {
		const target = { spaceId: 'space', sessionId: 'session', runtimeId: session.id };
		const wait = await session.waitActivity({
			state: 'idle',
			context: captureControlExecutionContext(new AbortController().signal),
		});
		expect(terminalWaitOutcome(target, wait)).toMatchObject({ phase: 'state-matched', effect: 'none' });
		expect(() => terminalWaitOutcome({ ...target, runtimeId: 'another-runtime' }, wait)).toThrowError(
			'STALE_RUNTIME',
		);
		expect(() =>
			terminalWaitOutcome(target, wait, { runtimeId: 'another-runtime', op: 4, state: 'written' }),
		).toThrowError('STALE_RUNTIME');
	} finally {
		session.dispose();
	}
});

test.each([0, -1, NaN, Infinity, 1.5, 86_400_001])(
	'invalid observation budget %s is rejected at initial capture',
	(timeout) => {
		expect(() => captureControlExecutionContext(new AbortController().signal, timeout)).toThrowError(
			'INVALID_ARGUMENT',
		);
	},
);

test('prompt captures N before synchronous editor activity and retains the adapter receipt while matching only newer evidence', async () => {
	let source!: import('../../core/workspace/managed-runtime').ActivitySourceBinding;
	const session = fixture((value) => {
		source = value;
	});
	try {
		session.adopt(42);
		const submit = vi.fn(() => {
			source.observe({ deliveryId: '2', sourceSequence: 2, event: 'agent_start', state: 'working' });
			source.observe({ deliveryId: '3', sourceSequence: 3, event: 'agent_settled', state: 'done' });
			return {
				op: 9,
				queued: Promise.resolve({ op: 9, state: 'queued' as const }),
				finished: Promise.resolve({ op: 9, state: 'adapter-applied' as const, effect: 'completed' as const }),
				settled: new Promise<void>(() => {}),
				cancel() {},
			};
		});
		const registration = {
			sid: session.sid,
			editorId: 'editor',
			identity: { runtimeId: session.id },
			sourceInstance: 'original',
			provider: 'pi' as const,
			profileId: 'pi-1.4.0-jiti-2.7.0',
		};
		session.bindEditor({
			sid: session.sid,
			identity: registration.identity,
			active: true,
			ready: Promise.resolve(registration),
			closed: new Promise(() => {}),
			submit,
			close: async () => {},
		});
		await Promise.resolve();
		const target = { spaceId: 'space', sessionId: 'session', runtimeId: session.id };
		const command = captureTerminalCoordination(
			session,
			target,
			{
				protocolVersion: 1,
				requestId: 'one',
				operation: 'agent.prompt',
				target,
				params: { text: '中文\n任务', wait: 'done' },
			},
			captureControlExecutionContext(new AbortController().signal, 1000),
			() => target,
		);
		const progress = vi.fn();
		command.preflight();
		const result = await command.run(progress);
		expect(result).toMatchObject({
			phase: 'state-matched',
			effect: 'completed',
			data: {
				receipt: { kind: 'adapter-applied', op: 9 },
				initialWorking: false,
				wait: { status: 'matched', baseline: { at: { activitySequence: 2 } }, at: { activitySequence: 4 } },
			},
		});
		expect(progress).toHaveBeenCalledWith(
			expect.objectContaining({
				target,
				phase: 'input-submitted',
				effect: 'completed',
				data: expect.objectContaining({ receipt: { kind: 'adapter-applied', op: 9 } }),
			}),
		);
		expect(submit).toHaveBeenCalledOnce();
	} finally {
		session.dispose();
	}
});

test.each(['timeout', 'cancel', 'source-lost'] as const)(
	'adapter receipt remains completed after %s and never becomes PTY written',
	async (cause) => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
		const session = fixture();
		try {
			session.adopt(42);
			const submit = vi.fn(() => ({
				op: 13,
				queued: Promise.resolve({ op: 13, state: 'queued' as const }),
				finished: Promise.resolve({ op: 13, state: 'adapter-applied' as const, effect: 'completed' as const }),
				settled: new Promise<void>(() => {}),
				cancel() {},
			}));
			session.bindEditor({
				sid: session.sid,
				identity: { runtimeId: session.id },
				active: true,
				ready: Promise.resolve({
					sid: session.sid,
					editorId: 'editor',
					identity: { runtimeId: session.id },
					provider: 'pi',
					sourceInstance: 'original',
					profileId: 'pi-1.4.0-jiti-2.7.0',
				}),
				closed: new Promise(() => {}),
				submit,
				close: async () => {},
			});
			await Promise.resolve();
			const controller = new AbortController(),
				target = { spaceId: 'space', sessionId: 'session', runtimeId: session.id };
			const command = captureTerminalCoordination(
				session,
				target,
				{
					protocolVersion: 1,
					requestId: cause,
					operation: 'agent.prompt',
					target,
					params: { text: 'one', wait: 'done' },
				},
				captureControlExecutionContext(controller.signal, 100),
				() => target,
			);
			command.preflight();
			const progress = vi.fn(),
				running = command.run(progress);
			await vi.advanceTimersByTimeAsync(0);
			expect(progress).toHaveBeenCalledWith(
				expect.objectContaining({
					phase: 'input-submitted',
					effect: 'completed',
					data: expect.objectContaining({ receipt: { kind: 'adapter-applied', op: 13 } }),
				}),
			);
			if (cause === 'timeout') await vi.advanceTimersByTimeAsync(100);
			else if (cause === 'cancel') controller.abort();
			else session.invalidateActivity('transport-lost');
			expect(await running).toMatchObject({
				phase: 'input-submitted',
				effect: 'completed',
				receipt: { kind: 'adapter-applied', op: 13 },
				data: { receipt: { kind: 'adapter-applied', op: 13 } },
				error: {
					code:
						cause === 'timeout'
							? 'WAIT_TIMEOUT'
							: cause === 'cancel'
								? 'WAIT_CANCELLED'
								: 'SOURCE_UNAVAILABLE',
				},
			});
			expect(submit).toHaveBeenCalledOnce();
		} finally {
			session.dispose();
			vi.useRealTimers();
		}
	},
);

import { NATIVE_INPUT_LIMITS, type NativeInputFinishedResult } from '../../../../shared/native/input';
test('queued raw cancellation reports none only after the original input owner proves no write', async () => {
	const session = fixture(),
		controller = new AbortController();
	let finish!: (value: NativeInputFinishedResult) => void;
	const legacy = vi.fn(),
		queuedBody = vi.fn();
	const nativeFinished = new Promise<NativeInputFinishedResult>((resolve) => {
		finish = resolve;
	});
	const cancel = () => finish({ op: 11, state: 'none', reason: 'cancelled' });
	session.bindPort({
		inputAdmission: 1,
		inputLimits: NATIVE_INPUT_LIMITS,
		input: legacy,
		resize() {},
		acknowledge() {},
		end() {},
		submitInput: (_sid, body, options) => {
			queuedBody(body);
			options?.signal?.addEventListener('abort', cancel, { once: true });
			return { op: 11, queued: Promise.resolve({ op: 11, state: 'queued' }), finished: nativeFinished, cancel };
		},
	});
	session.adopt(42);
	try {
		const target = { spaceId: 'space', sessionId: 'session', runtimeId: session.id };
		const command = captureTerminalCoordination(
			session,
			target,
			{
				protocolVersion: 1,
				requestId: 'cancel',
				operation: 'terminal.send-text',
				target,
				params: { text: 'paste only' },
			},
			captureControlExecutionContext(controller.signal, 1000),
			() => target,
		);
		command.preflight();
		const running = command.run(() => {});
		controller.abort();
		expect(await running).toMatchObject({
			effect: 'none',
			error: { code: 'WAIT_CANCELLED' },
			data: { input: { state: 'none', op: 11 } },
		});
		expect(queuedBody).toHaveBeenCalledExactlyOnceWith('paste only');
		expect(legacy).not.toHaveBeenCalled();
	} finally {
		controller.signal.removeEventListener('abort', cancel);
		session.dispose();
	}
});

test('the complete CLI body envelope is limited before any input, and invalid named keys never enter the writer', async () => {
	const session = fixture(),
		input = vi.fn();
	session.bindPort({
		inputAdmission: 1,
		inputLimits: NATIVE_INPUT_LIMITS,
		input() {},
		resize() {},
		acknowledge() {},
		end() {},
		submitInput: input,
	});
	session.adopt(42);
	try {
		const target = { spaceId: 'space', sessionId: 'session', runtimeId: session.id },
			context = captureControlExecutionContext(new AbortController().signal);
		expect(() =>
			captureTerminalCoordination(
				session,
				target,
				{
					protocolVersion: 1,
					requestId: 'large',
					operation: 'terminal.send-text',
					target,
					params: { text: 'x'.repeat(32768) },
				},
				context,
				() => target,
			),
		).toThrowError(expect.objectContaining({ code: 'CAPACITY_EXCEEDED' }));
		const invalid = captureTerminalCoordination(
			session,
			target,
			{
				protocolVersion: 1,
				requestId: 'keys',
				operation: 'terminal.send-keys',
				target,
				params: { keys: 'Enter UnknownKey' },
			},
			context,
			() => target,
		);
		invalid.preflight();
		expect(await invalid.run(() => {})).toMatchObject({ effect: 'none', error: { code: 'INVALID_ARGUMENT' } });
		expect(input).not.toHaveBeenCalled();
	} finally {
		session.dispose();
	}
});
