// Adapted from https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/diary/volume.ts (MIT).
// Copyright (c) 2026 叫我包仔
// Changes: readonly inputs, typed HUHU implementation, finite capacity fallback; omit unrelated reader helpers.

/** Half-open entry range [start, end); entry zero is the newest daily note. */
export interface Volume {
	start: number;
	end: number;
}

export interface MonthSpan {
	/** YYYY-MM; empty months are omitted. */
	key: string;
	n: number;
	/** One-based volume numbers in entry order. */
	vols: number[];
	/** Zero-based index of the newest entry in this month. */
	first: number;
}

export const VOLUME_CAPACITY_FALLBACK = 50;

/**
 * Dates must be valid YYYY-MM-DD strings in descending order. Prefer month boundaries;
 * a month with at least capacity entries is split by entry count. Capacity is a target,
 * not a hard limit; smaller months remain whole. Non-finite capacity falls back to 50,
 * finite values are floored and clamped to one. Inputs are never mutated.
 */
export function splitVolumes(dates: readonly string[], capacity: number = VOLUME_CAPACITY_FALLBACK): Volume[] {
	const cap = Number.isFinite(capacity) ? Math.max(1, Math.floor(capacity)) : VOLUME_CAPACITY_FALLBACK;
	const volumes: Volume[] = [];
	let start = 0;
	let index = 0;
	while (index < dates.length) {
		const month = dates[index]!.slice(0, 7);
		let end = index + 1;
		while (end < dates.length && dates[end]!.slice(0, 7) === month) end++;
		if (end - index >= cap) {
			if (index > start) {
				volumes.push({ start, end: index });
				start = index;
			}
			while (end - start >= cap) {
				volumes.push({ start, end: start + cap });
				start += cap;
			}
		} else if (end - start >= cap) {
			volumes.push({ start, end });
			start = end;
		}
		index = end;
	}
	if (start < dates.length) volumes.push({ start, end: dates.length });
	return volumes;
}

/** One-based containing volume, or -1 for an index outside the volumes. */
export function volumeOf(volumes: readonly Volume[], index: number): number {
	if (!Number.isInteger(index)) return -1;
	const volume = volumes.findIndex(({ start, end }) => index >= start && index < end);
	return volume < 0 ? -1 : volume + 1;
}

/** Dates have the same descending order as splitVolumes; no rows are generated for empty months. */
export function monthSpans(dates: readonly string[], volumes: readonly Volume[]): MonthSpan[] {
	const spans: MonthSpan[] = [];
	for (const [index, date] of dates.entries()) {
		const key = date.slice(0, 7);
		let span = spans[spans.length - 1];
		if (!span || span.key !== key) {
			span = { key, n: 0, vols: [], first: index };
			spans.push(span);
		}
		span.n++;
		const volume = volumeOf(volumes, index);
		if (volume > 0 && span.vols[span.vols.length - 1] !== volume) span.vols.push(volume);
	}
	return spans;
}
