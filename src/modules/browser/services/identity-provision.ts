import { IdentityError, cloneIdentitySeed, clearIdentitySeed, verifyIdentityCookies, type ContextRef, type FreshIdentityTarget, type IdentityOrigin, type IdentitySeedV1 } from '../core/identity';
export interface IdentityProvisionResult { importedCount: number; naturallyExpired: number; originCount: number; loginStatus: 'not-verified' }
const sameContext = (a: ContextRef, b: ContextRef) => a.runtimeInstanceId === b.runtimeInstanceId && (a.kind === 'owned-default' && b.kind === 'owned-default' || a.kind === 'isolated' && b.kind === 'isolated' && a.browserContextId === b.browserContextId);
const canonicalOrigins = (origins: readonly IdentityOrigin[]) => JSON.stringify(origins.map((item) => ({ origin: item.origin, localStorage: [...item.localStorage].sort((a, b) => a.name.localeCompare(b.name)) })).sort((a, b) => a.origin.localeCompare(b.origin)));
export async function provisionIdentity(options: {
	seed: IdentitySeedV1; staging: FreshIdentityTarget; target: FreshIdentityTarget; now: () => number; isCancelled?: () => boolean;
	publish(result: IdentityProvisionResult): Promise<void>; cleanupStaging(): Promise<void>; quarantineTarget(): Promise<void>;
	recordCleanupFailure(resource: 'staging' | 'target'): Promise<void>;
}): Promise<IdentityProvisionResult> {
	const source = cloneIdentitySeed(options.seed); let published = false, cleaned = false;
	const check = () => { if (options.isCancelled?.()) throw new IdentityError('cancelled'); };
	const write = async (target: FreshIdentityTarget) => {
		check(); await target.assertProvisioning(); check(); const context = { ...target.context };
		if ((await target.readCookies(context)).length) throw new IdentityError('target_not_empty'); check();
		if (source.origins.length) {
			if (!target.readOrigins || !target.writeOrigins) throw new IdentityError('unsupported_storage');
			if ((await target.readOrigins(context, source.origins.map((item) => item.origin))).some((item) => item.localStorage.length)) throw new IdentityError('target_not_empty'); check();
		}
		await target.writeCookies(context, source.cookies); check();
		if (source.origins.length) { await target.writeOrigins!(context, source.origins); check(); }
		await target.assertProvisioning(); check(); if (!sameContext(context, target.context)) throw new IdentityError('context_mismatch');
		const actual = await target.readCookies(context); check(); const verified = verifyIdentityCookies(source.cookies, actual, options.now());
		if (source.origins.length) { const actualOrigins = await target.readOrigins!(context, source.origins.map((item) => item.origin)); check(); if (canonicalOrigins(actualOrigins) !== canonicalOrigins(source.origins)) throw new IdentityError('verification_failed'); }
		return verified;
	};
	try {
		if (sameContext(options.staging.context, options.target.context)) throw new IdentityError('context_mismatch');
		await write(options.staging); check(); const result = await write(options.target); check();
		try { await options.cleanupStaging(); cleaned = true; } catch { await options.recordCleanupFailure('staging'); throw new IdentityError('cleanup_pending'); }
		check(); const outcome: IdentityProvisionResult = { importedCount: result.verified, naturallyExpired: result.naturallyExpired, originCount: source.origins.length, loginStatus: 'not-verified' };
		await options.publish(outcome); published = true; return outcome;
	} finally {
		if (!published) try { await options.quarantineTarget(); } catch { await options.recordCleanupFailure('target'); }
		if (!cleaned) try { await options.cleanupStaging(); } catch { await options.recordCleanupFailure('staging'); }
		clearIdentitySeed(source);
	}
}
