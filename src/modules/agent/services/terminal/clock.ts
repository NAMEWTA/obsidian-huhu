/** Capture the owning window's timers; worker/unit consumers have the same Web timer port. */
export interface LifecycleClock {
	setTimeout(run: () => void, delay: number): unknown;
	clearTimeout(token: unknown): void;
}
export const SHUTDOWN_OBSERVE_MS = 15000;

/** Stops observing; the original operation and its owner retain responsibility for late settlement. */
export function observeLifecycle<T>(operation: Promise<T>, deadline: number, interrupted: (reason: 'WAIT_TIMEOUT' | 'WAIT_CANCELLED') => Error, signal?: AbortSignal): Promise<T> {
	return new Promise((resolve, reject) => {
		const clock = lifecycleClock();
		let finished = false;
		const finish = (result: { value: T } | { error: unknown }) => {
			if (finished) return;
			finished = true; clock.clearTimeout(timer); signal?.removeEventListener('abort', abort);
			if ('error' in result) reject(result.error instanceof Error ? result.error : new Error('Lifecycle operation failed', { cause: result.error })); else resolve(result.value);
		};
		const abort = () => finish({ error: interrupted('WAIT_CANCELLED') });
		const timer = clock.setTimeout(() => finish({ error: interrupted('WAIT_TIMEOUT') }), Math.max(0, deadline - Date.now()));
		signal?.addEventListener('abort', abort, { once: true });
		operation.then(value => finish({ value }), error => finish({ error }));
		if (signal?.aborted) abort();
	});
}
export function lifecycleClock(): LifecycleClock {
	if (typeof window !== 'undefined') return {
		setTimeout: (run, delay) => window.setTimeout(run, delay),
		clearTimeout: token => window.clearTimeout(token as number),
	};
	const worker = { setTimeout, clearTimeout };
	return { setTimeout: (run, delay) => worker.setTimeout(run, delay), clearTimeout: token => worker.clearTimeout(token as ReturnType<typeof setTimeout>) };
}
