import { expect, test, vi } from 'vitest';
import type { NativeEvents, NativeLease, NativeTransport } from '../../../shared/native/host';
import { NativeReplyError, NativeSpawnError, NativeShutdownError, NativeReleaseError, type NativeHelperTermination } from '../../../shared/native/host';
import { NativeHost } from './host';

const helperOutcome = (state: NativeHelperTermination['state']): Readonly<NativeHelperTermination> => Object.freeze({ state, code: state === 'exited' ? 1 : null, signal: null, forced: false, stdioClosed: state !== 'unconfirmed', diagnostic: 'controlled cleanup failure' });

test('only the last owner observes shutdown failure; confirmed gone permits the next explicit acquire and old releases retain their error', async () => {
	const outcome = helperOutcome('exited'), failure = new NativeShutdownError('cleanup failed', outcome, Promise.resolve(outcome));
	let starts = 0, disposals = 0;
	const host = new NativeHost(async events => {
		const helper = transport(events), original = helper.dispose, index = ++starts;
		return { ...helper, dispose: async () => { disposals++;await original();if (index === 1) throw failure; } };
	});
	const pty = await host.acquire('pty'), cookies = await host.acquire('cookies');
	await pty.release();expect(disposals).toBe(0);await expect(cookies.value.request('cookies', 'read', {})).resolves.toBeDefined();
	const release = cookies.release();expect(cookies.release()).toBe(release);await expect(release).rejects.toBe(failure);
	const next = await host.acquire('history');expect(starts).toBe(2);
	await expect(cookies.release()).rejects.toBe(failure);await expect(next.value.history('scan', {})).resolves.toEqual({ rows: [{ name: 'cookie' }] });
	await next.release();await host.dispose();expect(disposals).toBe(2);
});

test('unconfirmed shutdown blocks a second helper until its late physical fence, without automatic restart or cross-generation retirement', async () => {
	const gone = deferred<Readonly<NativeHelperTermination>>(), failure = new NativeShutdownError('exit unconfirmed', helperOutcome('unconfirmed'), gone.promise);
	const callbacks: NativeEvents[] = [];let starts = 0;
	const host = new NativeHost(async events => {
		callbacks.push(events);const helper = transport(events), original = helper.dispose, index = ++starts;
		return { ...helper, dispose: async () => { await original();if (index === 1) throw failure; } };
	});
	const first = await host.acquire('cookies'), release = first.release();
	await expect(release).rejects.toBe(failure);await expect(host.acquire('history')).rejects.toBe(failure);expect(starts).toBe(1);
	gone.resolve(helperOutcome('exited'));await Promise.resolve();await Promise.resolve();expect(starts).toBe(1);
	const next = await host.acquire('cookies');expect(starts).toBe(2);
	callbacks[0]!.closed('late old callback');await expect(first.release()).rejects.toBe(failure);
	await expect(next.value.request('cookies', 'read', {})).resolves.toBeDefined();expect(starts).toBe(2);
	await next.release();await host.dispose();
});

test('Host disposal retains original PTY outcomes and shutdown error, with one repeated observable settlement', async () => {
	const outcome = helperOutcome('exited'), cleanup = new NativeShutdownError('cleanup failure', outcome, Promise.resolve(outcome));
	const stop = new Error('original stop failure');let disposals = 0;
	const host = new NativeHost(async events => {
		const helper = transport(events), original = helper.dispose;
		return { ...helper, requestStop() { throw stop; }, dispose: async () => { disposals++;await original();throw cleanup; } };
	});
	const lease = await host.acquire('pty'), sid = lease.allocateSessionId();
	await lease.value.spawnSession(sid, { file: 'controlled', args: [], env: {}, cols: 80, rows: 24 });
	const closing = host.dispose();expect(host.dispose()).toBe(closing);
	const error = await closing.catch((error: unknown) => error) as AggregateError;
	expect(error).toBeInstanceOf(AggregateError);expect(error.errors[0]).toBeInstanceOf(NativeReleaseError);
	expect((error.errors[0] as NativeReleaseError).outcomes).toMatchObject([{ sid }]);expect((error.errors[0] as Error).cause).toBe(stop);
	expect(error.errors[1]).toBe(cleanup);await expect(host.dispose()).rejects.toBe(error);await expect(lease.release()).rejects.toBe(error);expect(disposals).toBe(1);
});

