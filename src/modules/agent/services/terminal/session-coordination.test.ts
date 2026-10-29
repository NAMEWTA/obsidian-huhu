import { expect, test, vi } from 'vitest';
import { TerminalSession } from './session';
import { ACTIVITY_LIMITS } from '../../core/workspace/managed-runtime';
import type {
	NativeEditorBinding,
	NativeEditorRegistration,
	NativeEditorInputOptions,
} from '../../../../shared/native/input';
import { NATIVE_INPUT_LIMITS } from '../../../../shared/native/input';

function fixture() {
	const session = new TerminalSession({
		id: 'captured-runtime',
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
	const runtime = session.bindActivityRuntime();
	const source = runtime.bindSource({
		provider: 'pi',
		kind: 'native-hook',
		adapterRevision: '1',
		lifetime: { kind: 'registration', sourceInstance: 'original' },
	})!;
	let sequence = 0;
	const observe = (state: 'idle' | 'working' | 'done' = 'idle') =>
		source.observe({
			deliveryId: String(++sequence),
			sourceSequence: sequence,
			event: sequence === 1 ? 'registration' : state === 'done' ? 'agent_settled' : 'agent_start',
			state,
		});
	observe();
	return { session, runtime, source, observe };
}

test('independent wait immediately matches current evidence without changing seen state', async () => {
	const { session } = fixture();
	try {
		const before = session.getActivitySnapshot();
		const result = await session.waitActivity({
			state: 'idle',
			context: {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			},
		});
		expect(result.status).toBe('matched');
		expect(result.at).toEqual(before.at);
		expect(result.baseline.initialWorking).toBe(false);
		expect(session.getActivitySnapshot()).toBe(before);
	} finally {
		session.dispose();
	}
});

test('input observation reserves before submission, ignores old idle and keeps only the latest fact until activated', async () => {
	const { session, observe } = fixture();
	const settled = vi.fn();
	try {
		const wait = session.captureActivityWait({
			state: 'idle',
			afterInput: true,
			context: {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			},
		});
		void wait.finished.then(settled);
		session.markActivitySeen(session.getActivitySnapshot().at);
		await Promise.resolve();
		expect(settled).not.toHaveBeenCalled();
		wait.activate();
		await Promise.resolve();
		expect(settled).not.toHaveBeenCalled();
		observe('idle');
		expect((await wait.finished).status).toBe('matched');
		const next = session.captureActivityWait({
			state: 'idle',
			afterInput: true,
			context: {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			},
		});
		const nextSettled = vi.fn();
		void next.finished.then(nextSettled);
		observe('idle');
		observe('working');
		next.activate();
		await Promise.resolve();
		expect(nextSettled).not.toHaveBeenCalled();
		observe('idle');
		expect((await next.finished).at.activitySequence).toBeGreaterThan(next.baseline.at.activitySequence);
	} finally {
		session.dispose();
	}
});

test.each([
	'transport-lost',
	'runtime-ended',
	'stop-requested',
	'program-changed',
	'closed',
	'source-mismatch',
] as const)('%s revokes observation before an ordinary unknown condition can match', async (reason) => {
	const { session, runtime } = fixture();
	try {
		const wait = session.captureActivityWait({
			state: 'unknown',
			afterInput: true,
			context: {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			},
		});
		runtime.invalidate(reason);
		wait.activate();
		expect(await wait.finished).toMatchObject({ status: 'unavailable', reason });
	} finally {
		session.dispose();
	}
});

test('a replacement or ambiguous source cannot retarget the captured wait', async () => {
	const { session, runtime } = fixture();
	try {
		const wait = session.captureActivityWait({
			state: 'unknown',
			afterInput: true,
			context: {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			},
		});
		runtime.bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'replacement' },
		});
		wait.activate();
		expect(await wait.finished).toMatchObject({ status: 'unavailable', reason: 'source-changed' });
	} finally {
		session.dispose();
	}
});

