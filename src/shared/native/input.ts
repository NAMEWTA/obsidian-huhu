import {
	EDITOR_LIMITS,
	EDITOR_BINARY,
	type NativeEditorOutcome,
	type NativeEditorIdentity,
	type NativeEditorRegistration,
	type NativeEditorCloseReason,
} from './control-wire.generated';
export { EDITOR_LIMITS as NATIVE_EDITOR_LIMITS } from './control-wire.generated';
export type {
	NativeEditorLaunch,
	NativeEditorRecipe,
	NativeEditorIdentity,
	NativeEditorRegistration,
	NativeEditorOutcome,
	NativeEditorNoneReason,
	NativeEditorUnknownReason,
} from './control-wire.generated';

/** Optional protocol-3 whole-operation admission. These are logical byte/count bounds, not RSS claims. */
export interface NativeInputLimits {
	readonly operationBytes: number;
	readonly fragmentBytes: number;
	readonly sessionQueuedBytes: number;
	readonly sessionQueuedOperations: number;
	readonly helperQueuedBytes: number;
	readonly helperQueuedOperations: number;
	readonly replyFrameBytes: number;
	readonly sessionReplyBytes: number;
	readonly helperReplyBytes: number;
}

/** Conservative finite profile; pressure measurements accompany the native implementation. */
export const NATIVE_INPUT_LIMITS: Readonly<NativeInputLimits> = Object.freeze({
	operationBytes: 256 * 1024,
	fragmentBytes: 16 * 1024,
	sessionQueuedBytes: 512 * 1024,
	sessionQueuedOperations: 32,
	helperQueuedBytes: 2 * 1024 * 1024,
	helperQueuedOperations: 128,
	replyFrameBytes: 4 * 1024,
	sessionReplyBytes: 16 * 1024,
	helperReplyBytes: 128 * 1024,
});
export const NATIVE_INPUT_TIMEOUT_MS = 10_000;
export type NativeInputNoneReason = 'capacity' | 'closed' | 'unsupported' | 'cancelled' | 'invalid';
export type NativeInputUnknownReason = 'transport-lost' | 'timeout' | 'write-failed' | 'expired';
export type NativeInputFailure =
	| { readonly op: number; readonly state: 'none'; readonly reason: NativeInputNoneReason }
	| { readonly op: number; readonly state: 'unknown'; readonly reason: NativeInputUnknownReason };
/** Describes one lost/rejected device reply, never the effect of the entire reply stream. */
export type NativeReplyFailure =
	| { readonly state: 'none'; readonly reason: 'capacity' | 'closed' | 'invalid' }
	| { readonly state: 'unknown'; readonly reason: 'transport-lost' | 'write-failed' };
export type NativeInputQueuedResult = { readonly op: number; readonly state: 'queued' } | NativeInputFailure;
export type NativeInputFinishedResult = { readonly op: number; readonly state: 'written' } | NativeInputFailure;
export type NativeResizeQueuedResult = { readonly op: number; readonly state: 'queued' } | NativeInputFailure;
export type NativeResizeFinishedResult =
	{ readonly op: number; readonly state: 'applied' | 'superseded' } | NativeInputFailure;
export interface NativeInputSubmission {
	readonly op: number;
	readonly queued: Promise<NativeInputQueuedResult>;
	/** Complete PTY write+flush only; does not prove consumption, execution or model success. */
	readonly finished: Promise<NativeInputFinishedResult>;
	/** Cancelling races the native writer claim. Only a matching result can prove no write. */
	cancel(): void;
}
export interface NativeResizeSubmission {
	readonly op: number;
	readonly queued: Promise<NativeResizeQueuedResult>;
	readonly finished: Promise<NativeResizeFinishedResult>;
	cancel(): void;
}
export interface NativeInputOptions {
	readonly signal?: AbortSignal;
}

export type NativeEditorFailure = Exclude<NativeEditorOutcome, { readonly state: 'adapter-applied' }>;
/** Local admission failure only; none is specific to this attempt and never erases earlier effects. */
export class NativeEditorError extends Error {
	constructor(readonly failure: NativeEditorFailure) {
		super(`Native editor ${failure.state}: ${failure.reason}`);
		this.name = 'NativeEditorError';
	}
}
export type NativeEditorQueuedResult =
	| { readonly op: number; readonly state: 'queued' }
	| ({ readonly op: number } & Exclude<NativeEditorFailure, { readonly state: 'partial' }>);
