/** Branch, remote and tag labels shown next to commits in the history graph. */

export interface RefEntry {
	/** Full ref name, e.g. `refs/heads/main`. */
	name: string;
	/** The commit it points at (tags already peeled). */
	hash: string;
}

export type RefBadgeKind = 'head' | 'local' | 'remote' | 'tag';

export interface RefBadge {
	kind: RefBadgeKind;
	name: string;
	/** Remotes whose branch of the same name points at the same commit (shown merged into the local badge). */
	remotes?: string[];
	/** The checked-out branch. */
	current?: boolean;
}

const ORDER: Record<RefBadgeKind, number> = { head: 0, local: 1, remote: 2, tag: 3 };

/** Group refs by commit and classify them. Refs outside heads, remotes and tags (stash, internal) are ignored. */
export function buildRefBadges(refs: readonly RefEntry[], head: { branch: string | null; hash: string | null }): Map<string, RefBadge[]> {
	const byHash = new Map<string, { locals: string[]; remotes: { remote: string; name: string }[]; tags: string[] }>();
	const slot = (hash: string) => {
		let entry = byHash.get(hash);
		if (!entry) byHash.set(hash, (entry = { locals: [], remotes: [], tags: [] }));
		return entry;
	};
	for (const ref of refs) {
		if (ref.name.startsWith('refs/heads/')) slot(ref.hash).locals.push(ref.name.slice('refs/heads/'.length));
		else if (ref.name.startsWith('refs/tags/')) slot(ref.hash).tags.push(ref.name.slice('refs/tags/'.length));
		else if (ref.name.startsWith('refs/remotes/')) {
			const rest = ref.name.slice('refs/remotes/'.length);
			const slash = rest.indexOf('/');
			if (slash > 0) slot(ref.hash).remotes.push({ remote: rest.slice(0, slash), name: rest.slice(slash + 1) });
		}
	}
	if (!head.branch && head.hash) slot(head.hash);
	const result = new Map<string, RefBadge[]>();
	for (const [hash, entry] of byHash) {
		const badges: RefBadge[] = [];
		if (!head.branch && head.hash === hash) badges.push({ kind: 'head', name: 'HEAD', current: true });
		const merged = new Set<number>();
		for (const local of entry.locals.sort()) {
			const remotes: string[] = [];
			entry.remotes.forEach((remote, index) => {
				if (remote.name === local) {
					remotes.push(remote.remote);
					merged.add(index);
				}
			});
			badges.push({ kind: 'local', name: local, remotes, current: local === head.branch });
		}
		entry.remotes.forEach((remote, index) => {
			if (!merged.has(index)) badges.push({ kind: 'remote', name: `${remote.remote}/${remote.name}` });
		});
		for (const tag of entry.tags.sort()) badges.push({ kind: 'tag', name: tag });
		badges.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || Number(!!b.current) - Number(!!a.current));
		result.set(hash, badges);
	}
	return result;
}
