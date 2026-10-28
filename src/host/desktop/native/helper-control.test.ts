import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { expect, test, vi } from 'vitest';
import fixture from '../../../../test/fixtures/native/control-v1.json';
import { encodeControl, encodeControlBody, FrameDecoder, FRAME_CONTROL } from '../../../shared/native/frames';
import { CONTROL_LIMITS, encodeHelperControlBody, parseHelperControlBody, type ControlMessage, type ControlProgressMessage } from '../../../shared/native/control-wire';
import { BoundedHelperWriter, PtyHelper } from './helper';
import { NativeShutdownError } from '../../../shared/native/host';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

function shutdownProcess(options: { protocol?: number; noHello?: boolean; noPid?: boolean } = {}) {
	const child = new EventEmitter(), stdout = new PassThrough(), stderr = new PassThrough();
	const closed = vi.fn(), kill = vi.fn(() => true);
	const stdin = new Writable({ write(_chunk, _encoding, done) {
		if (!options.noHello) stdout.write(encodeControl({ type: 'hello', accepted: true, protocol: options.protocol ?? 3, pid: 123, version: 'shutdown-fixture' }));
		done();
	} });
	vi.mocked(spawn).mockReturnValue(Object.assign(child, { stdin, stdout, stderr, kill, pid: options.noPid ? undefined : 123 }) as unknown as ChildProcessWithoutNullStreams);
	const starting = PtyHelper.start('shutdown-fixture', { output() {}, exit() {}, closed }, globalThis as unknown as Window, {});
	return { child, stdout, stderr, stdin, closed, kill, starting, exit(code: number | null, signal: string | null = null) { child.emit('exit', code, signal); }, close(code: number | null = 0, signal: string | null = null) { child.emit('close', code, signal); } };
}

test('a no-pid spawn error proves no process but still waits for real stdio close', async () => {
	const io = shutdownProcess({ noHello: true, noPid: true }), original = new Error('controlled spawn ENOENT');
	let settled = false;
	const failure = io.starting.catch((error: unknown) => { settled = true; return error; });
	io.child.emit('error', original);
	await new Promise<void>(resolve => setImmediate(resolve));
	const premature = settled;
	io.close();
	const error = await failure;
	expect(premature).toBe(false);
	expect(error).toBeInstanceOf(Error);
	expect(String(error)).toContain('controlled spawn ENOENT');
	expect(error).toBe(original);
});

test('normal shutdown waits for late stdio and warnings alone are not failure; repeated dispose shares one result', async () => {
	const io = shutdownProcess(), helper = await io.starting;
	const end = vi.spyOn(io.stdin, 'end');
	const closing = helper.dispose();
	expect(helper.dispose()).toBe(closing);expect(helper.alive).toBe(false);
	let settled = false;void closing.then(() => { settled = true; });
	io.exit(0);io.stderr.write('late normal warning');
	await Promise.resolve();expect(settled).toBe(false);
	io.close();await closing;
	expect(io.closed).toHaveBeenCalledTimes(1);expect(end).toHaveBeenCalledTimes(1);expect(io.kill).not.toHaveBeenCalled();
});

test.each([[1, null], [null, 'SIGTERM'], [null, null]] as const)('abnormal helper exit %s/%s remains typed and immutable after repeated disposal', async (code, signal) => {
	const io = shutdownProcess(), helper = await io.starting;
	const closing = helper.dispose(), failure = closing.catch((error: unknown) => error);
	io.exit(code, signal);io.stderr.write('x'.repeat(6000) + '\nlate cleanup diagnostic');io.close(code, signal);
	const error = await failure;expect(error).toBeInstanceOf(NativeShutdownError);
	const shutdown = error as NativeShutdownError;
	expect(shutdown.outcome).toMatchObject({ state: 'exited', code, signal, forced: false, stdioClosed: true });
	expect(shutdown.outcome.diagnostic).toHaveLength(4000);expect(shutdown.outcome.diagnostic.endsWith('late cleanup diagnostic')).toBe(true);
	expect(Object.isFrozen(shutdown.outcome)).toBe(true);expect(helper.dispose()).toBe(closing);
	await expect(helper.dispose()).rejects.toBe(error);expect(await shutdown.termination).toMatchObject({ state: 'exited', code, signal });
});

