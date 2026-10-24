/**
 * Fuzzy match of a typed query against a name: every query character must appear in order. Higher is better:
 * a contiguous hit beats a scattered one, an early hit beats a late one, a hit at a word start beats a mid-word hit.
 * Returns null when the query does not match.
 */
export function fuzzyScore(query: string, text: string): number | null {
	const q = query.trim().toLowerCase(),
		s = text.toLowerCase();
	if (!q) return 0;
	const whole = s.indexOf(q);
	if (whole >= 0)
		return 1000 - whole * 2 - (s.length - q.length) * 0.5 + (whole > 0 && /[\s\-_/.]/.test(s[whole - 1]!) ? 20 : 0);
	let at = 0,
		score = 500,
		last = -1;
	for (const ch of q) {
		if (/\s/.test(ch)) continue;
		const found = s.indexOf(ch, at);
		if (found < 0) return null;
		score -= last >= 0 ? Math.min(found - last - 1, 30) : Math.min(found, 30);
		last = found;
		at = found + 1;
	}
	return score;
}

/** The items matching `query`, best match first; ties keep the order given. */
export function fuzzyFilter<T>(items: readonly T[], query: string, textOf: (item: T) => string, limit = 20): T[] {
	return items
		.map((item, order) => ({ item, order, score: fuzzyScore(query, textOf(item)) }))
		.filter((row): row is { item: T; order: number; score: number } => row.score !== null)
		.sort((a, b) => b.score - a.score || a.order - b.order)
		.slice(0, limit)
		.map((row) => row.item);
}
