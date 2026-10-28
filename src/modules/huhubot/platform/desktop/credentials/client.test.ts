import { PassThrough, Writable } from 'node:stream';
import { afterEach, expect, it, vi } from 'vitest';
import { DesktopCredentialClient } from './client';

const clients: DesktopCredentialClient[] = [];
afterEach(() => { for (const client of clients.splice(0)) client.close(); vi.useRealTimers(); });
function frame(value: unknown): Buffer {
	const body = Buffer.from(JSON.stringify(value));
	const prefix = Buffer.alloc(4); prefix.writeUInt32BE(body.length);
	return Buffer.concat([prefix, body]);
}
function setup(respond = true) {
	const outgoing = new PassThrough();
	const incoming = new PassThrough();
	const writes: Buffer[] = [];
	const stopped = vi.fn();
	const client = new DesktopCredentialClient(outgoing, incoming, stopped);
	clients.push(client);
	outgoing.on('data', (raw: Buffer) => {
		writes.push(Buffer.from(raw));
		if (!respond) return;
		const length = raw.readUInt16BE(6);
		const meta = JSON.parse(raw.subarray(8, 8 + length).toString()) as Record<string, string>;
		incoming.write(frame({ version: 1, requestId: meta.requestId, profileId: meta.profileId,
			credentialRef: meta.credentialRef ?? '', mode: meta.storagePreference ?? 'none', state: 'available' }));
	});
	return { client, incoming, outgoing, writes, stopped };
}

it('handshakes, consumes caller buffers, generates fresh refs, and never replays registration', async () => {
	const peer = setup();
	await peer.client.connect('profile:test');
	const secret = Buffer.from('private-sentinel');
	const first = await peer.client.register(secret, 'session-memory');
	expect(secret.every((byte) => byte === 0)).toBe(true);
	expect(first).toMatchObject({ mode: 'session-memory', state: 'available', credentialRef: expect.stringMatching(/^credential:[a-f0-9]{32}$/) });
	const second = await peer.client.register(Buffer.from('another'), 'session-memory');
	expect(second.credentialRef).not.toBe(first.credentialRef);
	await peer.client.status(first.credentialRef);
	await peer.client.delete(first.credentialRef);
	expect(peer.writes.map((bytes) => bytes[5])).toEqual([0, 1, 1, 3, 2]);
	expect(peer.writes[1]?.subarray(-16).toString()).toBe('private-sentinel');
});

it.each(['profile', 'ref', 'unknown-field', 'state'])('fails closed on a mismatching or invalid receipt: %s', async (variant) => {
	const peer = setup(false);
	const connection = peer.client.connect('profile:test');
	const request = peer.writes[0]!;
	const meta = JSON.parse(request.subarray(8).toString()) as { requestId: string; profileId: string };
	peer.incoming.write(frame({ version: 1, ...meta, credentialRef: variant === 'ref' ? `credential:${'f'.repeat(32)}` : '',
		profileId: variant === 'profile' ? 'profile:other' : meta.profileId, mode: 'none', state: variant === 'state' ? 'persisted' : 'available',
		...(variant === 'unknown-field' ? { secret: 'sentinel' } : {}) }));
	await expect(connection).rejects.toThrow('CREDENTIAL');
	expect(peer.stopped).toHaveBeenCalledTimes(1);
});

it('returns an unknown registration on deadline, wipes retained bytes, and closes the slow peer', async () => {
	vi.useFakeTimers();
	const peer = setup(); await peer.client.connect('profile:test');
	peer.outgoing.removeAllListeners('data');
	const registration = peer.client.register(Buffer.from('deadline-secret'), 'protected');
	await vi.advanceTimersByTimeAsync(3000);
	await expect(registration).resolves.toMatchObject({ mode: 'protected', state: 'unknown', reason: 'OPERATION_TIMEOUT' });
	expect(peer.stopped).toHaveBeenCalledTimes(1);
	expect(peer.writes).toHaveLength(1);
});

it.each([
	{ state: 'failed', reason: 'PROTECTION_UNAVAILABLE' },
	{ state: 'unknown', reason: 'OPERATION_TIMEOUT' },
])('preserves explicit protected $state and queries the same ref without fallback/replay', async ({ state, reason }) => {
	const peer = setup(); await peer.client.connect('profile:test');
	peer.outgoing.removeAllListeners('data');
	peer.outgoing.on('data', (raw: Buffer) => {
		peer.writes.push(Buffer.from(raw));
		const meta = JSON.parse(raw.subarray(8, 8 + raw.readUInt16BE(6)).toString()) as Record<string, string>;
		peer.incoming.write(frame({ version: 1, requestId: meta.requestId, profileId: meta.profileId,
			credentialRef: meta.credentialRef, mode: 'protected', state: raw[5] === 1 ? state : 'missing', reason: raw[5] === 1 ? reason : 'CREDENTIAL_MISSING' }));
	});
	const result = await peer.client.register(Buffer.from('protected-sentinel'), 'protected');
	expect(result).toMatchObject({ mode: 'protected', state, reason });
	await peer.client.status(result.credentialRef);
	expect(peer.writes.map((bytes) => bytes[5])).toEqual([0, 1, 3]);
	expect(peer.stopped).not.toHaveBeenCalled();
});

it('bounds eight pending requests and cleans partial receipts, EOF and blocked writes', async () => {
	vi.useFakeTimers();
	const peer = setup(); await peer.client.connect('profile:test');
	await new Promise<void>((resolve) => process.nextTick(resolve));
	peer.outgoing.removeAllListeners('data');
	const pending = Array.from({ length: 8 }, () => peer.client.status(`credential:${'a'.repeat(32)}`));
	await expect(peer.client.status(`credential:${'a'.repeat(32)}`)).rejects.toThrow('CREDENTIAL_IN_FLIGHT_LIMIT');
	await Promise.all(pending);
	expect(peer.stopped).toHaveBeenCalledTimes(1);
	const partial = setup(false);
	const connecting = partial.client.connect('profile:test');
	partial.incoming.write(Uint8Array.of(0, 0));
	partial.incoming.end();
	await expect(connecting).rejects.toThrow('CREDENTIAL_PARTIAL_FRAME');
	const blockedInput = new Writable({ write() { /* deliberately never acknowledges */ } });
	const blocked = new DesktopCredentialClient(blockedInput, new PassThrough(), vi.fn()); clients.push(blocked);
	const blockedConnect = blocked.connect('profile:test');
	const rejection = expect(blockedConnect).rejects.toThrow('CREDENTIAL_TIMEOUT');
	await vi.advanceTimersByTimeAsync(3000);
	await rejection;
});
