import type { DocumentValue } from './document-repository';
import { huhuName } from './vault-layout';

export interface CollectionDocument extends DocumentValue {
	id: string;
	path: string;
}
/** Domain-owned mapping; infrastructure never knows a habit, book or ledger entry. */
export interface DocumentCollectionCodec<T> {
	root: string;
	/** When a configurable folder also contains other HUHU documents, leave those owners untouched. */
	ownedTypes?: readonly string[];
	/** Keys owned by this domain, including keys absent after changing a variant. */
	managedProperties?: readonly string[];
	/** Delete dependent records before their parents so an interrupted write remains readable. Lower values go first. */
	deletionPriority?(document: CollectionDocument): number;
	empty(): T;
	encode(value: T): CollectionDocument[];
	decode(documents: CollectionDocument[]): T;
}
/** A document's folder/file name: no spaces, no characters a filesystem refuses (see `huhuName`). */
export function documentName(name: string): string {
	return huhuName(name);
}
export function collectionDocument(
	id: string,
	path: string,
	type: string,
	properties: Record<string, unknown>,
	rows?: Array<Record<string, unknown>>,
): CollectionDocument {
	return { id, path, properties: { 'huhu-type': type, 'huhu-id': id, ...properties }, ...(rows ? { rows } : {}) };
}

/** A document's own properties, without the collection's `huhu-type`/`huhu-id` bookkeeping. */
export function documentProperties(document: CollectionDocument): Record<string, unknown> {
	const { 'huhu-type': _type, 'huhu-id': _id, ...properties } = document.properties;
	return properties;
}

/**
 * Record-table rows as the domain wrote them: empty cells (read back as null) are left out, and `storageKeys`
 * that only the table needs (such as a row id derived from the timestamp) are removed.
 */
export function recordRows<T>(document: CollectionDocument, storageKeys: readonly string[] = []): T[] {
	return (document.rows ?? []).map((row) => Object.fromEntries(Object.entries(row).filter(([key, value]) => value !== null && !storageKeys.includes(key))) as T);
}
