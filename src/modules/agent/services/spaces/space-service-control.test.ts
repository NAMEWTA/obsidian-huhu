import { expect, test, vi } from 'vitest';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { DirectoryPort, WriterLease } from '../../core/space/ports';
import type { VaultBinding } from '../../core/space/model';
import { SpaceService } from './space-service';

function fixture() {
	const vault: VaultBinding = {
		vaultId: 'vault',
		deviceId: 'device',
		rootPath: '/vault',
		root: { canonicalPath: '/vault', dev: '1', ino: '2' },
	};
	const files = new Map<string, string>();
	const storage: TextStorage = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p)!,
		write: vi.fn(async (p, s) => {
			files.set(p, s);
		}),
		mkdir: async () => {},
	};
	const lease: WriterLease = {
		instanceId: 'instance',
		port: 1234,
		lost: new AbortController().signal,
		assertHeld: vi.fn(async () => {}),
		close: vi.fn(async () => {}),
	};
	const acquire = vi.fn(async () => lease);
	const directories: DirectoryPort = {
		inspectVault: async () => vault,
		assertVault: vi.fn(async () => {}),
		bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: vault.root }),
		chooseExternalDirectory: vi.fn(async () => undefined),
		resolveDirectory: vi.fn(async () => ({ cwd: '/vault' })),
	};
	const service = new SpaceService({
		storage,
		directories,
		owners: { acquire },
		instanceId: 'instance',
		report: vi.fn(),
	});
	return { service, storage, files, directories, acquire, lease, vault };
}

test('control scope reads validate physical identity without acquiring writer or waiting behind a stalled mutation', async () => {
	const f = fixture();
	try {
		await f.service.ready;
		const scope = await f.service.getControlScope();
		expect(scope).toEqual({
			vaultId: 'vault',
			deviceId: 'device',
			instanceId: 'instance',
			rootPath: f.vault.rootPath,
			physicalRoot: f.vault.root,
		});
		expect(Object.isFrozen(scope)).toBe(true);
		expect(Object.isFrozen(scope.physicalRoot)).toBe(true);
		expect(f.acquire).not.toHaveBeenCalled();
		expect(f.storage.write).not.toHaveBeenCalled();
		await expect(f.service.assertControlScope({ ...scope, instanceId: 'other' })).rejects.toMatchObject({
			code: 'SCOPE_MISMATCH',
		});
		await f.service.create({ name: 'A' });
		let release!: () => void, entered!: () => void;
		const gate = new Promise<void>((r) => {
				release = r;
			}),
			started = new Promise<void>((r) => {
				entered = r;
			});
		const write = f.storage.write;
		f.storage.write = async (p, s) => {
			entered();
			await gate;
			await write(p, s);
		};
		const pending = f.service.rename(f.service.list()[0]!.id, 'B');
		await started;
		try {
			await f.service.assertControlScope(scope);
			expect(await f.service.getControlScope()).toEqual(scope);
		} finally {
			release();
			await pending;
		}
		vi.mocked(f.directories.assertVault).mockRejectedValueOnce(new Error('physical root replaced'));
		await expect(f.service.assertControlScope(scope)).rejects.toThrow('physical root replaced');
	} finally {
		await f.service.dispose();
	}
});

test('control creates reuse only an existing valid grant and session rename commits before publishing', async () => {
	const f = fixture();
	try {
		await f.service.ready;
		vi.mocked(f.directories.chooseExternalDirectory).mockResolvedValue({
			selectedPath: '/outside',
			target: { canonicalPath: '/outside', dev: '1', ino: '3' },
			vaultRoot: f.vault.root,
			deviceId: 'device',
		});
		const choice = await f.service.chooseExternal();
		const original = await f.service.create({ name: 'Original', externalReceipt: choice!.receipt });
		if (original.directory.kind !== 'external') throw new Error('Missing grant');
		const grantId = original.directory.grantId;
		const count = Object.keys(f.service.store.getState().records.grants).length;
		const created = await f.service.createFromGrant({ name: 'Reused', grantId });
		expect(created.directory).toEqual({ kind: 'external', grantId });
		expect(Object.keys(f.service.store.getState().records.grants)).toHaveLength(count);
		expect(f.directories.chooseExternalDirectory).toHaveBeenCalledTimes(1);
		const admission = await f.service.prepareSession(created.id, { kind: 'shell', title: 'Old' });
		await f.service.renameSession({ spaceId: created.id, sessionId: admission.record.id }, 'New');
		expect(f.service.store.getState().records.sessions[admission.record.id]!.title).toBe('New');
		await expect(
			f.service.renameSession({ spaceId: original.id, sessionId: admission.record.id }, 'wrong'),
		).rejects.toMatchObject({ code: 'SCOPE_MISMATCH' });
		await f.service.revokeGrant(grantId);
		await expect(f.service.createFromGrant({ name: 'Revoked', grantId })).rejects.toMatchObject({
			code: 'DIRECTORY_NOT_AUTHORIZED',
		});
	} finally {
		await f.service.dispose();
	}
});

test('scope preserves a symlink Vault entry path independently of canonical identity', async () => {
	const f = fixture();
	Object.assign(f.vault, { rootPath: '/linked-vault' });
	try {
		const scope = await f.service.getControlScope();
		expect(scope).toMatchObject({ rootPath: '/linked-vault', physicalRoot: { canonicalPath: '/vault' } });
		await expect(f.service.assertControlScope({ ...scope, rootPath: '/vault' })).rejects.toMatchObject({
			code: 'SCOPE_MISMATCH',
		});
	} finally {
		await f.service.dispose();
	}
});
