import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { expect, test, vi } from 'vitest';
import { encodeControl, encodeControlBody, FrameDecoder, FRAME_CONTROL } from '../../../shared/native/frames';
import { encodeHelperControlBody, parseHelperControlBody, type ControlMessage, type ControlScope } from '../../../shared/native/control-wire';
import type { NativeControlCall } from '../../../shared/native/host';
import { NativeHost } from './host';
import { PtyHelper } from './helper';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

const scope: ControlScope = { vaultId: 'vault', deviceId: 'device', instanceId: 'instance', rootPath: '/fixture', root: { canonicalPath: '/fixture', dev: '1', ino: '2' } };
function fixture(options: { holdProgress?: boolean; holdResult?: boolean; holdUnregister?: boolean; settleResults?: boolean; onWrite?(wire: Record<string, unknown>, fail: () => void): void } = {}) {
	const child = new EventEmitter(), stdout = new PassThrough(), stderr = new PassThrough(),
		decoder = new FrameDecoder(undefined, parseHelperControlBody), sent: Record<string, unknown>[] = [];
	const held: Array<() => void> = [];
	let helper: PtyHelper | undefined;
	const receive = (wire: ControlMessage) => {
		const encoded = encodeHelperControlBody(wire);
		stdout.write(encodeControlBody(encoded.body, encoded.byteLength));
	};
	const stdin = new Writable({ write(chunk: Buffer, _encoding, done) {
		for (const frame of decoder.push(chunk)) if (frame.kind === FRAME_CONTROL) {
			const wire = frame.message;
			sent.push(wire);
			options.onWrite?.(wire, () => { child.emit('error', new Error('Synchronous controlled write failure')); child.emit('exit', 1, null); child.emit('close', 1, null); });
			if (wire.type === 'hello') stdout.write(encodeControl({ type: 'hello', accepted: true, protocol: 3, pid: 123, version: 'io-fixture', capabilities: { localControl: 1 } }));
			if (wire.type === 'control-register') receive({ type: 'control-registered', controlId: wire.controlId as string, endpoint: '/fixture/socket', locator: '/fixture/locator' });
			if (wire.type === 'control-result' && options.settleResults !== false) receive({ type: 'control-settled', controlId: wire.controlId as string, bridgeId: wire.bridgeId as string });
			if (wire.type === 'control-unregister' && !options.holdUnregister) receive({ type: 'control-unregistered', controlId: wire.controlId as string });
			if (wire.type === 'cookies') stdout.write(encodeControl({ type: 'cookies-result', rid: wire.rid, ok: true, data: { rows: [] } }));
		}
		if ((options.holdProgress && sent.at(-1)?.type === 'control-progress') || (options.holdResult && sent.at(-1)?.type === 'control-result')) held.push(done);
		else done();
	}, highWaterMark: 1 });
	stdin.on('finish', () => { child.emit('exit', 0, null); child.emit('close', 0, null); });
	vi.mocked(spawn).mockReturnValue(Object.assign(child, { stdin, stdout, stderr, kill: vi.fn(), pid: 123 }) as unknown as ChildProcessWithoutNullStreams);
	const host = new NativeHost(async events => (helper = await PtyHelper.start('controlled-io', events, globalThis as unknown as Window, {})));
	return { host, receive, sent, get helper() { return helper!; }, releaseProgress: () => { options.holdProgress = false; options.holdResult = false; for (const done of held.splice(0)) done(); } };
}

test('a captured PTY lease registers same-generation control and synchronously forwards a captured call', async () => {
	const io = fixture(), browser = await io.host.acquire('cookies'), pty = await io.host.acquire('pty');
	try {
		expect(typeof pty.acquireControl).toBe('function');
		const control = await pty.acquireControl!();
		let call: NativeControlCall | undefined;
		const registration = await control.registerControl!(scope, { forward(value) { call = value; }, closed() {} });
		expect(registration.current(pty)).toBe(true);
		io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: 'bridge', request: { protocolVersion: 1, requestId: 'external', operation: 'space.list' } });
		expect(call?.wire.request.requestId).toBe('external');
		expect(registration.admit(call!)).toBe(true);
		expect(registration.admit(call!)).toBe(false);
		await registration.result(call!, { protocolVersion: 1, requestId: 'external', operation: 'space.list', ok: true, phase: 'listed', effect: 'none', data: [] });
		expect(io.sent.filter(x => x.type === 'control-admitted')).toHaveLength(1);
		expect(io.sent.filter(x => x.type === 'control-result')).toHaveLength(1);
		await registration.close();
		expect(registration.current(pty)).toBe(false);
		await expect(browser.value.request('cookies', 'read', {})).resolves.toEqual({ rows: [] });
		await control.release();
	} finally {
		await pty.release();
		await browser.release();
		await io.host.dispose();
	}
});


