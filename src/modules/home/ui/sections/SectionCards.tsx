// Card grid layout: shadcn/ui dashboard blocks (MIT) card grids; cards sort with @dnd-kit/sortable (MIT).
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { FolderOpen, StickyNote } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import type { DashboardColumn } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { Card } from '../cards/Card';

/**
 * The cards of a notes / to-do / projects section: equal-width columns that follow the tile's width (as many 14rem
 * columns as fit), cards of one row share their height and top edge, and a section taller than its tile scrolls
 * down inside the tile. Nothing here ever scrolls sideways.
 */
export function SectionCards({
	store,
	column,
	projects,
	onAdd,
}: {
	store: BoardStore;
	column: DashboardColumn;
	projects: boolean;
	onAdd?(this: void): void;
}) {
	const t = useT();
	if (!column.cards.length && projects)
		return (
			<EmptyState
				size="sm"
				className="min-h-0 flex-1"
				icon={<FolderOpen />}
				title={t('home.project.chooseFolder')}
				description={t('home.project.chooseFolderHint')}
				action={
					onAdd && (
						<Button variant="outline" size="sm" onClick={onAdd}>
							<FolderOpen />
							{t('home.project.new')}
						</Button>
					)
				}
			/>
		);
	if (!column.cards.length)
		return (
			<EmptyState
				size="sm"
				className="min-h-0 flex-1"
				icon={<StickyNote />}
				title={t('home.dashboard.noCards')}
				description={t('home.dashboard.noCardsHint')}
			/>
		);
	return (
		<div
			data-card-grid
			className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start gap-3 overflow-y-auto"
		>
			<SortableContext items={column.cards.map((card) => `card:${card.id}`)} strategy={rectSortingStrategy}>
				{column.cards.map((card, i) => (
					<Card key={card.id} store={store} card={card} index={i} projects={projects} />
				))}
			</SortableContext>
		</div>
	);
}
