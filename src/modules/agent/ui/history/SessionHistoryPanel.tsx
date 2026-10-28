// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/right-sidebar/AiVaultPanelHeader.tsx, AiVaultPanelControls.tsx, AiVaultSessionVirtualList.tsx, AiVaultSessionRow.tsx, AiVaultSessionDetails.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Copy, ListFilter, MoreHorizontal, Play, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from '../../../../ui/components/dropdown-menu';
import { AgentIcon } from '../../../../ui/components/huhu/AgentIcon';
import { useT } from '../../../../ui/react/hooks';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import { AGENT_CATALOG, getAgent } from '../../core/launch/catalog';
import type { AgentId } from '../../core/launch/types';
import type { AgentController } from '../../services/controller';
import type { HistoryRow } from '../../services/history-store';
import { historyActionMessage } from '../../services/launch/native-resume';
import { shortPath } from '../sidebar/AgentSidebar';
export const SPACE_ALL = '*';
export const SPACE_NONE = '';
/** Owner is the durable Space binding; a row whose owner Space no longer exists counts as unassigned. */
export function matchesSpace(
	owner: string | undefined,
	spaces: Readonly<Record<string, unknown>>,
	filter: string,
): boolean {
	const effective = owner && Object.hasOwn(spaces, owner) ? owner : SPACE_NONE;
	return filter === SPACE_ALL || filter === effective;
}
export const HISTORY_DRAG = 'application/x-huhu-history-session';
function accountName(accountKey: string, system: string): string {
	try {
		const env: unknown = JSON.parse(accountKey);
		const name = env && typeof env === 'object' ? (env as Record<string, unknown>).HUHU_ACCOUNT_NAME : undefined;
		return typeof name === 'string' && name ? name : system;
	} catch {
		return system;
	}
}
function SessionRow({
	row,
	controller,
	spaceLabel,
	assigned,
}: {
	row: HistoryRow;
	controller: AgentController;
	spaceLabel: string;
	assigned: boolean;
}) {
	const t = useT(),
		doc = useOwnerDocument(),
		[expanded, setExpanded] = useState(false),
		[busy, setBusy] = useState<'idle' | 'import' | 'resume'>('idle'),
		[confirming, setConfirming] = useState(false),
		continueRef = useRef<HTMLButtonElement>(null),
		toggleRef = useRef<HTMLButtonElement>(null),
		restoreFocus = useRef(false),
		[notice, setNotice] = useState<{ tone: 'error' | 'info'; text: string } | undefined>();
	// Continue and import share one in-flight guard, so a double click can never start two operations.
	const act = async (kind: 'import' | 'resume', work: () => Promise<string | undefined>) => {
		if (busy !== 'idle') return;
		setBusy(kind);
		setNotice(undefined);
		try {
			const text = await work();
			if (text) setNotice({ tone: 'info', text });
		} catch (error) {
			setNotice({ tone: 'error', text: historyActionMessage(error) });
		} finally {
			setBusy('idle');
		}
	};
	const doResume = () => {
		setConfirming(false);
		return act('resume', async () => {
			const result = await controller.resume(row);
			return result ? t(`agent.historyResume.${result.mode}`) : undefined;
		});
	};
	const doImport = () =>
		act('import', async () => {
			const result = await controller.importHistory(row);
			if (!result) return undefined;
			return t(result.created ? 'agent.historyResume.imported' : 'agent.historyResume.alreadyImported');
		});
	const continueBlocked = !!row.sourceStatus && row.sourceStatus !== 'available';
	// Cancel and Escape give focus back to the control that opened the confirmation.
	const cancelConfirm = () => {
		restoreFocus.current = true;
		setConfirming(false);
	};
	useEffect(() => {
		if (confirming || !restoreFocus.current) return;
		restoreFocus.current = false;
		(continueRef.current ?? toggleRef.current)?.focus();
	}, [confirming]);
	// A refresh may reset a row's preview; an expanded row reloads it instead of claiming there is no body.
	useEffect(() => {
		if (expanded && row.previewState === 'idle') void controller.historyStore.preview(row.key);
	}, [controller, expanded, row.key, row.previewState]);
	const run = (p: Promise<unknown>) => {
		void p.catch((e) => controller.workspace.report(e));
	};
	const copy = (text: string) => run(doc.defaultView!.navigator.clipboard.writeText(text));
	const actions = [
		{
			label: t('agent.historyResume.continue'),
			disabled: continueBlocked,
			run: () => {
				setExpanded(true);
				setConfirming(true);
			},
		},
		...(assigned
			? []
			: [
					{
						label: t('agent.historyResume.import'),
						run: () => {
							setExpanded(true);
							void doImport();
						},
					},
				]),
		{ label: t('agent.historyUI.copyResume'), run: () => run(controller.resumeCommand(row).then(copy)) },
		{ label: t('agent.copyId'), run: () => copy(row.sessionId) },
		{ label: t('agent.historyUI.copyLog'), run: () => copy(row.transcriptPath) },
		{ label: t('agent.historyUI.openLog'), run: () => run(controller.openHistoryPath(row, 'log')) },
		{ label: t('agent.historyUI.revealLog'), run: () => run(controller.openHistoryPath(row, 'reveal')) },
		{ label: t('agent.historyUI.openCwd'), run: () => run(controller.openHistoryPath(row, 'cwd')) },
		...(!row.sourceStatus || row.sourceStatus === 'available'
			? [
					{
						label: t('agent.historyUI.export'),
						run: () => run(controller.workspaceHistoryService().export(row)),
					},
				]
			: []),
		{
			label: t(row.metadata.favorite ? 'agent.historyUI.unfavorite' : 'agent.historyUI.favorite'),
			run: () => run(controller.historyStore.annotate(row.key, { favorite: !row.metadata.favorite })),
		},
		{
			label: t(row.metadata.archived ? 'agent.historyUI.unarchive' : 'agent.historyUI.archive'),
			run: () => run(controller.historyStore.annotate(row.key, { archived: !row.metadata.archived })),
		},
	];
	const menu = (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon-xs" aria-label={t('agent.historyUI.actions')}>
					<MoreHorizontal className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{actions.map((a) => (
					<DropdownMenuItem key={a.label} disabled={'disabled' in a && a.disabled} onSelect={a.run}>
						{a.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
	return (
		<article
			className="border-b border-sidebar-border/60"
			data-history-row={row.key}
			draggable
			onDragStart={(e) => {
				e.dataTransfer.setData(HISTORY_DRAG, row.key);
				e.dataTransfer.effectAllowed = 'copy';
			}}
		>
			<div className="group flex items-start gap-1 px-2.5 py-2 hover:bg-sidebar-accent/50">
				<button
					type="button"
					className="flex min-w-0 flex-1 items-start gap-2 text-left"
					ref={toggleRef}
					aria-expanded={expanded}
					onClick={() => {
						const next = !expanded;
						setExpanded(next);
						if (next) void controller.historyStore.preview(row.key);
					}}
				>
					<AgentIcon agent={row.agentId} size={14} />
					<span className="min-w-0 flex-1">
						<span className="block truncate text-[12px] font-medium text-foreground">
							{row.metadata.favorite ? '★ ' : ''}
							{row.metadata.title || row.title}
						</span>
						<span className="block truncate text-[11px] text-muted-foreground">
							{shortPath(row.cwd)} · {row.model || t('agent.stats.unknown')} ·{' '}
							{new Date(row.modifiedAtMs).toLocaleDateString()}
							{row.sourceStatus && row.sourceStatus !== 'available'
								? ` · ${t(`agent.historyUI.source.${row.sourceStatus}`)}`
								: ''}
						</span>
					</span>
				</button>
				{menu}
			</div>
			{expanded && (
				<div className="border-t border-sidebar-border/70 bg-background/30">
					<div className="space-y-3 p-3">
						<div className="space-y-1 text-[11px] text-muted-foreground">
							<dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
								<dt>{t('agent.historyUI.detail.provider')}</dt>
								<dd className="min-w-0 break-words text-foreground/90">
									{getAgent(row.agentId as AgentId).title}
								</dd>
								<dt>{t('agent.historyUI.detail.account')}</dt>
								<dd className="min-w-0 break-words text-foreground/90">
									{accountName(row.accountKey, t('agent.historyUI.account.system'))}
								</dd>
								<dt>{t('agent.historyUI.detail.space')}</dt>
								<dd className="min-w-0 break-words text-foreground/90">{spaceLabel}</dd>
								<dt>{t('agent.historyUI.detail.source')}</dt>
								<dd className="min-w-0 break-words text-foreground/90">
									{t(`agent.historyUI.source.${row.sourceStatus ?? 'unknown'}`)}
								</dd>
							</dl>
							<p className="break-all">{row.cwd}</p>
							<p>
								{row.model || t('agent.stats.unknown')} ·{' '}
								{t('agent.historyUI.messages', { count: row.messageCount })}
							</p>
						</div>
						<Input
							aria-label={t('agent.rename')}
							defaultValue={row.metadata.title || row.title}
							onBlur={(e) => {
								const title = e.target.value.trim();
								if (title && title !== (row.metadata.title || row.title))
									run(controller.historyStore.annotate(row.key, { title }));
							}}
						/>
						<section className="space-y-1.5">
							<div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
								<span>{t('agent.historyUI.firstPrompt')}</span>
								<Button
									variant="ghost"
									size="icon-xs"
									aria-label={t('agent.historyUI.copyPrompt')}
									onClick={() => copy(row.firstPrompt)}
								>
									<Copy className="size-3" />
								</Button>
							</div>
							<p className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/70 bg-foreground/[0.04] px-2.5 py-2 text-xs">
								{row.previewState === 'loading'
									? t('agent.historyUI.loading')
									: row.previewState === 'unavailable'
										? row.readError || t('agent.historyUI.noPreview')
										: row.firstPrompt || t('agent.historyUI.noPreview')}
							</p>
						</section>
						<section className="space-y-1.5">
							<h4 className="text-[11px] font-semibold uppercase text-muted-foreground">
								{t('agent.historyUI.latest')}
							</h4>
							{row.turns.slice(-5).map((turn, index) => (
								<div
									key={index}
									className="rounded-md border border-sidebar-border/70 bg-sidebar-accent/25 px-2.5 py-2"
								>
									<span className="text-[10px] font-semibold uppercase text-muted-foreground">
										{t(`agent.historyUI.role.${turn.role}`)}
									</span>
									<p className="line-clamp-2 text-[12px] leading-[1.35] text-foreground/90 [overflow-wrap:anywhere]">
										{turn.text}
									</p>
								</div>
							))}
						</section>
						{row.readError && row.previewState !== 'unavailable' && (
							<p role="alert" className="text-xs text-destructive">
								{row.readError}
							</p>
						)}
						{!assigned && (
							<p className="text-[11px] text-muted-foreground">
								{t('agent.historyResume.unassignedNote')}
							</p>
						)}
						{confirming && (
							<div
								role="group"
								aria-label={t('agent.historyResume.confirmTitle')}
								className="space-y-2 rounded-md border border-border/70 bg-foreground/[0.04] p-2.5 text-xs"
								onKeyDown={(event) => {
									if (event.key === 'Escape') {
										event.stopPropagation();
										cancelConfirm();
									}
								}}
							>
								<p className="font-semibold text-foreground">{t('agent.historyResume.confirmTitle')}</p>
								<p className="break-words text-muted-foreground">
									{t('agent.historyResume.confirmBody', {
										provider: getAgent(row.agentId as AgentId).title,
										cwd: row.cwd,
									})}
									{!assigned && ` ${t('agent.historyResume.confirmUnassigned')}`}
								</p>
								<div className="flex gap-1">
									<Button variant="secondary" size="xs" autoFocus onClick={() => void doResume()}>
										{t('agent.historyResume.confirmAction')}
									</Button>
									<Button variant="ghost" size="xs" onClick={cancelConfirm}>
										{t('common.cancel')}
									</Button>
								</div>
							</div>
						)}
						{busy !== 'idle' && (
							<p role="status" className="text-xs text-muted-foreground">
								{t(busy === 'resume' ? 'agent.historyResume.working' : 'agent.historyResume.importing')}
							</p>
						)}
						{notice && (
							<div
								role={notice.tone === 'error' ? 'alert' : 'status'}
								className={
									notice.tone === 'error'
										? 'flex items-start gap-2 text-xs text-destructive'
										: 'flex items-start gap-2 text-xs text-muted-foreground'
								}
							>
								<span className="min-w-0 flex-1 break-words">
									{notice.tone === 'error' && (
										<strong className="mr-1 font-semibold">
											{t('agent.historyResume.failedTitle')}.
										</strong>
									)}
									{notice.text}
								</span>
								<Button variant="ghost" size="xs" onClick={() => setNotice(undefined)}>
									{t('agent.historyResume.dismiss')}
								</Button>
							</div>
						)}
						<div className="flex flex-wrap items-center gap-1">
							<Button
								variant="secondary"
								size="xs"
								ref={continueRef}
								disabled={busy !== 'idle' || continueBlocked}
								title={
									continueBlocked
										? t(`agent.historyUI.source.${row.sourceStatus!}`)
										: t('agent.historyResume.continueHint')
								}
								onClick={() => setConfirming(true)}
							>
								<Play className="size-3.5" />
								{t('agent.historyResume.continue')}
							</Button>
							{!assigned && (
								<Button
									variant="ghost"
									size="xs"
									disabled={busy !== 'idle'}
									title={t('agent.historyResume.importHint')}
									onClick={() => void doImport()}
								>
									{t('agent.historyResume.import')}
								</Button>
							)}
							<Button
								variant="ghost"
								size="xs"
								onClick={() => run(controller.resumeCommand(row).then(copy))}
							>
								{t('agent.historyUI.copyResume')}
							</Button>
						</div>
					</div>
				</div>
			)}
		</article>
	);
}
export function SessionHistoryPanel({ controller, close }: { controller: AgentController; close: () => void }) {
	'use no memo';
	const t = useT(),
		state = useStore(controller.historyStore.store),
		visible = useVisible(),
		scroll = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState(''),
		[agents, setAgents] = useState(AGENT_CATALOG.map((a) => a.id as string)),
		[group, setGroup] = useState<'none' | 'agent' | 'cwd'>('none'),
		[sort, setSort] = useState<'updated' | 'created'>('updated'),
		[hideEmpty, setHideEmpty] = useState(false),
		[archived, setArchived] = useState(false),
		[spaceFilter, setSpaceFilter] = useState<string>(SPACE_ALL),
		spaceRecords = useStore(controller.spaces.store, (state) => state.records.spaces),
		owners = useStore(controller.spaces.store, (state) => state.records.historyOwners);
	const spaceList = useMemo(() => Object.values(spaceRecords).filter((space) => !space.archived), [spaceRecords]);
	const archivedSpaces = useMemo(() => Object.values(spaceRecords).filter((space) => space.archived), [spaceRecords]);
	const spaceLabelFor = (owner: string | undefined) => {
		const space = owner ? spaceRecords[owner] : undefined;
		if (!space) return t('agent.historyUI.space.unassigned');
		return space.archived ? t('agent.historyUI.space.archivedName', { name: space.name }) : space.name;
	};
	const failed = state.warnings.filter((warning) => !warning.startsWith('history-owner:'));
	useEffect(() => {
		if (visible) void controller.historyStore.refresh(false);
	}, [controller, visible]);
	const filtered = useMemo(
		() =>
			state.rows
				.filter(
					(row) =>
						agents.includes(row.agentId) &&
						(!row.metadata.archived || archived) &&
						(!hideEmpty || row.messageCount > 0) &&
						matchesSpace(row.sourceRef ? owners?.[row.sourceRef] : undefined, spaceRecords, spaceFilter) &&
						[
							row.metadata.title,
							row.title,
							row.cwd,
							row.model,
							row.firstPrompt,
							...row.turns.slice(-5).map((x) => x.text),
						]
							.join(' ')
							.toLowerCase()
							.includes(query.toLowerCase()),
				)
				.sort((a, b) =>
					sort === 'created' ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : b.modifiedAtMs - a.modifiedAtMs,
				),
		[state.rows, agents, archived, hideEmpty, query, sort, spaceFilter, owners, spaceRecords],
	);
	const rows = useMemo(() => {
		const groups = new Map<string, HistoryRow[]>();
		for (const row of filtered) {
			const key =
				group === 'agent'
					? AGENT_CATALOG.find((a) => a.id === row.agentId)?.title || row.agentId
					: group === 'cwd'
						? row.cwd
						: '';
			const items = groups.get(key) ?? [];
			items.push(row);
			groups.set(key, items);
		}
		return [...groups].flatMap(([key, items]) => [
			...(key ? [{ key: `group:${key}`, label: key }] : []),
			...items.map((row) => ({ key: row.key, row })),
		]);
	}, [filtered, group]);
	const virtual = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scroll.current,
		estimateSize: (index) => ('row' in rows[index]! ? 64 : 32),
		getItemKey: (index) => rows[index]!.key,
		overscan: 8,
	});
	return (
		<aside
			className="@container/ai-vault flex h-full min-h-0 flex-col bg-sidebar"
			aria-label={t('agent.historyUI.title')}
		>
			<div className="shrink-0 border-b border-sidebar-border px-2.5 py-2">
				<div className="flex items-center gap-1.5">
					<div className="min-w-0 flex-1">
						<h3 className="truncate text-xs font-semibold text-foreground">{t('agent.historyUI.title')}</h3>
						<p className="truncate text-[11px] text-muted-foreground">
							{t('agent.historyUI.count', { shown: filtered.length, total: state.rows.length })}
						</p>
					</div>
					<Button
						variant="ghost"
						size="icon-xs"
						disabled={state.loading}
						aria-label={t('agent.refresh')}
						onClick={() => {
							void controller.historyStore.refresh();
						}}
					>
						<RefreshCw
							className={state.loading ? 'size-3 animate-spin motion-reduce:animate-none' : 'size-3'}
						/>
					</Button>
					<Button variant="ghost" size="icon-xs" aria-label={t('agent.close')} onClick={close}>
						<X className="size-3" />
					</Button>
				</div>
				<div className="mt-2 flex items-center gap-1.5">
					<Search className="size-3.5 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={t('agent.historyUI.search')}
						aria-label={t('agent.historyUI.search')}
						className="h-8 min-w-0 flex-1 text-xs"
					/>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon-xs" aria-label={t('agent.historyUI.view')}>
								<ListFilter className="size-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel>{t('agent.historyUI.agents')}</DropdownMenuLabel>
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault();
									setAgents(AGENT_CATALOG.map((a) => a.id));
								}}
							>
								{t('agent.historyUI.all')}
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault();
									setAgents([]);
								}}
							>
								{t('agent.historyUI.clear')}
							</DropdownMenuItem>
							{AGENT_CATALOG.map((a) => (
								<DropdownMenuCheckboxItem
									key={a.id}
									checked={agents.includes(a.id)}
									onSelect={(e) => e.preventDefault()}
									onCheckedChange={(value) =>
										setAgents((old) => (value ? [...old, a.id] : old.filter((id) => id !== a.id)))
									}
								>
									{a.title}
								</DropdownMenuCheckboxItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuLabel>{t('agent.historyUI.space.label')}</DropdownMenuLabel>
							{[
								{ id: SPACE_ALL, label: t('agent.historyUI.space.all') },
								...spaceList.map((space) => ({ id: space.id, label: space.name })),
								{ id: SPACE_NONE, label: t('agent.historyUI.space.unassigned') },
							].map((item) => (
								<DropdownMenuCheckboxItem
									key={item.id}
									checked={spaceFilter === item.id}
									onCheckedChange={() => setSpaceFilter(item.id)}
								>
									{item.label}
								</DropdownMenuCheckboxItem>
							))}
							{archivedSpaces.length > 0 && (
								<>
									<DropdownMenuLabel>{t('agent.historyUI.space.archivedGroup')}</DropdownMenuLabel>
									{archivedSpaces.map((space) => (
										<DropdownMenuCheckboxItem
											key={space.id}
											checked={spaceFilter === space.id}
											onCheckedChange={() => setSpaceFilter(space.id)}
										>
											{space.name}
										</DropdownMenuCheckboxItem>
									))}
								</>
							)}
							<DropdownMenuSeparator />
							{(['updated', 'created'] as const).map((value) => (
								<DropdownMenuCheckboxItem
									key={value}
									checked={sort === value}
									onCheckedChange={() => setSort(value)}
								>
									{t(`agent.historyUI.${value}`)}
								</DropdownMenuCheckboxItem>
							))}
							<DropdownMenuSeparator />
							{(['none', 'agent', 'cwd'] as const).map((value) => (
								<DropdownMenuCheckboxItem
									key={value}
									checked={group === value}
									onCheckedChange={() => setGroup(value)}
								>
									{t(`agent.historyUI.group.${value}`)}
								</DropdownMenuCheckboxItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem checked={hideEmpty} onCheckedChange={setHideEmpty}>
								{t('agent.historyUI.hideEmpty')}
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem checked={archived} onCheckedChange={setArchived}>
								{t('agent.historyUI.showArchived')}
							</DropdownMenuCheckboxItem>
							<DropdownMenuItem
								onSelect={() => {
									setQuery('');
									setAgents(AGENT_CATALOG.map((a) => a.id));
									setGroup('none');
									setSort('updated');
									setHideEmpty(false);
									setArchived(false);
									setSpaceFilter(SPACE_ALL);
								}}
							>
								{t('agent.manage.reset')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			{state.error && (
				<div role="alert" className="flex items-center gap-2 p-3 text-xs text-destructive">
					<span className="min-w-0 flex-1 break-words">{state.error}</span>
					<Button variant="ghost" size="xs" onClick={() => void controller.historyStore.refresh()}>
						{t('agent.historyUI.retry')}
					</Button>
				</div>
			)}
			{failed.length > 0 && (
				<div role="status" className="space-y-1 p-2 text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<span className="min-w-0 flex-1">{t('agent.historyUI.partial', { count: failed.length })}</span>
						<Button variant="ghost" size="xs" onClick={() => void controller.historyStore.refresh()}>
							{t('agent.historyUI.retry')}
						</Button>
					</div>
					<details>
						<summary className="cursor-pointer">{t('agent.historyUI.partialDetails')}</summary>
						<ul className="mt-1 max-h-24 overflow-auto break-words">
							{failed.slice(0, 20).map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					</details>
				</div>
			)}
			<div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
				<div className="relative w-full" style={{ height: virtual.getTotalSize() }}>
					{virtual.getVirtualItems().map((item) => {
						const row = rows[item.index]!;
						return (
							<div
								key={item.key}
								ref={virtual.measureElement}
								data-index={item.index}
								className="absolute left-0 top-0 w-full"
								style={{ transform: `translateY(${item.start}px)` }}
							>
								{'row' in row ? (
									<SessionRow
										row={row.row}
										controller={controller}
										spaceLabel={spaceLabelFor(
											row.row.sourceRef ? owners?.[row.row.sourceRef] : undefined,
										)}
										assigned={
											!!row.row.sourceRef &&
											!!owners?.[row.row.sourceRef] &&
											Object.hasOwn(spaceRecords, owners[row.row.sourceRef]!)
										}
									/>
								) : (
									<h4 className="flex h-8 items-center border-y border-sidebar-border bg-sidebar-accent/60 px-3 text-xs font-semibold">
										{row.label}
									</h4>
								)}
							</div>
						);
					})}
				</div>
				{!rows.length && state.loading && (
					<p role="status" className="p-6 text-center text-xs text-muted-foreground">
						{t('agent.historyUI.loading')}
					</p>
				)}
				{!rows.length && !state.loading && (
					<div className="space-y-2 p-6 text-center text-xs text-muted-foreground">
						<p>{t('agent.historyUI.empty')}</p>
						{query && (
							<Button variant="secondary" size="xs" onClick={() => setQuery('')}>
								{t('agent.historyUI.clearSearch')}
							</Button>
						)}
					</div>
				)}
			</div>
		</aside>
	);
}
