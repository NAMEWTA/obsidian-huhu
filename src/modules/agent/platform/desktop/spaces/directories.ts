import { realpath, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { SpaceError } from '../../../core/space/errors';
import type { PhysicalDirectory, VaultBinding } from '../../../core/space/model';
import type { DirectoryPort } from '../../../core/space/ports';

interface DirectoryOptions {
	readonly vaultRoot: string;
	readonly vaultId: string;
	readonly deviceId: string;
	readonly chooseDirectory: () => Promise<string | undefined>;
}

export function sameDirectory(left: PhysicalDirectory, right: PhysicalDirectory): boolean {
	return left.dev === right.dev && left.ino === right.ino && left.canonicalPath === right.canonicalPath;
}

async function inspectDirectory(selectedPath: string): Promise<PhysicalDirectory> {
	if (!path.isAbsolute(selectedPath) || selectedPath.includes('\0')) {
		throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'invalid-directory');
	}
	try {
		const canonicalPath = await realpath(selectedPath);
		const identity = await stat(canonicalPath, { bigint: true });
		if (!identity.isDirectory()) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'not-directory');
		if (identity.dev < BigInt(0) || identity.ino <= BigInt(0)) {
			throw new SpaceError('CAPABILITY_UNAVAILABLE', 'physical-identity-unavailable');
		}
		return Object.freeze({ canonicalPath, dev: identity.dev.toString(), ino: identity.ino.toString() });
	} catch (error) {
		if (error instanceof SpaceError) throw error;
		const code = (error as NodeJS.ErrnoException).code;
		throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', code === 'ENOENT' || code === 'ENOTDIR' ? 'missing-directory' : 'directory-unavailable', {}, error);
	}
}

function relativeSegments(relativePath: string): string[] {
	if (relativePath === '') return [];
	const parts = relativePath.split('/');
	if (path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath) || /[\\:\0]/.test(relativePath)
		|| parts.some(part => part === '' || part === '.' || part === '..')) {
		throw new SpaceError('INVALID_ARGUMENT', 'invalid-relative-path');
	}
	return parts;
}

/** Cancelling a native modal cannot close it; its eventual result must not become authorization. */
function cancellable<T>(signal: AbortSignal | undefined, run: () => Promise<T>): Promise<T | undefined> {
	if (signal?.aborted) return Promise.resolve(undefined);
	return new Promise((resolve, reject) => {
		const cancel = () => resolve(undefined);
		signal?.addEventListener('abort', cancel, { once: true });
		void run().then(value => {
			signal?.removeEventListener('abort', cancel);
			resolve(signal?.aborted ? undefined : value);
		}, error => {
			signal?.removeEventListener('abort', cancel);
			if (signal?.aborted) resolve(undefined);
			else reject(error instanceof Error ? error : new SpaceError('CAPABILITY_UNAVAILABLE', 'directory-unavailable', {}, error));
		});
	});
}

export function createDirectoryPort(options: DirectoryOptions): DirectoryPort {
	const { vaultRoot, vaultId, deviceId, chooseDirectory } = options;
	const assertVault = async (expected: VaultBinding): Promise<void> => {
		if (expected.deviceId !== deviceId) throw new SpaceError('SCOPE_MISMATCH', 'device-changed');
		if (expected.vaultId !== vaultId || expected.rootPath !== vaultRoot) throw new SpaceError('SCOPE_MISMATCH', 'vault-changed');
		let current: PhysicalDirectory;
		try { current = await inspectDirectory(vaultRoot); }
		catch (error) { throw new SpaceError('SCOPE_MISMATCH', 'vault-changed', {}, error); }
		if (!sameDirectory(expected.root, current)) throw new SpaceError('SCOPE_MISMATCH', 'vault-changed');
	};
	const bindVaultDirectory: DirectoryPort['bindVaultDirectory'] = async (vault, relativePath) => {
		const segments = relativeSegments(relativePath);
		await assertVault(vault);
		const target = await inspectDirectory(path.join(vaultRoot, ...segments));
		const relative = path.relative(vault.root.canonicalPath, target.canonicalPath);
		if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
			throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'directory-outside-vault');
		}
		await assertVault(vault);
		return Object.freeze({ kind: 'vault', relativePath, target });
	};
	return {
		inspectVault: async () => Object.freeze({ vaultId, deviceId, rootPath: vaultRoot, root: await inspectDirectory(vaultRoot) }),
		assertVault,
		bindVaultDirectory,
		chooseExternalDirectory: (vault, signal) => cancellable(signal, async () => {
			await assertVault(vault);
			if (signal?.aborted) return undefined;
			let selectedPath: string | undefined;
			try { selectedPath = await chooseDirectory(); }
			catch (error) { throw new SpaceError('CAPABILITY_UNAVAILABLE', 'chooser-unavailable', {}, error); }
			if (signal?.aborted || !selectedPath) return undefined;
			const target = await inspectDirectory(selectedPath);
			await assertVault(vault);
			return Object.freeze({ selectedPath, target, vaultRoot: vault.root, deviceId });
		}),
		resolveDirectory: async (vault, directory, grant) => {
			await assertVault(vault);
			if (directory.kind === 'vault') {
				const current = await bindVaultDirectory(vault, directory.relativePath);
				if (!sameDirectory(current.target, directory.target)) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'directory-changed');
				return { cwd: current.target.canonicalPath };
			}
			if (!grant || grant.id !== directory.grantId || !grant.id) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'grant-missing');
			if (grant.revokedAt !== undefined) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'grant-revoked');
			if (grant.deviceId !== deviceId || !sameDirectory(grant.vaultRoot, vault.root)) {
				throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'grant-scope');
			}
			const target = await inspectDirectory(grant.selectedPath);
			if (!sameDirectory(target, grant.target)) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'directory-changed');
			await assertVault(vault);
			return { cwd: target.canonicalPath };
		},
	};
}
