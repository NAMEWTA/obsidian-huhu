import { describe, expect, it } from 'vitest';
import { HapDecoder, encodeHapFrame, type HapPayload } from './codec';
import fixtures from '../../../../../contracts/hap/v0.1/fixtures/golden.json';

describe('HAP framed JSON', () => {
	it('preserves UTF-8 through byte fragments and consecutive frames', () => {
		const request = { jsonrpc: '2.0' as const, id: 'c:1', method: 'service.health', params: { label: '你好🌈' } };
		const bytes = encodeHapFrame(request);
		const decoder = new HapDecoder();
		const messages: unknown[] = [];
		for (const byte of bytes) messages.push(...decoder.push(Uint8Array.of(byte)));
		expect(messages).toEqual([request]);
		expect(decoder.push(new Uint8Array([...bytes, ...bytes]))).toEqual([request, request]);
		decoder.finish();
	});
});

it.each([
	[Uint8Array.of(0, 0, 0, 0), 'FRAME_EMPTY'],
	[Uint8Array.of(0, 16, 0, 1), 'FRAME_TOO_LARGE'],
	[Uint8Array.of(0, 0, 0, 1, 2), 'UNKNOWN_KIND'],
	[Uint8Array.of(0, 0, 0, 2, 1, 0xff), 'INVALID_UTF8'],
	[Uint8Array.of(0, 0, 0, 2, 1, 0x7b), 'INVALID_JSON'],
] as const)('rejects malformed frame bytes before accepting more data', (bytes, reason) => {
	const decoder = new HapDecoder();
	expect(() => decoder.push(bytes)).toThrow(reason);
	expect(() => decoder.push(new Uint8Array())).toThrow('DECODER_CLOSED');
});

it('rejects truncated EOF, invalid IDs, response alternatives and oversized batches', () => {
	const decoder = new HapDecoder();
	decoder.push(Uint8Array.of(0, 0));
	expect(() => decoder.finish()).toThrow('TRUNCATED_FRAME');
	for (const id of ['', 'c:', '1', 1, null, `c:${'x'.repeat(127)}`]) {
		expect(() => encodeHapFrame({ jsonrpc: '2.0', id, method: 'service.health' } as never)).toThrow(
			typeof id === 'string' ? 'INVALID_ID' : 'INVALID_ENVELOPE',
		);
	}
	expect(() => encodeHapFrame({ jsonrpc: '2.0', id: 'c:1', result: {}, error: {} } as never)).toThrow(
		'INVALID_ENVELOPE',
	);
	expect(() => encodeHapFrame([])).toThrow('BATCH_LIMIT');
	const request = { jsonrpc: '2.0' as const, id: 'c:1', method: 'service.health' };
	expect(() => encodeHapFrame(Array.from({ length: 9 }, () => request))).toThrow('BATCH_LIMIT');
	expect(() => encodeHapFrame({ ...request, params: { data: 'x'.repeat(1_048_576) } })).toThrow('FRAME_TOO_LARGE');
	expect(new HapDecoder().push(encodeHapFrame(Array.from({ length: 8 }, () => request)))).toHaveLength(1);
});

it('rejects unknown envelope/error fields and accepts opaque directional UTF-8 IDs', () => {
	const payload = { jsonrpc: '2.0' as const, id: 'c:编号\n1', method: 'service.health' };
	expect(new HapDecoder().push(encodeHapFrame(payload))).toEqual([payload]);
	expect(() => encodeHapFrame({ ...payload, principal: 'owner' } as never)).toThrow('INVALID_ENVELOPE');
	expect(() =>
		encodeHapFrame({
			jsonrpc: '2.0',
			id: 'c:1',
			error: {
				code: -32000,
				message: 'x',
				data: { kind: 'UNREGISTERED_KIND', reason: 'X', retryable: false, correlationId: 'c1' },
			},
		} as never),
	).toThrow('INVALID_ERROR');
	const utf8WithBom = Uint8Array.of(0, 0, 0, 6, 1, 0xef, 0xbb, 0xbf, 0x7b, 0x7d);
	expect(() => new HapDecoder().push(utf8WithBom)).toThrow('INVALID_JSON');
});

it('strictly round-trips the shared typed cursor recovery error over actual frames', () => {
	const fixture = fixtures.valid.find((item) => item.name === 'cursor-expired')!;
	const payload = fixture.payload as unknown as HapPayload;
	const frame = encodeHapFrame(payload);
	expect(new HapDecoder().push(frame)).toEqual([payload]);
	const response = structuredClone(fixture.payload) as { error: { data: Record<string, unknown> } };
	response.error.data.kind = 'CAPABILITY_DENIED';
	expect(() => encodeHapFrame(response as unknown as HapPayload)).toThrow('INVALID_ERROR');
});

it('rejects unknown fields and malformed nested cursor snapshot facts without changing inputs', () => {
	const fixture = fixtures.valid.find((item) => item.name === 'cursor-expired')!;
	for (const mutate of [
		(data: Record<string, unknown>) => { data.unknown = true; },
		(data: Record<string, unknown>) => { (data.details as Record<string, unknown>).unknown = true; },
		(data: Record<string, unknown>) => { (data.details as Record<string, unknown>).snapshotSeq = '01'; },
		(data: Record<string, unknown>) => { ((data.details as { snapshot: { run: Record<string, unknown> } }).snapshot.run).revision = '1.5'; },
	]) {
		const response = structuredClone(fixture.payload) as { error: { data: Record<string, unknown> } };
		mutate(response.error.data);
		const before = JSON.stringify(response);
		expect(() => encodeHapFrame(response as unknown as HapPayload)).toThrow();
		expect(JSON.stringify(response)).toBe(before);
	}
});

it('strictly round-trips only the canonical one-way cancel and enforces the request ID UTF-8 byte boundary', () => {
	for (const requestId of ['s:42', 's:编号\n1', `s:${'测'.repeat(42)}`, `s:${'😀'.repeat(31)}xx`]) {
		const control = { jsonrpc: '2.0' as const, method: '$/cancelRequest', params: { requestId } };
		expect(new HapDecoder().push(encodeHapFrame(control))).toEqual([control]);
	}
	for (const control of [
		{ jsonrpc: '2.0', id: 's:control', method: '$/cancelRequest', params: { requestId: 's:42' } },
		{ jsonrpc: '2.0', method: '$/cancelRequest', params: { requestId: 'c:42' } },
		{ jsonrpc: '2.0', method: '$/cancelRequest', params: { requestId: 's:' } },
		{ jsonrpc: '2.0', method: '$/cancelRequest', params: { requestId: 42 } },
		{ jsonrpc: '2.0', method: '$/cancelRequest', params: { requestId: 's:42', extra: true } },
		{ jsonrpc: '2.0', method: '$/cancelRequest', params: { requestId: `s:${'测'.repeat(43)}` } },
		{ jsonrpc: '2.0', method: '$/cancelRequest', params: { requestId: `s:${'😀'.repeat(32)}` } },
	]) expect(() => encodeHapFrame(control as HapPayload)).toThrow('INVALID_CANCEL_NOTIFICATION');
});
