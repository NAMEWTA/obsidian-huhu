import { setTimeout, clearTimeout } from 'node:timers';
import type { BotClient, BotMethodMap, CallOptions } from '../../../api';

export type StopFacts = BotMethodMap['service.shutdown']['result'];
export interface RunnerExit { code: number | null; signal: string | null; forced: boolean }
export interface StopProcess {
	readonly exit: Promise<RunnerExit>;
	close(): void;
}

/** A caller owns only its observation. Timeout never cancels the shared drain. */
export function observeStop<T>(completion: Promise<T>, options: CallOptions = {}): Promise<T> {
	if (options.signal?.aborted) return Promise.reject(new Error('STOP_OBSERVATION_ABORTED'));
	if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 0))
		return Promise.reject(new Error('INVALID_STOP_TIMEOUT'));
	return new Promise<T>((resolve, reject) => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const cleanup = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); };
		const abort = () => { cleanup(); reject(new Error('STOP_OBSERVATION_ABORTED')); };
		options.signal?.addEventListener('abort', abort, { once: true });
		if (options.timeoutMs !== undefined) timer = setTimeout(() => { cleanup(); reject(new Error('STOP_OBSERVATION_TIMEOUT')); }, options.timeoutMs);
		void completion.then(value => { cleanup(); resolve(value); }, (error: unknown) => { cleanup(); reject(error instanceof Error ? error : new Error('STOP_OBSERVATION_FAILED')); });
	});
}

/** One managed session retains both the wire facts and physical process ownership. */
export function managedStop(client: BotClient, process: StopProcess) {
	let completion: Promise<void> | undefined;
	let facts: StopFacts | undefined;
	const run = async () => {
		let failure: Error | undefined;
		try {
			for (;;) {
				facts = await client.service.shutdown({ waitMs: 1000 }, { timeoutMs: 5000 });
				if (!facts.requested) throw new Error('RUNNER_STOP_NOT_REQUESTED');
				if (!facts.finished) continue;
				if (!facts.executionDrained || !facts.persistenceComplete || !facts.profileReleased || facts.failures.length)
					throw new Error(`RUNNER_STOP_FAILED:${facts.failures.join(',') || 'INCOMPLETE_FACTS'}`);
				break;
			}
		} catch (error) {
			failure = error instanceof Error ? error : new Error('RUNNER_STOP_FAILED');
			// A broken observation cannot prove persistence. EOF still asks the Go
			// owner to finish cleanup; it is never upgraded to a timed signal.
			if (!facts?.finished) process.close();
		}
		const exit = await process.exit;
		if (exit.forced || exit.signal || exit.code !== 0) throw new Error('RUNNER_STOP_EXIT_FAILED');
		if (failure) throw failure;
	};
	return {
		get facts(): StopFacts | undefined { return facts ? { ...facts, failures: [...facts.failures] } : undefined; },
		stop(options?: CallOptions): Promise<void> {
			if (!completion) { completion = run(); void completion.catch(() => {}); }
			return observeStop(completion, options);
		},
	};
}
