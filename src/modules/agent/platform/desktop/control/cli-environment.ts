import type { NativeCliState } from '../../../../../shared/native/host';

/**
 * Terminal environment that makes the verified `huhu` resolvable: its directory is put in front of PATH, and `HUHU_CLI`
 * names the exact file. Without a ready tool nothing is added, so a terminal never reaches an unverified binary through
 * HUHU. `base` is the login-shell environment; `inherited` is the process environment the helper starts from.
 */
export function withCliEnvironment(
	base: Readonly<Record<string, string>>,
	state: NativeCliState | undefined,
	platform: string = process.platform,
	inherited: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string> {
	if (state?.state !== 'ready') return { ...base };
	const delimiter = platform === 'win32' ? ';' : ':';
	const find = (source: Readonly<Record<string, string | undefined>>) =>
		platform === 'win32' ? Object.keys(source).find(key => key.toLowerCase() === 'path') : 'PATH' in source ? 'PATH' : undefined;
	const key = find(base) ?? find(inherited) ?? 'PATH';
	const current = base[key] ?? inherited[key] ?? '';
	const entries = current.split(delimiter).filter(entry => entry && entry !== state.directory);
	return { ...base, [key]: [state.directory, ...entries].join(delimiter), HUHU_CLI: state.path };
}

/** Timer functions of the owning window (popout-safe in the app, the global ones in tests). */
export interface CliTimers {
	setTimeout(run: () => void, delay: number): unknown;
	clearTimeout(token: never): void;
}

/** Longest a terminal launch may wait for the tool: only a receipt-verified local check fits, never network work. */
export const CLI_LAUNCH_WAIT_MS = 300;

/**
 * Supplies the verified-CLI environment to terminal launches without ever making a launch wait on installation.
 * A launch waits at most `wait` ms (and not at all once aborted) for the tool; a slower install keeps running in the
 * background and only terminals started after it is ready get `PATH`/`HUHU_CLI`. A non-ready result is remembered for
 * the life of the provider (one version per module activation), so a refused or unreachable release is not retried by
 * every terminal; the settings check is the explicit retry and updates the same memory.
 */
export class CliEnvironment {
	private last?: NativeCliState;
	private running?: Promise<NativeCliState | undefined>;
	constructor(
		private readonly prepare: () => Promise<NativeCliState | undefined>,
		private readonly wait: number,
		private readonly timers: CliTimers,
	) {}

	/** Record the outcome of an explicit check (settings), including a successful retry of a remembered failure. */
	remember(state: NativeCliState): void {
		this.last = state;
	}

	async apply(base: Readonly<Record<string, string>>, signal?: AbortSignal): Promise<Record<string, string>> {
		if (this.last && this.last.state !== 'ready') return { ...base };
		this.running ??= this.prepare()
			.catch(() => undefined)
			.then((state) => {
				if (state) this.last = state;
				return state;
			})
			.finally(() => {
				this.running = undefined;
			});
		const state = await new Promise<NativeCliState | undefined>((resolve) => {
			if (signal?.aborted) return resolve(undefined);
			const done = (value?: NativeCliState) => {
				this.timers.clearTimeout(timer);
				signal?.removeEventListener('abort', abort);
				resolve(value);
			};
			const abort = () => done();
			const timer = this.timers.setTimeout(done, this.wait) as never;
			signal?.addEventListener('abort', abort, { once: true });
			void this.running!.then(done);
		});
		return withCliEnvironment(base, state);
	}
}
