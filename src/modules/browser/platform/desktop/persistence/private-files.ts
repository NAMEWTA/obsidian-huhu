import { constants, promises as fs, type Stats } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';
export const sameFile = (a: Stats, b: Stats): boolean => a.dev === b.dev && a.ino === b.ino;
export async function privateDirectory(directory: string): Promise<string> {
	try {
		const before = await fs.lstat(directory);
		if (!before.isDirectory() || before.isSymbolicLink()) throw new Error('browser_storage_path_invalid');
		const actual = await fs.realpath(directory);
		if (!sameFile(before, await fs.lstat(actual))) throw new Error('browser_storage_path_invalid');
		return actual;
	} catch (error) { if (!isMissing(error)) throw error; }
	const parent = path.dirname(directory);
	if (parent === directory) throw new Error('browser_storage_path_invalid');
	const actualParent = await privateDirectory(parent), target = path.join(actualParent, path.basename(directory));
	try { await fs.mkdir(target, { mode: 0o700 }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
	const actual = await privateDirectory(target);
	await syncDirectory(actualParent);
	return actual;
}
export async function syncDirectory(directory: string): Promise<void> {
	if (process.platform === 'win32') return;
	const handle = await fs.open(directory, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	try { await handle.sync(); } finally { await handle.close(); }
}
export async function readPrivateFile(file: string, maximum = 64 * 1024 * 1024): Promise<Buffer> {
	const initial = await fs.lstat(file);
	if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1 || initial.size > maximum)
		throw new Error('browser_storage_invalid');
	const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	try {
		const before = await handle.stat();
		if (!sameFile(initial, before) || !before.isFile() || before.size > maximum) throw new Error('browser_storage_changed');
		const result = Buffer.alloc(before.size); let offset = 0;
		while (offset < result.length) { const read = await handle.read(result, offset, result.length - offset, offset); if (!read.bytesRead) throw new Error('browser_storage_changed'); offset += read.bytesRead; }
		const after = await handle.stat();
		if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || !sameFile(after, await fs.lstat(file))) {
			result.fill(0); throw new Error('browser_storage_changed');
		}
		return result;
	} finally { await handle.close(); }
}
/** Caller owns the enclosing data root. Publication is durable and never follows a target symlink. */
export async function atomicPrivateFile(file: string, value: string | Uint8Array, exclusive = false): Promise<void> {
	const parent = await privateDirectory(path.dirname(file)), parentStat = await fs.lstat(parent);
	const target = path.join(parent, path.basename(file)), temporary = `${target}.${randomUUID()}.tmp`;
	const check = async () => {
		if (!sameFile(parentStat, await fs.lstat(parent)) || (await fs.realpath(path.dirname(file))) !== parent)
			throw new Error('browser_storage_path_invalid');
	};
	try { const current = await fs.lstat(target); if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1) throw new Error('browser_storage_invalid'); }
	catch (error) { if (!isMissing(error)) throw error; }
	const handle = await fs.open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
	try {
		try { await handle.writeFile(value); await handle.sync(); } finally { await handle.close(); }
		await check();
		if (exclusive) { await fs.link(temporary, target); await fs.unlink(temporary); }
		else await fs.rename(temporary, target);
		await syncDirectory(parent);
		await check();
	} finally {
		if (sameFile(parentStat, await fs.lstat(parent))) await fs.unlink(temporary).catch((error: unknown) => { if (!isMissing(error)) throw error; });
	}
}