test('startup and unconfirmed cleanup retain both errors and forbid a second helper before the captured exit', async () => {
	const gone = deferred<Readonly<NativeHelperTermination>>(), cleanup = new NativeShutdownError('startup cleanup unconfirmed', helperOutcome('unconfirmed'), gone.promise);
	const primary = new Error('original startup failure'), combined = new AggregateError([primary, cleanup], primary.message, { cause: primary });let starts = 0;
	const host = new NativeHost(async events => { if (++starts === 1) throw combined;return transport(events); });
	await expect(host.acquire('pty')).rejects.toBe(combined);await expect(host.acquire('cookies')).rejects.toBe(combined);expect(starts).toBe(1);
	gone.resolve(helperOutcome('exited'));await Promise.resolve();await Promise.resolve();
	const next = await host.acquire('cookies');expect(starts).toBe(2);await next.release();await host.dispose();
});

test('Host dispose after an already retired failed last release retains that original shutdown result', async () => {
	const outcome = helperOutcome('exited'), failure = new NativeShutdownError('retired cleanup failure', outcome, Promise.resolve(outcome));
	const host = new NativeHost(async events => ({ ...transport(events), dispose: async () => { throw failure; } }));
	const lease = await host.acquire('cookies');await expect(lease.release()).rejects.toBe(failure);
	const closing = host.dispose();expect(host.dispose()).toBe(closing);await expect(closing).rejects.toBe(failure);
});

function transport(events: NativeEvents) {
	let alive = true;
	return {
		get alive() {
			return alive;
		},
		version: 'test',
		terminalTermination: 1 as const,
		spawnSession: async () => 42,
		input: () => {},
		resize: () => {},
		acknowledge: () => {},
		end: (_sid: number, _force?: boolean) => {},
		requestStop(sid: number, options: Readonly<{ requestId: string; force: boolean }>) {
			this.end(sid, options.force);
		},
		history: async <T>() => [] as T,
		request: async <T>() => {
			if (!alive) throw new Error('disconnected');
			return { rows: [{ name: 'cookie' }] } as T;
		},
		dispose: async () => {
			alive = false;
			events.closed('closed');
		},
	} satisfies NativeTransport;
}

