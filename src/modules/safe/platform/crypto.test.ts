import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { createEntry, makePayload, MAX_CONTAINER_BYTES, type SafePayload } from '../core/model';
import { changePassword, createContainer, openContainer, parseEnvelope, sealPayload, type CreatedContainer, type SafeEnvelope } from './crypto';

const password = '  e\u0301🔑long passphrase  ';
const newPassword = 'a different long passphrase';
const payload: SafePayload = makePayload([createEntry({
	title: 'private-title-marker',
	url: 'https://private-url-marker.test',
	notes: 'private-entry-note-marker',
	icon: null,
	credentials: [
		{ id: 'aaaaaaaa-1111-4111-8111-111111111111', username: ' private-account-marker ', password: '  private-secret-marker\n🔑 ', notes: 'private-notes-marker 中文备注' },
		{ id: 'bbbbbbbb-1111-4111-8111-111111111111', username: 'second-account-marker', password: 'second-secret-marker', notes: '' },
	],
}, '11111111-1111-4111-8111-111111111111', Date.parse('2026-10-21T00:00:00.000Z'))]);

function cloneEnvelope(value: SafeEnvelope): SafeEnvelope {
	return JSON.parse(JSON.stringify(value)) as SafeEnvelope;
}

function changedByte(base64: string): string {
	const value = atob(base64);
	return btoa(String.fromCharCode(value.charCodeAt(0) ^ 1) + value.slice(1));
}