test('waiting shares all 32 listener slots with other Session observers and releases its slot on cancellation', async () => {
	const { session } = fixture();
	const joins = Array.from({ length: ACTIVITY_LIMITS.listeners - 1 }, () => session.observeActivity(() => {}));
	const controller = new AbortController();
	try {
		const wait = session.captureActivityWait({
			state: 'done',
			afterInput: true,
			context: { signal: controller.signal, deadline: performance.now() + 1000 },
		});
		expect(() =>
			session.captureActivityWait({
				state: 'done',
				afterInput: true,
				context: { signal: controller.signal, deadline: performance.now() + 1000 },
			}),
		).toThrowError('CAPACITY_EXCEEDED');
		controller.abort();
		expect((await wait.finished).status).toBe('cancelled');
		const available = session.observeActivity(() => {});
		available.dispose();
		expect(() => session.observeActivity(() => {}).dispose()).not.toThrow();
	} finally {
		joins.forEach((join) => join.dispose());
		session.dispose();
	}
});

test('synchronous activity emitted by an earlier subscriber cannot hide a runtime fence', async () => {
	const { session, runtime, observe } = fixture();
	const older = session.observeActivity((value) => {
		if (value.state === 'done') runtime.invalidate('runtime-ended');
	});
	try {
		const wait = session.captureActivityWait({
			state: 'done',
			context: {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			},
		});
		observe('done');
		expect(await wait.finished).toMatchObject({ status: 'unavailable', reason: 'runtime-ended' });
	} finally {
		older.dispose();
		session.dispose();
	}
});

test('initial working and the original watermark survive a new observation deadline', async () => {
	const { session, observe } = fixture();
	try {
		observe('working');
		const first = session.captureActivityWait({
			state: 'idle',
			afterInput: true,
			context: {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			},
		});
		expect(first.baseline.initialWorking).toBe(true);
		first.dispose();
		expect((await first.finished).status).toBe('cancelled');
		observe('idle');
		const continued = await session.waitActivity({
			state: 'idle',
			after: first.baseline,
			context: {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			},
		});
		expect(continued).toMatchObject({ status: 'matched', baseline: first.baseline });
	} finally {
		session.dispose();
	}
});

test.each(['cancel', 'typed-timeout', 'deadline'] as const)(
	'%s releases only observation while the original runtime remains active',
	async (kind) => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
		const { session, runtime, observe } = fixture();
		const controller = new AbortController();
		try {
			const wait = session.captureActivityWait({
				state: 'done',
				context: {
					signal: controller.signal,
					deadline: performance.now() + 100,
				},
			});
			if (kind === 'deadline') await vi.advanceTimersByTimeAsync(100);
			else controller.abort(kind === 'typed-timeout' ? { code: 'WAIT_TIMEOUT' } : new Error('cancel'));
			expect((await wait.finished).status).toBe(kind === 'cancel' ? 'cancelled' : 'timeout');
			expect(runtime.active()).toBe(true);
			observe('done');
			expect(session.getActivitySnapshot().state).toBe('done');
			expect(vi.getTimerCount()).toBe(1); // The original source freshness timer remains owned by Session.
		} finally {
			session.dispose();
			expect(vi.getTimerCount()).toBe(0);
			vi.useRealTimers();
		}
	},
);

test('already cancelled and invalid states cannot become current matches', async () => {
	const { session } = fixture();
	try {
		const controller = new AbortController();
		controller.abort();
		expect(
			(
				await session.waitActivity({
					state: 'idle',
					context: {
						signal: controller.signal,
						deadline: performance.now() + 1000,
					},
				})
			).status,
		).toBe('cancelled');
		expect(() =>
			session.captureActivityWait({
				state: 'ready' as 'idle',
				context: {
					signal: new AbortController().signal,
					deadline: performance.now() + 1000,
				},
			}),
		).toThrowError('INVALID_ARGUMENT');
	} finally {
		session.dispose();
	}
});

test('raw named keys are one original Session input operation using the live terminal modes', async () => {
	const { session } = fixture();
	const writes: Array<string | Uint8Array> = [];
	session.attach(
		{
			inputAdmission: 1,
			inputLimits: NATIVE_INPUT_LIMITS,
			input() {
				throw new Error('A second writer must not be used');
			},
			resize() {},
			acknowledge() {},
			end() {},
			submitInput(_sid, data) {
				writes.push(data);
				return {
					op: writes.length,
					queued: Promise.resolve({ op: writes.length, state: 'queued' }),
					finished: Promise.resolve({ op: writes.length, state: 'written' }),
					cancel() {},
				};
			},
		},
		42,
	);
	try {
		expect(await session.submitKeys('Ctrl+C Enter').finished).toEqual({ op: 1, state: 'written' });
		expect(writes).toEqual(['\x03\r']);
		session.receive(new TextEncoder().encode('\x1b[?1h'));
		await session.whenParsed();
		await session.submitKeys('ArrowUp').finished;
		expect(writes[1]).toBe('\x1bOA');
		session.receive(new TextEncoder().encode('\x1b[>1u'));
		await session.whenParsed();
		await session.submitKeys('Shift+Enter').finished;
		expect(writes[2]).toBe('\x1b[13;2u');
		expect(() => session.submitKeys('Enter Unknown')).toThrowError('INVALID_ARGUMENT');
		expect(writes).toHaveLength(3);
		await session.submitPaste('material').finished;
		expect(writes[3]).toBe('material');
	} finally {
		session.dispose();
	}
});

