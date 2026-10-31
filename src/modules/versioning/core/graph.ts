/**
 * Lane layout for a commit graph. Commits come newest first in topological order (children before parents), as
 * `git log --topo-order` prints them. The first parent continues its child's lane; later parents of a merge open
 * (or join) another lane and are drawn as curves. Written for HUHU; the algorithm is the usual "active lanes" sweep.
 */

export interface GraphInput {
	hash: string;
	parents: readonly string[];
}

/**
 * One piece of a row's drawing, in lane columns. `pass` crosses the whole row; `in` goes from the top of `lane` to
 * the commit's dot; `out` goes from the dot to the bottom of `lane`.
 */
export interface LaneSegment {
	type: 'pass' | 'in' | 'out';
	lane: number;
	/** `pass` only: the lane it ends in at the bottom when it moves over to join the commit's lane. */
	to?: number;
	/** Index into the lane palette. */
	color: number;
}

export interface GraphRow {
	hash: string;
	/** The column of the commit's dot. */
	column: number;
	color: number;
	segments: LaneSegment[];
	/** Columns used by this row (highest lane index + 1). */
	width: number;
}

export const LANE_COLORS = 5;

/** Lay out `commits`; parents that are not in the list simply leave their lane open at the bottom. */
export function layoutGraph(commits: readonly GraphInput[]): GraphRow[] {
	const lanes: (string | null)[] = [];
	const colors: number[] = [];
	let nextColor = 0;
	const takeColor = () => nextColor++ % LANE_COLORS;
	const freeLane = () => {
		const free = lanes.indexOf(null);
		return free === -1 ? lanes.length : free;
	};
	const rows: GraphRow[] = [];
	for (const commit of commits) {
		const segments: LaneSegment[] = [];
		const expecting: number[] = [];
		lanes.forEach((hash, index) => {
			if (hash === commit.hash) expecting.push(index);
		});
		lanes.forEach((hash, index) => {
			if (hash !== null && hash !== commit.hash) segments.push({ type: 'pass', lane: index, color: colors[index]! });
		});
		let column: number;
		if (expecting.length) column = expecting[0]!;
		else {
			column = freeLane();
			colors[column] = takeColor();
			lanes[column] = null;
		}
		const color = colors[column]!;
		for (const index of expecting) {
			segments.push({ type: 'in', lane: index, color: colors[index]! });
			lanes[index] = null;
		}
		let width = column + 1;
		const [first, ...rest] = commit.parents;
		if (first !== undefined) {
			const existing = lanes.indexOf(first);
			if (existing === -1) {
				lanes[column] = first;
				colors[column] = color;
				segments.push({ type: 'out', lane: column, color });
			} else if (existing > column) {
				// The parent already waits further right: pull that lane over so the main line stays on the left.
				const moving = segments.find((segment) => segment.type === 'pass' && segment.lane === existing);
				if (moving) moving.to = column;
				lanes[column] = first;
				lanes[existing] = null;
				colors[column] = color;
				segments.push({ type: 'out', lane: column, color });
			} else segments.push({ type: 'out', lane: existing, color: colors[existing]! });
			for (const parent of rest) {
				let lane = lanes.indexOf(parent);
				if (lane === -1) {
					lane = freeLane();
					lanes[lane] = parent;
					colors[lane] = takeColor();
				}
				segments.push({ type: 'out', lane, color: colors[lane]! });
			}
		}
		for (const segment of segments) width = Math.max(width, segment.lane + 1);
		while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
		rows.push({ hash: commit.hash, column, color, segments, width });
	}
	return rows;
}
