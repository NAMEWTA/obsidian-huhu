import { expect, test } from 'vitest';
import { lazyNativeHost, type NativeHostOwner } from './lazy-host';

test('the command-line tool state loads the desktop host on demand and degrades to a state, never an exception', async () => {
	let loads = 0;
	const ready = { state: 'ready', path: '/p/huhu', directory: '/p', text: 'ok' } as const;
	const host = lazyNativeHost(async () => { loads++; return { acquire: async () => { throw new Error('unused'); }, cli: async () => ready, dispose: async () => undefined } as NativeHostOwner; });
	expect(loads).toBe(0);
	expect(await host.cli!()).toEqual(ready);
	expect(await host.cli!()).toEqual(ready);
	expect(loads).toBe(1);
	await host.dispose();
	expect(await host.cli!()).toMatchObject({ state: 'unavailable', reason: 'closed' });

	const failing = lazyNativeHost(async () => { throw new Error('desktop unavailable'); });
	expect(await failing.cli!()).toMatchObject({ state: 'unavailable', reason: 'load' });
	const old = lazyNativeHost(async () => ({ acquire: async () => { throw new Error('unused'); }, dispose: async () => undefined }));
	expect(await old.cli!()).toMatchObject({ state: 'unavailable' });
});
