import type { BrowserRuntime } from '../../../core/contracts';
import { IdentityError, identityCookiesFromCdp, type ContextRef, type FreshIdentityTarget } from '../../../core/identity';

export function createIdentityTarget(runtime: BrowserRuntime, isProvisioning: () => boolean, now: () => number = Date.now): FreshIdentityTarget {
	const context: ContextRef = { kind: 'owned-default', runtimeInstanceId: runtime.id };
	const check = (requested: ContextRef = context) => { if (!isProvisioning()) throw new IdentityError('target_not_empty'); if (requested.kind !== 'owned-default' || requested.runtimeInstanceId !== runtime.id) throw new IdentityError('context_mismatch'); };
	return {
		context, assertProvisioning: async () => { check(); },
		readCookies: async (requested) => { check(requested); const state = await runtime.readIdentity(); check(requested); return identityCookiesFromCdp(state.cookies, now()); },
		writeCookies: async (requested, cookies) => { check(requested); await runtime.writeIdentity({ cookies: cookies.map((cookie) => ({ ...cookie, ...(cookie.partitionKey ? { partitionKey: { ...cookie.partitionKey } } : {}) })) }); check(requested); },
	};
}
