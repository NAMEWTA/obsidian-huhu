import { mkdtemp, mkdir, realpath, rename, rm, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { DirectoryGrant } from '../../../core/space/model';
import { createDirectoryPort } from './directories';

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});
async function fixture(chooseDirectory: () => Promise<string | undefined> = async () => undefined) {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-t02-b-fs-'));
	roots.push(root);
	const vaultRoot = path.join(root, 'vault');
	const outside = path.join(root, 'outside');
	await mkdir(vaultRoot);
	await mkdir(outside);
	const config = { vaultRoot, vaultId: 'logical-vault', deviceId: 'device-a', chooseDirectory };
	return { root, vaultRoot, outside, config, directories: createDirectoryPort(config) };
}
async function link(target: string, destination: string) {
	await symlink(target, destination, process.platform === 'win32' ? 'junction' : 'dir');
}

describe('desktop Space directories', () => {
	test('inspection is read only, freezes the configured binding, and retains bigint decimal identity', async () => {
		const { vaultRoot, directories } = await fixture();
		const vault = await directories.inspectVault();
		const physical = await stat(await realpath(vaultRoot), { bigint: true });
		expect(vault).toEqual({ vaultId: 'logical-vault', deviceId: 'device-a', rootPath: vaultRoot,
			root: { canonicalPath: await realpath(vaultRoot), dev: physical.dev.toString(), ino: physical.ino.toString() } });
		expect(Object.isFrozen(vault)).toBe(true);
		expect(Object.isFrozen(vault.root)).toBe(true);
		await expect(directories.assertVault(vault)).resolves.toBeUndefined();
		await expect(directories.bindVaultDirectory(vault, '')).resolves.toMatchObject({ kind: 'vault', relativePath: '', target: vault.root });
	});

	test('same physical aliases inspect identically but configured, logical and device scope cannot be swapped', async () => {
		const { root, vaultRoot, config, directories } = await fixture();
		const alias = path.join(root, 'alias');
		await link(vaultRoot, alias);
		const vault = await directories.inspectVault();
		const aliased = createDirectoryPort({ ...config, vaultRoot: alias });
		expect((await aliased.inspectVault()).root).toEqual(vault.root);
		await expect(aliased.assertVault(vault)).rejects.toMatchObject({ code: 'SCOPE_MISMATCH', reason: 'vault-changed' });
		await expect(directories.assertVault({ ...vault, vaultId: 'copied-id' })).rejects.toMatchObject({ code: 'SCOPE_MISMATCH' });
		await expect(directories.assertVault({ ...vault, deviceId: 'other' })).rejects.toMatchObject({ code: 'SCOPE_MISMATCH', reason: 'device-changed' });
		await expect(createDirectoryPort({ ...config, vaultRoot: root }).assertVault(vault)).rejects.toMatchObject({ code: 'SCOPE_MISMATCH' });
	});

	test('rejects noncanonical relative paths and realpath escapes, including prefix siblings', async () => {
		const { root, vaultRoot, outside, directories } = await fixture();
		const vault = await directories.inspectVault();
		await mkdir(path.join(vaultRoot, 'project'));
		const binding = await directories.bindVaultDirectory(vault, 'project');
		await expect(directories.resolveDirectory(vault, binding, undefined)).resolves.toEqual({ cwd: await realpath(path.join(vaultRoot, 'project')) });
		for (const candidate of ['../outside', '/tmp', 'C:\\outside', 'C:outside', '\\\\host\\share', './project', 'project/..', 'project//child', 'project/', 'project\\child', 'project\0x']) {
			await expect(directories.bindVaultDirectory(vault, candidate), candidate).rejects.toMatchObject({ code: 'INVALID_ARGUMENT', reason: 'invalid-relative-path' });
		}
		await link(outside, path.join(vaultRoot, 'escape'));
		await expect(directories.bindVaultDirectory(vault, 'escape')).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED' });
		const sibling = path.join(root, 'vault-sibling');
		await mkdir(sibling);
		await link(sibling, path.join(vaultRoot, 'prefix-escape'));
		await expect(directories.bindVaultDirectory(vault, 'prefix-escape')).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED' });
		await writeFile(path.join(vaultRoot, 'file'), 'not a directory');
		await expect(directories.bindVaultDirectory(vault, 'file')).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED', reason: 'not-directory' });
	});

	test('internal targets and original Vault aliases are revalidated after replacement or retarget', async () => {
		const { root, vaultRoot, outside, config, directories } = await fixture();
		await mkdir(path.join(vaultRoot, 'one'));
		await mkdir(path.join(vaultRoot, 'two'));
		const target = path.join(vaultRoot, 'project');
		await link(path.join(vaultRoot, 'one'), target);
		const vault = await directories.inspectVault();
		const binding = await directories.bindVaultDirectory(vault, 'project');
		await unlink(target);
		await link(path.join(vaultRoot, 'two'), target);
		await expect(directories.resolveDirectory(vault, binding, undefined)).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED', reason: 'directory-changed' });
		const alias = path.join(root, 'alias');
		await link(vaultRoot, alias);
		const aliased = createDirectoryPort({ ...config, vaultRoot: alias });
		const before = await aliased.inspectVault();
		await unlink(alias);
		await link(outside, alias);
		await expect(aliased.assertVault(before)).rejects.toMatchObject({ code: 'SCOPE_MISMATCH', reason: 'vault-changed' });
		await rename(vaultRoot, path.join(root, 'old-vault'));
		await mkdir(vaultRoot);
		await expect(directories.assertVault(vault)).rejects.toMatchObject({ code: 'SCOPE_MISMATCH' });
	});

	test('external grants bind chooser path, physical Vault, device, target and revocation', async () => {
		let selected: string | undefined;
		const { root, outside, directories } = await fixture(async () => selected);
		const alias = path.join(root, 'chosen-alias');
		await link(outside, alias);
		selected = alias;
		const vault = await directories.inspectVault();
		const choice = await directories.chooseExternalDirectory(vault);
		expect(choice?.selectedPath).toBe(alias);
		const grant: DirectoryGrant = { ...choice!, id: 'grant-1', createdAt: 10 };
		const directory = { kind: 'external' as const, grantId: 'grant-1' };
		await expect(directories.resolveDirectory(vault, directory, grant)).resolves.toEqual({ cwd: await realpath(outside) });
		for (const bad of [undefined, { ...grant, id: 'other' }, { ...grant, revokedAt: 0 }, { ...grant, deviceId: 'other' }, { ...grant, vaultRoot: { ...grant.vaultRoot, ino: '0' } }, { ...grant, target: { ...grant.target, ino: '0' } }, { ...grant, selectedPath: 'relative' }]) {
			await expect(directories.resolveDirectory(vault, directory, bad)).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED' });
		}
		const replacement = path.join(root, 'replacement');
		await mkdir(replacement);
		await unlink(alias);
		await link(replacement, alias);
		await expect(directories.resolveDirectory(vault, directory, grant)).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED', reason: 'directory-changed' });
	});

	test('a deleted and recreated external directory invalidates its original grant', async () => {
		let selected: string | undefined;
		const { root, outside, directories } = await fixture(async () => selected);
		selected = outside;
		const vault = await directories.inspectVault();
		const choice = await directories.chooseExternalDirectory(vault);
		const grant = { ...choice!, id: 'grant', createdAt: 10 };
		await rename(outside, path.join(root, 'old-outside'));
		await mkdir(outside);
		await expect(directories.resolveDirectory(vault, { kind: 'external', grantId: grant.id }, grant)).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED', reason: 'directory-changed' });
		await rm(outside, { recursive: true });
		await expect(directories.resolveDirectory(vault, { kind: 'external', grantId: grant.id }, grant)).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED', reason: 'missing-directory' });
	});

	test('a native choice arriving after the configured Vault was replaced cannot authorize anything', async () => {
		let finish!: (value: string | undefined) => void;
		const chooser = vi.fn(() => new Promise<string | undefined>(resolve => { finish = resolve; }));
		const { root, vaultRoot, outside, directories } = await fixture(chooser);
		const vault = await directories.inspectVault();
		const pending = directories.chooseExternalDirectory(vault);
		const failure = expect(pending).rejects.toMatchObject({ code: 'SCOPE_MISMATCH', reason: 'vault-changed' });
		await vi.waitFor(() => expect(chooser).toHaveBeenCalledOnce());
		await rename(vaultRoot, path.join(root, 'old-vault'));
		await mkdir(vaultRoot);
		finish(outside);
		await failure;
	});

	test('chooser cancellation and late abort return undefined without granting a target', async () => {
		let finish!: (value: string | undefined) => void;
		const chooser = vi.fn(() => new Promise<string | undefined>(resolve => { finish = resolve; }));
		const { outside, directories } = await fixture(chooser);
		const vault = await directories.inspectVault();
		const already = new AbortController();
		already.abort();
		expect(await directories.chooseExternalDirectory(vault, already.signal)).toBeUndefined();
		expect(chooser).not.toHaveBeenCalled();
		const abort = new AbortController();
		const pending = directories.chooseExternalDirectory(vault, abort.signal);
		await vi.waitFor(() => expect(chooser).toHaveBeenCalledOnce());
		abort.abort();
		expect(await pending).toBeUndefined();
		finish(outside);
		await Promise.resolve();
		const cancelled = createDirectoryPort({ vaultRoot: vault.rootPath, vaultId: vault.vaultId, deviceId: vault.deviceId, chooseDirectory: async () => undefined });
		expect(await cancelled.chooseExternalDirectory(vault)).toBeUndefined();
	});
});
