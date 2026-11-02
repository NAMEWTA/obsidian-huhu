import { expect, test } from 'vitest';
import fixtures from '../../../test/fixtures/native/terminal-input-admission-v1.json';
import {
	encodeControl,
	encodeControlBody,
	encodeInput,
	controlBytes,
	encodeInputPart,
	encodeReply,
	FrameDecoder,
	FRAME_INPUT_PART,
	FRAME_REPLY,
	FRAME_CONTROL,
	FRAME_INPUT,
	MAX_FRAME,
	utf8Bytes,
} from './frames';

test('new client-only kinds have exact bytes and are rejected on the helper stdout decoder', () => {
	for (const row of fixtures.frames) {
		const bytes =
			row.kind === 'part'
				? encodeInputPart(row.sid, row.op, row.offset, Uint8Array.from(row.data))
				: encodeReply(row.sid, Uint8Array.from(row.data));
		expect(Array.from(bytes), row.name).toEqual(row.bytes);
		expect(() => new FrameDecoder().push(bytes), row.name).toThrow(/unknown frame/);
	}
	expect(FRAME_INPUT_PART).toBe(4);
	expect(FRAME_REPLY).toBe(5);
});

test('encoding rejects too-large UTF8 before allocating a payload or frame', () => {
	expect(Array.from(utf8Bytes('a😀é', 7))).toEqual([97, 240, 159, 152, 128, 195, 169]);
	expect(() => utf8Bytes('a😀é', 6)).toThrow(/capacity/);
	expect(() => encodeReply(7, new Uint8Array(4097))).toThrow(/capacity/);
	expect(() => encodeInputPart(7, 0, 0, new Uint8Array([1]))).toThrow();
});

test('control preflight rejects accessors and toJSON before they run, and serializes a bounded DTO snapshot', () => {
	let calls = 0;
	const getter = Object.defineProperty({}, 'text', {
		enumerable: true,
		get() {
			calls++;
			return 'x'.repeat(1000000);
		},
	});
	const custom = {
		toJSON() {
			calls++;
			return { text: 'x'.repeat(1000000) };
		},
	};
	expect(() => encodeControl({ payload: getter })).toThrow(/accessors/);
	expect(() => encodeControl({ payload: custom })).toThrow(/toJSON/);
	expect(() => encodeControl({ payload: new Date() })).toThrow(/plain/);
	expect(calls).toBe(0);
	expect(() => controlBytes({ payload: { text: 'x'.repeat(65537) } })).toThrow(/capacity/);
	expect(
		new FrameDecoder().push(encodeControl({ type: 'safe', missing: undefined, values: [1, undefined] })),
	).toMatchObject([{ message: { type: 'safe', values: [1, null] } }]);
});

test('invalid length rejects on the fourth byte without waiting for a frame kind, at every header split', () => {
	for (const length of [0, MAX_FRAME + 1]) {
		const header = new Uint8Array(4);
		new DataView(header.buffer).setUint32(0, length);
		for (const splits of [[4], [1, 1, 1, 1], [2, 2], [3, 1]]) {
			const decoder = new FrameDecoder();
			let at = 0;
			for (const size of splits) {
				const next = header.subarray(at, at + size);
				at += size;
				if (at === 4)
					expect(() => decoder.push(next), `length=${length}, split=${splits}`).toThrow(/out of range/);
				else expect(decoder.push(next)).toEqual([]);
			}
		}
	}
});

test('a valid four-byte length waits for kind and body while kind-specific capacity still rejects before allocation', () => {
	for (const length of [1, MAX_FRAME]) {
		const header = new Uint8Array(4);
		new DataView(header.buffer).setUint32(0, length);
		const decoder = new FrameDecoder({ controlBytes: 8, sessionBytes: 8 });
		for (const byte of header) expect(decoder.push(new Uint8Array([byte]))).toEqual([]);
		expect(decoder.push(new Uint8Array())).toEqual([]);
		if (length === MAX_FRAME)
			expect(() => decoder.push(new Uint8Array([FRAME_CONTROL]))).toThrow(/control frame capacity/);
	}
	const bytes = encodeControl({ type: 'split' }),
		decoder = new FrameDecoder();
	expect(decoder.push(bytes.subarray(0, 4))).toEqual([]);
	expect(decoder.push(bytes.subarray(4, 5))).toEqual([]);
	for (const byte of bytes.subarray(5, -1)) expect(decoder.push(new Uint8Array([byte]))).toEqual([]);
	expect(decoder.push(bytes.subarray(-1))).toEqual([{ kind: FRAME_CONTROL, message: { type: 'split' } }]);
});

test('a raw control parser receives unchanged duplicate and escaped keys at every frame split', () => {
	const text = '{"type":"old","ty\\u0070e":"new","value":1,"value":2}',
		body = new TextEncoder().encode(text),
		frame = new Uint8Array([0, 0, 0, 53, FRAME_CONTROL, ...body]),
		message = { type: 'parsed-by-hook' };
	expect(body.byteLength).toBe(52);
	for (let split = 0; split <= frame.length; split++) {
		let received: Uint8Array | undefined;
		const decoder = new FrameDecoder(undefined, (raw: Uint8Array) => {
			received = raw;
			return message;
		});
		const first = decoder.push(frame.subarray(0, split));
		if (split < frame.length) expect(received, `incomplete split=${split}`).toBeUndefined();
		const frames = [...first, ...decoder.push(frame.subarray(split))];
		expect(frames, `split=${split}`).toEqual([{ kind: FRAME_CONTROL, message }]);
		expect(received, `split=${split}`).toEqual(body);
	}
});

