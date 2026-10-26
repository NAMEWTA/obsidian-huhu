import { describe, expect, it } from 'vitest';
import type { BrowserPersistence, OperationScope } from '../core/contracts';
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
					expect((await store.read<{ state: string }>(`operations/${ticket.id}`))?.state).toBe('dispatching');
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
		await store.write(`operations/${a.id}`, { ...a, state: 'dispatching' });
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
