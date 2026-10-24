/**
 * Reading settings rows out of rendered settings pages. Every `SettingsRow` / `SearchableSetting` carries
 * `data-searchable-setting`; the settings index (search across all categories) and the jump-to-setting highlight
 * both identify a row by the same key, so the row found from a search result is the row that was indexed.
 */
export interface SettingRow {
	element: HTMLElement;
	/** `<tab>|<label>|<n>`: the tab panel it sits in, its label, and its place among identical labels there. */
	key: string;
	label: string;
	description: string;
	/** Tab value (`agents`) and its visible name; empty outside tabbed pages. */
	tab: string;
	tabLabel: string;
}

const text = (element: Element | null | undefined) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/** Rows below `root`, innermost only (a wrapper around a row is not a second setting), in document order. */
export function collectSettingRows(root: ParentNode): SettingRow[] {
	const seen = new Map<string, number>();
	const rows: SettingRow[] = [];
	for (const element of root.querySelectorAll<HTMLElement>('[data-searchable-setting]')) {
		if (element.querySelector('[data-searchable-setting]')) continue;
		const label = text(element.querySelector('label, [data-setting-label]'));
		if (!label) continue;
		const panel = element.closest<HTMLElement>('[role="tabpanel"]');
		const tab = panel ? (/-content-(.+)$/.exec(panel.id)?.[1] ?? '') : '';
		const trigger = panel?.getAttribute('aria-labelledby');
		const tabLabel = trigger ? text(panel?.ownerDocument.getElementById(trigger)) : '';
		const base = `${tab}|${label}`;
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		const description = text(element.querySelector('p, [data-setting-description]'));
		rows.push({ element, key: `${base}|${n}`, label, description, tab, tabLabel });
	}
	return rows;
}

/** A search result's text: every word must appear in the label, description, category or tab name. */
export function matchSettings<T extends { label: string; description: string; categoryLabel: string; tabLabel: string }>(
	entries: readonly T[],
	query: string,
	limit = 60,
): T[] {
	const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return [];
	const scored: Array<{ entry: T; score: number; order: number }> = [];
	entries.forEach((entry, order) => {
		const label = entry.label.toLocaleLowerCase();
		const all = `${label}\n${entry.description}\n${entry.categoryLabel}\n${entry.tabLabel}`.toLocaleLowerCase();
		if (!words.every((word) => all.includes(word))) return;
		// Label hits first, then description, then matches that only come from the category or tab name.
		const score = words.every((word) => label.includes(word)) ? 0 : words.every((word) => `${label}\n${entry.description}`.toLocaleLowerCase().includes(word)) ? 1 : 2;
		scored.push({ entry, score, order });
	});
	return scored
		.sort((a, b) => a.score - b.score || a.order - b.order)
		.slice(0, limit)
		.map((item) => item.entry);
}
