import {
	CONTROL_LIMITS,
	CONTROL_MESSAGE_TYPES,
	CONTROL_OPERATION_NAMES,
	CONTROL_ERROR_EXITS,
	EDITOR_MESSAGE_TYPES,
	EDITOR_LIMITS,
	editorDescriptor,
	type EditorMessage,
	type EditorMessageType,
	type EditorDirection,
	type NativeEditorIdentity,
	type NativeEditorCapability,
	type NativeEditorLaunch,
	controlDescriptor,
	type ControlSchema,
	type ControlJson,
	type ControlRequest,
	type ControlResponse,
	type ControlMessage,
	type ControlMessageType,
	type ControlErrorCode,
	type ControlAuth,
	type ControlLocator,
	type ControlScope,
	type ControlObservationCancel,
} from './control-wire.generated';
export * from './control-wire.generated';

/** A codec rejection proves only that this local value was not encoded/adopted; it says nothing about earlier calls. */
export class ControlProtocolError extends Error {
	readonly code: ControlErrorCode;
	readonly exitCode: number;
	constructor(message: string, code: ControlErrorCode = 'INVALID_ARGUMENT') {
		super(message);
		this.name = 'ControlProtocolError';
		this.code = code;
		this.exitCode = CONTROL_ERROR_EXITS[code];
	}
}
function fail(message: string): never {
	throw new ControlProtocolError(message);
}
function capacity(): never {
	throw new ControlProtocolError('Local control capacity exceeded', 'CAPACITY_EXCEEDED');
}
const utf8 = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();
const numberToken = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const own = (value: object, key: PropertyKey) => Object.hasOwn(value, key);
const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
function stringBytes(value: string, quoted = true, limit = Number.MAX_SAFE_INTEGER): number {
	if (value.length + (quoted ? 2 : 0) > limit) capacity();
	let bytes = quoted ? 2 : 0;
	for (let at = 0; at < value.length; at++) {
		const c = value.charCodeAt(at);
		if (quoted && (c === 34 || c === 92 || [8, 9, 10, 12, 13].includes(c))) bytes += 2;
		else if (quoted && c < 32) bytes += 6;
		else if (c < 128) bytes++;
		else if (c < 2048) bytes += 2;
		else if (c >= 0xd800 && c <= 0xdbff) {
			const next = value.charCodeAt(++at);
			if (!(next >= 0xdc00 && next <= 0xdfff)) fail('Unpaired Unicode surrogate');
			bytes += 4;
		} else if (c >= 0xdc00 && c <= 0xdfff) fail('Unpaired Unicode surrogate');
		else bytes += 3;
		if (bytes > limit) capacity();
	}
	return bytes;
}
function snapshot(
	value: unknown,
	limit: number,
	clone: boolean,
	internal = false,
): { value: ControlJson; bytes: number } {
	let bytes = 0,
		nodes = 0;
	const maxDepth = CONTROL_LIMITS.depth + (internal ? CONTROL_LIMITS.wrapperDepth : 0);
	const maxNodes = CONTROL_LIMITS.nodes + (internal ? CONTROL_LIMITS.wrapperNodes : 0);
	const seen = new Set<object>();
	const add = (n: number) => {
		bytes += n;
		if (bytes > limit) capacity();
	};
	const visit = (input: unknown, depth: number): ControlJson => {
		if (++nodes > maxNodes || depth > maxDepth) capacity();
		if (input === null) {
			add(4);
			return null;
		}
		if (typeof input === 'boolean') {
			add(input ? 4 : 5);
			return input;
		}
		if (typeof input === 'string') {
			add(stringBytes(input, true, limit - bytes));
			return input;
		}
		if (typeof input === 'number') {
			if (!Number.isFinite(input) || Math.abs(input) > Number.MAX_SAFE_INTEGER) fail('Unsafe JSON number');
			add(JSON.stringify(input).length);
			return input;
		}
		if (!input || typeof input !== 'object') fail('Control values must be JSON DTOs');
		const array = Array.isArray(input),
			proto = Object.getPrototypeOf(input) as unknown;
		if (proto !== null && proto !== (array ? Array.prototype : Object.prototype))
			fail('Control values require plain DTOs');
		for (const object of [input, proto]) {
			if (!object) continue;
			const json = Object.getOwnPropertyDescriptor(object, 'toJSON');
			if (json && (!('value' in json) || typeof json.value === 'function')) fail('Control values reject toJSON');
		}
		if (seen.has(input)) fail('Circular control DTO');
		seen.add(input);
		add(2);
		const output: ControlJson[] | Record<string, ControlJson> | undefined = clone
			? array
				? []
				: (Object.create(null) as Record<string, ControlJson>)
			: undefined;
		if (array) {
			if (input.length > maxNodes) capacity();
			if (output) Object.defineProperty(output, 'toJSON', { value: undefined });
			for (let i = 0; i < input.length; i++) {
				const property = Object.getOwnPropertyDescriptor(input, String(i));
				if (!property || !('value' in property)) fail('Control arrays reject holes/accessors');
				if (i) add(1);
				const child = visit(property.value, depth + 1);
				if (output) (output as ControlJson[]).push(child);
			}
		} else {
			let count = 0;
			for (const key in input) {
				if (!own(input, key)) continue;
				const property = Object.getOwnPropertyDescriptor(input, key);
				if (!property || !('value' in property)) fail('Control values reject accessors');
				if (property.value === undefined) continue;
				if (++nodes > maxNodes) capacity();
				if (count++) add(1);
				add(stringBytes(key, true, limit - bytes) + 1);
				const child = visit(property.value, depth + 1);
				if (output) (output as Record<string, ControlJson>)[key] = child;
			}
		}
		seen.delete(input);
		return output ? Object.freeze(output) : (input as ControlJson);
	};
	return { value: visit(value, 0), bytes };
}
/** Counts the complete encoded DTO before any stringify/TextEncoder copy. Input must be an internal plain JSON DTO. */
export function controlJsonBytes(value: unknown, limit: number = CONTROL_LIMITS.responseBytes): number {
	return snapshot(value, limit, false).bytes;
}

