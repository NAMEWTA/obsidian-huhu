import { describe, expect, test } from 'vitest';
import { entryMatchKey, mergeChangesAnything, mergeEntries } from './merge';
import { createEntry, type CredentialInput, type EntryInput, type SafeEntry } from './model';

const t0 = Date.parse('2026-10-01T00:00:00.000Z');
const entryId = (n: number) => `e${n.toString(16).padStart(7, '0')}-1111-4111-8111-111111111111`;
const credentialId = (n: number) => `c${n.toString(16).padStart(7, '0')}-1111-4111-8111-111111111111`;
const account = (n: number, username: string, password = `pw-${username}`, notes = ''): CredentialInput => ({ id: credentialId(n), username, password, notes });
const base: EntryInput = { title: 'Apple', url: 'https://appleid.apple.com', notes: '', icon: null, credentials: [account(1, 'a@x.test')] };
const make = (n: number, input: Partial<EntryInput>, at = t0) => createEntry({ ...base, ...input }, entryId(n), at);
let counter = 100;
const context = (now = t0 + 10 * 86_400_000) => ({ now, newId: () => credentialId(++counter) });

describe('merge import', () => {
  test('adds entries that have no counterpart and keeps their ids and times', () => {
    const current = [make(1, { title: 'Mail', url: 'mail.test' })];
    const incoming = [make(2, {}, t0 + 5), make(3, { title: 'Bank', url: 'https://bank.test' }, t0 + 9)];
    const { entries, summary } = mergeEntries(current, incoming, context());
    expect(entries.map((entry) => entry.id)).toEqual([entryId(1), entryId(2), entryId(3)]);
    expect(entries[1]).toEqual(incoming[0]);
    expect(summary).toMatchObject({ addedEntries: 2, mergedEntries: 0, skippedEntries: 0 });
    expect(current).toHaveLength(1);
  });

  test('same title and website merge their accounts; a new username is appended after the existing ones', () => {
    const current = [make(1, { credentials: [account(1, 'first@x.test'), account(2, 'second@x.test')] })];
    const incoming = [make(9, { title: ' apple ', url: 'appleid.apple.com/', credentials: [account(3, 'third@x.test', 'pw3', 'work')] }, t0 + 1)];
    const { entries, summary } = mergeEntries(current, incoming, context());
    expect(entries).toHaveLength(1);
    expect(entries[0]!.credentials.map((c) => c.username)).toEqual(['first@x.test', 'second@x.test', 'third@x.test']);
    expect(entries[0]!.credentials[2]).toMatchObject({ password: 'pw3', notes: 'work' });
    expect(entries[0]!.updatedAt > current[0]!.updatedAt).toBe(true);
    expect(summary).toMatchObject({ addedEntries: 0, mergedEntries: 1, addedCredentials: 1, updatedCredentials: 0, skippedCredentials: 0 });
  });

  test('an identical account is skipped and an entry with nothing new counts as skipped', () => {
    const current = [make(1, {})];
    const { entries, summary } = mergeEntries(current, [make(2, {})], context());
    expect(entries).toEqual(current);
    expect(summary).toMatchObject({ addedEntries: 0, mergedEntries: 0, skippedEntries: 1, skippedCredentials: 1 });
    expect(mergeChangesAnything(summary)).toBe(false);
  });

  test('the same username with another password keeps the more recently updated one, ties keep the current one', () => {
    const current = [make(1, { credentials: [account(1, 'a@x.test', 'old')] }, t0)];
    const newer = mergeEntries(current, [make(2, { credentials: [account(2, 'a@x.test', 'newer', 'n')] }, t0 + 1000)], context());
    expect(newer.entries[0]!.credentials).toEqual([{ id: credentialId(1), username: 'a@x.test', password: 'newer', notes: 'n', updatedAt: new Date(t0 + 1000).toISOString() }]);
    expect(newer.summary).toMatchObject({ mergedEntries: 1, updatedCredentials: 1, skippedCredentials: 0 });
    const older = mergeEntries([make(1, { credentials: [account(1, 'a@x.test', 'kept')] }, t0 + 1000)], [make(2, { credentials: [account(2, 'a@x.test', 'older')] }, t0)], context());
    expect(older.entries[0]!.credentials[0]!.password).toBe('kept');
    expect(older.summary).toMatchObject({ mergedEntries: 0, skippedEntries: 1, updatedCredentials: 0, skippedCredentials: 1 });
    const tie = mergeEntries(current, [make(2, { credentials: [account(2, 'a@x.test', 'other')] }, t0)], context());
    expect(tie.entries[0]!.credentials[0]!.password).toBe('old');
  });

  test('entries are matched by id first, even when the title changed', () => {
    const current = [make(1, { title: 'Renamed', credentials: [account(1, 'a@x.test')] })];
    const { entries, summary } = mergeEntries(current, [make(1, { title: 'Apple', credentials: [account(2, 'b@x.test')] }, t0 + 1)], context());
    expect(entries).toHaveLength(1);
    expect(entries[0]!.title).toBe('Renamed');
    expect(entries[0]!.credentials).toHaveLength(2);
    expect(summary.mergedEntries).toBe(1);
  });

  test('trashed backup entries are never imported and a trashed entry is not a merge target', () => {
    const trashed = { ...make(2, {}), deletedAt: new Date(t0 + 1).toISOString(), updatedAt: new Date(t0 + 1).toISOString() };
    expect(mergeEntries([], [trashed], context())).toMatchObject({ entries: [], summary: { skippedTrashed: 1, addedEntries: 0 } });
    const currentTrash: SafeEntry = { ...make(1, {}), deletedAt: new Date(t0 + 1).toISOString(), updatedAt: new Date(t0 + 1).toISOString() };
    const result = mergeEntries([currentTrash], [make(1, {}, t0 + 5)], context());
    expect(result.entries).toHaveLength(2);
    expect(result.entries[1]!.id).not.toBe(entryId(1));
    expect(result.entries[0]).toEqual(currentTrash);
    expect(result.entries[0]!.deletedAt).not.toBeNull();
  });

  test('two backup entries with the same title and website merge into one new entry', () => {
    const incoming = [make(2, { credentials: [account(1, 'a@x.test')] }), make(3, { credentials: [account(2, 'b@x.test')] })];
    const { entries, summary } = mergeEntries([], incoming, context());
    expect(entries).toHaveLength(1);
    expect(entries[0]!.credentials.map((c) => c.username)).toEqual(['a@x.test', 'b@x.test']);
    expect(summary).toMatchObject({ addedEntries: 1, mergedEntries: 1, addedCredentials: 1 });
  });

  test('importing the same backup twice changes nothing the second time', () => {
    const incoming = [make(2, { credentials: [account(1, 'a@x.test'), account(2, 'b@x.test')] }), make(3, { title: 'Bank', url: 'bank.test' })];
    const first = mergeEntries([make(1, { title: 'Other', url: 'other.test' })], incoming, context());
    const second = mergeEntries(first.entries, incoming, context());
    expect(mergeChangesAnything(second.summary)).toBe(false);
    expect(second.entries).toEqual(first.entries);
  });

  test('fills an empty icon and entry note from the backup but never overwrites the current ones', () => {
    const icon = 'data:image/png;base64,iVBORw0KGgoAAAAA';
    const filled = mergeEntries([make(1, {})], [make(2, { icon, notes: 'from backup' })], context());
    expect(filled.entries[0]).toMatchObject({ icon, notes: 'from backup' });
    expect(filled.summary.mergedEntries).toBe(1);
    const kept = mergeEntries([make(1, { notes: 'mine', icon })], [make(2, { notes: 'theirs', icon: null })], context());
    expect(kept.entries[0]).toMatchObject({ icon, notes: 'mine' });
    expect(kept.summary.skippedEntries).toBe(1);
  });

  test('entries without title or website only match by id', () => {
    expect(entryMatchKey({ title: ' ', url: '' })).toBeNull();
    const a = make(1, { title: '', url: '' });
    const b = make(2, { title: '', url: '', credentials: [account(2, 'z@x.test')] });
    expect(mergeEntries([a], [b], context()).entries).toHaveLength(2);
  });

  test('a new account id that is already taken inside the entry is replaced', () => {
    const { entries } = mergeEntries([make(1, {})], [make(2, { credentials: [account(1, 'other@x.test')] })], context());
    const ids = entries[0]!.credentials.map((c) => c.id);
    expect(new Set(ids).size).toBe(2);
  });
});