export type NativeEditorFinishedResult = { readonly op: number } & NativeEditorOutcome;
export interface NativeEditorInputOptions {
	/** Frozen T06 registration UUID, matched again before dispatch and by the application gate. */
	readonly sourceInstance: string;
	/** Remaining original budget, captured on receipt using this process's monotonic clock, capped at 10s. */
	readonly remainingMs: number;
	readonly signal?: AbortSignal;
}

export interface NativeSpawnEnvironment {
	/** Captured helper-start environment + explicit overrides only; never expose through CLI replies/logs. */
	readonly values: Readonly<Record<string, string>>;
	/** Unix's missing SHELL is not invented here; Windows registry augmentation remains unverified. */
	readonly completeness: 'complete' | 'unix-shell-default' | 'unverified-platform';
}
/** Pure profile snapshot. Limits count UTF8 keys+values and entries, not a JSON wire or total process RSS. */
export function snapshotSpawnEnvironment(
	captured: Readonly<Record<string, string | undefined>>,
	overrides: Readonly<Record<string, string>>,
	platform: 'unix' | 'windows',
): NativeSpawnEnvironment {
	const fail = (reason: 'invalid' | 'capacity'): never => {
		throw new NativeEditorError({ state: 'none', effect: 'none', reason });
	};
	for (const value of [captured, overrides]) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('invalid');
		const proto: unknown = Object.getPrototypeOf(value);
		if (proto !== null && proto !== Object.prototype) fail('invalid');
		for (const object of [value, proto]) {
			if (!object) continue;
			const json = Object.getOwnPropertyDescriptor(object, 'toJSON');
			if (json && (!('value' in json) || typeof json.value === 'function')) fail('invalid');
		}
	}
	const rows: [string, string][] = [];
	let bytes = 0;
	for (const [index, source] of [captured, overrides].entries()) {
		for (const key in source) {
			if (!Object.hasOwn(source, key)) continue;
			if (index === 0 && Object.getOwnPropertyDescriptor(overrides, key)?.enumerable) continue;
			const descriptor = Object.getOwnPropertyDescriptor(source, key);
			if (!descriptor || !('value' in descriptor)) return fail('invalid');
			const value: unknown = descriptor.value;
			if (value === undefined && index === 0) continue; // Node omits these from its env block.
			if (typeof value !== 'string' || !key) return fail('invalid');
			if (
				rows.length >= EDITOR_LIMITS.environmentEntries ||
				key.length + value.length > EDITOR_LIMITS.environmentBytes
			)
				fail('capacity');
			bytes += editorBodyBytes(key) + (value ? editorBodyBytes(value) : 0);
			if (bytes > EDITOR_LIMITS.environmentBytes) fail('capacity');
			rows.push([key, value]);
		}
	}
	const values: Record<string, string> = Object.create(null) as Record<string, string>;
	for (const [key, value] of rows) values[key] = value;
	return Object.freeze({
		values: Object.freeze(values),
		completeness:
			platform !== 'unix'
				? 'unverified-platform'
				: Object.hasOwn(values, 'SHELL')
					? 'complete'
					: 'unix-shell-default',
	});
}
export interface NativeEditorSubmission {
	readonly op: number;
	readonly queued: Promise<NativeEditorQueuedResult>;
	/** adapter-applied is one original-editor paste+Enter operation, never PTY written or model success. */
	readonly finished: Promise<NativeEditorFinishedResult>;
	/** Real ownership settlement; finished unknown may precede this. Rejection never proves zero effects. */
	readonly settled: Promise<void>;
	/** Only original-owner evidence may turn queued cancellation into none; never replay a dispatched operation. */
	cancel(): void;
}
export interface NativeEditorCloseNotice {
	readonly reason: NativeEditorCloseReason;
}
/** One original lease/generation/SID. Never looked up or reconnected through a later helper generation. */
export interface NativeEditorBinding {
	readonly sid: number;
	readonly identity: NativeEditorIdentity;
	readonly active: boolean;
	/** Validated native registration, not a permanent foreground/readiness assertion. */
	readonly ready: Promise<NativeEditorRegistration>;
	/** Physical binding ownership ended; transport rejection remains unknown, not a no-effect proof. */
	readonly closed: Promise<NativeEditorCloseNotice>;
	submit(text: string | Uint8Array, options: NativeEditorInputOptions): NativeEditorSubmission;
	/** Revokes admission synchronously. Bounded observation rejection retains outstanding physical charges. */
	close(): Promise<void>;
}

