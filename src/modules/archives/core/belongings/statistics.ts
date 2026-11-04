// Business calculations adapted from yeshimei/bz (MIT), d76a0870329403247917a00c43019e203a2560a4:
// src/belongings/shared.ts and report.ts. Copyright (c) 2026 叫我包仔.
// HUHU: exact decimal arithmetic, currency partitions, explicit unknowns, per-cycle holding days and event replay.
import { ArchiveError } from '../schema/model';
import { validPrecisionDate } from '../schema/fields';
import { add, subtract, decimal, format, daily, ZERO, type Decimal } from './decimal';
import type { Belonging, BelongingStatus, BelongingMoney, BelongingStatistics } from './model';
export const exited = (status: BelongingStatus): boolean => status === 'sold' || status === 'discard';
export function day(value: string): number {
	if (!validPrecisionDate(value, 'day')) throw new ArchiveError('invalid-belonging-date');
	return Date.parse(value + 'T00:00:00Z') / 86_400_000;
}
export function money(value: BelongingMoney): Decimal {
	if (!/^[A-Z]{3}$/.test(value.currency)) throw new ArchiveError('invalid-money');
	const result = decimal(value.amount);
	if (result.n < 0n) throw new ArchiveError('invalid-money');
	return result;
}
export function belongingStatistics(items: readonly Belonging[], asOf: string): BelongingStatistics {
	const end = day(asOf);
	const result: BelongingStatistics = { asOf, items: [], currencies: [], summary: { total: 0, inStock: 0, exited: 0, statuses: { using: 0, idle: 0, sold: 0, discard: 0 }, currencies: [] } };
	const groups = new Map<string, { purchased: Decimal; recovered: Decimal; unknownSales: number; unknownPurchases: number }>();
	const groupFor = (currency: string) => {
		const group = groups.get(currency) ?? { purchased: ZERO, recovered: ZERO, unknownSales: 0, unknownPurchases: 0 };
		groups.set(currency, group);
		return group;
	};
	for (const item of items) {
		if (item.purchaseDate && item.purchaseDate > asOf) continue;
		let status: BelongingStatus = 'using', exitDate = '', sale: BelongingMoney | null = null;
		let start = item.purchaseDate && validPrecisionDate(item.purchaseDate, 'day') ? day(item.purchaseDate) : null;
		let held = 0, knownDays = start !== null, unknownSales = 0;
		const recoveries = new Map<string, Decimal>();
		let wasSold = false;
		const finishCycle = () => {
			if (sale) {
				if (item.purchase && sale.currency !== item.purchase.currency) throw new ArchiveError('currency-mismatch');
				recoveries.set(sale.currency, add(recoveries.get(sale.currency) ?? ZERO, money(sale)));
			} else if (wasSold) unknownSales++;
		};
		// Replay compensations only once they are effective; earlier monthly snapshots retain the original transition.
		const effective = effectiveEvents(item, asOf);
		for (const event of effective) {
			const next = event.values;
			if (next.date > asOf) break;
			if (exited(status) && !exited(next.status)) {
				if (start !== null && exitDate) held += Math.max(0, day(exitDate) - start);
				finishCycle();
				wasSold = false;
				start = day(next.date);
			}
			status = next.status;
			if (status === 'sold') wasSold = true;
			exitDate = next.exitDate;
			sale = next.sale ?? null;
		}
		if (exited(status)) finishCycle();
		const stop = exited(status) ? day(exitDate) : end;
		if (start !== null) held += Math.max(0, stop - start);
		else knownDays = false;
		const heldDays = knownDays ? held : null;
		const cost = item.purchase ? money(item.purchase) : null;
		const recovered = item.purchase ? recoveries.get(item.purchase.currency) ?? ZERO : ZERO;
		const net = cost ? subtract(cost, recovered) : null;
		const knownNet = net && unknownSales === 0 ? net : null;
		const currency = item.purchase?.currency;
		result.items.push({ id: item.id, status, heldDays,
			netCost: knownNet && currency ? { amount: format(knownNet), currency } : null,
			dailyCost: knownNet && currency && heldDays !== null && heldDays > 0 ? { amount: daily(knownNet, heldDays), currency } : null,
			zeroDays: heldDays === 0, negativeNet: !!knownNet && knownNet.n < 0n, unknownSale: unknownSales > 0 });
		if (cost && currency) {
			const group = groupFor(currency);
			group.purchased = add(group.purchased, cost);
			group.unknownSales += unknownSales;
		}
		for (const [recoveryCurrency, amount] of recoveries) {
			const group = groupFor(recoveryCurrency);
			group.recovered = add(group.recovered, amount);
			if (!cost) group.unknownPurchases++;
		}
	}
	result.currencies = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([currency, group]) => ({
		currency, purchased: format(group.purchased), recovered: format(group.recovered), unknownSales: group.unknownSales, unknownPurchases: group.unknownPurchases,
		netCost: group.unknownSales || group.unknownPurchases ? null : format(subtract(group.purchased, group.recovered)),
	}));
	const summaries = new Map<string, { inventory: Decimal; dailyCost: Decimal; unknownDaily: number }>();
	const byId = new Map(items.map(item => [item.id, item]));
	for (const metric of result.items) {
		const item = byId.get(metric.id)!;
		result.summary.total++;
		result.summary.statuses[metric.status]++;
		if (exited(metric.status)) result.summary.exited++; else result.summary.inStock++;
		if (item.purchase) {
			const currency = item.purchase.currency;
			const group = summaries.get(currency) ?? { inventory: ZERO, dailyCost: ZERO, unknownDaily: 0 };
			if (!exited(metric.status)) group.inventory = add(group.inventory, money(item.purchase));
			if (metric.dailyCost) group.dailyCost = add(group.dailyCost, decimal(metric.dailyCost.amount)); else group.unknownDaily++;
			summaries.set(currency, group);
		}
	}
	result.summary.currencies = [...summaries].sort(([a], [b]) => a.localeCompare(b)).map(([currency, group]) => ({ currency, inventory: format(group.inventory), dailyCost: format(group.dailyCost), unknownDaily: group.unknownDaily }));
	return result;
}
/** Every month is replayed independently; today's projection is never used for historical state. */
export function belongingMonthlyTrend(items: readonly Belonging[], year: number): BelongingStatistics[] {
	if (!Number.isInteger(year) || year < 100 || year > 9999) throw new ArchiveError('invalid-belonging-date');
	return Array.from({ length: 12 }, (_, month) => {
		const date = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
		return belongingStatistics(items, date);
	});
}