test('forced signal and no-exit observation retain the original bounded disposal and physical fence', async () => {
	for (const exits of [true, false]) {
		const io = shutdownProcess(), helper = await io.starting;
		vi.useFakeTimers();
		try {
			if (exits) io.kill.mockImplementation(() => { io.exit(null, 'SIGTERM');io.close(null, 'SIGTERM');return true; });
			const closing = helper.dispose(), failure = closing.catch((error: unknown) => error);
			await vi.advanceTimersByTimeAsync(exits ? 4000 : 5000);
			const error = await failure as NativeShutdownError;
			expect(error).toBeInstanceOf(NativeShutdownError);
			expect(error.outcome).toMatchObject({ state: exits ? 'exited' : 'unconfirmed', forced: true, signal: exits ? 'SIGTERM' : null });
			expect(io.kill).toHaveBeenCalledTimes(1);expect(helper.dispose()).toBe(closing);
			if (!exits) {
				let physical = false;void error.termination.then(() => { physical = true; });
				await Promise.resolve();expect(physical).toBe(false);
				io.exit(0);io.close();await error.termination;
				expect(error.outcome.state).toBe('unconfirmed');await expect(helper.dispose()).rejects.toBe(error);
			}
		} finally { vi.useRealTimers(); }
	}
});

test('exit without stdio close and no-pid error without close remain accurate bounded failures', async () => {
	for (const noPid of [false, true]) {
		const io = shutdownProcess({ noHello: noPid, noPid });
		const startup = noPid ? io.starting.catch((error: unknown) => error) : undefined;
		const helper = noPid ? undefined : await io.starting;
		vi.useFakeTimers();
		try {
			if (noPid) io.child.emit('error', new Error('original no-pid startup failure'));
			const failure = helper?.dispose().catch((error: unknown) => error);
			if (!noPid) io.exit(0);
			await vi.advanceTimersByTimeAsync(5000);
			const error = noPid ? await startup : await failure;
			const cleanup = noPid ? (error as AggregateError).errors[1] as NativeShutdownError : error as NativeShutdownError;
			expect(cleanup).toBeInstanceOf(NativeShutdownError);
			expect(cleanup.outcome).toMatchObject({ state: noPid ? 'not-started' : 'exited', stdioClosed: false, forced: false });
			expect(io.kill).not.toHaveBeenCalled();io.close();
		} finally { vi.useRealTimers(); }
	}
});

test('protocol startup failure and abnormal cleanup both survive without replacing the original error', async () => {
	const io = shutdownProcess({ protocol: 2 });
	const failure = io.starting.catch((error: unknown) => error);
	io.exit(2);io.stderr.write('cleanup after incompatible handshake');io.close(2);
	const error = await failure as AggregateError;
	expect(error).toBeInstanceOf(AggregateError);expect(String(error.errors[0])).toContain('speaks protocol 2');
	expect(error.errors[1]).toBeInstanceOf(NativeShutdownError);expect((error.errors[1] as NativeShutdownError).outcome.code).toBe(2);
	expect(error.cause).toBe(error.errors[0]);
});

