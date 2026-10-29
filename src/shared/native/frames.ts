/**
 * Frames exchanged with the native terminal helper over its standard streams: a 4-byte big-endian length
 * of the rest, a 1-byte kind, then the body. Control bodies are JSON; session bodies start with a 4-byte
 * big-endian session number.
 */

export const FRAME_CONTROL = 1;
export const FRAME_INPUT = 2;
export const FRAME_OUTPUT = 3;
/** Client → helper only; never accepted as helper stdout. */
export const FRAME_INPUT_PART = 4;
export const FRAME_REPLY = 5;
export const MAX_FRAME = 16 * 1024 * 1024;
export const HELPER_PROTOCOL = 3;
import { NATIVE_INPUT_LIMITS } from './input';

export type HelperFrame =
	| { kind: typeof FRAME_CONTROL; message: Record<string, unknown> }
	| { kind: typeof FRAME_OUTPUT | typeof FRAME_INPUT; session: number; bytes: Uint8Array };

/** Parses one complete raw body synchronously; owns UTF8/JSON validation and may throw before emission. */
export type ControlBodyParser = (body: Uint8Array) => Record<string, unknown>;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

/** Count UTF8 without allocating a second copy of caller-owned text. Lone surrogates encode as U+FFFD. */
export function utf8Length(value: string | Uint8Array, limit: number): number {
	if (typeof value !== 'string') {
		if (value.byteLength > limit) throw new Error('Native input capacity exceeded');
		return value.byteLength;
	}
	let count = 0;
	for (let at = 0; at < value.length; at++) {
		const c = value.charCodeAt(at);
		if (c < 0x80) count++;
		else if (c < 0x800) count += 2;
		else if (
			c >= 0xd800 &&
			c <= 0xdbff &&
			at + 1 < value.length &&
			value.charCodeAt(at + 1) >= 0xdc00 &&
			value.charCodeAt(at + 1) <= 0xdfff
		) {
			count += 4;
			at++;
		} else count += 3;
		if (count > limit) throw new Error('Native input capacity exceeded');
	}
	return count;
}
export function utf8Bytes(value: string | Uint8Array, limit: number): Uint8Array {
	utf8Length(value, limit);
	return typeof value === 'string' ? encoder.encode(value) : value;
}
const u32 = (n: number, zero = false) => Number.isInteger(n) && n >= (zero ? 0 : 1) && n <= 0xffff_ffff;

export function encodeInputPart(session: number, op: number, offset: number, data: Uint8Array): Uint8Array {
	if (
		!u32(session) ||
		!u32(op) ||
		!u32(offset, true) ||
		!data.length ||
		data.length > NATIVE_INPUT_LIMITS.fragmentBytes
	)
		throw new Error('Invalid native input part capacity or identity');
	const out = header(data.length + 12, FRAME_INPUT_PART);
	const view = new DataView(out.buffer);
	view.setUint32(5, session);
	view.setUint32(9, op);
	view.setUint32(13, offset);
	out.set(data, 17);
	return out;
}
export function encodeReply(session: number, bytes: Uint8Array | string): Uint8Array {
	if (!u32(session)) throw new Error('Invalid native reply identity');
	const data = utf8Bytes(bytes, NATIVE_INPUT_LIMITS.replyFrameBytes);
	const out = header(data.length + 4, FRAME_REPLY);
	new DataView(out.buffer).setUint32(5, session);
	out.set(data, 9);
	return out;
}

function header(length: number, kind: number): Uint8Array {
	if (length + 1 > MAX_FRAME) throw new Error('Native frame capacity exceeded');
	const out = new Uint8Array(5 + length);
	new DataView(out.buffer).setUint32(0, length + 1);
	out[4] = kind;
	return out;
}

/** Bounded preflight precedes stringify/TextEncoder; caller-owned payloads remain borrowed. */
function controlSnapshot(
	message: Record<string, unknown>,
	limit: number,
): { value: Record<string, unknown>; bytes: number } {
	let bytes = 0,
		nodes = 0;
	const seen = new Set<object>();
	const add = (n: number) => {
		bytes += n;
		if (bytes > limit) throw new Error('Native control capacity exceeded');
	};
	const text = (value: string) => {
		add(2);
		for (let at = 0; at < value.length; at++) {
			const c = value.charCodeAt(at);
			if (c < 32 || c === 34 || c === 92) add(c < 32 ? 6 : 2);
			else if (c < 128) add(1);
			else if (c < 2048) add(2);
			else if (
				c >= 0xd800 &&
				c <= 0xdbff &&
				at + 1 < value.length &&
				value.charCodeAt(at + 1) >= 0xdc00 &&
				value.charCodeAt(at + 1) <= 0xdfff
			) {
				add(4);
				at++;
			} else add(c >= 0xd800 && c <= 0xdfff ? 6 : 3);
		}
	};
	const visit = (value: unknown, depth: number): unknown => {
		if (++nodes > 4096 || depth > 16) throw new Error('Native control capacity exceeded');
		if (typeof value === 'string') text(value);
		else if (value === null || value === undefined) add(4);
		else if (typeof value === 'number') add(Number.isFinite(value) ? String(value).length : 4);
		else if (typeof value === 'boolean') add(value ? 4 : 5);
		else if (typeof value === 'object') {
			if (seen.has(value)) throw new Error('Circular native control');
			const array = Array.isArray(value),
				proto = Object.getPrototypeOf(value) as unknown;
			if (
				(proto !== null && proto !== (array ? Array.prototype : Object.prototype)) ||
				Object.getOwnPropertyDescriptor(value, 'toJSON') ||
				(proto && Object.getOwnPropertyDescriptor(proto, 'toJSON'))
			)
				throw new Error('Native controls require plain DTOs without toJSON');
			seen.add(value);
			add(2);
			const snapshot: unknown[] | Record<string, unknown> = array
				? []
				: (Object.create(null) as Record<string, unknown>);
			const property = (key: string) => {
				const descriptor = Object.getOwnPropertyDescriptor(value, key);
				if (descriptor && !('value' in descriptor)) throw new Error('Native controls reject accessors');
				return visit(descriptor?.value, depth + 1);
			};
			if (array) {
				for (let at = 0; at < value.length; at++) {
					add(1);
					(snapshot as unknown[]).push(property(String(at)));
				}
			} else {
				for (const key in value)
					if (Object.hasOwn(value, key)) {
						text(key);
						add(2);
						(snapshot as Record<string, unknown>)[key] = property(key);
					}
			}
			seen.delete(value);
			return snapshot;
		} else throw new Error('Invalid native control value');
		return value;
	};
	const value = visit(message, 0) as Record<string, unknown>;
	return { value, bytes };
}
export function controlBytes(message: Record<string, unknown>, limit = 64 * 1024): number {
	return controlSnapshot(message, limit).bytes;
}
export function encodeControl(message: Record<string, unknown>, limit = 64 * 1024): Uint8Array {
	const snapshot = controlSnapshot(message, limit);
	const body = encoder.encode(JSON.stringify(snapshot.value));
	const out = header(body.length, FRAME_CONTROL);
	out.set(body, 5);
	return out;
}

