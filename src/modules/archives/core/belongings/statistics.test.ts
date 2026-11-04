import { expect, test } from 'vitest';
import { belongingStatistics } from './statistics';
import type { Belonging } from './model';
const item = (id: string, currency: string, amount: string): Belonging => ({
	id, name: id, category: '', purchaseDate: '2026-01-01', purchase: { currency, amount },
	status: 'using', exitDate: '', sale: null, events: [], contentHash: '',
});

test('exact decimal sums are separated by currency and daily cost uses the same net-cost calculation', () => {
	const result = belongingStatistics([item('a', 'CNY', '0.10'), item('b', 'CNY', '0.20'), item('c', 'USD', '9007199254740993.01')], '2026-01-03');
	expect(result.currencies).toEqual([
		{ currency: 'CNY', purchased: '0.3', recovered: '0', netCost: '0.3', unknownSales: 0, unknownPurchases: 0 },
		{ currency: 'USD', purchased: '9007199254740993.01', recovered: '0', netCost: '9007199254740993.01', unknownSales: 0, unknownPurchases: 0 },
	]);
	expect(result.items[0]).toMatchObject({ heldDays: 2, dailyCost: { amount: '0.05', currency: 'CNY' } });
});

test('unknown sale differs from zero, zero days is explicit and partial dates do not invent duration', () => {
	const base = item('a', 'CNY', '10');
	const event = { rowId: 'sold', values: { status: 'sold' as const, date: '2026-01-02', exitDate: '2026-01-02', sale: null, commandHash: 'a'.repeat(64) } };
	const unknown = belongingStatistics([{ ...base, status: 'sold', exitDate: '2026-01-02', events: [event] }], '2026-01-03');
	expect(unknown.items[0]).toMatchObject({ unknownSale: true, dailyCost: null, netCost: null });
	expect(unknown.currencies[0]).toMatchObject({ unknownSales: 1, netCost: null });
	const zero = belongingStatistics([{ ...base, events: [{ ...event, values: { ...event.values, sale: { amount: '0', currency: 'CNY' } } }] }], '2026-01-03');
	expect(zero.items[0]).toMatchObject({ unknownSale: false, netCost: { amount: '10' } });
	expect(belongingStatistics([base], '2026-01-01').items[0]).toMatchObject({ zeroDays: true, dailyCost: null });
	expect(belongingStatistics([{ ...base, purchaseDate: '2026-01' }], '2026-01-03').items[0]?.heldDays).toBeNull();
});

test('history replay ignores today state and flags a negative realized net cost', async () => {
	const { belongingMonthlyTrend } = await import('./statistics');
	const base = item('a', 'CNY', '10');
	const events = [{ rowId: 's', values: { status: 'sold' as const, date: '2026-02-02', exitDate: '2026-02-02', sale: { amount: '20', currency: 'CNY' }, commandHash: 'a'.repeat(64) } }];
	const source = { ...base, status: 'sold' as const, exitDate: '2026-02-02', sale: { amount: '20', currency: 'CNY' }, events };
	const trend = belongingMonthlyTrend([source], 2026);
	expect(trend[0]!.items[0]?.status).toBe('using');
	expect(trend[0]!.currencies[0]?.recovered).toBe('0');
	expect(trend[1]!.items[0]).toMatchObject({ status: 'sold', negativeNet: true, netCost: { amount: '-10', currency: 'CNY' } });
});

test('last year monthly replay retains an exited cycle even after a return this year', async () => {
	const { transitionValues } = await import('./lifecycle');
	const { belongingMonthlyTrend } = await import('./statistics');
	const original = { ...item('cross-year', 'CNY', '100'), purchaseDate: '2025-12-01' };
	const sold = { ...original, ...transitionValues(original, { id: original.id, operationId: 'sale-2025', expectedHash: '', status: 'sold', date: '2025-12-20', sale: { amount: '20', currency: 'CNY' } }, 'a'.repeat(64), '') };
	const returned = { ...sold, ...transitionValues(sold, { id: sold.id, operationId: 'return-2026', expectedHash: '', status: 'using', date: '2026-01-05' }, 'b'.repeat(64), '') };
	const previousYear = belongingMonthlyTrend([returned], 2025);
	expect(previousYear[10]!.items).toEqual([]);
	expect(previousYear[11]!.items[0]).toMatchObject({ status: 'sold', heldDays: 19, netCost: { amount: '80', currency: 'CNY' } });
	expect(belongingStatistics([returned], '2026-01-07').items[0]).toMatchObject({ status: 'using', heldDays: 21, netCost: { amount: '80', currency: 'CNY' } });
});

