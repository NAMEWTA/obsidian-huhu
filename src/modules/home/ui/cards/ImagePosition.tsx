// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/focal-point-picker.ts
import { displayedFocalPoint, focalPosition } from '../../core/board/focal-point';
import type { BoardStore } from '../../services/board-store';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import { useImage } from '../board/hooks';
/** Pick the focal point of a cover image by dragging, with the arrow keys or with numbers. */
export function ImagePosition({
	store,
	path,
	raw,
	onChange,
}: {
	store: BoardStore;
	path: string;
	raw: unknown;
	onChange(this: void, x: number, y: number): void;
}) {
	const url = useImage(store, path),
		point = displayedFocalPoint(raw),
		t = useT();
	return (
		<div className="grid gap-2">
			<Button
				variant="outline"
				aria-label={t('home.dashboard.focal')}
				className="h-28 w-full touch-none bg-cover bg-center"
				style={{
					backgroundImage: url ? `url(${JSON.stringify(url)})` : undefined,
					backgroundPosition: focalPosition(raw),
				}}
				onPointerDown={(e) => {
					e.currentTarget.setPointerCapture(e.pointerId);
				}}
				onPointerMove={(e) => {
					if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
					const r = e.currentTarget.getBoundingClientRect();
					onChange(
						Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
						Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
					);
				}}
				onKeyDown={(e) => {
					const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0,
						dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
					if (dx || dy) {
						e.preventDefault();
						onChange(point.x + dx, point.y + dy);
					}
				}}
			/>
			<div className="flex gap-2">
				{(['x', 'y'] as const).map((axis) => (
					<Label key={axis}>
						{axis.toUpperCase()}
						<Input
							type="number"
							min={0}
							max={100}
							value={Math.round(point[axis])}
							onChange={(e) =>
								onChange(
									axis === 'x' ? +e.target.value : point.x,
									axis === 'y' ? +e.target.value : point.y,
								)
							}
						/>
					</Label>
				))}
				<Button variant="outline" onClick={() => onChange(50, 50)}>
					{t('home.dashboard.centerImage')}
				</Button>
			</div>
		</div>
	);
}
