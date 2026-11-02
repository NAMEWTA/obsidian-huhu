import { describe, expect, test } from 'vitest';
import { createAnchor, locateAnchor, matchAnchor, matchByContext, matchByFuzzy, matchByHash } from './anchor';

const quote = 'abcdefghij';
const block = 'L'.repeat(50) + quote + 'R'.repeat(50);

describe('document identity and ambiguous highlight anchors', () => {
	test('records a serializable document fingerprint without modifying Markdown', () => {
		const anchor = createAnchor(block, 50, 60);
		expect(anchor.documentHash).toMatch(/^[a-f0-9]{16}$/);
		expect(locateAnchor(block, JSON.parse(JSON.stringify(anchor)) as typeof anchor)).toEqual({ start: 50, end: 60 });
		expect(block).toBe('L'.repeat(50) + quote + 'R'.repeat(50));
	});
	test('preserves an explicit selection among identical passages in the same document', () => {
		const doc = block + '\n' + block;
		const start = doc.lastIndexOf(quote);
		const anchor = createAnchor(doc, start, start + quote.length);
		expect(locateAnchor(doc, anchor)).toEqual({ start, end: start + quote.length });
		expect(matchAnchor(doc, anchor)?.from).toBe(start);
	});
	test('does not trust a stale offset now occupied by a different paragraph', () => {
		const anchor = createAnchor(block, 50, 60);
		const changed = 'X'.repeat(50) + quote + 'Y'.repeat(50) + '\n' + block;
		expect(locateAnchor(changed, anchor)?.start).toBe(changed.lastIndexOf(quote));
	});
	test('old anchors use contextual recovery, not a position-only shortcut', () => {
		const anchor = createAnchor(block, 50, 60);
		delete anchor.documentHash;
		const changed = 'X'.repeat(50) + quote + 'Y'.repeat(50) + '\n' + block;
		expect(locateAnchor(changed, anchor)?.start).toBe(changed.lastIndexOf(quote));
	});
	test('equal exact evidence cannot be rescued by the stale line hint or fuzzy fallback', () => {
		const anchor = createAnchor(block, 50, 60);
		const changed = block + '\n' + block;
		expect(matchByHash(changed, anchor)).toBeNull();
		expect(matchAnchor(changed, anchor)).toBeNull();
		expect(matchAnchor(changed, anchor, { fuzzy: true })).toBeNull();
		expect(locateAnchor(changed, anchor)).toBeNull();
	});
	test('legacy identical passages without a document fingerprint remain detached', () => {
		const doc = block + '\n' + block;
		const anchor = createAnchor(doc, 50, 60);
		delete anchor.documentHash;
		expect(locateAnchor(doc, anchor)).toBeNull();
	});
	test('a uniquely better context still wins after hundreds of inserted lines', () => {
		const anchor = createAnchor(block, 50, 60);
		const changed = quote + '\n'.repeat(250) + block;
		expect(locateAnchor(changed, anchor)?.start).toBe(changed.lastIndexOf(quote));
	});
	test('equal context-only matches cannot fall through to fuzzy guessing', () => {
		const anchor = createAnchor(block, 50, 60);
		const edited = block.replace(quote, 'abXYefghij');
		const changed = edited + '\n' + edited;
		expect(matchByContext(changed, anchor)).toBeNull();
		expect(locateAnchor(changed, anchor)).toBeNull();
	});
	test('equally good disjoint fuzzy passages are not selected by proximity', () => {
		const anchor = createAnchor(quote, 0, quote.length);
		const changed = 'abXYefghij\nabXYefghij';
		expect(matchByFuzzy(changed, anchor, 0.3)).toBeNull();
		expect(locateAnchor(changed, anchor)).toBeNull();
	});
	test('a unique fuzzy passage is still recoverable', () => {
		expect(locateAnchor('abXYefghij', createAnchor(quote, 0, quote.length))).toEqual({ start: 0, end: 10 });
	});
	test('normalization recovery keeps UTF-16 positions in the stored document', () => {
		const text = 'Café😀';
		const doc = '前\n' + text.normalize('NFD') + '\n后';
		expect(locateAnchor(doc, createAnchor(text, 0, text.length))).toEqual({ start: 2, end: 2 + text.normalize('NFD').length });
	});
	test('normalization cannot conceal equally strong duplicate passages', () => {
		const original = 'L'.repeat(50) + 'Café' + 'R'.repeat(50);
		const edited = original.normalize('NFD');
		expect(locateAnchor(edited + '\n' + edited, createAnchor(original, 50, 54))).toBeNull();
	});
	test('new and legacy anchors on an empty document remain usable', () => {
		const anchor = createAnchor('', 0, 0);
		expect(locateAnchor('', anchor)).toEqual({ start: 0, end: 0 });
		delete anchor.documentHash;
		expect(locateAnchor('', anchor)).toEqual({ start: 0, end: 0 });
	});
	test('duplicated blank-line context remains ambiguous after external changes', () => {
		const doc = 'L'.repeat(50) + '\n\n' + 'R'.repeat(50);
		expect(locateAnchor(doc + '\n' + doc, createAnchor(doc, 51, 51))).toBeNull();
	});
});