test('raw control wrapping bounds an owned frame without parsing or changing the body bytes', () => {
	expect(typeof encodeControlBody).toBe('function');
	const source = new Uint8Array([9, 255, 123, 125, 9]),
		body = source.subarray(1, 4),
		frame = encodeControlBody(body, 3);
	expect([...frame]).toEqual([0, 0, 0, 4, FRAME_CONTROL, 255, 123, 125]);
	source.fill(0);
	expect([...frame]).toEqual([0, 0, 0, 4, FRAME_CONTROL, 255, 123, 125]);
	expect([...encodeControlBody(new Uint8Array(), 0)]).toEqual([0, 0, 0, 1, FRAME_CONTROL]);
	expect(() => encodeControlBody(new Uint8Array([1]), 0)).toThrow(/capacity/);
	for (const limit of [-1, 0.5, NaN, Infinity, MAX_FRAME])
		expect(() => encodeControlBody(new Uint8Array(), limit), `limit=${limit}`).toThrow(/capacity/);
	expect(() => encodeControlBody(new Uint8Array(MAX_FRAME), MAX_FRAME - 1)).toThrow(/capacity/);
});

test('a raw parser receives undecoded UTF8 bytes after bytewise delivery', () => {
	const frame = new Uint8Array([0, 0, 0, 3, FRAME_CONTROL, 195, 40]),
		message = { raw: 'handled' },
		seen: Uint8Array[] = [],
		decoder = new FrameDecoder(undefined, (body) => {
			seen.push(body);
			return message;
		});
	for (const byte of frame.subarray(0, -1)) {
		expect(decoder.push(new Uint8Array([byte]))).toEqual([]);
		expect(seen).toEqual([]);
	}
	expect(decoder.push(frame.subarray(-1))).toEqual([{ kind: FRAME_CONTROL, message }]);
	expect(seen).toEqual([new Uint8Array([195, 40])]);
});

test('parser exceptions reach the consumer before emission while session frames bypass the parser', () => {
	const failure = new Error('strict parser rejected body'),
		decoder = new FrameDecoder(undefined, () => { throw failure; });
	expect(decoder.push(encodeInput(7, 'abc'))).toEqual([
		{ kind: FRAME_INPUT, session: 7, bytes: new Uint8Array([97, 98, 99]) },
	]);
	let emitted = false;
	expect(() => decoder.consume(encodeControl({}), () => { emitted = true; })).toThrow(failure);
	expect(emitted).toBe(false);
});

test('raw parsing still rejects an oversized declared body and invalid length before invoking the parser', () => {
	let invoked = false;
	const parser = () => { invoked = true; return {}; };
	for (const length of [0, MAX_FRAME + 1]) {
		const header = new Uint8Array(4);
		new DataView(header.buffer).setUint32(0, length);
		for (let split = 1; split <= 4; split++) {
			const decoder = new FrameDecoder(undefined, parser);
			if (split < 4) expect(decoder.push(header.subarray(0, split))).toEqual([]);
			expect(() => decoder.push(header.subarray(split < 4 ? split : 0))).toThrow(/out of range/);
		}
	}
	const decoder = new FrameDecoder({ controlBytes: 2, sessionBytes: 8 }, parser);
	expect(() => decoder.push(new Uint8Array([0, 0, 0, 4, FRAME_CONTROL]))).toThrow(/control frame capacity/);
	expect(invoked).toBe(false);
});

test('the default parser preserves legacy JSON behavior and rejects malformed UTF8 or non-object JSON', () => {
	const duplicate = new TextEncoder().encode('{"type":"old","ty\\u0070e":"new"}'),
		parsed = new FrameDecoder().push(encodeControlBody(duplicate, duplicate.length));
	expect(parsed).toEqual([{ kind: FRAME_CONTROL, message: { type: 'new' } }]);
	for (const body of [new Uint8Array([195, 40]), ...['{', '[]', 'null', '1'].map((v) => new TextEncoder().encode(v))])
		expect(() => new FrameDecoder().push(encodeControlBody(body, body.length))).toThrow();
});

test('legacy control bodies retain the helper outer bound and raw wrapping accepts the global frame boundary', () => {
	const limit = 4 * 1024 * 1024 - 5,
		prefix = '{"type":"history-result","data":"',
		suffix = '"}',
		text = 'x'.repeat(limit - prefix.length - suffix.length),
		body = new TextEncoder().encode(prefix + text + suffix),
		decoder = new FrameDecoder({ controlBytes: limit, sessionBytes: 64 * 1024 });
	expect(body.length).toBe(limit);
	expect(decoder.push(encodeControlBody(body, limit))).toEqual([
		{ kind: FRAME_CONTROL, message: { type: 'history-result', data: text } },
	]);
	const boundary = encodeControlBody(new Uint8Array(MAX_FRAME - 1), MAX_FRAME - 1);
	expect(boundary.byteLength).toBe(MAX_FRAME + 4);
	expect([...boundary.subarray(0, 5)]).toEqual([1, 0, 0, 0, FRAME_CONTROL]);
});

test('legacy DTO encoding retains depth16 and node4096 admission limits', () => {
	let value: unknown = null;
	for (let depth = 0; depth < 15; depth++) value = { nested: value };
	expect(() => encodeControl({ payload: value })).not.toThrow();
	expect(() => encodeControl({ payload: { nested: value } })).toThrow(/capacity/);
	expect(() => controlBytes({ values: Array<null>(4094).fill(null) })).not.toThrow();
	expect(() => controlBytes({ values: Array<null>(4095).fill(null) })).toThrow(/capacity/);
});
