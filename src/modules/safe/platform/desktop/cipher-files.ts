import { constants } from 'node:fs';
import { open, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { absoluteHuhuPath } from '../../../../host/desktop/huhu-paths';
import { secureOwnedDirectory } from '../../../../host/desktop/owned-permissions';
import { huhuPath } from '../../../../shared/storage/huhu-paths';
import { SafeError, MAX_CONTAINER_BYTES } from '../../core/model';

export const SAFE_DIRECTORY = huhuPath('safe');

/** Only complete ciphertext crosses this port. The service owns write ordering. */
export interface CipherFiles {
	read(name: string): Promise<string | null>;
	stage(raw: string): Promise<string>;
	publish(staged: string, name: string): Promise<void>;
	discard(staged: string): Promise<void>;
}

function isMissing(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function ownedName(name: string): void {
	if (!/^(?:vault\.enc(?:\.backup)?|(?:conflict-|preserved-|preupgrade-|preimport-|\.tmp-)[0-9a-f-]{36}(?:\.enc)?)$/.test(name)) throw new SafeError('storage');
}

/** Bound allocation before reading, including files that grow while open. */
export async function readCipherFile(file: string): Promise<string | null> {
	let handle;
	try {
		handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	} catch (error) {
		if (isMissing(error)) return null;
		throw new SafeError('storage');
	}
	try {
		const stat = await handle.stat();
		if (!stat.isFile()) throw new SafeError('storage');
		if (stat.size > MAX_CONTAINER_BYTES) throw new SafeError('too-large');
		const bytes = Buffer.alloc(stat.size + 1);
		let offset = 0;
		while (offset < bytes.length) {
			const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
			if (!bytesRead) break;
			offset += bytesRead;
		}
		const after = await handle.stat();
		if (offset !== stat.size || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs) throw new SafeError('changed');
		try {
			return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, offset));
		} catch {
			throw new SafeError('invalid-format');
		}
	} catch (error) {
		throw error instanceof SafeError ? error : new SafeError('storage');
	} finally {
		await handle.close().catch(() => { throw new SafeError('storage'); });
	}
}

/** Directory fsync is unavailable on Windows and some mounted filesystems. */
export async function syncCipherDirectory(directory: string): Promise<void> {
	if (process.platform === 'win32') return;
	let handle;
	try {
		handle = await open(directory, constants.O_RDONLY);
		await handle.sync();
	} catch (error) {
		const code = error instanceof Error && 'code' in error ? error.code : undefined;
		if (code !== 'EINVAL' && code !== 'ENOTSUP' && code !== 'EOPNOTSUPP') throw new SafeError('storage');
	} finally {
		await handle?.close().catch(() => { throw new SafeError('storage'); });
	}
}

export function createCipherFiles(vaultRoot: string): CipherFiles {
	const resolve = async (name: string): Promise<string> => {
		ownedName(name);
		return absoluteHuhuPath(vaultRoot, `${SAFE_DIRECTORY}/${name}`);
	};
	const read = async (name: string): Promise<string | null> => {
		try {
			return await readCipherFile(await resolve(name));
		} catch (error) {
			throw error instanceof SafeError ? error : new SafeError('storage');
		}
	};
	return {
		read,
		async stage(raw) {
			if (Buffer.byteLength(raw, 'utf8') > MAX_CONTAINER_BYTES) throw new SafeError('too-large');
			const name = `.tmp-${randomUUID()}`;
			let created = false;
			let handle;
			try {
				await secureOwnedDirectory(vaultRoot, SAFE_DIRECTORY);
				const file = await resolve(name);
				handle = await open(file, 'wx', 0o600);
				created = true;
				await handle.writeFile(raw, 'utf8');
				await handle.sync();
				await handle.close();
				handle = undefined;
				if (await read(name) !== raw) throw new SafeError('storage');
				return name;
			} catch (error) {
				await handle?.close().catch(() => {});
				if (created) await resolve(name).then(file => unlink(file)).catch(() => {});
				throw error instanceof SafeError ? error : new SafeError('storage');
			}
		},
		async publish(staged, name) {
			if (!staged.startsWith('.tmp-') || name.startsWith('.tmp-')) throw new SafeError('storage');
			try {
				const from = await resolve(staged), target = await resolve(name);
				await rename(from, target);
				await syncCipherDirectory(path.dirname(target));
			} catch (error) {
				throw error instanceof SafeError ? error : new SafeError('storage');
			}
		},
		async discard(staged) {
			if (!staged.startsWith('.tmp-')) throw new SafeError('storage');
			try {
				await unlink(await resolve(staged));
			} catch (error) {
				if (!isMissing(error)) throw new SafeError('storage');
			}
		},
	};
}
