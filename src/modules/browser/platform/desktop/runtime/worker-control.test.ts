import { build } from 'esbuild';
import vm from 'node:vm';
import { expect, it } from 'vitest';
import type { WorkerInit, WorkerRequest, WorkerResponse } from './wire';

function gate() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
it('keeps native control mirroring urgent but withholds its handoff receipt until prior page work settles', async () => {
	const entered = gate(), blocked = gate(), controlled = gate(), messages: WorkerResponse[] = [];
	let receive!: (message: { data: WorkerInit | WorkerRequest }) => void;
	const output = await build({ entryPoints: ['src/modules/browser/platform/desktop/runtime/worker.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
		plugins: [{ name: 'synthetic-driver-port', setup(builder) {
			builder.onResolve({ filter: /^\.\/driver$/ }, () => ({ path: 'driver', namespace: 'synthetic' }));
			builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents: 'module.exports.BrowserDriver = globalThis.SyntheticDriver;', loader: 'js' }));
		} }] });
	class SyntheticDriver {
		async start() { return 'Chrome/synthetic'; }
		async execute() { entered.resolve(); await blocked.promise; }
		async setControl() { controlled.resolve(); }
	}
	vm.runInNewContext(output.outputFiles[0]!.text, { process: { parentPort: { on: (_event: string, listener: typeof receive) => { receive = listener; }, postMessage: (message: WorkerResponse) => messages.push(message) } }, SyntheticDriver });
	const authority = { runtimeId: 'runtime', spaceId: 'space', epoch: 0, leaseId: 'lease', controllerId: 'agent', mode: 'agent' as const, expiresAt: Number.MAX_SAFE_INTEGER };
	receive({ data: { type: 'init', spaceId: 'space', runtimeId: 'runtime', port: 1, token: 'synthetic', downloadPath: '', fresh: false, provisioning: authority } });
	receive({ data: { type: 'execute', id: 1, pageId: 'page', command: { kind: 'text' }, authority } }); await entered.promise;
	receive({ data: { type: 'control', id: 2, epoch: 1 } }); await controlled.promise;
	await new Promise<void>(resolve => setImmediate(resolve));
	try { expect(messages.find(message => message.type === 'result' && message.id === 2)).toBeUndefined(); }
	finally { blocked.resolve(); }
	await new Promise<void>(resolve => setImmediate(resolve));
	expect(messages.filter(message => message.type === 'result').map(message => message.id)).toEqual([1, 2]);
});
