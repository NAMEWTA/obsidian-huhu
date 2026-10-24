import {
	MAX_PAYLOAD_BYTES,
	SAFE_LIMITS,
	SafeError,
	isSafeId,
	isTimestamp,
	makePayload,
	recordWithKeys,
	validText,
	validatePayload,
	type SafeEntry,
	type SafePayload,
} from './model';

/**
 * Payload schema 1 (one username and password per record), as written by the first release. It is read only to be
 * upgraded; nothing writes it any more.
 */
export interface LegacyEntry {
	title: string;
	url: string;
	username: string;
	password: string;
	notes: string;
	id: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

const legacyKeys = ['title', 'url', 'username', 'password', 'notes', 'id', 'createdAt', 'updatedAt', 'deletedAt'];

/** The original strict check, unchanged: authenticated plaintext of an old vault is still validated field by field. */
function validateLegacyEntry(value: unknown): LegacyEntry {
	if (!recordWithKeys(value, legacyKeys) || !isSafeId(value.id)
		|| !isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)
		|| value.updatedAt < value.createdAt
		|| (value.deletedAt !== null && (!isTimestamp(value.deletedAt)
			|| value.deletedAt < value.createdAt || value.deletedAt > value.updatedAt))
		|| !validText(value.title, SAFE_LIMITS.title) || !validText(value.url, SAFE_LIMITS.url)
		|| !validText(value.username, SAFE_LIMITS.username) || !validText(value.password, SAFE_LIMITS.password)
		|| !validText(value.notes, SAFE_LIMITS.notes) || value.username === '' || value.password === '') {
		throw new SafeError('invalid-format');
	}
	return value as unknown as LegacyEntry;
}

/**
 * Every field survives: the record keeps its id, timestamps and trash state; its title and website stay on the
 * entry; its username, password and note become the entry's first and only account. A record's note was written
 * about that account, so it moves into the account block rather than the entry-level note.
 */
export function upgradeLegacyEntry(entry: LegacyEntry, newId: () => string): SafeEntry {
	return {
		title: entry.title,
		url: entry.url,
		notes: '',
		icon: null,
		credentials: [{ id: newId(), username: entry.username, password: entry.password, notes: entry.notes, updatedAt: entry.updatedAt }],
		id: entry.id,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
		deletedAt: entry.deletedAt,
	};
}

export interface ParsedPayload {
	payload: SafePayload;
	/** The schema the stored plaintext was in when it differed from the current one (it must then be written back). */
	upgradedFrom: 1 | null;
}

/** Accepts the current schema and the first release's schema; anything else is a damaged or unsupported vault. */
export function parsePayload(value: unknown, newId: () => string): ParsedPayload {
	if (recordWithKeys(value, ['version', 'entries'])) return { payload: validatePayload(value), upgradedFrom: null };
	if (!recordWithKeys(value, ['entries']) || !Array.isArray(value.entries)) throw new SafeError('invalid-format');
	const ids = new Set<string>();
	const entries = value.entries.map((item: unknown) => {
		const entry = validateLegacyEntry(item);
		if (ids.has(entry.id)) throw new SafeError('invalid-format');
		ids.add(entry.id);
		return upgradeLegacyEntry(entry, newId);
	});
	const payload = makePayload(entries);
	if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_PAYLOAD_BYTES) throw new SafeError('too-large');
	// The upgraded result must satisfy the current schema exactly, or the vault is not touched.
	return { payload: validatePayload(payload), upgradedFrom: 1 };
}
