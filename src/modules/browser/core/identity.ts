export interface IdentityCookie {
	name: string; value: string; domain: string; hostOnly: boolean; path: string;
	secure: boolean; httpOnly: boolean; session: boolean; sameSite?: 'Strict' | 'Lax' | 'None'; expires?: number;
	priority?: 'Low' | 'Medium' | 'High'; sourceScheme?: 'Unset' | 'NonSecure' | 'Secure'; sourcePort?: number;
	partitionKey?: { topLevelSite: string; hasCrossSiteAncestor: boolean };
}
export interface IdentityOrigin { origin: string; localStorage: Array<{ name: string; value: string }> }
export interface IdentitySeedV1 { format: 'huhu-browser-identity'; version: 1; cookies: IdentityCookie[]; origins: IdentityOrigin[] }
export type IdentitySourceKind = 'cookie-file' | 'browser-source' | 'manual-login';
export interface IdentitySource { id: string; label: string; profiles: Array<{ id: string; label: string }> }
export interface IdentityVersion { id: string; identityId: string; label: string; source: IdentitySourceKind; createdAt: number; seed: IdentitySeedV1 }
export interface IdentityVersionSummary { id: string; identityId: string; label: string; source: IdentitySourceKind; createdAt: number; cookieCount: number; originCount: number; persistent: boolean }
export type IdentitySummary = IdentityVersionSummary;
export type IdentityErrorCode = 'invalid_format' | 'too_large' | 'invalid_cookie' | 'unsupported_cookie' | 'conflicting_cookie' |
	'unsupported_storage' | 'key_unavailable' | 'weak_provider' | 'identity_locked' | 'identity_missing' | 'identity_corrupt' |
	'identity_exists' | 'source_grant_invalid' | 'secret_permit_invalid' | 'cancelled' | 'target_not_empty' | 'context_mismatch' |
	'verification_failed' | 'cleanup_pending' | 'source_changed' | 'source_unavailable';