test('reply faults keep the captured SID owner through release drain and cannot reach Browser or a new generation', async () => {
	const callbacks: NativeEvents[] = [],
		first: unknown[] = [],
		sibling: unknown[] = [],
		browserFaults: unknown[] = [];
	const stopped = deferred<number>();
	const host = new NativeHost(async (events) => {
		callbacks.push(events);
		return Object.assign(transport(events), { requestStop: (sid: number) => stopped.resolve(sid) });
	});
	const browser = await host.acquire('cookies', { replyFailure: (_sid, value) => browserFaults.push(value) });
	const a = await host.acquire('pty', { replyFailure: (sid, value) => first.push({ sid, value }) });
	const b = await host.acquire('pty', { replyFailure: (sid, value) => sibling.push({ sid, value }) });
	const aid = a.allocateSessionId(),
		bid = b.allocateSessionId();
	await a.value.spawnSession(aid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
	await b.value.spawnSession(bid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
	const closing = a.release();
	const complete = (sid: number) => {
		callbacks[0]!.termination?.(sid, {
			version: 1,
			sequence: 1,
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
		callbacks[0]!.exit(sid, 0, null);
	};
	const errors: unknown[] = [];
	try {
		await stopped.promise;
		expect(() => a.value.reply?.(aid, 'drain')).not.toThrow();
		expect(() => a.value.reply?.(bid, 'foreign')).toThrowError(NativeReplyError);
		callbacks[0]!.replyFailure?.(aid, { state: 'none', reason: 'capacity' });
		callbacks[0]!.replyFailure?.(bid, { state: 'unknown', reason: 'write-failed' });
		callbacks[0]!.replyFailure?.(999, { state: 'none', reason: 'closed' });
		expect(first).toEqual([{ sid: aid, value: { state: 'none', reason: 'capacity' } }]);
		expect(sibling).toEqual([{ sid: bid, value: { state: 'unknown', reason: 'write-failed' } }]);
		expect(browserFaults).toEqual([]);
		await expect(browser.value.request('cookies', 'read', {})).resolves.toHaveProperty('rows');
	} catch (error) {
		errors.push(error);
	} finally {
		complete(aid);
		complete(bid);
		for (const step of [() => closing, () => b.release(), () => browser.release()]) {
			try {
				await step();
			} catch (error) {
				errors.push(error);
			}
		}
	}
	try {
		const fresh: unknown[] = [];
		const next = await host.acquire('pty', { replyFailure: (_sid, value) => fresh.push(value) });
		try {
			expect(next.allocateSessionId()).toBe(aid);
			callbacks[0]!.replyFailure?.(aid, { state: 'unknown', reason: 'transport-lost' });
			expect(fresh).toEqual([]);
		} finally {
			await next.release();
		}
	} catch (error) {
		errors.push(error);
	} finally {
		await host.dispose();
	}
	if (errors.length) throw new AggregateError(errors, 'Reply owner fixture failed');
});

test('releasing Agent leaves the Browser Cookie capability connected until its owner releases', async () => {
	const host = new NativeHost(async (events) => transport(events));
	const agent = await host.acquire('pty');
	const browser = await host.acquire('cookies');
	try {
		await agent.release();
		await expect(browser.value.request('cookies', 'read', {})).resolves.toEqual({ rows: [{ name: 'cookie' }] });
	} finally {
		await browser.release();
	}
	expect(browser.value.alive).toBe(false);
});

test('crash notifies every owner and a fresh acquisition cannot reuse the failed generation', async () => {
	const crashes: Array<(reason: string) => void> = [];
	const reasons: string[] = [];
	const host = new NativeHost(async (events) => {
		crashes.push(events.closed);
		return transport(events);
	});
	const first = await host.acquire('history', { closed: (reason) => reasons.push(reason) });
	const browser = await host.acquire('cookies', { closed: (reason) => reasons.push(reason) });
	try {
		crashes[0]!('native crash');
		expect(reasons).toEqual(['native crash', 'native crash']);
		await expect(first.value.history('query', {})).rejects.toThrow('native crash');
		const next = await host.acquire('cookies');
		try {
			expect(crashes).toHaveLength(2);
			await expect(next.value.request('cookies', 'read', {})).resolves.toHaveProperty('rows');
		} finally {
			await next.release();
		}
	} finally {
		await first.release();
		await browser.release();
	}
});

function complete(events: NativeEvents, sid: number): void {
	events.exit(sid, 0, null);
	events.termination?.(sid, {
		version: 1,
		sequence: 1,
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
}

test.each(['complete', 'new-owner', 'timeout'])(
	'concurrent released owners preserve the sibling observation (%s)',
	async (mode) => {
		const callbacks: NativeEvents[] = [],
			faults: unknown[] = [],
			acks: number[] = [];
		let disposed = 0;
		const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
		const host = new NativeHost(async (events) => {
			callbacks.push(events);
			const helper = transport(events);
			const dispose = helper.dispose;
			return Object.assign(helper, {
				inputAdmission: 1 as const,
				replySettlement: 1 as const,
				acknowledge: (_sid: number, bytes: number) => {
					acks.push(bytes);
				},
				dispose: async () => {
					disposed++;
					await dispose();
				},
			});
		});
		const agent = await host.acquire('pty', { replyFailure: (_sid, value) => faults.push(value) });
		const history = await host.acquire('history');
		const sid = agent.allocateSessionId();
		await agent.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
		const events = callbacks[0]!;
		events.output(sid, new Uint8Array(3));
		agent.value.requestStop!(sid, { requestId: 'first', force: false });
		complete(events, sid);
		clock.mockReturnValue(10001);
		const releasing = agent.release();
		expect(agent.release()).toBe(releasing);
		const stopped = releasing.catch((error: unknown) => error);
		let next: NativeLease | undefined, expectedReleaseError: unknown;
		const errors: unknown[] = [];
		try {
			await history.release();
			expect(disposed).toBe(0);
			expect(agent.value.alive).toBe(false); // admission is revoked, but its captured drain remains owned
			if (mode === 'new-owner') {
				next = await host.acquire('cookies');
				expect(callbacks).toHaveLength(1);
			}
			if (mode === 'timeout') {
				const outcome = await stopped;
				expect(outcome).toMatchObject({ outcomes: [{ sid, reason: 'timeout' }] });
				expectedReleaseError = outcome;
				expect(disposed).toBe(1); // bounded observation failure still closes the last physical helper
			} else {
				events.replyFailure?.(sid, { state: 'unknown', reason: 'write-failed' });
				expect(faults).toHaveLength(1);
				events.replySettled?.(sid);
				expect(disposed).toBe(0); // the final reply fence does not stand in for the remaining parse ACK
				agent.value.acknowledge(sid, 3);
				expect(await stopped).toBeUndefined();
				expect(acks).toEqual([3]);
				if (next) {
					expect(disposed).toBe(0);
					expect(await next.value.request('cookies', 'read', {})).toHaveProperty('rows');
					await next.release();
				}
				expect(disposed).toBe(1);
			}
		} catch (error) {
			errors.push(error);
		} finally {
			if (disposed === 0) {
				events.replySettled?.(sid);
				try {
					agent.value.acknowledge(sid, 3);
				} catch (error) {
					errors.push(error);
				}
			}
			for (const close of [() => stopped, () => history.release(), () => next?.release(), () => host.dispose()])
				try {
					const result = await close();
					if (result instanceof Error && result !== expectedReleaseError) errors.push(result);
				} catch (error) {
					errors.push(error);
				}
			clock.mockRestore();
			if (errors.length) throw new AggregateError(errors, 'Concurrent owner observations body and cleanup');
		}
	},
);

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

test('cancellation closes admission immediately and a helper that starts late is reclaimed', async () => {
	const started = deferred<NativeTransport>(),
		entered = deferred<NativeEvents>();
	const host = new NativeHost((events) => {
		entered.resolve(events);
		return started.promise;
	});
	const abort = new AbortController();
	let result = 'pending';
	const acquiring = host.acquire('cookies', undefined, abort.signal).then(
		() => {
			result = 'acquired';
		},
		() => {
			result = 'cancelled';
		},
	);
	const events = await entered.promise;
	const helper = transport(events);
	try {
		abort.abort();
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(result).toBe('cancelled');
	} finally {
		started.resolve(helper);
		await acquiring;
		await host.dispose();
	}
	expect(helper.alive).toBe(false);
});

test('session numbers survive Agent reactivation and stale owners cannot send input', async () => {
	let events!: NativeEvents;
	const output: number[] = [];
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return transport(callbacks);
	});
	const browser = await host.acquire('cookies');
	const first = await host.acquire('pty');
	const oldSid = first.allocateSessionId();
	await first.release();
	const second = await host.acquire('pty', { output: (sid) => output.push(sid) });
	const nextSid = second.allocateSessionId();
	try {
		expect(nextSid).toBeGreaterThan(oldSid);
		events.output(oldSid, new Uint8Array([1]));
		events.output(nextSid, new Uint8Array([2]));
		expect(output).toEqual([nextSid]);
		expect(() => first.value.input(oldSid, 'late')).toThrow('lease is closed');
	} finally {
		await second.release();
		await browser.release();
		await host.dispose();
	}
});

test('releasing a PTY lease waits for its own exit while Browser keeps the helper alive', async () => {
	let events!: NativeEvents;
	const endRequested = deferred<number>();
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return Object.assign(transport(callbacks), {
			end: (sid: number) => {
				endRequested.resolve(sid);
			},
		});
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty');
	const sid = agent.allocateSessionId();
	await agent.value.spawnSession(sid, { file: 'sh', args: [], env: {}, cols: 80, rows: 24 });
	let released = false;
	const stopping = agent.release().then(() => {
		released = true;
	});
	try {
		expect(await endRequested.promise).toBe(sid);
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(released).toBe(false);
		expect(browser.value.alive).toBe(true);
	} finally {
		complete(events, sid);
		await stopping;
		await browser.release();
		await host.dispose();
	}
});

test('a spawn completing after release is ended before the PTY owner finishes closing', async () => {
	const spawn = deferred<number | null>(),
		endRequested = deferred<number>();
	let events!: NativeEvents;
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return Object.assign(transport(callbacks), {
			spawnSession: () => spawn.promise,
			end: (sid: number) => {
				endRequested.resolve(sid);
			},
		});
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty');
	const sid = agent.allocateSessionId();
	const spawning = expect(
		agent.value.spawnSession(sid, { file: 'sh', args: [], env: {}, cols: 80, rows: 24 }),
	).rejects.toThrow('lease is closed');
	let closed = false;
	const closing = agent.release().then(() => {
		closed = true;
	});
	try {
		await endRequested.promise;
		spawn.resolve(42);
		await spawning;
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(closed).toBe(false);
		expect(browser.value.alive).toBe(true);
	} finally {
		spawn.resolve(42);
		complete(events, sid);
		await spawning;
		await closing;
		await browser.release();
		await host.dispose();
	}
});

test.each([
	{ effect: 'success', early: true },
	{ effect: 'none', early: true },
	{ effect: 'unknown', early: true },
	{ effect: 'unknown', early: false },
])('pending $effect spawn adoption distinguishes settlement before numeric exit: $early', async ({ effect, early }) => {
	const ready = deferred<void>();
	let events!: NativeEvents;
	const faults: unknown[] = [],
		browserFaults: unknown[] = [];
	const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
	const failure = new NativeSpawnError(
		'controlled spawn result',
		effect === 'none' ? { code: 'pty-unavailable', effect: 'none' } : { code: 'unconfirmed', effect: 'unknown' },
	);
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return Object.assign(transport(callbacks), {
			replySettlement: 1 as const,
			spawnSession: async () => {
				await ready.promise;
				if (effect !== 'success') throw failure;
				return 42;
			},
		});
	});
	const browser = await host.acquire('cookies', { replyFailure: (_sid, value) => browserFaults.push(value) });
	const agent = await host.acquire('pty', { replyFailure: (_sid, value) => faults.push(value) });
	const sid = agent.allocateSessionId();
	const spawning = agent.value
		.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 })
		.catch((error: unknown) => error);
	let release: Promise<unknown> | undefined;
	let expectedReleaseError: unknown;
	const errors: unknown[] = [];
	try {
		agent.value.end(sid, true);
		if (early) events.replySettled?.(sid);
		if (effect !== 'none') complete(events, sid);
		if (!early) events.replySettled?.(sid);
		ready.resolve();
		const result = await spawning;
		if (effect === 'success') expect(result).toBe(42);
		else expect(result).toBe(failure);
		clock.mockReturnValue(10001);
		release = agent.release().catch((error: unknown) => error);
		if (effect === 'none' || !early) {
			expect(await release).toBeUndefined();
			expect(() => agent.value.acknowledge(sid, 1)).toThrow();
		} else {
			// An event that preceded exit cannot become proof merely because adoption happens later.
			const outcome = await release;
			expect(outcome).toMatchObject({ outcomes: [{ sid, reason: 'timeout' }] });
			expectedReleaseError = outcome;
			events.replyFailure?.(sid, { state: 'unknown', reason: 'write-failed' });
			expect(faults).toHaveLength(1);
			events.replySettled?.(sid);
			expect(() => agent.value.acknowledge(sid, 1)).toThrow();
		}
		expect(await browser.value.request('cookies', 'read', {})).toHaveProperty('rows');
		expect(browserFaults).toEqual([]);
	} catch (error) {
		errors.push(error);
	} finally {
		ready.resolve();
		complete(events, sid);
		events.replySettled?.(sid);
		for (const close of [() => release ?? agent.release(), () => browser.release(), () => host.dispose()])
			try {
				const result = await close();
				if (result instanceof Error && result !== expectedReleaseError) errors.push(result);
			} catch (error) {
				errors.push(error);
			}
		clock.mockRestore();
		if (errors.length) throw new AggregateError(errors, 'Spawn adoption matrix body and cleanup');
	}
});