test('known recovery remains visible when purchase price is unknown, without combining currencies', () => {
	const source: Belonging = { ...item('no-price', 'CNY', '0'), purchase: undefined,
		events: [
			{ rowId: 'usd-sale', values: { status: 'sold', date: '2026-01-02', exitDate: '2026-01-02', sale: { amount: '10', currency: 'USD' }, commandHash: 'a'.repeat(64) } },
			{ rowId: 'return', values: { status: 'using', date: '2026-01-03', exitDate: '', sale: null, commandHash: 'b'.repeat(64) } },
			{ rowId: 'cny-sale', values: { status: 'sold', date: '2026-01-04', exitDate: '2026-01-04', sale: { amount: '20', currency: 'CNY' }, commandHash: 'c'.repeat(64) } },
		] };
	const result = belongingStatistics([source], '2026-01-05');
	expect(result.items[0]?.netCost).toBeNull();
	expect(result.currencies).toEqual([
		{ currency: 'CNY', purchased: '0', recovered: '20', netCost: null, unknownSales: 0, unknownPurchases: 1 },
		{ currency: 'USD', purchased: '0', recovered: '10', netCost: null, unknownSales: 0, unknownPurchases: 1 },
	]);
});

test('page summary supplies status counts, inventory and daily totals without merging currencies', () => {
	const result = belongingStatistics([item('a', 'CNY', '10'), item('b', 'USD', '20')], '2026-01-03');
	expect(result.summary).toEqual({ total: 2, inStock: 2, exited: 0, statuses: { using: 2, idle: 0, sold: 0, discard: 0 }, currencies: [
		{ currency: 'CNY', inventory: '10', dailyCost: '5', unknownDaily: 0 },
		{ currency: 'USD', inventory: '20', dailyCost: '10', unknownDaily: 0 },
	] });
});

test('compensation restores the old cycle while earlier monthly snapshots retain the original event', async () => {
	const { transitionValues, undoValues, parseBelonging } = await import('./lifecycle');
	const original = item('undo-history', 'CNY', '100');
	const sold = { ...original, ...transitionValues(original, { id: original.id, operationId: 'history-sale', expectedHash: '', status: 'sold', date: '2026-01-03', sale: { amount: '40', currency: 'CNY' } }, 'a'.repeat(64), '') };
	const returned = { ...sold, ...transitionValues(sold, { id: sold.id, operationId: 'history-return', expectedHash: '', status: 'using', date: '2026-02-01' }, 'b'.repeat(64), '') };
	returned.events[0]!.values['private-extension'] = 'preserved';
	const undone = { ...returned, ...undoValues(returned, 'history-return', 'history-undo', 'c'.repeat(64), '2026-03-01') };
	expect(undone.events[0]!.values['private-extension']).toBe('preserved');
	expect(belongingStatistics([undone], '2026-02-02').items[0]).toMatchObject({ status: 'using', heldDays: 3, netCost: { amount: '60', currency: 'CNY' } });
	expect(belongingStatistics([undone], '2026-03-01').items[0]).toMatchObject({ status: 'sold', heldDays: 2, netCost: { amount: '60', currency: 'CNY' } });
	const corrected = { ...undone, ...transitionValues(undone, { id: undone.id, operationId: 'after-undo-correction', expectedHash: '', status: 'sold', date: '2026-03-02', exitDate: '2026-01-02' }, 'd'.repeat(64), '') };
	expect(parseBelonging({ id: corrected.id, contentHash: '', values: { ...corrected } }).exitDate).toBe('2026-01-02');
});

