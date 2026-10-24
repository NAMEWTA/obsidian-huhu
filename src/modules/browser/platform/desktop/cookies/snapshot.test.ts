import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CookieImportError } from '../../../core/cookies';
import { copyStableDatabase, copyWithLockRetry, isLockError, snapshotChromiumProfile } from './snapshot';

const errno = (code: string) => Object.assign(new Error(code), { code });
let root = '';
async function temp() {
	root = await fs.mkdtemp(join(tmpdir(), 'huhu-snapshot-'));
	return root;
}
afterEach(async () => {
	vi.restoreAllMocks();
	if (root) await fs.rm(root, { recursive: true, force: true });
	root = '';
});

describe('locked Cookie files', () => {
	it('classifies lock errnos', () => {
		for (const code of ['EBUSY', 'EPERM', 'EACCES']) expect(isLockError(errno(code))).toBe(true);
		expect(isLockError(errno('ENOENT'))).toBe(false);
	});
	it('retries a transient lock with backoff and then succeeds', async () => {
		const dir = await temp();
		await fs.writeFile(join(dir, 'a'), 'data');
		const copy = vi.spyOn(fs, 'copyFile');
		copy.mockRejectedValueOnce(errno('EBUSY')).mockRejectedValueOnce(errno('EPERM'));
		const waits: number[] = [];
		await copyWithLockRetry(join(dir, 'a'), join(dir, 'b'), { delay: async (ms) => void waits.push(ms) });
		expect(waits).toEqual([50, 100]);
		expect(copy).toHaveBeenCalledTimes(3);
		expect(await fs.readFile(join(dir, 'b'), 'utf8')).toBe('data');
	});
	it('falls back to a shared-handle read when CopyFile stays locked', async () => {
		const dir = await temp();
		await fs.writeFile(join(dir, 'a'), 'data');
		vi.spyOn(fs, 'copyFile').mockRejectedValue(errno('EBUSY'));
		await copyWithLockRetry(join(dir, 'a'), join(dir, 'b'), { attempts: 2, delay: async () => undefined });
		expect(await fs.readFile(join(dir, 'b'), 'utf8')).toBe('data');
	});
	it('reports a persistent lock as a coded error, not a raw errno', async () => {
		const dir = await temp();
		await fs.writeFile(join(dir, 'a'), 'data');
		vi.spyOn(fs, 'copyFile').mockRejectedValue(errno('EBUSY'));
		vi.spyOn(fs, 'open').mockRejectedValue(errno('EBUSY'));
		const error = await copyWithLockRetry(join(dir, 'a'), join(dir, 'b'), {
			attempts: 2,
			delay: async () => undefined,
		}).catch((e) => e);
		expect(error).toBeInstanceOf(CookieImportError);
		expect(error.code).toBe('locked');
	});
	it('does not swallow unrelated failures', async () => {
		const dir = await temp();
		await expect(copyWithLockRetry(join(dir, 'missing'), join(dir, 'b'))).rejects.toMatchObject({ code: 'ENOENT' });
	});
});

describe('stable snapshots', () => {
	it('retries when the source changes during the copy', async () => {
		const dir = await temp(),
			source = join(dir, 'Cookies');
		await fs.writeFile(source, 'v1');
		const real = fs.copyFile.bind(fs);
		let calls = 0;
		vi.spyOn(fs, 'copyFile').mockImplementation(async (from, to) => {
			await real(from, to);
			if (++calls === 1 && String(from) === source) await fs.writeFile(source, 'version-2');
		});
		await copyStableDatabase(source, join(dir, 'copy'));
		expect(await fs.readFile(join(dir, 'copy'), 'utf8')).toBe('version-2');
		expect(calls).toBeGreaterThan(1);
	});
	it('builds a private user-data directory with Local State and removes it on cleanup', async () => {
		const dir = await temp(),
			profile = join(dir, 'User Data', 'Profile 4');
		await fs.mkdir(join(profile, 'Network'), { recursive: true });
		await fs.writeFile(join(profile, 'Network', 'Cookies'), 'db');
		await fs.writeFile(join(profile, 'Network', 'Cookies-wal'), 'wal');
		await fs.writeFile(join(dir, 'User Data', 'Local State'), '{}');
		const snap = await snapshotChromiumProfile(profile, join(profile, 'Network', 'Cookies'), join(dir, 'tmp'));
		expect(snap.profileName).toBe('Profile 4');
		expect(await fs.readFile(join(snap.userDataDir, 'Local State'), 'utf8')).toBe('{}');
		expect(await fs.readFile(join(snap.userDataDir, 'Profile 4', 'Network', 'Cookies-wal'), 'utf8')).toBe('wal');
		expect(await fs.readFile(join(profile, 'Network', 'Cookies'), 'utf8')).toBe('db');
		await snap.cleanup();
		expect(await fs.readdir(join(dir, 'tmp'))).toEqual([]);
	});
	it('removes the partial directory when the copy fails', async () => {
		const dir = await temp(),
			profile = join(dir, 'Default');
		await fs.mkdir(profile, { recursive: true });
		await expect(snapshotChromiumProfile(profile, join(profile, 'Cookies'), join(dir, 'tmp'))).rejects.toThrow();
		expect(await fs.readdir(join(dir, 'tmp'))).toEqual([]);
	});
});
