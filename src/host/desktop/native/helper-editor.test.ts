import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { expect, test, vi } from 'vitest';
import { encodeControl, encodeControlBody, encodeInput } from '../../../shared/native/frames';
import { encodeEditorMessage, parseEditorMessage, type EditorMessage, type NativeEditorLaunch } from '../../../shared/native/control-wire';
import { NATIVE_INPUT_LIMITS } from '../../../shared/native/input';
import { PtyHelper } from './helper';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
const instance = '11111111-1111-4111-8111-111111111111';
const enrollment: NativeEditorLaunch = { identity: { runtimeId: 'runtime-original' }, provider: 'pi', recipe: {
	version: 1, profileId: 'pi-fixture', artifactDigest: 'a'.repeat(64),
	executable: { path: '/fixture/node', dev: '1', ino: '2' }, entry: { path: '/fixture/cli.js', dev: '1', ino: '3' },
} };
async function backend(options: { deferSettlement?: boolean; deferReserved?: boolean; deferCancellation?: boolean; terminalFences?: boolean; holdCloseFrame?: boolean; holdProcessExit?: boolean } = {}) {
	const child = new EventEmitter(), stdout = new PassThrough(), stderr = new PassThrough();
	const wires: EditorMessage[] = [], body: Buffer[] = [], rawWrites: Record<string, unknown>[] = [];
 const heldCallbacks: Array<() => void> = [];
	let carry = Buffer.alloc(0);
	const receive = (message: EditorMessage) => { const encoded = encodeEditorMessage(message, 'native-to-node'); stdout.write(encodeControlBody(encoded.body, encoded.byteLength)); };
	const editorId = 'editor-original';
	const stdin = new Writable({ write(bytes: Buffer, _encoding, done) {
		carry = Buffer.concat([carry, bytes]);
		while (carry.length >= 4 && carry.length >= carry.readUInt32BE(0) + 4) {
			const length = carry.readUInt32BE(0), frame = carry.subarray(0, length + 4); carry = carry.subarray(length + 4);
			if (frame[4] === 4) { body.push(Buffer.from(frame.subarray(17))); continue; }
			const raw = JSON.parse(frame.subarray(5).toString()) as Record<string, unknown>;rawWrites.push(raw);
			if (raw.type === 'hello') stdout.write(encodeControl({ type: 'hello', accepted: true, protocol: 3, version: 'external-io-fixture', platform: process.platform, capabilities: { inputAdmission: 1, editorTransactions: 1, ...(options.terminalFences ? { terminalTermination: 1, replySettlement: 1 } : {}) }, inputLimits: NATIVE_INPUT_LIMITS }));
			else if (raw.type === 'spawn') {
				receive({ type: 'editor-ready', version: 1, sid: raw.sid as number, editorId, identity: enrollment.identity, provider: 'pi', profileId: 'pi-fixture', sourceInstance: instance });
				stdout.write(encodeControl({ type: 'spawned', sid: raw.sid, pid: 123 }));
			} else if (typeof raw.type === 'string' && raw.type.startsWith('editor-')) {
				const wire = parseEditorMessage(frame.subarray(5), 'node-to-native'); wires.push(wire);
				if (wire.type === 'editor-begin' && !options.deferReserved) receive({ type: 'editor-state', version: 1, sid: wire.sid, editorId, op: wire.op, state: 'reserved' });
				if (wire.type === 'editor-commit') {
					for (const state of ['queued', 'claimed', 'dispatched'] as const) receive({ type: 'editor-state', version: 1, sid: wire.sid, editorId, op: wire.op, state });
					receive({ type: 'editor-result', version: 1, sid: wire.sid, editorId, op: wire.op, result: { state: 'adapter-applied', effect: 'completed' } });
					if (!options.deferSettlement) receive({ type: 'editor-settled', version: 1, sid: wire.sid, editorId, op: wire.op });
				}
				if (wire.type === 'editor-cancel' && !options.deferCancellation) { receive({ type: 'editor-result', version: 1, sid: wire.sid, editorId, op: wire.op, result: { state: 'none', effect: 'none', reason: 'cancelled' } }); receive({ type: 'editor-settled', version: 1, sid: wire.sid, editorId, op: wire.op }); }
				if (wire.type === 'editor-close') receive({ type: 'editor-closed', version: 1, sid: wire.sid, editorId, reason: 'closed' });
			}
		}
		done();
	} });
 if (options.holdCloseFrame) {
  const write = stdin.write.bind(stdin);
  stdin.write = ((chunk: Uint8Array, callback: (error?: Error | null) => void) => {
   const close = chunk[4] === 1 && (JSON.parse(Buffer.from(chunk).subarray(5).toString()) as { type?: string }).type === 'editor-close';
   const accepted = write(chunk, close ? error => { heldCallbacks.push(() => callback(error)); } : callback);
   return close ? false : accepted;
  }) as typeof stdin.write;
 }
	stdin.on('finish', () => { if (!options.holdProcessExit) { child.emit('exit', 0, null); child.emit('close', 0, null); } });
	vi.mocked(spawn).mockReturnValue(Object.assign(child, { stdin, stdout, stderr, kill: () => { child.emit('exit', 1, null); child.emit('close', 1, null); return true; }, pid: 123 }) as unknown as ChildProcessWithoutNullStreams);
	const events: EditorMessage[] = [];
	const helper = await PtyHelper.start('external-io-fixture', { output() {}, exit() {}, closed() {}, editor: message => events.push(message) }, globalThis as unknown as Window, {});
	return { helper, receive, wires, body, events, editorId, rawWrites,
  processExit: () => { child.emit('exit', 1, null); }, processClose: () => { child.emit('close', 1, null); },
  receiveNative: (message: Record<string, unknown>) => { stdout.write(encodeControl(message)); },
  output: (sid: number, text: string) => { const frame = encodeInput(sid, text);frame[4] = 3;stdout.write(frame); },
  releaseCallbacks: () => { for (const done of heldCallbacks.splice(0)) done(); },
  drain: () => { stdin.emit('drain'); },
 };
}

