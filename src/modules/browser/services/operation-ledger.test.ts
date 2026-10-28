import { describe, expect, it } from 'vitest';
import { AgentBrowserError, type BrowserPersistence, type OperationScope, type OperationRecord } from '../core/contracts';
import { BrowserFileError } from '../core/files';
import { IdentityError } from '../core/identity';
import { OperationLedger } from './operation-ledger';
export class MemoryPersistence implements BrowserPersistence {
	readonly ownerId = 'owner-12345678';
	readOnly = false;
	rows = new Map<string, unknown>();
	next = 0;
	async initialize() {}
	async security() {
		return 'secure' as const;
	}
	id() {
		return `id-${String(++this.next).padStart(12, '0')}`;
	}
	async digest(value: string) {
		return value;
	}
	async read<T>(key: string) {
		const v = this.rows.get(key);
		return v === undefined ? undefined : (structuredClone(v) as T);
	}
	async write(key: string, value: unknown) {
		this.rows.set(key, structuredClone(value));
	}
	async remove(key: string) {
		this.rows.delete(key);
	}
	async keys(prefix: string) {
		return [...this.rows.keys()].filter((k) => k.startsWith(prefix));
	}
	async dispose() {}
}
const scope: OperationScope = {
	principal: 'agent',
	issuerId: 'run-12345678',
	spaceId: 'space-12345678',
	pageId: 'page-12345678',
	runtimeId: 'runtime-12345678',
	epoch: 2,
};
describe('durable browser operations', () => {
	it('records a known pre-dispatch expiry after durable intent without reporting an unknown webpage outcome or replaying it', async () => {
		let remaining = 10000, entered!: () => void, release!: () => void;
		const ready = new Promise<void>(resolve => { entered = resolve; }), blocked = new Promise<void>(resolve => { release = resolve; });
		class DeadlineStore extends MemoryPersistence {
			armed = false;
			override async write(key: string, value: unknown) {
				if (this.armed && key === 'operation-checkpoint' && (value as { entries: OperationRecord[] }).entries.some(record => record.state === 'dispatching')) { this.armed = false; entered(); await blocked; }
				return super.write(key, value);
			}
		}
		const store = new DeadlineStore(), ledger = new OperationLedger(store), payload = { kind: 'upload' }, ticket = await ledger.prepare('upload-deadline', scope, payload); let dispatched = 0;
		store.armed = true; const result = ledger.execute(ticket.id, payload, () => {}, async () => { dispatched++; return null; }, () => remaining);
		await ready; remaining = 0; release();
		expect(await result).toMatchObject({ state: 'cancelled_before_dispatch', error: 'operation_expired' });
		expect(await ledger.execute(ticket.id, payload, () => {}, async () => { dispatched++; return null; })).toMatchObject({ state: 'cancelled_before_dispatch' }); expect(dispatched).toBe(0);
	});
	it('publishes durable metadata transitions without allowing notification failure to change or replay facts', async () => {
		const storage = new MemoryPersistence(), states: string[] = [], metadata: unknown[] = [];
		const ledger = new OperationLedger(storage, () => 1000, () => true, undefined, (_scope, operation) => { states.push(operation.state); metadata.push(operation); throw Error('slow/broken projection'); });
		const ticket = await ledger.prepare('events', scope, { password: 'SYNTHETIC_SECRET' }); let calls = 0;
		expect((await ledger.execute(ticket.id, { password: 'SYNTHETIC_SECRET' }, () => {}, async () => { calls++; return { secret: 'SYNTHETIC_RESULT' }; })).state).toBe('completed');
		expect(states).toEqual(['prepared', 'dispatching', 'completed']); expect(JSON.stringify(ledger.summaries(scope))).not.toContain('SYNTHETIC');
		for (const operation of metadata) { expect(operation).not.toHaveProperty('digest'); expect(operation).not.toHaveProperty('result'); } expect(JSON.stringify(metadata)).not.toContain('SYNTHETIC');
		await ledger.execute(ticket.id, { password: 'SYNTHETIC_SECRET' }, () => {}, async () => { calls++; return null; }); expect(calls).toBe(1);
		const uncertain = await ledger.prepare('unknown-events', scope, {}); let uncertainCalls = 0;
		await ledger.execute(uncertain.id, {}, () => {}, async () => { uncertainCalls++; throw new AgentBrowserError('transport_closed'); });
		expect(states.slice(-3)).toEqual(['prepared', 'dispatching', 'outcome_unknown']);
		expect((await ledger.execute(uncertain.id, {}, () => {}, async () => { uncertainCalls++; return null; })).state).toBe('outcome_unknown'); expect(uncertainCalls).toBe(1);
	});
	it('issues increasing scoped tickets and preserves live issuer deduplication through result collection', async () => {
		const store = new MemoryPersistence(); let now = 1000, writable = true;
		const ledger = new OperationLedger(store, () => now, () => writable, () => now);
		const first = await ledger.prepare('first', scope, { value: 1 });
		const second = await ledger.prepare('second', scope, { value: 2 });
		expect(first.sequence).toBe(1); expect(second.sequence).toBe(2);
		await ledger.execute(first.id, { value: 1 }, () => {}, async () => ({ count: 1 }));
		now += 31 * 86_400_000; await ledger.prune();
		expect(await ledger.prepare('first', scope, { value: 1 })).toMatchObject({ id: first.id, state: 'completed', error: 'result_unavailable' });
		await expect(ledger.prepare('first', scope, { value: 3 })).rejects.toThrow('request_id_conflict');
		writable = false; await ledger.prune();
		expect(await store.read('operation-checkpoint')).toMatchObject({ issuers: [{ issued: 2, lowWater: 2, closed: true }], entries: [] });
		expect(() => ledger.get(first.id)).toThrow('operation_gone');
		const restored = new OperationLedger(store, () => now, () => writable); await restored.initialize();
		await expect(restored.execute(first.id, { value: 1 }, () => {}, async () => { throw Error('must not dispatch'); })).rejects.toThrow('operation_gone');
		await expect(restored.prepare('first', scope, { value: 1 })).rejects.toThrow('operation_scope_expired');
	});
	it('bounds unexecuted tickets and expires them without granting a second dispatch', async () => {
		const store = new MemoryPersistence(); let now = 1000;
		const ledger = new OperationLedger(store, () => now, () => true, () => now);
		const tickets = [];
		for (let index = 0; index < 64; index++) tickets.push(await ledger.prepare(`pending-${index}`, scope, {}));
		await expect(ledger.prepare('over-budget', scope, {})).rejects.toThrow('operation_quota');
		now += 300_001;
		const expired = await ledger.execute(tickets[0]!.id, {}, () => {}, async () => { throw Error('expired ticket dispatched'); });
		expect(expired).toMatchObject({ state: 'rejected', error: 'operation_expired' });
		const next = await ledger.prepare('after-expiry', scope, {}); expect(next.sequence).toBe(65);
		expect((await ledger.execute(tickets[1]!.id, {}, () => {}, async () => { throw Error('expired ticket dispatched'); })).state).toBe('cancelled_before_dispatch');
	});
	it('enforces the aggregate reservation budget across independent issuers', async () => {
		const ledger = new OperationLedger(new MemoryPersistence());
		for (let issuer = 0; issuer < 4; issuer++) for (let index = 0; index < 64; index++)
			await ledger.prepare(`request-${index}`, { ...scope, issuerId: `issuer-${issuer}` }, {});
		await expect(ledger.prepare('overflow', { ...scope, issuerId: 'issuer-5' }, {})).rejects.toThrow('operation_quota');
	});
	it('reads legacy UUID operations without replay and collects them only after authority retirement', async () => {
		const store = new MemoryPersistence(); let writable = true;
		const legacy: OperationRecord = { id: 'legacy-ticket', requestId: 'legacy-request', digest: JSON.stringify({ payload: {}, scope: { epoch: 2, issuerId: 'run-12345678', pageId: 'page-12345678', principal: 'agent', runtimeId: 'runtime-12345678', spaceId: 'space-12345678' } }), scope, state: 'completed', createdAt: 1, updatedAt: 1, result: { count: 1 } };
		await store.write(`operations/${legacy.id}`, legacy);
		const ledger = new OperationLedger(store, () => 31 * 86_400_000, () => writable); await ledger.initialize();
		expect(ledger.get(legacy.id)).toMatchObject({ state: 'completed', result: { count: 1 } });
		await ledger.prune(); expect(ledger.get(legacy.id)).toMatchObject({ state: 'completed', error: 'result_unavailable' });
		writable = false; await ledger.prune(); expect(() => ledger.get(legacy.id)).toThrow('operation_gone');
	});
	it('rejects mismatched execute payloads before and after completion', async () => {
		const ledger = new OperationLedger(new MemoryPersistence()), ticket = await ledger.prepare('payload', scope, { value: 1 }); let calls = 0;
		const dispatch = async () => { calls++; return null; };
		await expect(ledger.execute(ticket.id, { value: 2 }, () => {}, dispatch)).rejects.toThrow('operation_payload_mismatch');
		await ledger.execute(ticket.id, { value: 1 }, () => {}, dispatch);
		await expect(ledger.execute(ticket.id, { value: 2 }, () => {}, dispatch)).rejects.toThrow('operation_payload_mismatch');
		expect(calls).toBe(1);
	});
	it('detects a checkpoint gap instead of reissuing the missing request mapping', async () => {
		const store = new MemoryPersistence(), ledger = new OperationLedger(store);
		await ledger.prepare('missing', scope, {});
		const checkpoint = (await store.read<{ entries: OperationRecord[] }>('operation-checkpoint'))!;
		checkpoint.entries = []; await store.write('operation-checkpoint', checkpoint);
		await expect(new OperationLedger(store).initialize()).rejects.toThrow('journal_corrupt');
	});
	it('keeps the original issuer mapping while a result is unavailable after recovery', async () => {
		const store = new MemoryPersistence(), ledger = new OperationLedger(store), ticket = await ledger.prepare('missing-result', scope, {});
		await ledger.execute(ticket.id, {}, () => {}, async () => ({ count: 1 })); await store.remove(`operations/${ticket.id}`);
		const recovered = new OperationLedger(store); await recovered.initialize(); let called = false;
		expect(await recovered.execute(ticket.id, {}, () => {}, async () => { called = true; return null; })).toMatchObject({ id: ticket.id, state: 'completed', error: 'result_unavailable' });
		expect(await recovered.prepare('missing-result', scope, {})).toMatchObject({ id: ticket.id }); expect(called).toBe(false);
	});
	it('uses the bounded monotonic prepare deadline even when the wall clock moves backward', async () => {
		let wall = 1000, monotonic = 10;
		const ledger = new OperationLedger(new MemoryPersistence(), () => wall, () => true, () => monotonic);
		const ticket = await ledger.prepare('short-deadline', scope, {}, 50);
		expect(ticket.expiresAt).toBe(1050); wall = 1; monotonic = 61;
		expect(await ledger.execute(ticket.id, {}, () => {}, async () => { throw Error('expired dispatch'); })).toMatchObject({ state: 'rejected', error: 'operation_expired' });
		await expect(ledger.prepare('invalid-deadline', scope, {}, 0)).rejects.toThrow('deadline_invalid');
	});
	it('rechecks authority after asynchronous validation before committing dispatch intent', async () => {
		let writable = true; const ledger = new OperationLedger(new MemoryPersistence(), () => 1000, () => writable);
		const ticket = await ledger.prepare('revoked-during-validation', scope, {}); let dispatched = false;
		const result = await ledger.execute(ticket.id, {}, async () => { writable = false; }, async () => { dispatched = true; return null; });
		expect(result).toMatchObject({ state: 'rejected', error: 'operation_scope_expired' }); expect(dispatched).toBe(false);
	});
	it('checks the current execute deadline again after asynchronous validation', async () => {
		const ledger = new OperationLedger(new MemoryPersistence()), ticket = await ledger.prepare('execute-deadline', scope, {});
		let remaining = 10000, dispatched = false;
		const result = await ledger.execute(ticket.id, {}, async () => { remaining = 0; }, async () => { dispatched = true; return null; }, () => remaining);
		expect(result).toMatchObject({ state: 'rejected', error: 'operation_expired' }); expect(dispatched).toBe(false);
	});
	it('uses the earlier ticket/request deadline even if a later remaining budget grows', async () => {
		for (const [ticketMs, requestMs] of [[50, 10000], [10000, 50]]) {
			let monotonic = 0, remaining = requestMs!;
			const ledger = new OperationLedger(new MemoryPersistence(), () => 1000, () => true, () => monotonic);
			const ticket = await ledger.prepare('earlier-deadline', scope, {}, ticketMs);
			const result = await ledger.execute(ticket.id, {}, async () => { monotonic = 60; remaining = 10000; }, async () => { throw Error('expired dispatch'); }, () => remaining);
			expect(result).toMatchObject({ state: 'rejected', error: 'operation_expired' });
		}
	});
	it('lets a short duplicate wait for the original dispatched operation without cancelling it', async () => {
		const ledger = new OperationLedger(new MemoryPersistence()), ticket = await ledger.prepare('active-deadline', scope, {});
		let enter!: () => void, release!: () => void, calls = 0;
		const entered = new Promise<void>(resolve => { enter = resolve; }), blocked = new Promise<void>(resolve => { release = resolve; });
		const dispatch = async () => { calls++; enter(); await blocked; return { ok: true }; };
		const original = ledger.execute(ticket.id, {}, () => {}, dispatch); await entered;
		const duplicate = ledger.execute(ticket.id, {}, () => {}, dispatch, () => 0);
		release(); expect(await duplicate).toEqual(await original); expect(calls).toBe(1);
	});
	it('persists dispatch before effects and coalesces duplicate execution', async () => {
		const store = new MemoryPersistence(),
			ledger = new OperationLedger(store);
		await ledger.initialize();
		const ticket = await ledger.prepare('request-1', scope, { kind: 'click', ref: 'a' });
		let calls = 0;
		const execute = () =>
			ledger.execute(
				ticket.id,
				{ kind: 'click', ref: 'a' },
				() => {},
				async () => {
					expect((await store.read<{ entries: OperationRecord[] }>('operation-checkpoint'))?.entries.find(record => record.id === ticket.id)?.state).toBe('dispatching');
					calls++;
					return { ok: true };
				},
			);
		const [first, second] = await Promise.all([execute(), execute()]);
		expect(first).toEqual(second);
		expect(calls).toBe(1);
		expect((await execute()).state).toBe('completed');
		expect(calls).toBe(1);
	});
	it('rejects requestId reuse with changed authority or payload', async () => {
		const ledger = new OperationLedger(new MemoryPersistence());
		await ledger.prepare('same', scope, { value: 1 });
		await expect(ledger.prepare('same', scope, { value: 2 })).rejects.toThrow('request_id_conflict');
		await expect(ledger.prepare('same', { ...scope, epoch: 3 }, { value: 1 })).rejects.toThrow(
			'request_id_conflict',
		);
	});
	it('keeps human/workspace/agent principals independent without fake Runs', async () => {
		const ledger = new OperationLedger(new MemoryPersistence());
		const a = await ledger.prepare('same', scope, {}),
			b = await ledger.prepare('same', { ...scope, principal: 'human' }, {});
		expect(a.id).not.toBe(b.id);
		expect(ledger.get(a.id, { principal: 'human', issuerId: scope.issuerId })).toBeUndefined();
	});
	it('recovers durable dispatch as unknown and prepared intent as cancelled without replay', async () => {
		const store = new MemoryPersistence(),
			ledger = new OperationLedger(store),
			a = await ledger.prepare('a', scope, {}),
			b = await ledger.prepare('b', scope, {});
		const checkpoint = (await store.read<{ entries: OperationRecord[] }>('operation-checkpoint'))!;
		checkpoint.entries.find(record => record.id === a.id)!.state = 'dispatching';
		await store.write('operation-checkpoint', checkpoint);
		const restored = new OperationLedger(store);
		await restored.initialize();
		let called = false;
		expect(
			(
				await restored.execute(
					a.id,
					{},
					() => {},
					async () => {
						called = true;
						return null;
					},
				)
			).state,
		).toBe('outcome_unknown');
		expect(restored.get(b.id)?.state).toBe('cancelled_before_dispatch');
		expect(called).toBe(false);
	});
	it.each([new BrowserFileError('file_scope_mismatch'), new IdentityError('verification_failed')])(
		'preserves safe typed errors across the ledger',
		async (error) => {
			const ledger = new OperationLedger(new MemoryPersistence()),
				ticket = await ledger.prepare('file', scope, {});
			const rejected = await ledger.execute(
				ticket.id,
				{},
				() => {
					throw error;
				},
				async () => {
					throw new Error('must not dispatch');
				},
			);
			expect(rejected.state).toBe('rejected');
			expect(rejected.error).toBe(error.code);
		},
	);
	it('does not expose arbitrary errors or incomplete result bodies after effect/persistence failure', async () => {
		const ledger = new OperationLedger(new MemoryPersistence()),
			ticket = await ledger.prepare('secret', scope, {});
		const result = await ledger.execute(
			ticket.id,
			{},
			() => {},
			async () => {
				throw new Error('secret=do-not-return /private/path');
			},
		);
		expect(result.state).toBe('outcome_unknown');
		expect(result.error).toBe('operation_failed');
		expect(result.result).toBeUndefined();
	});
});
