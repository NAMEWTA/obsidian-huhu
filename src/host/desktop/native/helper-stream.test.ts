import { EventEmitter } from 'node:events';
import { expect, test, vi } from 'vitest';
import { PassThrough, Writable } from 'node:stream';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { encodeControl, encodeInput } from '../../../shared/native/frames';
import { NATIVE_INPUT_LIMITS } from '../../../shared/native/input';
import { PtyHelper } from './helper';
import { NativeHost } from './host';
import type { NativeEvents } from '../../../shared/native/host';
import { NativeReplyError } from '../../../shared/native/host';
vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
import { BoundedHelperWriter } from './helper';
import { TerminalSessions } from '../../../modules/agent/services/terminal/sessions';
import { normalizeTerminalSettings } from '../../../modules/agent/core/terminal/settings';

test('write(false) submits exactly once and retains charge through drain; control and reply have reserved admission', () => {
	const stream = new EventEmitter() as EventEmitter & {
		write(bytes: Uint8Array, callback: (error?: Error | null) => void): boolean;
	};
	const seen: number[] = [],
		callbacks: Array<(error?: Error | null) => void> = [];
	stream.write = (bytes, callback) => {
		seen.push(bytes[0]!);
		callbacks.push(callback);
		return seen.length !== 1;
	};
	const queue = new BoundedHelperWriter(stream, () => {});
	expect(queue.enqueue(new Uint8Array([1]), 'user', 1)).toBe(true);
	expect(queue.enqueue(new Uint8Array([2]), 'user', 1)).toBe(true);
	expect(queue.enqueue(new Uint8Array([3]), 'control')).toBe(true);
	expect(queue.enqueue(new Uint8Array([4]), 'reply', 1)).toBe(true);
	callbacks[0]!();
	expect(seen).toEqual([1]);
	expect(queue.stats.bytes).toBe(4);
	stream.emit('drain');
	expect(seen[0]).toBe(1);
	expect(seen.slice(1)).toEqual(expect.arrayContaining([2, 3, 4]));
	expect(new Set(seen).size).toBe(4);
	expect(queue.stats.bytes).toBe(3);
	callbacks.slice(1).forEach((callback) => callback());
	expect(queue.stats.bytes).toBe(0);
});

test('user saturation is bounded independently of stop/reply and preserves per-SID FIFO fairness', () => {
	const stream = new EventEmitter() as EventEmitter & {
		write(bytes: Uint8Array, callback: (error?: Error | null) => void): boolean;
	};
	const seen: number[] = [];
	stream.write = (bytes) => {
		seen.push(bytes[0]!);
		return false;
	};
	const queue = new BoundedHelperWriter(stream, () => {});
	for (let i = 0; i < 256; i++) queue.enqueue(new Uint8Array(16384).fill(1), 'user', 1);
	expect(queue.enqueue(new Uint8Array(16384), 'user', 1)).toBe(false);
	expect(queue.enqueue(new Uint8Array([9]), 'control')).toBe(true);
	expect(queue.enqueue(new Uint8Array([8]), 'reply', 2)).toBe(true);
	expect(queue.stats.bytes).toBeLessThanOrEqual(4 * 1024 * 1024 + 2);
	for (let n = 0; n < 8; n++) stream.emit('drain');
	expect(seen).toContain(9);
	expect(seen).toContain(8);
	queue.close();
	expect(queue.stats.bytes).toBe(0);
});

