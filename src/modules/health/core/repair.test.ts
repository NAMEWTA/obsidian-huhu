import { expect, test } from 'vitest';
import { serviceKey } from '../../../app/contracts/module';
import type { HealthRepairOwner, HealthRepairReceipt, HealthReport } from '../api';
import { HealthRepairService } from './repair';
const key = serviceKey<HealthRepairOwner>('archives', 'repairs');
const report: HealthReport = { id: 'report', startedAt: 1, finishedAt: 2, status: 'error', stale: false, complete: true, sections: [{ providerId: 'archives.belongings', scope: 'belongings', status: 'error', complete: true, checked: 2, excluded: 0, issues: ['a', 'b'].map(reference => ({ code: 'projection-mismatch', severity: 'error', count: 1, reference })) }] };
function fixture() {
	let commits = 0, now = 10;
	const revoked = new AbortController(), notifications: unknown[] = [];
	const owner: HealthRepairOwner = {
		preview: async selection => ({ id: selection.reference!, kind: selection.kind, expectedHash: 'a'.repeat(64), affected: 1 }),
		commit: async input => { commits++; return { operationId: input.operationId, kind: 'belonging-projection', committed: input.proposalId === 'a', rechecked: input.proposalId === 'a', status: input.proposalId === 'a' ? 'verified' : 'conflict', recoveryId: 'recovery' }; },
		recover: async () => ({ operationId: 'recovery', kind: 'belonging-projection', committed: true, rechecked: true, status: 'rolled-back' }),
	};
	const service = new HealthRepairService({ providers: async () => [{ providerId: 'archives.belongings', service: key }], acquire: async () => ({ value: owner, revoked: revoked.signal }), report: () => report, now: () => now, id: () => crypto.randomUUID(), notify: async result => { notifications.push(result); } });
	return { service, revoked, owner, notifications, commits: () => commits, expire: () => { now += 300001; } };
}
test('planning and preview never commit; explicit confirmation is single-use and retains partial receipts', async () => {
	const f = fixture();
	const plan = await f.service.plan('report', ['a', 'b'].map(reference => ({ providerId: 'archives.belongings', kind: 'belonging-projection', reference })));
	expect(f.commits()).toBe(0);
	await expect(f.service.confirm({ planId: plan.id, confirmation: 'forged' })).rejects.toThrow('health-confirmation-required');
	const preview = f.service.preview(plan.id);
	expect(f.commits()).toBe(0);
	const result = await f.service.confirm({ planId: plan.id, confirmation: preview.confirmation });
	expect(result.status).toBe('partial'); expect(result.items.map((item: HealthRepairReceipt) => item.committed)).toEqual([true, false]);
	expect(result.items[1]?.recoveryId).toBe('recovery'); expect(f.notifications).toHaveLength(1);
	await expect(f.service.confirm({ planId: plan.id, confirmation: preview.confirmation })).rejects.toThrow();
});
test('unknown references, prohibited repairs, expiry, revocation and cancellation never commit', async () => {
	const f = fixture();
	await expect(f.service.plan('report', [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'secret-path' }])).rejects.toThrow();
	const plan = await f.service.plan('report', [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'a' }]);
	f.expire(); expect(() => f.service.preview(plan.id)).toThrow();
	const g = fixture(), p = await g.service.plan('report', [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'a' }]);
	const preview = g.service.preview(p.id); g.revoked.abort();
	expect((await g.service.confirm({ planId: p.id, confirmation: preview.confirmation })).items[0]?.committed).toBe(false);
	expect(g.commits()).toBe(0);
	const h = fixture(), p2 = await h.service.plan('report', [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'a' }]);
	const pre2 = h.service.preview(p2.id), abort = new AbortController(); abort.abort();
	expect((await h.service.confirm({ planId: p2.id, confirmation: pre2.confirmation }, abort.signal)).status).toBe('cancelled'); expect(h.commits()).toBe(0);
});


test('extra owner payloads are redacted from plans, receipts and retained results', async () => {
	const f = fixture();
	f.owner.preview = async selection => ({ id: 'a', kind: selection.kind, expectedHash: 'a'.repeat(64), affected: 1, privateSource: 'PRIVATE-SOURCE' });
	f.owner.commit = async input => ({ operationId: input.operationId, kind: 'belonging-projection', committed: true, rechecked: true, status: 'verified', raw: 'PRIVATE-RAW' });
	const plan = await f.service.plan('report', [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'a' }]);
	const result = await f.service.confirm({ planId: plan.id, confirmation: f.service.preview(plan.id).confirmation });
	expect(result.status).toBe('verified'); expect(JSON.stringify([plan, result, f.service.results])).not.toContain('PRIVATE');
});