describe('safe Web Crypto format', () => {
	let created: CreatedContainer;
	beforeAll(async () => { created = await createContainer(password, payload); });

	test('round-trips using real non-extractable AES keys and stores all business fields encrypted', async () => {
		const opened = await openContainer(created.raw, password);
		expect(opened.payload).toEqual(payload);
		expect(opened.key.extractable).toBe(false);
		expect(opened.key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
		await expect(crypto.subtle.exportKey('raw', opened.key)).rejects.toThrow();
		await expect(crypto.subtle.exportKey('raw', created.key)).rejects.toThrow();
		for (const marker of ['private-title-marker', 'private-url-marker', 'private-entry-note-marker', 'private-account-marker', 'private-secret-marker', 'private-notes-marker', 'second-account-marker', 'second-secret-marker', payload.entries[0]!.id, payload.entries[0]!.credentials[0]!.id, payload.entries[0]!.createdAt]) {
			expect(created.raw).not.toContain(marker);
		}
		expect(parseEnvelope(created.raw)).toEqual(created.envelope);
	});

	test('does not trim or normalize passwords and rejects an incorrect password', async () => {
		await expect(openContainer(created.raw, password.trim())).rejects.toMatchObject({ code: 'unlock-failed' });
		await expect(openContainer(created.raw, password.normalize('NFC'))).rejects.toMatchObject({ code: 'unlock-failed' });
		await expect(openContainer(created.raw, 'wrong but sufficiently long')).rejects.toMatchObject({ code: 'unlock-failed' });
	});

	test.each(['key-ciphertext', 'key-iv', 'payload-ciphertext', 'payload-iv', 'safeId', 'salt'])('authenticates %s', async (part) => {
		const envelope = cloneEnvelope(created.envelope);
		if (part === 'safeId') envelope.safeId = '22222222-2222-4222-8222-222222222222';
		else if (part === 'salt') envelope.kdf.salt = changedByte(envelope.kdf.salt);
		else if (part === 'key-ciphertext') envelope.key.ciphertext = changedByte(envelope.key.ciphertext);
		else if (part === 'key-iv') envelope.key.iv = changedByte(envelope.key.iv);
		else if (part === 'payload-ciphertext') envelope.payload.ciphertext = changedByte(envelope.payload.ciphertext);
		else envelope.payload.iv = changedByte(envelope.payload.iv);
		await expect(openContainer(JSON.stringify(envelope), password)).rejects.toMatchObject({ code: 'unlock-failed' });
	});

	test('rejects unknown parameters and malformed encodings before doing PBKDF2', async () => {
		const derive = vi.spyOn(crypto.subtle, 'deriveKey');
		try {
			const mutations: Array<(value: SafeEnvelope) => unknown> = [
				(value) => ({ ...value, version: 2 }),
				(value) => ({ ...value, kdf: { ...value.kdf, iterations: 600001 } }),
				(value) => ({ ...value, kdf: { ...value.kdf, name: 'anything-else' } }),
				(value) => ({ ...value, key: { ...value.key, iv: btoa('too-short') } }),
				(value) => ({ ...value, key: { ...value.key, ciphertext: btoa('not-a-data-key') } }),
				(value) => ({ ...value, payload: { ...value.payload, iv: value.payload.iv + '\n' } }),
				(value) => ({ ...value, kdf: { ...value.kdf, salt: 'AAAAAAAAAAAAAAAAAAAAAB==' } }),
				(value) => ({ ...value, revision: 1 }),
			];
			for (const mutate of mutations) await expect(openContainer(JSON.stringify(mutate(created.envelope)), password)).rejects.toMatchObject({ code: 'invalid-format' });
			await expect(openContainer('not JSON', password)).rejects.toMatchObject({ code: 'invalid-format' });
			expect(() => parseEnvelope(' '.repeat(MAX_CONTAINER_BYTES + 1))).toThrow('too-large');
			expect(derive).not.toHaveBeenCalled();
		} finally {
			derive.mockRestore();
		}
	});

	test('uses fresh payload IVs for each save without deriving or replacing the key envelope', async () => {
		const derive = vi.spyOn(crypto.subtle, 'deriveKey');
		let first;
		let second;
		try {
			first = await sealPayload(payload, created.key, created.envelope);
			second = await sealPayload(payload, created.key, first.envelope);
			expect(derive).not.toHaveBeenCalled();
		} finally {
			derive.mockRestore();
		}
		expect(first.envelope.kdf).toEqual(created.envelope.kdf);
		expect(first.envelope.key).toEqual(created.envelope.key);
		expect(first.envelope.payload.iv).not.toBe(created.envelope.payload.iv);
		expect(second.envelope.payload.iv).not.toBe(first.envelope.payload.iv);
		expect(second.envelope.payload.ciphertext).not.toBe(first.envelope.payload.ciphertext);
		expect((await openContainer(second.raw, password)).payload).toEqual(payload);
	});

	test('rotates salt and data key on password change, while old encrypted backups retain their old password', async () => {
		const changed = await changePassword(created.raw, password, newPassword, payload);
		expect(changed.envelope.safeId).toBe(created.envelope.safeId);
		expect(changed.envelope.kdf.salt).not.toBe(created.envelope.kdf.salt);
		expect(changed.envelope.key.iv).not.toBe(created.envelope.key.iv);
		expect(changed.envelope.payload.iv).not.toBe(created.envelope.payload.iv);
		expect((await openContainer(changed.raw, newPassword)).payload).toEqual(payload);
		await expect(openContainer(changed.raw, password)).rejects.toMatchObject({ code: 'unlock-failed' });
		await expect(openContainer(created.raw, newPassword)).rejects.toMatchObject({ code: 'unlock-failed' });
		expect((await openContainer(created.raw, password)).payload).toEqual(payload);
		await expect(crypto.subtle.decrypt({
			name: 'AES-GCM', tagLength: 128,
			iv: Uint8Array.from(atob(changed.envelope.payload.iv), (character) => character.charCodeAt(0)),
			additionalData: new TextEncoder().encode(JSON.stringify(['huhu-safe', 1, 'payload', changed.envelope.safeId])),
		}, created.key, Uint8Array.from(atob(changed.envelope.payload.ciphertext), (character) => character.charCodeAt(0)))).rejects.toThrow();
	});

	test('validates the authenticated plaintext instead of trusting a successful GCM decrypt', async () => {
		const envelope = cloneEnvelope(created.envelope);
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const ciphertext = await crypto.subtle.encrypt({
			name: 'AES-GCM', iv, tagLength: 128,
			additionalData: new TextEncoder().encode(JSON.stringify(['huhu-safe', 1, 'payload', envelope.safeId])),
		}, created.key, new TextEncoder().encode(JSON.stringify(makePayload([payload.entries[0]!, payload.entries[0]!]))));
		envelope.payload = { iv: btoa(String.fromCharCode(...iv)), ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))) };
		await expect(openContainer(JSON.stringify(envelope), password)).rejects.toMatchObject({ code: 'invalid-format' });
	});

	test('opens a vault using payload schema 1, upgrades it in memory and writes it back without touching the key envelope', async () => {
		const fixture = JSON.parse(readFileSync(new URL('../fixtures/v1-vault.json', import.meta.url), 'utf8')) as { master: string; raw: string; entries: Array<Record<string, unknown>> };
		const original = parseEnvelope(fixture.raw);
		expect(original.version).toBe(1);
		const opened = await openContainer(fixture.raw, fixture.master);
		expect(opened.upgradedFrom).toBe(1);
		expect(opened.payload.entries).toHaveLength(fixture.entries.length);
		opened.payload.entries.forEach((entry, index) => {
			const old = fixture.entries[index]!;
			expect(entry).toMatchObject({ id: old.id, title: old.title, url: old.url, deletedAt: old.deletedAt });
			expect(entry.credentials[0]).toMatchObject({ username: old.username, password: old.password, notes: old.notes });
		});
		await expect(openContainer(fixture.raw, 'not the fixture master password')).rejects.toMatchObject({ code: 'unlock-failed' });
		const derive = vi.spyOn(crypto.subtle, 'deriveKey');
		let sealed;
		try {
			sealed = await sealPayload(opened.payload, opened.key, opened.envelope);
			expect(derive).not.toHaveBeenCalled();
		} finally {
			derive.mockRestore();
		}
		// Same container format, salt, iteration count, safe id and wrapped data key: only the payload is new.
		expect(sealed.envelope).toMatchObject({ format: 'huhu-safe', version: 1, safeId: original.safeId, kdf: original.kdf, key: original.key });
		expect(sealed.envelope.payload.iv).not.toBe(original.payload.iv);
		const reopened = await openContainer(sealed.raw, fixture.master);
		expect(reopened.upgradedFrom).toBeNull();
		expect(reopened.payload).toEqual(opened.payload);
		for (const marker of ['apple-pass-1', 'octo', 'no-title-user', 'forum.example.test']) expect(sealed.raw).not.toContain(marker);
	});

	test('refuses to open a damaged version 1 plaintext rather than guessing what it meant', async () => {
		const fixture = JSON.parse(readFileSync(new URL('../fixtures/v1-vault.json', import.meta.url), 'utf8')) as { master: string; raw: string };
		const original = parseEnvelope(fixture.raw);
		const opened = await openContainer(fixture.raw, fixture.master);
		const replace = async (plaintext: unknown) => {
			const iv = crypto.getRandomValues(new Uint8Array(12));
			const ciphertext = await crypto.subtle.encrypt({
				name: 'AES-GCM', iv, tagLength: 128,
				additionalData: new TextEncoder().encode(JSON.stringify(['huhu-safe', 1, 'payload', original.safeId])),
			}, opened.key, new TextEncoder().encode(JSON.stringify(plaintext)));
			return JSON.stringify({ ...original, payload: { iv: btoa(String.fromCharCode(...iv)), ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))) } });
		};
		const [first] = (JSON.parse(readFileSync(new URL('../fixtures/v1-vault.json', import.meta.url), 'utf8')) as { entries: Array<Record<string, unknown>> }).entries;
		await expect(openContainer(await replace({ entries: [{ ...first, password: '' }] }), fixture.master)).rejects.toMatchObject({ code: 'invalid-format' });
		await expect(openContainer(await replace({ entries: [first], future: true }), fixture.master)).rejects.toMatchObject({ code: 'invalid-format' });
		await expect(openContainer(await replace({ entries: [first] }), fixture.master)).resolves.toMatchObject({ upgradedFrom: 1 });
	});
});
