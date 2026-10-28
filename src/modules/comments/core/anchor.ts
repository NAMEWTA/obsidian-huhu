// Adapted from jonaas-dev/obsidian-margin-comments f727e38 (MIT), Copyright (c) 2026 jonaas-dev: src/anchor.ts
import { boundedLevenshtein, approximateRanges } from "./fuzzy";
import type { TextAnchorV2 } from "./model";
import { hashString } from "./hash";

/** Characters of surrounding text kept on each side of an anchor. */
export const CONTEXT_LENGTH = 50;

// One-document cache avoids hashing the same note once per annotation.
// This is only a lookup optimization, never a second persistence store.
let fingerprintSource: string | undefined;
let fingerprintValue = '';
function documentFingerprint(doc: string): string {
	if (doc !== fingerprintSource) {
		fingerprintSource = doc;
		fingerprintValue = hashString(doc);
	}
	return fingerprintValue;
}

const AMBIGUOUS = 'ambiguous' as const;
type AnchorResolution = AnchorMatch | typeof AMBIGUOUS | null;


type MatchMethod = "hash" | "context" | "fuzzy";

interface AnchorMatch {
	from: number;
	to: number;
	/** Matching stage used to establish the position. */
	method: MatchMethod;
}

/** 1-based line number containing `offset`. */
/** 1-based line number containing `offset`. Exported for src/threads.ts. */
export function lineNumberAt(doc: string, offset: number): number {
	let line = 1;
	for (let i = 0; i < offset && i < doc.length; i++) {
		if (doc[i] === "\n") line++;
	}
	return line;
}

function lineRangeAt(doc: string, offset: number): { from: number; to: number } {
	// Offset 0 is the start of line 1 whatever is there. Clamping the search to 0
	// instead made a note beginning with a blank line find that newline and report
	// the line after it, so the anchor recorded context from before the start of
	// the document (#261).
	const from = offset === 0 ? 0 : doc.lastIndexOf("\n", offset - 1) + 1;
	const nextBreak = doc.indexOf("\n", offset);
	return { from, to: nextBreak === -1 ? doc.length : nextBreak };
}

/**
 * Build an anchor for a selection, or for the whole line when `from === to`.
 *
 * Position fields are advisory: they narrow the search later but are never the
 * sole source of truth, so a comment survives edits above it.
 */
export function createAnchor(doc: string, from: number, to: number, kind: "line" | "range" = from === to ? "line" : "range"): TextAnchorV2 {
	from = clamp(from, 0, doc.length);
	to = clamp(to, from, doc.length);
	const isLineComment = kind === "line";
	const range = isLineComment ? lineRangeAt(doc, from) : { from, to };
	const text = doc.slice(range.from, range.to);


	return {
		text,
		textHash: hashString(text),
		kind,
		documentHash: documentFingerprint(doc),
		before: doc.slice(Math.max(0, range.from - CONTEXT_LENGTH), range.from),
		after: doc.slice(range.to, range.to + CONTEXT_LENGTH),
		lineHint: lineNumberAt(doc, range.from),
		start: range.from,
		end: range.to,
	};
}

/** Every offset in `doc` where `needle` occurs. */
function occurrences(doc: string, needle: string): number[] {
	if (needle === "") return [];
	const found: number[] = [];
	for (let i = doc.indexOf(needle); i !== -1; i = doc.indexOf(needle, i + 1)) {
		found.push(i);
	}
	return found;
}

/**
 * Stage 1: locate the anchor by exact content.
 *
 * Content rather than position is what makes a comment survive the note being
 * reorganised. A line hint is advisory, not proof of identity.
 */
/**
 * How much of the stored surroundings a candidate still has, 0 to 2.
 *
 * Both sides, so a candidate that merely shares the words before it cannot
 * outrank one that sits in the right place entirely.
 */
function contextScore(doc: string, from: number, to: number, anchor: TextAnchorV2): number {
	const before = anchor.before.length
		? suffixMatchAt(doc, from, anchor.before) / anchor.before.length
		: 0;
	const after = anchor.after.length
		? prefixMatchAt(doc, to, anchor.after) / anchor.after.length
		: 0;
	return before + after;
}

