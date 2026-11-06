// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/rss-section.ts, src/rss-article-modal.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import {
	Rss,
	RefreshCw,
	Settings,
	CheckCheck,
	Download,
	FileText,
	ExternalLink,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import { Component, MarkdownRenderer } from 'obsidian';
import { toast } from 'sonner';
import type { BoardStore } from '../../services/board-store';
import type { DashboardColumn, RssConfig } from '../../core/board/types';
import type { RssItem } from '../../core/rss/rss-xml';
import { feedKey, refreshFeeds, resolveArticleMarkdown, type ResolvedArticle } from '../../platform/rss/rss-service';
import { getRssStore } from '../../platform/rss/rss-store';
import { saveRssArticle } from '../../platform/rss/rss-note';
import { useVisible, useOwnerDocument } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import { Button } from '../../../../ui/components/button';
import { IconButton, Choice } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Skeleton } from '../../../../ui/components/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../../../../ui/components/dialog';
import { cn } from '../../../../ui/lib/utils';
import { RssFilter } from './RssFilter';
import { RssConfigDialog } from './RssConfigDialog';
interface Row {
	feedUrl: string;
	feedTitle: string;
	feedGroup: string;
	item: RssItem;
}
export function rssGroupNames(config: RssConfig): string[] {
	return [
		...new Set(
			[...(config.groups ?? []), ...config.feeds.map((f) => f.group ?? '')].map((s) => s.trim()).filter(Boolean),
		),
	];
}
export function RssSection({
	store,
	column,
}: {
	store: BoardStore;
	column: DashboardColumn;
	/** The title bar is reached through `WidgetActions`; kept so callers that still pass it compile. */
	actions?: HTMLElement | null;
}) {
	const t = useT(),
		visible = useVisible(),
		doc = useOwnerDocument(),
		settings = useStore(store.state, (s) => s.settings),
		rss = useMemo(() => getRssStore(store.host.app), [store]),
		config = useMemo(() => column.rssConfig ?? { feeds: [], downloadFolder: '' }, [column.rssConfig]);
	const [, redraw] = useState(0),
		[editing, setEditing] = useState(false),
		[filter, setFilter] = useState('all'),
		[page, setPage] = useState(1),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<{ message: string; retry?: () => void } | null>(null),
		[reader, setReader] = useState<Row | null>(null),
		[refresh, setRefresh] = useState(0);
	const pending = useRef(new Set<string>()),
		lifetime = useRef<AbortController | null>(null),
		requests = useRef(new Map<string, Promise<ResolvedArticle>>());
	useEffect(() => rss.subscribe(() => redraw((n) => n + 1)), [rss]);
	useEffect(() => {
		rss.setRetention(settings.rssReadRetentionDays);
	}, [rss, settings.rssReadRetentionDays]);
	useEffect(() => {
		if (!visible) return;
		let active = true;
		const controller = new AbortController();
		const inFlight = requests.current;
		lifetime.current = controller;
		setBusy(true);
		setError(null);
		void rss
			.load()
			.then(() =>
				refreshFeeds(rss, config.feeds, {
					force: refresh > 0,
					signal: controller.signal,
					ownerWindow: doc.defaultView ?? undefined,
				}),
			)
			.catch((e) => {
				if (active) setError({ message: t('rss.refreshFailed', { message: errorText(e) }) });
			})
			.finally(() => {
				if (active) {
					setBusy(false);
					redraw((n) => n + 1);
				}
			});
		return () => {
			active = false;
			controller.abort();
			inFlight.clear();
		};
	}, [rss, config, refresh, visible, doc, t]);
	const patch = async (value: RssConfig) => {
		await store.edit((data) => {
			const col = data.columns.find((x) => (x.id ?? x.name) === (column.id ?? column.name));
			if (col) col.rssConfig = value;
		});
	};
	const rows = config.feeds
		.flatMap((source) => {
			const key = feedKey(source.url),
				entry = rss.feedEntry(key);
			return (entry?.items ?? []).map((item) => ({
				feedUrl: key,
				feedTitle: source.name?.trim() || entry?.title || source.url,
				feedGroup: source.group?.trim() ?? '',
				item,
			}));
		})
		.sort((a, b) => (b.item.pubDate ?? 0) - (a.item.pubDate ?? 0));
	const failedFeeds = config.feeds.filter((source) => rss.feedEntry(feedKey(source.url))?.error);
	const unread = rows.filter((r) => !rss.isRead(r.item.guid)).length;
	const options = [
		{ value: 'all', label: `${t('rss.all')} (${rows.length})` },
		{ value: 'unread', label: `${t('rss.unreadOnly')} (${unread})` },
		...(config.groupBy === 'none'
			? []
			: config.groupBy === 'feed'
				? config.feeds.map((f) => ({
						value: `feed:${feedKey(f.url)}`,
						label: `${f.name || f.url} (${rows.filter((r) => r.feedUrl === feedKey(f.url)).length})`,
					}))
				: rssGroupNames(config).map((g) => ({
						value: `group:${g}`,
						label: `${g} (${rows.filter((r) => r.feedGroup === g).length})`,
					}))),
	];
	const filtered = rows.filter((r) =>
			filter === 'unread'
				? !rss.isRead(r.item.guid)
				: filter.startsWith('feed:')
					? r.feedUrl === filter.slice(5)
					: filter.startsWith('group:')
						? r.feedGroup === filter.slice(6)
						: true,
		),
		size = config.pageSize ?? 20,
		pages = Math.max(1, Math.ceil(filtered.length / size)),
		current = Math.min(page, pages);
	const resolve = useCallback(
		(row: Row, fresh = false) => {
			if (fresh) requests.current.delete(row.item.guid);
			let promise = requests.current.get(row.item.guid);
			if (!promise) {
				promise = resolveArticleMarkdown(
					rss,
					{ title: row.feedTitle, link: rss.feedEntry(row.feedUrl)?.link ?? '' },
					row.item,
					{ signal: lifetime.current?.signal, ownerWindow: doc.defaultView ?? undefined },
				);
				requests.current.set(row.item.guid, promise);
			}
			return promise;
		},
		[rss, doc],
	);
	const save = async (row: Row) => {
		if (pending.current.has(row.item.guid)) return;
		pending.current.add(row.item.guid);
		redraw((n) => n + 1);
		try {
			const existing = rss.savedPath(row.item.guid);
			if (existing && store.host.app.vault.getFileByPath(existing)) {
				await store.openFile(existing);
				return;
			}
			if (existing) rss.clearSaved(row.item.guid);
			const result = await resolve(row);
			if (!result.markdown) throw new Error(t('rss.saveFailed'));
			const file = await saveRssArticle(store.host.app, {
				folder: config.downloadFolder,
				feedTitle: row.feedTitle,
				item: row.item,
				markdown: result.markdown,
			});
			rss.setSaved(row.item.guid, file.path);
			await rss.flush();
			toast(t('rss.savedNotice', { name: file.basename }));
		} catch (e) {
			setError({ message: `${t('rss.saveFailed')}: ${errorText(e)}`, retry: () => void save(row) });
		} finally {
			pending.current.delete(row.item.guid);
			redraw((n) => n + 1);
		}
	};
	if (!visible) return null;
	return (
		<div data-rss aria-busy={busy || undefined} className="flex h-full min-h-0 min-w-0 flex-col gap-3">
			<WidgetActions>
				<IconButton
					label={t('rss.refresh')}
					onClick={() => {
						requests.current.clear();
						setRefresh((n) => n + 1);
					}}
				>
					<RefreshCw />
				</IconButton>
				<IconButton label={t('rss.configure')} onClick={() => setEditing(true)}>
					<Settings />
				</IconButton>
			</WidgetActions>
			{(error || failedFeeds.length > 0 || rss.saveState.error) && (
				<div role="alert" data-rss-problems className="flex shrink-0 flex-col gap-1.5">
					{error && <Problem message={error.message} retry={error.retry} dismiss={() => setError(null)} />}
					{failedFeeds.length > 0 && (
						<Problem
							message={t('rss.feedsFailed', {
								count: failedFeeds.length,
								names: failedFeeds.map((source) => source.name?.trim() || source.url).join(', '),
							})}
							retry={() => {
								requests.current.clear();
								setRefresh((n) => n + 1);
							}}
						/>
					)}
					{rss.saveState.error && <Problem message={rss.saveState.error} retry={() => rss.retry()} />}
				</div>
			)}
			{!config.feeds.length ? (
				<EmptyState
					size="sm"
					className="min-h-0 flex-1"
					icon={<Rss />}
					title={t('rss.noFeeds')}
					description={t('rss.configureHint')}
					action={<Button onClick={() => setEditing(true)}>{t('rss.configure')}</Button>}
				/>
			) : (
				<>
					<div data-toolbar className="flex shrink-0 flex-wrap items-center gap-2">
						<RssFilter
							label={t('rss.all')}
							value={filter}
							options={options}
							onChange={(key) => {
								setFilter(key);
								setPage(1);
							}}
						/>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="secondary"
									size="icon-md"
									aria-label={t('rss.markAllRead')}
									disabled={!unread}
									onClick={() => rss.markAllRead(filtered.map((r) => r.item.guid))}
								>
									<CheckCheck />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t('rss.markAllRead')}</TooltipContent>
						</Tooltip>
						{busy && (
							<span role="status" className="text-xs text-muted-foreground">
								{t('rss.loading')}
							</span>
						)}
						<Choice
							className="ml-auto w-32 data-[size=sm]:h-[var(--hu-ctl-h)]"
							label={t('rss.pageSize')}
							value={String(size)}
							options={[10, 20, 50, 100].map((n) => ({
								value: String(n),
								label: t('library.pageSize', { count: n }),
							}))}
							onChange={(value) => {
								setPage(1);
								void patch({ ...config, pageSize: +value }).catch((e) =>
									setError({ message: `${t('storage.unsaved')}: ${errorText(e)}` }),
								);
							}}
						/>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{!filtered.length &&
							(busy && !rows.length ? (
								<div data-rss-skeleton aria-hidden className="flex flex-col gap-2 p-2">
									{[0, 1, 2].map((n) => (
										<div key={n} className="flex flex-col gap-1.5">
											<Skeleton className="h-4 w-4/5" />
											<Skeleton className="h-3 w-2/5" />
										</div>
									))}
								</div>
							) : rows.length ? (
								<EmptyState
									size="sm"
									className="h-full"
									icon={<Rss />}
									title={t('rss.noMatch')}
									action={
										<Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
											{t('rss.all')}
										</Button>
									}
								/>
							) : (
								<EmptyState
									size="sm"
									className="h-full"
									icon={<Rss />}
									title={t('rss.noItems')}
									action={
										<Button
											variant="secondary"
											size="sm"
											onClick={() => {
												requests.current.clear();
												setRefresh((n) => n + 1);
											}}
										>
											{t('rss.refresh')}
										</Button>
									}
								/>
							))}
						<ul className="m-0 flex list-none flex-col gap-0.5 p-0">
							{filtered.slice((current - 1) * size, current * size).map((row) => {
								const read = rss.isRead(row.item.guid);
								return (
									<li
										key={`${row.feedUrl}:${row.item.guid}`}
										data-guid={row.item.guid}
										className="flex min-w-0 items-center gap-1"
									>
										<Button
											variant="ghost"
											className="h-auto min-h-12 min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left font-normal whitespace-normal"
											onClick={() => {
												rss.markRead(row.item.guid);
												setReader(row);
											}}
										>
											<span
												aria-hidden
												className={cn(
													'size-2 shrink-0 rounded-full',
													read ? 'bg-transparent' : 'bg-primary',
												)}
											/>
											<span className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span
													className={cn(
														'line-clamp-2 text-sm leading-5 break-words',
														read ? 'text-muted-foreground' : 'font-medium',
													)}
												>
													{row.item.title}
												</span>
												<span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
													<span className="min-w-0 flex-1 truncate">{row.feedTitle}</span>
													{row.item.pubDate && (
														<span className="shrink-0 tabular-nums">
															{new Date(row.item.pubDate).toLocaleDateString('sv')}
														</span>
													)}
												</span>
											</span>
										</Button>
										<IconButton
											disabled={pending.current.has(row.item.guid)}
											label={t(rss.savedPath(row.item.guid) ? 'rss.openNote' : 'rss.download')}
											onClick={() => void save(row)}
										>
											{rss.savedPath(row.item.guid) ? <FileText /> : <Download />}
										</IconButton>
									</li>
								);
							})}
						</ul>
					</div>
					{pages > 1 && (
						<div className="flex shrink-0 items-center justify-center gap-2">
							<Button
								variant="ghost"
								size="icon-md"
								disabled={current === 1}
								aria-label={t('home.p2.prev')}
								onClick={() => setPage(current - 1)}
							>
								<ChevronLeft />
							</Button>
							<span className="text-xs tabular-nums">
								{current} / {pages}
							</span>
							<Button
								variant="ghost"
								size="icon-md"
								disabled={current === pages}
								aria-label={t('home.p2.next')}
								onClick={() => setPage(current + 1)}
							>
								<ChevronRight />
							</Button>
						</div>
					)}
				</>
			)}
			{editing && (
				<RssConfigDialog
					store={store}
					config={config}
					rss={rss}
					onClose={() => setEditing(false)}
					onSave={patch}
				/>
			)}
			{reader && (
				<ArticleReader
					store={store}
					row={reader}
					resolve={resolve}
					onSave={() => save(reader)}
					saved={!!rss.savedPath(reader.item.guid)}
					busy={pending.current.has(reader.item.guid)}
					onClose={() => setReader(null)}
				/>
			)}
		</div>
	);
}
function ArticleReader({
	store,
	row,
	resolve,
	onSave,
	saved,
	busy,
	onClose,
}: {
	store: BoardStore;
	row: Row;
	resolve: (row: Row, fresh?: boolean) => Promise<ResolvedArticle>;
	onSave: () => Promise<void>;
	saved: boolean;
	busy: boolean;
	onClose: () => void;
}) {
	const t = useT(),
		[markdown, setMarkdown] = useState<string | null | undefined>(),
		[attempt, setAttempt] = useState(0),
		ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let active = true;
		void resolve(row, attempt > 0)
			.then((result) => {
				if (active) setMarkdown(result.markdown);
			})
			.catch(() => {
				if (active) setMarkdown(null);
			});
		return () => {
			active = false;
		};
	}, [resolve, row, attempt]);
	useEffect(() => {
		const el = ref.current;
		if (!el || !markdown) return;
		const owner = new Component();
		owner.load();
		void MarkdownRenderer.render(store.host.app, markdown, el, '', owner);
		return () => {
			owner.unload();
			el.replaceChildren();
		};
	}, [store, markdown]);
	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="flex max-h-[86vh] min-w-0 flex-col gap-3 sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle className="break-words">{row.item.title}</DialogTitle>
					<DialogDescription className="flex flex-wrap gap-x-3 gap-y-0.5 break-words">
						<span>{row.feedTitle}</span>
						{row.item.author && <span>{row.item.author}</span>}
						{row.item.pubDate && (
							<span>{new Date(row.item.pubDate).toLocaleString('sv').slice(0, 16)}</span>
						)}
					</DialogDescription>
				</DialogHeader>
				<div
					aria-busy={markdown === undefined || undefined}
					className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto break-words"
				>
					<div ref={ref} className="huhu-native" />
					{markdown === undefined ? (
						<p role="status" className="m-0 text-sm text-muted-foreground">
							{t('rss.fetchingArticle')}
						</p>
					) : !markdown ? (
						<div role="alert" data-rss-article-failed className="flex flex-col items-start gap-2 text-sm">
							<span>{t('rss.articleFailed')}</span>
							<Button
								size="sm"
								variant="secondary"
								onClick={() => {
									setMarkdown(undefined);
									setAttempt((n) => n + 1);
								}}
							>
								{t('home.content.retry')}
							</Button>
						</div>
					) : null}
				</div>
				<DialogFooter>
					<Button
						variant={saved ? 'secondary' : 'primary'}
						disabled={busy}
						aria-busy={busy || undefined}
						onClick={() => void onSave()}
					>
						{saved ? <FileText /> : <Download />}
						{t(saved ? 'rss.openNote' : 'rss.saveToVault')}
					</Button>
					<Button
						variant="secondary"
						onClick={() => {
							store.host.openExternal(row.item.link, store.ownerWindow);
						}}
					>
						<ExternalLink />
						{t('rss.openInBrowser')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
/** A failure that stays in the card until it is retried or dismissed; the list under it keeps its articles. */
function Problem({ message, retry, dismiss }: { message: string; retry?: () => void; dismiss?: () => void }) {
	const t = useT();
	return (
		<div className="flex flex-wrap items-center gap-2 border-l-2 border-destructive bg-muted px-2 py-1.5 text-xs">
			<span className="min-w-0 flex-1 break-words">{message}</span>
			{retry && (
				<Button size="sm" variant="secondary" onClick={retry}>
					{t('home.content.retry')}
				</Button>
			)}
			{dismiss && (
				<Button size="sm" variant="ghost" onClick={dismiss}>
					{t('home.content.dismiss')}
				</Button>
			)}
		</div>
	);
}