test('explicit unknown can match absent or expired evidence, while current done is never an idle alias', async () => {
	const { session, source, observe } = fixture();
	try {
		source.invalidate('expired');
		expect(
			await session.waitActivity({
				state: 'unknown',
				context: {
					signal: new AbortController().signal,
					deadline: performance.now() + 1000,
				},
			}),
		).toMatchObject({ status: 'matched', state: 'unknown', source: { reason: 'expired' } });
		observe('done');
		const controller = new AbortController();
		const wait = session.captureActivityWait({
			state: 'idle',
			context: {
				signal: controller.signal,
				deadline: performance.now() + 1000,
			},
		});
		const settled = vi.fn();
		void wait.finished.then(settled);
		await Promise.resolve();
		expect(settled).not.toHaveBeenCalled();
		controller.abort();
		await wait.finished;
	} finally {
		session.dispose();
	}
});

test('an explicitly awaited blocking fact is matched as blocked without inferring model success', async () => {
	const { session, source } = fixture();
	try {
		source.observe({
			deliveryId: '2',
			sourceSequence: 2,
			event: 'permission_prompt',
			state: 'permission',
			blocking: { state: 'blocked', reason: 'permission', blockId: 'original-block' },
		});
		expect(
			await session.waitActivity({
				state: 'blocked',
				context: {
					signal: new AbortController().signal,
					deadline: performance.now() + 1000,
				},
			}),
		).toMatchObject({
			status: 'matched',
			condition: 'blocked',
			state: 'permission',
			blocking: { state: 'blocked', reason: 'permission' },
		});
	} finally {
		session.dispose();
	}
});

function editorFixture(session: TerminalSession) {
	let ready!: (value: NativeEditorRegistration) => void;
	let closed!: () => void;
	const submit = vi.fn((_text: string | Uint8Array, _options: NativeEditorInputOptions) => ({
		op: 5,
		queued: Promise.resolve({ op: 5, state: 'queued' as const }),
		finished: Promise.resolve({ op: 5, state: 'adapter-applied' as const, effect: 'completed' as const }),
		settled: Promise.resolve(),
		cancel() {},
	}));
	const binding: NativeEditorBinding = {
		sid: session.sid,
		identity: { runtimeId: session.id },
		active: true,
		ready: new Promise((resolve) => {
			ready = resolve;
		}),
		closed: new Promise<void>((resolve) => {
			closed = resolve;
		}).then(() => ({ reason: 'transport-lost' as const })),
		submit,
		close: async () => {},
	};
	return {
		binding,
		submit,
		closed: () => closed(),
		ready: (sourceInstance = 'original') =>
			ready({
				sid: session.sid,
				editorId: 'editor',
				identity: binding.identity,
				sourceInstance,
				provider: 'pi',
				profileId: 'pi-1.4.0-jiti-2.7.0',
			}),
	};
}

test('editor readiness joins only the exact actual hook registration', async () => {
	const { session, source } = fixture();
	try {
		session.adopt(42);
		source.observe({
			deliveryId: 'blocked',
			sourceSequence: 2,
			event: 'ui_prompt_begin',
			state: 'waiting',
			blocking: { state: 'blocked', reason: 'question', blockId: 'clear' },
		});
		source.observe({
			deliveryId: 'clear',
			sourceSequence: 3,
			event: 'ui_prompt_end',
			state: 'idle',
			blocking: { state: 'clear', blockId: 'clear' },
		});
		const editor = editorFixture(session);
		session.bindEditor(editor.binding);
		expect(session.getEditorReadiness().status).toBe('not-ready');
		editor.ready();
		await Promise.resolve();
		expect(session.getEditorReadiness()).toMatchObject({
			status: 'ready',
			sourceInstance: 'original',
			bindingId: source.bindingId,
			programEpoch: source.programEpoch,
		});
	} finally {
		session.dispose();
	}
});