/** Strict, bounded JSON parsing keeps duplicate keys visible before object construction discards them. */
class RawJson {
	at = 0;
	nodes = 0;
	readonly spans = new WeakMap<object, { start: number; end: number }>();
	constructor(
		readonly text: string,
		readonly internal: boolean,
	) {}
	ws(): void {
		while (/\s/.test(this.text[this.at] ?? '') && [' ', '\t', '\n', '\r'].includes(this.text[this.at]!)) this.at++;
	}
	tokenString(): string {
		const start = this.at;
		this.at = stringEnd(this.text, this.at);
		const value: unknown = JSON.parse(this.text.slice(start, this.at));
		if (typeof value !== 'string') return fail('Expected JSON string');
		stringBytes(value);
		return value;
	}
	value(depth: number): ControlJson {
		if (
			++this.nodes > CONTROL_LIMITS.nodes + (this.internal ? CONTROL_LIMITS.wrapperNodes : 0) ||
			depth > CONTROL_LIMITS.depth + (this.internal ? CONTROL_LIMITS.wrapperDepth : 0)
		)
			capacity();
		this.ws();
		const start = this.at,
			c = this.text[this.at];
		if (c === '"') return this.tokenString();
		if (c === '{') {
			this.at++;
			this.ws();
			const value: Record<string, ControlJson> = Object.create(null) as Record<string, ControlJson>;
			if (this.text[this.at] !== '}')
				for (;;) {
					this.ws();
					if (this.text[this.at] !== '"') fail('Invalid JSON object key');
					if (++this.nodes > CONTROL_LIMITS.nodes + (this.internal ? CONTROL_LIMITS.wrapperNodes : 0))
						capacity();
					const key = this.tokenString();
					if (own(value, key)) fail('Duplicate JSON key');
					this.ws();
					if (this.text[this.at++] !== ':') fail('Invalid JSON object');
					value[key] = this.value(depth + 1);
					this.ws();
					if (this.text[this.at] === '}') break;
					if (this.text[this.at++] !== ',') fail('Invalid JSON object separator');
				}
			this.at++;
			this.spans.set(value, { start, end: this.at });
			return Object.freeze(value);
		}
		if (c === '[') {
			this.at++;
			this.ws();
			const value: ControlJson[] = [];
			if (this.text[this.at] !== ']')
				for (;;) {
					value.push(this.value(depth + 1));
					this.ws();
					if (this.text[this.at] === ']') break;
					if (this.text[this.at++] !== ',') fail('Invalid JSON array separator');
				}
			this.at++;
			this.spans.set(value, { start, end: this.at });
			return Object.freeze(value);
		}
		for (const [token, value] of [
			['true', true],
			['false', false],
			['null', null],
		] as const)
			if (this.text.startsWith(token, this.at)) {
				this.at += token.length;
				return value;
			}
		numberToken.lastIndex = this.at;
		const match = numberToken.exec(this.text);
		if (!match) return fail('Invalid JSON value');
		this.at += match[0].length;
		const value = Number(match[0]);
		if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) fail('Unsafe JSON number');
		return value;
	}
	parse(): ControlJson {
		const value = this.value(0);
		this.ws();
		if (this.at !== this.text.length) fail('Trailing JSON data');
		return value;
	}
}
function stringEnd(text: string, at: number): number {
	if (text[at++] !== '"') return fail('Expected JSON string');
	while (at < text.length) {
		const c = text.charCodeAt(at++);
		if (c === 34) return at;
		if (c < 32) fail('Control character in JSON string');
		if (c === 92) {
			const escaped = text[at++];
			if (escaped === 'u') {
				if (!/^[\da-fA-F]{4}$/.test(text.slice(at, at + 4))) fail('Invalid Unicode escape');
				at += 4;
			} else if (!escaped || !'"\\/bfnrt'.includes(escaped)) fail('Invalid JSON escape');
		}
	}
	return fail('Truncated JSON string');
}
/** Only the root discriminator is decoded here. Legacy values get their original parser/large-frame semantics. */
function discriminator(text: string): ControlMessageType | EditorMessageType | undefined {
	let at = 0,
		types = 0,
		found: string | undefined;
	const ws = () => {
		while ([' ', '\t', '\n', '\r'].includes(text[at] ?? '\0')) at++;
	};
	const skip = () => {
		if (text[at] === '"') {
			at = stringEnd(text, at);
			return;
		}
		if (text[at] === '{' || text[at] === '[') {
			let depth = 0;
			do {
				const c = text[at];
				if (c === '"') {
					at = stringEnd(text, at);
					continue;
				}
				if (c === '{' || c === '[') depth++;
				else if (c === '}' || c === ']') depth--;
				at++;
			} while (depth > 0 && at < text.length);
			if (depth !== 0) fail('Truncated JSON value');
		} else {
			const start = at;
			while (at < text.length && ![',', '}', ']', ' ', '\t', '\n', '\r'].includes(text[at]!)) at++;
			if (start === at) fail('Invalid JSON value');
		}
	};
	ws();
	if (text[at++] !== '{') return undefined;
	ws();
	if (text[at] === '}') return undefined;
	for (;;) {
		ws();
		const start = at;
		at = stringEnd(text, at);
		const key: unknown = at - start <= 26 ? JSON.parse(text.slice(start, at)) : undefined;
		ws();
		if (text[at++] !== ':') fail('Invalid JSON object');
		ws();
		const valueStart = at;
		skip();
		if (key === 'type') {
			types++;
			if (
				text[valueStart] === '"' &&
				(at - valueStart > 512 || stringBytes(text.slice(valueStart, at), false) > 512)
			)
				fail('Control discriminator exceeds working bound');
			if (text[valueStart] === '"') {
				const value: unknown = JSON.parse(text.slice(valueStart, at));
				if (typeof value === 'string' && (value.startsWith('control-') || value.startsWith('editor-')))
					found = value;
			}
		}
		ws();
		if (text[at] === '}') break;
		if (text[at++] !== ',') fail('Invalid JSON object separator');
	}
	if (found && types !== 1) fail('Duplicate or mixed control discriminator');
	if (
		found &&
		!CONTROL_MESSAGE_TYPES.includes(found as ControlMessageType) &&
		!EDITOR_MESSAGE_TYPES.includes(found as EditorMessageType)
	)
		fail('Unknown private message');
	return found as ControlMessageType | EditorMessageType | undefined;
}
function validate(schema: ControlSchema, value: unknown): void {
	if (schema.oneOf) {
		let matches = 0;
		for (const variant of schema.oneOf) {
			try {
				validate(variant, value);
				matches++;
			} catch (error) {
				if (!(error instanceof ControlProtocolError)) throw error;
			}
		}
		if (matches !== 1) fail('Invalid control result variant');
		return;
	}
	if (schema.ref) return validate(controlDescriptor().schemas[schema.ref]!, value);
	if (own(schema, 'const')) {
		if (value !== schema.const) fail('Invalid control literal');
		return;
	}
	if (schema.enum) {
		if (typeof value !== 'string' || !schema.enum.includes(value)) fail('Invalid control enum');
		return;
	}
	switch (schema.type) {
		case 'json':
			return;
		case 'json-object':
			if (!record(value)) fail('Expected JSON object');
			return;
		case 'operation':
			if (typeof value !== 'string' || !CONTROL_OPERATION_NAMES.includes(value as ControlRequest['operation']))
				fail('Unknown control operation');
			return;
		case 'boolean':
			if (typeof value !== 'boolean') fail('Expected boolean');
			return;
		case 'string':
			if (
				typeof value !== 'string' ||
				value.length < (schema.minLength ?? 0) ||
				value.length > (schema.maxLength ?? Number.MAX_SAFE_INTEGER)
			)
				fail('Invalid bounded string');
			if (schema.pattern === 'ascii-id' && !/^[A-Za-z0-9_-]+$/.test(value)) fail('Invalid control identity');
			if (schema.pattern === 'decimal' && !/^\d+$/.test(value)) fail('Invalid physical identity');
			if (schema.pattern === 'hex256' && !/^[a-f0-9]{64}$/.test(value)) fail('Invalid capability digest');
			if (schema.maxUtf8Bytes !== undefined && stringBytes(value, false) > schema.maxUtf8Bytes) capacity();
			return;
		case 'integer':
		case 'number':
			if (
				typeof value !== 'number' ||
				!Number.isFinite(value) ||
				(schema.type === 'integer' && !Number.isSafeInteger(value)) ||
				value < (schema.minimum ?? -Number.MAX_SAFE_INTEGER) ||
				value > (schema.maximum ?? Number.MAX_SAFE_INTEGER)
			)
				fail('Invalid bounded number');
			return;
		case 'object':
			if (!record(value)) return fail('Expected control object');
			for (const key in value)
				if (own(value, key) && !own(schema.properties!, key)) fail('Unknown control field');
			for (const key of schema.required ?? []) if (!own(value, key)) fail('Missing control field');
			for (const key in schema.properties) if (own(value, key)) validate(schema.properties[key]!, value[key]);
			return;
		default:
			fail('Unknown canonical schema');
	}
}
function checkRequest(value: unknown): asserts value is ControlRequest {
	validate(controlDescriptor().schemas.request!, value);
	const request = value as ControlRequest;
	validate(controlDescriptor().operations[request.operation].params, request.params ?? {});
}
function checkResponse(value: unknown): asserts value is ControlResponse {
	validate(controlDescriptor().schemas.response!, value);
}
function payloadBound(type: ControlMessageType): { limit: number; key?: string; inner?: number } {
	switch (controlDescriptor().messages[type].budget) {
		case 'request':
			return {
				limit: CONTROL_LIMITS.requestBytes + CONTROL_LIMITS.wrapperBytes,
				key: 'request',
				inner: CONTROL_LIMITS.requestBytes,
			};
		case 'response':
			return {
				limit: CONTROL_LIMITS.responseBytes + CONTROL_LIMITS.wrapperBytes,
				key: 'response',
				inner: CONTROL_LIMITS.responseBytes,
			};
		case 'scope':
			return {
				limit: CONTROL_LIMITS.scopeBytes + CONTROL_LIMITS.wrapperBytes,
				key: 'scope',
				inner: CONTROL_LIMITS.scopeBytes,
			};
		case 'stage':
			return {
				limit: CONTROL_LIMITS.stageBytes + CONTROL_LIMITS.wrapperBytes,
				key: 'progress',
				inner: CONTROL_LIMITS.stageBytes,
			};
		case 'small':
			return { limit: CONTROL_LIMITS.wrapperBytes };
		default:
			return { limit: CONTROL_LIMITS.registrationBytes };
	}
}
function checkMessage(
	value: unknown,
	type: ControlMessageType,
	parser?: RawJson,
	rawBytes?: number,
): asserts value is ControlMessage {
	validate(controlDescriptor().messages[type].schema, value);
	const message = value as Record<string, unknown>,
		bound = payloadBound(type);
	if (bound.key) {
		const inner = message[bound.key];
		const encoded = snapshot(inner, bound.inner!, false).bytes;
		const span = inner && typeof inner === 'object' ? parser?.spans.get(inner) : undefined;
		const payloadBytes = span ? stringBytes(parser!.text.slice(span.start, span.end), false) : encoded;
		if (payloadBytes > bound.inner!) capacity();
		const whole = rawBytes ?? snapshot(value, bound.limit, false, true).bytes;
		if (whole - payloadBytes > CONTROL_LIMITS.wrapperBytes) capacity();
	}
	if (type === 'control-request') checkRequest(message.request);
	if (type === 'control-result') checkResponse(message.response);
}
function read(body: Uint8Array, limit: number, internal = false): { value: ControlJson; parser: RawJson } {
	if (body.byteLength > limit) capacity();
	const parser = new RawJson(utf8.decode(body), internal);
	return { value: parser.parse(), parser };
}
export function parseControlRequest(body: Uint8Array): ControlRequest {
	const { value } = read(body, CONTROL_LIMITS.requestBytes);
	checkRequest(value);
	return value;
}
export function parseControlResponse(body: Uint8Array): ControlResponse {
	const { value } = read(body, CONTROL_LIMITS.responseBytes);
	checkResponse(value);
	return value;
}
export function parseControlAuth(body: Uint8Array): ControlAuth {
	const { value } = read(body, CONTROL_LIMITS.authBytes);
	validate(controlDescriptor().schemas.auth!, value);
	return value as ControlAuth;
}
/** Only meaningful on an authenticated one-request CLI socket; never an editor or stdio business command. */
export function parseObservationCancel(body: Uint8Array): ControlObservationCancel {
	const { value } = read(body, CONTROL_LIMITS.observationCancelBytes);
	validate(controlDescriptor().schemas.observationCancel!, value);
	return value as ControlObservationCancel;
}
function checkLocator(value: unknown): asserts value is ControlLocator {
	validate(controlDescriptor().schemas.locator!, value);
	snapshot((value as ControlLocator).scope, CONTROL_LIMITS.scopeBytes, false);
}
export function parseControlLocator(body: Uint8Array): ControlLocator {
	const { value, parser } = read(body, CONTROL_LIMITS.locatorBytes);
	checkLocator(value);
	const span = parser.spans.get(value.scope)!;
	if (stringBytes(parser.text.slice(span.start, span.end), false) > CONTROL_LIMITS.scopeBytes) capacity();
	return value;
}
export function parseControlScope(body: Uint8Array): ControlScope {
	const { value } = read(body, CONTROL_LIMITS.scopeBytes);
	validate(controlDescriptor().schemas.scope!, value);
	return value as ControlScope;
}
/** Passed directly to FrameDecoder's raw hook. A legacy body retains the original JSON object semantics. */
export function parseHelperControlBody(body: Uint8Array): Record<string, unknown> {
	if (body.byteLength > 4 * 1024 * 1024 - 5) capacity();
	const text = utf8.decode(body),
		type = discriminator(text);
	if (!type) {
		const legacy: unknown = JSON.parse(text);
		if (!record(legacy)) fail('Expected legacy control object');
		return legacy;
	}
	if (type.startsWith('editor-')) {
		return readEditorMessage(body, ['node-to-native', 'native-to-node']);
	}
	const bound = payloadBound(type as ControlMessageType);
	if (body.byteLength > bound.limit) capacity();
	const parser = new RawJson(text, !!bound.key),
		value = parser.parse();
	checkMessage(value, type as ControlMessageType, parser, body.byteLength);
	return value;
}
export interface EncodedControl<T> {
	readonly value: T;
	readonly body: Uint8Array;
	readonly byteLength: number;
}
function encoded<T>(
	value: unknown,
	limit: number,
	check: (value: unknown) => void,
	internal = false,
): EncodedControl<T> {
	const checked = snapshot(value, limit, true, internal);
	check(checked.value);
	const body = encoder.encode(JSON.stringify(checked.value));
	if (body.byteLength !== checked.bytes) fail('Control preflight byte accounting mismatch');
	return Object.freeze({ value: checked.value as T, body, byteLength: body.byteLength });
}
/** Caller reserves the corresponding lane BEFORE invoking any encoder. body is exclusively owned and must not be mutated after handoff. */
export function encodeControlRequest(value: ControlRequest): EncodedControl<ControlRequest> {
	return encoded(value, CONTROL_LIMITS.requestBytes, checkRequest);
}
export function encodeControlResponse(value: ControlResponse): EncodedControl<ControlResponse> {
	return encoded(value, CONTROL_LIMITS.responseBytes, checkResponse);
}
export function encodeControlAuth(value: ControlAuth): EncodedControl<ControlAuth> {
	return encoded(value, CONTROL_LIMITS.authBytes, (x) => validate(controlDescriptor().schemas.auth!, x));
}
export function encodeControlLocator(value: ControlLocator): EncodedControl<ControlLocator> {
	return encoded(value, CONTROL_LIMITS.locatorBytes, checkLocator);
}
export function encodeHelperControlBody(value: ControlMessage): EncodedControl<ControlMessage> {
	const property = Object.getOwnPropertyDescriptor(value, 'type');
	if (
		!property ||
		!('value' in property) ||
		typeof property.value !== 'string' ||
		!CONTROL_MESSAGE_TYPES.includes(property.value as ControlMessageType)
	)
		return fail('Invalid helper control discriminator');
	const type = property.value as ControlMessageType;
	return encoded(value, payloadBound(type).limit, (x) => checkMessage(x, type), !!payloadBound(type).key);
}

