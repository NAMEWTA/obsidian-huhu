import { expect, test } from 'vitest';
import { memoryArchives } from './test-port';
import { ArchivesApplication } from './application';
import { ArchiveRepairService } from './repair';
import { BELONGING_TYPE_ID } from '../../api';
import { patchProperties, frontmatter } from '../../core/generic/markdown';
import { digest } from '../../core/schema/value';

async function fixture() {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	await app.commands.belongings.install();
	const item = await app.commands.create({ operationId: 'repair-item', typeId: BELONGING_TYPE_ID, values: { name: 'PRIVATE-NAME' } });
	const original = f.files.text.get(item.path)!;
	const broken = patchProperties(original, { status: 'idle' }) + '\nPRIVATE-BODY\n';
	f.files.external(item.path, broken); await f.runtime.flushEvents();
	const hash = await digest(broken);
	const owner = new ArchiveRepairService(f.runtime, ref => ref === 'opaque' ? { path: item.path, id: item.id, expectedHash: hash } : undefined);
	return { ...f, app, item, broken, hash, owner };
}
test('preview is read-only; dedicated repair preserves source and has durable rollback after restart', async () => {
	const f = await fixture();
	try {
		const writes = f.files.writes.length;
		const proposal = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		expect(f.files.writes.length).toBe(writes);
		expect(JSON.stringify(proposal)).not.toContain('PRIVATE');
		const result = await f.owner.commit({ proposalId: proposal.id, expectedHash: proposal.expectedHash, operationId: 'health-repair-one' });
		expect(result).toMatchObject({ committed: true, rechecked: true, recoveryId: 'health-repair-one' });
		expect((await f.app.query.belongings()).items[0]?.status).toBe('using');
		expect(f.files.text.get(f.item.path)).toContain('PRIVATE-BODY');
		const restarted = new ArchiveRepairService(f.runtime, () => undefined);
		expect(await restarted.recover({ recoveryId: result.recoveryId!, action: 'rollback' })).toMatchObject({ status: 'rolled-back', committed: true });
		expect(f.files.text.get(f.item.path)).toBe(f.broken);
	} finally { f.runtime.dispose(); }
});
test('stale report and commit hashes reject; generic save protections remain', async () => {
	const f = await fixture();
	try {
		const proposal = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.external(f.item.path, f.broken + 'changed'); await f.runtime.flushEvents();
		const writes = f.files.writes.length;
		expect(await f.owner.commit({ proposalId: proposal.id, expectedHash: proposal.expectedHash, operationId: 'stale-repair' })).toMatchObject({ committed: false, status: 'conflict' });
		expect(f.files.writes.length).toBe(writes);
		await expect(f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' })).rejects.toThrow('write-conflict');
		const edit = await f.app.commands.beginEdit(f.item.id); edit.draft.status = 'using'; edit.dirtyFields = ['status'];
		await expect(f.app.commands.save({ operationId: 'generic-bypass', session: edit })).rejects.toThrow();
	} finally { f.runtime.dispose(); }
});

test('owner backs up before mutation, preserves pending transaction and resumes after failure', async () => {
	const f = await fixture();
	try {
		const proposal = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeWrite = path => { if (path === f.item.path) throw new Error('injected-disk-failure'); };
		const receipt = await f.owner.commit({ proposalId: proposal.id, expectedHash: proposal.expectedHash, operationId: 'interrupted-repair' });
		expect(receipt).toMatchObject({ committed: false, rechecked: false, recoveryId: 'interrupted-repair' });
		expect([...f.files.text].some(([path, raw]) => path.includes('/interrupted-repair/') && raw === f.broken)).toBe(true);
		expect(f.files.text.get(f.item.path)).toBe(f.broken);
		f.files.beforeWrite = undefined;
		const restarted = new ArchiveRepairService(f.runtime, () => undefined);
		expect(await restarted.recover({ recoveryId: receipt.recoveryId!, action: 'resume' })).toMatchObject({ committed: true, rechecked: true, status: 'verified' });
		f.files.external(f.item.path, f.files.text.get(f.item.path)! + '\nLater edit\n'); await f.runtime.flushEvents();
		await expect(restarted.recover({ recoveryId: receipt.recoveryId!, action: 'rollback' })).rejects.toThrow('rollback-conflict');
	} finally { f.runtime.dispose(); }
});

test('a failure after atomic owner commit reports committed with a recovery entry', async () => {
	const f = await fixture();
	try {
		const proposal = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeWrite = (path, raw) => { if (path !== f.item.path && (frontmatter(raw).operation as { state?: string } | undefined)?.state === 'committed') throw new Error('journal-finalization-failed'); };
		const result = await f.owner.commit({ proposalId: proposal.id, expectedHash: proposal.expectedHash, operationId: 'post-commit-fault' });
		expect(result).toMatchObject({ committed: true, status: 'failed', rechecked: false, recoveryId: 'post-commit-fault' });
		f.files.beforeWrite = undefined;
		expect(await new ArchiveRepairService(f.runtime, () => undefined).recover({ recoveryId: result.recoveryId!, action: 'resume' })).toMatchObject({ status: 'verified' });
	} finally { f.runtime.dispose(); }
});

test('index rebuild restores derived state without writing any files and rejects a changed manifest', async () => {
	const f = await fixture();
	try {
		const proposal = await f.owner.preview({ providerId: 'archives.integrity', kind: 'rebuild-index' });
		f.runtime.index.delete(f.item.path);
		const before = new Map(f.files.text), writes = f.files.writes.length;
		expect(await f.owner.commit({ proposalId: proposal.id, expectedHash: proposal.expectedHash, operationId: 'rebuild-one' })).toMatchObject({ committed: true, rechecked: true, status: 'verified' });
		expect(f.runtime.index.entity(f.item.id)).toBeDefined();
		expect(f.files.text).toEqual(before); expect(f.files.writes.length).toBe(writes);
		const stale = await f.owner.preview({ providerId: 'archives.integrity', kind: 'rebuild-index' });
		f.files.external(f.item.path, f.broken + 'changed');
		expect(await f.owner.commit({ proposalId: stale.id, expectedHash: stale.expectedHash, operationId: 'rebuild-stale' })).toMatchObject({ committed: false, status: 'conflict' });
	} finally { f.runtime.dispose(); }
});

test('invalid history, stale roots, unsaved editors and cancellation never mutate a source', async () => {
	const f = await fixture();
	try {
		f.files.external(f.item.path, patchProperties(f.broken, { events: [{ rowId: 'bad', values: { status: 'sold' } }] })); await f.runtime.flushEvents();
		const invalid = new ArchiveRepairService(f.runtime, () => ({ path: f.item.path, id: f.item.id, expectedHash: f.runtime.index.entity(f.item.id)?.contentHash }));
		const writes = f.files.writes.length;
		await expect(invalid.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'bad' })).rejects.toThrow();
		f.files.external(f.item.path, f.broken); await f.runtime.flushEvents();
		f.files.unsaved.add(f.item.path);
		await expect(f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' })).rejects.toThrow('unsavedEditor');
		f.files.unsaved.clear();
		const proposal = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		const controller = new AbortController(); controller.abort();
		expect(await f.owner.commit({ proposalId: proposal.id, expectedHash: proposal.expectedHash, operationId: 'cancelled-repair' }, controller.signal)).toMatchObject({ committed: false, status: 'cancelled' });
		expect(f.files.writes.length).toBe(writes);
		const rootPlan = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.config.root = 'OtherArchives';
		expect(await f.owner.commit({ proposalId: rootPlan.id, expectedHash: rootPlan.expectedHash, operationId: 'root-changed' })).toMatchObject({ committed: false });
		expect(f.files.writes.length).toBe(writes);
	} finally { f.runtime.dispose(); }
});

