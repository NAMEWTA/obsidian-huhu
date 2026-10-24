import { expect, test } from 'vitest';
import { layoutGraph } from './graph';
import { buildRefBadges } from './refs';

const row = (rows: ReturnType<typeof layoutGraph>, hash: string) => rows.find((r) => r.hash === hash)!;

test('a linear history stays in one lane with an in and an out segment per row', () => {
	const rows = layoutGraph([{ hash: 'c', parents: ['b'] }, { hash: 'b', parents: ['a'] }, { hash: 'a', parents: [] }]);
	expect(rows.map((r) => r.column)).toEqual([0, 0, 0]);
	expect(rows[0]!.segments).toEqual([{ type: 'out', lane: 0, color: rows[0]!.color }]);
	expect(rows[1]!.segments.map((s) => s.type)).toEqual(['in', 'out']);
	expect(rows[2]!.segments.map((s) => s.type)).toEqual(['in']);
	expect(new Set(rows.map((r) => r.color)).size).toBe(1);
});

test('a fork opens a second lane and the merge curves back into the first', () => {
	// m merges f (feature) into main; both descend from base.
	const rows = layoutGraph([
		{ hash: 'm', parents: ['b2', 'f'] },
		{ hash: 'f', parents: ['base'] },
		{ hash: 'b2', parents: ['base'] },
		{ hash: 'base', parents: [] },
	]);
	const merge = row(rows, 'm');
	expect(merge.column).toBe(0);
	expect(merge.segments.filter((s) => s.type === 'out').map((s) => s.lane)).toEqual([0, 1]);
	const feature = row(rows, 'f');
	expect(feature.column).toBe(1);
	expect(feature.segments.some((s) => s.type === 'pass' && s.lane === 0)).toBe(true);
	expect(feature.color).not.toBe(merge.color);
	// b2 reaches base first: the feature lane moves over to column 0, so the shared parent stays on the left.
	expect(row(rows, 'b2').segments.find((s) => s.type === 'pass')).toMatchObject({ lane: 1, to: 0 });
	const base = row(rows, 'base');
	expect(base.column).toBe(0);
	expect(base.segments.filter((s) => s.type === 'in').map((s) => s.lane)).toEqual([0]);
	expect(base.width).toBe(1);
});

test('the second parent joins a lane that already waits for it', () => {
	const rows = layoutGraph([
		{ hash: 'x', parents: ['p'] },
		{ hash: 'y', parents: ['p', 'q'] },
		{ hash: 'p', parents: [] },
		{ hash: 'q', parents: [] },
	]);
	const y = row(rows, 'y');
	expect(y.column).toBe(1);
	// p is already expected in lane 0: y's first parent curves there instead of opening a lane.
	expect(y.segments.filter((s) => s.type === 'out')[0]!.lane).toBe(0);
});

test('unrelated roots use separate lanes and free lanes are reused', () => {
	const rows = layoutGraph([
		{ hash: 'a2', parents: ['a1'] },
		{ hash: 'b2', parents: ['b1'] },
		{ hash: 'a1', parents: [] },
		{ hash: 'b1', parents: [] },
		{ hash: 'c1', parents: [] },
	]);
	expect([row(rows, 'a2').column, row(rows, 'b2').column]).toEqual([0, 1]);
	expect(row(rows, 'b1').column).toBe(1);
	expect(row(rows, 'c1').column).toBe(0);
});

test('parents outside the loaded page leave their lane open', () => {
	const rows = layoutGraph([{ hash: 'a', parents: ['gone'] }]);
	expect(rows[0]!.segments).toEqual([{ type: 'out', lane: 0, color: rows[0]!.color }]);
});

test('ref badges classify heads, remotes and tags, merging a remote branch into its local one', () => {
	const badges = buildRefBadges(
		[
			{ name: 'refs/heads/main', hash: 'h1' },
			{ name: 'refs/remotes/origin/main', hash: 'h1' },
			{ name: 'refs/remotes/origin/HEAD', hash: 'h1' },
			{ name: 'refs/remotes/origin/dev', hash: 'h2' },
			{ name: 'refs/tags/0.0.6', hash: 'h1' },
			{ name: 'refs/stash', hash: 'h3' },
			{ name: 'refs/huhu/pre-squash', hash: 'h3' },
		],
		{ branch: 'main', hash: 'h1' },
	);
	expect(badges.get('h1')).toEqual([
		{ kind: 'local', name: 'main', remotes: ['origin'], current: true },
		{ kind: 'remote', name: 'origin/HEAD' },
		{ kind: 'tag', name: '0.0.6' },
	]);
	expect(badges.get('h2')).toEqual([{ kind: 'remote', name: 'origin/dev' }]);
	expect(badges.has('h3')).toBe(false);
});

test('a detached head gets its own badge', () => {
	const badges = buildRefBadges([], { branch: null, hash: 'abc' });
	expect(badges.get('abc')).toEqual([{ kind: 'head', name: 'HEAD', current: true }]);
});
