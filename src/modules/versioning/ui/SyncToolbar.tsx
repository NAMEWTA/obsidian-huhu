import { ArrowDown, ArrowUp, CloudDownload, GitBranch, Pause, Play, RotateCw } from 'lucide-react';
import { t } from '../../../shared/i18n';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import type { SyncService, SyncSnapshot } from '../services/sync-service';

/** Repository operations stay separate from browsing filters and the changes-only commit composer. */
export function SyncToolbar({
	service,
	snapshot,
	report,
}: {
	service: SyncService;
	snapshot: SyncSnapshot;
	report: (error: unknown) => void;
}) {
	const status = snapshot.status;
	const busy = (!!snapshot.running && snapshot.running !== 'refresh') || snapshot.locked;
	const blocked = !!snapshot.operation || (status?.conflicted.length ?? 0) > 0;
	const upstream = status?.upstream
		? status.upstreamGone
			? t('sync.upstreamGone')
			: `↑${status.ahead} ↓${status.behind}`
		: t('sync.noUpstream');
	return (
		<div
			className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1"
			role="toolbar"
			aria-label={t('workbench.sync')}
		>
			{status && (
				<span
					className="flex min-w-0 max-w-full items-center gap-1.5 text-xs"
					title={status.upstream ? `${status.branch ?? ''} → ${status.upstream}` : (status.branch ?? '')}
				>
					<GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="truncate font-medium">{status.branch ?? t('sync.detached')}</span>
					<span className="shrink-0 text-muted-foreground">{upstream}</span>
				</span>
			)}
			<span className="ml-auto flex items-center">
				<ActionButton
					label={t('sync.action.pull')}
					size="icon-sm"
					disabled={busy || blocked}
					onClick={() => void service.pull().catch(report)}
				>
					<ArrowDown />
				</ActionButton>
				<ActionButton
					label={t('sync.action.push')}
					size="icon-sm"
					disabled={busy || blocked}
					onClick={() => void service.push().catch(report)}
				>
					<ArrowUp />
				</ActionButton>
				<ActionButton
					label={t('sync.action.fetch')}
					size="icon-sm"
					disabled={busy}
					onClick={() => void service.fetch().catch(report)}
				>
					<CloudDownload />
				</ActionButton>
				<ActionButton
					label={t('sync.refresh')}
					size="icon-sm"
					disabled={busy}
					onClick={() => void service.refresh().catch(report)}
				>
					<RotateCw />
				</ActionButton>
				<ActionButton
					label={snapshot.device.paused ? t('sync.resume') : t('sync.pause')}
					size="icon-sm"
					aria-pressed={!!snapshot.device.paused}
					onClick={() => void service.setPaused(!snapshot.device.paused).catch(report)}
				>
					{snapshot.device.paused ? <Play /> : <Pause />}
				</ActionButton>
			</span>
		</div>
	);
}
