import { expect, test } from 'vitest';
import type { NativeCliState } from '../../../../../shared/native/host';
import { clearTimeout, setTimeout } from 'node:timers';
import { CliEnvironment, withCliEnvironment } from './cli-environment';

const ready: NativeCliState = { state: 'ready', path: '/h/bin/huhu', directory: '/h/bin', text: '' };
const refused = (state: 'incompatible' | 'offlineMissing' | 'downloadFailed'): NativeCliState => ({ state, reason: state, text: '' });

test('a verified tool is put first on PATH and named by HUHU_CLI', () => {
	expect(withCliEnvironment({ PATH: '/login/bin:/h/bin:/usr/bin' }, ready, 'linux', { PATH: '/ignored' })).toEqual({ PATH: '/h/bin:/login/bin:/usr/bin', HUHU_CLI: '/h/bin/huhu' });
	expect(withCliEnvironment({}, ready, 'linux', { PATH: '/usr/bin' })).toEqual({ PATH: '/h/bin:/usr/bin', HUHU_CLI: '/h/bin/huhu' });
});

test('Windows keeps the existing Path key and its semicolons', () => {
	const state: NativeCliState = { state: 'ready', path: 'C:\\h\\bin\\huhu.exe', directory: 'C:\\h\\bin', text: '' };
	expect(withCliEnvironment({}, state, 'win32', { Path: 'C:\\Windows' })).toEqual({ Path: 'C:\\h\\bin;C:\\Windows', HUHU_CLI: 'C:\\h\\bin\\huhu.exe' });
});

test('an incompatible, offline-missing, failed or absent tool adds nothing, so no unverified binary is reachable', () => {
	for (const state of [refused('incompatible'), refused('offlineMissing'), refused('downloadFailed'), undefined])
		expect(withCliEnvironment({ PATH: '/usr/bin' }, state, 'linux', { PATH: '/x' })).toEqual({ PATH: '/usr/bin' });
});

const timers = { setTimeout, clearTimeout };
const defer = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };

test('a slow or hanging install never delays a launch, and only later launches get the tool once it is ready', async () => {
	const install = defer<NativeCliState>();
	let calls = 0;
	const provider = new CliEnvironment(() => { calls++; return install.promise; }, 20, timers);
	const started = Date.now();
	expect(await provider.apply({ PATH: '/usr/bin' })).toEqual({ PATH: '/usr/bin' });
	expect(Date.now() - started).toBeLessThan(500);
	expect(await provider.apply({ PATH: '/usr/bin' })).toEqual({ PATH: '/usr/bin' });
	expect(calls, 'the pending install is shared, not restarted').toBe(1);
	install.resolve(ready);
	await Promise.resolve();
	expect(await provider.apply({ PATH: '/usr/bin' })).toMatchObject({ HUHU_CLI: '/h/bin/huhu' });
});

test('an aborted launch does not wait at all', async () => {
	const provider = new CliEnvironment(() => new Promise<NativeCliState>(() => undefined), 60_000, timers);
	const abort = new AbortController();
	const pending = provider.apply({ PATH: '/x' }, abort.signal);
	abort.abort();
	expect(await pending).toEqual({ PATH: '/x' });
	const already = new AbortController(); already.abort();
	expect(await provider.apply({ PATH: '/x' }, already.signal)).toEqual({ PATH: '/x' });
});

test('a refused or failing tool is remembered, so later launches neither wait nor retry, until an explicit check succeeds', async () => {
	let calls = 0;
	const results: Array<NativeCliState | Error> = [refused('incompatible')];
	const provider = new CliEnvironment(async () => { calls++; const next = results.shift(); if (next instanceof Error) throw next; return next; }, 50, timers);
	expect(await provider.apply({ PATH: '/a' })).toEqual({ PATH: '/a' });
	expect(await provider.apply({ PATH: '/a' })).toEqual({ PATH: '/a' });
	expect(calls).toBe(1);
	provider.remember(ready);
	results.push(ready);
	expect(await provider.apply({}, undefined)).toMatchObject({ HUHU_CLI: '/h/bin/huhu' });
	expect(calls, 'a ready tool is re-verified on each launch (fast local path)').toBe(2);
	const thrown = new CliEnvironment(async () => { throw new Error('boom'); }, 50, timers);
	expect(await thrown.apply({ PATH: '/b' })).toEqual({ PATH: '/b' });
});
