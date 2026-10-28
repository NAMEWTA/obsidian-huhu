import { expect, test, vi } from 'vitest';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { VaultBinding } from '../../core/space/model';
import { emptyRecords, type WorkbenchRecords } from './records';
import { SpaceService } from './space-service';

const vault: VaultBinding = { vaultId: 'vault', deviceId: 'device', rootPath: '/vault', root: { canonicalPath: '/vault', dev: '1', ino: '2' } };
const path = '.huhu/terminal-agent/device/workbench-v2.json';
function fixture() {
	const initial = JSON.stringify(emptyRecords(vault));
	const files = new Map([[path, initial], [path + '.backup', initial]]), effects: string[] = [];
	const storage: TextStorage = { exists: async p => files.has(p), read: vi.fn(async p => files.get(p)!), write: vi.fn(async (p, text) => { effects.push(`write:${p}`); files.set(p, text); }), mkdir: vi.fn(async p => { effects.push(`mkdir:${p}`); }) };
	const service = new SpaceService({ storage, instanceId: 'repair', report: vi.fn(),
		directories: { inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: vault.root }), chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/vault' }) },
		owners: { acquire: async () => ({ instanceId: 'repair', port: 123, lost: new AbortController().signal, assertHeld: async () => {}, close: async () => {} }) },
	});
	return { service, files, effects, storage };
}
const variants: { label: string; code: string; alter: (records: WorkbenchRecords) => unknown }[] = [
	{ label: 'future version', code: 'PERSISTENCE_FAILED', alter: () => ({ version: 3, preserve: 'future' }) },
	{ label: 'foreign vault', code: 'SCOPE_MISMATCH', alter: records => ({ ...records, vaultId: 'foreign' }) },
	{ label: 'foreign device', code: 'SCOPE_MISMATCH', alter: records => ({ ...records, deviceId: 'foreign' }) },
	{ label: 'foreign physical root', code: 'SCOPE_MISMATCH', alter: records => ({ ...records, physicalRoot: { ...records.physicalRoot, ino: '999' } }) },
	{ label: 'foreign physical device', code: 'SCOPE_MISMATCH', alter: records => ({ ...records, physicalRoot: { ...records.physicalRoot, dev: '999' } }) },
	{ label: 'foreign physical path', code: 'SCOPE_MISMATCH', alter: records => ({ ...records, physicalRoot: { ...records.physicalRoot, canonicalPath: '/different' } }) },
];

for (const warm of [false, true]) for (const file of ['primary', 'backup']) for (const variant of variants) {
	test(`${warm ? 'warm' : 'cold'} writer refuses ${variant.label} in ${file} on every explicit attempt without any disk effects`, async () => {
		const f = fixture(); await f.service.ready;
		if (warm) await f.service.create({ name: 'warm', relativePath: '' });
		const target = file === 'primary' ? path : path + '.backup';
		f.files.set(target, JSON.stringify(variant.alter(emptyRecords(vault))));
		const before = [...f.files]; f.effects.length = 0;
		for (let attempt = 0; attempt < 2; attempt++) {
			await expect(f.service.create({ name: 'must not write', relativePath: '' })).rejects.toMatchObject({ code: variant.code });
			expect(f.effects).toEqual([]);
			expect([...f.files]).toEqual(before);
		}
		await expect(f.service.dispose()).rejects.toBeDefined();
	});
}

test('failed first writer load is not cached; explicit retry after one EIO can commit and clear strict flush', async () => {
	const f = fixture(); await f.service.ready;
	vi.mocked(f.storage.read).mockRejectedValueOnce(new Error('temporary EIO'));
	await expect(f.service.create({ name: 'failed once', relativePath: '' })).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED' });
	expect(f.effects).toEqual([]);
	expect(f.service.list()).toHaveLength(0);
	const saved = await f.service.create({ name: 'explicit retry', relativePath: '' });
	expect(JSON.parse(f.files.get(path)!).spaces[saved.id].name).toBe('explicit retry');
	await f.service.flush();
	expect(f.service.store.getState().error).toBeUndefined();
	await f.service.dispose();
});

for (const variant of variants) test(`needsRecovery rejects ${variant.label} before recovery writes and permits an explicit valid retry`, async () => {
	const f = fixture(); await f.service.ready;
	const saved = await f.service.create({ name: 'saved', relativePath: '' });
	const valid = f.files.get(path)!;
	let corruptReadback = true;
	const read = f.storage.read;
	f.storage.read = async p => {
		const value = await read(p);
		if (p === path && corruptReadback && f.files.get(path)?.includes('readback failure')) { corruptReadback = false; return value + ' '; }
		return value;
	};
	await expect(f.service.rename(saved.id, 'readback failure')).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED' });
	f.files.set(path, JSON.stringify(variant.alter(emptyRecords(vault))));
	const before = [...f.files]; f.effects.length = 0;
	for (let attempt = 0; attempt < 2; attempt++) {
		await expect(f.service.rename(saved.id, 'must not recover here')).rejects.toMatchObject({ code: variant.code });
		expect(f.effects).toEqual([]); expect([...f.files]).toEqual(before);
	}
	f.files.set(path, valid);
	await f.service.rename(saved.id, 'explicit recovered retry');
	await f.service.flush();
	expect(f.service.resolve({ spaceId: saved.id }).name).toBe('explicit recovered retry');
	await f.service.dispose();
});

test('malformed optional inbox does not fall back to backup as an empty mailbox', async () => {
	const f = fixture();
	const valid = JSON.parse(f.files.get(path)!);
	const backup = JSON.stringify(valid);
	f.files.set(path + '.backup', backup);
	valid.inbox = { version: 1, messages: [{ messageId: 'bad', recipient: { spaceId: 'missing', sessionId: 'missing' }, source: 'x', body: 'x', references: [{ kind: 'vault-file', vaultId: 'v', path: '../escape' }], sendSequence: 1, createdAt: 1 }], nextSequence: 2 };
	f.files.set(path, JSON.stringify(valid));
	const before = [...f.files];
	const broken = new SpaceService({ storage: f.storage, instanceId: 'broken-inbox', report: vi.fn(), directories: {
		inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault' as const, relativePath, target: vault.root }), chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/vault' }),
	}, owners: { acquire: async () => ({ instanceId: 'broken-inbox', port: 1, lost: new AbortController().signal, assertHeld: async () => {}, close: async () => {} }) } });
	await expect(broken.ready).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED', reason: 'inbox-invalid' });
	expect([...f.files]).toEqual(before);
	await expect(broken.dispose()).rejects.toBeDefined();
});