test('nonempty lifecycle history and unrelated Markdown/YAML survive projection repair byte-for-byte', async () => {
	const f = await fixture();
	try {
		f.files.external(f.item.path, patchProperties(f.broken, { status: 'using' })); await f.runtime.flushEvents();
		const edit = await f.app.commands.beginEdit(f.item.id);
		await f.app.commands.belongings.transition({ operationId: 'history-to-preserve', id: f.item.id, expectedHash: edit.baseHash, status: 'sold', date: '2026-01-03', sale: { amount: '50', currency: 'CNY' } });
		const correct = f.files.text.get(f.item.path)!.replace('---\n', '---\ncustom-preserved: "00123"\n');
		const broken = patchProperties(correct, { status: 'idle', exitDate: '', sale: null });
		f.files.external(f.item.path, broken); await f.runtime.flushEvents();
		const owner = new ArchiveRepairService(f.runtime, () => ({ path: f.item.path, id: f.item.id, expectedHash: f.runtime.index.entity(f.item.id)!.contentHash }));
		const plan = await owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		expect(await owner.commit({ proposalId: plan.id, expectedHash: plan.expectedHash, operationId: 'preserve-history-repair' })).toMatchObject({ status: 'verified' });
		expect(f.files.text.get(f.item.path)).toBe(correct);
	} finally { f.runtime.dispose(); }
});

