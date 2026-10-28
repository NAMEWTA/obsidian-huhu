import type { NativeCookieReader, NativeHostAccess } from './host';

/** Owns each request's lease through cleanup; dual failures retain the read error as AggregateError.cause. */
export function nativeCookieReader(host: NativeHostAccess, lifetime?: AbortSignal): NativeCookieReader {
	return {
		async readCookies(path, kind, signal) {
			lifetime?.throwIfAborted();
			signal?.throwIfAborted();
			const abort = new AbortController();
			const close = () => abort.abort(lifetime?.reason);
			const cancel = () => abort.abort(signal?.reason);
			lifetime?.addEventListener('abort', close, { once: true });
			signal?.addEventListener('abort', cancel, { once: true });
			try {
				const lease = await host.acquire('cookies', undefined, abort.signal);
				let read:
					| { ok: true; value: Awaited<ReturnType<NativeCookieReader['readCookies']>> }
					| { ok: false; error: unknown };
				try {
					read = { ok: true, value: await lease.value.request('cookies', 'read', { path, kind }, abort.signal) };
				} catch (error) {
					read = { ok: false, error };
				}
				try {
					await lease.release();
				} catch (cleanupError) {
					if (read.ok) throw cleanupError;
					const diagnostic = read.error instanceof Error ? read.error.message
						: typeof read.error === 'string' ? read.error : 'Cookie read failed';
					throw new AggregateError([read.error, cleanupError], `${diagnostic}; native Cookie cleanup also failed`, { cause: read.error });
				}
				if (!read.ok) throw read.error;
				return read.value;
			} finally {
				lifetime?.removeEventListener('abort', close);
				signal?.removeEventListener('abort', cancel);
			}
		},
	};
}