test('release before a fast exit does not end an already settled successful spawn again', async () => {
	const ready = deferred<void>();
	let events!: NativeEvents;
	const ends: number[] = [],
		settlements: number[] = [];
	const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return Object.assign(transport(callbacks), {
			replySettlement: 1 as const,
			spawnSession: async () => {
				await ready.promise;
				return 42;
			},
			end: (sid: number) => {
				ends.push(sid);
			},
		});
	});
	const browser = await host.acquire('cookies');
	const agent = await host.acquire('pty', { replySettled: (sid) => settlements.push(sid) });
	const sid = agent.allocateSessionId();
	const spawning = agent.value
		.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 })
		.catch((error: unknown) => error);
	const release = agent.release().catch((error: unknown) => error);
	const errors: unknown[] = [];
	try {
		expect(ends).toEqual([sid]);
		clock.mockReturnValue(10001);
		complete(events, sid);
		events.replySettled?.(sid);
		ready.resolve();
		expect(await spawning).toMatchObject({ message: 'The native capability lease is closed' });
		expect(await release).toBeUndefined();
		expect(ends).toEqual([sid]);
		expect(settlements).toEqual([sid]);
		expect(await browser.value.request('cookies', 'read', {})).toHaveProperty('rows');
	} catch (error) {
		errors.push(error);
	} finally {
		ready.resolve();
		complete(events, sid);
		events.replySettled?.(sid);
		for (const close of [() => release, () => browser.release(), () => host.dispose()])
			try {
				const result = await close();
				if (result instanceof Error) errors.push(result);
			} catch (error) {
				errors.push(error);
			}
		clock.mockRestore();
		if (errors.length) throw new AggregateError(errors, 'Released fast spawn body and cleanup');
	}
});