async function receivingHelper() {
	const child = new EventEmitter(), stdout = new PassThrough(), stderr = new PassThrough(), decoder = new FrameDecoder(undefined, parseHelperControlBody);
	const controls: ControlMessage[] = [], closed: string[] = [];
	const stdin = new Writable({ write(chunk: Buffer, _encoding, done) {
		for (const frame of decoder.push(chunk)) if (frame.kind === FRAME_CONTROL && frame.message.type === 'hello')
			stdout.write(encodeControl({ type: 'hello', accepted: true, protocol: 3, pid: 12, version: 'controlled-io', capabilities: { localControl: 1 } }));
		done();
	} });
	stdin.on('finish', () => { child.emit('exit', 0, null); child.emit('close', 0, null); });
	const kill = vi.fn(() => { child.emit('exit', 1, null); child.emit('close', 1, null); return true; });
	vi.mocked(spawn).mockReturnValue(Object.assign(child, { stdout, stderr, stdin, kill, pid: 12 }) as unknown as ChildProcessWithoutNullStreams);
	const helper = await PtyHelper.start('controlled-io', { output() {}, exit() {}, closed: reason => closed.push(reason), control: wire => controls.push(wire) }, globalThis as unknown as Window, {});
	return { helper, stdout, controls, closed, kill };
}

for (const row of fixture.cases.filter(row => row.kind === 'helper' && !row.valid)) test(`the production helper rejects shared raw fixture: ${row.name}`, async () => {
	const io = await receivingHelper();
	try {
		const body = new TextEncoder().encode(row.json), frame = encodeControlBody(body, body.length);
		for (let at = 0; at < frame.length && io.helper.alive; at += 3) io.stdout.write(frame.subarray(at, at + 3));
		expect(io.helper.alive).toBe(false);
		expect(io.controls).toEqual([]);
		expect(io.closed).toHaveLength(1);
		expect(io.kill).toHaveBeenCalledOnce();
	} finally { await expect(io.helper.dispose()).rejects.toMatchObject({ outcome: { state: 'exited', code: 1 } }); }
});

test('the production raw hook rejects malformed UTF8 but keeps legal large legacy history and deep Cookie bodies', async () => {
	const io = await receivingHelper();
	try {
		const history = new TextEncoder().encode(JSON.stringify({ type: 'history-result', rid: 'not-pending', data: 'x'.repeat(2 * 1024 * 1024) }));
		io.stdout.write(encodeControlBody(history, history.length));
		let nested: unknown = null;
		for (let depth = 0; depth < 60; depth++) nested = { nested };
		const cookie = new TextEncoder().encode(JSON.stringify({ type: 'cookies-result', rid: 'not-pending', data: nested }));
		io.stdout.write(encodeControlBody(cookie, cookie.length));
		expect(io.helper.alive).toBe(true);
		const row = fixture.cases.find(row => row.name === 'request forward')!;
		const body = new TextEncoder().encode(row.json);
		io.stdout.write(encodeControlBody(body, body.length));
		expect(io.controls).toHaveLength(1);
		io.stdout.write(encodeControlBody(new Uint8Array([192, 175]), 2));
		expect(io.helper.alive).toBe(false);
	} finally { await expect(io.helper.dispose()).rejects.toMatchObject({ outcome: { state: 'exited', code: 1 } }); }
});

class ControlledWritable extends EventEmitter {
	readonly writes: Uint8Array[] = [];
	readonly callbacks: Array<(error?: Error) => void> = [];
	accept = false;
	write(bytes: Uint8Array, callback: (error?: Error | null) => void): boolean {
		this.writes.push(bytes.slice()); this.callbacks.push(callback); return this.accept;
	}
}
const progress = (sessionId: string): ControlProgressMessage => ({ type: 'control-progress', controlId: 'captured', bridgeId: 'bridge', progress: { phase: 'record-saved', effect: 'partial', target: { sessionId } } });
const stageCap = CONTROL_LIMITS.stageBytes + CONTROL_LIMITS.wrapperBytes + 5;
const frameBody = (wire: ControlMessage) => { const encoded = encodeHelperControlBody(wire); return encodeControlBody(encoded.body, encoded.byteLength); };