/** Exact content plus a unique best context; line proximity cannot resolve a tie. */
function resolveByHash(doc: string, anchor: TextAnchorV2): AnchorResolution {
	const { text } = anchor;
	if (text === '' || hashString(text) !== anchor.textHash) return null;
	const found = occurrences(doc, text).filter(at => anchor.kind !== 'line' || (lineRangeAt(doc, at).from === at && lineRangeAt(doc, at).to === at + text.length));
	let best: number | null = null;
	let bestScore = -1;
	let tied = false;
	for (const offset of found) {
		const score = contextScore(doc, offset, offset + text.length, anchor);
		if (score > bestScore) {
			best = offset;
			bestScore = score;
			tied = false;
		} else if (score === bestScore) tied = true;
	}
	if (tied) return AMBIGUOUS;
	return best === null ? null : { from: best, to: best + text.length, method: 'hash' };
}

export function matchByHash(doc: string, anchor: TextAnchorV2): AnchorMatch | null {
	const result = resolveByHash(doc, anchor);
	return result === AMBIGUOUS ? null : result;
}


/**
 * How much of `context`'s tail is still there, reading backwards from `end`.
 *
 * Indices rather than slices: doc.slice(0, end) copies the whole note on every
 * candidate, which is the difference between a scan that is felt and one that
 * is not.
 */
function suffixMatchAt(doc: string, end: number, context: string): number {
	let n = 0;
	while (n < end && n < context.length && doc[end - 1 - n] === context[context.length - 1 - n])
		n++;
	return n;
}

/** How much of `context`'s head is still there, reading forwards from `start`. */
function prefixMatchAt(doc: string, start: number, context: string): number {
	let n = 0;
	while (start + n < doc.length && n < context.length && doc[start + n] === context[n]) n++;
	return n;
}

/** Fraction of the stored context that still matches, 0 to 1. */
const CONTEXT_MATCH_RATIO = 0.6;
/** Below this many characters, context is too weak to identify anything. */
const MIN_CONTEXT_CHARS = 8;

/**
 * The shortest tail of `context` that any acceptable match must contain verbatim.
 *
 * A match needs CONTEXT_MATCH_RATIO of the context to survive, and the surviving
 * part is measured from the edge nearest the anchor — so that many characters,
 * at that edge, are present in every candidate. Searching for them with indexOf
 * turns "look at every offset" into "look at the few that can possibly work".
 */
function probeLength(context: string): number {
	return Math.ceil(context.length * CONTEXT_MATCH_RATIO);
}

/** First value at or after `least`, by binary search over a sorted list. */
function firstAtLeast(sorted: number[], least: number): number | null {
	let low = 0;
	let high = sorted.length;
	while (low < high) {
		const mid = (low + high) >> 1;
		if (sorted[mid]! < least) low = mid + 1;
		else high = mid;
	}
	return low < sorted.length ? sorted[low]! : null;
}

/** Offsets where the given probe occurs, as candidate anchor boundaries. */
function probePositions(doc: string, probe: string): number[] {
	const found: number[] = [];
	for (let i = doc.indexOf(probe); i !== -1; i = doc.indexOf(probe, i + 1)) found.push(i);
	return found;
}

/**
 * Stage 2: the commented text itself was edited, but its surroundings survived.
 *
 * Both sides must agree. Anchoring on one side alone would place the comment on
 * whatever text happens to sit next to the surviving half, which is worse than
 * reporting the anchor as lost.
 *
 * Candidates come from an exact search for the inner tail of each context, not
 * from walking every offset. Scanning was quadratic in the one case that matters
 * — context intact, text rewritten — and cost 1.4 seconds per comment on a
 * 10,000 line note, which is felt as the editor freezing while typing.
 */
function resolveByContext(doc: string, anchor: TextAnchorV2): AnchorResolution {
	const { before, after } = anchor;
	if (before.length < MIN_CONTEXT_CHARS || after.length < MIN_CONTEXT_CHARS) {
		return null;
	}

	const beforeProbe = before.slice(before.length - probeLength(before));
	const afterProbe = after.slice(0, probeLength(after));
	// Both probes are located once. Searching for the closing probe from inside
	// the loop rescans the note per candidate, and a probe that repeats on every
	// line — the tail of an ordinary sentence — makes that quadratic again.
	const afterPositions = probePositions(doc, afterProbe);

	let best: { from: number; to: number; score: number } | null = null;
	let tied = false;

	for (const position of probePositions(doc, beforeProbe)) {
		const start = position + beforeProbe.length;
		const beforeScore = suffixMatchAt(doc, start, before) / before.length;
		if (beforeScore < CONTEXT_MATCH_RATIO) continue;

		// The first end that clears the bar is the tightest span, and any end that
		// clears it starts with the probe.
		const end = firstAtLeast(afterPositions, start);
		if (end === null || end - start < anchor.text.length * 0.5 || end - start > anchor.text.length * 2) continue;
		if (anchor.kind === "line" && (lineRangeAt(doc, start).from !== start || lineRangeAt(doc, start).to !== end)) continue;

		const afterScore = prefixMatchAt(doc, end, after) / after.length;
		if (afterScore < CONTEXT_MATCH_RATIO) continue;

		const score = beforeScore + afterScore;
		if (!best || score > best.score) { best = { from: start, to: end, score }; tied = false; }
		else if (score === best.score) tied = true;
	}

	if (tied) return AMBIGUOUS;
	return best ? { from: best.from, to: best.to, method: "context" } : null;
}