async function helperFixture(
	capability = true,
	events?: NativeEvents,
	seed = true,
	limits = NATIVE_INPUT_LIMITS,
	settlement = false,
) {
	const child = new EventEmitter(),
		stdout = new PassThrough(),
		stderr = new PassThrough();
	const rejectSpawns = new Set<number>();
	const heldSpawns = new Set<number>();
	const settlementHolds = new Set<number>();
	const silentRejections = new Set<number>();
	const unownedFlags = new Map<number, unknown>();
	const sent: Array<{ kind: number; message?: Record<string, unknown>; body: Uint8Array }> = [];
	const stdin = new Writable({
		write(chunk: Buffer, _encoding, done) {
			const kind = chunk[4]!,
				body = chunk.subarray(5);
			const message = kind === 1 ? (JSON.parse(body.toString()) as Record<string, unknown>) : undefined;
			sent.push({ kind, message, body });
			if (message?.type === 'hello')
				stdout.write(
					encodeControl({
						type: 'hello',
						protocol: 3,
						accepted: true,
						platform: process.platform,
						capabilities: capability
							? {
									inputAdmission: 1,
									terminalTermination: 1,
									...(settlement ? { replySettlement: 1 } : {}),
								}
							: {},
						inputLimits: limits,
					}),
				);
			if (message?.type === 'end') {
				stdout.write(
					encodeControl({
						type: 'terminal-termination',
						version: 1,
						sid: message.sid,
						sequence: 1,
						evidence: {
							root: { state: 'exited', code: 0, signal: null },
							cleanup: {
								state: 'confirmed',
								scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
								remainingKnown: 0,
							},
							output: 'drained',
						},
					}),
				);
				stdout.write(encodeControl({ type: 'exit', sid: message.sid, code: 0, signal: null }));
			}
			if (message?.type === 'reply-close' && !settlementHolds.has(message.sid as number))
				stdout.write(encodeControl({ type: 'reply-settled', sid: message.sid }));
			if (message?.type === 'cookies')
				stdout.write(
					encodeControl({
						type: 'cookies-result',
						rid: message.rid,
						data: { rows: [{ name: 'cookie', value: 'retained' }] },
					}),
				);
			if (message?.type === 'spawn') {
				if (rejectSpawns.has(message.sid as number)) {
					if (!silentRejections.has(message.sid as number)) {
						const output = encodeInput(message.sid as number, 'BOOT');
						output[4] = 3;
						stdout.write(output);
					}
					stdout.write(
						encodeControl({
							type: 'spawn-failed',
							sid: message.sid,
							message: 'fixture no user spawn',
							failure: { code: 'program-rejected', effect: 'none' },
							...(unownedFlags.has(message.sid as number)
								? { replySettled: unownedFlags.get(message.sid as number) }
								: {}),
						}),
					);
				} else if (!heldSpawns.has(message.sid as number))
					stdout.write(encodeControl({ type: 'spawned', sid: message.sid, pid: 345 }));
			}
			done();
		},
	});
	stdin.on('finish', () => { child.emit('exit', 0, null); child.emit('close', 0, null); });
	vi.mocked(spawn).mockReturnValue(
		Object.assign(child, {
			stdin,
			stdout,
			stderr,
			kill: vi.fn(),
			pid: 123,
		}) as unknown as ChildProcessWithoutNullStreams,
	);
	const failures: unknown[] = [];
	const helper = await PtyHelper.start(
		'fixture',
		events ?? { output() {}, exit() {}, closed() {}, inputFailure: (_sid, result) => failures.push(result) },
		globalThis as unknown as Window,
		{},
	);
	if (seed) await helper.spawnSession(7, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
	return {
		helper,
		child,
		sent,
		failures,
		rejectSpawns,
		heldSpawns,
		settlementHolds,
		silentRejections,
		unownedFlags,
		emitOutput: (sid: number, text: string) => {
			const bytes = encodeInput(sid, text);
			bytes[4] = 3;
			stdout.write(bytes);
		},
		state: (state: string, reason?: string) =>
			stdout.write(encodeControl({ type: 'input-state', sid: 7, op: 1, state, ...(reason ? { reason } : {}) })),
		control: (message: Record<string, unknown>) => stdout.write(encodeControl(message)),
	};
}

test('local reply frame and byte saturation are typed, synchronous and never duplicated as remote events', async () => {
	for (const bytes of [1, 4096]) {
		const failures: unknown[] = [];
		const fixture = await helperFixture(true, {
			output() {},
			exit() {},
			closed() {},
			replyFailure: (_sid, result) => failures.push(result),
		});
		const stream = (fixture.child as unknown as { stdin: Writable }).stdin;
		let done: ((error?: Error | null) => void) | undefined;
		const blocked = vi.spyOn(stream, 'write').mockImplementation((...args: unknown[]) => {
			const callback = args.at(-1);
			if (typeof callback === 'function') done = callback as (error?: Error | null) => void;
			return false;
		});
		try {
			const count = bytes === 1 ? 128 : Math.floor((128 * 1024) / (bytes + 9));
			for (let index = 0; index < count; index++) fixture.helper.reply(7, new Uint8Array(bytes));
			expect(() => fixture.helper.reply(7, new Uint8Array(bytes))).toThrowError(NativeReplyError);
			try {
				fixture.helper.reply(7, new Uint8Array(bytes));
			} catch (error) {
				expect((error as NativeReplyError).failure).toEqual({ state: 'none', reason: 'capacity' });
			}
			expect(failures).toEqual([]);
		} finally {
			blocked.mockRestore();
			done?.();
			stream.emit('drain');
			await fixture.helper.dispose();
		}
	}
});

test('remote reply failure is strict, SID bound and first-fault only; closed local reply remains typed', async () => {
	const failures: unknown[] = [];
	const fixture = await helperFixture(true, {
		output() {},
		exit() {},
		closed() {},
		replyFailure: (sid, value) => failures.push({ sid, value }),
	});
	try {
		fixture.control({ type: 'reply-failure', sid: 8, state: 'none', reason: 'capacity' });
		fixture.control({ type: 'reply-failure', sid: 7, state: ['none'], reason: 'capacity' });
		expect(failures).toEqual([]);
		fixture.control({ type: 'reply-failure', sid: 7, state: 'unknown', reason: 'write-failed' });
		for (let index = 0; index < 1000; index++)
			fixture.control({ type: 'reply-failure', sid: 7, state: 'none', reason: 'capacity' });
		expect(failures).toEqual([{ sid: 7, value: { state: 'unknown', reason: 'write-failed' } }]);
		expect(() => fixture.helper.reply(0, 'bad')).toThrowError(NativeReplyError);
		expect(() => fixture.helper.reply(8, 'closed')).toThrowError(NativeReplyError);
	} finally {
		await fixture.helper.dispose();
	}
	const writes = fixture.sent.length;
	expect(() => fixture.helper.reply(7, 'closed')).toThrowError(NativeReplyError);
	try {
		fixture.helper.reply(7, 'closed');
	} catch (error) {
		expect((error as NativeReplyError).failure).toEqual({ state: 'none', reason: 'closed' });
	}
	expect(fixture.sent).toHaveLength(writes);
});

test('a reply handed to the stream before synchronous transport failure is unknown, never retried', async () => {
	const closed: string[] = [];
	const fixture = await helperFixture(true, { output() {}, exit() {}, closed: (reason) => closed.push(reason) });
	const stream = (fixture.child as unknown as { stdin: Writable }).stdin;
	const write = vi.spyOn(stream, 'write').mockImplementation(() => {
		throw new Error('fixture transport failed after handoff');
	});
	try {
		let failure: unknown;
		try {
			fixture.helper.reply(7, 'reply');
		} catch (error) {
			failure = error;
		}
		expect(failure).toBeInstanceOf(NativeReplyError);
		expect((failure as NativeReplyError).failure).toEqual({ state: 'unknown', reason: 'transport-lost' });
		expect(write).toHaveBeenCalledTimes(1);
		expect(closed).toHaveLength(1);
	} finally {
		write.mockRestore();
		fixture.child.emit('exit', 1, null); fixture.child.emit('close', 1, null);
		await expect(fixture.helper.dispose()).rejects.toMatchObject({ outcome: { state: 'exited', code: 1 } });
	}
});

test('reply preflight respects the effective peer limit before encoding or writing', async () => {
	const fixture = await helperFixture(true, undefined, true, { ...NATIVE_INPUT_LIMITS, replyFrameBytes: 4 });
	try {
		const before = fixture.sent.length;
		expect(() => fixture.helper.reply(7, '12345')).toThrowError(NativeReplyError);
		expect(() => fixture.helper.reply(7, 'ééé')).toThrowError(NativeReplyError);
		expect(() => fixture.helper.reply(7, '')).toThrowError(NativeReplyError);
		expect(fixture.sent).toHaveLength(before);
		fixture.helper.reply(7, '1234');
		expect(fixture.sent.at(-1)?.kind).toBe(5);
	} finally {
		await fixture.helper.dispose();
	}
});

test('whole input waits for reservation; started cannot be changed by a late none; disconnect is unknown without replay', async () => {
	const fixture = await helperFixture();
	try {
		const submission = fixture.helper.submitInput(7, new Uint8Array(20000).fill(65));
		expect(fixture.sent.filter((frame) => frame.kind === 4)).toHaveLength(0);
		fixture.state('reserved');
		expect(fixture.sent.filter((frame) => frame.kind === 4)).toHaveLength(2);
		expect(fixture.sent.at(-1)?.message?.type).toBe('input-commit');
		fixture.state('queued');
		expect(await submission.queued).toEqual({ op: 1, state: 'queued' });
		fixture.state('started');
		fixture.state('none', 'cancelled');
		fixture.child.emit('exit', 1, null); fixture.child.emit('close', 1, null);
		expect(await submission.finished).toEqual({ op: 1, state: 'unknown', reason: 'transport-lost' });
		expect(fixture.sent.filter((frame) => frame.message?.type === 'input-begin')).toHaveLength(1);
	} finally {
		await expect(fixture.helper.dispose()).rejects.toMatchObject({ outcome: { state: 'exited', code: 1 } });
	}
});

test('legacy strong submission sends nothing and reports unsupported; cancellation needs matched acknowledgement', async () => {
	const legacy = await helperFixture(false);
	try {
		const count = legacy.sent.length,
			submission = legacy.helper.submitInput(7, 'abc');
		expect(await submission.queued).toEqual({ op: 1, state: 'none', reason: 'unsupported' });
		expect(await submission.finished).toEqual({ op: 1, state: 'none', reason: 'unsupported' });
		expect(legacy.sent).toHaveLength(count);
	} finally {
		await legacy.helper.dispose();
	}
	const fixture = await helperFixture();
	try {
		const submission = fixture.helper.submitInput(7, 'abc');
		submission.cancel();
		expect(fixture.sent.at(-1)?.message).toEqual({ type: 'input-cancel', sid: 7, op: 1 });
		fixture.state('none', 'cancelled');
		expect(await submission.finished).toEqual({ op: 1, state: 'none', reason: 'cancelled' });
	} finally {
		await fixture.helper.dispose();
	}
});

test('cancelled and expired local resize is removed before blocked writer drains', async () => {
	const fixture = await helperFixture();
	try {
		const stream = vi.mocked(spawn).mock.results.at(-1)!.value.stdin;
		const original = stream.write.bind(stream);
		let block = true;
		vi.spyOn(stream, 'write').mockImplementation(((bytes: Uint8Array, callback: (error?: Error | null) => void) => {
			const result = original(bytes, callback);
			if (block) {
				block = false;
				return false;
			}
			return result;
		}) as typeof stream.write);
		await fixture.helper.request('cookies', 'read', {});
		const resize = fixture.helper.submitResize(7, 100, 40);
		resize.cancel();
		expect(await resize.finished).toEqual({ op: 1, state: 'none', reason: 'cancelled' });
		stream.emit('drain');
		expect(fixture.sent.filter((frame) => frame.message?.type === 'resize')).toHaveLength(0);
	} finally {
		await fixture.helper.dispose();
	}
});

test('production host plus helper rejects oversized spawn before wire as none and releases without a ghost scope', async () => {
	let fixture!: Awaited<ReturnType<typeof helperFixture>>;
	const host = new NativeHost(async (events) => {
		fixture = await helperFixture(true, events, false, NATIVE_INPUT_LIMITS, true);
		return fixture.helper;
	});
	const lease = await host.acquire('pty');
	try {
		const sid = lease.allocateSessionId(),
			before = fixture.sent.length;
		await expect(
			lease.value.spawnSession(sid, {
				file: 'fixture',
				args: [],
				env: { HUGE: 'x'.repeat(100000) },
				cols: 80,
				rows: 24,
			}),
		).rejects.toMatchObject({ failure: { effect: 'none' } });
		expect(fixture.sent).toHaveLength(before);
		await lease.value.spawnSession(lease.allocateSessionId(), {
			file: 'fixture',
			args: [],
			env: {},
			cols: 80,
			rows: 24,
		});
		await expect(lease.release()).resolves.toBeUndefined();
	} finally {
		await host.dispose();
	}
});

test('failed user spawn retains only late parser ACK ownership while a Browser Cookie lease continues', async () => {
	let fixture!: Awaited<ReturnType<typeof helperFixture>>;
	const host = new NativeHost(async (events) => {
		fixture = await helperFixture(true, events, false);
		return fixture.helper;
	});
	const output: Uint8Array[] = [];
	const lease = await host.acquire('pty', { output: (_sid, bytes) => output.push(bytes) });
	const browser = await host.acquire('cookies');
	try {
		const sid = lease.allocateSessionId();
		fixture.rejectSpawns.add(sid);
		await expect(
			lease.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 }),
		).rejects.toMatchObject({ failure: { effect: 'none' } });
		expect(output.map((bytes) => new TextDecoder().decode(bytes))).toEqual(['BOOT']);
		expect(() => lease.value.input(sid, 'user')).toThrow(/drain/);
		let released = false;
		const releasing = lease.release().then(() => {
			released = true;
		});
		await Promise.resolve();
		expect(released).toBe(false);
		lease.value.acknowledge(sid, 4);
		await releasing;
		expect(fixture.helper.alive).toBe(true);
		expect(await browser.value.request('cookies', 'read', {})).toEqual({
			rows: [{ name: 'cookie', value: 'retained' }],
		});
		const replacement = await host.acquire('pty');
		await replacement.value.spawnSession(replacement.allocateSessionId(), {
			file: 'fixture',
			args: [],
			env: {},
			cols: 80,
			rows: 24,
		});
		await replacement.release();
	} finally {
		await browser.release();
		await host.dispose();
	}
});

