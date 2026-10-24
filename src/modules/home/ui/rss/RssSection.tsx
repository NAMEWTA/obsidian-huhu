// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/rss-section.ts, src/rss-article-modal.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Rss, RefreshCw, Settings, CheckCheck, Download, FileText, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { cn } from '../../../../ui/lib/utils';
import { p2Classes as c } from '../theme/p2-classes';
import { P2Dialog } from '../dialogs/P2Dialog';
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
		[error, setError] = useState(''),
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
		setError('');
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
				if (active) setError(String(e));
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
	}, [rss, config, refresh, visible, doc]);
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
		(row: Row) => {
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
			setError(String(e));
		} finally {
			pending.current.delete(row.item.guid);
			redraw((n) => n + 1);
		}
	};
	if (!visible) return null;
	return (
		<div data-rss className="flex h-full min-h-0 min-w-0 flex-col gap-3">
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
			{error && (
				<p role="alert" className="m-0 text-xs text-destructive">
					{error}
				</p>
			)}
			{rss.saveState.error && (
				<Button variant="outline" onClick={() => rss.retry()}>
					{t('common.retry')}: {rss.saveState.error}
				</Button>
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
						<Button
							variant="outline"
							size="icon"
							aria-label={t('rss.markAllRead')}
							title={t('rss.markAllRead')}
							onClick={() => rss.markAllRead(filtered.map((r) => r.item.guid))}
						>
							<CheckCheck />
						</Button>
						{busy && <span className="text-xs text-muted-foreground">{t('rss.loading')}</span>}
						<Choice
							className="ml-auto w-32 data-[size=sm]:h-9"
							label={t('rss.pageSize')}
							value={String(size)}
							options={[10, 20, 50, 100].map((n) => ({
								value: String(n),
								label: t('library.pageSize', { count: n }),
							}))}
							onChange={(value) => {
								setPage(1);
								void patch({ ...config, pageSize: +value }).catch((e) => setError(String(e)));
							}}
						/>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{!filtered.length && (
							<EmptyState
								size="sm"
								className="h-full"
								icon={<Rss />}
								title={t(busy ? 'rss.loading' : 'rss.noItems')}
							/>
						)}
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
														'truncate text-sm leading-5',
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
								size="icon"
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
								size="icon"
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
	resolve: (row: Row) => Promise<ResolvedArticle>;
	onSave: () => Promise<void>;
	saved: boolean;
	busy: boolean;
	onClose: () => void;
}) {
	const t = useT(),
		[markdown, setMarkdown] = useState<string | null | undefined>(),
		ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let active = true;
		void resolve(row)
			.then((result) => {
				if (active) setMarkdown(result.markdown);
			})
			.catch(() => {
				if (active) setMarkdown(null);
			});
		return () => {
			active = false;
		};
	}, [resolve, row]);
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
		<P2Dialog raw title={row.item.title} width={860} classes="dashboard-rss-reader-wrap" onClose={onClose}>
			<div className={c('dashboard-rss-reader-header')}>
				<div className={c('dashboard-rss-reader-headmain')}>
					<div className={c('dashboard-rss-reader-title')}>{row.item.title}</div>
					<div className={c('dashboard-rss-reader-meta')}>
						<span className={c('dashboard-rss-reader-feed')}>{row.feedTitle}</span>
						{row.item.author && <span>{row.item.author}</span>}
						{row.item.pubDate && (
							<span>{new Date(row.item.pubDate).toLocaleString('sv').slice(0, 16)}</span>
						)}
					</div>
				</div>
				<div className={c('dashboard-rss-reader-actions')}>
					<Button
						disabled={busy}
						className={c(`dashboard-rss-reader-save${saved ? ' is-saved' : ''}`)}
						onClick={() => void onSave()}
					>
						{saved ? <FileText /> : <Download />}
						{t(saved ? 'rss.openNote' : 'rss.saveToVault')}
					</Button>
					<IconButton
						className={c('dashboard-rss-reader-btn')}
						label={t('rss.openInBrowser')}
						onClick={() => {
							void store.host.openBrowser({ url: row.item.link });
						}}
					>
						<ExternalLink />
					</IconButton>
					<IconButton className={c('dashboard-rss-reader-btn')} label={t('common.close')} onClick={onClose}>
						<X />
					</IconButton>
				</div>
			</div>
			<div className={c('dashboard-rss-reader-body')}>
				<div ref={ref} className="huhu-native" />
				{markdown === undefined ? t('rss.fetchingArticle') : !markdown ? t('rss.articleFailed') : null}
			</div>
		</P2Dialog>
	);
}
