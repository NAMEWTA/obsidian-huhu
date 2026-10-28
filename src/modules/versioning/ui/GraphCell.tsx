import { LANE_COLORS, type GraphRow } from '../core/graph';

export const LANE_WIDTH = 16;
export const ROW_HEIGHT = 32;
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
}: {
	row?: GraphRow;
	width: number;
	head?: boolean;
	hollow?: boolean;
	below?: boolean;
	above?: boolean;
}) {
	const mid = ROW_HEIGHT / 2;
	const column = row?.column ?? 0;
	const dotX = laneX(column);
	return (
		<svg
			width={width}
			height={ROW_HEIGHT}
			viewBox={`0 0 ${width} ${ROW_HEIGHT}`}
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
							? `M${x} 0V${ROW_HEIGHT}`
							: `M${x} 0V${mid - 2}C${x} ${mid + 4} ${to} ${mid + 2} ${to} ${ROW_HEIGHT}`;
				} else if (segment.type === 'in')
					d = x === dotX ? `M${x} 0V${mid}` : `M${x} 0C${x} ${mid} ${dotX} ${mid - 4} ${dotX} ${mid}`;
				else
					d =
						x === dotX
							? `M${x} ${mid}V${ROW_HEIGHT}`
							: `M${dotX} ${mid}C${dotX} ${mid + 4} ${x} ${mid} ${x} ${ROW_HEIGHT}`;
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
					d={`M${dotX} ${mid}V${ROW_HEIGHT}`}
					fill="none"
					strokeWidth={1.5}
					strokeDasharray="2 2"
					className="stroke-muted-foreground"
				/>
			)}
			{hollow ? (
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
