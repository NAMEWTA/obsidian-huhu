import {
	ArrowDown,
	ArrowUp,
	CloudDownload,
	GitBranch,
	Pause,
	Play,
	RefreshCw,
	RotateCw,
	Search,
	X,
} from 'lucide-react';
import { t } from '../../../shared/i18n/index';
import { Checkbox } from '../../../ui/components/checkbox';
import { Input } from '../../../ui/components/input';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { SegmentedControl } from '../../../ui/components/huhu/SettingsFormControls';
import type { SyncService, SyncSnapshot } from '../services/sync-service';

export interface GraphFilter {
	branches: 'all' | 'current';
	remotes: boolean;
	search: string;
}

/** Branch and upstream, graph filters, search, and the pull / push / fetch / sync / refresh actions. */
export function SyncToolbar({
	service,
	snapshot,
	filter,
	onFilter,
	report,
}: {
	service: SyncService;
	snapshot: SyncSnapshot;
	filter: GraphFilter;
	onFilter: (next: GraphFilter) => void;
	report: (error: unknown) => void;
}) {
	const status = snapshot.status;
	const busy = !!snapshot.running && snapshot.running !== 'refresh';
	const blocked = !!snapshot.operation || (status?.conflicted.length ?? 0) > 0;
	const upstream = status?.upstream
		? status.upstreamGone
			? t('sync.upstreamGone')
			: `↑${status.ahead} ↓${status.behind}`
		: t('sync.noUpstream');
	return (
		<div
			className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5"
			role="toolbar"
			aria-label={t('workbench.sync')}
		>
			{snapshot.place?.root && (
				<span className="max-w-48 truncate text-xs font-medium" title={snapshot.place.root}>
					{snapshot.place.cwd.split(/[\\/]/).at(-1)}
				</span>
			)}
			{status && (
				<span
					className="flex min-w-0 max-w-full items-center gap-1.5 text-xs"
					title={status.upstream ? `${status.branch ?? ''} → ${status.upstream}` : (status.branch ?? '')}
				>
					<GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="truncate font-mono font-medium">{status.branch ?? t('sync.detached')}</span>
					{status.upstream && <span className="truncate text-muted-foreground">→ {status.upstream}</span>}
					<span className="shrink-0 text-muted-foreground">{upstream}</span>
				</span>
			)}
			<SegmentedControl
				size="sm"
				ariaLabel={t('sync.branchFilter')}
				value={filter.branches}
				onChange={(branches) => onFilter({ ...filter, branches })}
				options={[
					{ value: 'all', label: t('sync.branches.all') },
					{ value: 'current', label: t('sync.branches.current') },
				]}
			/>
			<label className="flex cursor-pointer items-center gap-1.5 text-xs">
				<Checkbox
					checked={filter.remotes}
					disabled={filter.branches === 'current'}
					onCheckedChange={(value) => onFilter({ ...filter, remotes: value === true })}
				/>
				{t('sync.showRemotes')}
			</label>
			<span className="relative ml-auto flex min-w-32 max-w-56 flex-1 items-center">
				<Search className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
				<Input
					className="h-7 px-7 text-xs md:text-xs"
					value={filter.search}
					placeholder={t('sync.searchCommits')}
					aria-label={t('sync.searchCommits')}
					onChange={(event) => onFilter({ ...filter, search: event.currentTarget.value })}
				/>
				{filter.search && (
					<button
						type="button"
						className="absolute right-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
						aria-label={t('sync.clearSearch')}
						onClick={() => onFilter({ ...filter, search: '' })}
					>
						<X className="size-3.5" />
					</button>
				)}
			</span>
			<span className="flex items-center">
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
					label={t('sync.syncNow')}
					size="icon-sm"
					disabled={busy || blocked}
					onClick={() => void service.commitAndSync('all').catch(report)}
				>
					<RefreshCw />
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