test('commit guards the actual atomic write race and returns a recoverable conflict', async () => {
	const f = await fixture();
	try {
		const plan = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeProcess = path => { if (path === f.item.path) { f.files.beforeProcess = undefined; f.files.external(path, f.broken + 'Concurrent writer'); } };
		const result = await f.owner.commit({ proposalId: plan.id, expectedHash: plan.expectedHash, operationId: 'atomic-race' });
		expect(result).toMatchObject({ committed: false, rechecked: false, recoveryId: 'atomic-race' });
		expect(f.files.text.get(f.item.path)).toBe(f.broken + 'Concurrent writer');
	} finally { f.runtime.dispose(); }
});

test.each(['category', 'body', 'history'])('recovery rejects a tampered %s target, including generic recovery', async field => {
	const f = await fixture();
	try {
		const { decodeOperation, encodeOperation } = await import('../../core/generic/operations');
		const { migrationPath } = await import('../../core/generic/paths');
		const proposal = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeWrite = path => { if (path === f.item.path) throw new Error('interrupted'); };
		const receipt = await f.owner.commit({ proposalId: proposal.id, expectedHash: proposal.expectedHash, operationId: 'tampered-target' });
		f.files.beforeWrite = undefined;
		const path = migrationPath(f.runtime.root, receipt.recoveryId!), op = decodeOperation(f.files.text.get(path)!);
		op.owner.after = field === 'body' ? op.owner.after.replace('PRIVATE-BODY', 'UNAPPROVED-BODY') : patchProperties(op.owner.after, field === 'category' ? { category: 'UNAPPROVED-CATEGORY' } : { status: 'idle', events: [{ rowId: 'unapproved', values: { status: 'idle', date: '2026-01-01', exitDate: '', sale: null, commandHash: 'a'.repeat(64) } }] });
		op.owner.afterHash = await digest(op.owner.after); f.files.external(path, encodeOperation(op)); await f.runtime.flushEvents();
		const writes = f.files.writes.length;
		for (const action of ['resume', 'rollback'] as const) await expect(new ArchiveRepairService(f.runtime, () => undefined).recover({ recoveryId: receipt.recoveryId!, action })).rejects.toThrow();
		await expect(f.app.commands.resumeOperation({ operationId: receipt.recoveryId! })).rejects.toThrow();
		await expect(f.app.commands.rollbackOperation({ operationId: receipt.recoveryId! })).rejects.toThrow();
		expect(f.files.text.get(f.item.path)).toBe(f.broken); expect(f.files.writes.length).toBe(writes);
	} finally { f.runtime.dispose(); }
});

