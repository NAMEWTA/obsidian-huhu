import { describe, expect, test } from 'vitest';
import {
	collectTags, renameEntryTag, validateNewRelations, MAX_ENTRY_TAGS, MAX_RELATIONS,
	ICON_MAX_CHARS,
	MAX_CREDENTIALS,
	MAX_PAYLOAD_BYTES,
	SAFE_LIMITS,
	TRASH_RETENTION_MS,
	createEntry,
	deleteEntry,
	editEntry,
	entryLabel,
	isIconDataUrl,
	makePayload,
	pruneExpiredTrash,
	restoreEntry,
	searchEntries,
	validateEntryInput,
	validateMasterPassword,
	validatePayload,
	type CredentialInput,
	type EntryInput,
} from './model';

const now = Date.parse('2026-10-21T00:00:00.000Z');
const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const credentialId = (n: number) => `c${n.toString(16).padStart(7, '0')}-1111-4111-8111-111111111111`;
const credential = (n: number, extra: Partial<CredentialInput> = {}): CredentialInput => ({ id: credentialId(n), username: ` Alice${n}@example.test `, password: ' \t🔑é密碼\n ', notes: `备注 ${n}`, phone: '', email: '', relations: [], ...extra });
const input: EntryInput = { title: '工作账号', url: 'https://github.com', notes: '工作 项目', icon: null, tags: [], credentials: [credential(1)] };
/** A minimal valid PNG signature followed by padding: enough for the magic-byte check. */
const png = (body = 'AAAA') => `data:image/png;base64,${btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))}${body}`;

