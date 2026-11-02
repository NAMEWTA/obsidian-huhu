import type { BotErrorData } from '../../api';
export type { HapCancelNotification } from '../../api';
import { HapProtocolError, methodValidation } from './method-validation';
export { HapProtocolError } from './method-validation';
export const HAP_VERSION = '0.1';
export const HAP_JSON_KIND = 1;
export const MAX_FRAME_BYTES = 1_048_576;
export const MAX_BATCH_ITEMS = 8;

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface HapRequest {
	jsonrpc: '2.0';
	id?: string;
	method: string;
	params?: { [key: string]: JsonValue };
}
export interface HapWireError {
	code: number;
	message: string;
	data: BotErrorData;
}
export interface HapResponse {
	jsonrpc: '2.0';
	id: string | null;
	result?: JsonValue;
	error?: HapWireError;
}
export type HapMessage = HapRequest | HapResponse;
export type HapPayload = HapMessage | HapMessage[];

const encoder = new TextEncoder();
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const record = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const validId = (value: unknown): value is string =>
	typeof value === 'string' &&
	encoder.encode(value).length <= 128 &&
	value.length > 2 &&
	(value.startsWith('c:') || value.startsWith('s:'));

function validateMessage(value: unknown): asserts value is HapMessage {
	if (!record(value) || value.jsonrpc !== '2.0') throw new HapProtocolError('INVALID_ENVELOPE');
	if ('id' in value && value.id !== null && typeof value.id !== 'string')
		throw new HapProtocolError('INVALID_ENVELOPE');
	if (typeof value.id === 'string' && !validId(value.id)) throw new HapProtocolError('INVALID_ID');
	if ('method' in value) {
		if (Object.keys(value).some((key) => !['jsonrpc', 'id', 'method', 'params'].includes(key)))
			throw new HapProtocolError('INVALID_ENVELOPE');
		if (
			typeof value.method !== 'string' ||
			!value.method ||
			encoder.encode(value.method).length > 128 ||
			('id' in value && value.id === null)
		)
			throw new HapProtocolError('INVALID_ENVELOPE');
		if ('params' in value && !record(value.params)) throw new HapProtocolError('INVALID_PARAMS');
		if (value.method === '$/cancelRequest' && (!methodValidation.validateCancelNotification(value) ||
			!record(value.params) || !validId(value.params.requestId) || !value.params.requestId.startsWith('s:')))
			throw new HapProtocolError('INVALID_CANCEL_NOTIFICATION');
	} else {
		if (Object.keys(value).some((key) => !['jsonrpc', 'id', 'result', 'error'].includes(key)))
			throw new HapProtocolError('INVALID_ENVELOPE');
		if (!('id' in value) || 'result' in value === 'error' in value) throw new HapProtocolError('INVALID_ENVELOPE');
		if (value.id === null && !('error' in value)) throw new HapProtocolError('INVALID_ID');
		if ('error' in value) {
			const error = value.error;
			if (
				!record(error) ||
				!record(error.data) ||
				!error.data.kind ||
				!error.data.reason ||
				!error.data.correlationId
			)
				throw new HapProtocolError('INVALID_ENVELOPE');
			if (
				Object.keys(error).some((key) => !['code', 'message', 'data'].includes(key)) ||
				Object.keys(error.data).some((key) => !['kind', 'reason', 'retryable', 'correlationId', 'details'].includes(key))
			)
				throw new HapProtocolError('INVALID_ENVELOPE');
			if (
				!Number.isInteger(error.code) ||
				typeof error.message !== 'string' ||
				typeof error.data.kind !== 'string' ||
				!methodValidation.validateErrorData(error.data) ||
				typeof error.data.reason !== 'string' ||
				typeof error.data.retryable !== 'boolean' ||
				typeof error.data.correlationId !== 'string'
			)
				throw new HapProtocolError('INVALID_ERROR');
		}
	}
}

export function validateHapPayload(value: unknown): asserts value is HapPayload {
	if (Array.isArray(value)) {
		if (!value.length || value.length > MAX_BATCH_ITEMS) throw new HapProtocolError('BATCH_LIMIT');
		for (const message of value) validateMessage(message);
	} else validateMessage(value);
}

/** The length includes kind, excludes the four-byte prefix, and is checked before allocation. */
export function encodeHapFrame(payload: HapPayload): Uint8Array {
	validateHapPayload(payload);
	const bytes = encoder.encode(JSON.stringify(payload));
	if (bytes.length + 1 > MAX_FRAME_BYTES) throw new HapProtocolError('FRAME_TOO_LARGE');
	const frame = new Uint8Array(bytes.length + 5);
	new DataView(frame.buffer).setUint32(0, bytes.length + 1);
	frame[4] = HAP_JSON_KIND;
	frame.set(bytes, 5);
	return frame;
}

/** Retains at most one bounded frame. A malformed frame permanently poisons this decoder. */
export class HapDecoder {
	private readonly prefix = new Uint8Array(4);
	private prefixUsed = 0;
	private body?: Uint8Array;
	private bodyUsed = 0;
	private failed = false;

	push(chunk: Uint8Array): HapPayload[] {
		if (this.failed) throw new HapProtocolError('DECODER_CLOSED');
		const frames: HapPayload[] = [];
		let offset = 0;
		try {
			while (offset < chunk.length) {
				if (!this.body) {
					const count = Math.min(4 - this.prefixUsed, chunk.length - offset);
					this.prefix.set(chunk.subarray(offset, offset + count), this.prefixUsed);
					this.prefixUsed += count;
					offset += count;
					if (this.prefixUsed < 4) break;
					const length = new DataView(this.prefix.buffer).getUint32(0);
					if (length < 1 || length > MAX_FRAME_BYTES)
						throw new HapProtocolError(length < 1 ? 'FRAME_EMPTY' : 'FRAME_TOO_LARGE');
					this.body = new Uint8Array(length);
					this.bodyUsed = 0;
				}
				const count = Math.min(this.body.length - this.bodyUsed, chunk.length - offset);
				this.body.set(chunk.subarray(offset, offset + count), this.bodyUsed);
				this.bodyUsed += count;
				offset += count;
				if (this.bodyUsed !== this.body.length) continue;
				if (this.body[0] !== HAP_JSON_KIND) throw new HapProtocolError('UNKNOWN_KIND');
				let decoded: string;
				try {
					decoded = utf8.decode(this.body.subarray(1));
				} catch {
					throw new HapProtocolError('INVALID_UTF8');
				}
				let value: unknown;
				try {
					value = JSON.parse(decoded);
				} catch {
					throw new HapProtocolError('INVALID_JSON');
				}
				validateHapPayload(value);
				frames.push(value);
				this.body = undefined;
				this.prefixUsed = 0;
			}
			return frames;
		} catch (error) {
			this.failed = true;
			this.body = undefined;
			throw error;
		}
	}

	finish(): void {
		if (this.failed) return;
		if (this.prefixUsed || this.body) {
			this.failed = true;
			this.body = undefined;
			throw new HapProtocolError('TRUNCATED_FRAME');
		}
	}
}
