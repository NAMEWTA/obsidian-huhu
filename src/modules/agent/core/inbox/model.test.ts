import { expect, test } from 'vitest';
import {
	INBOX_LIMITS,
	emptyInbox,
	inboxCapacityBytes,
	validateInboxDocument,
	validateInboxMessage,
	validateVaultFileReference,
	truncateUtf8,
} from './model';

const recipient = { spaceId: 'space', sessionId: 'session' };
const message = { messageId: 'm', recipient, source: 'cli', body: 'hello', references: [], sendSequence: 1, createdAt: 1 };

test('inbox message and document validation enforces UTF-8 and fixed record shape', () => {
	expect(validateInboxMessage(message)).toBe(true);
	expect(validateInboxMessage({ ...message, messageId: '😀'.repeat(INBOX_LIMITS.messageIdBytes) })).toBe(false);
	expect(validateInboxMessage({ ...message, body: 'x'.repeat(INBOX_LIMITS.bodyBytes + 1) })).toBe(false);
	expect(validateInboxMessage({ ...message, extra: true })).toBe(false);
	expect(validateInboxDocument({ ...emptyInbox(), messages: [message], nextSequence: 2 })).toBe(true);
	expect(validateInboxDocument({ ...emptyInbox(), messages: [message, { ...message, messageId: 'm2', sendSequence: 1 }], nextSequence: 2 })).toBe(false);
});

test('vault references reject escapes and only match the current vault', () => {
	const ref = { kind: 'vault-file' as const, vaultId: 'vault', path: 'notes/source.md' };
	expect(validateVaultFileReference(ref, 'vault')).toBe(true);
	for (const path of ['/notes.md', 'C:/notes.md', '../notes.md', 'notes/../x.md', 'notes\\x.md', 'notes\u0000.md'])
		expect(validateVaultFileReference({ ...ref, path }, 'vault')).toBe(false);
	expect(validateVaultFileReference(ref, 'other')).toBe(false);
});

test('capacity reserves bounded acknowledgement growth before the write', () => {
	const document = { version: 1 as const, messages: [message], nextSequence: 2 };
	expect(inboxCapacityBytes(document)).toBeGreaterThan(JSON.stringify(document).length);
});

test('ack uses the canonical 256-byte budget and diagnostics truncate on UTF-8 boundaries', () => {
	expect(INBOX_LIMITS.ackBytes).toBe(256);
	const ack = { ackedAt: 1 };
	expect(JSON.stringify(ack).length).toBeLessThan(256);
	const oversized = { ...message, ack: { ackedAt: 1 }, source: 'x'.repeat(400) };
	expect(validateInboxMessage(oversized)).toBe(true);
	const diagnostic = truncateUtf8('😀'.repeat(4096), 4096);
	expect(new TextEncoder().encode(diagnostic).byteLength).toBeLessThanOrEqual(4096);
	expect(diagnostic.length).toBe(2048);
});