/**
 * Copies a prevalidated body into a kind1 frame without UTF8/JSON validation. The caller reserves
 * body.length + 5 bytes first. The required body-only limit is 0..MAX_FRAME-1; overflow rejects before allocation.
 */
export function encodeControlBody(body: Uint8Array, limit: number): Uint8Array {
	if (!Number.isSafeInteger(limit) || limit < 0 || limit >= MAX_FRAME || body.byteLength > limit)
		throw new Error('Native control frame capacity exceeded');
	const out = header(body.byteLength, FRAME_CONTROL);
	out.set(body, 5);
	return out;
}

export function encodeInput(session: number, bytes: Uint8Array | string): Uint8Array {
	const data = utf8Bytes(bytes, NATIVE_INPUT_LIMITS.operationBytes);
	const out = header(data.length + 4, FRAME_INPUT);
	new DataView(out.buffer).setUint32(5, session);
	out.set(data, 9);
	return out;
}

/** Incremental decoder: push stdout chunks of any size, get whole frames back in order. */
export class FrameDecoder {
	private readonly header = new Uint8Array(5);
	private head = 0;
	private body?: Uint8Array;
	private at = 0;
	private kind = 0;
	constructor(
		private readonly limits = { controlBytes: MAX_FRAME - 1, sessionBytes: MAX_FRAME - 5 },
		private readonly parseControlBody?: ControlBodyParser,
	) {}
	/** Streams one frame at a time; helper consumers do not retain an array of all frames from a chunk. */
	consume(chunk: Uint8Array, emit: (frame: HelperFrame) => void): void {
		let offset = 0;
		while (offset < chunk.length) {
			if (this.head < 5) {
				const n = Math.min(5 - this.head, chunk.length - offset);
				this.header.set(chunk.subarray(offset, offset + n), this.head);
				this.head += n;
				offset += n;
				if (this.head < 4) return;
				const length = new DataView(this.header.buffer).getUint32(0);
				if (!length || length > MAX_FRAME)
					throw new Error(`Terminal helper frame length ${length} is out of range`);
				if (this.head < 5) return;
				this.kind = this.header[4]!;
				if (this.kind === FRAME_CONTROL) {
					if (length - 1 > this.limits.controlBytes)
						throw new Error('Native control frame capacity exceeded');
				} else if (this.kind === FRAME_OUTPUT || this.kind === FRAME_INPUT) {
					if (length < 5 || length - 5 > this.limits.sessionBytes)
						throw new Error('Native session frame capacity exceeded');
				} else throw new Error(`Terminal helper sent unknown frame kind ${this.kind}`);
				this.body = new Uint8Array(length - 1);
				this.at = 0;
			}
			const body = this.body!,
				n = Math.min(body.length - this.at, chunk.length - offset);
			body.set(chunk.subarray(offset, offset + n), this.at);
			this.at += n;
			offset += n;
			if (this.at !== body.length) return;
			const kind = this.kind;
			this.head = 0;
			this.body = undefined;
			this.at = 0;
			if (kind === FRAME_CONTROL) {
				const message: unknown = this.parseControlBody
					? this.parseControlBody(body)
					: JSON.parse(decoder.decode(body));
				if (!message || typeof message !== 'object' || Array.isArray(message))
					throw new Error('Terminal helper sent a non-object message');
				emit({ kind, message: message as Record<string, unknown> });
			} else {
				const session = new DataView(body.buffer, body.byteOffset, 4).getUint32(0);
				emit({ kind: kind as typeof FRAME_OUTPUT | typeof FRAME_INPUT, session, bytes: body.subarray(4) });
			}
		}
	}
	push(chunk: Uint8Array): HelperFrame[] {
		const frames: HelperFrame[] = [];
		this.consume(chunk, (frame) => frames.push(frame));
		return frames;
	}
}
