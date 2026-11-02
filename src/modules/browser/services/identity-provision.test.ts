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
	it.each(['domain', 'hostOnly', 'path', 'secure', 'httpOnly', 'sameSite', 'expires', 'partitionKey'] as const)('checks source %s semantics independently even if staging and target both lose the same field', async field => {
		const input = options(), expected: IdentityCookie = { ...seed.cookies[0]!, path: '/account', sameSite: 'Strict', session: false, expires: 2000000000, partitionKey: { topLevelSite: 'https://top.example', hasCrossSiteAncestor: true } };
		input.seed = { ...seed, cookies: [expected] };
		const damaged = (id: string): FreshIdentityTarget => {
			let rows: IdentityCookie[] = [];
			return { context: { kind: 'owned-default', runtimeInstanceId: id }, assertProvisioning: async () => undefined, readCookies: async () => structuredClone(rows), writeCookies: async (_context, cookies) => {
				rows = structuredClone([...cookies]); const first = rows[0]!;
				if (field === 'domain') first.domain = '.example.com'; else if (field === 'hostOnly') first.hostOnly = false; else if (field === 'path') first.path = '/'; else if (field === 'secure') first.secure = false; else if (field === 'httpOnly') first.httpOnly = false; else if (field === 'sameSite') first.sameSite = 'Lax'; else if (field === 'expires') first.expires!--; else delete first.partitionKey;
			} };
		};
		input.staging = damaged('stage'); input.target = damaged('target');
		await expect(provisionIdentity(input)).rejects.toMatchObject({ code: 'verification_failed' }); expect(input.publish).not.toHaveBeenCalled(); expect(input.quarantineTarget).toHaveBeenCalledOnce(); expect(input.cleanupStaging).toHaveBeenCalled();
	});
	it.each(['staging-empty', 'staging-write', 'staging-read', 'target-empty', 'target-write', 'target-read', 'cleanup'] as const)('cancellation after %s cannot publish a new target', async phase => {
		const input = options(); let cancelled = false;
		for (const which of ['staging', 'target'] as const) {
			const original = input[which], prefix = which === 'staging' ? 'staging' : 'target'; let reads = 0;
			input[which] = { ...original, readCookies: async context => { const result = await original.readCookies(context); if (`${prefix}-${++reads === 1 ? 'empty' : 'read'}` === phase) cancelled = true; return result; }, writeCookies: async (context, cookies) => { await original.writeCookies(context, cookies); if (`${prefix}-write` === phase) cancelled = true; } };
		}
		input.cleanupStaging.mockImplementation(async () => { if (phase === 'cleanup') cancelled = true; });
		await expect(provisionIdentity({ ...input, isCancelled: () => cancelled })).rejects.toMatchObject({ code: 'cancelled' }); expect(input.publish).not.toHaveBeenCalled(); expect(input.quarantineTarget).toHaveBeenCalledOnce(); expect(input.cleanupStaging).toHaveBeenCalled();
	});
	it('returns committed publication after late cancellation and detects context changes during the final readback', async () => {
		const committed = options(); let cancelled = false; committed.publish.mockImplementation(async () => { cancelled = true; });
		expect(await provisionIdentity({ ...committed, isCancelled: () => cancelled })).toMatchObject({ importedCount: 1 }); expect(committed.quarantineTarget).not.toHaveBeenCalled();
		const drift = options(), original = drift.target.readCookies; let reads = 0;
		drift.target.readCookies = async context => { const rows = await original(context); if (++reads === 2) drift.target.context.runtimeInstanceId = 'other-runtime'; return rows; };
		await expect(provisionIdentity(drift)).rejects.toMatchObject({ code: 'context_mismatch' }); expect(drift.publish).not.toHaveBeenCalled();
	});
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