test('a synchronous progress burst retains only one inflight and one latest pending observation', async () => {
	const io = fixture({ holdProgress: true }), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	let registration: Awaited<ReturnType<NonNullable<typeof control.registerControl>>> | undefined;
	try {
		let call: NativeControlCall | undefined;
		registration = await control.registerControl!(scope, { forward(value) { call = value; }, closed() {} });
		io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: 'progress-bridge', request: { protocolVersion: 1, requestId: 'progress', operation: 'terminal.start', target: { spaceId: 'space' } } });
		expect(registration.admit(call!)).toBe(true);
		await new Promise<void>(resolve => setImmediate(resolve));
		expect(registration.progress(call!, { phase: 'record-saved', effect: 'partial', target: { sessionId: 'first' } })).toBe(true);
		for (let i = 0; i < 1000; i++) expect(registration.progress(call!, { phase: 'launch-pending', effect: 'partial', target: { sessionId: `latest-${i}` } })).toBe(true);
		expect(io.host.controlStats.frames).toBeLessThanOrEqual(3);
		io.releaseProgress();
		await new Promise<void>(resolve => setImmediate(resolve));
		const progress = io.sent.filter(x => x.type === 'control-progress');
		expect(progress).toHaveLength(2);
		expect(progress.at(-1)).toMatchObject({ progress: { target: { sessionId: 'latest-999' }, effect: 'partial' } });
		await registration.result(call!, { protocolVersion: 1, requestId: 'progress', operation: 'terminal.start', ok: true, phase: 'running', effect: 'completed' });
	} finally {
		io.releaseProgress();
		await io.host.dispose();
	}
});


test('synchronous stream reentry cannot admit the same call twice or accept a call after generation failure', async () => {
	let reenter: (() => void) | undefined, failAdmission = false;
	const io = fixture({ onWrite(wire, fail) {
		if (wire.type !== 'control-admitted') return;
		const nested = reenter; reenter = undefined; nested?.();
		if (failAdmission) fail();
	} }), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	try {
		const calls: NativeControlCall[] = [];
		const registration = await control.registerControl!(scope, { forward: call => calls.push(call), closed() {} });
		const request = (id: string) => io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: id, request: { protocolVersion: 1, requestId: id, operation: 'space.list' } });
		request('reentry');
		let nested: boolean | undefined;
		reenter = () => { nested = registration.admit(calls[0]!); };
		expect(registration.admit(calls[0]!)).toBe(true);
		expect(nested).toBe(false);
		expect(io.sent.filter(wire => wire.type === 'control-admitted')).toHaveLength(1);
		request('failure'); failAdmission = true;
		expect(registration.admit(calls[1]!)).toBe(false);
	} finally { await expect(io.host.dispose()).rejects.toMatchObject({ outcome: { state: 'exited', code: 1 } }); }
});


const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const success = (call: NativeControlCall) => ({ protocolVersion: 1 as const, requestId: call.wire.request.requestId, operation: call.wire.request.operation, ok: true as const, phase: 'completed' as const, effect: 'none' as const });

test('native settled cannot release a call before the actual final callback and drain', async () => {
	const io = fixture({ holdResult: true }), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	try {
		let call: NativeControlCall | undefined;
		const registration = await control.registerControl!(scope, { forward: value => { call = value; }, closed() {} });
		io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: 'held-result', request: { protocolVersion: 1, requestId: 'external', operation: 'space.list' } });
		expect(registration.admit(call!)).toBe(true); await tick();
		let done = false;
		const result = registration.result(call!, success(call!)).then(() => { done = true; });
		await tick();
		expect(done).toBe(false); expect(io.host.controlStats.calls).toBe(1);
		expect(io.sent.filter(wire => wire.type === 'control-result')).toHaveLength(1);
		io.releaseProgress(); await result; await tick();
		expect(io.host.controlStats.calls).toBe(0);
		await registration.close();
	} finally { io.releaseProgress(); await io.host.dispose(); }
});

