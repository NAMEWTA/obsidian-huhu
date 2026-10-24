import { setTimeout as schedule } from 'node:timers';
// Retry and stable-snapshot approach adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.:
// src/main/browser/chromium-cookie-snapshot.ts and src/shared/windows-retry-file-operations.ts
import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CookieImportError } from '../../../core/cookies';

const SNAPSHOT_ATTEMPTS = 5;
const COPY_ATTEMPTS = 6;
const LOCK_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);

export function isLockError(error: unknown): boolean {
	return LOCK_CODES.has((error as NodeJS.ErrnoException | undefined)?.code ?? '');
}
const isMissing = (error: unknown) => (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
const sleep = (ms: number) => new Promise<void>((resolve) => schedule(resolve, ms));

/**
 * Windows `CopyFileW` opens the source with FILE_SHARE_READ only and fails while Chrome holds it for writing.
 * libuv's plain open uses FILE_SHARE_READ|WRITE|DELETE, so reading through a handle still works when the
 * lock is only a share-mode conflict. No administrator rights are involved.
 */
async function sharedReadCopy(source: string, target: string): Promise<void> {
	const input = await fs.open(source, 'r');
	try {
		const output = await fs.open(target, 'w', 0o600);
		try {
			const buffer = Buffer.allocUnsafe(1024 * 1024);
			for (;;) {
				const { bytesRead } = await input.read(buffer, 0, buffer.length, null);
				if (!bytesRead) break;
				await output.write(buffer, 0, bytesRead);
			}
		} finally {
			await output.close();
		}
	} finally {
		await input.close();
	}
}

/** Copies one file, retrying short antivirus/browser locks and then reading through a shared handle. */
export async function copyWithLockRetry(
	source: string,
	target: string,
	options: { attempts?: number; delay?: (ms: number) => Promise<void> } = {},
): Promise<void> {
	const attempts = options.attempts ?? COPY_ATTEMPTS,
		delay = options.delay ?? sleep;
	let last: unknown;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			await fs.copyFile(source, target);
			return;
		} catch (error) {
			if (!isLockError(error)) throw error;
			last = error;
			if (attempt < attempts) await delay(attempt * 50);
		}
	}
	try {
		await sharedReadCopy(source, target);
	} catch (error) {
		if (isLockError(error)) throw lockedError(source, last ?? error);
		throw error;
	}
}

export function lockedError(path: string, cause?: unknown): CookieImportError {
	const code = (cause as NodeJS.ErrnoException | undefined)?.code ?? 'EBUSY';
	return new CookieImportError('locked', `The browser keeps ${basename(path)} locked (${code}).`);
}

interface FileState {
	size: bigint;
	modifiedAt: bigint;
	changedAt: bigint;
	inode: bigint;
}
async function state(path: string): Promise<FileState | null> {
	try {
		const s = await fs.stat(path, { bigint: true });
		return { size: s.size, modifiedAt: s.mtimeNs, changedAt: s.ctimeNs, inode: s.ino };
	} catch (error) {
		if (isMissing(error)) return null;
		throw error;
	}
}
function same(a: FileState | null, b: FileState | null): boolean {
	if (!a || !b) return a === b;
	return a.size === b.size && a.modifiedAt === b.modifiedAt && a.changedAt === b.changedAt && a.inode === b.inode;
}
async function removeAttempt(target: string) {
	for (const suffix of ['', '-wal', '-shm']) await fs.rm(target + suffix, { force: true });
}
async function copyAttempt(source: string, target: string): Promise<boolean> {
	const dbBefore = await state(source),
		walBefore = await state(source + '-wal');
	if (!dbBefore) throw new Error('Cookie database does not exist');
	await removeAttempt(target);
	await copyWithLockRetry(source, target);
	if (walBefore)
		try {
			// SQLite only finds a WAL whose name exactly matches the database copy.
			await copyWithLockRetry(source + '-wal', target + '-wal');
		} catch (error) {
			if (isMissing(error)) return false;
			throw error;
		}
	try {
		// The shared-memory index is transient and rebuilt by SQLite; losing it is harmless.
		await copyWithLockRetry(source + '-shm', target + '-shm', { attempts: 1 });
	} catch {
		await fs.rm(target + '-shm', { force: true });
	}
	if (!same(dbBefore, await state(source)) || !same(walBefore, await state(source + '-wal'))) return false;
	const copiedDb = await state(target),
		copiedWal = await state(target + '-wal');
	return copiedDb?.size === dbBefore.size && (walBefore ? copiedWal?.size === walBefore.size : copiedWal === null);
}
/** Copies the database plus WAL until the source stayed unchanged during the copy. */
export async function copyStableDatabase(source: string, target: string): Promise<void> {
	for (let attempt = 0; attempt < SNAPSHOT_ATTEMPTS; attempt++) if (await copyAttempt(source, target)) return;
	throw new CookieImportError('unknown', 'Cookie database kept changing while it was copied.');
}

export interface ProfileSnapshot {
	userDataDir: string;
	profileName: string;
	cleanup(): Promise<void>;
}
/**
 * Builds a throw-away user-data directory (Local State plus one profile's cookie store) so a browser can open
 * the copy and decrypt it with its own keys. The source profile is only ever read.
 */
export async function snapshotChromiumProfile(
	profileDirectory: string,
	cookiesPath: string,
	tmpRoot: string,
): Promise<ProfileSnapshot> {
	const userDataDir = join(tmpRoot, randomUUID()),
		profileName = basename(profileDirectory),
		inNetwork = basename(dirname(cookiesPath)) === 'Network',
		target = join(userDataDir, profileName, ...(inNetwork ? ['Network'] : []), 'Cookies'),
		cleanup = () => fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
	await fs.mkdir(dirname(target), { recursive: true, mode: 0o700 });
	try {
		const localState = join(dirname(profileDirectory), 'Local State');
		try {
			await copyWithLockRetry(localState, join(userDataDir, 'Local State'));
		} catch (error) {
			if (!isMissing(error)) throw error;
		}
		await copyStableDatabase(cookiesPath, target);
		return { userDataDir, profileName, cleanup };
	} catch (error) {
		await cleanup();
		throw error;
	}
}