test('continuous control and reply traffic cannot starve the user lane', () => {
	const stream = new EventEmitter() as EventEmitter & {
		write(bytes: Uint8Array, callback: (error?: Error | null) => void): boolean;
	};
	const seen: number[] = [];
	stream.write = (bytes, done) => {
		seen.push(bytes[0]!);
		done();
		return false;
	};
	const queue = new BoundedHelperWriter(stream, () => {});
	queue.enqueue(new Uint8Array([1]), 'control');
	for (let n = 0; n < 16; n++) {
		queue.enqueue(new Uint8Array([1]), 'control');
		queue.enqueue(new Uint8Array([2]), 'reply', 2);
		queue.enqueue(new Uint8Array([3]), 'user', 3);
	}
	for (let n = 0; n < 16; n++) stream.emit('drain');
	expect(seen).toContain(1);
	expect(seen).toContain(2);
	expect(seen).toContain(3);
	queue.close();
});

test('parser ACK bursts coalesce per SID through a blocked writer without loss, duplication or cross-SID credit', async () => {
	let fixture!: Awaited<ReturnType<typeof helperFixture>>,
		errors = 0;
	fixture = await helperFixture(true, {
		output(sid, bytes) {
			try {
				fixture.helper.acknowledge(sid, bytes.byteLength);
			} catch {
				errors++;
			}
		},
		exit() {},
		closed() {},
	});
	const stream = vi.mocked(spawn).mock.results.at(-1)!.value.stdin,
		original = stream.write.bind(stream);
	let block = true;
	vi.spyOn(stream, 'write').mockImplementation(((bytes: Uint8Array, callback: (error?: Error | null) => void) => {
		const result = original(bytes, callback);
		if (block) {
			block = false;
			return false;
		}
		return result;
	}) as typeof stream.write);
	try {
		await fixture.helper.spawnSession(8, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
		for (let n = 0; n < 256; n++) {
			fixture.emitOutput(7, 'a');
			fixture.emitOutput(8, 'bc');
		}
		stream.emit('drain');
		await Promise.resolve();
		expect(errors).toBe(0);
		const totals = new Map<number, number>();
		for (const frame of fixture.sent)
			if (frame.message?.type === 'ack')
				totals.set(
					frame.message.sid as number,
					(totals.get(frame.message.sid as number) ?? 0) + (frame.message.bytes as number),
				);
		expect(totals.get(7)).toBe(256);
		expect(totals.get(8)).toBe(512);
	} finally {
		fixture.child.emit('exit', 0, null); fixture.child.emit('close', 0, null);
		await fixture.helper.dispose();
	}
});

test.each(['cancel', 'timeout', 'close', 'stop'] as const)(
	'unsent input fragments and commit are withdrawn after %s while stdin is blocked',
	async (action) => {
		const fixture = await helperFixture();
		if (action === 'timeout') vi.useFakeTimers();
		try {
			const submission = fixture.helper.submitInput(7, new Uint8Array(20000).fill(65));
			const stream = vi.mocked(spawn).mock.results.at(-1)!.value.stdin;
			const original = stream.write.bind(stream);
			let block = true;
			vi.spyOn(stream, 'write').mockImplementation(((
				bytes: Uint8Array,
				callback: (error?: Error | null) => void,
			) => {
				const result = original(bytes, callback);
				if (block) {
					block = false;
					return false;
				}
				return result;
			}) as typeof stream.write);
			await fixture.helper.request('cookies', 'read', {});
			fixture.state('reserved');
			if (action === 'cancel') {
				submission.cancel();
				fixture.state('none', 'cancelled');
			} else if (action === 'timeout') vi.advanceTimersByTime(10001);
			else if (action === 'stop') fixture.helper.end(7, true);
			else {
				fixture.child.emit('exit', 1, null); fixture.child.emit('close', 1, null);
			}
			stream.emit('drain');
			await submission.finished;
			expect(fixture.sent.filter((frame) => frame.kind === 4)).toHaveLength(0);
			expect(fixture.sent.filter((frame) => frame.message?.type === 'input-commit')).toHaveLength(0);
		} finally {
			vi.useRealTimers();
			if (action === 'close') await expect(fixture.helper.dispose()).rejects.toMatchObject({ outcome: { state: 'exited', code: 1 } });
			else await fixture.helper.dispose();
		}
	},
);

test('late claimed reply failure reaches the exited production Session before negotiated final retirement', async () => {
	let routed: NativeEvents;
	const received: unknown[] = [];
	const fixture = await helperFixture(
		true,
		{
			output: (sid, data) => routed.output(sid, data),
			exit: (sid, code, signal) => routed.exit(sid, code, signal),
			termination: (sid, value) => routed.termination?.(sid, value),
			replyFailure: (sid, value) => {
				received.push({ sid, value });
				routed.replyFailure?.(sid, value);
			},
			replySettled: (sid) => routed.replySettled?.(sid),
			closed: (reason) => routed.closed(reason),
		},
		false,
		NATIVE_INPUT_LIMITS,
		true,
	);
	const native = new NativeHost(async (events) => {
		routed = events;
		return fixture.helper;
	});
	const browser = await native.acquire('cookies');
	const sessions = new TerminalSessions({
		native,
		platform: process.platform,
		environment: async () => ({}),
		settings: () => normalizeTerminalSettings({ scrollback: 100 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	let primary: unknown;
	try {
		const session = await sessions.create({
			kind: 'shell',
			title: 'late reply',
			file: 'fixture',
			args: [],
			cwd: '/',
			cols: 20,
			rows: 4,
		});
		fixture.settlementHolds.add(session.sid);
		session.receive(new TextEncoder().encode('\x1b[5n'));
		await session.whenParsed();
		expect(fixture.sent.some((frame) => frame.kind === 5)).toBe(true);
		fixture.control({
			type: 'terminal-termination',
			version: 1,
			sid: session.sid,
			sequence: 1,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: {
					state: 'confirmed',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: 0,
				},
				output: 'drained',
			},
		});
		fixture.control({ type: 'exit', sid: session.sid, code: 0, signal: null });
		await session.whenParsed();
		expect(session.connection).toBe('exited');
		let released = false;
		const closing = sessions.dispose().then(() => {
			released = true;
		});
		await Promise.resolve();
		expect(released).toBe(false);
		fixture.control({ type: 'reply-failure', sid: session.sid, state: 'unknown', reason: 'write-failed' });
		expect(session.replyDiagnostic?.reason).toBe('write-failed');
		expect(received).toHaveLength(1);
		expect(fixture.sent.filter((frame) => frame.message?.type === 'end')).toHaveLength(0);
		expect(await browser.value.request('cookies', 'read', {})).toEqual({
			rows: [{ name: 'cookie', value: 'retained' }],
		});
		fixture.control({ type: 'reply-settled', sid: session.sid });
		await closing;
		fixture.control({ type: 'reply-failure', sid: session.sid, state: 'none', reason: 'closed' });
		expect(received).toHaveLength(1);
	} catch (error) {
		primary = error;
	} finally {
		for (const sid of fixture.settlementHolds) fixture.control({ type: 'reply-settled', sid });
		fixture.settlementHolds.clear();
		// Always release every owned layer, preserving each failure and the primary.
		const errors: unknown[] = primary ? [primary] : [];
		for (const close of [() => sessions.dispose(), () => browser.release(), () => native.dispose()])
			try {
				await close();
			} catch (error) {
				errors.push(error);
			}
		if (errors.length) throw new AggregateError(errors, 'reply fixture cleanup');
	}
}, 5000);

test('negotiated reply close waits for bounded capacity and physically follows pre-exit replies exactly once', async () => {
	const fixture = await helperFixture(true, undefined, true, NATIVE_INPUT_LIMITS, true);
	fixture.settlementHolds.add(7);
	const stdin = (fixture.child as unknown as ChildProcessWithoutNullStreams).stdin;
	const original = stdin.write.bind(stdin);
	let blocked = true;
	stdin.write = ((...args: Parameters<typeof stdin.write>) => {
		const result = original(...args);
		if (blocked) {
			blocked = false;
			return false;
		}
		return result;
	}) as typeof stdin.write;
	try {
		for (let i = 0; i < 128; i++) fixture.helper.reply(7, 'r');
		fixture.control({ type: 'reply-settled', sid: 7 }); // too early: no exit, no handed close marker
		expect(fixture.helper.streamStats.sessionRoutes).toBe(1);
		fixture.control({
			type: 'terminal-termination',
			version: 1,
			sid: 7,
			sequence: 1,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: {
					state: 'confirmed',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: 0,
				},
				output: 'drained',
			},
		});
		fixture.control({ type: 'exit', sid: 7, code: 0, signal: null });
		expect(() => fixture.helper.reply(7, 'late parser reply')).toThrowError(
			expect.objectContaining({ failure: { state: 'none', reason: 'closed' } }),
		);
		await Promise.resolve();
		expect(fixture.sent.filter((frame) => frame.message?.type === 'reply-close')).toHaveLength(0);
		expect(fixture.helper.streamStats.replyClosePending).toBe(1);
		fixture.control({ type: 'reply-settled', sid: 7 }); // still pending, not handed
		expect(fixture.helper.streamStats.sessionRoutes).toBe(1);
		stdin.emit('drain');
		await Promise.resolve();
		await Promise.resolve();
		const replies = fixture.sent.filter((frame) => frame.kind === 5);
		expect(replies).toHaveLength(128);
		await vi.waitFor(
			() => expect(fixture.sent.filter((frame) => frame.message?.type === 'reply-close')).toHaveLength(1),
			{ timeout: 1000, interval: 5 },
		);
		const marker = fixture.sent.findIndex((frame) => frame.message?.type === 'reply-close');
		expect(marker).toBeGreaterThan(fixture.sent.findLastIndex((frame) => frame.kind === 5));
		expect(fixture.sent.filter((frame) => frame.message?.type === 'reply-close')).toHaveLength(1);
		fixture.control({ type: 'reply-settled', sid: 999 });
		fixture.control({ type: 'reply-settled', sid: 7, extra: true });
		expect(fixture.helper.streamStats.sessionRoutes).toBe(1);
		fixture.control({ type: 'reply-settled', sid: 7 });
		fixture.control({ type: 'reply-settled', sid: 7 });
		expect(fixture.helper.streamStats.sessionRoutes).toBe(0);
		expect(fixture.helper.streamStats.replyClosePending).toBe(0);
	} finally {
		stdin.write = original;
		await fixture.helper.dispose();
	}
});

test('pending reply close markers are cleared on disconnect and legacy peers receive no new wire', async () => {
	for (const negotiated of [false, true]) {
		const fixture = await helperFixture(true, undefined, true, NATIVE_INPUT_LIMITS, negotiated);
		fixture.settlementHolds.add(7);
		const stdin = (fixture.child as unknown as ChildProcessWithoutNullStreams).stdin;
		const original = stdin.write.bind(stdin);
		stdin.write = (() => false) as typeof stdin.write;
		try {
			fixture.helper.reply(7, 'held');
			fixture.control({ type: 'exit', sid: 7, code: 0, signal: null });
			await Promise.resolve();
			expect(fixture.helper.streamStats.replyClosePending).toBe(negotiated ? 1 : 0);
			fixture.child.emit('exit', 1, null); fixture.child.emit('close', 1, null);
			await Promise.resolve();
			expect(fixture.helper.streamStats.replyClosePending).toBe(0);
			stdin.emit('drain');
			await Promise.resolve();
			expect(fixture.sent.filter((frame) => frame.message?.type === 'reply-close')).toHaveLength(0);
		} finally {
			stdin.write = original;
			await expect(fixture.helper.dispose()).rejects.toMatchObject({ outcome: { state: 'exited', code: 1 } });
		}
	}
});

test('a zero-output reserved spawn failure retains the Host route until its actual negotiated I/O settlement', async () => {
	let events!: NativeEvents;
	const failures: unknown[] = [];
	const fixture = await helperFixture(
		true,
		{
			output: (sid, data) => events.output(sid, data),
			exit: (sid, code, signal) => events.exit(sid, code, signal),
			closed: (reason) => events.closed(reason),
			replyFailure: (sid, value) => events.replyFailure?.(sid, value),
			replySettled: (sid) => events.replySettled?.(sid),
		},
		false,
		NATIVE_INPUT_LIMITS,
		true,
	);
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return fixture.helper;
	});
	const browser = await host.acquire('cookies'),
		agent = await host.acquire('pty', { replyFailure: (_sid, value) => failures.push(value) });
	const sid = agent.allocateSessionId();
	fixture.rejectSpawns.add(sid);
	fixture.silentRejections.add(sid);
	fixture.settlementHolds.add(sid);
	try {
		await expect(
			agent.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 20, rows: 4 }),
		).rejects.toMatchObject({ failure: { effect: 'none' } });
		let done = false;
		const release = agent.release().then(() => {
			done = true;
		});
		await Promise.resolve();
		expect(done).toBe(false);
		fixture.control({ type: 'reply-failure', sid, state: 'unknown', reason: 'write-failed' });
		expect(failures).toEqual([{ state: 'unknown', reason: 'write-failed' }]);
		fixture.control({ type: 'reply-settled', sid });
		await release;
		expect(fixture.helper.streamStats.sessionRoutes).toBe(0);
		expect(await browser.value.request('cookies', 'read', {})).toHaveProperty('rows');
	} finally {
		fixture.control({ type: 'reply-settled', sid });
		fixture.settlementHolds.clear();
		const errors: unknown[] = [];
		for (const close of [() => agent.release(), () => browser.release(), () => host.dispose()])
			try {
				await close();
			} catch (error) {
				errors.push(error);
			}
		if (errors.length) throw new AggregateError(errors, 'reserved failure cleanup');
	}
});