/** Measures caller-owned text without making an encoded/decoded copy. Acquire the body permit before encoding. */
export function editorBodyBytes(value: string | Uint8Array): number {
	const invalid = () => {
		throw new NativeEditorError({ state: 'none', effect: 'none', reason: 'invalid' });
	};
	const capacity = () => {
		throw new NativeEditorError({ state: 'none', effect: 'none', reason: 'capacity' });
	};
	if (typeof value === 'string') {
		if (value.length > EDITOR_LIMITS.bodyBytes) capacity();
		let bytes = 0;
		for (let i = 0; i < value.length; i++) {
			const c = value.charCodeAt(i);
			if (c < 128) bytes++;
			else if (c < 2048) bytes += 2;
			else if (c >= 0xd800 && c <= 0xdbff) {
				const next = value.charCodeAt(++i);
				if (!(next >= 0xdc00 && next <= 0xdfff)) invalid();
				bytes += 4;
			} else if (c >= 0xdc00 && c <= 0xdfff) invalid();
			else bytes += 3;
			if (bytes > EDITOR_LIMITS.bodyBytes) capacity();
		}
		if (!bytes) invalid();
		return bytes;
	}
	if (value.byteLength > EDITOR_LIMITS.bodyBytes) capacity();
	if (!value.byteLength) invalid();
	for (let i = 0; i < value.byteLength;) {
		const a = value[i++]!;
		if (a < 128) continue;
		const count = a >= 0xc2 && a <= 0xdf ? 1 : a >= 0xe0 && a <= 0xef ? 2 : a >= 0xf0 && a <= 0xf4 ? 3 : 0;
		if (!count || i + count > value.byteLength) invalid();
		const second = value[i]!;
		if (
			(a === 0xe0 && second < 0xa0) ||
			(a === 0xed && second > 0x9f) ||
			(a === 0xf0 && second < 0x90) ||
			(a === 0xf4 && second > 0x8f)
		)
			invalid();
		for (let end = i + count; i < end; i++) if (value[i]! < 0x80 || value[i]! > 0xbf) invalid();
	}
	return value.byteLength;
}

/** Caller reserves frame+body copies before calling. Binary payload is never placed in metadata JSON. */
export function encodeEditorAppPart(op: number, data: Uint8Array): Uint8Array {
	if (!u32(op) || data.byteLength < 1 || data.byteLength > EDITOR_LIMITS.fragmentBytes)
		throw new Error('Invalid editor binary fragment');
	const bytes = new Uint8Array(EDITOR_BINARY.appPartHeaderBytes + data.byteLength);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, bytes.byteLength - 4);
	bytes[4] = EDITOR_BINARY.appBodyKind;
	view.setUint32(5, op);
	bytes.set(data, EDITOR_BINARY.appPartHeaderBytes);
	return bytes;
}
/** One complete app frame only; returned data borrows the bounded input and must not escape its permit. */
export function parseEditorAppPart(bytes: Uint8Array): { readonly op: number; readonly data: Uint8Array } | undefined {
	if (
		bytes.byteLength <= EDITOR_BINARY.appPartHeaderBytes ||
		bytes.byteLength > EDITOR_BINARY.appPartHeaderBytes + EDITOR_LIMITS.fragmentBytes
	)
		return;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (view.getUint32(0) !== bytes.byteLength - 4 || bytes[4] !== EDITOR_BINARY.appBodyKind || !u32(view.getUint32(5)))
		return;
	return { op: view.getUint32(5), data: bytes.subarray(EDITOR_BINARY.appPartHeaderBytes) };
}
export type NativeInputControl =
	| { type: 'output-abandon' | 'reply-close' | 'reply-settled'; sid: number }
	| ({ type: 'reply-failure'; sid: number } & NativeReplyFailure)
	| { type: 'input-begin'; sid: number; op: number; totalBytes: number }
	| { type: 'input-commit' | 'input-cancel'; sid: number; op: number }
	| { type: 'resize'; sid: number; op: number; cols: number; rows: number }
	| ({ type: 'input-state'; sid: number } & (
			{ op: number; state: 'reserved' | 'queued' | 'started' | 'written' } | NativeInputFailure
	  ))
	| ({ type: 'resize-state'; sid: number } & (
			{ op: number; state: 'queued' | 'applied' | 'superseded' } | NativeInputFailure
	  ));

