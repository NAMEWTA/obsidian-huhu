import { expect, it } from 'vitest';
import { CredentialReceiptDecoder, encodeCredentialRequest } from './protocol';

const requestId = `request:${'a'.repeat(32)}`;
const credentialRef = `credential:${'b'.repeat(32)}`;
const metadata = { requestId, profileId: 'profile:test', credentialRef, storagePreference: 'session-memory' as const };
const receipt = { version: 1, requestId, profileId: metadata.profileId, credentialRef, mode: 'session-memory', state: 'available' };
function frame(value: unknown): Uint8Array {
	const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
	const prefix = Buffer.alloc(4);
	prefix.writeUInt32BE(bytes.length);
	return Buffer.concat([prefix, bytes]);
}

it('keeps raw secret bytes outside JSON and enforces operation/body/tail bounds', () => {
	const secret = Uint8Array.of(0, 255, 42);
	const bytes = encodeCredentialRequest(1, metadata, secret);
	expect(bytes.slice(-3)).toEqual(secret);
	expect(bytes[4]).toBe(1);
	expect(bytes[5]).toBe(1);
	expect(new TextDecoder().decode(bytes.subarray(8, 8 + new DataView(bytes.buffer).getUint16(6)))).not.toContain('255');
	expect(() => encodeCredentialRequest(9 as never, metadata, secret)).toThrow('INVALID_CREDENTIAL_REQUEST');
	expect(() => encodeCredentialRequest(3, metadata, secret)).toThrow('INVALID_CREDENTIAL_REQUEST');
	expect(() => encodeCredentialRequest(1, metadata, new Uint8Array(2049))).toThrow('INVALID_CREDENTIAL_REQUEST');
	expect(() => encodeCredentialRequest(1, { ...metadata, profileId: 'bad\nprofile' }, secret)).toThrow('INVALID_CREDENTIAL_REQUEST');
	expect(() => encodeCredentialRequest(1, { ...metadata, credentialRef: 'credential:reused-short' }, secret)).toThrow('INVALID_CREDENTIAL_REQUEST');
	expect(() => encodeCredentialRequest(1, { ...metadata, extra: true } as never, secret)).toThrow('INVALID_CREDENTIAL_REQUEST');
});

it('decodes fragmented bounded receipts and rejects untrusted receipt shapes', () => {
	const decoder = new CredentialReceiptDecoder();
	const bytes = frame(receipt);
	expect(decoder.push(bytes.slice(0, 2))).toEqual([]);
	expect(decoder.push(bytes.slice(2, 7))).toEqual([]);
	expect(decoder.push(bytes.slice(7))).toEqual([receipt]);
	decoder.finish();
	for (const invalid of [
		{ ...receipt, secret: 'sentinel' }, { ...receipt, state: 'persisted' }, { ...receipt, mode: 'plaintext' },
		{ ...receipt, reason: 'raw OS error' }, { ...receipt, reason: 'PROVIDER_FAILED' },
		JSON.stringify(receipt).replace('"version":1', '"version":1,"version":1'),
	]) expect(() => new CredentialReceiptDecoder().push(frame(invalid))).toThrow('INVALID_CREDENTIAL_RECEIPT');
	expect(() => new CredentialReceiptDecoder().push(Uint8Array.of(0, 0, 64, 1))).toThrow('CREDENTIAL_FRAME_TOO_LARGE');
	const truncated = new CredentialReceiptDecoder();
	truncated.push(bytes.slice(0, -1));
	expect(() => truncated.finish()).toThrow('CREDENTIAL_PARTIAL_FRAME');
});
