export interface ImportCookie {
	domain: string;
	hostOnly?: boolean;
	name: string;
	value: string;
	path: string;
	secure: boolean;
	httpOnly: boolean;
	expirationDate?: number;
	sameSite: 'unspecified' | 'no_restriction' | 'lax' | 'strict';
}
export interface DetectedBrowser {
	family: string;
	label: string;
	root: string;
	kind: 'chromium' | 'firefox';
	keychainService?: string;
	keychainAccount?: string;
	profiles: Array<{ name: string; directory: string; cookiesPath: string }>;
}
export interface CookieImportResult {
	imported: number;
	skipped: number;
	googleSkipped: number;
	decryptFailed: number;
	warning?: 'app-bound-encryption' | 'linux-keyring-unavailable' | 'unknown';
	source: string;
	/** How the values were read: the browser itself, its SQLite store, or an exported file. */
	method?: 'browser' | 'database' | 'file';
	/** Why the browser-decrypt route was skipped before falling back to the SQLite store. */
	fallback?: CookieImportErrorCode;
}
export type CookieImportErrorCode =
	'locked' | 'browser-missing' | 'browser-timeout' | 'browser-failed' | 'cancelled' | 'unknown';
/** Import failure with a stable code so the UI can offer the matching next step instead of a raw errno. */
export class CookieImportError extends Error {
	constructor(
		readonly code: CookieImportErrorCode,
		message: string,
	) {
		super(message);
		this.name = 'CookieImportError';
	}
}
export function cookieImportErrorCode(error: unknown): CookieImportErrorCode {
	return error instanceof CookieImportError ? error.code : 'unknown';
}
