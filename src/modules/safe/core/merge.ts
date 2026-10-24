import { nextTimestamp, type SafeCredential, type SafeEntry } from './model';

/**
 * Counts reported after a merge import.
 * - `addedEntries`: backup entries with no counterpart; they were added as new entries.
 * - `mergedEntries`: backup entries that matched an existing one and changed it.
 * - `skippedEntries`: matched entries that held nothing new (every account was already present or older).
 * - `addedCredentials` / `updatedCredentials` / `skippedCredentials`: account blocks inside matched entries.
 * - `skippedTrashed`: entries that were in the backup's trash; they are never imported.
 */
export interface MergeSummary {
	addedEntries: number;
	mergedEntries: number;
	skippedEntries: number;
	addedCredentials: number;
	updatedCredentials: number;
	skippedCredentials: number;
	skippedTrashed: number;
}

export const emptyMergeSummary = (): MergeSummary => ({
	addedEntries: 0, mergedEntries: 0, skippedEntries: 0, addedCredentials: 0, updatedCredentials: 0, skippedCredentials: 0, skippedTrashed: 0,
});

/** Nothing would be written when no entry was added and no matched entry changed. */
export const mergeChangesAnything = (summary: MergeSummary): boolean => summary.addedEntries > 0 || summary.mergedEntries > 0;

export interface MergeContext {
	now: number;
	newId: () => string;
}

/** Websites compare without scheme, `www.`, case or trailing slashes; titles without case and outer spaces. */
export function entryMatchKey(entry: Pick<SafeEntry, 'title' | 'url'>): string | null {
	const title = entry.title.trim().toLowerCase();
	const url = entry.url.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
	return title === '' && url === '' ? null : `${title}\n${url}`;
}

interface CredentialMerge {
	credentials: SafeCredential[];
	added: number;
	updated: number;
	skipped: number;
}

/**
 * For each backup account, in order:
 * - same username and the same password and note: already present, skipped;
 * - same username but a different password or note: the more recently updated one is kept in place (an equal time
 *   keeps the current one), so the account is either updated or skipped;
 * - a username the entry does not have: appended as a new account.
 * Accounts that are not replaced stay exactly as they were; nothing is ever dropped silently, because the unchanged
 * file this import started from is saved as an encrypted backup first.
 */
function mergeCredentials(target: readonly SafeCredential[], source: readonly SafeCredential[], newId: () => string): CredentialMerge {
	const credentials = target.map((credential) => ({ ...credential }));
	const used = new Set(credentials.map((credential) => credential.id));
	const result: CredentialMerge = { credentials, added: 0, updated: 0, skipped: 0 };
	for (const incoming of source) {
		const same = credentials.find((credential) => credential.username === incoming.username && credential.password === incoming.password)
			?? credentials.find((credential) => credential.username === incoming.username);
		if (!same) {
			const id = used.has(incoming.id) ? newId() : incoming.id;
			used.add(id);
			credentials.push({ ...incoming, id });
			result.added++;
		} else if (same.password === incoming.password && same.notes === incoming.notes) {
			result.skipped++;
		} else if (incoming.updatedAt > same.updatedAt) {
			same.password = incoming.password;
			same.notes = incoming.notes;
			same.updatedAt = incoming.updatedAt;
			result.updated++;
		} else {
			result.skipped++;
		}
	}
	return result;
}

/**
 * Merge a backup's entries into the current ones without removing or replacing anything of the current safe except
 * an account that the backup holds a newer version of.
 *
 * A backup entry matches a current (not trashed) entry first by id, then by normalized title and website; entries
 * with neither title nor website only match by id. Matched entries merge their accounts; an empty icon or note is
 * filled from the backup; every other entry-level field keeps the current value. Unmatched entries are added with
 * their original timestamps (and a fresh id if theirs is already taken). Trashed backup entries are skipped.
 */
export function mergeEntries(current: readonly SafeEntry[], incoming: readonly SafeEntry[], context: MergeContext): { entries: SafeEntry[]; summary: MergeSummary } {
	const entries = current.map((entry) => ({ ...entry }));
	const summary = emptyMergeSummary();
	const byId = new Map(entries.map((entry) => [entry.id, entry]));
	const byKey = new Map<string, SafeEntry>();
	const index = (entry: SafeEntry) => {
		const key = entry.deletedAt === null ? entryMatchKey(entry) : null;
		if (key !== null && !byKey.has(key)) byKey.set(key, entry);
	};
	entries.forEach(index);
	for (const entry of incoming) {
		if (entry.deletedAt !== null) {
			summary.skippedTrashed++;
			continue;
		}
		const key = entryMatchKey(entry);
		const byIdMatch = byId.get(entry.id);
		const target = byIdMatch && byIdMatch.deletedAt === null ? byIdMatch : key === null ? undefined : byKey.get(key);
		if (!target) {
			const id = byId.has(entry.id) ? context.newId() : entry.id;
			const added = { ...entry, id, credentials: entry.credentials.map((credential) => ({ ...credential })) };
			entries.push(added);
			byId.set(id, added);
			index(added);
			summary.addedEntries++;
			continue;
		}
		const merged = mergeCredentials(target.credentials, entry.credentials, context.newId);
		let changed = merged.added + merged.updated > 0;
		target.credentials = merged.credentials;
		if (target.icon === null && entry.icon !== null) { target.icon = entry.icon; changed = true; }
		if (target.notes === '' && entry.notes !== '') { target.notes = entry.notes; changed = true; }
		summary.addedCredentials += merged.added;
		summary.updatedCredentials += merged.updated;
		summary.skippedCredentials += merged.skipped;
		if (changed) {
			// Always strictly after the entry's previous update, so concurrent copies order consistently.
			target.updatedAt = nextTimestamp(target, context.now);
			summary.mergedEntries++;
		} else {
			summary.skippedEntries++;
		}
	}
	return { entries, summary };
}