test('an empty released owner preserves the actual failed-spawn reply fence of its sibling', async () => {
	let events!: NativeEvents;
	const fixture = await helperFixture(
		true,
		{
			output: (sid, data) => events.output(sid, data),
			exit: (sid, code, signal) => events.exit(sid, code, signal),
			closed: (reason) => events.closed(reason),
			replySettled: (sid) => events.replySettled?.(sid),
		},
		false,
		NATIVE_INPUT_LIMITS,
		true,
	);
	const host = new NativeHost(async (callbacks) => {
		events = callbacks;
		return fixture.helper;
	});
	const agent = await host.acquire('pty'),
		history = await host.acquire('history');
	const sid = agent.allocateSessionId();
	fixture.rejectSpawns.add(sid);
	fixture.silentRejections.add(sid);
	fixture.settlementHolds.add(sid);
	let release: Promise<unknown> | undefined;
	const errors: unknown[] = [];
	try {
		await expect(
			agent.value.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 20, rows: 4 }),
		).rejects.toMatchObject({ failure: { effect: 'none' } });
		await vi.waitFor(
			() => expect(fixture.sent.filter((frame) => frame.message?.type === 'reply-close')).toHaveLength(1),
			{ timeout: 1000, interval: 5 },
		);
		release = agent.release().catch((error: unknown) => error);
		await history.release();
		expect(fixture.helper.alive).toBe(true);
		expect(fixture.helper.streamStats.sessionRoutes).toBe(1);
		fixture.control({ type: 'reply-settled', sid });
		expect(await release).toBeUndefined();
		expect(fixture.helper.streamStats.sessionRoutes).toBe(0);
		expect(fixture.helper.alive).toBe(false);
	} catch (error) {
		errors.push(error);
	} finally {
		fixture.control({ type: 'reply-settled', sid });
		fixture.settlementHolds.clear();
		for (const close of [() => release ?? agent.release(), () => history.release(), () => host.dispose()])
			try {
				const result = await close();
				if (result instanceof Error) errors.push(result);
			} catch (error) {
				errors.push(error);
			}
		if (errors.length) throw new AggregateError(errors, 'Concurrent failed-spawn owner body and cleanup');
	}
}, 15000);

