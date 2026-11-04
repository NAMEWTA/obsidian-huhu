import { expect, test } from 'vitest';
import { transitionValues } from './lifecycle';
import type { Belonging } from './model';
const initial: Belonging = { id: 'one', name: 'One', category: '', purchaseDate: '2026-01-01', purchase: { amount: '100.00', currency: 'CNY' }, status: 'using', exitDate: '', sale: null, events: [], contentHash: 'base' };
test('exit transitions append stable history and default the first exit day', () => {
	const values = transitionValues(initial, { id: 'one', operationId: 'sold-one', expectedHash: 'base', status: 'sold', sale: { amount: '0', currency: 'CNY' } }, 'a'.repeat(64), '2026-01-03');
	expect(values).toMatchObject({ status: 'sold', exitDate: '2026-01-03', sale: { amount: '0', currency: 'CNY' }, events: [{ rowId: 'sold-one', values: { status: 'sold', date: '2026-01-03', exitDate: '2026-01-03' } }] });
});

test('sold to discarded preserves exit and proceeds; returning appends rather than deleting history', () => {
	const sold = { ...initial, ...transitionValues(initial, { id: 'one', operationId: 's', expectedHash: '', status: 'sold', date: '2026-01-04', exitDate: '2026-01-03', sale: { amount: '40', currency: 'CNY' } }, 'a'.repeat(64), '') };
	const discarded = { ...sold, ...transitionValues(sold, { id: 'one', operationId: 'd', expectedHash: '', status: 'discard', date: '2026-01-05' }, 'b'.repeat(64), '') };
	expect(discarded.exitDate).toBe('2026-01-03');
	expect(discarded.sale?.amount).toBe('40');
	const returned = transitionValues(discarded, { id: 'one', operationId: 'r', expectedHash: '', status: 'using', date: '2026-01-06' }, 'c'.repeat(64), '');
	expect(returned.events.map(event => event.rowId)).toEqual(['s', 'd', 'r']);
	expect(returned.exitDate).toBe('');
	expect(returned.sale).toBeNull();
});

test('invalid status, dates, currency and backwards exit dates are rejected', () => {
	const request = { id: 'one', operationId: 's', expectedHash: '', status: 'sold' as const, date: '2026-01-04' };
	for (const patch of [{ date: '2026-02-30' }, { date: '2025-12-31' }, { exitDate: '2026-01-05' }, { sale: { amount: '1', currency: 'USD' } }])
		expect(() => transitionValues(initial, { ...request, ...patch }, 'a'.repeat(64), '')).toThrow();
});

test('exit corrections append a row and cannot precede the current holding cycle', () => {
	const sold = { ...initial, ...transitionValues(initial, { id: 'one', operationId: 's', expectedHash: '', status: 'sold', date: '2026-01-05' }, 'a'.repeat(64), '') };
	const corrected = { ...sold, ...transitionValues(sold, { id: 'one', operationId: 'c', expectedHash: '', status: 'sold', date: '2026-01-06', exitDate: '2026-01-03' }, 'b'.repeat(64), '') };
	expect(corrected.events.map(event => event.rowId)).toEqual(['s', 'c']);
	expect(corrected.events[0]?.values.exitDate).toBe('2026-01-05');
	expect(corrected.exitDate).toBe('2026-01-03');
	const returned = { ...corrected, ...transitionValues(corrected, { id: 'one', operationId: 'r', expectedHash: '', status: 'using', date: '2026-01-07' }, 'c'.repeat(64), '') };
	expect(() => transitionValues(returned, { id: 'one', operationId: 'old-exit', expectedHash: '', status: 'discard', date: '2026-01-08', exitDate: '2026-01-06' }, 'd'.repeat(64), '')).toThrow('invalid-belonging-date');
});