export class IdentityError extends Error { constructor(readonly code: IdentityErrorCode) { super(code); this.name = 'IdentityError'; } }
export interface CredentialStorePort {
	availability(): Promise<'available' | 'unavailable' | 'weak-provider'>;
	create(version: IdentityVersion): Promise<void>; listIds(): Promise<string[]>; read(id: string): Promise<IdentityVersion>;
	remove(id: string): Promise<void>; lock(): void; unlock(): void;
}
export interface IdentityImportPlan {
	seed: IdentitySeedV1;
	counts: { accepted: number; expired: number; duplicate: number; invalid: number; unsupported: number };
	issues: Array<{ index: number; code: 'invalid_cookie' | 'unsupported_cookie' | 'conflicting_cookie' | 'unsupported_storage' }>;
}
export interface IdentityImportPreview { planId: string; counts: IdentityImportPlan['counts']; originCount: number; issues: IdentityImportPlan['issues']; domains: Array<{ domain: string; count: number }> }
export const MAX_IDENTITY_BYTES = 32 * 1024 * 1024;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const controls = (value: string) => /[\u0000-\u001f\u007f]/.test(value);
export const identityIdValid = (value: string): boolean => /^[a-zA-Z0-9_-]{1,96}$/.test(value);
const bool = (raw: unknown, fallback = false): boolean => { if (raw === undefined) return fallback; if (typeof raw !== 'boolean') throw new IdentityError('invalid_cookie'); return raw; };
function origin(raw: unknown): string {
	if (typeof raw !== 'string') throw new IdentityError('unsupported_storage');
	try { const url = new URL(raw); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.origin !== raw) throw new Error(); return raw; }
	catch { throw new IdentityError('unsupported_storage'); }
}
function host(raw: string): string {
	if (!raw || raw.length > 254 || /[\s\/:@\\?#]/.test(raw) || controls(raw)) throw new IdentityError('invalid_cookie');
	const normalized = raw.replace(/^\./, '').toLowerCase();
	try { if (!normalized || normalized.startsWith('.') || normalized.endsWith('.') || normalized.includes('..') || new URL(`https://${normalized}`).hostname !== normalized) throw new Error(); }
	catch { throw new IdentityError('invalid_cookie'); }
	return normalized;
}
export function normalizeIdentityCookie(value: unknown, now: number): IdentityCookie | 'expired' {
	if (!object(value) || typeof value.domain !== 'string' || typeof value.name !== 'string' || typeof value.value !== 'string' || typeof value.path !== 'string') throw new IdentityError('invalid_cookie');
	if (value.partitionKeyOpaque === true || value.sameParty === true || (value.originAttributes !== undefined && value.originAttributes !== '') ||
		(value.firstPartyDomain !== undefined && value.firstPartyDomain !== '') || (value.storeId !== undefined && !['0', 'firefox-default'].includes(String(value.storeId)))) throw new IdentityError('unsupported_cookie');
	const domain = host(value.domain), hostOnly = bool(value.hostOnly, !value.domain.startsWith('.'));
	if (hostOnly && value.domain.startsWith('.') || !hostOnly && (!domain.includes('.') || /^[0-9.]+$/.test(domain))) throw new IdentityError('invalid_cookie');
	if (!value.path.startsWith('/') || value.path.length > 4096 || controls(value.path) || value.name.length > 4096 || /[\s;=]/.test(value.name) || controls(value.name) || controls(value.value) || value.value.length > 65536) throw new IdentityError('invalid_cookie');
	const secure = bool(value.secure), httpOnly = bool(value.httpOnly);
	const rawExpires = value.expires ?? value.expirationDate;
	if (rawExpires !== undefined && (typeof rawExpires !== 'number' || !Number.isFinite(rawExpires) || rawExpires > Number.MAX_SAFE_INTEGER || rawExpires < -1)) throw new IdentityError('invalid_cookie');
	const session = bool(value.session, rawExpires === undefined || rawExpires === -1 || rawExpires === 0);
	if (session && typeof rawExpires === 'number' && rawExpires > 0 || !session && (typeof rawExpires !== 'number' || rawExpires <= 0)) throw new IdentityError('invalid_cookie');
	const sameSite = value.sameSite === 'no_restriction' ? 'None' : value.sameSite === 'unspecified' ? undefined : value.sameSite;
	if (sameSite !== undefined && !['Strict', 'Lax', 'None'].includes(String(sameSite))) throw new IdentityError('invalid_cookie');
	if (sameSite === 'None' && !secure || value.name.startsWith('__Secure-') && !secure || value.name.startsWith('__Host-') && (!secure || !hostOnly || value.path !== '/') ||
		(value.name.startsWith('__Http-') || value.name.startsWith('__Host-Http-')) && (!secure || !httpOnly)) throw new IdentityError('invalid_cookie');
	const cookie: IdentityCookie = { name: value.name, value: value.value, domain: hostOnly ? domain : `.${domain}`, hostOnly, path: value.path, secure, httpOnly, session,
		...(sameSite ? { sameSite: sameSite as IdentityCookie['sameSite'] } : {}), ...(!session ? { expires: rawExpires as number } : {}) };
	if (value.priority !== undefined) { if (!['Low', 'Medium', 'High'].includes(String(value.priority))) throw new IdentityError('unsupported_cookie'); cookie.priority = value.priority as IdentityCookie['priority']; }
	if (value.sourceScheme !== undefined) { if (!['Unset', 'NonSecure', 'Secure'].includes(String(value.sourceScheme))) throw new IdentityError('unsupported_cookie'); cookie.sourceScheme = value.sourceScheme as IdentityCookie['sourceScheme']; }
	if (value.sourcePort !== undefined) { if (typeof value.sourcePort !== 'number' || !Number.isInteger(value.sourcePort) || value.sourcePort < -1 || value.sourcePort > 65535) throw new IdentityError('invalid_cookie'); cookie.sourcePort = value.sourcePort; }
	if (value.partitionKey !== undefined && value.partitionKey !== null) {
		if (!secure || !object(value.partitionKey) || typeof value.partitionKey.hasCrossSiteAncestor !== 'boolean' || Object.keys(value.partitionKey).some((key) => !['topLevelSite', 'hasCrossSiteAncestor'].includes(key))) throw new IdentityError('unsupported_cookie');
		cookie.partitionKey = { topLevelSite: origin(value.partitionKey.topLevelSite), hasCrossSiteAncestor: value.partitionKey.hasCrossSiteAncestor };
	}
	return !session && cookie.expires! <= now / 1000 ? 'expired' : cookie;
}
export function identityCookieKey(cookie: IdentityCookie): string { return JSON.stringify([cookie.domain, cookie.hostOnly, cookie.path, cookie.name, cookie.partitionKey?.topLevelSite ?? '', cookie.partitionKey?.hasCrossSiteAncestor ?? null]); }
function netscape(text: string): unknown[] {
	return text.split(/\r?\n/).flatMap((line) => {
		if (!line.trim() || line.startsWith('#') && !line.startsWith('#HttpOnly_')) return [];
		const httpOnly = line.startsWith('#HttpOnly_'); if (httpOnly) line = line.slice(10);
		const fields = line.split('\t');
		if (fields.length !== 7 || !['TRUE', 'FALSE'].includes(fields[1]!) || !['TRUE', 'FALSE'].includes(fields[3]!)) throw new IdentityError('invalid_format');
		const domain = fields[0]!;
		return [{ domain: fields[1] === 'TRUE' && !domain.startsWith('.') ? `.${domain}` : domain, hostOnly: fields[1] === 'FALSE', path: fields[2], secure: fields[3] === 'TRUE', expires: Number(fields[4]), name: fields[5], value: fields[6], httpOnly }];
	});
}
function origins(raw: unknown): IdentityOrigin[] {
	if (raw === undefined) return [];
	if (!Array.isArray(raw) || raw.length > 128) throw new IdentityError('unsupported_storage');
	const seen = new Set<string>();
	return raw.map((item: unknown) => {
		if (!object(item) || !Array.isArray(item.localStorage) || item.localStorage.length > 10000 || Object.keys(item).some((key) => !['origin', 'localStorage'].includes(key))) throw new IdentityError('unsupported_storage');
		const site = origin(item.origin); if (seen.has(site)) throw new IdentityError('unsupported_storage'); seen.add(site);
		const names = new Set<string>();
		return { origin: site, localStorage: item.localStorage.map((entry: unknown) => {
			if (!object(entry) || typeof entry.name !== 'string' || typeof entry.value !== 'string' || names.has(entry.name)) throw new IdentityError('unsupported_storage');
			names.add(entry.name); return { name: entry.name, value: entry.value };
		}) };
	});
}
export function planIdentityImport(text: string, now: number): IdentityImportPlan {
	if (new TextEncoder().encode(text).length > MAX_IDENTITY_BYTES) throw new IdentityError('too_large');
	let raw: unknown;
	try { raw = /^[\s]*[\[{]/.test(text) ? JSON.parse(text) : netscape(text); } catch { throw new IdentityError('invalid_format'); }
	const records = Array.isArray(raw) ? raw : object(raw) ? raw.cookies : undefined;
	if (!Array.isArray(records) || records.length > 50000 || object(raw) && raw.format !== undefined && (raw.format !== 'huhu-browser-identity' || raw.version !== 1)) throw new IdentityError('invalid_format');
	const plan: IdentityImportPlan = { seed: { format: 'huhu-browser-identity', version: 1, cookies: [], origins: [] }, counts: { accepted: 0, expired: 0, duplicate: 0, invalid: 0, unsupported: 0 }, issues: [] };
	const seen = new Map<string, IdentityCookie>();
	for (let index = 0; index < records.length; index++) {
		try {
			const cookie = normalizeIdentityCookie(records[index], now);
			if (cookie === 'expired') { plan.counts.expired++; continue; }
			const key = identityCookieKey(cookie), previous = seen.get(key);
			if (previous) { if (JSON.stringify(previous) !== JSON.stringify(cookie)) throw new IdentityError('conflicting_cookie'); plan.counts.duplicate++; continue; }
			seen.set(key, cookie); plan.seed.cookies.push(cookie); plan.counts.accepted++;
		} catch (error) {
			const code = error instanceof IdentityError && error.code === 'conflicting_cookie' ? 'conflicting_cookie' : error instanceof IdentityError && ['unsupported_cookie', 'unsupported_storage'].includes(error.code) ? 'unsupported_cookie' : 'invalid_cookie';
			if (code === 'unsupported_cookie') plan.counts.unsupported++; else plan.counts.invalid++;
			plan.issues.push({ index, code });
		}
	}
	try { if (object(raw) && ['sessionStorage', 'indexedDB', 'storageKey', 'storageKeys'].some((key) => Object.prototype.hasOwnProperty.call(raw, key))) throw new IdentityError('unsupported_storage'); plan.seed.origins = origins(object(raw) ? raw.origins : undefined); }
	catch { plan.counts.unsupported++; plan.issues.push({ index: -1, code: 'unsupported_storage' }); }
	return plan;
}
export function requireStrictIdentityPlan(plan: IdentityImportPlan): IdentitySeedV1 { if (plan.issues.length) throw new IdentityError(plan.issues[0]!.code); return plan.seed; }
export function cloneIdentitySeed(seed: IdentitySeedV1): IdentitySeedV1 { return { ...seed, cookies: seed.cookies.map((cookie) => ({ ...cookie, ...(cookie.partitionKey ? { partitionKey: { ...cookie.partitionKey } } : {}) })), origins: seed.origins.map((item) => ({ origin: item.origin, localStorage: item.localStorage.map((entry) => ({ ...entry })) })) }; }
export function clearIdentitySeed(seed: IdentitySeedV1): void { for (const cookie of seed.cookies) cookie.value = ''; for (const item of seed.origins) for (const entry of item.localStorage) entry.value = ''; }
function equalCookie(a: IdentityCookie, b: IdentityCookie): boolean {
	return a.name === b.name && a.value === b.value && a.domain === b.domain && a.hostOnly === b.hostOnly && a.path === b.path && a.secure === b.secure && a.httpOnly === b.httpOnly && a.sameSite === b.sameSite && a.session === b.session && (a.session || Math.abs(a.expires! - b.expires!) <= 0.001) &&
		(a.priority === undefined || a.priority === b.priority) && (a.sourceScheme === undefined || a.sourceScheme === b.sourceScheme) && (a.sourcePort === undefined || a.sourcePort === b.sourcePort) && JSON.stringify(a.partitionKey) === JSON.stringify(b.partitionKey);
}
export function verifyIdentityCookies(expected: readonly IdentityCookie[], actual: readonly IdentityCookie[], now: number): { verified: number; naturallyExpired: number } {
	const remaining = new Map(actual.map((cookie) => [identityCookieKey(cookie), cookie])); if (remaining.size !== actual.length) throw new IdentityError('verification_failed');
	let verified = 0, naturallyExpired = 0;
	for (const cookie of expected) {
		const key = identityCookieKey(cookie), found = remaining.get(key);
		if (!cookie.session && cookie.expires! <= now / 1000) { if (found && !equalCookie(cookie, found)) throw new IdentityError('verification_failed'); naturallyExpired++; }
		else { if (!found || !equalCookie(cookie, found)) throw new IdentityError('verification_failed'); verified++; }
		remaining.delete(key);
	}
	if (remaining.size) throw new IdentityError('verification_failed'); return { verified, naturallyExpired };
}
export function identityCookiesFromCdp(cookies: readonly unknown[], now = Date.now()): IdentityCookie[] {
	return cookies.flatMap((cookie) => { const normalized = normalizeIdentityCookie(cookie, now); return normalized === 'expired' ? [] : [normalized]; });
}
export function identityCookieToCdp(cookie: IdentityCookie): Record<string, unknown> {
	return { name: cookie.name, value: cookie.value, path: cookie.path, secure: cookie.secure, httpOnly: cookie.httpOnly,
		...(cookie.hostOnly ? { url: `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}` } : { domain: cookie.domain }),
		...(cookie.sameSite ? { sameSite: cookie.sameSite } : {}), ...(!cookie.session ? { expires: cookie.expires } : {}),
		...(cookie.priority ? { priority: cookie.priority } : {}), ...(cookie.sourceScheme ? { sourceScheme: cookie.sourceScheme } : {}),
		...(cookie.sourcePort !== undefined ? { sourcePort: cookie.sourcePort } : {}), ...(cookie.partitionKey ? { partitionKey: { ...cookie.partitionKey } } : {}) };
}
export type ContextRef = { kind: 'owned-default'; runtimeInstanceId: string } | { kind: 'isolated'; runtimeInstanceId: string; browserContextId: string };
export interface FreshIdentityTarget {
	readonly context: ContextRef; assertProvisioning(): Promise<void>;
	readCookies(context: ContextRef): Promise<IdentityCookie[]>; writeCookies(context: ContextRef, cookies: readonly IdentityCookie[]): Promise<void>;
	readOrigins?(context: ContextRef, origins: readonly string[]): Promise<IdentityOrigin[]>; writeOrigins?(context: ContextRef, origins: readonly IdentityOrigin[]): Promise<void>;
}