test('write false is handed once and charges remain until callback and drain both settle in either order', async () => {
	for (const callbackFirst of [true, false]) {
		const stream = new ControlledWritable(), writer = new BoundedHelperWriter(stream, error => { throw error; });
		const frame = writer.prepare(stageCap, 'broker-stage', 'bridge', () => frameBody(progress('first')));
		const promise = frame.settled;
		expect(frame.send()).toBe(true); expect(stream.writes).toHaveLength(1);
		expect(frame.replace?.(progress('late'))).toBe(false);
		if (callbackFirst) stream.callbacks[0]!(); else stream.emit('drain');
		expect(writer.stats.frames).toBe(1);
		if (callbackFirst) stream.emit('drain'); else stream.callbacks[0]!();
		await promise;
		expect(writer.stats).toMatchObject({ frames: 0, bytes: 0 });
		stream.emit('drain'); expect(stream.writes).toHaveLength(1);
	}
});

test('a pending progress permit and promise survive replacement failures while only the last valid observation is sent', async () => {
	const stream = new ControlledWritable(), writer = new BoundedHelperWriter(stream, error => { throw error; });
	let known = progress('known');
	const frame = writer.prepare(stageCap, 'broker-stage', 'bridge', replacement => {
		const next = (replacement ?? known) as ControlProgressMessage, bytes = frameBody(next); known = next; return bytes;
	});
	const promise = frame.settled;
	for (let i = 0; i < 1000; i++) expect(frame.replace?.(progress(`latest-${i}`))).toBe(true);
	expect(frame.settled).toBe(promise);
	expect(writer.stats).toMatchObject({ frames: 1, bytes: stageCap });
	expect(() => frame.replace?.(progress('x'.repeat(CONTROL_LIMITS.stageBytes)))).toThrow();
	expect(frame.settled).toBe(promise);
	expect(writer.stats).toMatchObject({ frames: 1, bytes: stageCap });
	expect(stream.writes).toEqual([]);
	frame.send();
	const decoded = new FrameDecoder(undefined, parseHelperControlBody).push(stream.writes[0]!);
	expect(decoded).toMatchObject([{ message: { progress: { target: { sessionId: 'latest-999' }, effect: 'partial' } } }]);
	stream.callbacks[0]!(); stream.emit('drain'); await promise;
});

test('sixteen final frames and forty-eight stages reserve independent conservative pools before codec work', async () => {
	const stream = new ControlledWritable(), writer = new BoundedHelperWriter(stream, () => undefined), frames = [];
	const finalCap = CONTROL_LIMITS.responseBytes + CONTROL_LIMITS.wrapperBytes + 5;
	for (let i = 0; i < 16; i++) frames.push(writer.prepare(finalCap, 'broker-final', `b${i}`, () => frameBody({ type: 'control-result', controlId: 'control', bridgeId: `b${i}`, response: { protocolVersion: 1, requestId: 'external', operation: 'space.list', ok: true, phase: 'listed', effect: 'none', data: '\u0001'.repeat(8000) } })));
	expect(writer.stats.bytes).toBe(CONTROL_LIMITS.finalPoolBytes);
	let encoded = false;
	expect(() => writer.prepare(finalCap, 'broker-final', 'overflow', () => { encoded = true; return new Uint8Array(); })).toThrow(/pool is full/);
	expect(encoded).toBe(false);
	for (let i = 0; i < 48; i++) frames.push(writer.prepare(stageCap, 'broker-stage', `s${i}`, () => frameBody(progress(`s${i}`))));
	expect(writer.stats.bytes).toBe(CONTROL_LIMITS.finalPoolBytes + CONTROL_LIMITS.stagePoolBytes);
	expect(() => writer.prepare(stageCap, 'broker-stage', 'overflow', () => new Uint8Array())).toThrow(/pool is full/);
	for (const frame of frames) frame.cancel();
	await Promise.allSettled(frames.map(frame => frame.settled));
	expect(writer.stats).toMatchObject({ frames: 0, bytes: 0 });
});