test.each(['active', 'released', 'late-ACK'])(
	'a settled fast exit survives delayed successful spawn adoption (%s owner)',
	async (mode) => {
		let events!: NativeEvents;
		const settlements: number[] = [],
			browserFaults: unknown[] = [];
		const fixture = await helperFixture(
			true,
			{
				output: (sid, data) => events.output(sid, data),
				exit: (sid, code, signal) => events.exit(sid, code, signal),
				closed: (reason) => events.closed(reason),
				termination: (sid, value) => events.termination?.(sid, value),
				replySettled: (sid) => events.replySettled?.(sid),
			},
			false,
			NATIVE_INPUT_LIMITS,
			true,
		);
		const host = new NativeHost(async (callbacks) => {
			events = callbacks;
			return fixture.helper;
		});
		const browser = await host.acquire('cookies', { replyFailure: (_sid, value) => browserFaults.push(value) });
		const agent = await host.acquire('pty', { replySettled: (sid) => settlements.push(sid) });
		const sid = agent.allocateSessionId();
		fixture.heldSpawns.add(sid);
		const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
		const errors: unknown[] = [];
		let release: Promise<unknown> | undefined;
		try {
			const spawning = agent.value
				.spawnSession(sid, { file: 'fixture', args: [], env: {}, cols: 20, rows: 4 })
				.catch((error: unknown) => error);
			if (mode === 'late-ACK') fixture.emitOutput(sid, 'BOOT');
			// The first stop precedes exit, exactly as in production; no action is sent to an already retired SID.
			agent.value.end(sid, true);
			await vi.waitFor(
				() => {
					expect(fixture.sent.filter((frame) => frame.message?.type === 'reply-close')).toHaveLength(1);
					expect(fixture.helper.streamStats.sessionRoutes).toBe(mode === 'late-ACK' ? 1 : 0);
				},
				{ timeout: 1000, interval: 5 },
			);
			clock.mockReturnValue(10001);
			if (mode === 'released') release = agent.release().catch((error: unknown) => error);
			fixture.control({ type: 'spawned', sid, pid: 345 });
			const result = await spawning;
			if (mode === 'released') expect(result).toMatchObject({ message: 'The native capability lease is closed' });
			else expect(result).toBe(345);
			release ??= agent.release().catch((error: unknown) => error);
			if (mode === 'late-ACK') agent.value.acknowledge(sid, 4);
			expect(await release).toBeUndefined();
			expect(fixture.helper.streamStats.sessionRoutes).toBe(0);
			expect(settlements).toEqual([sid]);
			expect(fixture.sent.filter((frame) => frame.message?.type === 'end')).toHaveLength(1);
			expect(() => agent.value.acknowledge(sid, 1)).toThrow();
			expect(await browser.value.request('cookies', 'read', {})).toHaveProperty('rows');
			expect(browserFaults).toEqual([]);
		} catch (error) {
			errors.push(error);
		} finally {
			for (const close of [() => release ?? agent.release(), () => browser.release(), () => host.dispose()])
				try {
					const result = await close();
					if (result instanceof Error) errors.push(result);
				} catch (error) {
					errors.push(error);
				}
			clock.mockRestore();
			if (errors.length) throw new AggregateError(errors, 'Fast-exit adoption body and cleanup');
		}
	},
);

