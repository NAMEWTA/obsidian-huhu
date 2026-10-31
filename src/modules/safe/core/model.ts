/** One fixed set of limits per field; the container format itself is unchanged (`huhu-safe` version 1). */
export const SAFE_LIMITS = {
	title: 200,
	url: 2048,
	username: 512,
	password: 4096,
	phone: 128,
	email: 512,
	tag: 64,
	notes: 32768,
} as const;

/** Accounts (username + password blocks) one entry can hold. */
export const MAX_CREDENTIALS = 50;
export const MAX_RELATIONS = 50;
export const MAX_ENTRY_TAGS = 32;
/** A custom icon is a small data URL kept inside the encrypted payload, never a separate plaintext file. */
export const ICON_MAX_CHARS = 32768;
/** The plaintext schema stored inside the encrypted payload. Versions 1 (single account) and 2 (multiple accounts) are upgraded on unlock. */
export const PAYLOAD_VERSION = 3;

export const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_CONTAINER_BYTES = 10 * 1024 * 1024;
export const CLIPBOARD_CLEAR_MS = 30 * 1000;
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export type SafeErrorCode =
	| 'invalid-format'
	| 'invalid-entry'
	| 'invalid-relation'
	| 'invalid-password'
	| 'too-large'
	| 'unlock-failed'
	| 'crypto-unavailable'
	| 'storage'
	| 'conflict'
	| 'conflict-unsaved'
	| 'missing'
	| 'exists'
	| 'changed'
	| 'export-target'
	| 'invalid-url'
	| 'clipboard'
	| 'canceled'
	| 'locked'
	| 'stale-entry'
	| 'not-found';

/** Only fixed codes may cross the module's error boundary, never raw parser or I/O errors. */
export class SafeError extends Error {
	constructor(readonly code: SafeErrorCode) {
		super(code);
		this.name = 'SafeError';
	}
}

/** A directed, metadata-only link. The tuple is stable even after names or positions change. */
export interface AccountRelation {
	entryId: string;
	credentialId: string;
	kind: 'login' | 'related';
}

/** All account fields may be empty; a planned or federated account need not have a password. */
export interface CredentialInput {
	id: string;
	username: string;
	password: string;
	phone: string;
	email: string;
	notes: string;
	relations: AccountRelation[];
}

export interface SafeCredential extends CredentialInput {
	updatedAt: string;
}

/** What the editor submits: an entry (title, website, icon, note) with an ordered list of accounts. */
export interface EntryInput {
	title: string;
	url: string;
	notes: string;
	/** A validated image data URL, or null for the generated initial/colour tile. */
	icon: string | null;
	tags: string[];
	credentials: CredentialInput[];
}

