import { moment, type App } from 'obsidian';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, History as HistoryIcon } from 'lucide-react';
import { t } from '../../../shared/i18n/index';
import { cn } from '../../../ui/lib/utils';
import { Button } from '../../../ui/components/button';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { layoutGraph } from '../core/graph';
import { buildRefBadges, type RefEntry } from '../core/refs';
import type { GraphCommit } from '../core/repo';
import { changeCount } from '../core/status';
import type { SyncService, SyncSnapshot } from '../services/sync-service';
import { CommitDetail } from './CommitDetail';
import { describeError } from './Diff';
import { GraphCell, LaneFill, ROW_HEIGHT, graphWidth, lanesBelow } from './GraphCell';
import { RefBadges } from './RefBadges';
import type { GraphFilter } from './SyncToolbar';
import { UncommittedPanel } from './UncommittedPanel';

const PAGE = 100;
const MAX_LANES = 8;

/** Enter and Space activate a row like a button. */
const rowKey = (run: () => void) => (event: React.KeyboardEvent) => {
	if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
	event.preventDefault();
	run();
};

type Item = { key: string; kind: 'wip' | 'wip-detail' | 'more' } | { key: string; kind: 'commit' | 'detail'; index: number };

/** Template shared by the header and every row: graph | description | date | author | commit (date and author hide when narrow). */
const COLUMNS = 'grid px-3 grid-cols-[var(--graph-width)_minmax(0,1fr)_4.5rem] @xl:grid-cols-[var(--graph-width)_minmax(0,1fr)_8.5rem_6.5rem_4.5rem]';

/** An expanded panel under a row: the lanes keep running in the graph column and the content lines up with the description column. */
function DetailFrame({ lanes, dashed, children }: { lanes: readonly { lane: number; color: number }[]; dashed?: number; children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-[var(--graph-width)_minmax(0,1fr)] border-y border-border bg-muted/30 px-3">
			<div className="relative">
				<LaneFill lanes={lanes} dashed={dashed} />
			</div>
			<div className="min-w-0 px-2">{children}</div>
		</div>
	);
}

