import { describe, expect, it, vi } from 'vitest';
import { IdentityService } from './identity-service';
import type { CredentialStorePort, IdentityCookie, IdentityVersion } from '../core/identity';

const cookie = (domain: string, name = 'credential-secret-name'): IdentityCookie => ({ domain, name, value: 'credential-secret-value', hostOnly: !domain.startsWith('.'), path: '/', secure: true, httpOnly: true, session: true });
function setup() {
	let serial = 0, at = 1000; const stored = new Map<string, IdentityVersion>();
	const credentials: CredentialStorePort = { availability: async () => 'available', create: vi.fn(async (version) => { stored.set(version.id, structuredClone(version)); }), listIds: async () => [...stored.keys()], read: async (id) => structuredClone(stored.get(id)!), remove: async (id) => { stored.delete(id); }, lock: vi.fn(), unlock: vi.fn() };
	return { service: new IdentityService(credentials, () => at, () => `id-${++serial}`), credentials, stored, advance: () => { at += 300001; } };
}
describe('identity preflight and immutable seeds', () => {
	it('shows safe counts and exact domain choices, then commits only an explicitly selected validated domain', async () => {
		const { service, stored } = setup(); const preview = service.prepareText('Personal', JSON.stringify([cookie('example.com'), cookie('.example.com'), cookie('other.example')]));
		expect(JSON.stringify(preview)).not.toContain('credential-secret'); expect(preview.domains).toHaveLength(3);
		const saved = await service.savePrepared(preview.planId, 'persistent', ['.example.com']);
		expect(saved).toMatchObject({ label: 'Personal', cookieCount: 1, persistent: true });
		expect(stored.get(saved.id)?.seed.cookies).toEqual([cookie('.example.com')]); expect(await service.list()).toEqual([saved]);
	});
	it('never uses selection to hide an invalid record and rejects empty, duplicate or unrecognized selections', async () => {
		const { service, credentials } = setup();
		const invalid = service.prepareText('Broken', JSON.stringify([cookie('example.com'), { ...cookie('bad.example'), sameParty: true }]));
		await expect(service.savePrepared(invalid.planId, 'persistent', ['example.com'])).rejects.toMatchObject({ code: 'unsupported_cookie' });
		const good = service.prepareText('Valid', JSON.stringify([cookie('example.com')]));
		for (const domains of [[], ['unknown.example'], ['example.com', 'example.com']]) await expect(service.savePrepared(good.planId, 'persistent', domains)).rejects.toMatchObject({ code: 'source_grant_invalid' });
		expect(credentials.create).not.toHaveBeenCalled();
	});
	it('ephemeral seeds survive clearing the prepared plan, remain immutable, and consume a Space-bound permit once', async () => {
		const { service, credentials } = setup(); const preview = service.prepareText('Memory', JSON.stringify([cookie('example.com')]));
		const saved = await service.savePrepared(preview.planId, 'ephemeral'); service.discardPlan(preview.planId);
		const permit = service.issueUsePermit(saved.id, 'space-A');
		await expect(service.consumeSeed(permit.id, 'space-B')).rejects.toMatchObject({ code: 'secret_permit_invalid' });
		const seed = await service.consumeSeed(permit.id, 'space-A'); expect(seed.cookies[0]?.value).toBe('credential-secret-value'); seed.cookies[0]!.value = 'mutated';
		await expect(service.consumeSeed(permit.id, 'space-A')).rejects.toMatchObject({ code: 'secret_permit_invalid' });
		const other = service.issueUsePermit(saved.id, 'space-B'); expect((await service.consumeSeed(other.id, 'space-B')).cookies[0]?.value).toBe('credential-secret-value'); expect(credentials.create).not.toHaveBeenCalled();
	});
	it('expiry and lock invalidate staged values; failed durable commit remains reviewable', async () => {
		const { service, credentials, advance } = setup(); const a = service.prepareText('Retry', JSON.stringify([cookie('example.com')]));
		vi.mocked(credentials.create).mockRejectedValueOnce(new Error('disk failed')); await expect(service.savePrepared(a.planId)).rejects.toThrow('disk failed');
		expect((await service.savePrepared(a.planId)).cookieCount).toBe(1);
		const b = service.prepareText('Expires', '[]'); advance(); await expect(service.savePrepared(b.planId)).rejects.toMatchObject({ code: 'source_grant_invalid' });
		service.lock(); expect(() => service.prepareText('Locked', '[]')).toThrow('identity_locked');
	});
});