test('foreign spawn-failed and premature settlement frames cannot allocate or retire a captured route', async () => {
	const fixture = await helperFixture(true, undefined, true, NATIVE_INPUT_LIMITS, true);
	try {
		for (let sid = 100; sid < 200; sid++) {
			fixture.control({
				type: 'spawn-failed',
				sid,
				failure: { code: 'pty-unavailable', effect: 'none' },
				replySettled: true,
			});
			fixture.control({ type: 'reply-settled', sid });
		}
		fixture.control({
			type: 'spawn-failed',
			sid: 7,
			failure: { code: 'pty-unavailable', effect: 'none' },
			replySettled: true,
		});
		fixture.control({ type: 'reply-settled', sid: 7 });
		await Promise.resolve();
		expect(fixture.helper.streamStats.sessionRoutes).toBe(1);
		expect(fixture.helper.streamStats.replyClosePending).toBe(0);
		await expect(
			fixture.helper.spawnSession(7, { file: 'fixture', args: [], env: {}, cols: 20, rows: 4 }),
		).rejects.toMatchObject({ failure: { effect: 'unknown' } });
		expect(fixture.helper.streamStats.sessionRoutes).toBe(1);
	} finally {
		await fixture.helper.dispose();
	}
});

test('unowned spawn settlement needs negotiated literal evidence and never overrides observed bootstrap output', async () => {
	for (const mode of ['literal', 'array', 'string', 'legacy', 'output']) {
		let settled = 0;
		const fixture = await helperFixture(
			mode !== 'legacy',
			{
				output() {},
				exit() {},
				closed() {},
				replySettled() {
					settled++;
				},
			},
			false,
			NATIVE_INPUT_LIMITS,
			mode !== 'legacy',
		);
		fixture.rejectSpawns.add(7);
		if (mode !== 'output') fixture.silentRejections.add(7);
		fixture.unownedFlags.set(7, mode === 'array' ? [true] : mode === 'string' ? 'true' : true);
		fixture.settlementHolds.add(7);
		try {
			await expect(
				fixture.helper.spawnSession(7, { file: 'fixture', args: [], env: {}, cols: 20, rows: 4 }),
			).rejects.toMatchObject({ failure: { effect: 'none' } });
			await Promise.resolve();
			if (mode === 'literal' || mode === 'legacy') {
				expect(fixture.helper.streamStats.sessionRoutes).toBe(0);
				expect(fixture.sent.filter((frame) => frame.message?.type === 'reply-close')).toHaveLength(0);
				expect(settled).toBe(mode === 'literal' ? 1 : 0);
			} else {
				expect(fixture.helper.streamStats.sessionRoutes).toBe(1);
				expect(fixture.sent.filter((frame) => frame.message?.type === 'reply-close')).toHaveLength(1);
				expect(settled).toBe(0);
				fixture.control({ type: 'reply-settled', sid: 7 });
				if (mode === 'output') fixture.helper.acknowledge(7, 4);
				expect(fixture.helper.streamStats.sessionRoutes).toBe(0);
			}
		} finally {
			await fixture.helper.dispose();
		}
	}
});