/** Commits, refs and paging for the graph; reloads when the repository moves or the filter changes. */
function useGraphData(service: SyncService, version: string, filter: GraphFilter) {
	const [commits, setCommits] = useState<GraphCommit[] | null>(null);
	const [refs, setRefs] = useState<RefEntry[]>([]);
	const [more, setMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const generation = useRef(0);
	const search = filter.search.trim();
	const query = useMemo(() => ({ branches: filter.branches, remotes: filter.remotes, search }), [filter.branches, filter.remotes, search]);
	const load = useCallback(
		(skip: number) => {
			const id = generation.current;
			setLoading(true);
			return service.graphLog(skip, PAGE, query).then(
				(page) => {
					if (id !== generation.current) return;
					setCommits((current) => (skip ? [...(current ?? []), ...page] : page));
					setMore(page.length === PAGE);
					setError('');
					setLoading(false);
				},
				(failure: unknown) => {
					if (id !== generation.current) return;
					setError(describeError(failure));
					setLoading(false);
				},
			);
		},
		[service, query],
	);
	useEffect(() => {
		generation.current++;
		// A search changes which commits exist, so it waits a moment for typing to settle.
		const timer = window.setTimeout(() => {
			void load(0);
			void service.refs().then((value) => setRefs(value), () => setRefs([]));
		}, search ? 250 : 0);
		return () => window.clearTimeout(timer);
	}, [load, service, version, search]);
	return { commits, refs, more, loading, error, loadMore: () => load(commits?.length ?? 0) };
}

/** The Git Graph style history: one compact table with a lane graph, an uncommitted-changes row and expandable commit details. */
export function SyncGraph({ app, service, snapshot, filter, message, setMessage, report, openChanges }: { app: App; service: SyncService; snapshot: SyncSnapshot; filter: GraphFilter; message: string; setMessage: (value: string) => void; report: (error: unknown) => void; openChanges: number }) {
	const status = snapshot.status;
	const head = status?.head ?? null;
	const version = [head, status?.branch, status?.upstream, status?.ahead, status?.behind, snapshot.last?.at].join('|');
	const { commits, refs, more, loading, error, loadMore } = useGraphData(service, version, filter);
	const searching = filter.search.trim().length > 0;
	const rows = useMemo(() => layoutGraph((commits ?? []).map((commit) => ({ hash: commit.hash, parents: searching ? [] : commit.parents }))), [commits, searching]);
	const badges = useMemo(() => buildRefBadges(refs, { branch: status?.branch ?? null, hash: head }), [refs, status?.branch, head]);
	const lanes = Math.min(MAX_LANES, Math.max(1, ...rows.map((row) => row.width)));
	const width = graphWidth(lanes);
	const pending = status ? changeCount(status) : 0;
	const blocked = !!snapshot.operation || (status?.conflicted.length ?? 0) > 0;
	const showWip = pending > 0 || blocked;
	const [wipOpen, setWipOpen] = useState(false);
	const [open, setOpen] = useState('');
	const seenFocus = useRef(openChanges);
	useEffect(() => {
		if (openChanges !== seenFocus.current) {
			seenFocus.current = openChanges;
			setWipOpen(true);
		}
	}, [openChanges]);
	useEffect(() => {
		if (blocked) setWipOpen(true);
	}, [blocked]);
	const items = useMemo(() => {
		const list: Item[] = [];
		if (showWip) {
			list.push({ key: 'wip', kind: 'wip' });
			if (wipOpen) list.push({ key: 'wip-detail', kind: 'wip-detail' });
		}
		(commits ?? []).forEach((commit, index) => {
			list.push({ key: commit.hash, kind: 'commit', index });
			if (open === commit.hash) list.push({ key: `${commit.hash}:detail`, kind: 'detail', index });
		});
		if (more) list.push({ key: 'more', kind: 'more' });
		return list;
	}, [commits, showWip, wipOpen, open, more]);
	const scroll = useRef<HTMLDivElement>(null);
	const virtual = useVirtualizer({
		count: items.length,
		getScrollElement: () => scroll.current,
		estimateSize: (index) => (items[index]!.kind === 'detail' || items[index]!.kind === 'wip-detail' ? 240 : ROW_HEIGHT),
		getItemKey: (index) => items[index]!.key,
		overscan: 12,
	});
	const lastVisible = virtual.getVirtualItems().at(-1)?.index ?? 0;
	useEffect(() => {
		if (more && !loading && !error && lastVisible >= items.length - 8) void loadMore();
		// loadMore closes over the current page length; the visible window is the trigger.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- loadMore is recreated each render; the visible window drives paging
	}, [lastVisible, items.length, more, loading, error]);
	const loadedHashes = useMemo(() => new Set((commits ?? []).map((commit) => commit.hash)), [commits]);
	const jumping = useRef(false);
	const jump = (hash: string) => {
		jumping.current = true;
		setOpen(hash);
	};
	useEffect(() => {
		if (!jumping.current) return;
		jumping.current = false;
		const index = items.findIndex((item) => item.key === open);
		if (index >= 0) virtual.scrollToIndex(index, { align: 'center' });
	}, [open, items, virtual]);
	const toVault = (path: string) => snapshot.place?.toVault(path) ?? null;
	if (error) return <div className="m-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
	if (!commits) return <p className="p-3 text-xs text-muted-foreground">{t('sync.loading')}</p>;
	if (!commits.length && !showWip)
		return <EmptyState icon={<HistoryIcon />} title={t('workbench.history')} description={searching ? t('sync.noMatches') : t('sync.noCommits')} />;
	const headIndex = commits.findIndex((commit) => commit.hash === head);
	return (
		<div className="@container flex min-h-0 flex-1 flex-col" style={{ '--graph-width': `${width}px` } as React.CSSProperties}>
			<div className={cn(COLUMNS, 'shrink-0 items-center border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground')} role="row">
				<span className="px-1">{t('sync.col.graph')}</span>
				<span className="px-2">{t('sync.col.description')}</span>
				<span className="hidden px-2 @xl:block">{t('sync.col.date')}</span>
				<span className="hidden px-2 @xl:block">{t('sync.col.author')}</span>
				<span className="px-2">{t('sync.col.commit')}</span>
			</div>
			<div ref={scroll} className="min-h-0 flex-1 overflow-auto scrollbar-sleek" role="table" aria-label={t('sync.graphLabel')}>
				<div className="relative w-full" style={{ height: virtual.getTotalSize() }}>
					{virtual.getVirtualItems().map((virtualItem) => {
						const item = items[virtualItem.index]!;
						const style = { position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)` } as const;
						let content;
						if (item.kind === 'wip')
							content = (
								<div
									role="row"
									tabIndex={0}
									aria-expanded={wipOpen}
									className={cn(COLUMNS, 'h-6 w-full cursor-pointer items-center text-left text-xs outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring', wipOpen && 'bg-accent/40')}
									onClick={() => setWipOpen(!wipOpen)}
									onKeyDown={rowKey(() => setWipOpen(!wipOpen))}
								>
									<GraphCell hollow width={width} row={headIndex === 0 ? { ...rows[0]!, segments: [] } : undefined} below={headIndex === 0} />
									<span className="flex min-w-0 items-center gap-1 px-2 text-muted-foreground">
										{wipOpen ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
										<span className="truncate">{t('sync.uncommitted')}</span>
										<span className="shrink-0 rounded-full bg-muted px-1.5 text-[11px] leading-4 not-italic text-foreground">{pending}</span>
									</span>
									<span className="col-span-1 @xl:col-span-3" />
								</div>
							);
						else if (item.kind === 'wip-detail' && status)
							content = (
								<DetailFrame lanes={[]} dashed={headIndex === 0 ? rows[0]!.column : undefined}>
									<UncommittedPanel app={app} service={service} snapshot={snapshot} message={message} setMessage={setMessage} report={report} />
								</DetailFrame>
							);
						else if (item.kind === 'commit') {
							const commit = commits[item.index]!;
							const row = rows[item.index];
							const isHead = commit.hash === head;
							const expanded = open === commit.hash;
							content = (
								<div
									role="row"
									tabIndex={0}
									aria-expanded={expanded}
									title={commit.subject}
									className={cn(COLUMNS, 'h-6 w-full cursor-pointer items-center text-left text-xs outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring', expanded && 'bg-accent/40', isHead && 'font-semibold')}
									onClick={() => setOpen(expanded ? '' : commit.hash)}
									onKeyDown={rowKey(() => setOpen(expanded ? '' : commit.hash))}
								>
									<GraphCell row={row} width={width} head={isHead} above={showWip && item.index === 0 && isHead} />
									<span className="flex min-w-0 items-center gap-1.5 px-2">
										<RefBadges badges={badges.get(commit.hash) ?? []} />
										<span className="truncate text-foreground">{commit.subject}</span>
									</span>
									<span className="hidden truncate px-2 text-muted-foreground @xl:block">{moment(commit.time * 1000).format('YYYY-MM-DD HH:mm')}</span>
									<span className="hidden truncate px-2 text-muted-foreground @xl:block">{commit.author}</span>
									<span className="px-2 font-mono text-muted-foreground">{commit.short}</span>
								</div>
							);
						} else if (item.kind === 'detail')
							content = (
								<DetailFrame lanes={lanesBelow(rows[item.index])}>
									<CommitDetail key={commits[item.index]!.hash} app={app} service={service} hash={commits[item.index]!.hash} toVault={toVault} report={report} loaded={loadedHashes} onParent={jump} />
								</DetailFrame>
							);
						else
							content = (
								<div className="flex h-8 items-center justify-center">
									<Button size="xs" variant="ghost" disabled={loading} onClick={() => void loadMore()}>
										{loading ? t('sync.loading') : t('sync.loadMore')}
									</Button>
								</div>
							);
						return (
							<div key={item.key} ref={virtual.measureElement} data-index={virtualItem.index} style={style}>
								{content}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
