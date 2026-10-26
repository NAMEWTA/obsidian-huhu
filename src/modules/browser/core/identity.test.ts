import { describe, expect, it } from 'vitest';
import { identityCookieToCdp, normalizeIdentityCookie, planIdentityImport, requireStrictIdentityPlan, verifyIdentityCookies, type IdentityCookie } from './identity';

const cookie = (changes: Partial<IdentityCookie> = {}): IdentityCookie => ({ name: 'session', value: 'secret', domain: 'example.com', hostOnly: true, path: '/', secure: true, httpOnly: true, session: true, ...changes });
describe('identity data semantics', () => {
	it('preserves host-only/domain, HttpOnly, SameSite, session, source metadata and full CHIPS keys', () => {
		const original = cookie({ domain: '.example.com', hostOnly: false, session: false, expires: 2000000000.125, sameSite: 'None', priority: 'High', sourcePort: 443, sourceScheme: 'Secure', partitionKey: { topLevelSite: 'https://portal.example', hasCrossSiteAncestor: true } });
		expect(normalizeIdentityCookie(original, 1000)).toEqual(original);
		expect(identityCookieToCdp(cookie())).toMatchObject({ url: 'https://example.com/', name: 'session', httpOnly: true });
		expect(identityCookieToCdp(cookie())).not.toHaveProperty('domain'); expect(identityCookieToCdp(cookie())).not.toHaveProperty('expires');
		expect(identityCookieToCdp(original)).toMatchObject({ domain: '.example.com', expires: 2000000000.125, partitionKey: original.partitionKey });
	});
	it('counts expiry and identical duplicates while conflicting, invalid and unsupported records block the entire plan', () => {
		const plan = planIdentityImport(JSON.stringify([cookie(), cookie(), cookie({ value: 'other' }), cookie({ name: '__Host-x', domain: '.example.com', hostOnly: false }), cookie({ session: false, expires: 1 }), { ...cookie({ name: 'container' }), originAttributes: '^userContextId=3' }]), 2000);
		expect(plan.counts).toEqual({ accepted: 1, duplicate: 1, invalid: 2, expired: 1, unsupported: 1 });
		expect(() => requireStrictIdentityPlan(plan)).toThrow('conflicting_cookie');
	});
	it('rejects semantic attributes it cannot represent and malformed prefix cookies', () => {
		for (const change of [{ partitionKeyOpaque: true }, { sameParty: true }, { storeId: {} }, { name: '__Secure-x', secure: false }, { sameSite: 'None', secure: false }, { session: true, expires: 2 }, { partitionKey: { topLevelSite: 'https://site.example' } }]) {
			expect(() => normalizeIdentityCookie({ ...cookie(), ...change }, 0)).toThrow();
		}
		expect(planIdentityImport(JSON.stringify({ cookies: [cookie()], indexedDB: [] }), 0).issues).toEqual([{ index: -1, code: 'unsupported_storage' }]);
	});
	it('requires a full target set and exact scope, value and partition semantics, allowing only natural expiry', () => {
		const expected = cookie({ partitionKey: { topLevelSite: 'https://top.example', hasCrossSiteAncestor: false } });
		for (const actual of [[], [expected, cookie({ name: 'extra' })], [cookie({ ...expected, httpOnly: false })], [cookie({ ...expected, partitionKey: { ...expected.partitionKey!, hasCrossSiteAncestor: true } })]]) {
			expect(() => verifyIdentityCookies([expected], actual, 1000)).toThrow('verification_failed');
		}
		expect(verifyIdentityCookies([expected, cookie({ name: 'expired', session: false, expires: 0.5 })], [expected], 1000)).toEqual({ verified: 1, naturallyExpired: 1 });
	});
	it('supports Netscape HttpOnly/domain/session exports without guessing missing columns', () => {
		const plan = planIdentityImport('#HttpOnly_.example.com\tTRUE\t/\tTRUE\t0\tsid\tvalue', 0);
		expect(plan.seed.cookies).toEqual([cookie({ name: 'sid', value: 'value', domain: '.example.com', hostOnly: false })]);
		expect(() => planIdentityImport('example.com\tFALSE\t/', 0)).toThrow('invalid_format');
	});
});
