import { describe, expect, it, vi } from 'vitest';
import { provisionIdentity } from './identity-provision';
import type { FreshIdentityTarget, IdentityCookie, IdentitySeedV1 } from '../core/identity';

const seed: IdentitySeedV1 = { format: 'huhu-browser-identity', version: 1, origins: [], cookies: [{ name: 'sid', value: 'secret', domain: 'example.com', hostOnly: true, path: '/', secure: true, httpOnly: true, session: true }] };
function target(id: string, corrupt = false): FreshIdentityTarget {
	let cookies: IdentityCookie[] = [];
	return { context: { kind: 'owned-default', runtimeInstanceId: id }, assertProvisioning: vi.fn(async () => undefined), readCookies: async () => structuredClone(cookies), writeCookies: async (_context, input) => { cookies = structuredClone([...input]); if (corrupt) cookies[0]!.httpOnly = false; } };
}
function options() { return { seed, staging: target('staging'), target: target('fresh'), now: () => 1000, publish: vi.fn(async () => undefined), cleanupStaging: vi.fn(async () => undefined), quarantineTarget: vi.fn(async () => undefined), recordCleanupFailure: vi.fn(async () => undefined) }; }
describe('verified fresh target provisioning', () => {
	it('verifies staging and final profile, cleans staging before publishing, and keeps the original immutable', async () => {
		const input = options(); const order: string[] = []; input.cleanupStaging.mockImplementation(async () => { order.push('cleanup'); }); input.publish.mockImplementation(async () => { order.push('publish'); });
		expect(await provisionIdentity(input)).toEqual({ importedCount: 1, naturallyExpired: 0, originCount: 0, loginStatus: 'not-verified' });
		expect(order).toEqual(['cleanup', 'publish']); expect(seed.cookies[0]?.value).toBe('secret'); expect(input.quarantineTarget).not.toHaveBeenCalled();
	});
	it.each(['staging', 'target'] as const)('a %s readback mismatch prevents ready and quarantines the target', async (which) => {
		const input = options(); input[which] = target(which, true); await expect(provisionIdentity(input)).rejects.toMatchObject({ code: 'verification_failed' });
		expect(input.publish).not.toHaveBeenCalled(); expect(input.quarantineTarget).toHaveBeenCalledOnce(); expect(input.cleanupStaging).toHaveBeenCalled();
	});
	it('refuses nonempty/shared contexts and unsupported storage before publishing', async () => {
		const shared = options(); shared.target = shared.staging; await expect(provisionIdentity(shared)).rejects.toMatchObject({ code: 'context_mismatch' });
		const nonempty = options(); await nonempty.target.writeCookies(nonempty.target.context, seed.cookies); await expect(provisionIdentity(nonempty)).rejects.toMatchObject({ code: 'target_not_empty' });
		const storage = options(); storage.seed = { ...seed, origins: [{ origin: 'https://example.com', localStorage: [{ name: 'auth', value: 'x' }] }] }; await expect(provisionIdentity(storage)).rejects.toMatchObject({ code: 'unsupported_storage' });
	});
	it('cleanup failure creates retry ownership and cannot publish; cancellation cannot publish either', async () => {
		const input = options(); input.cleanupStaging.mockRejectedValue(new Error('locked')); await expect(provisionIdentity(input)).rejects.toMatchObject({ code: 'cleanup_pending' });
		expect(input.recordCleanupFailure).toHaveBeenCalledWith('staging'); expect(input.publish).not.toHaveBeenCalled();
		const cancelled = options(); await expect(provisionIdentity({ ...cancelled, isCancelled: () => true })).rejects.toMatchObject({ code: 'cancelled' }); expect(cancelled.publish).not.toHaveBeenCalled();
	});
	it('a failed cleanup journal cannot skip the other owned cleanup', async () => {
		const input = options(); input.target = target('corrupt', true); input.quarantineTarget.mockRejectedValue(new Error('native alive')); input.recordCleanupFailure.mockRejectedValue(new Error('journal locked'));
		await expect(provisionIdentity(input)).rejects.toMatchObject({ code: 'cleanup_pending' }); expect(input.cleanupStaging).toHaveBeenCalled(); expect(input.publish).not.toHaveBeenCalled();
	});
});