test('confirmed owner commit survives journal finalization and all subsequent source read failures', async () => {
	const f = await fixture();
	try {
		const { vi } = await import('vitest');
		const read = f.files.read.bind(f.files); let unavailable = false;
		vi.spyOn(f.files, 'read').mockImplementation(file => unavailable && file.path === f.item.path ? Promise.reject(new Error('source-unavailable')) : read(file));
		const proposal = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeWrite = (path, raw) => { if (path !== f.item.path && (frontmatter(raw).operation as { state?: string } | undefined)?.state === 'committed') { unavailable = true; throw new Error('journal-finalization-failed'); } };
		const result = await f.owner.commit({ proposalId: proposal.id, expectedHash: proposal.expectedHash, operationId: 'unreadable-committed-owner' });
		expect(f.files.text.get(f.item.path)).not.toBe(f.broken);
		expect(result).toMatchObject({ committed: true, status: 'failed', rechecked: false, recoveryId: 'unreadable-committed-owner' });
	} finally { f.runtime.dispose(); }
});

test('recovery revalidates a journal replaced between owner preflight and generic execution', async () => {
	const f = await fixture();
	try {
		const { vi } = await import('vitest');
		const { decodeOperation, encodeOperation } = await import('../../core/generic/operations');
		const { migrationPath } = await import('../../core/generic/paths');
		const plan = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeWrite = path => { if (path === f.item.path) throw new Error('interrupted'); };
		const receipt = await f.owner.commit({ proposalId: plan.id, expectedHash: plan.expectedHash, operationId: 'journal-race' });
		f.files.beforeWrite = undefined;
		const journal = migrationPath(f.runtime.root, receipt.recoveryId!), op = decodeOperation(f.files.text.get(journal)!);
		op.owner.after = patchProperties(op.owner.after, { category: 'UNAPPROVED-RACE' }); op.owner.afterHash = await digest(op.owner.after);
		const read = f.files.read.bind(f.files); let reads = 0;
		vi.spyOn(f.files, 'read').mockImplementation(file => { if (file.path === journal && ++reads === 2) f.files.external(journal, encodeOperation(op)); return read(file); });
		await expect(new ArchiveRepairService(f.runtime, () => undefined).recover({ recoveryId: receipt.recoveryId!, action: 'resume' })).rejects.toThrow('invalid-repair');
		expect(f.files.text.get(f.item.path)).toBe(f.broken);
	} finally { f.runtime.dispose(); }
});

