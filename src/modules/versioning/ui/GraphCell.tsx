import { useEffect, useRef, useState } from 'react';
import { LANE_COLORS, type GraphRow } from '../core/graph';

export const LANE_WIDTH = 16;
export const ROW_HEIGHT = 44;
const MIN_WIDTH = 48;

const laneX = (lane: number) => LANE_WIDTH / 2 + lane * LANE_WIDTH;
const colorOf = (index: number) => `var(--chart-${(index % LANE_COLORS) + 1})`;

/** Total width of a graph column that has to hold `lanes` lanes. */
export const graphWidth = (lanes: number) => Math.max(lanes * LANE_WIDTH, MIN_WIDTH);

/** The lane drawing of one commit row: dot, straight lines, and curves where branches fork and merge. */
export function GraphCell({
	row,
	width,
	head,
	hollow = false,
	below = false,
	above = false,
	merge = false,
	worktree = false,
}: {
	row?: GraphRow;
	width: number;
	head?: boolean;
	hollow?: boolean;
	below?: boolean;
	above?: boolean;
	merge?: boolean;
	worktree?: boolean;
}) {
	const svg = useRef<SVGSVGElement>(null);
	const [height, setHeight] = useState(ROW_HEIGHT);
	useEffect(() => {
		const node = svg.current,
			owner = node?.ownerDocument.defaultView;
		if (!node || !owner) return;
		const observer = new owner.ResizeObserver(() => setHeight(node.getBoundingClientRect().height || ROW_HEIGHT));
		observer.observe(node);
		return () => observer.disconnect();
	}, []);
	const mid = height / 2;
	const column = row?.column ?? 0;
	const dotX = laneX(column);
	return (
		<svg
			ref={svg}
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
			className="block h-full shrink-0 overflow-hidden"
			aria-hidden="true"
			focusable="false"
		>
			{row?.segments.map((segment, index) => {
				const x = laneX(segment.lane);
				let d: string;
				if (segment.type === 'pass') {
					const to = laneX(segment.to ?? segment.lane);
					d =
						to === x
							? `M${x} 0V${height}`
							: `M${x} 0V${mid - 2}C${x} ${mid + 4} ${to} ${mid + 2} ${to} ${height}`;
				} else if (segment.type === 'in')
					d = x === dotX ? `M${x} 0V${mid}` : `M${x} 0C${x} ${mid} ${dotX} ${mid - 4} ${dotX} ${mid}`;
				else
					d =
						x === dotX
							? `M${x} ${mid}V${height}`
							: `M${dotX} ${mid}C${dotX} ${mid + 4} ${x} ${mid} ${x} ${height}`;
				return (
					<path
						key={index}
						d={d}
						fill="none"
						strokeWidth={1.5}
						strokeLinecap="round"
						style={{ stroke: colorOf(segment.color) }}
					/>
				);
			})}
			{above && (
				<path
					d={`M${dotX} 0V${mid}`}
					fill="none"
					strokeWidth={1.5}
					strokeDasharray="2 2"
					className="stroke-muted-foreground"
				/>
			)}
			{below && (
				<path
					d={`M${dotX} ${mid}V${height}`}
					fill="none"
					strokeWidth={1.5}
					strokeDasharray="2 2"
					className="stroke-muted-foreground"
				/>
			)}
			{worktree ? (
				<circle cx={dotX} cy={mid} r={4.5} className="fill-status-warning" />
			) : merge ? (
				<circle cx={dotX} cy={mid} r={5} style={{ fill: colorOf(row?.color ?? 0) }} />
			) : hollow ? (
				<circle
					cx={dotX}
					cy={mid}
					r={4}
					strokeWidth={1.5}
					className="fill-background stroke-muted-foreground"
				/>
			) : head ? (
				<circle
					cx={dotX}
					cy={mid}
					r={4.5}
					strokeWidth={2}
					className="fill-background"
					style={{ stroke: colorOf(row?.color ?? 0) }}
				/>
			) : (
				<circle
					cx={dotX}
					cy={mid}
					r={3.5}
					strokeWidth={1}
					className="stroke-background"
					style={{ fill: colorOf(row?.color ?? 0) }}
				/>
			)}
		</svg>
	);
}

/** Lanes that continue below a row (what an expanded panel under that row has to keep drawing). */
export function lanesBelow(row: GraphRow | undefined): { lane: number; color: number }[] {
	const found = new Map<number, number>();
	for (const segment of row?.segments ?? []) {
		if (segment.type === 'in') continue;
		found.set(segment.type === 'pass' ? (segment.to ?? segment.lane) : segment.lane, segment.color);
	}
	return [...found].map(([lane, color]) => ({ lane, color }));
}

/** Vertical lane lines that fill the height of an expanded panel, so the graph does not break at it. */
export function LaneFill({ lanes, dashed }: { lanes: readonly { lane: number; color: number }[]; dashed?: number }) {
	return (
		<svg className="absolute inset-0 block h-full w-full overflow-hidden" aria-hidden="true" focusable="false">
			{lanes.map(({ lane, color }) => (
				<line
					key={lane}
					x1={laneX(lane)}
					x2={laneX(lane)}
					y1={0}
					y2="100%"
					strokeWidth={1.5}
					style={{ stroke: colorOf(color) }}
				/>
			))}
			{dashed !== undefined && (
				<line
					x1={laneX(dashed)}
					x2={laneX(dashed)}
					y1={0}
					y2="100%"
					strokeWidth={1.5}
					strokeDasharray="2 2"
					className="stroke-muted-foreground"
				/>
			)}
		</svg>
	);
}