const u32 = (value: unknown): value is number =>
	typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 0xffff_ffff;
const object = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]) =>
	Object.keys(value).every((key) => allowed.includes(key)) && allowed.every((key) => Object.hasOwn(value, key));

export function parseNativeInputLimits(value: unknown): Readonly<NativeInputLimits> | undefined {
	if (!object(value) || !keys(value, Object.keys(NATIVE_INPUT_LIMITS)) || !Object.values(value).every(u32)) return;
	const n = value as unknown as NativeInputLimits;
	if (
		n.fragmentBytes > n.operationBytes ||
		n.operationBytes > n.sessionQueuedBytes ||
		n.sessionQueuedBytes > n.helperQueuedBytes ||
		n.sessionQueuedOperations > n.helperQueuedOperations ||
		n.replyFrameBytes > n.sessionReplyBytes ||
		n.sessionReplyBytes > n.helperReplyBytes ||
		n.fragmentBytes > 16 * 1024 * 1024 - 13 ||
		n.replyFrameBytes > 16 * 1024 * 1024 - 5
	)
		return;
	return n;
}

/** Strict JSON shapes shared with Rust; no string/array coercion or inferred delivery evidence. */
export function parseNativeInputControl(
	value: unknown,
	limits: Readonly<NativeInputLimits>,
): NativeInputControl | undefined {
	if (!object(value) || !u32(value.sid)) return;
	if (value.type === 'output-abandon' || value.type === 'reply-close' || value.type === 'reply-settled')
		return keys(value, ['type', 'sid']) ? (value as NativeInputControl) : undefined;
	if (value.type === 'reply-failure') {
		if (!keys(value, ['type', 'sid', 'state', 'reason']) || typeof value.reason !== 'string') return;
		if (
			(value.state === 'none' && ['capacity', 'closed', 'invalid'].includes(value.reason)) ||
			(value.state === 'unknown' && ['transport-lost', 'write-failed'].includes(value.reason))
		)
			return value as NativeInputControl;
		return;
	}
	if (!u32(value.op)) return;
	switch (value.type) {
		case 'input-begin':
			if (
				keys(value, ['type', 'sid', 'op', 'totalBytes']) &&
				u32(value.totalBytes) &&
				value.totalBytes <= limits.operationBytes
			)
				return value as NativeInputControl;
			return;
		case 'input-commit':
		case 'input-cancel':
			if (keys(value, ['type', 'sid', 'op'])) return value as NativeInputControl;
			return;
		case 'resize':
			if (
				keys(value, ['type', 'sid', 'op', 'cols', 'rows']) &&
				u32(value.cols) &&
				value.cols <= 65535 &&
				u32(value.rows) &&
				value.rows <= 65535
			)
				return value as NativeInputControl;
			return;
		case 'input-state':
		case 'resize-state': {
			const success =
				value.type === 'input-state'
					? ['reserved', 'queued', 'started', 'written']
					: ['queued', 'applied', 'superseded'];
			if (typeof value.state !== 'string') return;
			if (success.includes(value.state) && keys(value, ['type', 'sid', 'op', 'state']))
				return value as NativeInputControl;
			if (!keys(value, ['type', 'sid', 'op', 'state', 'reason']) || typeof value.reason !== 'string') return;
			if (
				value.state === 'none' &&
				['capacity', 'closed', 'unsupported', 'cancelled', 'invalid'].includes(value.reason)
			)
				return value as NativeInputControl;
			if (
				value.state === 'unknown' &&
				['transport-lost', 'timeout', 'write-failed', 'expired'].includes(value.reason)
			)
				return value as NativeInputControl;
			return;
		}
	}
	return undefined;
}

/** Raw credit is charged before enqueue. Parser ACK returns parsed bytes; explicit output-abandon releases discarded bytes separately. Encoded outbox copies are separate. */
export const NATIVE_OUTPUT_LIMITS = Object.freeze({
	chunkBytes: 64 * 1024,
	pauseBytes: 1024 * 1024,
	resumeBytes: 256 * 1024,
	sessionUnacknowledgedBytes: 1024 * 1024 + 64 * 1024 - 1,
	sessionReadReserveBytes: 64 * 1024,
	activeSessions: 32,
	helperUnacknowledgedBytes: 32 * (1024 * 1024 + 64 * 1024 - 1),
	helperReadReserveBytes: 32 * 64 * 1024,
	helperEncodedOutputBytes: 4 * 1024 * 1024,
});
