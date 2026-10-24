import {
	MAX_CONTAINER_BYTES,
	MAX_PAYLOAD_BYTES,
	SafeError,
	isSafeId,
	validateMasterPassword,
	validatePayload,
	type SafePayload,
} from '../core/model';
import { parsePayload } from '../core/migration';

const ITERATIONS = 600000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const TAG_BITS = 128;
const TAG_BYTES = TAG_BITS / 8;

export interface SafeEnvelope {
	format: 'huhu-safe';
	version: 1;
	safeId: string;
	kdf: { name: 'PBKDF2-SHA-256'; iterations: 600000; salt: string };
	key: { iv: string; ciphertext: string };
	payload: { iv: string; ciphertext: string };
}

export interface SealedContainer {
	raw: string;
	envelope: SafeEnvelope;
}

export interface CreatedContainer extends SealedContainer {
	key: CryptoKey;
}

export interface OpenedContainer {
	payload: SafePayload;
	key: CryptoKey;
	envelope: SafeEnvelope;
	/** Set when the stored plaintext used an older schema; `payload` is the upgraded in-memory form. */
	upgradedFrom: 1 | null;
}

function webCrypto(): Crypto {
	const value = typeof crypto === 'undefined' ? undefined : crypto;
	if (!value?.subtle || typeof value.getRandomValues !== 'function' || typeof value.randomUUID !== 'function') {
		throw new SafeError('crypto-unavailable');
	}
	return value;
}

function recordWithKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		&& Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function encodeBase64(value: Uint8Array<ArrayBuffer>): string {
	const chunks: string[] = [];
	for (let offset = 0; offset < value.length; offset += 8192) chunks.push(String.fromCharCode(...value.subarray(offset, offset + 8192)));
	return btoa(chunks.join(''));
}

/** Reject alternate encodings, whitespace, excess padding and nonzero padding bits. */
function decodeBase64(value: unknown, minimum: number, maximum = minimum): Uint8Array<ArrayBuffer> {
	if (typeof value !== 'string' || value.length > 4 * Math.ceil(maximum / 3)
		|| value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
		throw new SafeError('invalid-format');
	}
	try {
		const decoded = atob(value);
		if (decoded.length < minimum || decoded.length > maximum || btoa(decoded) !== value) throw new SafeError('invalid-format');
		return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
	} catch {
		throw new SafeError('invalid-format');
	}
}

/** Parse the fixed public header before any attacker-controlled KDF work can start. */
export function parseEnvelope(raw: string): SafeEnvelope {
	if (typeof raw !== 'string') throw new SafeError('invalid-format');
	if (raw.length > MAX_CONTAINER_BYTES || new TextEncoder().encode(raw).byteLength > MAX_CONTAINER_BYTES) throw new SafeError('too-large');
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		throw new SafeError('invalid-format');
	}
	if (!recordWithKeys(value, ['format', 'version', 'safeId', 'kdf', 'key', 'payload'])
		|| value.format !== 'huhu-safe' || value.version !== 1 || !isSafeId(value.safeId)
		|| !recordWithKeys(value.kdf, ['name', 'iterations', 'salt'])
		|| value.kdf.name !== 'PBKDF2-SHA-256' || value.kdf.iterations !== ITERATIONS
		|| !recordWithKeys(value.key, ['iv', 'ciphertext']) || !recordWithKeys(value.payload, ['iv', 'ciphertext'])) {
		throw new SafeError('invalid-format');
	}
	decodeBase64(value.kdf.salt, SALT_BYTES);
	decodeBase64(value.key.iv, IV_BYTES);
	decodeBase64(value.key.ciphertext, KEY_BYTES + TAG_BYTES);
	decodeBase64(value.payload.iv, IV_BYTES);
	decodeBase64(value.payload.ciphertext, TAG_BYTES + 1, MAX_PAYLOAD_BYTES + TAG_BYTES);
	return value as unknown as SafeEnvelope;
}

function aad(safeId: string, purpose: 'key' | 'payload'): Uint8Array<ArrayBuffer> {
	return new Uint8Array(new TextEncoder().encode(JSON.stringify(['huhu-safe', 1, purpose, safeId])));
}

function parameters(safeId: string, purpose: 'key' | 'payload', iv: Uint8Array<ArrayBuffer>): AesGcmParams {
	return { name: 'AES-GCM', iv, additionalData: aad(safeId, purpose), tagLength: TAG_BITS };
}

async function deriveKey(crypto: Crypto, password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	const bytes = new TextEncoder().encode(password);
	try {
		const material = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveKey']);
		return await crypto.subtle.deriveKey(
			{ name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt },
			material,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt', 'decrypt'],
		);
	} finally {
		bytes.fill(0);
	}
}