test.each(['readback', 'process'])('unknown post-write outcome is preserved by real health batch orchestration (%s)', async mode => {
	const f = await fixture();
	try {
		const { vi } = await import('vitest');
		const { HealthRepairService } = await import('../../../health/core/repair');
		const { ARCHIVES_REPAIRS } = await import('../../api');
		const read = f.files.read.bind(f.files); let unavailable = false;
		vi.spyOn(f.files, 'read').mockImplementation(file => unavailable && file.path === f.item.path ? Promise.reject(new Error('readback-unavailable')) : read(file));
		const repair = new HealthRepairService({ providers: async () => [{ providerId: 'archives.belongings', service: ARCHIVES_REPAIRS }], acquire: async () => ({ value: f.owner, revoked: new AbortController().signal }),
			report: () => ({ id: 'report', startedAt: 1, finishedAt: 2, status: 'error', complete: true, stale: false, sections: [{ providerId: 'archives.belongings', status: 'error', complete: true, checked: 1, excluded: 0, issues: [{ code: 'projection-mismatch', severity: 'error', count: 1, reference: 'opaque' }] }] }), now: Date.now, id: () => crypto.randomUUID(), notify: async () => {} });
		try {
			const plan = await repair.plan('report', [{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' }]);
			f.files.afterWrite = path => { if (path === f.item.path) { unavailable = true; if (mode === 'process') throw new Error('process-io'); } };
			const result = await repair.confirm({ planId: plan.id, confirmation: repair.preview(plan.id).confirmation });
			expect(result.status).toBe('partial'); expect(result.items[0]).toMatchObject({ committed: 'unknown', status: 'failed', rechecked: false });
			expect(repair.results[0]?.items[0]?.committed).toBe('unknown'); expect(result.items[0]?.recoveryId).toBeDefined();
			expect(f.files.text.get(f.item.path)).not.toBe(f.broken);
		} finally { repair.dispose(); }
	} finally { f.runtime.dispose(); }
});

test.each(['deleted-marker', 'forged-marker', 'rewritten-after'])('owner registration prevents generic recovery bypass: %s', async attack => {
	const f = await fixture();
	try {
		const { decodeOperation, encodeOperation } = await import('../../core/generic/operations');
		const { migrationPath } = await import('../../core/generic/paths');
		const plan = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeWrite = path => { if (path === f.item.path) throw new Error('interrupted'); };
		const receipt = await f.owner.commit({ proposalId: plan.id, expectedHash: plan.expectedHash, operationId: 'registered-repair' });
		f.files.beforeWrite = undefined;
		const path = migrationPath(f.runtime.root, receipt.recoveryId!), op = decodeOperation(f.files.text.get(path)!) as ReturnType<typeof decodeOperation> & { healthRepair?: string };
		op.owner.after = patchProperties(op.owner.after, { category: 'UNAPPROVED' }).replace('PRIVATE-BODY', 'UNAPPROVED-BODY'); op.owner.afterHash = await digest(op.owner.after);
		if (attack === 'deleted-marker') delete op.healthRepair;
		if (attack === 'forged-marker') op.healthRepair = 'ordinary-upgrade';
		f.files.external(path, encodeOperation(op)); await f.runtime.flushEvents();
		const writes = f.files.writes.length;
		await expect(f.app.commands.resumeOperation({ operationId: receipt.recoveryId! })).rejects.toThrow();
		await expect(f.app.commands.rollbackOperation({ operationId: receipt.recoveryId! })).rejects.toThrow();
		expect(f.files.text.get(f.item.path)).toBe(f.broken); expect(f.files.writes.length).toBe(writes);
	} finally { f.runtime.dispose(); }
});

test.each(['deleted', 'forged'])('repair identity survives restart independently of %s journal marker', async marker => {
	const f = await fixture();
	let restarted: Awaited<ReturnType<typeof memoryArchives>> | undefined;
	try {
		const { decodeOperation, encodeOperation } = await import('../../core/generic/operations');
		const { migrationPath } = await import('../../core/generic/paths');
		const plan = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeWrite = path => { if (path === f.item.path) throw new Error('interrupted'); };
		const receipt = await f.owner.commit({ proposalId: plan.id, expectedHash: plan.expectedHash, operationId: 'restart-registration' });
		const path = migrationPath(f.runtime.root, receipt.recoveryId!), op = decodeOperation(f.files.text.get(path)!) as ReturnType<typeof decodeOperation> & { healthRepair?: string };
		if (marker === 'deleted') delete op.healthRepair; else op.healthRepair = 'forged-classification';
		f.files.external(path, encodeOperation(op)); f.runtime.dispose();
		restarted = await memoryArchives(new Map(f.files.text));
		const app = new ArchivesApplication(restarted.runtime);
		expect((await app.commands.resumeOperation({ operationId: receipt.recoveryId! })).receipt.committed).toBe(true);
		expect((await app.query.belongings()).items[0]?.status).toBe('using');
		await app.commands.rollbackOperation({ operationId: receipt.recoveryId! });
		expect(restarted.files.text.get(f.item.path)).toBe(f.broken);
	} finally { restarted?.runtime.dispose(); f.runtime.dispose(); }
});

test.each(['missing', 'corrupt', 'mismatched'])('unprovable owner registration fails closed: %s', async state => {
	const f = await fixture();
	try {
		const { repairRegistrationPath } = await import('./repair');
		const { decodeOperation, encodeOperation } = await import('../../core/generic/operations');
		const { migrationPath } = await import('../../core/generic/paths');
		const plan = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		f.files.beforeWrite = path => { if (path === f.item.path) throw new Error('interrupted'); };
		const receipt = await f.owner.commit({ proposalId: plan.id, expectedHash: plan.expectedHash, operationId: 'missing-registration' }); f.files.beforeWrite = undefined;
		const path = migrationPath(f.runtime.root, receipt.recoveryId!), op = decodeOperation(f.files.text.get(path)!) as ReturnType<typeof decodeOperation> & { healthRepair?: string };
		delete op.healthRepair; f.files.external(path, encodeOperation(op));
		const registration = repairRegistrationPath(f.runtime.root, receipt.recoveryId!);
		if (state === 'missing') f.files.delete(registration);
		else f.files.external(registration, state === 'corrupt' ? '{' : f.files.text.get(registration)!.replace('repair-item', 'wrong-owner'));
		await f.runtime.flushEvents(); const writes = f.files.writes.length;
		await expect(f.app.commands.resumeOperation({ operationId: receipt.recoveryId! })).rejects.toThrow();
		await expect(f.app.commands.rollbackOperation({ operationId: receipt.recoveryId! })).rejects.toThrow();
		expect(f.files.text.get(f.item.path)).toBe(f.broken); expect(f.files.writes.length).toBe(writes);
	} finally { f.runtime.dispose(); }
});

test('non-repair belongings upgrades can edit ordinary fields and schema, resume and roll back', async () => {
	const f = await fixture();
	try {
		f.files.external(f.item.path, patchProperties(f.broken, { status: 'using' })); await f.runtime.flushEvents();
		const { BELONGING } = await import('../../core/belongings/preset');
		const current = f.runtime.index.definition(BELONGING_TYPE_ID)!;
		const next = await f.app.commands.publishDefinition({ operationId: 'ordinary-schema', definition: { ...BELONGING, label: 'Equipment' }, expectedHeads: [current.revisionId] });
		const session = await f.app.commands.beginEdit(f.item.id), before = f.files.text.get(f.item.path)!;
		await f.app.commands.prepareUpgrade({ operationId: 'ordinary-upgrade', id: f.item.id, expectedHash: session.baseHash, revisionId: next.revision.revisionId, values: { ...session.draft, category: 'Ordinary approved change' } });
		expect((await f.app.commands.resumeOperation({ operationId: 'ordinary-upgrade' })).receipt.committed).toBe(true);
		expect((await f.app.query.belongings()).items[0]).toMatchObject({ category: 'Ordinary approved change', status: 'using' });
		await f.app.commands.rollbackOperation({ operationId: 'ordinary-upgrade' }); expect(f.files.text.get(f.item.path)).toBe(before);
	} finally { f.runtime.dispose(); }
});

test('journal recovery cannot overwrite the independent owner registration', async () => {
	const f = await fixture();
	try {
		const { repairRegistrationPath } = await import('./repair');
		const plan = await f.owner.preview({ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'opaque' });
		expect(await f.owner.commit({ proposalId: plan.id, expectedHash: plan.expectedHash, operationId: 'immutable-registration' })).toMatchObject({ status: 'verified' });
		const path = repairRegistrationPath(f.runtime.root, 'immutable-registration'), original = f.files.text.get(path)!;
		await expect(f.runtime.command({}, (_input, context) => f.runtime.writeExact(path, original, '{}', context))).rejects.toThrow('immutable-repair-registration');
		expect(f.files.text.get(path)).toBe(original);
	} finally { f.runtime.dispose(); }
});