test('failed helper disposal keeps editor settlement on the non-rejecting physical exit fence before stdio closure', async () => {
 const io = await backend({ deferSettlement: true, holdProcessExit: true });
 await io.helper.spawnSession(1, { file: '/fixture/node', args: [], env: {}, cols: 80, rows: 24, editor: enrollment });
 const binding = io.helper.editorBinding(1)!;await binding.ready;
 const operation = binding.submit('retained until physical process exit', { sourceInstance: instance, remainingMs: 1000 });await operation.finished;
 let settled = false;const physical = operation.settled.catch((error: unknown) => { settled = true;return error; });
 const disposing = io.helper.dispose().catch((error: unknown) => error);
 try {
  await Promise.resolve();expect(settled).toBe(false);expect(io.helper.streamStats.editorOperations).toBe(1);
  expect(io.helper.streamStats.operationBytes).toBe(Buffer.byteLength('retained until physical process exit'));
  expect(io.helper.streamStats.frames).toBeGreaterThan(0);
  io.processExit();expect(await physical).toMatchObject({ failure: { effect: 'unknown', reason: 'transport-lost' } });
  expect(io.helper.streamStats.editorOperations).toBe(0);expect(io.helper.streamStats.operationBytes).toBe(0);
 } finally { io.processClose(); }
 expect(await disposing).toMatchObject({ outcome: { state: 'exited', code: 1, stdioClosed: true } });
 expect(await operation.finished).toMatchObject({ state: 'adapter-applied', effect: 'completed' });
});