test('a new owner waits for the prior process to exit and cannot be killed by an old release', async () => {
	const stopped = deferred<void>(),
		stopping = deferred<void>();
	let starts = 0;
	const host = new NativeHost(async (events) => {
		starts++;
		const helper = transport(events);
		if (starts !== 1) return helper;
		const dispose = helper.dispose;
		return Object.assign(helper, {
			dispose: async () => {
				stopping.resolve();
				await stopped.promise;
				await dispose();
			},
		});
	});
	const previous = await host.acquire('cookies');
	const closing = previous.release();
	await stopping.promise;
	let acquired = false;
	const acquiring = host.acquire('history').then((lease) => {
		acquired = true;
		return lease;
	});
	try {
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(acquired).toBe(false);
		expect(starts).toBe(1);
		stopped.resolve();
		await closing;
		const next = await acquiring;
		try {
			await previous.release();
			expect(next.value.alive).toBe(true);
			expect(starts).toBe(2);
		} finally {
			await next.release();
		}
	} finally {
		stopped.resolve();
		await closing;
		await (await acquiring).release();
		await host.dispose();
	}
});

test('a root exit cannot release a negotiated PTY scope before separate cleanup evidence while Browser continues', async () => {
	let events!: NativeEvents;
	const endRequested = deferred<number>();
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return Object.assign(transport(callbacks), {
			terminalTermination: 1 as const,
			end: (sid: number) => endRequested.resolve(sid),
			requestStop: (sid: number) => endRequested.resolve(sid),
		});
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty');
	const sid = agent.allocateSessionId();
	await agent.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
	let released = false;
	const closing = agent.release().then(() => {
		released = true;
	});
	try {
		await endRequested.promise;
		events.exit(sid, 0, null);
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(released).toBe(false);
		await expect(browser.value.request('cookies', 'read', {})).resolves.toHaveProperty('rows');
	} finally {
		events.termination?.(sid, {
			version: 1,
			sequence: 1,
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
		await closing;
		await browser.release();
		await host.dispose();
	}
});

test('legacy numeric exit rejects scope release and leaves the Browser sibling usable', async () => {
	let events!: NativeEvents;
	const requested = deferred<number>();
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return Object.assign(transport(callbacks), {
			terminalTermination: undefined,
			requestStop: undefined,
			end: (sid: number) => requested.resolve(sid),
		});
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty');
	const sid = agent.allocateSessionId();
	await agent.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
	const closing = agent.release().catch((error: unknown) => error);
	try {
		await requested.promise;
		events.exit(sid, 0, null);
		expect(await closing).toMatchObject({ outcomes: [{ sid, reason: 'cleanup-incomplete' }] });
		await expect(browser.value.request('cookies', 'read', {})).resolves.toHaveProperty('rows');
	} finally {
		await closing;
		await browser.release();
		await host.dispose();
	}
});

test('released owners retain captured ACK and parser-reply routes through incomplete cleanup without reopening user input', async () => {
	let events!: NativeEvents;
	const traffic: string[] = [];
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return Object.assign(transport(callbacks), {
			input: (_sid: number, data: string | Uint8Array) => {
				traffic.push(String(data));
			},
			acknowledge: (_sid: number, bytes: number) => {
				traffic.push(`ack:${bytes}`);
			},
		});
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty');
	const sid = agent.allocateSessionId();
	await agent.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
	const closing = agent.release().catch((error: unknown) => error);
	try {
		expect(() => agent.value.input(sid, 'user')).toThrow('lease is closed');
		agent.value.acknowledge(sid, 4);
		agent.value.reply?.(sid, 'device-reply');
		expect(traffic).toEqual(['ack:4', 'device-reply']);
		events.exit(sid, 0, null);
		events.termination?.(sid, {
			version: 1,
			sequence: 1,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: {
					state: 'partial',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					reason: 'residuals-present',
					remainingKnown: 1,
				},
				output: 'truncated',
			},
		});
		expect(await closing).toMatchObject({ outcomes: [{ sid, reason: 'cleanup-incomplete' }] });
		agent.value.acknowledge(sid, 8);
		expect(traffic.at(-1)).toBe('ack:8');
		complete(events, sid);
		events.termination?.(sid, {
			version: 1,
			sequence: 2,
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
		expect(() => agent.value.acknowledge(sid, 1)).toThrow();
		await expect(browser.value.request('cookies', 'read', {})).resolves.toHaveProperty('rows');
	} finally {
		complete(events, sid);
		await closing;
		await browser.release();
		await host.dispose();
	}
});

test('confirmed scope without the post-drain numeric exit remains an incomplete timed out release', async () => {
	let events!: NativeEvents;
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return transport(callbacks);
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty');
	const sid = agent.allocateSessionId();
	await agent.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
	const closing = agent.release().catch((error: unknown) => error);
	events.termination?.(sid, {
		version: 1,
		sequence: 1,
		evidence: {
			root: { state: 'exited', code: 0, signal: null },
			cleanup: {
				state: 'confirmed',
				scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
				remainingKnown: 0,
			},
			output: 'unknown',
		},
	});
	try {
		expect(await closing).toMatchObject({ outcomes: [{ sid, reason: 'timeout' }] });
		expect(browser.value.alive).toBe(true);
	} finally {
		events.exit(sid, 0, null);
		await closing;
		await browser.release();
		await host.dispose();
	}
}, 15000);

test('release reuses the first captured stop observation deadline after a force upgrade', async () => {
	let events!: NativeEvents;
	const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return transport(callbacks);
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty');
	const sid = agent.allocateSessionId();
	await agent.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
	agent.value.requestStop!(sid, { requestId: 'first', force: false });
	clock.mockReturnValue(5_000);
	agent.value.requestStop!(sid, { requestId: 'force', force: true });
	clock.mockReturnValue(10_001);
	let settled = false;
	const closing = agent
		.release()
		.catch((error: unknown) => error)
		.then((result) => {
			settled = true;
			return result;
		});
	try {
		await new Promise<void>((resolve) => setTimeout(resolve, 50));
		expect(settled).toBe(true);
		expect(await closing).toMatchObject({ outcomes: [{ sid, reason: 'timeout' }] });
		expect(browser.value.alive).toBe(true);
	} finally {
		complete(events, sid);
		await closing;
		clock.mockRestore();
		await browser.release();
		await host.dispose();
	}
});

test('negotiated output ownership survives confirmed numeric exit until late parse ACK while Browser continues', async () => {
	let events!: NativeEvents;
	const acknowledgements: Array<[number, number]> = [];
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return Object.assign(transport(callbacks), {
			inputAdmission: 1 as const,
			acknowledge: (sid: number, bytes: number) => {
				acknowledgements.push([sid, bytes]);
			},
		});
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty');
	const sid = agent.allocateSessionId();
	await agent.value.spawnSession(sid, { file: 'sh', args: [], env: {}, cols: 80, rows: 24 });
	events.output(sid, new Uint8Array(12));
	let released = false;
	const stopping = agent.release().then(() => {
		released = true;
	});
	complete(events, sid);
	try {
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(released).toBe(false);
		await expect(browser.value.request('cookies', 'read', {})).resolves.toHaveProperty('rows');
		agent.value.acknowledge(sid, 12);
		await stopping;
		expect(acknowledgements).toEqual([[sid, 12]]);
		expect(() => agent.value.input(sid, 'late user input')).toThrow();
	} finally {
		if (!released) agent.value.acknowledge(sid, 12);
		await stopping;
		await browser.release();
		await host.dispose();
	}
});

test('negotiated reply settlement retains a released owner through timeout and isolates the sibling until the final fence', async () => {
	for (const mode of ['normal', 'timeout', 'disconnected']) {
		const callbacks: NativeEvents[] = [];
		const received: unknown[] = [],
			sibling: unknown[] = [];
		const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
		const host = new NativeHost(async (events) => {
			callbacks.push(events);
			return Object.assign(transport(events), { replySettlement: 1 as const });
		});
		const browser = await host.acquire('cookies'),
			a = await host.acquire('pty', { replyFailure: (sid, value) => received.push({ sid, value }) }),
			b = await host.acquire('pty', { replyFailure: (sid, value) => sibling.push({ sid, value }) });
		const sid = a.allocateSessionId(),
			other = b.allocateSessionId();
		await a.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
		await b.value.spawnSession(other, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
		const events = callbacks[0]!;
		events.replySettled?.(sid); // an early event cannot retire a live route
		a.value.requestStop!(sid, { requestId: 'first', force: false });
		complete(events, sid);
		if (mode === 'timeout') clock.mockReturnValue(10001);
		let settled = false;
		const closing = a.release().then(
			() => {
				settled = true;
				return undefined;
			},
			(error: unknown) => {
				settled = true;
				return error;
			},
		);
		try {
			if (mode === 'timeout') expect(await closing).toMatchObject({ outcomes: [{ sid, reason: 'timeout' }] });
			else {
				await Promise.resolve();
				expect(settled).toBe(false);
			}
			events.replyFailure?.(sid, { state: 'unknown', reason: 'write-failed' });
			events.replyFailure?.(other, { state: 'none', reason: 'capacity' });
			expect(received).toHaveLength(1);
			expect(sibling).toHaveLength(1);
			expect(await browser.value.request('cookies', 'read', {})).toHaveProperty('rows');
			if (mode === 'disconnected') {
				events.closed('injected actual transport loss');
				expect(await closing).toMatchObject({ outcomes: [{ sid, reason: 'disconnected' }] });
			} else {
				events.replySettled?.(sid);
				await closing;
				events.replyFailure?.(sid, { state: 'none', reason: 'closed' });
				expect(received).toHaveLength(1);
				expect(await browser.value.request('cookies', 'read', {})).toHaveProperty('rows');
			}
		} finally {
			complete(events, sid);
			events.replySettled?.(sid);
			complete(events, other);
			events.replySettled?.(other);
			const errors: unknown[] = [];
			for (const close of [
				() => closing,
				() =>
					mode === 'disconnected'
						? expect(b.release()).rejects.toMatchObject({
								outcomes: [{ sid: other, reason: 'disconnected' }],
							})
						: b.release(),
				() => browser.release(),
				() => host.dispose(),
			])
				try {
					await close();
				} catch (error) {
					errors.push(error);
				}
			clock.mockRestore();
			if (errors.length) throw new AggregateError(errors, 'settlement host cleanup');
		}
	}
});

test('spawn environment access stays with the original live PTY lease and never adopts a sibling or new generation', async () => {
	const host = new NativeHost(async events => Object.assign(transport(events), {
		spawnEnvironment: (overrides: Readonly<Record<string, string>>) => ({
			values: Object.freeze({ CAPTURED_ONLY: 'original', ...overrides }), completeness: 'unix-shell-default' as const,
		}),
	}));
	const pty = await host.acquire('pty'), browser = await host.acquire('cookies');
	try {
		expect(typeof pty.value.spawnEnvironment).toBe('function');
		expect(pty.value.spawnEnvironment!({ SELECTED: 'override' })).toEqual({
			values: { CAPTURED_ONLY: 'original', SELECTED: 'override' }, completeness: 'unix-shell-default',
		});
		expect(() => browser.value.spawnEnvironment!({})).toThrow();
		await pty.release();
		expect(() => pty.value.spawnEnvironment!({})).toThrow();
		await expect(browser.value.request('cookies', 'read', {})).resolves.toHaveProperty('rows');
	} finally { await pty.release(); await browser.release(); }
});
