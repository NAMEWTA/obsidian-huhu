import { IdentityError, hasIdentityControls, identityIdValid, planIdentityImport, requireStrictIdentityPlan, cloneIdentitySeed, clearIdentitySeed, type CredentialStorePort, type IdentityImportPlan, type IdentityImportPreview, type IdentitySeedV1, type IdentitySourceKind, type IdentityVersion, type IdentityVersionSummary } from '../core/identity';

export interface SecretUsePermit { id: string; versionId: string; spaceId: string; expiresAt: number }
export type PreparedIdentitySummary = IdentityImportPreview;
const summary = (version: IdentityVersion, persistent: boolean): IdentityVersionSummary => ({ id: version.id, identityId: version.identityId, label: version.label, source: version.source, createdAt: version.createdAt, cookieCount: version.seed.cookies.length, originCount: version.seed.origins.length, persistent });

/** Only trusted human composition can issue these source/secret permissions. */
export class IdentityService {
	private readonly prepared = new Map<string, { plan: IdentityImportPlan; label: string; source: IdentitySourceKind; expiresAt: number }>();
	private readonly ephemeral = new Map<string, IdentityVersion>();
	private readonly permits = new Map<string, SecretUsePermit>();
	private generation = 0;
	private locked = false;
	constructor(private readonly credentials: CredentialStorePort, private readonly clock: () => number, private readonly id: () => string) {}
	private active(generation = this.generation): void { if (this.locked || this.generation !== generation) throw new IdentityError('identity_locked'); }
	prepareText(label: string, text: string, source: IdentitySourceKind = 'cookie-file'): IdentityImportPreview {
		this.active(); this.sweep();
		if (!label.trim() || label.length > 256 || hasIdentityControls(label)) throw new IdentityError('invalid_format');
		if (this.prepared.size >= 8) throw new IdentityError('too_large');
		const planId = this.id(), plan = planIdentityImport(text, this.clock()), domains = new Map<string, number>();
		for (const cookie of plan.seed.cookies) domains.set(cookie.domain, (domains.get(cookie.domain) ?? 0) + 1);
		this.prepared.set(planId, { plan, label: label.trim(), source, expiresAt: this.clock() + 300000 });
		return { planId, counts: { ...plan.counts }, originCount: plan.seed.origins.length, issues: plan.issues.map((issue) => ({ ...issue })), domains: [...domains].map(([domain, count]) => ({ domain, count })).sort((a, b) => a.domain.localeCompare(b.domain)) };
	}
	discardPlan(planId: string): void { const item = this.prepared.get(planId); if (item) clearIdentitySeed(item.plan.seed); this.prepared.delete(planId); }
	async savePrepared(planId: string, storage: 'persistent' | 'ephemeral' = 'persistent', domains?: readonly string[]): Promise<IdentityVersionSummary> {
		this.active(); this.sweep();
		const item = this.prepared.get(planId); if (!item) throw new IdentityError('source_grant_invalid');
		const validated = requireStrictIdentityPlan(item.plan); let selected: Set<string> | undefined;
		if (domains !== undefined) {
			const available = new Set(validated.cookies.map((cookie) => cookie.domain));
			if (!Array.isArray(domains) || !domains.length || domains.length > available.size || new Set(domains).size !== domains.length || domains.some((domain: unknown) => typeof domain !== 'string' || !available.has(domain))) throw new IdentityError('source_grant_invalid');
			selected = new Set(domains);
		}
		const seed = cloneIdentitySeed({ ...validated, cookies: selected ? validated.cookies.filter((cookie) => selected.has(cookie.domain)) : validated.cookies });
		if (storage === 'ephemeral') {
			const bytes = (value: IdentitySeedV1) => new TextEncoder().encode(JSON.stringify(value)).length;
			if (this.ephemeral.size >= 64 || [...this.ephemeral.values()].reduce((total, version) => total + bytes(version.seed), bytes(seed)) > 64 * 1024 * 1024) { clearIdentitySeed(seed); throw new IdentityError('too_large'); }
		}
		const version: IdentityVersion = { id: this.id(), identityId: this.id(), label: item.label, createdAt: this.clock(), source: item.source, seed };
		const generation = this.generation; this.prepared.delete(planId);
		try { if (storage === 'persistent') await this.credentials.create(version); }
		catch (error) { clearIdentitySeed(seed); if (!this.locked && generation === this.generation && item.expiresAt > this.clock()) this.prepared.set(planId, item); else clearIdentitySeed(item.plan.seed); throw error; }
		clearIdentitySeed(item.plan.seed);
		try { this.active(generation); } catch (error) { clearIdentitySeed(seed); throw error; }
		if (storage === 'ephemeral') this.ephemeral.set(version.id, version);
		const result = summary(version, storage === 'persistent'); if (storage === 'persistent') clearIdentitySeed(seed); return result;
	}
	async list(): Promise<IdentityVersionSummary[]> {
		this.active(); const generation = this.generation, result = [...this.ephemeral.values()].map((version) => summary(version, false));
		if ((await this.credentials.availability()) === 'available') {
			const ids = await this.credentials.listIds(); this.active(generation);
			for (const id of ids) { const version = await this.credentials.read(id); this.active(generation); result.push(summary(version, true)); clearIdentitySeed(version.seed); }
		}
		this.active(generation); return result.sort((a, b) => b.createdAt - a.createdAt);
	}
	issueUsePermit(versionId: string, spaceId: string): SecretUsePermit {
		this.active(); this.sweep(); if (!identityIdValid(versionId) || !identityIdValid(spaceId) || this.permits.size >= 128) throw new IdentityError('secret_permit_invalid');
		const permit = { id: this.id(), versionId, spaceId, expiresAt: this.clock() + 60000 }; this.permits.set(permit.id, permit); return { ...permit };
	}
	async consumeSeed(permitId: string, spaceId: string): Promise<IdentitySeedV1> {
		this.active(); this.sweep(); const permit = this.permits.get(permitId);
		if (!permit || permit.spaceId !== spaceId) throw new IdentityError('secret_permit_invalid'); this.permits.delete(permitId);
		const generation = this.generation, memory = this.ephemeral.get(permit.versionId), version = memory ?? await this.credentials.read(permit.versionId);
		this.active(generation); const seed = cloneIdentitySeed(version.seed); if (!memory) clearIdentitySeed(version.seed); return seed;
	}
	async remove(id: string): Promise<void> {
		this.active(); for (const [key, permit] of this.permits) if (permit.versionId === id) this.permits.delete(key);
		const memory = this.ephemeral.get(id); if (memory) { clearIdentitySeed(memory.seed); this.ephemeral.delete(id); } else await this.credentials.remove(id);
	}
	lock(): void { this.generation++; this.locked = true; for (const id of this.prepared.keys()) this.discardPlan(id); for (const value of this.ephemeral.values()) clearIdentitySeed(value.seed); this.ephemeral.clear(); this.permits.clear(); this.credentials.lock(); }
	unlock(): void { this.generation++; this.locked = false; this.credentials.unlock(); }
	dispose(): void { this.lock(); }
	private sweep(): void { const now = this.clock(); for (const [id, item] of this.prepared) if (item.expiresAt <= now) this.discardPlan(id); for (const [id, permit] of this.permits) if (permit.expiresAt <= now) this.permits.delete(id); }
}
