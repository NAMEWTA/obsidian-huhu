import { GitBranch, Tag, CloudDownload } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import type { RefBadge } from '../core/refs';

const TONE = {
	head: 'border-border bg-muted text-foreground',
	local: 'border-status-success/40 bg-status-success/15 text-status-success',
	remote: 'border-status-info/40 bg-status-info/15 text-status-info',
	tag: 'border-status-warning/40 bg-status-warning/15 text-status-warning',
} as const;

/** Branch, remote and tag labels in front of a commit message (Git Graph style). */
export function RefBadges({ badges }: { badges: readonly RefBadge[] }) {
	return (
		<>
			{badges.map((badge) => (
				<span
					key={`${badge.kind}:${badge.name}`}
					className={cn('inline-flex h-4 max-w-40 shrink-0 items-center gap-0.5 overflow-hidden rounded-sm border px-1 text-[11px] leading-none', TONE[badge.kind], badge.current && 'font-semibold')}
					title={badge.remotes?.length ? `${badge.name} · ${badge.remotes.join(', ')}` : badge.name}
				>
					{badge.kind === 'tag' ? <Tag className="size-2.5 shrink-0" /> : badge.kind === 'remote' ? <CloudDownload className="size-2.5 shrink-0" /> : <GitBranch className="size-2.5 shrink-0" />}
					<span className="truncate">{badge.name}</span>
					{badge.remotes?.map((remote) => (
						<span key={remote} className="shrink-0 rounded-sm bg-status-info/20 px-0.5 text-status-info">
							{remote}
						</span>
					))}
				</span>
			))}
		</>
	);
}
