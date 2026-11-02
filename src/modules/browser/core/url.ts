// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/shared/browser-url.ts
import { AgentBrowserError } from './contracts';
export const SEARCH_ENGINES = {
	google: 'https://www.google.com/search?q=%s',
	bing: 'https://www.bing.com/search?q=%s',
	baidu: 'https://www.baidu.com/s?wd=%s',
	duckduckgo: 'https://duckduckgo.com/?q=%s',
} as const;
export type SearchEngine = keyof typeof SEARCH_ENGINES | 'custom';
const LOCAL_ADDRESS_PATTERN = /^(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[[0-9a-f:]+\])(?::\d+)?(?:[/?#].*)?$/i;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/].*$/;
const WINDOWS_UNC_PATH_PATTERN = /^\\\\[^\s\\/]+[\\/][^\\/]+(?:[\\/].*)?$/;
export function validSearchTemplate(template: string): boolean {
	try {
		const u = new URL(template);
		return u.protocol === 'https:' && !u.username && !u.password && template.includes('%s');
	} catch {
		return false;
	}
}
export function buildSearchUrl(query: string, engine: SearchEngine = 'google', custom = ''): string {
	const template = engine === 'custom' ? custom : SEARCH_ENGINES[engine];
	if (!validSearchTemplate(template)) throw new AgentBrowserError('browser_invalid_search');
	return template.replaceAll('%s', encodeURIComponent(query));
}
export function looksLikeSearchQuery(input: string): boolean {
	return /\s/.test(input) || !/[.:]/.test(input);
}
export function normalizeBrowserNavigationUrl(raw: string, search?: SearchEngine, custom = ''): string | null {
	const input = raw.trim();
	if (!input || input === 'about:blank') return 'about:blank';
	try {
		if (WINDOWS_UNC_PATH_PATTERN.test(input) || input.startsWith('/') || WINDOWS_ABSOLUTE_PATH_PATTERN.test(input))
			return null;
		let candidate = input;
		if (LOCAL_ADDRESS_PATTERN.test(input)) candidate = `http://${input}`;
		else if (/^[^\s/\\:@?#]+:\d+(?:[/?#].*)?$/.test(input)) candidate = `https://${input}`;
		else if (!/^[a-z][a-z0-9+.-]*:/i.test(input)) {
			if (looksLikeSearchQuery(input)) return search ? buildSearchUrl(input, search, custom) : null;
			candidate = `https://${input}`;
		}
		const url = new URL(candidate);
		return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.toString() : null;
	} catch {
		return null;
	}
}
export function normalizeBrowserUrl(input: string, search?: SearchEngine, custom = ''): string {
	const url = normalizeBrowserNavigationUrl(input, search, custom);
	if (url === null) throw new AgentBrowserError('browser_invalid_url');
	return url;
}