test('an early native ready stays with its original enrollment and application completion keeps physical charges until settlement', async () => {
	const io = await backend({ deferSettlement: true });
	try {
		expect(io.helper.editorTransactions).toBe(1);
		await io.helper.spawnSession(1, { file: '/fixture/node', args: ['/fixture/cli.js'], env: {}, cols: 80, rows: 24, editor: enrollment });
		const binding = io.helper.editorBinding(1)!;
		expect(await binding.ready).toMatchObject({ sid: 1, sourceInstance: instance, identity: enrollment.identity });
		const submission = binding.submit('中文完整\n第二行', { sourceInstance: instance, remainingMs: 1000 });
		expect(await submission.queued).toEqual({ op: submission.op, state: 'queued' });
		expect(await submission.finished).toEqual({ op: submission.op, state: 'adapter-applied', effect: 'completed' });
		expect(Buffer.concat(io.body).toString()).toBe('中文完整\n第二行');
		let settled = false; void submission.settled.then(() => { settled = true; });
		await Promise.resolve(); expect(settled).toBe(false);
		expect(io.helper.streamStats.editorOperations).toBe(1);
		io.receive({ type: 'editor-settled', version: 1, sid: 1, editorId: io.editorId, op: submission.op });
		await submission.settled;
		expect(io.helper.streamStats.editorOperations).toBe(0);
		await binding.close(); expect(binding.active).toBe(false);
	} finally { await io.helper.dispose(); }
});


test('cancelled reservation cannot encode a late body while only native owner evidence can prove zero input', async () => {
 const io = await backend({ deferReserved: true, deferCancellation: true });
 try {
  await io.helper.spawnSession(1, { file: '/fixture/node', args: ['/fixture/cli.js'], env: {}, cols: 80, rows: 24, editor: enrollment });
  const binding = io.helper.editorBinding(1)!; await binding.ready;
  const submission = binding.submit('must never be delivered', { sourceInstance: instance, remainingMs: 1000 });
  submission.cancel();
  io.receive({ type: 'editor-state', version: 1, sid: 1, editorId: io.editorId, op: submission.op, state: 'reserved' });
  expect(Buffer.concat(io.body).byteLength).toBe(0);
  expect(io.helper.streamStats.editorOperations).toBe(1);
  io.receive({ type: 'editor-result', version: 1, sid: 1, editorId: io.editorId, op: submission.op, result: { state: 'none', effect: 'none', reason: 'cancelled' } });
  io.receive({ type: 'editor-settled', version: 1, sid: 1, editorId: io.editorId, op: submission.op });
  expect(await submission.finished).toEqual({ op: submission.op, state: 'none', effect: 'none', reason: 'cancelled' });
  await submission.settled;
 } finally { await io.helper.dispose(); }
});

test('raw and editor bodies share byte quota and a deadline cannot repay physical ownership before native settlement', async () => {
 const io = await backend({ deferReserved: true, deferCancellation: true });
 try {
  await io.helper.spawnSession(1, { file: '/fixture/node', args: ['/fixture/cli.js'], env: {}, cols: 80, rows: 24, editor: enrollment });
  const binding = io.helper.editorBinding(1)!;await binding.ready;
  const large = 'x'.repeat(NATIVE_INPUT_LIMITS.operationBytes);
  const a = binding.submit(large, { sourceInstance: instance, remainingMs: 30 });
  const b = binding.submit(large, { sourceInstance: instance, remainingMs: 30 });
  expect(io.helper.streamStats.operationBytes).toBe(NATIVE_INPUT_LIMITS.sessionQueuedBytes);
  expect(await binding.submit('overflow', { sourceInstance: instance, remainingMs: 1000 }).finished).toMatchObject({ state: 'none', reason: 'capacity' });
  expect(await io.helper.submitInput(1, 'raw-overflow').finished).toMatchObject({ state: 'none', reason: 'capacity' });
  expect(await a.finished).toMatchObject({ state: 'unknown', effect: 'unknown', reason: 'timeout' });
  expect(await b.finished).toMatchObject({ state: 'unknown', effect: 'unknown', reason: 'timeout' });
  expect(io.helper.streamStats.operationBytes).toBe(NATIVE_INPUT_LIMITS.sessionQueuedBytes);
  expect(Buffer.concat(io.body).byteLength).toBe(0);
  for (const op of [a, b]) {
   io.receive({ type: 'editor-result', version: 1, sid: 1, editorId: io.editorId, op: op.op, result: { state: 'none', effect: 'none', reason: 'cancelled' } });
   io.receive({ type: 'editor-settled', version: 1, sid: 1, editorId: io.editorId, op: op.op });await op.settled;
   expect(await op.finished).toMatchObject({ state: 'unknown' });
  }
  expect(io.helper.streamStats.operationBytes).toBe(0);expect(io.helper.streamStats.editorOperations).toBe(0);
 } finally { await io.helper.dispose(); }
});

