import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { expect, test, vi } from 'vitest';
import { encodeControl, FrameDecoder } from '../../../shared/native/frames';
import { PtyHelper } from './helper';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

for (const [wire, expected] of [
	[{ code: 'program-rejected', effect: 'none' }, { code: 'program-rejected', effect: 'none' }],
	[undefined, { code: 'unconfirmed', effect: 'unknown' }],
	[{ code: 'future-code', effect: 'none' }, { code: 'unconfirmed', effect: 'unknown' }],
	[{ code: 'program-rejected', effect: 'completed' }, { code: 'unconfirmed', effect: 'unknown' }],
	[{ code: 'session-conflict', effect: 'unknown' }, { code: 'session-conflict', effect: 'unknown' }],
	[{ code: 'session-conflict', effect: 'none' }, { code: 'unconfirmed', effect: 'unknown' }],
] as const) test(`spawn rejection evidence is validated conservatively: ${JSON.stringify(wire)}`, async () => {
	const child = new EventEmitter(), stdout = new PassThrough(), stderr = new PassThrough(), decoder = new FrameDecoder();
	const stdin = new Writable({ write(chunk: Buffer, _encoding, done) {
		for (const frame of decoder.push(chunk)) if (frame.kind === 1 && frame.message.type === 'hello') stdout.write(encodeControl({ type: 'hello', accepted: true, protocol: 3, pid: 123, version: 'fixture' }));
		done();
	} });
	stdin.on('finish', () => { child.emit('exit', 0, null); child.emit('close', 0, null); });
	vi.mocked(spawn).mockReturnValue(Object.assign(child, { stdin, stdout, stderr, kill: vi.fn(), pid: 123 }) as unknown as ChildProcessWithoutNullStreams);
	const helper = await PtyHelper.start('fixture', { output() {}, exit() {}, closed() {} }, globalThis as unknown as Window, {});
	try {
		const result = helper.spawnSession(1, { file: 'missing', args: [], env: {}, cols: 80, rows: 24 }).catch((error: unknown) => error);
		stdout.write(encodeControl({ type: 'spawn-failed', sid: 1, message: 'opaque diagnostic without ENOENT', failure: wire }));
		expect(await result).toMatchObject({ failure: expected });
		expect(helper.alive).toBe(true);
	} finally { await helper.dispose(); }
});

test('negotiated termination notices retain exact evidence and reject malformed or stale scope data without killing the helper', async () => {
	const fixture = await import('../../../../test/fixtures/native/terminal-termination-v1.json');
	const notices: unknown[] = [], child = new EventEmitter(), stdout = new PassThrough(), stderr = new PassThrough(), decoder = new FrameDecoder();
	const sent: Record<string, unknown>[] = [];
	const stdin = new Writable({ write(chunk: Buffer, _encoding, done) {
		for (const frame of decoder.push(chunk)) if (frame.kind === 1) {
			sent.push(frame.message);
			if (frame.message.type === 'hello') stdout.write(encodeControl({ type: 'hello', accepted: true, protocol: 3, pid: 123, version: 'fixture', platform: process.platform, capabilities: { terminalTermination: 1 } }));
		}
		done();
	} });
	stdin.on('finish', () => { child.emit('exit', 0, null); child.emit('close', 0, null); });
	vi.mocked(spawn).mockReturnValue(Object.assign(child, { stdin, stdout, stderr, kill: vi.fn(), pid: 123 }) as unknown as ChildProcessWithoutNullStreams);
	const helper = await PtyHelper.start('fixture', { output() {}, exit() {}, closed() {}, termination: (sid, notice) => notices.push({ sid, notice }) }, globalThis as unknown as Window, {});
	try {
		expect(helper.terminalTermination).toBe(1);
		const spawning = helper.spawnSession(9, { file: 'fixture', args: [], env: {}, cols: 80, rows: 24 });
		stdout.write(encodeControl({ type: 'spawned', sid: 9, pid: 1234 })); await spawning;
		helper.requestStop(9, { requestId: 'stop-fixture', force: false });
		expect(sent.at(-1)).toEqual({ type: 'end', sid: 9, force: false, requestId: 'stop-fixture' });
		for (const row of fixture.default.cases.filter(row => !row.valid && row.context.platform === process.platform && row.context.capability === 1 && row.context.lastSequence === 0)) stdout.write(encodeControl(row.wire));
		expect(notices).toEqual([]);
		const row = fixture.default.cases.find(row => row.name === (process.platform === 'win32' ? 'windows-confirmed' : 'unix-confirmed'))!;
		stdout.write(encodeControl(row.wire));
		stdout.write(encodeControl(row.wire));
		expect(notices).toEqual([{ sid: 9, notice: { version: 1, requestId: 'stop-fixture', sequence: 2, evidence: row.wire.evidence } }]);
		expect(helper.alive).toBe(true);
	} finally { await helper.dispose(); }
});
