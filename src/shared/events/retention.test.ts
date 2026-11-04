import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

test('explicit unsubscribe releases the handler and captured state while lifetime retains its disposer', () => {
	// Run real V8 GC in a child: active subscriptions are the positive control; no global GC flags leak into Vitest.
	const result = execFileSync(process.execPath, ['--expose-gc', '--input-type=module', '-e', `
		import { build } from 'esbuild';
		const bundle = await build({ entryPoints: [process.argv[1]], bundle: true, write: false, format: 'esm', platform: 'node' });
		const { DomainEvents, domainEventKey } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
		const events = new DomainEvents();
		const key = domainEventKey('test:retention');
		const cleanups = [];
		function install() {
			const state = { count: 0, large: new Uint8Array(1_000_000) };
			const handler = () => { state.count++; };
			events.on(key, handler, { lifetime: { register(fn) { cleanups.push(fn); } } });
			return { handler: new WeakRef(handler), state: new WeakRef(state) };
		}
		const weak = install();
		async function collect() {
			for (let i = 0; i < 12; i++) {
				await new Promise(resolve => setImmediate(resolve));
				global.gc();
			}
		}
		function alive() { return { handler: Boolean(weak.handler.deref()), state: Boolean(weak.state.deref()) }; }
		await collect();
		const active = alive();
		cleanups[0]();
		cleanups[0]();
		await collect();
		const unsubscribed = alive();
		events.emit(key, {});
		console.log(JSON.stringify({ active, unsubscribed, retainedDisposers: cleanups.length }));
	`, fileURLToPath(new URL('./domain-events.ts', import.meta.url))], { encoding: 'utf8', timeout: 15_000 });
	expect(JSON.parse(result) as unknown).toEqual({
		active: { handler: true, state: true },
		unsubscribed: { handler: false, state: false },
		retainedDisposers: 1,
	});
}, 20_000);
