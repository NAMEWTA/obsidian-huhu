import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { afterEach, expect, it, vi } from 'vitest';
import { ManagedRuntime } from './host-main';
import { CHROMIUM_VERSION } from './assets';
import { JsonFrames, writeJsonFrame } from './framing';
import type { WorkerInit, WorkerRequest, WorkerResponse } from './wire';
import type { ControlLease } from '../../../core/contracts';

const synthetic = vi.hoisted(() => ({ spawn: undefined as unknown as (...args: unknown[]) => unknown }));
vi.mock('node:child_process', () => ({ spawn: (...args: unknown[]) => synthetic.spawn(...args) }));
vi.mock('electron', () => ({}));
vi.mock('node:timers', () => ({ setTimeout: (callback: () => void, delay?: number) => setTimeout(callback, delay), clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer) }));
const runtimes: ManagedRuntime[] = [];
afterEach(async () => { vi.useRealTimers(); await Promise.all(runtimes.splice(0).map(runtime => runtime.stop())); });
function gate() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

async function fixture(features = true) {
	const child = new EventEmitter() as EventEmitter & { stdin: Writable; stdout: PassThrough; stderr: PassThrough; kill(): boolean }, calls: Record<string, unknown>[] = [];
	child.stdout = new PassThrough(); child.stderr = new PassThrough(); const parser = new JsonFrames();
	child.stdin = new Writable({ write(bytes: Buffer, _encoding, done) {
		parser.push(bytes, request => {
			calls.push(request);
			writeJsonFrame(child.stdout, { id: request.id, result: request.type === 'start' ? { protocol: 2, port: 1234, features: features ? { composition: true, dispatchDeadline: true } : {} } : request.type === 'stop' ? { reclaimed: true } : { epoch: request.epoch, lastDispatchedSequence: 7, transportState: 'open' } });
		}); done();
	} }); child.stdin.on('finish', () => child.emit('close')); child.kill = () => { child.emit('close'); return true; }; synthetic.spawn = () => child;
	const worker = new EventEmitter() as EventEmitter & { postMessage(message: WorkerInit | WorkerRequest): void; kill(): boolean }, entered = gate();
	let release: (() => void) | undefined;
	worker.postMessage = message => {
		if (message.type === 'init') { queueMicrotask(() => worker.emit('message', { type: 'ready', version: `Chrome/${CHROMIUM_VERSION}` } satisfies WorkerResponse)); return; }
		if (message.type === 'control') { release = () => worker.emit('message', { type: 'result', id: message.id } satisfies WorkerResponse); entered.resolve(); }
	}; worker.kill = () => { worker.emit('exit', 0); return true; };
	const runtime = new ManagedRuntime('runtime', 'space', { root: '', executable: '', helper: '', worker: '', manifest: { version: 2, platform: 'linux-x64', chromiumVersion: CHROMIUM_VERSION, executable: '', helper: '', worker: '', files: {}, links: {} } }, '', '', '', false,
		{ app: { getPath: () => '' }, webContents: { fromId: () => undefined }, utilityProcess: { fork: () => worker } }, async () => undefined, () => undefined);
	runtimes.push(runtime); await runtime.start(false);
	return { runtime, calls, entered, release: () => release?.() };
}

it('rejects a legacy helper that cannot enforce composition and per-dispatch deadlines', async () => {
	await expect(fixture(false)).rejects.toMatchObject({ code: 'browser_runtime_capability_missing' });
});

it('delivers native revoke before a stalled Worker and does not report handoff until Worker convergence', async () => {
	const f = await fixture(); let done = false;
	const revoking = f.runtime.setControl(undefined, 1).then(ack => { done = true; return ack; }); await f.entered.promise;
	try {
		expect(f.calls.at(-1)).toMatchObject({ type: 'control', epoch: 1, lease: null });
		await new Promise<void>(resolve => setImmediate(resolve)); expect(done).toBe(false);
	} finally { f.release(); }
	expect(await revoking).toMatchObject({ epoch: 1, lastDispatchedSequence: 7, transportState: 'open' });
});

it('fails a bounded handoff when the Worker cannot converge while the native lease remains revoked', async () => {
	const f = await fixture(); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	const revoking = f.runtime.setControl(undefined, 1), rejected = expect(revoking).rejects.toMatchObject({ code: 'browser_control_unsettled' });
	await f.entered.promise; await vi.advanceTimersByTimeAsync(5000); await rejected;
	const old: ControlLease = { spaceId: 'space', runtimeId: 'runtime', epoch: 0, leaseId: 'old', controllerId: 'agent', mode: 'agent', expiresAt: Number.MAX_SAFE_INTEGER };
	expect(() => f.runtime.execute('page', { kind: 'text' }, old)).toThrow('browser_stale_control');
	f.release(); expect(f.calls.filter(call => call.type === 'control')).toHaveLength(1);
});