export interface SafeEntry extends EntryInput {
	credentials: SafeCredential[];
	id: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

export interface SafePayload {
	version: typeof PAYLOAD_VERSION;
	entries: SafeEntry[];
}

const inputKeys = ['title', 'url', 'notes', 'icon', 'tags', 'credentials'] as const;
const entryKeys = [...inputKeys, 'id', 'createdAt', 'updatedAt', 'deletedAt'];
const credentialKeys = ['id', 'username', 'password', 'phone', 'email', 'notes', 'relations'] as const;
const storedCredentialKeys = [...credentialKeys, 'updatedAt'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const iconPattern = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export function isSafeId(value: unknown): value is string {
	return typeof value === 'string' && uuidPattern.test(value);
}

export function recordWithKeys(value: unknown, keys: readonly string[], exact = true): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		&& (!exact || Object.keys(value).length === keys.length) && keys.every((key) => Object.hasOwn(value, key));
}

export function validText(value: unknown, maximum: number): value is string {
	if (typeof value !== 'string' || value.length > maximum * 2) return false;
	return [...value].length <= maximum;
}

/** PNG, JPEG or WebP only (no SVG, which can carry script): the data URL and its decoded magic bytes must agree. */
export function isIconDataUrl(value: unknown): value is string {
	if (typeof value !== 'string' || value.length > ICON_MAX_CHARS) return false;
	const match = iconPattern.exec(value);
	if (!match || match[2]!.length % 4 !== 0) return false;
	let head: string;
	try {
		head = atob(match[2]!.slice(0, 16));
	} catch {
		return false;
	}
	const bytes = [...head].map((character) => character.charCodeAt(0));
	if (match[1] === 'png') return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
	if (match[1] === 'jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
	return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

function validCredentialFields(value: Record<string, unknown>): boolean {
	return isSafeId(value.id) && validText(value.username, SAFE_LIMITS.username) && validText(value.password, SAFE_LIMITS.password)
		&& validText(value.notes, SAFE_LIMITS.notes) && validText(value.phone, SAFE_LIMITS.phone) && validText(value.email, SAFE_LIMITS.email);
}

/** User-defined labels remain encrypted metadata; trim only at the explicit editing boundary. */
export function tagName(value: string): string {
	const name = value.trim();
	if (!name || !validText(name, SAFE_LIMITS.tag) || [...name].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new SafeError('invalid-entry');
	return name;
}

export const relationKey = (relation: Pick<AccountRelation, 'entryId' | 'credentialId'>): string => `${relation.entryId}/${relation.credentialId}`;

function validateRelations(value: unknown): AccountRelation[] {
	if (!Array.isArray(value) || value.length > MAX_RELATIONS) throw new SafeError('invalid-entry');
	const seen = new Set<string>();
	return value.map((item: unknown) => {
		if (!recordWithKeys(item, ['entryId', 'credentialId', 'kind']) || !isSafeId(item.entryId) || !isSafeId(item.credentialId)
			|| (item.kind !== 'login' && item.kind !== 'related')) throw new SafeError('invalid-entry');
		const relation: AccountRelation = { entryId: item.entryId, credentialId: item.credentialId, kind: item.kind };
		const key = relationKey(relation);
		if (seen.has(key)) throw new SafeError('invalid-entry');
		seen.add(key);
		return relation;
	});
}

function validateTags(value: unknown): string[] {
	if (!Array.isArray(value) || value.length > MAX_ENTRY_TAGS) throw new SafeError('invalid-entry');
	const seen = new Set<string>();
	return value.map((tag: unknown) => {
		if (typeof tag !== 'string' || tagName(tag) !== tag || seen.has(tag.toLowerCase())) throw new SafeError('invalid-entry');
		seen.add(tag.toLowerCase());
		return tag;
	});
}

/** Validation never trims, normalizes or truncates saved credentials. Returned arrays are independent snapshots. */
export function validateEntryInput(value: unknown): EntryInput {
	if (!recordWithKeys(value, inputKeys, false)
		|| !validText(value.title, SAFE_LIMITS.title) || !validText(value.url, SAFE_LIMITS.url) || !validText(value.notes, SAFE_LIMITS.notes)
		|| (value.icon !== null && !isIconDataUrl(value.icon))
		|| !Array.isArray(value.credentials) || value.credentials.length < 1 || value.credentials.length > MAX_CREDENTIALS) {
		throw new SafeError('invalid-entry');
	}
	const tags = validateTags(value.tags);
	const ids = new Set<string>();
	const credentials = value.credentials.map((credential: unknown): CredentialInput => {
		if (!recordWithKeys(credential, credentialKeys, false) || !validCredentialFields(credential) || ids.has(credential.id as string)) {
			throw new SafeError('invalid-entry');
		}
		ids.add(credential.id as string);
		return {
			id: credential.id as string, username: credential.username as string, password: credential.password as string,
			phone: credential.phone as string, email: credential.email as string, notes: credential.notes as string,
			relations: validateRelations(credential.relations),
		};
	});
	return { title: value.title, url: value.url, notes: value.notes, icon: value.icon, tags, credentials };
}

/** A master password is nonempty, with no product length limit and no normalization or trimming. */
export function validateMasterPassword(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0) throw new SafeError('invalid-password');
	// UTF-8 encoding replaces isolated surrogates; reject those rather than silently changing the key input.
	for (const character of value) {
		const code = character.codePointAt(0) ?? 0;
		if (code >= 0xd800 && code <= 0xdfff) throw new SafeError('invalid-password');
	}
	return value;
}

export function isTimestamp(value: unknown): value is string {
	if (typeof value !== 'string' || value.length !== 24) return false;
	const time = Date.parse(value);
	return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function validateStoredCredential(value: unknown): SafeCredential {
	if (!recordWithKeys(value, storedCredentialKeys) || !validCredentialFields(value) || !isTimestamp(value.updatedAt)) throw new SafeError('invalid-format');
	return { id: value.id as string, username: value.username as string, password: value.password as string, phone: value.phone as string, email: value.email as string, notes: value.notes as string, relations: validateRelations(value.relations), updatedAt: value.updatedAt };
}

function validateEntry(value: unknown): SafeEntry {
	if (!recordWithKeys(value, entryKeys) || !isSafeId(value.id)
		|| !isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)
		|| value.updatedAt < value.createdAt
		|| (value.deletedAt !== null && (!isTimestamp(value.deletedAt)
			|| value.deletedAt < value.createdAt || value.deletedAt > value.updatedAt))) {
		throw new SafeError('invalid-format');
	}
	try {
		const input = validateEntryInput(value);
		const credentials = (value.credentials as unknown[]).map(validateStoredCredential);
		return { ...input, credentials, id: value.id, createdAt: value.createdAt, updatedAt: value.updatedAt, deletedAt: value.deletedAt };
	} catch {
		throw new SafeError('invalid-format');
	}
}

export function makePayload(entries: SafeEntry[]): SafePayload {
	return { version: PAYLOAD_VERSION, entries };
}

export function assertPayloadSize(payload: SafePayload): void {
	if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_PAYLOAD_BYTES) throw new SafeError('too-large');
}

/** Authenticated plaintext still needs a strict schema and an independent size bound. */
export function validatePayload(value: unknown): SafePayload {
	if (!recordWithKeys(value, ['version', 'entries']) || value.version !== PAYLOAD_VERSION || !Array.isArray(value.entries)) throw new SafeError('invalid-format');
	const ids = new Set<string>();
	const entries = value.entries.map((value: unknown) => {
		const entry = validateEntry(value);
		if (ids.has(entry.id)) throw new SafeError('invalid-format');
		ids.add(entry.id);
		if (entry.credentials.some(credential => credential.relations.some(relation => relation.entryId === entry.id && relation.credentialId === credential.id))) throw new SafeError('invalid-format');
		return entry;
	});
	const payload = makePayload(entries);
	assertPayloadSize(payload);
	return payload;
}

export function timestamp(now: number): string {
	if (!Number.isFinite(now)) throw new SafeError('invalid-entry');
	const date = new Date(now);
	if (!Number.isFinite(date.getTime())) throw new SafeError('invalid-entry');
	const result = date.toISOString();
	if (!isTimestamp(result)) throw new SafeError('invalid-entry');
	return result;
}

export function createEntry(input: EntryInput, id: string, now: number): SafeEntry {
	if (!isSafeId(id)) throw new SafeError('invalid-entry');
	const time = timestamp(now);
	const value = validateEntryInput(input);
	return { ...value, credentials: value.credentials.map((credential) => ({ ...credential, updatedAt: time })), id, createdAt: time, updatedAt: time, deletedAt: null };
}

export function nextTimestamp(entry: SafeEntry, now: number): string {
	return timestamp(Math.max(now, Date.parse(entry.updatedAt) + 1));
}

export const sameCredential = (a: CredentialInput, b: CredentialInput): boolean => a.username === b.username && a.password === b.password
	&& a.phone === b.phone && a.email === b.email && a.notes === b.notes && JSON.stringify(a.relations) === JSON.stringify(b.relations);

/** A credential keeps its own update time unless its fields change; reordering never counts as a change. */
export function editEntry(entry: SafeEntry, input: EntryInput, now: number): SafeEntry {
	if (entry.deletedAt !== null) throw new SafeError('invalid-entry');
	const value = validateEntryInput(input);
	const time = nextTimestamp(entry, now);
	const previous = new Map(entry.credentials.map((credential) => [credential.id, credential]));
	const credentials = value.credentials.map((credential): SafeCredential => {
		const old = previous.get(credential.id);
		return old && sameCredential(old, credential) ? old : { ...credential, updatedAt: time };
	});
	return { ...entry, ...value, credentials, updatedAt: time };
}

export function deleteEntry(entry: SafeEntry, now: number): SafeEntry {
	if (entry.deletedAt !== null) throw new SafeError('invalid-entry');
	const time = nextTimestamp(entry, now);
	return { ...entry, updatedAt: time, deletedAt: time };
}

export function restoreEntry(entry: SafeEntry, now: number): SafeEntry {
	if (entry.deletedAt === null) throw new SafeError('invalid-entry');
	return { ...entry, updatedAt: nextTimestamp(entry, now), deletedAt: null };
}

export function pruneExpiredTrash(payload: SafePayload, now: number): SafePayload {
	return makePayload(payload.entries.filter((entry) => entry.deletedAt === null || now - Date.parse(entry.deletedAt) < TRASH_RETENTION_MS));
}

/**
 * AND across words, OR across fields. Entries are searched by title, website and note, and by every account's
 * username and note; passwords are intentionally never part of the index.
 */
export function searchEntries(entries: readonly SafeEntry[], query: string, trash = false, tags: readonly string[] = []): SafeEntry[] {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	return entries.filter((entry) => {
		if ((entry.deletedAt !== null) !== trash || !tags.every(tag => entry.tags.some(value => value.toLowerCase() === tag.toLowerCase()))) return false;
		const fields = [entry.title, entry.url, entry.notes, ...entry.tags, ...entry.credentials.flatMap((credential) => [credential.username, credential.phone, credential.email, credential.notes])].map((value) => value.toLowerCase());
		return words.every((word) => fields.some((field) => field.includes(word)));
	}).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** The text a tile, row or card shows for an entry that has no title. */
export function entryLabel(entry: { title: string; url: string; credentials: readonly { username: string; email?: string; phone?: string }[] }): string {
	return entry.title || entry.url || entry.credentials[0]?.username || entry.credentials[0]?.email || entry.credentials[0]?.phone || '';
}

/** Passwords must never be used as the display name of an otherwise empty account. */
export function credentialLabel(credential: Pick<CredentialInput, 'username' | 'email' | 'phone'>): string {
	return credential.username || credential.email || credential.phone;
}

/** One catalog derived from encrypted records; no plaintext label index or second source of truth. */
export function collectTags(entries: readonly Pick<SafeEntry, 'tags'>[]): string[] {
	const tags = new Map<string, string>();
	for (const entry of entries) for (const tag of entry.tags) if (!tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
	return [...tags.values()].sort((a, b) => a.localeCompare(b));
}

/** Rename/merge or detach a label in active entries and trash, without touching credential timestamps. */
export function renameEntryTag(entries: readonly SafeEntry[], from: string, to: string | null, now: number): SafeEntry[] {
	const key = tagName(from).toLowerCase();
	const name = to === null ? null : tagName(to);
	return entries.map(entry => {
		if (!entry.tags.some(tag => tag.toLowerCase() === key)) return entry;
		const tags = collectTags([{ tags: entry.tags.flatMap(tag => tag.toLowerCase() === key ? name === null ? [] : [name] : [tag]) }]);
		return { ...entry, tags, updatedAt: nextTimestamp(entry, now) };
	});
}

/** Newly added links must resolve to a live account; old dangling links remain visible and removable, never guessed. */
export function validateNewRelations(entries: readonly SafeEntry[], next: SafeEntry, previous?: SafeEntry): void {
	for (const credential of next.credentials) {
		const old = previous?.credentials.find(item => item.id === credential.id);
		for (const relation of credential.relations) {
			if (relation.entryId === next.id && relation.credentialId === credential.id) throw new SafeError('invalid-relation');
			if (old?.relations.some(item => relationKey(item) === relationKey(relation))) continue;
			const target = relation.entryId === next.id ? next : entries.find(entry => entry.id === relation.entryId && entry.deletedAt === null);
			if (!target?.credentials.some(item => item.id === relation.credentialId)) throw new SafeError('invalid-relation');
		}
	}
}
