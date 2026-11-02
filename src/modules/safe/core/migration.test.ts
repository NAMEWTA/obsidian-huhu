import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parsePayload } from './migration';
import { makePayload, validatePayload, type SafeEntry } from './model';

interface Fixture { master: string; raw: string; entries: Array<Record<string, unknown>> }
const fixture = JSON.parse(readFileSync(new URL('../fixtures/v1-vault.json', import.meta.url), 'utf8')) as Fixture;
const ids = () => { let next = 0; return () => `c${(++next).toString(16).padStart(7, '0')}-1111-4111-8111-111111111111`; };

describe('payload schema upgrade', () => {
	test('turns every version 1 record into an entry with one account and loses no field', () => {
		const { payload, upgradedFrom } = parsePayload({ entries: fixture.entries }, ids());
		expect(upgradedFrom).toBe(1);
		expect(payload.entries).toHaveLength(fixture.entries.length);
		fixture.entries.forEach((old, index) => {
			const entry = payload.entries[index]!;
			expect(entry).toMatchObject({ id: old.id, title: old.title, url: old.url, createdAt: old.createdAt, updatedAt: old.updatedAt, deletedAt: old.deletedAt, icon: null, notes: '' });
			expect(entry.credentials).toEqual([{ id: expect.any(String), username: old.username, password: old.password, notes: old.notes, phone: '', email: '', relations: [], updatedAt: old.updatedAt }]);
		});
		// Exact characters survive: spaces, emoji, combining marks and line breaks.
		expect(payload.entries[0]!.credentials[0]).toMatchObject({ password: ' apple-pass-1 🔑 ', notes: '主 Apple ID，\n两行备注' });
		expect(payload.entries[3]!.deletedAt).not.toBeNull();
		expect(validatePayload(JSON.parse(JSON.stringify(payload)))).toEqual(payload);
	});

	test('reads the current schema as is and reports no upgrade', () => {
		const { payload } = parsePayload({ entries: fixture.entries }, ids());
		expect(parsePayload(JSON.parse(JSON.stringify(payload)), ids())).toEqual({ payload, upgradedFrom: null });
		expect(parsePayload(makePayload([]), ids())).toEqual({ payload: makePayload([]), upgradedFrom: null });
	});

	test.each([
		['an unknown top-level field', { entries: [], revision: 1 }],
		['a future schema', { version: 4, entries: [] }],
		['a record missing a field', { entries: [{ ...fixture.entries[0]!, notes: undefined }] }],
		['a record with an extra field', { entries: [{ ...fixture.entries[0]!, tags: [] }] }],
		['an empty password', { entries: [{ ...fixture.entries[0]!, password: '' }] }],
		['a duplicate id', { entries: [fixture.entries[0], fixture.entries[0]] }],
		['a non-object', 'text'],
	])('rejects %s without guessing', (_name, value) => {
		expect(() => parsePayload(value, ids())).toThrow('invalid-format');
	});

	test('keeps account ids unique within an entry and unrelated to the record id', () => {
		const entries = parsePayload({ entries: fixture.entries }, ids()).payload.entries as SafeEntry[];
		for (const entry of entries) expect(entry.credentials[0]!.id).not.toBe(entry.id);
	});
});

test('version 2 upgrades without changing ids, account order, exact values, icons, timestamps or trash', () => {
	const current = parsePayload({ entries: fixture.entries }, ids()).payload;
	const entries = current.entries.map(({ tags: _tags, ...entry }) => ({ ...entry, credentials: entry.credentials.map(({ phone: _phone, email: _email, relations: _relations, ...credential }) => credential) }));
	const original = structuredClone(entries);
	const result = parsePayload({ version: 2, entries }, () => { throw new Error('v2 must retain identities'); });
	expect(result.upgradedFrom).toBe(2);
	expect(result.payload).toEqual(current);
	expect(entries).toEqual(original);
	for (const bad of [
		{ ...entries[0], ignored: true },
		{ ...entries[0], credentials: [{ ...entries[0]!.credentials[0], password: '' }] },
		{ ...entries[0], credentials: [{ ...entries[0]!.credentials[0], ignored: true }] },
	]) expect(() => parsePayload({ version: 2, entries: [bad] }, ids())).toThrow('invalid-format');
});
