import { ArchiveError, type EntityRecord, type Values } from '../schema/model';
import { identifier, object, equal, copy } from '../schema/value';
import { validPrecisionDate } from '../schema/fields';
import { exited, day, money } from './statistics';
import type { Belonging, BelongingEvent, BelongingMoney, BelongingStatus, TransitionBelonging } from './model';
export const BELONGING_FIELDS = ['status', 'exitDate', 'sale', 'events'] as const;
export const BELONGING_STATUSES: readonly BelongingStatus[] = ['using', 'idle', 'sold', 'discard'];
function status(value: unknown): BelongingStatus {
	if (!BELONGING_STATUSES.includes(value as BelongingStatus)) throw new ArchiveError('invalid-belonging-status');
	return value as BelongingStatus;
}
function readMoney(value: unknown): BelongingMoney | undefined {
	if (value === undefined || value === null) return undefined;
	if (!object(value) || typeof value.amount !== 'string' || typeof value.currency !== 'string' || Object.keys(value).some(key => key !== 'amount' && key !== 'currency')) throw new ArchiveError('invalid-money');
	const result = { amount: value.amount, currency: value.currency };
	money(result);
	return result;
}
/** Validates both the append-only history and its current projection. Invalid external edits are never normalized away. */
export function parseBelonging(entity: Pick<EntityRecord, 'id' | 'values' | 'contentHash'>): Belonging {
	const v = entity.values;
	const purchaseDate = typeof v.purchaseDate === 'string' && v.purchaseDate ? v.purchaseDate : undefined;
	if (purchaseDate && !validPrecisionDate(purchaseDate)) throw new ArchiveError('invalid-belonging-date');
	const purchase = readMoney(v.purchase), events: BelongingEvent[] = [];
	if (!Array.isArray(v.events) || v.events.length > 10000) throw new ArchiveError('invalid-belonging-history');
	let current: BelongingStatus = 'using', exitDate = '', sale: BelongingMoney | null = null, previousDate = '', cycleStart = purchaseDate ?? '';
	const ids = new Set<string>();
	const snapshots: Array<{ current: BelongingStatus; exitDate: string; sale: BelongingMoney | null; cycleStart: string }> = [];
	for (const row of v.events) {
		if (!object(row) || !identifier(row.rowId) || ids.has(row.rowId) || !object(row.values)) throw new ArchiveError('invalid-belonging-history');
		const next = row.values, nextStatus = status(next.status);
		if (typeof next.date !== 'string' || typeof next.exitDate !== 'string' || typeof next.commandHash !== 'string' || !/^[a-f0-9]{64}$/.test(next.commandHash)) throw new ArchiveError('invalid-belonging-history');
		day(next.date);
		if (next.date < previousDate || (purchaseDate && next.date < purchaseDate)) throw new ArchiveError('invalid-belonging-date');
		const nextSale = readMoney(next.sale) ?? null;
		if (nextSale && purchase && nextSale.currency !== purchase.currency) throw new ArchiveError('currency-mismatch');
		const snapshot = { current, exitDate, sale, cycleStart };
		if (row.undoOf !== undefined) {
			const previous = events.at(-1), restored = snapshots.at(-1);
			if (!previous || previous.undoOf || row.undoOf !== previous.rowId || !restored ||
				nextStatus !== restored.current || next.exitDate !== restored.exitDate || !equal(nextSale, restored.sale))
				throw new ArchiveError('invalid-belonging-undo');
			({ current, exitDate, sale, cycleStart } = restored);
			snapshots.push(snapshot); previousDate = next.date; ids.add(row.rowId);
			events.push(copy({ ...row, rowId: row.rowId, values: next }) as BelongingEvent);
			continue;
		}
		snapshots.push(snapshot);
		if (exited(current) && !exited(nextStatus)) cycleStart = next.date;
		if (exited(nextStatus)) {
			day(next.exitDate);
			if (next.exitDate > next.date || (cycleStart && next.exitDate < cycleStart)) throw new ArchiveError('invalid-belonging-date');
			if (exited(current) && current !== nextStatus && next.exitDate !== exitDate) throw new ArchiveError('invalid-belonging-history');
			if (nextStatus === 'discard' && !equal(nextSale, exited(current) ? sale : null)) throw new ArchiveError('invalid-belonging-history');
		} else if (next.exitDate || nextSale) throw new ArchiveError('invalid-belonging-history');
		if (nextStatus === current && (!exited(current) || (exitDate === next.exitDate && equal(sale, nextSale)))) throw new ArchiveError('invalid-belonging-transition');
		current = nextStatus; exitDate = next.exitDate; sale = nextSale; previousDate = next.date; ids.add(row.rowId);
		// Known lifecycle fields are validated above; retain optional and user-defined columns exactly.
		events.push(copy({ ...row, rowId: row.rowId, values: next }) as BelongingEvent);
	}
	if (status(v.status) !== current || (v.exitDate ?? '') !== exitDate || !equal(readMoney(v.sale) ?? null, sale)) throw new ArchiveError('invalid-belonging-projection');
	return { id: entity.id, name: typeof v.name === 'string' ? v.name : '', category: typeof v.category === 'string' ? v.category : '',
		...Object.fromEntries(['image', 'specification', 'notes', 'receipt', 'ownerId', 'companyId'].filter(key => typeof v[key] === 'string').map(key => [key, v[key]])),
		...(Array.isArray(v.relatedPeople) ? { relatedPeople: v.relatedPeople.filter((id): id is string => typeof id === 'string') } : {}),
		purchaseDate, purchase, status: current, exitDate, sale, events, contentHash: entity.contentHash };
}
export function initialBelongingValues(values: Values): Values {
	if ((values.status !== undefined && values.status !== 'using') || (values.exitDate && values.exitDate !== '') || values.sale != null || (values.events !== undefined && (!Array.isArray(values.events) || values.events.length))) throw new ArchiveError('belonging-transition-required');
	const result = { ...values, status: 'using', exitDate: '', sale: null, events: [] };
	parseBelonging({ id: 'new', contentHash: '', values: result });
	return result;
}
export function transitionValues(item: Belonging, input: TransitionBelonging, hash: string, today: string): Pick<Belonging, 'status' | 'exitDate' | 'sale' | 'events'> {
	const next = status(input.status), date = input.date ?? today;
	day(date);
	if (!identifier(input.operationId) || item.events.length >= 10000) throw new ArchiveError('invalid-belonging-history');
	const exitDate = exited(next) ? input.exitDate ?? (exited(item.status) ? item.exitDate : date) : '';
	if (!exited(next) && (input.exitDate || input.sale != null)) throw new ArchiveError('invalid-belonging-transition');
	if (next === 'discard' && input.sale !== undefined) throw new ArchiveError('invalid-belonging-transition');
	const sale = exited(next) ? next === 'sold' ? input.sale === undefined ? exited(item.status) ? item.sale : null : input.sale : exited(item.status) ? item.sale : null : null;
	const events = [...copy(item.events), { rowId: input.operationId, values: { status: next, date, exitDate, sale, commandHash: hash } }];
	const values: Values = { name: item.name, category: item.category, purchaseDate: item.purchaseDate, purchase: item.purchase, status: next, exitDate, sale, events };
	parseBelonging({ id: item.id, contentHash: '', values });
	return { status: next, exitDate, sale, events };
}

/** Compensation cancels the last physical transition, retaining both rows for audit. */
export function undoValues(item: Belonging, originalOperationId: string, operationId: string, hash: string, today: string): Pick<Belonging, 'status' | 'exitDate' | 'sale' | 'events'> {
	const last = item.events.at(-1);
	if (!last || last.rowId !== originalOperationId || last.undoOf || item.events.length >= 10000) throw new ArchiveError('invalid-belonging-undo');
	const previous = item.events.at(-2)?.values;
	const restored = { status: previous?.status ?? 'using' as const, exitDate: previous?.exitDate ?? '', sale: previous?.sale ?? null };
	const events = [...copy(item.events), { rowId: operationId, undoOf: originalOperationId, values: { ...restored, date: today < last.values.date ? last.values.date : today, commandHash: hash } }];
	parseBelonging({ id: item.id, contentHash: '', values: { ...item, ...restored, events } });
	return { ...restored, events };
}
