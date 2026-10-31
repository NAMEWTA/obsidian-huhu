import { expect, it, vi } from 'vitest';
import { ReceiptAuthority } from './receipt-authority';
import { HostReceiptStore, type LocalNoteReceipt, type ReceiptStorage } from './receipt-store';
import { digest, opaque, utf8 } from './primitives';
import type { NoteWriteBinding } from '../../../api';

async function fixture() {
	const files = new Map<string, string>(), local = new Map<string, unknown>();
	const identity = { profileId: 'profile:one', deviceId: 'device:one', profileKey: (await digest('profile:one')).slice(7), deviceKey: (await digest('device:one')).slice(7) };
	const storage: ReceiptStorage = {
		exists: async path => files.has(path), read: async path => { const value = files.get(path); if (value === undefined) throw new Error('missing'); return value; },
		write: vi.fn(async (path, text) => { files.set(path, text); }), mkdir: async () => {}, size: async path => { const value = files.get(path); return value === undefined ? undefined : utf8.encode(value).length; },
	};
	const owner = {}, saveKey = vi.fn((key: string, value: unknown) => { local.set(key, structuredClone(value)); });
	const authority = () => new ReceiptAuthority({ owner, load: key => local.get(key), save: saveKey }, identity.deviceKey, identity.profileKey);
	const create = () => new HostReceiptStore(storage, authority(), identity);
	const binding: NoteWriteBinding = { profileId: identity.profileId, commandEpoch: '1', deviceId: identity.deviceId, workspaceId: 'workspace:one',
		originClientId: 'client:one', originViewId: 'view:one', leaseId: 'lease:one', hostConnectionId: 'connection:one', leaseEpoch: '1',
		targetResourceId: 'source:one', preparationId: 'prepare:one', baseHash: await digest('before'), contentHash: await digest('after'), targetVersion: '1',
		implementationVersion: '1', policyVersion: '1', capabilityVersion: '1' };
	const receipt = (effectId = 'effect:one', fingerprint = `sha256:${'c'.repeat(64)}`): LocalNoteReceipt => ({ type: 'receipt', version: 1,
		profileId: identity.profileId, deviceId: identity.deviceId, commandEpoch: '1', effectId, fingerprint, binding,
		locator: { path: 'folder/one.md', operation: 'update', baseHash: binding.baseHash, contentHash: binding.contentHash },
		receiptId: opaque('receipt'), receivedAt: '2026-10-25T00:00:00Z', phase: 'received' });
	return { files, local, identity, storage, create, receipt, saveKey, authority };
}

it('keeps one authenticated received/completed identity across concurrent instances and reopening', async () => {
	const f = await fixture(), received = f.receipt();
	const [one, two] = await Promise.all([f.create().begin(received), f.create().begin({ ...received, receiptId: opaque('receipt') })]);
	expect(one.fresh).toBe(true); expect(two.fresh).toBe(false); expect(f.saveKey).toHaveBeenCalledTimes(1);
	await f.create().finish(received, { phase: 'completed', postHash: received.binding.contentHash });
	expect(await f.create().lookup(received)).toMatchObject({ state: 'verified', receipt: { phase: 'completed', receiptId: received.receiptId, binding: received.binding } });
	const before = new Map(f.files);
	await expect(f.create().begin({ ...received, fingerprint: `sha256:${'d'.repeat(64)}` })).rejects.toThrow('EFFECT_FINGERPRINT_MISMATCH');
	expect(f.files).toEqual(before);
	expect([...f.files.keys()].every(path => /^\.huhu\/huhubot\/[a-f0-9]{64}\/host-receipts\/[a-f0-9]{64}\/(?:index|[a-f0-9]{64})\.json$/.test(path))).toBe(true);
	expect([...f.files.values()].join('')).not.toContain('"key"');
});

it('retains a reservation after received persistence fails and never admits that effect again', async () => {
	const f = await fixture(), received = f.receipt();
	const write = vi.spyOn(f.storage, 'write');
	write.mockImplementation(async (path, text) => { if (!path.endsWith('/index.json')) throw new Error('disk-private-error'); f.files.set(path, text); });
	await expect(f.create().begin(received)).rejects.toThrow('RECEIPT_WRITE_FAILED');
	write.mockImplementation(async (path, text) => { f.files.set(path, text); });
	expect(await f.create().lookup(received)).toEqual({ state: 'reserved' });
	expect(await f.create().begin(received)).toEqual({ fresh: false, observation: { state: 'reserved' } });
});

it('does not turn received into completed when the post-mutation receipt write is lost', async () => {
	const f = await fixture(), received = f.receipt();
	await f.create().begin(received);
	vi.spyOn(f.storage, 'write').mockRejectedValue(new Error('disk-private-error'));
	await expect(f.create().finish(received, { phase: 'completed', postHash: received.binding.contentHash })).rejects.toThrow('RECEIPT_WRITE_FAILED');
	expect(await f.create().lookup(received)).toMatchObject({ state: 'verified', receipt: { phase: 'received' } });
	expect((await f.create().begin(received)).fresh).toBe(false);
});

it('refuses new effects at the authenticated index limit and rejects oversized evidence before reading it', async () => {
	const f = await fixture(), store = f.create(), receipt = f.receipt();
	const effects = Array.from({ length: 1024 }, (_, index) => index.toString(16).padStart(64, '0'));
	const { envelope } = await f.authority().seal({ type: 'index', version: 1, profileId: f.identity.profileId, deviceId: f.identity.deviceId, effects }, true);
	f.files.set(`${store.directory}/index.json`, JSON.stringify(envelope));
	await expect(store.begin(receipt)).rejects.toMatchObject({ data: { kind: 'RESOURCE_LIMIT', reason: 'NOTE_TASK_LIMIT' } });
	expect(f.storage.write).not.toHaveBeenCalled();
	const receiptPath = `${store.directory}/${(await digest(receipt.effectId)).slice(7)}.json`;
	f.files.set(receiptPath, 'x'.repeat(16_385)); const read = vi.spyOn(f.storage, 'read');
	await expect(store.lookup(receipt)).resolves.toEqual({ state: 'invalid' });
	expect(read.mock.calls.some(([path]) => path === receiptPath)).toBe(false); expect(f.storage.write).not.toHaveBeenCalled();
});

it.each(['tamper', 'missing-key', 'bad-key'] as const)('does not trust or overwrite a %s receipt', async mode => {
	const f = await fixture(), received = f.receipt();
	await f.create().begin(received); await f.create().finish(received, { phase: 'completed', postHash: received.binding.contentHash });
	if (mode === 'tamper') {
		const path = [...f.files.keys()].find(path => !path.endsWith('/index.json'))!;
		const envelope = JSON.parse(f.files.get(path)!) as { data: { locator: { path: string } } };
		envelope.data.locator.path = 'another-private-note.md'; f.files.set(path, JSON.stringify(envelope));
	} else if (mode === 'missing-key') f.local.clear();
	else for (const key of f.local.keys()) f.local.set(key, { version: 1, algorithm: 'HMAC-SHA256', key: 'broken' });
	const before = new Map(f.files), keys = f.saveKey.mock.calls.length;
	expect(await f.create().lookup(received)).toEqual({ state: 'invalid' });
	expect(await f.create().begin(received)).toEqual({ fresh: false, observation: { state: 'invalid' } });
	expect(f.files).toEqual(before); expect(f.saveKey).toHaveBeenCalledTimes(keys);
});
