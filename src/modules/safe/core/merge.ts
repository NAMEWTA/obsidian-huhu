import { collectTags, nextTimestamp, relationKey, sameCredential, type SafeCredential, type SafeEntry } from './model';

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

/** Stable identity first; never conflate unnamed planned accounts simply because both usernames are empty. */
function matchingCredential(target: readonly SafeCredential[], incoming: SafeCredential, sameEntry: boolean): SafeCredential | undefined {
	const byId = target.find(item => item.id === incoming.id);
	if (byId && (sameEntry || (byId.username === incoming.username && byId.email === incoming.email && byId.phone === incoming.phone))) return byId;
	if (incoming.username) return target.find(item => item.username === incoming.username && item.password === incoming.password)
		?? target.find(item => item.username === incoming.username);
	const matches = target.filter(item => !item.username && (incoming.email || incoming.phone)
		&& item.email === incoming.email && item.phone === incoming.phone);
	return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Allocate all identities before remapping edges, so a forward reference survives ID collisions and entry merges.
 * Missing targets stay references, not copied credentials; current objects are never mutated.
 */
export function mergeEntries(current: readonly SafeEntry[], incoming: readonly SafeEntry[], context: MergeContext): { entries: SafeEntry[]; summary: MergeSummary } {
	const entries = structuredClone([...current]);
	const summary = emptyMergeSummary();
	const entryIds = new Map<string, string>();
	const accountIds = new Map<string, { entryId: string; credentialId: string }>();
	const plans: { source: SafeEntry; target: SafeEntry; added: boolean; before: string;
		accounts: { source: SafeCredential; target: SafeCredential; added: boolean }[] }[] = [];
	for (const source of incoming) {
		if (source.deletedAt !== null) { summary.skippedTrashed++; continue; }
		const key = entryMatchKey(source);
		let target = entries.find(item => item.deletedAt === null && item.id === source.id)
			?? (key === null ? undefined : entries.find(item => item.deletedAt === null && entryMatchKey(item) === key));
		const added = !target;
		if (!target) {
			target = { ...structuredClone(source), id: entries.some(item => item.id === source.id) ? context.newId() : source.id, credentials: [] };
			entries.push(target);
		}
		entryIds.set(source.id, target.id);
		plans.push({ source, target, added, before: JSON.stringify(target), accounts: [] });
	}
	for (const plan of plans) {
		for (const source of plan.source.credentials) {
			let target = matchingCredential(plan.target.credentials, source, plan.target.id === plan.source.id);
			const added = !target;
			if (!target) {
				target = structuredClone(source);
				if (plan.target.credentials.some(item => item.id === target!.id)) target.id = context.newId();
				plan.target.credentials.push(target);
			}
			accountIds.set(relationKey({ entryId: plan.source.id, credentialId: source.id }), { entryId: plan.target.id, credentialId: target.id });
			plan.accounts.push({ source, target, added });
		}
	}
	for (const plan of plans) {
		for (const account of plan.accounts) {
			const mapped = { ...structuredClone(account.source), id: account.target.id,
				relations: account.source.relations.map(relation => ({ ...relation,
					...(accountIds.get(relationKey(relation)) ?? { entryId: entryIds.get(relation.entryId) ?? relation.entryId }),
				})) };
			// A merged duplicate can turn two old identities into one. Never introduce a self-link.
			mapped.relations = mapped.relations.filter(relation => relation.entryId !== plan.target.id || relation.credentialId !== mapped.id)
				.filter((relation, index, all) => all.findIndex(item => relationKey(item) === relationKey(relation)) === index);
			if (account.added) {
				Object.assign(account.target, mapped);
				if (!plan.added) summary.addedCredentials++;
			} else if (!sameCredential(account.target, mapped) && mapped.updatedAt > account.target.updatedAt) {
				Object.assign(account.target, mapped);
				if (!plan.added) summary.updatedCredentials++;
			} else if (!plan.added) summary.skippedCredentials++;
		}
		if (plan.added) { summary.addedEntries++; continue; }
		plan.target.tags = collectTags([plan.target, plan.source]);
		if (plan.target.icon === null) plan.target.icon = plan.source.icon;
		if (plan.target.notes === '') plan.target.notes = plan.source.notes;
		if (JSON.stringify(plan.target) !== plan.before) {
			plan.target.updatedAt = nextTimestamp(plan.target, context.now);
			summary.mergedEntries++;
		} else summary.skippedEntries++;
	}
	return { entries, summary };
}
