import type { CredentialStatus } from '../../../api';

export const CREDENTIAL_BODY_LIMIT = 16_384;
const METADATA_LIMIT = 2048;
export const SECRET_LIMIT = 2048;
export const CREDENTIAL_REASONS = [
	'CREDENTIAL_MISSING', 'CREDENTIAL_DELETED', 'PROTECTION_UNAVAILABLE', 'PROTECTION_LOCKED',
	'PROTECTION_DENIED', 'PROVIDER_FAILED', 'OPERATION_TIMEOUT', 'CREDENTIAL_IN_USE',
	'CREDENTIAL_REF_REUSED', 'CREDENTIAL_REF_INVALID', 'PROFILE_MISMATCH', 'REGISTRATION_FAILED',
	'CATALOG_UNAVAILABLE', 'SESSION_CLOSED', 'IN_FLIGHT_LIMIT', 'REQUEST_CANCELED',
] as const;
export type CredentialOperation = 0 | 1 | 2 | 3;
export interface CredentialMetadata {
	requestId: string;
	profileId: string;
	credentialRef?: string;
	storagePreference?: 'protected' | 'session-memory';
}
export interface CredentialReceipt extends CredentialStatus {
	version: 1;
	requestId: string;
	profileId: string;
	credentialRef: string;
}
const requestPattern = /^request:[a-f0-9]{32}$/;
export const credentialRefPattern = /^credential:[a-f0-9]{32}$/;
const profilePattern = /^[\x20-\x7e]{1,256}$/;
const encoder = new TextEncoder();
const utf8 = new TextDecoder('utf-8', { fatal: true });
const object = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export function encodeCredentialRequest(
	operation: CredentialOperation,
	metadata: CredentialMetadata,
	secret: Uint8Array = new Uint8Array(),
): Uint8Array {
	const fields = operation === 0 ? ['requestId', 'profileId'] : operation === 1
		? ['requestId', 'profileId', 'credentialRef', 'storagePreference'] : ['requestId', 'profileId', 'credentialRef'];
	if (
		![0, 1, 2, 3].includes(operation) || !object(metadata) ||
		Object.keys(metadata).length !== fields.length || Object.keys(metadata).some((key) => !fields.includes(key)) ||
		typeof metadata.requestId !== 'string' || !requestPattern.test(metadata.requestId) ||
		typeof metadata.profileId !== 'string' || !profilePattern.test(metadata.profileId) ||
		(operation !== 0 && !credentialRefPattern.test(metadata.credentialRef ?? '')) ||
		(operation === 1 && !['protected', 'session-memory'].includes(metadata.storagePreference ?? '')) ||
		(operation === 1 ? secret.length < 1 || secret.length > SECRET_LIMIT : secret.length !== 0)
	) throw new Error('INVALID_CREDENTIAL_REQUEST');
	const json = encoder.encode(JSON.stringify(metadata));
	const bodyLength = 4 + json.length + secret.length;
	if (json.length > METADATA_LIMIT || bodyLength > CREDENTIAL_BODY_LIMIT) throw new Error('INVALID_CREDENTIAL_REQUEST');
	const frame = new Uint8Array(4 + bodyLength);
	const view = new DataView(frame.buffer);
	view.setUint32(0, bodyLength);
	frame[4] = 1;
	frame[5] = operation;
	view.setUint16(6, json.length);
	frame.set(json, 8);
	frame.set(secret, 8 + json.length);
	return frame;
}

/** JSON.parse checks grammar; this scan also rejects duplicate keys before discarding their spelling. */
function hasDuplicateKeys(json: string): boolean {
	const keys = new Set<string>();
	for (let index = 0; index < json.length; index++) {
		if (json[index] !== '"') continue;
		const start = index++;
		while (index < json.length) {
			if (json[index] === '\\') index += 2;
			else if (json[index++] === '"') break;
		}
		const end = index;
		while (/\s/.test(json[index] ?? '') && index < json.length) index++;
		if (json[index] === ':') {
			const key = JSON.parse(json.slice(start, end)) as string;
			if (keys.has(key)) return true;
			keys.add(key);
		}
		index--;
	}
	return false;
}
function receipt(bytes: Uint8Array): CredentialReceipt {
	try {
		const json = utf8.decode(bytes);
		const value: unknown = JSON.parse(json);
		if (!object(value) || hasDuplicateKeys(json)) throw new Error();
		const fields = ['version', 'requestId', 'profileId', 'credentialRef', 'mode', 'state', 'reason'];
		if (Object.keys(value).some((key) => !fields.includes(key)) ||
			value.version !== 1 || typeof value.requestId !== 'string' || !requestPattern.test(value.requestId) ||
			typeof value.profileId !== 'string' || !profilePattern.test(value.profileId) ||
			typeof value.credentialRef !== 'string' || (value.credentialRef !== '' && !credentialRefPattern.test(value.credentialRef)) ||
			!['protected', 'session-memory', 'none'].includes(value.mode as string) ||
			!['available', 'missing', 'failed', 'unknown'].includes(value.state as string) ||
			(value.reason !== undefined && !CREDENTIAL_REASONS.includes(value.reason as never)) ||
			(value.state === 'available' && value.reason !== undefined)
		) throw new Error();
		return value as unknown as CredentialReceipt;
	} catch { throw new Error('INVALID_CREDENTIAL_RECEIPT'); }
}

/** Allocates only after a bounded prefix; a peer cannot grow an unbounded concatenation buffer. */
export class CredentialReceiptDecoder {
	private prefix = new Uint8Array(4);
	private prefixBytes = 0;
	private body?: Uint8Array;
	private bodyBytes = 0;
	get partial(): boolean { return this.prefixBytes !== 0; }
	push(bytes: Uint8Array): CredentialReceipt[] {
		const receipts: CredentialReceipt[] = [];
		let index = 0;
		while (index < bytes.length) {
			if (!this.body) {
				const count = Math.min(4 - this.prefixBytes, bytes.length - index);
				this.prefix.set(bytes.subarray(index, index + count), this.prefixBytes);
				this.prefixBytes += count;
				index += count;
				if (this.prefixBytes < 4) continue;
				const length = new DataView(this.prefix.buffer).getUint32(0);
				if (length < 1 || length > CREDENTIAL_BODY_LIMIT) throw new Error('CREDENTIAL_FRAME_TOO_LARGE');
				this.body = new Uint8Array(length);
			}
			const count = Math.min(this.body.length - this.bodyBytes, bytes.length - index);
			this.body.set(bytes.subarray(index, index + count), this.bodyBytes);
			index += count;
			this.bodyBytes += count;
			if (this.bodyBytes === this.body.length) {
				receipts.push(receipt(this.body));
				this.body = undefined;
				this.bodyBytes = 0;
				this.prefixBytes = 0;
			}
		}
		return receipts;
	}
	finish(): void {
		if (this.partial) throw new Error('CREDENTIAL_PARTIAL_FRAME');
	}
}
