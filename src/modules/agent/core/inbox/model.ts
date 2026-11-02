
/** Wire and persistence limits for the passive inbox. All byte limits are UTF-8 bytes. */
export const INBOX_LIMITS = Object.freeze({
	messageIdBytes: 128,
	sourceBytes: 512,
	bodyBytes: 16 * 1024,
	maxReferences: 8,
	referenceBytes: 1024,
	recordBytes: 24 * 1024,
	maxMessages: 4096,
	documentBytes: 4 * 1024 * 1024,
	ackBytes: 256,
	presentationEntries: 32,
	presentationBytes: 1024 * 1024,
	presentationDiagnosticBytes: 4096,
});

export interface InboxRecipient {
	readonly spaceId: string;
	readonly sessionId: string;
}

/** A descriptive, bounded source label. It is never used as authentication. */
export type InboxSource = string;

/** Metadata-only reference to a file in the current Obsidian vault. */
export interface VaultFileReference {
	readonly kind: 'vault-file';
	readonly vaultId: string;
	readonly path: string;
	readonly version?: Readonly<{ mtime?: number; size?: number }>;
}

export interface InboxAck {
	readonly ackedAt: number;
}

export interface InboxMessage {
	readonly messageId: string;
	readonly recipient: InboxRecipient;
	readonly source: InboxSource;
	readonly body: string;
	readonly references: readonly VaultFileReference[];
	readonly sendSequence: number;
	readonly createdAt: number;
	readonly ack?: InboxAck;
}

export interface InboxMessageSummary {
	readonly messageId: string;
	readonly recipient: InboxRecipient;
	readonly source: InboxSource;
	readonly sendSequence: number;
	readonly createdAt: number;
	readonly acked: boolean;
}

export interface InboxDocument {
	readonly version: 1;
	readonly messages: readonly InboxMessage[];
	readonly nextSequence: number;
}

export type InboxRecord = InboxMessage;
export type InboxAttachmentRef = VaultFileReference;

const encoder = new TextEncoder();
export const utf8Bytes = (value: string): number => encoder.encode(value).byteLength;
const isObject = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const boundedText = (value: unknown, maxBytes: number, allowEmpty = false): value is string =>
	typeof value === 'string' && (allowEmpty || value.length > 0) && utf8Bytes(value) <= maxBytes && !value.includes('\u0000');
const safeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const ownKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key));

export function emptyInbox(): InboxDocument {
	return { version: 1, messages: [], nextSequence: 1 };
}

export function validateMessageId(messageId: unknown): messageId is string {
	return boundedText(messageId, INBOX_LIMITS.messageIdBytes);
}

/** Truncate a diagnostic at a UTF-8 byte boundary without splitting a code point. */
export function truncateUtf8(value: string, maxBytes: number): string {
	if (maxBytes <= 0) return '';
	if (utf8Bytes(value) <= maxBytes) return value;
	let result = '';
	let used = 0;
	for (const character of value) {
		const bytes = utf8Bytes(character);
		if (used + bytes > maxBytes) break;
		result += character;
		used += bytes;
	}
	return result;
}

export function inboxSummary(message: InboxMessage): InboxMessageSummary {
	return {
		messageId: message.messageId,
		recipient: { ...message.recipient },
		source: message.source,
		sendSequence: message.sendSequence,
		createdAt: message.createdAt,
		acked: message.ack !== undefined,
	};
}

export function validateInboxSource(source: unknown): source is InboxSource {
	return boundedText(source, INBOX_LIMITS.sourceBytes);
}

export function validateVaultFileReference(reference: unknown, vaultId?: string): reference is VaultFileReference {
	if (!isObject(reference) || reference.kind !== 'vault-file' || !boundedText(reference.vaultId, 4096) ||
		(vaultId !== undefined && reference.vaultId !== vaultId) || !boundedText(reference.path, 4096)) return false;
	const path = reference.path;
	if (path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || path.includes('\\') || path.includes('\u0000')) return false;
	if (path.split('/').some((part) => part === '..') || path.length === 0) return false;
	if (reference.version !== undefined) {
		if (!isObject(reference.version) || !ownKeys(reference.version, ['mtime', 'size'])) return false;
		const mtime = reference.version.mtime;
		const size = reference.version.size;
		if (mtime !== undefined && (typeof mtime !== 'number' || !Number.isFinite(mtime) || mtime < 0)) return false;
		if (size !== undefined && (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0)) return false;
	}
	return utf8Bytes(JSON.stringify(reference)) <= INBOX_LIMITS.referenceBytes;
}

export function validateInboxAck(ack: unknown): ack is InboxAck {
	return isObject(ack) && ownKeys(ack, ['ackedAt']) && typeof ack.ackedAt === 'number' && Number.isFinite(ack.ackedAt) && ack.ackedAt >= 0 &&
		utf8Bytes(JSON.stringify(ack)) <= INBOX_LIMITS.ackBytes;
}

export function validateInboxMessage(value: unknown, options: { vaultId?: string } = {}): value is InboxMessage {
	if (!isObject(value) || !ownKeys(value, ['messageId', 'recipient', 'source', 'body', 'references', 'sendSequence', 'createdAt', 'ack'])) return false;
	if (!validateMessageId(value.messageId) || !isObject(value.recipient) ||
		!boundedText(value.recipient.spaceId, 4096) || !boundedText(value.recipient.sessionId, 4096) ||
		!validateInboxSource(value.source) || !boundedText(value.body, INBOX_LIMITS.bodyBytes, true) ||
		!Array.isArray(value.references) || value.references.length > INBOX_LIMITS.maxReferences ||
		!value.references.every((reference) => validateVaultFileReference(reference, options.vaultId)) ||
		!safeInteger(value.sendSequence) || value.sendSequence === 0 ||
		(typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt) || value.createdAt < 0) ||
		(value.ack !== undefined && !validateInboxAck(value.ack))) return false;
	return utf8Bytes(JSON.stringify(value)) <= INBOX_LIMITS.recordBytes;
}

export function validateInboxDocument(value: unknown, options: { vaultId?: string } = {}): value is InboxDocument {
	if (!isObject(value) || value.version !== 1 || !Array.isArray(value.messages) ||
		value.messages.length > INBOX_LIMITS.maxMessages || !safeInteger(value.nextSequence) || value.nextSequence === 0 ||
		!value.messages.every((message) => validateInboxMessage(message, options))) return false;
	const sequences = value.messages.map((message) => message.sendSequence);
	if (new Set(value.messages.map((message) => message.messageId)).size !== value.messages.length) return false;
	if (new Set(sequences).size !== sequences.length || sequences.some((sequence) => sequence >= (value.nextSequence as number))) return false;
	return utf8Bytes(JSON.stringify(value)) <= INBOX_LIMITS.documentBytes;
}

export function maxAckGrowth(message: InboxMessage): number {
	if (message.ack) return utf8Bytes(JSON.stringify(message.ack));
	return utf8Bytes(JSON.stringify({ ackedAt: 9_007_199_254_740_991 } satisfies InboxAck));
}

export function inboxCapacityBytes(document: InboxDocument): number {
	return utf8Bytes(JSON.stringify(document)) + document.messages.reduce((sum, message) => sum + (message.ack ? 0 : maxAckGrowth(message)), 0);
}