test('cancel, release and local result keep all sixteen original slots until native settled; Browser remains usable', async () => {
	const io = fixture({ settleResults: false }), browser = await io.host.acquire('cookies'), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	try {
		const calls: NativeControlCall[] = [], cancelled: NativeControlCall[] = [];
		const registration = await control.registerControl!(scope, { forward: value => calls.push(value), cancel: call => cancelled.push(call), closed() {} });
		for (let i = 0; i < 16; i++) io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: `slot-${i}`, request: { protocolVersion: 1, requestId: `external-${i}`, operation: i < 14 ? 'terminal.start' : i === 14 ? 'space.list' : 'terminal.stop', ...(i < 14 ? { target: { spaceId: 'space' } } : i === 15 ? { target: { sessionId: 'session' } } : {}) } });
		expect(io.host.controlStats).toMatchObject({ calls: 16, peak: 16 });
		for (const call of calls) expect(registration.admit(call)).toBe(true);
		io.receive({ type: 'control-cancel', controlId: registration.route.controlId, bridgeId: 'slot-0', reason: 'disconnected' });
		expect(calls[0]!.signal.aborted).toBe(true); expect(cancelled).toEqual([calls[0]]);
		expect(io.host.controlStats.calls).toBe(16);
		let released = false;
		const release = control.release().then(() => { released = true; });
		expect(registration.current(pty)).toBe(false);
		expect(registration.progress(calls[0]!, { phase: 'launch-pending', effect: 'partial' })).toBe(false);
		await expect(control.registerControl!(scope, { forward() {}, closed() {} })).rejects.toThrow('closed');
		const other = await pty.acquireControl!();
		await expect(other.registerControl!(scope, { forward() {}, closed() {} })).rejects.toMatchObject({ code: 'BUSY' });
		await Promise.all(calls.map(call => registration.result(call, success(call))));
		await tick(); expect(released).toBe(false); expect(io.host.controlStats.calls).toBe(16);
		await expect(browser.value.request('cookies', 'read', {})).resolves.toEqual({ rows: [] });
		for (const call of calls) io.receive({ type: 'control-settled', controlId: registration.route.controlId, bridgeId: call.wire.bridgeId });
		await release; expect(io.host.controlStats.calls).toBe(0);
		const next = await other.registerControl!(scope, { forward() {}, closed() {} });
		await expect(next.result(calls[0]!, success(calls[0]!))).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
		await next.close(); await other.release();
		await expect(browser.value.request('cookies', 'read', {})).resolves.toEqual({ rows: [] });
	} finally { await io.host.dispose(); }
});

test('private lease and call identities reject structural copies, foreign hosts and a released captured PTY without restarting', async () => {
	const io = fixture(), pty = await io.host.acquire('pty'), control = await pty.acquireControl!(), browser = await io.host.acquire('cookies');
	try {
		let call: NativeControlCall | undefined;
		const registration = await control.registerControl!(scope, { forward: value => { call = value; }, closed() {} });
		expect(registration.current({ ...pty })).toBe(false); expect(registration.current(browser)).toBe(false);
		const foreign = fixture(), foreignPty = await foreign.host.acquire('pty');
		try { expect(registration.current(foreignPty)).toBe(false); } finally { await foreign.host.dispose(); }
		io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: 'owned', request: { protocolVersion: 1, requestId: 'external', operation: 'space.list' } });
		expect(registration.admit({ ...call! })).toBe(false);
		await expect(registration.result({ ...call! }, success(call!))).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
		await pty.release(); const starts = vi.mocked(spawn).mock.calls.length;
		expect(registration.current(pty)).toBe(false);
		await expect(pty.acquireControl!()).rejects.toMatchObject({ code: 'CONNECTION_UNAVAILABLE' });
		expect(vi.mocked(spawn).mock.calls).toHaveLength(starts);
		await registration.result(call!, success(call!));
		await expect(registration.result(call!, success(call!))).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
		await registration.close();
		await expect(browser.value.request('cookies', 'read', {})).resolves.toEqual({ rows: [] });
	} finally { await io.host.dispose(); }
});

test('failed progress replacement preserves the last valid effect and target without throwing into business work', async () => {
	const io = fixture({ holdProgress: true }), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	try {
		let call: NativeControlCall | undefined;
		const registration = await control.registerControl!(scope, { forward: value => { call = value; }, closed() {} });
		io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: 'replacement', request: { protocolVersion: 1, requestId: 'external', operation: 'terminal.start', target: { spaceId: 'space' } } });
		expect(registration.admit(call!)).toBe(true); await tick();
		expect(registration.progress(call!, { phase: 'record-saved', effect: 'partial', target: { sessionId: 'first' } })).toBe(true);
		expect(registration.progress(call!, { phase: 'launch-pending', effect: 'partial', target: { sessionId: 'latest' } })).toBe(true);
		expect(registration.progress(call!, { phase: 'launch-pending', effect: 'unknown', target: { sessionId: 'x'.repeat(9000) } })).toBe(false);
		expect(io.host.controlStats).toMatchObject({ calls: 1, diagnostics: 1 });
		await expect(registration.result(call!, success(call!))).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
		io.releaseProgress(); await tick();
		expect(io.sent.filter(wire => wire.type === 'control-progress').at(-1)).toMatchObject({ progress: { effect: 'partial', target: { sessionId: 'latest' } } });
		await registration.result(call!, { ...success(call!), effect: 'completed' });
		await registration.close();
	} finally { io.releaseProgress(); await io.host.dispose(); }
});

