// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/recent-docs.ts
import { useStore } from 'zustand';
import { History } from 'lucide-react';
import type { BoardStore } from '../../services/board-store';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { RelativeTime } from '../../../../ui/components/huhu/RelativeTime';
import { useT } from '../../../../ui/react/hooks';
import { FileGlyph, RowButton } from '../board/rows';
/** Recently edited notes: one 36px row each (type icon, name, how long ago), the list scrolls inside its tile. */
export function RecentWidget({ store }: { store: BoardStore }) {
	const { files, settings, path } = useStore(store.state),
		t = useT();
	const rows = files
		.filter((file) => file.path !== path + '.md' && store.isRecentDocument(file.path))
		.slice(0, settings.recentDocCount);
	if (!rows.length) return <EmptyState size="sm" className="h-full" icon={<History />} title={t('recent.empty')} />;
	return (
		<ul data-recent className="m-0 flex h-full min-h-0 list-none flex-col gap-0.5 overflow-y-auto p-0">
			{rows.map((file) => (
				<li key={file.path} className="min-w-0 shrink-0">
					<RowButton
						icon={<FileGlyph path={file.path} />}
						title={file.path}
						trailing={<RelativeTime value={file.stat.mtime} />}
						onClick={() => {
							void store.openFile(file.path);
						}}
					>
						{file.basename}
					</RowButton>
				</li>
			))}
		</ul>
	);
}
