import { expect, it } from 'vitest';
import samples from '../../../../../contracts/hap/v0.1/fixtures/methods.json';
import type { HostInvoke, HostLease, HostReceipt } from '../../api';
import type { NoteEffects } from '../../platform/obsidian/note-effects/port';
import { HostWriteService } from './host-write';

const request = () => structuredClone(samples.cases.find(item => item.method === 'host.invoke' && item.part === 'params' && item.valid)!.value) as HostInvoke;
function ready(effects: NoteEffects, owner: object) {
	const timers = new Set<() => void>(), req = request();
	const service = new HostWriteService(effects, { after: (_ms, run) => { timers.add(run); return () => { timers.delete(run); }; } }, owner);
	const lease: HostLease = { leaseId: req.leaseId, hostConnectionId: req.hostConnectionId, leaseEpoch: req.leaseEpoch, workspaceId: req.workspaceId,
		capabilities: ['note.write'], expiresAt: '2099-01-01T00:00:00Z' };
	service.setLease(lease); return { service, req, timers };
}
function held() {
	const pending: Array<{ signal: AbortSignal; resolve(value: HostReceipt): void }> = [];
	const effects: NoteEffects = { setLease: () => {}, dispose: () => {}, prepareWrite: async () => { throw new Error('unused'); }, checkWrite: async () => ({ valid: true }),
		invoke: (_request, signal) => new Promise(resolve => { pending.push({ signal, resolve }); }), queryReceipt: async req => ({ effectId: req.effectId, fingerprint: req.fingerprint, status: 'unknown_outcome' }) };
	return { effects, pending };
}

it('retains all eight actual task permits across timeout, disposal and a new service until the original promises settle', async () => {
	const owner = {}, first = held(), current = ready(first.effects, owner), next = ready(first.effects, owner);
	const promises = Array.from({ length: 8 }, (_, index) => current.service.invoke({ ...current.req, effectId: `effect:${index}` }, new AbortController().signal).catch((error: unknown) => error));
	await Promise.resolve(); expect(first.pending).toHaveLength(8);
	for (const timeout of [...current.timers]) timeout(); current.service.dispose();
	expect(first.pending.every(task => task.signal.aborted)).toBe(true);
	await expect(next.service.invoke(current.req, new AbortController().signal)).rejects.toMatchObject({ data: { kind: 'RESOURCE_LIMIT', reason: 'NOTE_TASK_LIMIT' } });
	for (const [index, task] of first.pending.entries()) task.resolve({ effectId: `effect:${index}`, fingerprint: current.req.fingerprint, status: 'unknown_outcome' });
	expect((await Promise.all(promises)).every(error => error instanceof Error)).toBe(true); await current.service.drained(); expect(current.timers.size).toBe(0);
	const { profileId, commandEpoch, workspaceId, leaseId, hostConnectionId, leaseEpoch, effectId, fingerprint, preview } = next.req;
	const read = await next.service.queryReceipt({ profileId, commandEpoch, workspaceId, leaseId, hostConnectionId, leaseEpoch, effectId, fingerprint, preview }, new AbortController().signal);
	expect(read.status).toBe('unknown_outcome'); next.service.dispose(); await next.service.drained(); expect(next.timers.size).toBe(0);
	expect(Reflect.get(owner, Symbol.for('huhu.huhubot.note-effects.quota.v1'))).toEqual({ active: 0, bytes: 0 });
});

it('bounds retained request bytes independently of the number of actual operations', async () => {
	const first = held(), current = ready(first.effects, {}), large = { ...current.req, preview: { ...current.req.preview, diff: 'x'.repeat(740_000) } };
	const one = current.service.invoke(large, new AbortController().signal).catch((error: unknown) => error);
	const two = current.service.invoke({ ...large, effectId: 'effect:two' }, new AbortController().signal).catch((error: unknown) => error);
	await Promise.resolve(); expect(first.pending).toHaveLength(2);
	await expect(current.service.invoke({ ...large, effectId: 'effect:three' }, new AbortController().signal)).rejects.toMatchObject({ data: { kind: 'RESOURCE_LIMIT', reason: 'NOTE_TASK_LIMIT' } });
	current.service.dispose(); for (const task of first.pending) task.resolve({ effectId: large.effectId, fingerprint: large.fingerprint, status: 'unknown_outcome' });
	await Promise.all([one, two]); await current.service.drained(); expect(current.timers.size).toBe(0);
});
