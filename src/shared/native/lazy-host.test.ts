import { expect, test } from 'vitest';
import { lazyNativeHost, type NativeHostOwner } from './lazy-host';

test('unused and already-aborted capabilities never load the desktop host', async () => {
	let loads = 0;
	const host = lazyNativeHost(async () => { loads++; throw new Error('desktop unavailable'); });
	expect(loads).toBe(0);
	const abort = new AbortController(); abort.abort();
	await expect(host.acquire('cookies', undefined, abort.signal)).rejects.toBeDefined();
	expect(loads).toBe(0);
	await host.dispose();
	await expect(host.acquire('pty')).rejects.toThrow('closed');
	expect(loads).toBe(0);
});

test('unload during desktop loading reclaims the late host without acquiring any capability', async () => {
	let complete!: (host: NativeHostOwner) => void;
	let acquisitions = 0, disposals = 0;
	const host = lazyNativeHost(() => new Promise(resolve => { complete = resolve; }));
	const acquiring = expect(host.acquire('cookies')).rejects.toThrow('closed');
	const closing = host.dispose();
	complete({ acquire: async () => { acquisitions++; throw new Error('must not acquire'); }, dispose: async () => { disposals++; } });
	await acquiring;
	await closing;
	expect(acquisitions).toBe(0);
	expect(disposals).toBe(1);
});

test('control remains passive and cancelling desktop loading never acquires a late control owner', async () => {
	let loads = 0, acquisitions = 0, disposals = 0;
	let complete!: (value: NativeHostOwner) => void;
	const host = lazyNativeHost(() => { loads++; return new Promise(resolve => { complete = resolve; }); });
	const already = new AbortController(); already.abort();
	await expect(host.acquire('control', undefined, already.signal)).rejects.toBeDefined();
	expect(loads).toBe(0);
	const waiting = new AbortController();
	const acquisition = host.acquire('control', undefined, waiting.signal);
	waiting.abort();
	await expect(acquisition).rejects.toBeDefined();
	complete({ acquire: async () => { acquisitions++; throw new Error('late control must not acquire'); }, dispose: async () => { disposals++; } });
	await host.dispose();
	expect({ loads, acquisitions, disposals }).toEqual({ loads: 1, acquisitions: 0, disposals: 1 });
});