test('missing physical unregister confirmation returns typed unknown and retains closing BUSY without disrupting Browser', async () => {
	const io = fixture({ holdUnregister: true }), browser = await io.host.acquire('cookies'), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	try {
		const registration = await control.registerControl!(scope, { forward() {}, closed() {} });
		const close = registration.close();
		expect(registration.current(pty)).toBe(false);
		await expect(close).rejects.toMatchObject({ code: 'EFFECT_UNKNOWN', effect: 'unknown' });
		expect(io.host.controlStats.phase).toBe('closing');
		await expect(control.registerControl!(scope, { forward() {}, closed() {} })).rejects.toMatchObject({ code: 'BUSY' });
		await expect(browser.value.request('cookies', 'read', {})).resolves.toEqual({ rows: [] });
		io.receive({ type: 'control-unregistered', controlId: registration.route.controlId });
		await tick(); expect(io.host.controlStats.phase).toBeUndefined();
		const next = await control.registerControl!(scope, { forward() {}, closed() {} });
		const nextClose = next.close();
		io.receive({ type: 'control-unregistered', controlId: next.route.controlId });
		await nextClose;
	} finally { await io.host.dispose(); }
});


test('an unsolicited unregister receipt cannot confirm a later close', async () => {
	const io = fixture({ holdUnregister: true }), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	try {
		const registration = await control.registerControl!(scope, { forward() {}, closed() {} });
		io.receive({ type: 'control-unregistered', controlId: registration.route.controlId });
		let done = false;
		const close = registration.close().then(() => { done = true; });
		await tick(); expect(done).toBe(false); expect(io.host.controlStats.phase).toBe('closing');
		io.receive({ type: 'control-unregistered', controlId: registration.route.controlId });
		await close;
	} finally { await io.host.dispose(); }
});

test('a callback failure after a trusted input receipt preserves completed input and the original target', async () => {
	const io = fixture(), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	let registration: Awaited<ReturnType<NonNullable<typeof control.registerControl>>> | undefined;
	try {
		registration = await control.registerControl!(scope, { forward(call) {
			expect(registration!.admit(call)).toBe(true);
			expect(registration!.progress(call, { phase: 'input-submitted', effect: 'completed', target: { sessionId: 'original', runtimeId: 'original-run' }, data: { receipt: { kind: 'adapter-applied', op: 7 } } })).toBe(true);
			throw new Error('controlled business callback failure');
		}, closed() {} });
		io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: 'receipt-bridge', request: { protocolVersion: 1, requestId: 'receipt-request', operation: 'agent.prompt', target: { sessionId: 'original' }, params: { text: 'already submitted' } } });
		await new Promise<void>(resolve => setImmediate(resolve));
		expect(io.sent.find(wire => wire.type === 'control-result')).toMatchObject({ response: {
			ok: false, effect: 'completed', target: { sessionId: 'original', runtimeId: 'original-run' }, data: { receipt: { kind: 'adapter-applied', op: 7 } },
		} });
		await registration.close();
	} finally { await control.release(); await pty.release(); await io.host.dispose(); }
});

test('cancelling an admitted read-only wait reports none independently from its ordinary transport pool', async () => {
	const io = fixture(), pty = await io.host.acquire('pty'), control = await pty.acquireControl!();
	let call: NativeControlCall | undefined;
	const registration = await control.registerControl!(scope, { forward(value) { call = value; }, closed() {} });
	try {
		io.receive({ type: 'control-request', controlId: registration.route.controlId, bridgeId: 'wait-bridge', request: { protocolVersion: 1, requestId: 'read-only-wait', operation: 'agent.wait', target: { sessionId: 'original', runtimeId: 'run' }, params: { state: 'done' } } });
		expect(registration.admit(call!)).toBe(true);
		io.receive({ type: 'control-cancel', controlId: registration.route.controlId, bridgeId: 'wait-bridge', reason: 'cancelled' });
		expect((call!.signal.reason as { effect: string }).effect).toBe('none');
	} finally {
		if (call) await registration.result(call, { protocolVersion: 1, requestId: 'read-only-wait', operation: 'agent.wait', ok: false, phase: 'cancelled', effect: 'none', error: { code: 'WAIT_CANCELLED', message: 'Observation ended' } });
		await registration.close(); await control.release(); await pty.release(); await io.host.dispose();
	}
});
