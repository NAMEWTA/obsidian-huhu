// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/sidebar/index.tsx
import { useEffect, useId, useMemo, useRef, useState, type Ref, type KeyboardEvent } from 'react';
import type { PanelItem, PanelModel, WorkbenchTarget } from '../../app/contracts/workbench';
import { t } from '../../shared/i18n';
import { Button } from '../../ui/components/button';
import { Input } from '../../ui/components/input';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '../../ui/components/context-menu';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '../../ui/components/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/components/tooltip';
import { Tree, type TreeNode } from '../../ui/components/tree';
import { cn } from '../../ui/lib/utils';
import { ShellIcon } from '../icon';
import { targetKey } from '../navigation-state';
import { useShellCloseAutoFocus } from '../interaction-lifetime';
const EMPTY_LIMITS: Readonly<Record<string, number>> = {};
const EMPTY_NODES: readonly TreeNode[] = [];
type TreeData = NonNullable<NonNullable<PanelModel['tree']>['data']>;
type LoadedTree = Awaited<ReturnType<TreeData['load']>>;
function treeIds(nodes: readonly TreeNode[]) {
	const all = new Set<string>(),
		branches = new Set<string>();
	const visit = (items: readonly TreeNode[]) => {
		for (const item of items) {
			all.add(item.id);
			if (item.children) {
				branches.add(item.id);
				visit(item.children);
			}
		}
	};
	visit(nodes);
	return { all, branches };
}
export interface SidePanelProps {
	title: string;
	/** The page supplies its own navigation header and content. */
	custom?: boolean;
	model?: PanelModel;
	current: WorkbenchTarget;
	customRef: Ref<HTMLDivElement>;
	onNavigate: (target: WorkbenchTarget) => void;
	onClose?: () => void;
	report: (error: unknown) => void;
}
export function SidePanel({ title, custom, model, current, customRef, onNavigate, onClose, report }: SidePanelProps) {
	const closeAutoFocus = useShellCloseAutoFocus();
	const id = useId();
	const [query, setQuery] = useState('');
	const [primaryBusy, setPrimaryBusy] = useState(false);
	const primaryPending = useRef(false);
	const selectionRequest = useRef(0);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const runPrimary = async () => {
		if (primaryPending.current || !model?.primary) return;
		primaryPending.current = true;
		setPrimaryBusy(true);
		try {
			await model.primary.run();
		} catch (error) {
			report(error);
		} finally {
			primaryPending.current = false;
			if (mounted.current) setPrimaryBusy(false);
		}
	};
	const needle = query.trim().toLocaleLowerCase();
	const tree = model?.tree;
	const dataSource = tree?.data;
	const dataQuery = query.trim();
	const dataKey = JSON.stringify([current.feature, dataQuery]);
	const [pageState, setPageState] = useState<{ key: string; limits: Readonly<Record<string, number>> }>({
		key: '',
		limits: EMPTY_LIMITS,
	});
	const limits = pageState.key === dataKey ? pageState.limits : EMPTY_LIMITS;
	const [loadedTree, setLoadedTree] = useState<{ key: string; value: LoadedTree } | null>(null);
	const [dataStatus, setDataStatus] = useState({ key: '', pending: false, failed: false });
	const [retry, setRetry] = useState(0);
	useEffect(() => {
		if (!dataSource) return;
		let live = true;
		setDataStatus({ key: dataKey, pending: true, failed: false });
		void Promise.resolve()
			.then(() => dataSource.load({ search: dataQuery, limits }))
			.then(
				(value) => {
					if (!live) return;
					setLoadedTree({ key: dataKey, value });
					setDataStatus({ key: dataKey, pending: false, failed: false });
				},
				(error) => {
					if (!live) return;
					setDataStatus({ key: dataKey, pending: false, failed: true });
					report(error);
				},
			);
		return () => {
			live = false;
		};
	}, [dataSource, dataKey, dataQuery, limits, retry, report]);
	const projection = loadedTree?.key === dataKey ? loadedTree.value : null;
	const nodes = dataSource ? (projection?.nodes ?? EMPTY_NODES) : (tree?.nodes ?? EMPTY_NODES);
	const ids = useMemo(() => treeIds(nodes), [nodes]);
	const [expansion, setExpansion] = useState<Record<string, readonly string[]>>({});
	const storedExpansion = expansion[current.feature];
	const expandedIds = (storedExpansion ?? tree?.defaultExpandedIds ?? [])
		.filter((id) => ids.branches.has(id))
		.slice(0, 512);
	if (
		storedExpansion &&
		!needle &&
		(!dataSource || (projection && dataStatus.key === dataKey && !dataStatus.pending)) &&
		storedExpansion.join('\u0001') !== expandedIds.join('\u0001')
	) {
		setExpansion((previous) => ({ ...previous, [current.feature]: expandedIds }));
	}
	const dataPending = !!dataSource && (dataStatus.key !== dataKey || dataStatus.pending);
	const dataFailed = !!dataSource && dataStatus.key === dataKey && dataStatus.failed;
	// A page that matches the query itself (settings: every setting of every category) replaces the sections by its rows.
	const search = dataSource ? undefined : model?.search;
	const [found, setFound] = useState<{ query: string; items: readonly PanelItem[]; failed?: boolean } | null>(null);
	useEffect(() => {
		if (!search || !needle) return;
		let live = true;
		search.query(query.trim()).then(
			(items) => live && setFound({ query: needle, items }),
			(error: unknown) => {
				if (live) setFound({ query: needle, items: [], failed: true });
				report(error);
			},
		);
		return () => {
			live = false;
		};
	}, [search, needle, query, report]);
	const results = search && needle ? found : null;
	const matchIds = useMemo(
		() => (results?.query === needle ? new Set(results.items.map((item) => item.id)) : undefined),
		[results, needle],
	);
	const sections = (search && needle && !model?.tree ? [] : (model?.sections ?? []))
		.map((s) => ({ ...s, items: s.items.filter((i) => !needle || i.label.toLocaleLowerCase().includes(needle)) }))
		.filter((s) => !needle || s.items.length);
	const open = (item: PanelItem) => {
		const request = ++selectionRequest.current;
		void Promise.resolve()
			.then(() => item.select?.())
			.then(() => {
				if (mounted.current && request === selectionRequest.current && item.target) onNavigate(item.target);
			})
			.catch(report);
	};
	const openTreeNode = (id: string) => {
		const request = ++selectionRequest.current;
		void Promise.resolve()
			.then(() => tree?.select?.(id))
			.then(() => {
				if (!mounted.current || request !== selectionRequest.current) return;
				const target = tree?.target?.(id);
				if (target) onNavigate(target);
			})
			.catch(report);
	};
	const keys = (event: KeyboardEvent<HTMLButtonElement>) => {
		const rows = [
			...(event.currentTarget.closest('aside')?.querySelectorAll<HTMLButtonElement>('[data-panel-row]') ?? []),
		];
		const index = rows.indexOf(event.currentTarget);
		const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: rows.length - 1 }[event.key];
		if (next !== undefined && rows.length) {
			event.preventDefault();
			rows[(next + rows.length) % rows.length]?.focus();
		}
	};
	return (
		<aside
			data-shell-region="panel"
			tabIndex={-1}
			aria-labelledby={custom ? undefined : id}
			aria-label={custom ? title : undefined}
			className="huhu-panel flex h-full min-h-0 min-w-0 flex-col border-r border-sidebar-border bg-sidebar"
		>
			{!custom && (
				<header className="flex h-[var(--hu-header-h)] shrink-0 items-center gap-2 px-3">
					<h2 id={id} className="min-w-0 flex-1 truncate text-sm font-semibold">
						{title}
					</h2>
					{onClose && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={t('workbench.closeNavigation')}
									onClick={onClose}
								>
									<ShellIcon name="x" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t('workbench.closeNavigation')}</TooltipContent>
						</Tooltip>
					)}
				</header>
			)}
			{model?.primary && (
				<div className="px-3 pb-2">
					<Button
						variant="secondary"
						size="sm"
						className="w-full justify-start"
						busy={primaryBusy}
						onClick={() => {
							void runPrimary();
						}}
					>
						<ShellIcon name={model.primary.icon} />
						{model.primary.label}
					</Button>
				</div>
			)}
			{model?.searchable && (
				<div className="px-3 pb-2">
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={search?.placeholder ?? t('workbench.searchPanel')}
						aria-label={search?.placeholder ?? t('workbench.searchPanel')}
					/>
				</div>
			)}
			<div
				className={cn(
					'min-h-0 overflow-y-auto scrollbar-sleek',
					tree ? 'max-h-[40%] flex-none empty:hidden' : 'flex-1',
				)}
			>
				{sections.map((section) => (
					<section key={section.id} aria-label={section.title}>
						{section.title && (
							<div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{section.title}
							</div>
						)}
						{section.items.map((item) => {
							const active =
								item.active ?? (item.target ? targetKey(item.target) === targetKey(current) : false);
							const menu = item.menu?.() ?? [];
							return (
								<ContextMenu key={item.id}>
									<ContextMenuTrigger asChild>
										<div className="group mx-2 flex items-center rounded-md hover:bg-sidebar-accent">
											<Button
												data-panel-row
												data-current={active}
												title={item.meta ? `${item.label} · ${item.meta}` : item.label}
												variant="ghost"
												onKeyDown={keys}
												aria-current={active ? 'page' : undefined}
												className={cn(
													'h-[var(--hu-row-h)] min-h-[var(--hu-hit)] min-w-0 flex-1 justify-start rounded-md px-2 text-sm',
													active && 'bg-sidebar-accent',
												)}
												onClick={() => open(item)}
											>
												{item.icon && (
													<ShellIcon name={item.icon} className="size-4 shrink-0" />
												)}
												<span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
												{item.meta && (
													<span className="max-w-24 truncate text-xs text-muted-foreground">
														{item.meta}
													</span>
												)}
												{!!item.badge && (
													<span className="text-xs tabular-nums">{item.badge}</span>
												)}
											</Button>
											{!!menu.length && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon-sm"
															aria-label={t('workbench.more')}
															className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
														>
															<ShellIcon name="more-horizontal" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent onCloseAutoFocus={closeAutoFocus}>
														{menu.map((m, i) => (
															<DropdownMenuItem
																key={i}
																variant={m.danger ? 'destructive' : 'default'}
																onSelect={() => {
																	void Promise.resolve()
																		.then(() => m.run())
																		.catch(report);
																}}
															>
																{m.title}
															</DropdownMenuItem>
														))}
													</DropdownMenuContent>
												</DropdownMenu>
											)}
										</div>
									</ContextMenuTrigger>
									{!!menu.length && (
										<ContextMenuContent onCloseAutoFocus={closeAutoFocus}>
											{menu.map((m, i) => (
												<ContextMenuItem
													key={i}
													variant={m.danger ? 'destructive' : 'default'}
													onSelect={() => {
														void Promise.resolve()
															.then(() => m.run())
															.catch(report);
													}}
												>
													{m.title}
												</ContextMenuItem>
											))}
										</ContextMenuContent>
									)}
								</ContextMenu>
							);
						})}
						{!section.items.length && section.emptyText && (
							<p className="px-3 py-2 text-xs text-muted-foreground">{section.emptyText}</p>
						)}
					</section>
				))}
				{search && needle && !tree && (
					<section aria-label={t('workbench.searchPanel')} data-panel-results>
						{results?.query !== needle ? (
							<p role="status" className="px-3 py-2 text-xs text-muted-foreground">
								{t('shell.searching')}
							</p>
						) : (
							results.items.map((item) => (
								<div key={item.id} className="mx-2 rounded-md hover:bg-sidebar-accent">
									<Button
										data-panel-row
										variant="ghost"
										title={item.detail ? `${item.label} · ${item.detail}` : item.label}
										onKeyDown={keys}
										className="h-auto min-h-8 w-full min-w-0 flex-col items-start gap-0 rounded-md px-2 py-1 text-left text-sm whitespace-normal"
										onClick={() => open(item)}
									>
										<span className="w-full truncate">{item.label}</span>
										{item.detail && (
											<span className="w-full truncate text-xs text-muted-foreground">
												{item.detail}
											</span>
										)}
									</Button>
								</div>
							))
						)}
						{results?.query === needle && !results.items.length && (
							<p className="px-3 py-2 text-xs text-muted-foreground">{t('workbench.noResults')}</p>
						)}
					</section>
				)}
				{needle && !search && !sections.length && !tree && (
					<p className="px-3 py-2 text-xs text-muted-foreground">{t('workbench.noResults')}</p>
				)}
				<div className="min-h-0 empty:hidden" ref={customRef} />
			</div>
			{tree && (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="min-h-0 flex-1">
						{(!dataSource || projection) && (
							<Tree
								nodes={nodes}
								ariaLabel={tree.label}
								selectedId={tree.selectedId}
								expandedIds={expandedIds}
								onExpandedChange={(next) =>
									setExpansion((previous) => ({
										...previous,
										[current.feature]: [
											...new Set([
												...(needle
													? (
															previous[current.feature] ??
															tree.defaultExpandedIds ??
															[]
														).filter((id) => !ids.branches.has(id))
													: []),
												...next.filter((id) => ids.branches.has(id)),
											]),
										].slice(-512),
									}))
								}
								search={model?.searchable ? query : ''}
								matchIds={dataSource && needle ? ids.all : search ? matchIds : undefined}
								emptyText={needle ? t('workbench.noResults') : tree.emptyText}
								onSelect={openTreeNode}
							/>
						)}
					</div>
					{dataSource && (
						<div className="max-h-[40%] shrink-0 overflow-y-auto border-t border-[var(--hu-line)] px-3 py-2">
							{dataPending && (
								<p role="status" className="text-xs text-[var(--hu-fg-3)]">
									{t('ui.tree.loading')}
								</p>
							)}
							{dataFailed && (
								<div className="flex flex-col gap-2">
									<p role="alert" className="text-xs text-[var(--hu-danger)]">
										{t('ui.tree.loadFailed')}
									</p>
									<Button
										type="button"
										variant="secondary"
										size="sm"
										onClick={() => setRetry((value) => value + 1)}
									>
										{t('ui.retry')}
									</Button>
								</div>
							)}
							{projection?.pages.map((page) => (
								<section key={page.id} aria-label={page.label} className="flex flex-col gap-1.5 py-1">
									<p className="m-0 text-xs text-[var(--hu-fg-3)]">
										{t('ui.tree.loaded', {
											label: page.label,
											loaded: page.loaded,
											total: page.total,
										})}
									</p>
									{page.loaded < page.total && (
										<Button
											type="button"
											variant="secondary"
											size="sm"
											busy={dataPending}
											onClick={() =>
												setPageState({
													key: dataKey,
													limits: {
														...limits,
														[page.id]: Math.min(
															page.total,
															Math.max(page.loaded, limits[page.id] ?? 0) +
																Math.max(1, Math.min(500, dataSource.pageSize ?? 100)),
														),
													},
												})
											}
										>
											{t('ui.tree.loadMore', { label: page.label })}
										</Button>
									)}
								</section>
							))}
						</div>
					)}
				</div>
			)}
		</aside>
	);
}