test('annual report separates actual purchases from snapshots and replays exit cycles by year', async () => {
	const { belongingAnnualReport } = await import('./statistics');
	const old = { ...item('old', 'CNY', '100'), category: 'Camera', purchaseDate: '2025-12-01', events: [
		{ rowId: 'sale', values: { status: 'sold' as const, date: '2025-12-20', exitDate: '2025-12-20', sale: { amount: '40', currency: 'CNY' }, commandHash: '' } },
		{ rowId: 'return', values: { status: 'using' as const, date: '2026-01-05', exitDate: '', sale: null, commandHash: '' } },
	] };
	const current = { ...item('new', 'USD', '0.20'), category: 'Everyday', purchaseDate: '2026-02' };
	const previous = belongingAnnualReport([old, current], 2025, '2026-06-01');
	expect(previous).toMatchObject({ year: 2025, asOf: '2025-12-31', purchasedCount: 1, exitedCount: 1 });
	expect(previous.currencies).toEqual([{ currency: 'CNY', purchased: '100', recovered: '40', unknownSales: 0, monthly: ['0','0','0','0','0','0','0','0','0','0','0','100'] }]);
	expect(previous.holdings[0]).toMatchObject({ id: 'old', heldDays: 19, netCost: { amount: '60', currency: 'CNY' } });
	const next = belongingAnnualReport([old, current], 2026, '2026-06-01');
	expect(next).toMatchObject({ asOf: '2026-06-01', purchasedCount: 1, exitedCount: 0, unknownHoldingDays: 1 });
	expect(next.currencies).toEqual([{ currency: 'USD', purchased: '0.2', recovered: '0', unknownSales: 0, monthly: ['0','0.2','0','0','0','0','0','0','0','0','0','0'] }]);
	expect(next.categories).toEqual([{ name: 'Everyday', count: 1 }]);
});

test('annual recovery counts completed cycles once, preserves unknowns and ignores compensated exits', async () => {
	const { belongingAnnualReport } = await import('./statistics');
	const { transitionValues, undoValues } = await import('./lifecycle');
	const original = item('cycles', 'USD', '10');
	const sold = { ...original, ...transitionValues(original, { id: original.id, operationId: 'sale', expectedHash: '', status: 'sold', date: '2026-01-02', sale: { amount: '20', currency: 'USD' } }, 'a'.repeat(64), '') };
	const discarded = { ...sold, ...transitionValues(sold, { id: sold.id, operationId: 'discard', expectedHash: '', status: 'discard', date: '2026-01-03' }, 'b'.repeat(64), '') };
	const returned = { ...discarded, ...transitionValues(discarded, { id: sold.id, operationId: 'return', expectedHash: '', status: 'using', date: '2026-01-04' }, 'c'.repeat(64), '') };
	const resold = { ...returned, ...transitionValues(returned, { id: sold.id, operationId: 'resale', expectedHash: '', status: 'sold', date: '2026-01-05' }, 'd'.repeat(64), '') };
	const beforeUndo = belongingAnnualReport([resold], 2026, '2026-01-05');
	expect(beforeUndo).toMatchObject({ exitedCount: 2, currencies: [{ recovered: '20', unknownSales: 1 }], holdings: [{ unknownSale: true, netCost: null }] });
	const undone = { ...resold, ...undoValues(resold, 'resale', 'undo-resale', 'e'.repeat(64), '2026-01-06') };
	expect(belongingAnnualReport([undone], 2026, '2026-01-05')).toMatchObject({ exitedCount: 2 });
	expect(belongingAnnualReport([undone], 2026, '2026-01-06')).toMatchObject({ exitedCount: 1, currencies: [{ recovered: '20', unknownSales: 0 }], holdings: [{ negativeNet: true, netCost: { amount: '-10', currency: 'USD' } }] });
});

test('annual decimal flows retain large amounts, explicit zero, partial dates and unknown prices', async () => {
	const { belongingAnnualReport } = await import('./statistics');
	const unknown = { ...item('unknown', 'CNY', '0'), purchase: undefined, purchaseDate: '2026-01' };
	const zero = { ...item('zero', 'CNY', '0'), events: [{ rowId: 'zero-sale', values: { status: 'sold' as const, date: '2026-01-01', exitDate: '2026-01-01', sale: { amount: '0', currency: 'CNY' }, commandHash: '' } }] };
	const report = belongingAnnualReport([item('large', 'USD', '9007199254740993.01'), item('small', 'USD', '0.09'), unknown, zero], 2026, '2026-01-01');
	expect(report).toMatchObject({ purchasedCount: 4, exitedCount: 1, unknownPurchases: 1, unknownHoldingDays: 1, medianHeldDays: 0 });
	expect(report.currencies[1]).toMatchObject({ currency: 'USD', purchased: '9007199254740993.1', monthly: ['9007199254740993.1', ...Array(11).fill('0')] });
	expect(report.holdings.find(item => item.id === 'zero')).toMatchObject({ zeroDays: true, dailyCost: null, unknownSale: false });
	expect(belongingAnnualReport([], 2025, '2026-01-01').empty).toBe(true);
	expect(belongingAnnualReport([zero], 2027, '2026-01-01').empty).toBe(true);
	expect(() => belongingAnnualReport([], 2026.5, '2026-01-01')).toThrow('invalid-belonging-date');
});
