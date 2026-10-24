// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/sidebar/index.tsx
import { useEffect, useId, useMemo, useState, type Ref, type KeyboardEvent } from 'react';
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
import { Tree } from '../../ui/components/tree';
import { cn } from '../../ui/lib/utils';
import { ShellIcon } from '../icon';
import { targetKey } from '../navigation-state';
import { useShellCloseAutoFocus } from '../interaction-lifetime';
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
	const needle = query.trim().toLocaleLowerCase();
	// A page that matches the query itself (settings: every setting of every category) replaces the sections by its rows.
	const search = model?.search;
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
	const sections = (search && needle && !model?.tree ? [] : model?.sections ?? [])
		.map((s) => ({ ...s, items: s.items.filter((i) => !needle || i.label.toLocaleLowerCase().includes(needle)) }))
		.filter((s) => !needle || s.items.length);
	const open = (item: PanelItem) => {
		void Promise.resolve(item.select?.())
			.then(() => {
				if (item.target) onNavigate(item.target);
			})
			.catch(report);
	};
	const tree = model?.tree;
	const openTreeNode = (id: string) => {
		void Promise.resolve(tree?.select?.(id))
			.then(() => {
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
			{!custom && <header className="flex h-11 shrink-0 items-center gap-2 px-3">
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
			</header>}
			{model?.primary && (
				<div className="px-3 pb-2">
					<Button
						variant="outline"
						size="sm"
						className="w-full justify-start"
						onClick={() => {
							void Promise.resolve(model.primary?.run()).catch(report);
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
						className="h-8"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={search?.placeholder ?? t('workbench.searchPanel')}
						aria-label={search?.placeholder ?? t('workbench.searchPanel')}
					/>
				</div>
			)}
			<div className={cn('min-h-0 overflow-y-auto scrollbar-sleek', tree ? 'max-h-[40%] flex-none empty:hidden' : 'flex-1')}>
				{sections.map((section) => (
					<section key={section.id} aria-label={section.title}>
						{section.title && (
							<div className="px-3 pt-3 pb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
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
													'h-8 min-w-0 flex-1 justify-start rounded-md px-2 text-[13px]',
													active && 'bg-sidebar-accent',
												)}
												onClick={() => open(item)}
											>
												{item.icon && (
													<ShellIcon name={item.icon} className="size-4 shrink-0" />
												)}
												<span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
												{item.meta && (
													<span className="max-w-24 truncate text-2xs text-muted-foreground">
														{item.meta}
													</span>
												)}
												{!!item.badge && (
													<span className="text-2xs tabular-nums">{item.badge}</span>
												)}
											</Button>
											{!!menu.length && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon-xs"
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
																	void Promise.resolve(m.run()).catch(report);
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
														void Promise.resolve(m.run()).catch(report);
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
										className="h-auto min-h-8 w-full min-w-0 flex-col items-start gap-0 rounded-md px-2 py-1 text-left text-[13px] whitespace-normal"
										onClick={() => open(item)}
									>
										<span className="w-full truncate">{item.label}</span>
										{item.detail && (
											<span className="w-full truncate text-2xs text-muted-foreground">{item.detail}</span>
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
				<div className="min-h-0 flex-1">
					<Tree
						nodes={tree.nodes}
						ariaLabel={tree.label}
						selectedId={tree.selectedId}
						defaultExpandedIds={tree.defaultExpandedIds}
						folderClick={tree.folderClick}
						search={model?.searchable ? query : ''}
						matchIds={search ? matchIds : undefined}
						emptyText={needle ? t('workbench.noResults') : tree.emptyText}
						onSelect={openTreeNode}
					/>
				</div>
			)}
		</aside>
	);
}
