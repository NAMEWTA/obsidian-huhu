import { cookieImportErrorCode, type CookieImportErrorCode, type CookieImportResult } from '../../core/cookies';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface ResultMessage {
	kind: 'success' | 'warning';
	title: string;
	lines: string[];
}
/** Success count first; each skip or failure reason on its own line with the next step, zero counts hidden. */
export function describeImportResult(
	result: CookieImportResult,
	profileName: string,
	t: Translate,
	browserLabel = result.source.replace(/\s*\(.*$/, ''),
): ResultMessage {
	const lines: string[] = [];
	if (result.fallback)
		lines.push(t('browser.cookie.fallback', { reason: t(`browser.cookie.fallbackReason.${result.fallback}`) }));
	if (result.googleSkipped) lines.push(t('browser.cookie.googleSkipped', { count: result.googleSkipped }));
	if (result.decryptFailed)
		lines.push(
			t(`browser.cookie.decrypt.${result.warning ?? 'unknown'}`, {
				count: result.decryptFailed,
				browser: browserLabel,
			}),
		);
	if (result.skipped) lines.push(t('browser.cookie.skipped', { count: result.skipped }));
	return {
		kind: result.imported ? 'success' : 'warning',
		title: result.imported
			? t('browser.cookie.result', { count: result.imported, source: result.source, name: profileName })
			: t('browser.cookie.resultNone', { source: result.source }),
		lines,
	};
}
export interface ErrorMessage {
	code: CookieImportErrorCode;
	title: string;
	text: string;
	/** Worth offering an in-page retry. */
	retry: boolean;
}
export function describeImportError(error: unknown, t: Translate): ErrorMessage {
	const code = cookieImportErrorCode(error);
	return {
		code,
		title: t('browser.cookie.errorTitle'),
		text: t(`browser.cookie.error.${code}`),
		retry: code === 'locked' || code === 'browser-timeout' || code === 'browser-failed',
	};
}