export function matchByContext(doc: string, anchor: TextAnchorV2): AnchorMatch | null {
	const result = resolveByContext(doc, anchor);
	return result === AMBIGUOUS ? null : result;
}

/**
 * Where every empty line in `doc` begins.
 *
 * An empty line is a line start with nothing before the next break — including
 * the position at the very end of a note that ends in a newline, which is a line
 * a reader can put the cursor on and comment.
 */
function emptyLineStarts(doc: string): number[] {
	const starts: number[] = [];
	if (doc.length === 0 || doc.startsWith("\n")) starts.push(0);
	for (let i = doc.indexOf("\n"); i !== -1; i = doc.indexOf("\n", i + 1)) {
		const next = i + 1;
		if (next === doc.length || doc[next] === "\n") starts.push(next);
	}
	return starts;
}

/**
 * Whether a side of the context is all there was, rather than all we kept.
 *
 * CONTEXT_LENGTH characters were stored, so anything shorter ran into the start
 * or the end of the note. A short side is then complete rather than weak, which
 * matters because the notes where this goes wrong are short ones (#261).
 */
const isComplete = (context: string): boolean => context.length < CONTEXT_LENGTH;

/**
 * Re-anchor a comment that was made on an empty line.
 *
 * An empty line has no text of its own: stage 1 has nothing to hash, stage 3
 * refuses an empty signature, and stage 2 wants eight characters on both sides,
 * which an empty line between two short paragraphs does not have. So several
 * ordinary empty lines were orphaned the moment the comment was made (#261).
 *
 * The candidates are the note's empty lines, which is a much stronger constraint
 * than stage 2 has: a comment on a blank line can only go on a blank line. That
 * is what makes it safe to accept **one** strong side here, where stage 2
 * deliberately refuses to — typing at the end of the paragraph above is the
 * commonest edit next to an empty line, and it destroys the side before it while
 * leaving the side after it untouched.
 *
 * A side that is empty because the note starts or ends there cannot vouch for
 * anything, so it never counts as the strong one. With neither side strong the
 * comment is reported lost, which is recoverable; placing it somewhere arbitrary
 * is not.
 */
/**
 * Whether one side of the context is good enough to place the comment on its own.
 *
 * A side that is empty because the note starts or ends there vouches for
 * nothing. A short one that is all the note had is judged on matching in full;
 * one we truncated at CONTEXT_LENGTH is judged on its ratio, because the part we
 * kept is a sample rather than the whole neighbourhood.
 */
function vouchesFor(context: string, score: number): boolean {
	if (context === "" || score < CONTEXT_MATCH_RATIO) return false;
	return isComplete(context) || context.length >= CONTEXT_LENGTH;
}

function matchEmptyLine(doc: string, anchor: TextAnchorV2): AnchorMatch | null {
	const { before, after } = anchor;
	if (doc === '' && before === '' && after === '' && anchor.kind === 'line') return { from: 0, to: 0, method: 'context' };
	let best: { at: number; score: number } | null = null;
	let tied = false;
	for (const at of emptyLineStarts(doc)) {
		const beforeScore = before === '' ? 1 : suffixMatchAt(doc, at, before) / before.length;
		const afterScore = after === '' ? 1 : prefixMatchAt(doc, at, after) / after.length;
		if (!vouchesFor(before, beforeScore) && !vouchesFor(after, afterScore)) continue;
		const score = beforeScore + afterScore;
		if (!best || score > best.score) { best = { at, score }; tied = false; }
		else if (score === best.score) tied = true;
	}
	return best && !tied ? { from: best.at, to: best.at, method: 'context' } : null;
}