async function encryptPayload(crypto: Crypto, payload: SafePayload, key: CryptoKey, safeId: string): Promise<SafeEnvelope['payload']> {
	const bytes = new TextEncoder().encode(JSON.stringify(validatePayload(payload)));
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	try {
		const ciphertext = await crypto.subtle.encrypt(parameters(safeId, 'payload', iv), key, bytes);
		return { iv: encodeBase64(iv), ciphertext: encodeBase64(new Uint8Array(ciphertext)) };
	} finally {
		bytes.fill(0);
	}
}

async function createWithId(password: string, payload: SafePayload, safeId: string): Promise<CreatedContainer> {
	validateMasterPassword(password);
	validatePayload(payload);
	const crypto = webCrypto();
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const keyBytes = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	try {
		const wrappingKey = await deriveKey(crypto, password, salt);
		// Encrypt the raw random key before importing it as non-extractable. wrapKey would require export permission.
		const wrapped = await crypto.subtle.encrypt(parameters(safeId, 'key', iv), wrappingKey, keyBytes);
		const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
		const envelope: SafeEnvelope = {
			format: 'huhu-safe', version: 1, safeId,
			kdf: { name: 'PBKDF2-SHA-256', iterations: ITERATIONS, salt: encodeBase64(salt) },
			key: { iv: encodeBase64(iv), ciphertext: encodeBase64(new Uint8Array(wrapped)) },
			payload: await encryptPayload(crypto, payload, key, safeId),
		};
		return { raw: JSON.stringify(envelope), key, envelope };
	} catch (error) {
		if (error instanceof SafeError) throw error;
		throw new SafeError('crypto-unavailable');
	} finally {
		keyBytes.fill(0);
	}
}

export function createContainer(password: string, payload: SafePayload): Promise<CreatedContainer> {
	return createWithId(password, payload, webCrypto().randomUUID());
}

export async function openContainer(raw: string, password: string): Promise<OpenedContainer> {
	const envelope = parseEnvelope(raw);
	try {
		validateMasterPassword(password);
	} catch {
		throw new SafeError('unlock-failed');
	}
	const crypto = webCrypto();
	let keyBytes: Uint8Array<ArrayBuffer> | undefined;
	let payloadBytes: Uint8Array<ArrayBuffer> | undefined;
	try {
		const wrappingKey = await deriveKey(crypto, password, decodeBase64(envelope.kdf.salt, SALT_BYTES));
		keyBytes = new Uint8Array(await crypto.subtle.decrypt(
			parameters(envelope.safeId, 'key', decodeBase64(envelope.key.iv, IV_BYTES)), wrappingKey,
			decodeBase64(envelope.key.ciphertext, KEY_BYTES + TAG_BYTES),
		));
		if (keyBytes.length !== KEY_BYTES) throw new SafeError('unlock-failed');
		const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
		payloadBytes = new Uint8Array(await crypto.subtle.decrypt(
			parameters(envelope.safeId, 'payload', decodeBase64(envelope.payload.iv, IV_BYTES)), key,
			decodeBase64(envelope.payload.ciphertext, TAG_BYTES + 1, MAX_PAYLOAD_BYTES + TAG_BYTES),
		));
		if (payloadBytes.byteLength > MAX_PAYLOAD_BYTES) throw new SafeError('too-large');
		let parsed: unknown;
		try {
			parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payloadBytes));
		} catch {
			throw new SafeError('invalid-format');
		}
		const { payload, upgradedFrom } = parsePayload(parsed, () => crypto.randomUUID());
		return { payload, key, envelope, upgradedFrom };
	} catch (error) {
		if (error instanceof SafeError) throw error;
		throw new SafeError('unlock-failed');
	} finally {
		keyBytes?.fill(0);
		payloadBytes?.fill(0);
	}
}

/** Ordinary saves keep the key envelope and use a fresh payload IV; they do not repeat PBKDF2. */
export async function sealPayload(payload: SafePayload, key: CryptoKey, previous: SafeEnvelope): Promise<SealedContainer> {
	const envelope = parseEnvelope(JSON.stringify(previous));
	if (key.extractable || key.algorithm.name !== 'AES-GCM' || (key.algorithm as AesKeyAlgorithm).length !== 256) {
		throw new SafeError('invalid-format');
	}
	try {
		const next = { ...envelope, payload: await encryptPayload(webCrypto(), payload, key, envelope.safeId) };
		return { raw: JSON.stringify(next), envelope: next };
	} catch (error) {
		if (error instanceof SafeError) throw error;
		throw new SafeError('crypto-unavailable');
	}
}

/** Rotate both the password-derived wrapping key and the random data key, preserving the safe identity. */
export async function changePassword(oldRaw: string, oldPassword: string, newPassword: string, currentPayload: SafePayload): Promise<CreatedContainer> {
	validateMasterPassword(newPassword);
	const { envelope } = await openContainer(oldRaw, oldPassword);
	return createWithId(newPassword, currentPayload, envelope.safeId);
}