describe('safe records', () => {
	test('round-trips exact Unicode credentials and counts code points rather than UTF-16 units', () => {
		const entry = createEntry(input, id, now);
		expect(validatePayload(JSON.parse(JSON.stringify(makePayload([entry]))))).toEqual(makePayload([entry]));
		expect(entry.credentials[0]!.password).toBe(input.credentials[0]!.password);
		expect(entry.credentials[0]!.username).toBe(input.credentials[0]!.username);
		expect(validateEntryInput(entry)).toEqual(input);
		expect(validateEntryInput({ ...input, title: '🔑'.repeat(SAFE_LIMITS.title) }).title.length).toBe(2 * SAFE_LIMITS.title);
		expect(() => validateEntryInput({ ...input, title: '🔑'.repeat(SAFE_LIMITS.title + 1) })).toThrow('invalid-entry');
		expect(validateEntryInput({ ...input, credentials: [credential(1, { username: ' ', password: ' ' })] }).credentials[0]!.password).toBe(' ');
		expect(validateEntryInput({ ...input, credentials: [credential(1, { password: '' })] }).credentials[0]!.password).toBe('');
		expect(validateEntryInput({ ...input, credentials: [credential(1, { username: '' })] }).credentials[0]!.username).toBe('');
	});

	test('an entry holds one to fifty accounts with unique ids', () => {
		expect(() => validateEntryInput({ ...input, credentials: [] })).toThrow('invalid-entry');
		const many = Array.from({ length: MAX_CREDENTIALS }, (_, index) => credential(index));
		expect(validateEntryInput({ ...input, credentials: many }).credentials).toHaveLength(MAX_CREDENTIALS);
		expect(() => validateEntryInput({ ...input, credentials: [...many, credential(MAX_CREDENTIALS)] })).toThrow('invalid-entry');
		expect(() => validateEntryInput({ ...input, credentials: [credential(1), credential(1)] })).toThrow('invalid-entry');
		expect(() => validateEntryInput({ ...input, credentials: [credential(1, { id: 'not-an-id' })] })).toThrow('invalid-entry');
	});

	test('accepts every nonempty well-formed master password without a length bound, trimming or normalization', () => {
		const password = '  é🔑long passphrase  ';
		expect(validateMasterPassword(password)).toBe(password);
		for (const value of ['短', ' ', '🔑'.repeat(11), '密🔑'.repeat(4097)])
			expect(validateMasterPassword(value)).toBe(value);
		for (const value of ['', null, 123, '\udc00'])
			expect(() => validateMasterPassword(value)).toThrow('invalid-password');
		expect(() => validateMasterPassword('long passphrase\ud800')).toThrow('invalid-password');
	});

	test('matches all query words across entry and account fields and never searches a password', () => {
		const first = createEntry({ ...input, credentials: [credential(1, { username: 'alice' }), credential(2, { username: 'work-second', notes: '第二个 账号' })] }, id, now);
		const second = createEntry({ ...input, title: '', url: 'https://example.test', notes: '私人', credentials: [credential(3, { username: 'bob', notes: '', password: 'github 工作 only-password-token' })] }, otherId, now + 1);
		expect(searchEntries([first, second], ' GITHUB   工作 ')).toEqual([first]);
		expect(searchEntries([first, second], 'alice 项目')).toEqual([first]);
		expect(searchEntries([first, second], 'work-second 第二个')).toEqual([first]);
		expect(searchEntries([first, second], 'only-password-token')).toEqual([]);
		expect(searchEntries([first, second], 'github 私人')).toEqual([]);
		expect(searchEntries([first, second], '')).toEqual([second, first]);
	});

	test('moves records through trash, only prunes expired trash, and keeps monotonic timestamps', () => {
		const entry = createEntry(input, id, now);
		const edited = editEntry(entry, { ...input, notes: 'changed' }, now - 1000);
		expect(edited.updatedAt).toBe('2026-10-21T00:00:00.001Z');
		const deleted = deleteEntry(edited, now + 100);
		expect(searchEntries([deleted], '')).toEqual([]);
		expect(searchEntries([deleted], 'github', true)).toEqual([deleted]);
		const payload = makePayload([deleted, createEntry(input, otherId, now)]);
		expect(pruneExpiredTrash(payload, now + 100 + TRASH_RETENTION_MS - 1).entries).toHaveLength(2);
		expect(pruneExpiredTrash(payload, now + 100 + TRASH_RETENTION_MS).entries).toHaveLength(1);
		expect(restoreEntry(deleted, now + 200).deletedAt).toBeNull();
		expect(payload.entries[0]).toBe(deleted);
	});

	test('adds, edits, removes and reorders accounts; only changed accounts get a new update time', () => {
		const entry = createEntry({ ...input, credentials: [credential(1), credential(2)] }, id, now);
		const later = now + 60_000;
		const edited = editEntry(entry, {
			...input,
			credentials: [credential(3), credential(2, { password: 'changed' }), credential(1)],
		}, later);
		expect(edited.credentials.map((item) => item.id)).toEqual([credentialId(3), credentialId(2), credentialId(1)]);
		expect(edited.credentials.find((item) => item.id === credentialId(1))).toEqual(entry.credentials[0]);
		expect(edited.credentials.find((item) => item.id === credentialId(2))!.updatedAt).toBe(new Date(later).toISOString());
		expect(edited.credentials.find((item) => item.id === credentialId(3))!.updatedAt).toBe(new Date(later).toISOString());
		const removed = editEntry(edited, { ...input, credentials: [credential(2, { password: 'changed' })] }, later + 1000);
		expect(removed.credentials).toHaveLength(1);
		expect(() => editEntry(edited, { ...input, credentials: [] }, later + 2000)).toThrow('invalid-entry');
		expect(entryLabel({ title: '', url: '', credentials: entry.credentials })).toBe(entry.credentials[0]!.username);
	});

	test('accepts only small PNG, JPEG or WebP data URLs whose bytes match, inside the encrypted entry', () => {
		expect(isIconDataUrl(png())).toBe(true);
		expect(isIconDataUrl(`data:image/jpeg;base64,${btoa('\xff\xd8\xff\xe0abcdef')}`)).toBe(true);
		expect(isIconDataUrl(`data:image/webp;base64,${btoa('RIFF1234WEBPVP8 ')}`)).toBe(true);
		expect(isIconDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
		expect(isIconDataUrl('data:image/png;base64,AAAAAAAAAAAAAAAA')).toBe(false);
		expect(isIconDataUrl(`data:image/jpeg;base64,${btoa('\x89PNG\r\n\x1a\n....')}`)).toBe(false);
		expect(isIconDataUrl('https://example.test/favicon.ico')).toBe(false);
		expect(isIconDataUrl(png('A'.repeat(ICON_MAX_CHARS)))).toBe(false);
		expect(validateEntryInput({ ...input, icon: png() }).icon).toBe(png());
		expect(() => validateEntryInput({ ...input, icon: 'https://example.test/favicon.ico' })).toThrow('invalid-entry');
	});

	test('rejects malformed authenticated data, duplicate IDs, unknown fields and oversized payloads', () => {
		const entry = createEntry(input, id, now);
		for (const invalid of [
			makePayload([entry, entry]),
			makePayload([{ ...entry, createdAt: 'not-a-date' }]),
			makePayload([{ ...entry, updatedAt: '2026-10-20T00:00:00.000Z' }]),
			makePayload([{ ...entry, id: '../credentials' }]),
			makePayload([{ ...entry, futureField: 'discarding this would lose user data' } as never]),
			makePayload([{ ...entry, credentials: [{ ...entry.credentials[0]!, futureField: 'x' }] } as never]),
			makePayload([{ ...entry, credentials: [{ ...entry.credentials[0]!, updatedAt: 'nope' }] }]),
			makePayload([{ ...entry, credentials: [] }]),
			{ version: 4, entries: [] },
			{ version: 2, entries: [], revision: 1 },
			{ entries: [] },
		]) expect(() => validatePayload(invalid)).toThrow('invalid-format');
		const entries = Array.from({ length: 170 }, (_, index) => createEntry(
			{ ...input, notes: 'x'.repeat(SAFE_LIMITS.notes) },
			`${index.toString(16).padStart(8, '0')}-1111-4111-8111-111111111111`, now,
		));
		expect(new TextEncoder().encode(JSON.stringify(makePayload(entries))).byteLength).toBeGreaterThan(MAX_PAYLOAD_BYTES);
		expect(() => validatePayload(makePayload(entries))).toThrow('too-large');
	});
});


test('optional contact fields and labels round-trip exactly, are searchable, and tag filters intersect', () => {
	const planned = createEntry({ ...input, tags: ['AI', 'Company'], credentials: [credential(1, {
		username: '', password: '', phone: '+886 123 456', email: ' Work@Example.test ', notes: '',
	})] }, id, now);
	expect(validatePayload(makePayload([planned])).entries[0]).toEqual(planned);
	expect(searchEntries([planned], '886 example AI')).toEqual([planned]);
	expect(searchEntries([planned], '', false, ['ai', 'company'])).toEqual([planned]);
	expect(searchEntries([planned], '', false, ['AI', 'Bank'])).toEqual([]);
	expect(validateEntryInput({ ...input, credentials: [credential(1, { username: '', password: '', phone: '', email: '', notes: '' })] }).credentials).toHaveLength(1);
	expect(() => validateEntryInput({ ...input, credentials: [credential(1, { phone: 'x'.repeat(SAFE_LIMITS.phone + 1) })] })).toThrow('invalid-entry');
});

test('tags are bounded, normalized labels; global rename merges case-insensitively and also updates trash', () => {
	for (const tags of [['AI', 'ai'], [' spaced '], [''], ['a\nb'], Array.from({ length: MAX_ENTRY_TAGS + 1 }, (_, n) => `t${n}`)]) {
		expect(() => validateEntryInput({ ...input, tags })).toThrow('invalid-entry');
	}
	const first = createEntry({ ...input, tags: ['AI', 'Work'] }, id, now);
	const trash = deleteEntry(createEntry({ ...input, tags: ['ai'] }, otherId, now), now + 1);
	const renamed = renameEntryTag([first, trash], 'aI', 'Work', now + 2);
	expect(renamed.map(entry => entry.tags)).toEqual([['Work'], ['Work']]);
	expect(renamed[1]!.deletedAt).toBe(trash.deletedAt);
	expect(renamed[0]!.credentials).toEqual(first.credentials);
	expect(first.tags).toEqual(['AI', 'Work']);
	expect(collectTags(renameEntryTag(renamed, 'work', null, now + 3))).toEqual([]);
});

test('relations use stable account identities, reject self/duplicate/new missing targets, and retain old dangling links', () => {
	const target = createEntry(input, otherId, now);
	const link = { entryId: otherId, credentialId: target.credentials[0]!.id, kind: 'login' as const };
	const source = createEntry({ ...input, credentials: [credential(2, { relations: [link] })] }, id, now);
	expect(() => validateNewRelations([target], source)).not.toThrow();
	expect(() => validateNewRelations([], source)).toThrow('invalid-relation');
	expect(() => validateNewRelations([], source, source)).not.toThrow();
	expect(() => validateEntryInput({ ...input, credentials: [credential(2, { relations: [link, link] })] })).toThrow('invalid-entry');
	expect(() => validateEntryInput({ ...input, credentials: [credential(2, { relations: Array(MAX_RELATIONS + 1).fill(link) })] })).toThrow('invalid-entry');
	const self = createEntry({ ...input, credentials: [credential(2, { relations: [{ ...link, entryId: id, credentialId: credentialId(2) }] })] }, id, now);
	expect(() => validatePayload(makePayload([self]))).toThrow('invalid-format');
	expect(() => validateNewRelations([], self)).toThrow('invalid-relation');
	const snapshot = validateEntryInput(source);
	snapshot.credentials[0]!.relations[0]!.kind = 'related';
	expect(source.credentials[0]!.relations[0]!.kind).toBe('login');
});
