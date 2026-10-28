import { expect, test, vi } from 'vitest';
import { nativeCookieReader } from './cookies';
import type { NativeConnection, NativeHostAccess } from './host';

type Rows = { rows: Array<Record<string, unknown>> };
function fixture(read: (signal?: AbortSignal) => Promise<Rows>, release: () => Promise<void>) {
	const calls = { acquires: 0, reads: 0, releases: 0, signal: undefined as AbortSignal | undefined };
	const host: NativeHostAccess = {
		async acquire(capability, events, signal) {
			calls.acquires++;
			expect(capability).toBe('cookies');
			expect(events).toBeUndefined();
			calls.signal = signal;
			return {
				value: {
					async request(type: string, op: string, payload: Record<string, unknown>, requestSignal?: AbortSignal) {
						calls.reads++;
						expect([type, op, payload]).toEqual(['cookies', 'read', { path: '/fixture.sqlite', kind: 'firefox' }]);
						expect(requestSignal).toBe(signal);
						return read(requestSignal);
					},
				} as unknown as NativeConnection,
				allocateSessionId() { throw new Error('Cookie reads do not allocate PTYs'); },
				async release() { calls.releases++; await release(); },
			};
		},
	};
	return { host, calls };
}

function watchedController() {
	const controller = new AbortController();
	const add = vi.spyOn(controller.signal, 'addEventListener');
	const remove = vi.spyOn(controller.signal, 'removeEventListener');
	return {
		controller,
		cleaned() {
			expect(add).toHaveBeenCalledTimes(1);
			expect(remove).toHaveBeenCalledExactlyOnceWith('abort', add.mock.calls[0]![1]);
		},
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void, reject!: (error: unknown) => void;
	const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

test('Cookie read and final release failures preserve both original errors and the read cause', async () => {
	const readError = new Error('SQLite snapshot could not be read');
	const cleanupError = new Error('Native cleanup failed');
	const { host, calls } = fixture(async () => { throw readError; }, async () => { throw cleanupError; });
	const lifetime = watchedController(), request = watchedController();
	const result: unknown = await nativeCookieReader(host, lifetime.controller.signal)
		.readCookies('/fixture.sqlite', 'firefox', request.controller.signal).catch(error => error);
	expect(result).toBeInstanceOf(AggregateError);
	const failure = result as AggregateError;
	expect(failure.errors).toEqual([readError, cleanupError]);
	expect(failure.errors[0]).toBe(readError);
	expect(failure.errors[1]).toBe(cleanupError);
	expect(failure.cause).toBe(readError);
	expect(failure.message).toContain(readError.message);
	expect(calls).toMatchObject({ acquires: 1, reads: 1, releases: 1 });
	lifetime.cleaned(); request.cleaned();
});

test('Cookie success retains the original result and waits for its only release before removing listeners', async () => {
	const rows: Rows = { rows: [{ name: 'fixture', value: 'unchanged' }] };
	const cleanup = deferred<void>(), releasing = deferred<void>();
	const { host, calls } = fixture(async () => rows, async () => { releasing.resolve(); await cleanup.promise; });
	const lifetime = watchedController(), request = watchedController();
	let finished = false;
	const reading = nativeCookieReader(host, lifetime.controller.signal)
		.readCookies('/fixture.sqlite', 'firefox', request.controller.signal).finally(() => { finished = true; });
	await releasing.promise;
	const finishedBeforeCleanup = finished, releasesBeforeCleanup = calls.releases;
	cleanup.resolve();
	expect(await reading).toBe(rows);
	expect(finishedBeforeCleanup).toBe(false);
	expect(releasesBeforeCleanup).toBe(1);
	lifetime.cleaned(); request.cleaned();
	lifetime.controller.abort(new Error('late lifetime close'));
	request.controller.abort(new Error('late request cancellation'));
	expect(calls.signal!.aborted).toBe(false);
	expect(calls).toMatchObject({ acquires: 1, reads: 1, releases: 1 });
});

test.each([new Error('original read failure'), undefined, null])(
	'Cookie read rejection preserves its original value %s after successful cleanup', async readError => {
		const { host, calls } = fixture(async () => { throw readError; }, async () => {});
		const lifetime = watchedController(), request = watchedController();
		const outcome = await nativeCookieReader(host, lifetime.controller.signal)
			.readCookies('/fixture.sqlite', 'firefox', request.controller.signal)
			.then(value => ({ ok: true, value }), error => ({ ok: false, error }));
		expect(outcome).toEqual({ ok: false, error: readError });
		if ('error' in outcome) expect(outcome.error).toBe(readError);
		expect(calls).toMatchObject({ acquires: 1, reads: 1, releases: 1 });
		lifetime.cleaned(); request.cleaned();
	},
);

test('Cookie cleanup failure rejects with the original cleanup object after a successful read', async () => {
	const cleanupError = new Error('original cleanup failure');
	const { host, calls } = fixture(async () => ({ rows: [] }), async () => { throw cleanupError; });
	const lifetime = watchedController(), request = watchedController();
	const result = await nativeCookieReader(host, lifetime.controller.signal)
		.readCookies('/fixture.sqlite', 'firefox', request.controller.signal).catch(error => error);
	expect(result).toBe(cleanupError);
	expect(calls).toMatchObject({ acquires: 1, reads: 1, releases: 1 });
	lifetime.cleaned(); request.cleaned();
});

test('Cookie acquire rejection has no lease to release and removes both listeners', async () => {
	const acquireError = new Error('acquire failed');
	let acquires = 0;
	const lifetime = watchedController(), request = watchedController();
	const reader = nativeCookieReader({ async acquire() { acquires++; throw acquireError; } }, lifetime.controller.signal);
	expect(await reader.readCookies('/fixture.sqlite', 'firefox', request.controller.signal).catch(error => error)).toBe(acquireError);
	expect(acquires).toBe(1);
	lifetime.cleaned(); request.cleaned();
});

test.each(['lifetime', 'request'] as const)('Cookie %s already aborted never acquires or registers listeners', async source => {
	const lifetime = new AbortController(), request = new AbortController();
	const reason = new Error('already cancelled');
	(source === 'lifetime' ? lifetime : request).abort(reason);
	const { host, calls } = fixture(async () => ({ rows: [] }), async () => {});
	const addLifetime = vi.spyOn(lifetime.signal, 'addEventListener'), addRequest = vi.spyOn(request.signal, 'addEventListener');
	expect(await nativeCookieReader(host, lifetime.signal).readCookies('/fixture.sqlite', 'firefox', request.signal).catch(error => error)).toBe(reason);
	expect(calls).toMatchObject({ acquires: 0, reads: 0, releases: 0 });
	expect(addLifetime).not.toHaveBeenCalled(); expect(addRequest).not.toHaveBeenCalled();
});

test.each(['lifetime', 'request'] as const)('Cookie %s abort during a read retains cancellation and waits for failed cleanup', async source => {
	const reason = new Error('original cancellation reason'), cleanupError = new Error('cleanup after cancellation failed');
	const entered = deferred<void>(), cleanup = deferred<void>(), releasing = deferred<void>();
	const { host, calls } = fixture(signal => new Promise((_resolve, reject) => {
		signal!.addEventListener('abort', () => reject(signal!.reason), { once: true });
		entered.resolve();
	}), async () => { releasing.resolve(); await cleanup.promise; });
	const lifetime = watchedController(), request = watchedController();
	let finished = false;
	const reading = nativeCookieReader(host, lifetime.controller.signal)
		.readCookies('/fixture.sqlite', 'firefox', request.controller.signal)
		.then(value => ({ value }), error => ({ error })).finally(() => { finished = true; });
	await entered.promise;
	(source === 'lifetime' ? lifetime : request).controller.abort(reason);
	await releasing.promise;
	const finishedBeforeCleanup = finished;
	cleanup.reject(cleanupError);
	const outcome = await reading;
	expect(finishedBeforeCleanup).toBe(false);
	expect('error' in outcome).toBe(true);
	if (!('error' in outcome)) throw new Error('Cancellation must reject');
	expect(outcome.error).toBeInstanceOf(AggregateError);
	const result = outcome.error as AggregateError;
	expect(result.cause).toBe(reason);
	expect(result.errors[0]).toBe(reason); expect(result.errors[1]).toBe(cleanupError);
	expect(calls).toMatchObject({ acquires: 1, reads: 1, releases: 1 });
	lifetime.cleaned(); request.cleaned();
});

test('Cookie abort during acquire preserves its reason without attempting request or release', async () => {
	const entered = deferred<void>(), lifetime = watchedController(), request = watchedController();
	const reason = new Error('acquire cancelled');
	const reader = nativeCookieReader({ acquire(_capability, _events, signal) {
		entered.resolve();
		return new Promise((_resolve, reject) => {
			signal!.addEventListener('abort', () => reject(signal!.reason), { once: true });
		});
	} }, lifetime.controller.signal);
	const reading = reader.readCookies('/fixture.sqlite', 'firefox', request.controller.signal).catch(error => error);
	await entered.promise;
	request.controller.abort(reason);
	expect(await reading).toBe(reason);
	lifetime.cleaned(); request.cleaned();
});