function effectiveEvents(item: Belonging, asOf: string): Belonging['events'] {
	const effective: Belonging['events'] = [];
	for (const event of item.events) {
		if (event.values.date > asOf) break;
		if (event.undoOf) {
			if (effective.at(-1)?.rowId !== event.undoOf) throw new ArchiveError('invalid-belonging-undo');
			effective.pop();
		} else effective.push(event);
	}
	return effective;
}

export interface BelongingAnnualReport {
	year: number;
	asOf: string;
	years: number[];
	empty: boolean;
	purchasedCount: number;
	/** Number of completed holding cycles whose final exit date is in the selected year. */
	exitedCount: number;
	unknownPurchases: number;
	unknownPurchaseDates: number;
	unknownSaleCurrencies: number;
	currencies: Array<{ currency: string; purchased: string; recovered: string; unknownSales: number; monthly: string[] }>;
	categories: Array<{ name: string; count: number }>;
	/** Cumulative holding metrics at the report cutoff, identical to cards queried at that date. */
	holdings: Array<BelongingStatistics['items'][number] & { name: string }>;
	medianHeldDays: number | null;
	unknownHoldingDays: number;
}

/** Annual flows use effective cycles; returns never erase past realized recovery. No currency conversion. */
export function belongingAnnualReport(items: readonly Belonging[], year: number, today: string): BelongingAnnualReport {
	if (!Number.isInteger(year) || year < 100 || year > 9999) throw new ArchiveError('invalid-belonging-date');
	day(today);
	const prefix = String(year).padStart(4, '0'), start = `${prefix}-01-01`, asOf = `${prefix}-12-31` < today ? `${prefix}-12-31` : today;
	const statistics = belongingStatistics(items, asOf);
	const groups = new Map<string, { purchased: Decimal; recovered: Decimal; unknownSales: number; monthly: Decimal[] }>();
	const groupFor = (currency: string) => {
		const group = groups.get(currency) ?? { purchased: ZERO, recovered: ZERO, unknownSales: 0, monthly: Array.from({ length: 12 }, () => ZERO) };
		groups.set(currency, group); return group;
	};
	const categories = new Map<string, number>(), years = new Set<number>([Number(today.slice(0, 4)), year]);
	let purchasedCount = 0, exitedCount = 0, unknownPurchases = 0, unknownPurchaseDates = 0, unknownSaleCurrencies = 0;
	for (const item of items) {
		for (const date of [item.purchaseDate, ...item.events.map(event => event.values.date)]) {
			if (date && date <= today) years.add(Number(date.slice(0, 4)));
		}
		if (item.purchaseDate && item.purchaseDate > asOf) continue;
		if (!item.purchaseDate) unknownPurchaseDates++;
		if (item.purchaseDate?.startsWith(prefix) && item.purchaseDate <= asOf && asOf >= start) {
			purchasedCount++;
			categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
			if (item.purchase) {
				const group = groupFor(item.purchase.currency), cost = money(item.purchase);
				group.purchased = add(group.purchased, cost);
				const month = Number(item.purchaseDate.slice(5, 7)) - 1;
				if (month >= 0 && month < 12) group.monthly[month] = add(group.monthly[month]!, cost);
			} else unknownPurchases++;
		}
		let status: BelongingStatus = 'using', exitDate = '', sale: BelongingMoney | null = null, wasSold = false;
		const finish = () => {
			if (exitDate < start || exitDate > asOf || !exitDate.startsWith(prefix)) return;
			exitedCount++;
			if (sale) {
				const group = groupFor(sale.currency); group.recovered = add(group.recovered, money(sale));
			} else if (wasSold) {
				if (item.purchase) groupFor(item.purchase.currency).unknownSales++;
				else unknownSaleCurrencies++;
			}
		};
		for (const event of effectiveEvents(item, asOf)) {
			const next = event.values;
			if (exited(status) && !exited(next.status)) { finish(); wasSold = false; }
			status = next.status; if (status === 'sold') wasSold = true;
			exitDate = next.exitDate; sale = next.sale ?? null;
		}
		if (exited(status)) finish();
	}
	const byId = new Map(items.map(item => [item.id, item]));
	const holdings = asOf < start ? [] : statistics.items.map(metric => ({ ...metric, name: byId.get(metric.id)!.name }));
	const days = holdings.flatMap(metric => metric.heldDays === null ? [] : [metric.heldDays]).sort((a, b) => a - b);
	const middle = Math.floor(days.length / 2);
	return { year, asOf, years: [...years].sort((a, b) => b - a), empty: asOf < start || (!purchasedCount && !exitedCount && !statistics.summary.inStock),
		purchasedCount, exitedCount, unknownPurchases, unknownPurchaseDates, unknownSaleCurrencies,
		currencies: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([currency, group]) => ({ currency, purchased: format(group.purchased), recovered: format(group.recovered), unknownSales: group.unknownSales, monthly: group.monthly.map(format) })),
		categories: [...categories].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })), holdings,
		medianHeldDays: days.length ? days.length % 2 ? days[middle]! : (days[middle - 1]! + days[middle]!) / 2 : null,
		unknownHoldingDays: holdings.length - days.length };
}
