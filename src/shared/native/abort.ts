/** Cancel the wait without replaying or abandoning ownership of the underlying operation. */
export async function waitForNative<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
	signal?.throwIfAborted();
	let cancel = () => {};
	const cancelled = new Promise<never>((_resolve, reject) => { cancel = () => reject(signal?.reason instanceof Error ? signal.reason : new Error('Native operation cancelled')); });
	signal?.addEventListener('abort', cancel, { once: true });
	try { return await Promise.race([pending, cancelled]); }
	finally { signal?.removeEventListener('abort', cancel); }
}