test('startup and working with no T06 blocking facts use one original editor submit and preserve unknown blocking', async () => {
	const { session, observe } = fixture();
	try {
		session.adopt(42);
		const editor = editorFixture(session);
		session.bindEditor(editor.binding);
		editor.ready();
		await Promise.resolve();
		for (const state of ['idle', 'working'] as const) {
			if (state === 'working') observe('working');
			expect(session.getActivitySnapshot().blocking.state).toBe('unknown');
			const submission = session.submitPrompt('中文\nsecond line', {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			});
			expect(await submission.finished).toEqual({ op: 5, state: 'adapter-applied', effect: 'completed' });
		}
		expect(editor.submit).toHaveBeenCalledTimes(2);
		expect(editor.submit.mock.calls[0]?.[0]).toBe('中文\nsecond line');
		expect(editor.submit.mock.calls[0]?.[1]).toMatchObject({ sourceInstance: 'original' });
	} finally {
		session.dispose();
	}
});

test('a closed original editor cannot be revived by its late registration', async () => {
	const { session } = fixture();
	try {
		session.adopt(42);
		const editor = editorFixture(session);
		session.bindEditor(editor.binding);
		editor.closed();
		await Promise.resolve();
		await Promise.resolve();
		editor.ready();
		await Promise.resolve();
		expect(session.getEditorReadiness().status).toBe('not-ready');
		expect(() =>
			session.submitPrompt('no input', {
				signal: new AbortController().signal,
				deadline: performance.now() + 1000,
			}),
		).toThrow();
		expect(editor.submit).not.toHaveBeenCalled();
	} finally {
		session.dispose();
	}
});

test('native editor registration may arrive before its actual hook source without guessing a binding', async () => {
	const session = new TerminalSession({
		id: 'captured-runtime',
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
	try {
		session.adopt(42);
		const editor = editorFixture(session);
		session.bindEditor(editor.binding);
		editor.ready();
		await Promise.resolve();
		expect(session.getEditorReadiness().status).toBe('not-ready');
		const source = session
			.bindActivityRuntime()
			.bindSource({
				provider: 'pi',
				kind: 'native-hook',
				adapterRevision: '1',
				lifetime: { kind: 'registration', sourceInstance: 'original' },
			})!;
		source.observe({ deliveryId: 'hook', sourceSequence: 1, event: 'session_start', state: 'idle' });
		expect(session.getEditorReadiness()).toMatchObject({
			status: 'ready',
			bindingId: source.bindingId,
			programEpoch: source.programEpoch,
		});
	} finally {
		session.dispose();
	}
});

test.each(['blocked', 'unknown', 'source-expired', 'source-replaced', 'wrong-registration'] as const)(
	'ordinary prompt rejects %s with zero native editor input',
	async (cause) => {
		const { session, source, runtime } = fixture();
		try {
			session.adopt(42);
			const editor = editorFixture(session);
			session.bindEditor(editor.binding);
			editor.ready(cause === 'wrong-registration' ? 'another-registration' : 'original');
			await Promise.resolve();
			if (cause === 'blocked')
				source.observe({
					deliveryId: 'block',
					sourceSequence: 2,
					event: 'ui_prompt_begin',
					state: 'permission',
					blocking: { state: 'blocked', reason: 'permission', blockId: 'approval' },
				});
			if (cause === 'unknown')
				source.observe({ deliveryId: 'unknown', sourceSequence: 2, event: 'native_unknown', state: 'unknown' });
			if (cause === 'source-expired') source.invalidate('expired');
			if (cause === 'source-replaced') {
				const replacement = runtime.bindSource({
					provider: 'pi',
					kind: 'native-hook',
					adapterRevision: '1',
					lifetime: { kind: 'registration', sourceInstance: 'reload' },
				})!;
				replacement.observe({ deliveryId: 'reload', sourceSequence: 1, event: 'registration', state: 'idle' });
			}
			expect(session.getEditorReadiness().status).not.toBe('ready');
			expect(() =>
				session.submitPrompt('never entered', {
					signal: new AbortController().signal,
					deadline: performance.now() + 1000,
				}),
			).toThrow();
			expect(editor.submit).not.toHaveBeenCalled();
		} finally {
			session.dispose();
		}
	},
);
