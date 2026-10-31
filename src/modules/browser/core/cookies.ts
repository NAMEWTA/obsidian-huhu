export interface DetectedBrowser {
	family: string;
	label: string;
	root: string;
	kind: 'chromium' | 'firefox';
	keychainService?: string;
	keychainAccount?: string;
	profiles: Array<{ name: string; directory: string; cookiesPath: string }>;
}
/** Snapshot errors are internal; public import responses map them to stable identity error codes. */
export class CookieImportError extends Error {
	constructor(
		readonly code: 'locked' | 'unknown',
		message: string,
	) {
		super(message);
		this.name = 'CookieImportError';
	}
}