test('a synchronous write callback failure rejects its frame and cannot retain an ended writer charge', async () => {
	const stream = new ControlledWritable();
	stream.write = (bytes, callback) => { stream.writes.push(bytes.slice()); callback(new Error('sync callback failure')); return false; };
	let writer: BoundedHelperWriter;
	const failures: Error[] = [];
	writer = new BoundedHelperWriter(stream, error => { failures.push(error); writer.close(); });
	const frame = writer.prepare(stageCap, 'broker-stage', 'bridge', () => frameBody(progress('first')));
	expect(frame.send()).toBe(false);
	await expect(frame.settled).rejects.toThrow('writer closed');
	expect(failures).toHaveLength(1);
	expect(writer.stats).toMatchObject({ frames: 0, bytes: 0 });
	stream.emit('drain'); expect(stream.writes).toHaveLength(1);
});


test('bridge FIFO spans stage and final wheel turns while the old control, reply and user lanes retain turns', async () => {
	const stream = new ControlledWritable(), writer = new BoundedHelperWriter(stream, () => undefined);
	const initial = writer.prepare(stageCap, 'broker-stage', 'initial', () => frameBody(progress('initial')));
	initial.send();
	const admitted = writer.prepare(stageCap, 'broker-stage', 'bridge', () => frameBody({ type: 'control-admitted', controlId: 'captured', bridgeId: 'bridge', progress: { phase: 'admitted', effect: 'none' } }));
	const final = writer.prepare(CONTROL_LIMITS.responseBytes + CONTROL_LIMITS.wrapperBytes + 5, 'broker-final', 'bridge', () => frameBody({ type: 'control-result', controlId: 'captured', bridgeId: 'bridge', response: { protocolVersion: 1, requestId: 'external', operation: 'space.list', ok: true, phase: 'listed', effect: 'none' } }));
	admitted.send(); final.send();
	for (const [lane, byte] of [['control', 201], ['reply', 202], ['user', 203]] as const) expect(writer.enqueue(new Uint8Array([byte]), lane, 7)).toBe(true);
	for (let n = 0; n < 5; n++) { stream.callbacks[n]!(); stream.emit('drain'); }
	stream.callbacks[5]!(); stream.emit('drain');
	await Promise.all([initial.settled, admitted.settled, final.settled]);
	const control = stream.writes.filter(bytes => bytes.length > 1).flatMap(bytes => new FrameDecoder(undefined, parseHelperControlBody).push(bytes));
	expect(control.map(frame => frame.kind === FRAME_CONTROL ? frame.message.type : '')).toEqual(['control-progress', 'control-admitted', 'control-result']);
	for (const byte of [201, 202, 203]) expect(stream.writes.some(bytes => bytes.length === 1 && bytes[0] === byte)).toBe(true);
	expect(writer.stats).toMatchObject({ frames: 0, bytes: 0 });
});

test('the helper exposes its captured spawn environment without reading later process state', async () => {
	const saved = process.env.HUHU_FIXTURE_SPAWN_EPOCH;
	process.env.HUHU_FIXTURE_SPAWN_EPOCH = 'captured';
	const io = await receivingHelper();
	try {
		process.env.HUHU_FIXTURE_SPAWN_EPOCH = 'later';
		expect(typeof io.helper.spawnEnvironment).toBe('function');
		const snapshot = io.helper.spawnEnvironment({ HUHU_FIXTURE_OVERRIDE: 'selected' });
		expect(snapshot.values.HUHU_FIXTURE_SPAWN_EPOCH).toBe('captured');
		expect(snapshot.values.HUHU_FIXTURE_OVERRIDE).toBe('selected');
		expect(Object.isFrozen(snapshot)).toBe(true);
		expect(Object.isFrozen(snapshot.values)).toBe(true);
		const descriptor = vi.mocked(spawn).mock.calls.at(-1)![2]!;
		expect(descriptor.env?.HUHU_FIXTURE_SPAWN_EPOCH).toBe('captured');
	} finally {
		if (saved === undefined) delete process.env.HUHU_FIXTURE_SPAWN_EPOCH;
		else process.env.HUHU_FIXTURE_SPAWN_EPOCH = saved;
		await io.helper.dispose();
	}
});
