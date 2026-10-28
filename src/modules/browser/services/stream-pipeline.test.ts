import { build } from 'esbuild';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';
import { FrameBroker } from './frame-broker';
import { latestFramePresenter } from '../ui/viewer-geometry';
import { adaptRuntime } from '../platform/desktop/runtime/adapter';
import type { MainRuntime } from '../platform/desktop/runtime/host-main';
import type { WorkerInit, WorkerRequest, WorkerResponse } from '../platform/desktop/runtime/wire';
import type { BrowserFrame, RuntimeEvent } from '../core/contracts';

function gate() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
it('bounds the actual Worker→adapter→broker→presenter chain through sustained slow host and viewer credit', async () => {
	let receive!: (message: { data: WorkerInit | WorkerRequest }) => void, produce!: (event: RuntimeEvent) => void, listener: ((event: RuntimeEvent) => void) | undefined;
	const credits: string[] = [], status: RuntimeEvent[] = [], sent: WorkerResponse[] = [];
	const output = await build({ entryPoints: ['src/modules/browser/platform/desktop/runtime/worker.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
		plugins: [{ name: 'synthetic-driver-port', setup(builder) { builder.onResolve({ filter: /^\.\/driver$/ }, () => ({ path: 'driver', namespace: 'synthetic' })); builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents: 'module.exports.BrowserDriver=globalThis.SyntheticDriver', loader: 'js' })); } }] });
	class SyntheticDriver { constructor(_s: string, _r: string, _d: string, _f: boolean, _p: unknown, emit: typeof produce) { produce = emit; } async start() { return 'Chrome/synthetic'; } }
	vm.runInNewContext(output.outputFiles[0]!.text, { SyntheticDriver, process: { parentPort: { on: (_name: string, callback: typeof receive) => { receive = callback; }, postMessage: (message: WorkerResponse) => { sent.push(message); if (message.type === 'event') listener?.(message.event); } } } });
	const native: MainRuntime = { id: 'runtime', spaceId: 'space', onEvent: callback => { listener = callback; return () => { listener = undefined; }; }, ackFrame: page => { credits.push(page); }, setControl: vi.fn(), createPage: vi.fn(), closePage: vi.fn(), execute: vi.fn(), observe: vi.fn(), watch: vi.fn(), readIdentity: vi.fn(), writeIdentity: vi.fn(), cancelDownload: vi.fn(), stop: vi.fn() };
	const runtime = adaptRuntime(native), broker = new FrameBroker(async () => undefined), blocked = gate(), presented: string[] = [], fast: string[] = [];
	let slow!: ReturnType<typeof broker.subscribe>, quick!: ReturnType<typeof broker.subscribe>;
	const presenter = latestFramePresenter<BrowserFrame>({ present: async frame => { presented.push(frame.frameId); if (frame.frameId === '1') await blocked.promise; }, ack: frame => slow.ack(frame.frameId), error: reason => { throw reason; } });
	slow = broker.subscribe({ spaceId: 'space', pageId: 'page', viewerId: 'slow' }, frame => presenter.enqueue(frame));
	quick = broker.subscribe({ spaceId: 'space', pageId: 'page', viewerId: 'fast' }, frame => { fast.push(frame.frameId); quick.ack(frame.frameId); });
	const unlisten = runtime.onEvent(event => { if (event.kind === 'frame') broker.publish(event.frame); else status.push(event); });
	const authority = { runtimeId: 'runtime', spaceId: 'space', epoch: 1, leaseId: 'lease', controllerId: 'viewer', mode: 'human' as const, expiresAt: Number.MAX_SAFE_INTEGER };
	receive({ data: { type: 'init', spaceId: 'space', runtimeId: 'runtime', port: 1, token: '', downloadPath: '', fresh: false, provisioning: authority } });
	let id = 0;
	const flush = () => { const page = credits.shift(); if (page) receive({ data: { type: 'frameAck', id: ++id, pageId: page } }); };
	try {
		for (let number = 1; number <= 10000; number++) {
			produce({ kind: 'frame', frame: { spaceId: 'space', pageId: 'page', runtimeId: 'runtime', documentId: 'document', epoch: 1, viewportVersion: 1, frameId: String(number), width: 10, height: 10, cssWidth: 10, cssHeight: 10, mime: 'image/png', data: new Uint8Array(8), capturedAt: 1, inputSequence: 0 } });
			if (number % 1000 === 0) flush();
			expect(broker.stats('space').queuedFrameBytes).toBeLessThanOrEqual(16);
		}
		produce({ kind: 'fault', runtimeId: 'runtime', code: 'synthetic_status' }); expect(status).toHaveLength(1);
		expect(presented).toEqual(['1']); expect(fast).toEqual(['1', ...Array.from({ length: 10 }, (_, index) => String((index + 1) * 1000))]);
		expect(sent.filter(message => message.type === 'event' && message.event.kind === 'frame')).toHaveLength(11);
		blocked.resolve(); await new Promise<void>(resolve => setImmediate(resolve)); expect(presented).toEqual(['1', '10000']); expect(broker.stats('space').queuedFrameBytes).toBe(0);
	} finally { blocked.resolve(); presenter.dispose(); slow.dispose(); quick.dispose(); unlisten(); }
});