/** Lines either side of the last known position that stage 3 will search. */
export const FUZZY_WINDOW_LINES = 200;

/** Character range covering `lineHint` ± `radius` lines. */
function windowAround(doc: string, lineHint: number, radius: number): { from: number; to: number } {
	// A sidecar's hint is only known to be finite (#345). The loop below counts
	// whole lines from 1, so a fractional bound or one before line 1 is never
	// reached and the window silently ran to the end of the note.
	const hint = Math.max(1, Math.round(lineHint));
	const first = Math.max(1, hint - radius);
	const last = hint + radius;

	let line = 1;
	let from = first === 1 ? 0 : -1;
	let to = doc.length;
	for (let i = 0; i < doc.length; i++) {
		if (doc[i] !== "\n") continue;
		line++;
		if (line === first) from = i + 1;
		if (line === last + 1) {
			to = i;
			break;
		}
	}
	// The note now ends before the window starts. Defaulting to its first line
	// searched the whole note, re-anchoring a comment to text hundreds of lines
	// from where it lived (#262). Nothing in such a note is near that line.
	if (from === -1) return { from: doc.length, to: doc.length };
	return { from, to };
}

/** Last-resort whole-quote matching, restricted to the line hint ±200 lines. */
export function matchByFuzzy(
	doc: string,
	anchor: TextAnchorV2,
	threshold: number,
): AnchorMatch | null {
	const text = anchor.text;
	if (text === "") return null;
	const tolerance = Math.ceil(text.length * threshold);
	const window = windowAround(doc, anchor.lineHint, FUZZY_WINDOW_LINES);
	let best: { from: number; to: number; distance: number; score: number; lineDistance: number } | null = null;
	const matches: { from: number; to: number; distance: number }[] = [];
	if (anchor.kind === "line") {
		for (let start = window.from; start < window.to; ) {
			const end = Math.min(window.to, lineRangeAt(doc, start).to);
			matches.push({ from: start, to: end, distance: boundedLevenshtein(text, doc.slice(start, end), tolerance) });
			start = end + 1;
		}
	} else {
		const source = doc.slice(window.from, window.to);
		const priority = new Float64Array(source.length + 1);
		let line = lineNumberAt(doc, window.from);
		for (let offset = 0; offset <= source.length; offset++) {
			// All starts lie within 401 lines: one extra matching context character
			// always beats the full range of line distances. End context is constant
			// for the equal-distance paths compared in each Sellers DP state.
			priority[offset] = suffixMatchAt(doc, window.from + offset, anchor.before) * (2 * FUZZY_WINDOW_LINES + 1) - Math.abs(line - anchor.lineHint);
			if (source[offset] === "\n") line++;
		}
		for (const match of approximateRanges(text, source, tolerance, priority)) matches.push({ from: window.from + match.from, to: window.from + match.to, distance: match.distance });
	}
	for (const { from, to, distance } of matches) {
		if (distance > tolerance) continue;
		const score = contextScore(doc, from, to, anchor), lineDistance = Math.abs(lineNumberAt(doc, from) - anchor.lineHint);
		if (!best || distance < best.distance || (distance === best.distance && (score > best.score || (score === best.score && (lineDistance < best.lineDistance || (lineDistance === best.lineDistance && (from < best.from || (from === best.from && to < best.to)))))))) best = { from, to, distance, score, lineDistance };
	}
	if (!best) return null;
	// Different endpoints of one overlapping fuzzy hit are not different passages.
	// Equally good disjoint passages are ambiguous, irrespective of the line hint.
	const winner = best;
	if (matches.some(candidate => candidate.distance === winner.distance &&
		(candidate.to <= winner.from || candidate.from >= winner.to) &&
		contextScore(doc, candidate.from, candidate.to, anchor) === winner.score)) return null;
	return { from: winner.from, to: winner.to, method: 'fuzzy' };
}

export interface MatchOptions {
	/** Run stage 3. Off by default: see the note on cost below. */
	fuzzy?: boolean;
	threshold?: number;
}

/**
 * Re-anchor a comment, cheapest stage first.
 *
 * Stage 3 is opt-in rather than automatic. The editor decorations re-run on
 * every keystroke and stop at stage 2; the panel, which redraws far less often,
 * is where a comment earns a fuzzy search before being called orphaned.
 */
