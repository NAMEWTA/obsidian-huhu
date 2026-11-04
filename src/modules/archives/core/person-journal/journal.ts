import { ArchiveError, type Values } from '../schema/model';
import { validPrecisionDate } from '../schema/fields';
import { copy, identifier, object, requiredId } from '../schema/value';

export interface JournalValues {
	date: string;
	title: string;
	content: string;
	relatedEntityIds: string[];
}
export interface JournalRow { rowId: string; values: Values }
export interface JournalTarget { operationId: string; entityId: string; rowId: string; expectedHash: string }
export interface WriteJournal extends JournalTarget { values: JournalValues }

export function journalRows(value: unknown): JournalRow[] {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.length > 10000) throw new ArchiveError('invalid-person-journal');
	const ids = new Set<string>();
	for (const row of value) {
		if (!object(row) || !identifier(row.rowId) || ids.has(row.rowId) || !object(row.values)) throw new ArchiveError('invalid-person-journal');
		ids.add(row.rowId);
	}
	return copy(value) as JournalRow[];
}
function validateJournalValues(value: JournalValues): void {
	if (!object(value) || Object.keys(value).some(key => !['date', 'title', 'content', 'relatedEntityIds'].includes(key)) ||
		!validPrecisionDate(value.date, 'day') || typeof value.title !== 'string' || !value.title.trim() || typeof value.content !== 'string' ||
		!Array.isArray(value.relatedEntityIds) || !value.relatedEntityIds.every(identifier) || new Set(value.relatedEntityIds).size !== value.relatedEntityIds.length)
		throw new ArchiveError('invalid-person-journal');
}
export function changeJournal(current: unknown, rowId: string, action: 'add' | 'update' | 'remove', values?: JournalValues): JournalRow[] {
	requiredId(rowId);
	const rows = journalRows(current), index = rows.findIndex(row => row.rowId === rowId);
	if (action === 'add' && index !== -1) throw new ArchiveError('duplicate-row-id');
	if (action !== 'add' && index === -1) throw new ArchiveError('missing-journal-row');
	if (action === 'remove') return rows.filter(row => row.rowId !== rowId);
	if (!values) throw new ArchiveError('invalid-person-journal');
	validateJournalValues(values);
	if (action === 'add') rows.push({ rowId, values: { ...copy(values) } });
	else { const row = rows[index]!; rows[index] = { ...row, values: { ...row.values, ...copy(values) } }; }
	return rows;
}
