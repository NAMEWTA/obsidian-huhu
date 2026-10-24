import { Files } from 'lucide-react';
import { t } from '../../shared/i18n';
import { HUHU_VISIBLE_ROOT } from '../../shared/storage/vault-layout';
import { Button } from '../../ui/components/button';
import { EmptyState } from '../../ui/components/huhu/EmptyState';
import { ObsidianIcon } from '../../ui/components/huhu/ObsidianIcon';
import { RelativeTime } from '../../ui/components/huhu/RelativeTime';
import { useT } from '../../ui/react/hooks';
import { cn } from '../../ui/lib/utils';
import type { OverviewRow } from './content-tree';

/**
 * The page of HUHU files: a compact overview of a folder of `huhu/`, its files by modification time. A row opens the
 * file in Obsidian's own editor or viewer (a new tab); the page never edits files itself.
 */
export function ContentOverview({
	folder,
	rows,
	total,
	onOpen,
}: {
	folder: string;
	rows: readonly OverviewRow[];
	total: number;
	onOpen: (path: string) => void;
}) {
	useT();
	return (
		<>
			<div className="flex shrink-0 items-baseline gap-2">
				<h2 className="m-0 min-w-0 truncate text-base font-semibold" title={folder}>
					{folder}
				</h2>
				<span className="shrink-0 text-xs text-muted-foreground">{t('content.fileCount', { count: total })}</span>
			</div>
			{rows.length ? (
				<ul data-content-overview className="m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0">
					{rows.map((row) => (
						<li key={row.path} className="min-w-0">
							<Button
								type="button"
								variant="ghost"
								title={row.path}
								className="h-9 w-full min-w-0 justify-start gap-2 px-2 font-normal"
								onClick={() => onOpen(row.path)}
							>
								<span
									aria-hidden
									className={cn('inline-flex shrink-0', !row.iconColor && 'text-muted-foreground')}
									style={row.iconColor ? { color: row.iconColor } : undefined}
								>
									<ObsidianIcon name={row.icon} />
								</span>
								<span className="min-w-0 flex-1 truncate text-left text-sm">{row.label}</span>
								<span className="hidden max-w-[40%] shrink-0 truncate text-xs text-muted-foreground @md:inline">
									{row.folder || HUHU_VISIBLE_ROOT}
								</span>
								<RelativeTime value={row.mtime} className="shrink-0 text-xs text-muted-foreground" />
							</Button>
						</li>
					))}
				</ul>
			) : (
				<EmptyState
					size="sm"
					className="min-h-0 flex-1"
					icon={<Files />}
					title={t('content.emptyTitle')}
					description={t('content.emptyHint', { folder })}
				/>
			)}
		</>
	);
}