export function matchAnchor(doc: string, anchor: TextAnchorV2, options: MatchOptions = {}): AnchorMatch | null {
	// Cached offsets are authoritative only for the document that produced them.
	// An identical quote at a stale offset may belong to a different paragraph.
	if (anchor.documentHash === documentFingerprint(doc) && hashString(anchor.text) === anchor.textHash &&
		Number.isInteger(anchor.start) && Number.isInteger(anchor.end) && anchor.start >= 0 && anchor.end >= anchor.start && anchor.end <= doc.length &&
		doc.slice(anchor.start, anchor.end) === anchor.text &&
		(anchor.kind !== 'line' || (lineRangeAt(doc, anchor.start).from === anchor.start && lineRangeAt(doc, anchor.start).to === anchor.end))) {
		return { from: anchor.start, to: anchor.end, method: 'hash' };
	}
	if (anchor.text === '') {
		const context = resolveByContext(doc, anchor);
		return context === AMBIGUOUS ? null : context ?? matchEmptyLine(doc, anchor);
	}
	const forms = [anchor, ...renormalisations(anchor)];
	// An ambiguous exact match must not turn into a guessed context/fuzzy hit.
	for (const form of forms) {
		const exact = resolveByHash(doc, form);
		if (exact === AMBIGUOUS) return null;
		if (exact) return exact;
	}
	for (const form of forms) {
		const context = resolveByContext(doc, form);
		if (context === AMBIGUOUS) return null;
		if (context) return context;
	}
	return options.fuzzy ? matchByFuzzy(doc, anchor, options.threshold ?? 0.3) : null;
}


/** The two forms a note's text realistically arrives in. */
const NORMAL_FORMS = ["NFC", "NFD"] as const;

/**
 * The anchor rewritten in each normal form it is not already in.
 *
 * The **anchor** is renormalised and not the document, which is the whole trick:
 * a match found this way carries offsets into the document exactly as stored, so
 * there is no position map to build and no chance of returning an offset that
 * addresses different text. Normalising the document would shift every offset
 * after the first composed character.
 *
 * Both forms, because neither side's is known: macOS has written NFD for
 * decades, several sync clients normalise on the way through, and the two mobile
 * keyboards do not agree with each other — so one vault can hold both.
 *
 * The hash goes with the text. `matchByHash` compares hashes, so keeping the
 * stored one would make stage 1 miss everything this exists to catch.
 *
 * Costs nothing for text that has no composed characters: `normalize` returns an
 * identical string and the form is dropped, so ASCII notes do one comparison and
 * carry on.
 */
function renormalisations(anchor: TextAnchorV2): TextAnchorV2[] {
	const forms: TextAnchorV2[] = [];
	for (const form of NORMAL_FORMS) {
		const text = anchor.text.normalize(form);
		const before = anchor.before.normalize(form);
		const after = anchor.after.normalize(form);
		const unchanged =
			text === anchor.text &&
			before === anchor.before &&
			after === anchor.after;
		if (unchanged) continue;
		forms.push({
			...anchor,
			text,
			textHash: hashString(text),
			before,
			after,
		});
	}
	return forms;
}

/** Verified cached offsets, then unambiguous content/context/fuzzy recovery. */
export function locateAnchor(doc: string, anchor: TextAnchorV2, threshold = 0.3): { start: number; end: number } | null {
	const hit = matchAnchor(doc, anchor, { fuzzy: true, threshold });
	return hit ? { start: hit.from, end: hit.to } : null;
}


/** Refuse frontmatter and any intersected fenced code (including the fence itself). */
export function selectionIsCommentable(doc: string, from: number, to: number): boolean {
	if (to <= from) return false;
	const lines = doc.split('\n');
	let offset = 0;
	let frontmatter = lines[0]?.trim() === '---';
	let fence: { char: string; length: number } | null = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const end = offset + line.length + 1;
		const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
		const blocked = frontmatter || !!fence || !!marker;
		if (from < end && to > offset && blocked) return false;
		if (frontmatter && i > 0 && line.trim() === '---') frontmatter = false;
		if (!frontmatter && marker) {
			if (!fence) fence = { char: marker[0]!, length: marker.length };
			else if (marker[0] === fence.char && marker.length >= fence.length) fence = null;
		}
		offset = end;
	}
	return true;
}
function clamp(n: number, min: number, max: number): number { return Math.min(max, Math.max(min, n)); }
