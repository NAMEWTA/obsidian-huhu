import { promises as fs } from 'node:fs';
import type { NativeHelperSqlite } from '../../../../agent/api';
import {
	CookieImportError,
	type CookieImportResult,
	type DetectedBrowser,
	type ImportCookie,
} from '../../../core/cookies';
import { fetchCookiesWithBrowser, findBrowserExecutable, type BrowserLauncher, type CdpCookie } from './cdp';
import { snapshotChromiumProfile } from './snapshot';
import { getEncryptionKey } from './keys';
import { decryptCookieValueRaw, cookieEncryptionVersion } from './decrypt';
import { readCookieRows } from './read';
import { validateCookie } from './validate';
import { isNonTransplantableCookieDomain } from './policy';
import { parseCookieFile } from './file-formats';
import { cookieSession } from './write';
export function chromiumTime(value: string): number {
	return Number(BigInt(value) / 1000000n - 11644473600n);
}
async function write(
	win: Window,
	directory: string,
	cookies: ImportCookie[],
	result: CookieImportResult,
): Promise<CookieImportResult> {
	const allowed = cookies.filter((c) => {
		if (isNonTransplantableCookieDomain(c.domain)) {
			result.googleSkipped++;
			return false;
		}
		return true;
	});
	if (allowed.length) {
		const applied = await cookieSession(win).write(directory, allowed);
		result.imported = applied.imported;
		result.skipped += applied.failed;
	}
	return result;
}
export async function importCookieFile(win: Window, path: string, directory: string): Promise<CookieImportResult> {
	if ((await fs.stat(path)).size > 32 * 1024 * 1024) throw new Error('Cookie file exceeds 32 MiB');
	const parsed = parseCookieFile(await fs.readFile(path, 'utf8'));
	return write(win, directory, parsed.cookies, {
		imported: 0,
		skipped: parsed.skipped,
		googleSkipped: 0,
		decryptFailed: 0,
		source: 'file',
		method: 'file',
	});
}
export interface BrowserImportOptions {
	/** `auto` uses the browser itself on Windows (application-bound encryption) and the SQLite store elsewhere. */
	strategy?: 'auto' | 'browser' | 'database';
	launcher?: BrowserLauncher;
	executable?: string;
	timeoutMs?: number;
}
export function cdpToCookie(c: CdpCookie): ImportCookie | null {
	if (c.partitionKey) return null;
	return validateCookie({
		domain: c.domain,
		name: c.name,
		value: c.value,
		path: c.path,
		secure: c.secure,
		httpOnly: c.httpOnly,
		expirationDate: c.session || !(c.expires > 0) ? undefined : c.expires,
		sameSite: c.sameSite ? c.sameSite.toLowerCase() : 'unspecified',
	});
}
/** Opens a private copy of the profile in the browser itself so it decrypts every cookie generation. */
async function readWithBrowser(
	browser: DetectedBrowser,
	profile: DetectedBrowser['profiles'][number],
	tmp: string,
	result: CookieImportResult,
	options: BrowserImportOptions,
	signal?: AbortSignal,
): Promise<ImportCookie[]> {
	const executable = options.executable ?? (await findBrowserExecutable(browser.family));
	if (!executable) throw new CookieImportError('browser-missing', `${browser.label} executable not found.`);
	const snapshot = await snapshotChromiumProfile(profile.directory, profile.cookiesPath, tmp);
	try {
		if (signal?.aborted) throw new CookieImportError('cancelled', 'Cookie import cancelled');
		const raw = await fetchCookiesWithBrowser({
			executable,
			userDataDir: snapshot.userDataDir,
			profileName: snapshot.profileName,
			launcher: options.launcher,
			timeoutMs: options.timeoutMs,
			signal,
		});
		const cookies: ImportCookie[] = [];
		for (const item of raw) {
			if (isNonTransplantableCookieDomain(item.domain)) {
				result.googleSkipped++;
				continue;
			}
			const cookie = cdpToCookie(item);
			if (cookie) cookies.push(cookie);
			else result.skipped++;
		}
		return cookies;
	} finally {
		await snapshot.cleanup();
	}
}
export async function importBrowserCookies(
	win: Window,
	browser: DetectedBrowser,
	profileDir: string | undefined,
	directory: string,
	tmp: string,
	helper: NativeHelperSqlite,
	signal?: AbortSignal,
	options: BrowserImportOptions = {},
): Promise<CookieImportResult> {
	const profile =
		browser.profiles.find((p) => p.directory === profileDir) ?? (!profileDir ? browser.profiles[0] : undefined);
	if (!profile) throw new Error('Browser profile not found');
	const strategy = options.strategy ?? 'auto';
	let fallback: CookieImportResult['fallback'];
	if (
		browser.kind === 'chromium' &&
		(strategy === 'browser' || (strategy === 'auto' && process.platform === 'win32'))
	) {
		const viaBrowser: CookieImportResult = {
			imported: 0,
			skipped: 0,
			googleSkipped: 0,
			decryptFailed: 0,
			source: `${browser.label} (${profile.name})`,
			method: 'browser',
		};
		try {
			const cookies = await readWithBrowser(browser, profile, tmp, viaBrowser, options, signal);
			if (signal?.aborted) throw new Error('Cookie import cancelled');
			return await write(win, directory, cookies, viaBrowser);
		} catch (error) {
			const code = error instanceof CookieImportError ? error.code : 'unknown';
			// A locked store would be just as locked for the SQLite route; cancelling must stop everything.
			if (strategy === 'browser' || code === 'locked' || code === 'cancelled') throw error;
			fallback = code;
		}
	}
	const rows = await readCookieRows(profile.cookiesPath, browser.kind, tmp, helper, signal);
	const key = browser.kind === 'chromium' ? await getEncryptionKey(browser) : null;
	const result: CookieImportResult = {
		imported: 0,
		skipped: 0,
		googleSkipped: 0,
		decryptFailed: 0,
		source: `${browser.label} (${profile.name})`,
		method: 'database',
		...(fallback ? { fallback } : {}),
	};
	const cookies: ImportCookie[] = [];
	for (const row of rows) {
		const domain = typeof row.host_key === 'string' ? row.host_key : '';
		if (isNonTransplantableCookieDomain(domain)) {
			result.googleSkipped++;
			continue;
		}
		let value = typeof row.value === 'string' ? row.value : '';
		if (typeof row.encrypted_value_hex === 'string' && row.encrypted_value_hex) {
			const encrypted = Buffer.from(row.encrypted_value_hex, 'hex');
			const plain = key ? decryptCookieValueRaw(encrypted, key, domain) : null;
			if (plain === null) {
				result.decryptFailed++;
				result.warning =
					cookieEncryptionVersion(encrypted) === 'v20'
						? 'app-bound-encryption'
						: key?.mode === 'aes-128-cbc' && key.keyringUnavailable
							? 'linux-keyring-unavailable'
							: 'unknown';
				continue;
			}
			value = plain.toString('utf8');
		}
		const cookie = validateCookie({
			domain,
			name: row.name,
			value,
			path: row.path,
			secure: row.is_secure === 1,
			httpOnly: row.is_httponly === 1,
			expirationDate:
				browser.kind === 'firefox'
					? Number(row.expiry)
					: chromiumTime(typeof row.expires_utc === 'string' ? row.expires_utc : '0'),
			sameSite:
				row.samesite === 1
					? 'lax'
					: row.samesite === 2
						? 'strict'
						: row.samesite === 0
							? 'no_restriction'
							: 'unspecified',
		});
		if (cookie) cookies.push(cookie);
		else result.skipped++;
	}
	if (signal?.aborted) throw new Error('Cookie import cancelled');
	return write(win, directory, cookies, result);
}
