import { expect, it, vi } from 'vitest';
import { ReceiptAuthority, type ReceiptKeyStorage } from './receipt-authority';

function fixture() {
	const values = new Map<string, unknown>();
	const save = vi.fn((key: string, value: unknown) => { values.set(key, structuredClone(value)); });
	const storage: ReceiptKeyStorage = { owner: {}, load: key => values.get(key), save };
	const create = (profile = 'b'.repeat(64), device = 'a'.repeat(64)) => new ReceiptAuthority(storage, device, profile);
	return { values, storage, save, create };
}

it('initializes two receipt authorities in one local queue and verifies after a new instance opens', async () => {
	const f = fixture(), first = f.create(), second = f.create();
	const payload = { phase: 'completed', fingerprint: 'sha256:123', evidence: { effectId: 'effect:one', value: '甲😀\n\u2028\\"' } };
	const [one, two] = await Promise.all([first.locked(() => first.seal(payload, true)), second.locked(() => second.seal(payload, true))]);
	expect(f.save).toHaveBeenCalledTimes(1);
	expect(one.created).toBe(true); expect(two.created).toBe(false);
	expect(one.envelope).toEqual(two.envelope);
	expect(await f.create().verify(JSON.parse(JSON.stringify(one.envelope)))).toEqual(payload);
	expect(await f.create().verify({ ...one.envelope, data: { ...payload, phase: 'received' } })).toBeUndefined();
	expect(await f.create('c'.repeat(64)).verify(one.envelope)).toBeUndefined();
	expect(await f.create('b'.repeat(64), 'd'.repeat(64)).verify(one.envelope)).toBeUndefined();
	expect(f.save).toHaveBeenCalledTimes(1); // Query never creates a missing authority.
});

it('does not promote a JSON self-claim or silently replace a missing or damaged signing authority', async () => {
	const f = fixture(), authority = f.create();
	const original = await authority.locked(() => authority.seal({ phase: 'completed', deviceId: 'one' }, true));
	const [key] = f.values.keys();
	f.values.clear();
	expect(await authority.verify(original.envelope)).toBeUndefined();
	expect(f.save).toHaveBeenCalledTimes(1);
	f.values.set(key!, { version: 1, algorithm: 'HMAC-SHA256', key: 'damaged' });
	expect(await authority.verify(original.envelope)).toBeUndefined();
	await expect(authority.locked(() => authority.seal({}, true))).rejects.toThrow('NOTE_RECEIPT_INVALID');
	expect(f.save).toHaveBeenCalledTimes(1);
});

it.each(['throw', 'drop'] as const)('fails closed before a receipt when local key persistence %s fails', async mode => {
	const f = fixture();
	f.save.mockImplementation(() => { if (mode === 'throw') throw new Error('local-secret-error'); });
	await expect(f.create().locked(() => f.create().seal({ phase: 'received' }, true))).rejects.toThrow('RECEIPT_WRITE_FAILED');
	expect(f.values.size).toBe(0);
});