const confirmedTermination = (sid: number) => ({ type: 'terminal-termination', sid, version: 1, sequence: 1, evidence: {
 root: { state: 'exited', code: 0, signal: null }, cleanup: { state: 'confirmed', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 0 }, output: 'drained',
} });
async function ordinaryFences(io: Awaited<ReturnType<typeof backend>>) {
 io.receiveNative({ type: 'exit', sid: 1, code: 0, signal: null });
 io.receiveNative(confirmedTermination(1));
 await vi.waitFor(() => expect(io.rawWrites.some(message => message.type === 'reply-close' && message.sid === 1)).toBe(true));
 io.receiveNative({ type: 'reply-settled', sid: 1 });
}

test('an early editor close still waits for numeric, reply, confirmed cleanup and acknowledged output', async () => {
 const io = await backend({ terminalFences: true });
 try {
  await io.helper.spawnSession(1, { file: '/fixture/node', args: [], env: {}, cols: 80, rows: 24, editor: enrollment });
  const binding = io.helper.editorBinding(1)!;await binding.ready;
  io.output(1, 'held-output');await binding.close();expect(io.helper.editorBinding(1)).toBe(binding);
  await ordinaryFences(io);expect(io.helper.editorBinding(1)).toBe(binding);
  expect(io.helper.streamStats.sessionRoutes).toBe(1);
  io.helper.acknowledge(1, Buffer.byteLength('held-output'));
  expect(io.helper.editorBinding(1)).toBeUndefined();expect(io.helper.streamStats.sessionRoutes).toBe(0);
 } finally { await io.helper.dispose(); }
});

test('ordinary fences plus editor closed cannot return an unsettled operation charge', async () => {
 const io = await backend({ terminalFences: true, deferSettlement: true });
 try {
  await io.helper.spawnSession(1, { file: '/fixture/node', args: [], env: {}, cols: 80, rows: 24, editor: enrollment });
  const binding = io.helper.editorBinding(1)!;await binding.ready;
  const op = binding.submit('physically held operation', { sourceInstance: instance, remainingMs: 1000 });await op.finished;
  const closing = binding.close();await binding.closed;await ordinaryFences(io);
  expect(io.helper.editorBinding(1)).toBe(binding);expect(io.helper.streamStats.editorOperations).toBe(1);
  expect(io.helper.streamStats.operationBytes).toBe(Buffer.byteLength('physically held operation'));
  io.receive({ type: 'editor-settled', version: 1, sid: 1, editorId: io.editorId, op: op.op });
  await op.settled;await closing;
  expect(io.helper.editorBinding(1)).toBeUndefined();expect(io.helper.streamStats.operationBytes).toBe(0);
 } finally { await io.helper.dispose(); }
});

for (const first of ['callback', 'drain'] as const) test(`editor-close frame waits for ${first} and its other local IO fence before retirement`, async () => {
 // This external stdio fixture isolates local writer callback+drain; the real native test covers negotiated terminal fences.
 const io = await backend({ holdCloseFrame: true });
 try {
  await io.helper.spawnSession(1, { file: '/fixture/node', args: [], env: {}, cols: 80, rows: 24, editor: enrollment });
  const binding = io.helper.editorBinding(1)!;await binding.ready;
  const closing = binding.close();await binding.closed;
  let closeDone = false;void closing.then(() => { closeDone = true; });
  await new Promise<void>(resolve => setImmediate(resolve));
  io.receiveNative({ type: 'exit', sid: 1, code: 0, signal: null });
  expect(io.helper.editorBinding(1)).toBe(binding);expect(closeDone).toBe(false);expect(io.helper.streamStats.frames).toBeGreaterThan(0);
  if (first === 'callback') io.releaseCallbacks();else io.drain();
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(io.helper.editorBinding(1)).toBe(binding);expect(closeDone).toBe(false);
  if (first === 'callback') io.drain();else io.releaseCallbacks();
  await closing;expect(io.helper.editorBinding(1)).toBeUndefined();
 } finally { io.releaseCallbacks();io.drain();await io.helper.dispose(); }
});