/** Captured by the original owner, never inferred from a late message or another generation. */
export interface EditorExpectation {
	readonly sid: number;
	readonly editorId: string;
	readonly identity?: NativeEditorIdentity;
	readonly sourceInstance?: string;
	readonly op?: number;
}
function editorLimit(type: EditorMessageType): number {
	const budget = editorDescriptor().messages[type].budget;
	return budget === 'receipt'
		? EDITOR_LIMITS.receiptBytes
		: budget === 'metadata'
			? EDITOR_LIMITS.metadataBytes
			: EDITOR_LIMITS.lifecycleBytes;
}
function checkEditor(
	value: unknown,
	directions: readonly EditorDirection[],
	expected?: EditorExpectation,
): asserts value is EditorMessage {
	if (
		!record(value) ||
		typeof value.type !== 'string' ||
		!EDITOR_MESSAGE_TYPES.includes(value.type as EditorMessageType)
	)
		fail('Unknown editor message');
	const message = editorDescriptor().messages[value.type as EditorMessageType];
	if (!directions.some((direction) => message.directions.includes(direction))) fail('Wrong editor message direction');
	validate(message.schema, value);
	if (expected) {
		if (
			value.sid !== expected.sid ||
			value.editorId !== expected.editorId ||
			(expected.op !== undefined && value.op !== expected.op)
		)
			fail('Stale editor correlation');
		if (
			expected.sourceInstance !== undefined &&
			own(value, 'sourceInstance') &&
			value.sourceInstance !== expected.sourceInstance
		)
			fail('Stale editor source');
		if (expected.identity && own(value, 'identity')) {
			const identity = value.identity as NativeEditorIdentity;
			if (identity.runtimeId !== expected.identity.runtimeId) fail('Stale editor runtime');
		}
	}
}
function readEditorMessage(
	body: Uint8Array,
	directions: readonly EditorDirection[],
	expected?: EditorExpectation,
): EditorMessage {
	// This cap precedes decode/JSON allocation; the message-specific lower cap still applies to raw whitespace/escapes.
	const { value } = read(body, EDITOR_LIMITS.lifecycleBytes);
	checkEditor(value, directions, expected);
	if (body.byteLength > editorLimit(value.type)) capacity();
	return value;
}
/** The caller knows its purpose/direction and captures identity before parsing. This does not validate event sequence. */
export function parseEditorMessage(
	body: Uint8Array,
	direction: EditorDirection,
	expected?: EditorExpectation,
): EditorMessage {
	return readEditorMessage(body, [direction], expected);
}
/** Reserve the editor lane before cloning/encoding; never route these bytes through legacy encodeControl. */
export function encodeEditorMessage(
	value: EditorMessage,
	direction: EditorDirection,
	expected?: EditorExpectation,
): EncodedControl<EditorMessage> {
	const property = Object.getOwnPropertyDescriptor(value, 'type');
	if (!property || !('value' in property) || !EDITOR_MESSAGE_TYPES.includes(property.value as EditorMessageType))
		return fail('Invalid editor discriminator');
	return encoded(value, editorLimit(property.value as EditorMessageType), (x) =>
		checkEditor(x, [direction], expected),
	);
}
export function parseEditorCapability(body: Uint8Array): NativeEditorCapability {
	const { value } = read(body, EDITOR_LIMITS.capabilityBytes);
	validate(controlDescriptor().schemas.editorCapability!, value);
	return value as NativeEditorCapability;
}
export function encodeEditorCapability(value: NativeEditorCapability): EncodedControl<NativeEditorCapability> {
	return encoded(value, EDITOR_LIMITS.capabilityBytes, (x) =>
		validate(controlDescriptor().schemas.editorCapability!, x),
	);
}
export function encodeEditorLaunch(value: NativeEditorLaunch): EncodedControl<NativeEditorLaunch> {
	return encoded(value, EDITOR_LIMITS.lifecycleBytes, (x) => validate(controlDescriptor().schemas.editorLaunch!, x));
}
export function parseEditorLaunch(body: Uint8Array): NativeEditorLaunch {
	const { value } = read(body, EDITOR_LIMITS.lifecycleBytes);
	validate(controlDescriptor().schemas.editorLaunch!, value);
	return value as NativeEditorLaunch;
}
