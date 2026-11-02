import { waitForNative } from './abort';
import type { NativeHostAccess } from './host';

export interface NativeHostOwner extends NativeHostAccess { dispose(): Promise<void>; }

/** Loading alone does not acquire a capability. Disposal also closes a host that finishes loading late. */
export function lazyNativeHost(load: () => Promise<NativeHostOwner>): NativeHostOwner {
	let loading: Promise<NativeHostOwner> | undefined;
	let stopped = false;
	return {
		async acquire(capability, events, signal) {
			if (stopped) throw new Error('The native host is closed');
			signal?.throwIfAborted();
			loading ??= load().catch((error: unknown) => { loading = undefined; throw error; });
			const host = await waitForNative(loading, signal);
			if (stopped) throw new Error('The native host is closed');
			return host.acquire(capability, events, signal);
		},
		async cli(options) {
			const closed = { state: 'unavailable', reason: 'closed', text: '' } as const;
			if (stopped) return closed;
			loading ??= load().catch((error: unknown) => { loading = undefined; throw error; });
			let host: NativeHostOwner;
			try { host = await loading; } catch { return { state: 'unavailable', reason: 'load', text: '' }; }
			return stopped || !host.cli ? closed : host.cli(options);
		},
		async dispose() { stopped = true; await (await loading)?.dispose(); },
	};
}
