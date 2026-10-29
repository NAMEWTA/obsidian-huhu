// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/sidebar/SidebarNav.tsx, worktree-card-surface.tsx, StatusIndicator.tsx
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { ChevronDown, ListFilter, MoreHorizontal, PanelLeftClose, Search, TerminalSquare } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../../../../ui/components/dropdown-menu';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from '../../../../ui/components/context-menu';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '../../../../ui/components/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { useT } from '../../../../ui/react/hooks';
import { useOwnerDocument } from '../../../../ui/react/contexts';
import { cn } from '../../../../ui/lib/utils';
import type { PageKind, PageTabData, WorkspaceState, WorkspaceTab } from '../../core/workspace/model';
import type { ManagedSessionSummary, ManagedSnapshot } from '../../core/workspace/managed-runtime';
import type { SpaceService } from '../../services/spaces/space-service';
import { PAGE_ICONS } from '../pages/page-icons';
import { useWorkspaceUI } from '../workspace/workspace-context';
import { TabLeadingIcon } from '../tabs/TabLeadingIcon';
import { NewTabMenu } from '../create/NewTabMenu';
import { sessionBucket } from '../../core/workspace/sidebar';
import { useAgentSettings } from '../settings/settings-context';
import { pickMaterial } from '../terminal/material-picker';
import { openPath } from '../../platform/desktop/files';
import { SpaceNavigation } from './SpaceNavigation';
import { LifecycleFeedback, ManagedLifecycleStatus, useLifecycleAction } from './managed-lifecycle';
export function shortPath(path: string): string {
	const parts = path.split(/[\\/]/).filter(Boolean);
	return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : path;
}
/** A session or browser tab; pages (board, usage, automations) are listed by the entries above, not here. */
function SessionCard({
	tab,
	managedSnapshot,
}: {
	tab: Exclude<WorkspaceTab, PageTabData>;
	managedSnapshot: ManagedSnapshot;
}) {
	const { controller, close, confirm } = useWorkspaceUI(),
		workspace = controller.workspace,
		t = useT(),
		doc = useOwnerDocument();
	const [rename, setRename] = useState(false),
		[draft, setDraft] = useState('');
	const current = workspace.active?.id === tab.id,
		group = workspace.group(tab.id)!;
	const path =
		tab.kind === 'terminal'
			? (tab.panes[tab.focusedSessionId]?.cwd ?? '')
			: (controller.browserPage(tab)?.url ?? '');
	const session = tab.kind === 'terminal' ? controller.sessions.get(tab.focusedSessionId) : undefined;
	const pane = tab.kind === 'terminal' ? tab.panes[tab.focusedSessionId] : undefined;
	const managed =
		tab.kind === 'terminal'
			? managedSnapshot.sessions.find((item) =>
					item.runtime
						? item.runtime.runtimeId === tab.focusedSessionId
						: item.spaceId === pane?.spaceId && item.sessionId === pane?.persistentSessionId,
				)
			: undefined;
	const lifecycle = useLifecycleAction(workspace, confirm);
	const managedTitle = managed
		? [
				managed.title,
				managed.agentId ? controller.agentTitle(managed.agentId) : '',
				controller.spaces?.store.getState().records.spaces?.[managed.spaceId]?.name,
			]
				.filter(Boolean)
				.join(' · ')
		: '';
	const managedRef = managed?.runtime
		? { spaceId: managed.spaceId, sessionId: managed.sessionId, runtimeId: managed.runtime.runtimeId }
		: undefined;
	const actions: { label: string; run: () => void; destructive?: boolean; disabled?: boolean }[] = [
		{
			label: t('agent.rename'),
			run: () => {
				setDraft(tab.customTitle || tab.title);
				setRename(true);
			},
		},
		{
			label: t('agent.workspace.split.right'),
			run: () => workspace.move(tab.id, { split: 'right', ofGroupId: group.id }),
		},
		{
			label: t('agent.workspace.split.down'),
			run: () => workspace.move(tab.id, { split: 'down', ofGroupId: group.id }),
		},
		{
			label: t('agent.copyId'),
			run: () => {
				void doc.defaultView?.navigator.clipboard
					.writeText(
						tab.kind === 'terminal'
							? tab.panes[tab.focusedSessionId]?.nativeSessionId || tab.focusedSessionId
							: tab.pageId,
					)
					.catch((e) => workspace.report(e));
			},
		},
		{
			label: t('agent.copyPath'),
			run: () => {
				void doc.defaultView?.navigator.clipboard.writeText(path).catch((e) => workspace.report(e));
			},
		},
		...(tab.kind === 'terminal'
			? [
					{
						label: t('agent.reveal'),
						run: () => {
							void openPath(path).catch((e) => workspace.report(e));
						},
					},
				]
			: []),
		...(session?.agentId
			? [
					{
						label: t('agent.attach'),
						disabled: !session.running,
						run: () => pickMaterial(controller, session.id),
					},
				]
			: []),
		...(tab.kind === 'terminal'
			? [
					{
						label: t('agent.end'),
						destructive: true,
						disabled: !tab.sessionIds.some((id) => controller.sessions.get(id)?.running),
						run: () => {
							void workspace.end(tab.id, confirm).catch((e) => workspace.report(e));
						},
					},
				]
			: []),
		...(managed
			? [
					{
						label: t('agent.managed.archive'),
						destructive: true,
						disabled: lifecycle.busy || managed.archived,
						run: () => {
							void lifecycle.archive(
								{ kind: 'session', spaceId: managed.spaceId, sessionId: managed.sessionId },
								managedTitle,
							);
						},
					},
					...(managedRef
						? [
								{
									label: t('agent.managed.stop'),
									destructive: true,
									disabled: lifecycle.busy || managed.archived,
									run: () => {
										void lifecycle.stop(managedRef, managedTitle);
									},
								},
								{
									label: t('agent.managed.checkStop'),
									disabled: lifecycle.busy,
									run: () => {
										void lifecycle.check(managedRef);
									},
								},
							]
						: []),
				]
			: []),
		{
			label: t(
				tab.kind === 'terminal' && session?.running ? 'agent.managed.closeView' : 'agent.workspace.closeTab',
			),
			run: () => close(tab.id),
		},
	];
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const win = doc.defaultView;
		const timer = win?.setInterval(() => setNow(Date.now()), 60_000);
		return () => win?.clearInterval(timer);
	}, [doc]);
	const age = Math.max(0, Math.floor((now - tab.createdAt) / 60_000));
	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div
						data-current={current || undefined}
						data-session-card={tab.id}
						className={cn(
							'group mx-2 flex items-start rounded-md px-2 py-1.5 hover:bg-sidebar-accent/60',
							current && 'bg-sidebar-accent',
							tab.kind === 'terminal' &&
								['waiting', 'permission'].includes(tab.state) &&
								'bg-agent-question/8',
						)}
					>
						<button
							type="button"
							className="flex min-w-0 flex-1 flex-col items-stretch justify-start rounded-sm text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
							onClick={() => workspace.activate(tab.id)}
							onDoubleClick={actions[0]!.run}
						>
							<span className="flex items-center gap-2">
								<TabLeadingIcon tab={tab} sidebar />
								<span
									className={cn(
										'min-w-0 truncate text-[13px] font-medium',
										tab.kind === 'terminal' && tab.unread && 'font-bold',
									)}
								>
									<span title={tab.customTitle || tab.title}>{tab.customTitle || tab.title}</span>
								</span>
							</span>
							<span className="mt-0.5 block truncate pl-5 text-xs text-muted-foreground" title={path}>
								{shortPath(path)} · {age ? t('agent.minutesAgo', { count: age }) : t('agent.justNow')}
							</span>
						</button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon-xs"
									className="size-5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
									aria-label={t('agent.more')}
								>
									<MoreHorizontal className="size-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								{actions.map((action) => (
									<DropdownMenuItem
										key={action.label}
										disabled={action.disabled}
										variant={action.destructive ? 'destructive' : 'default'}
										onSelect={action.run}
									>
										{action.label}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					{actions.map((action) => (
						<ContextMenuItem
							key={action.label}
							disabled={action.disabled}
							variant={action.destructive ? 'destructive' : 'default'}
							onSelect={action.run}
						>
							{action.label}
						</ContextMenuItem>
					))}
				</ContextMenuContent>
			</ContextMenu>
			{managed && (
				<div className="mx-3 min-w-0 space-y-1 pb-1">
					<ManagedLifecycleStatus session={managed} />
					{managed.runtime?.error && (
						<p role="alert" className="m-0 break-words text-xs text-destructive">
							{t(managed.runtime.error.messageKey)}
						</p>
					)}
					<LifecycleFeedback action={lifecycle} />
				</div>
			)}
			<Dialog open={rename} onOpenChange={setRename}>
				<DialogContent>
					<DialogTitle>{t('agent.rename')}</DialogTitle>
					<Input
						autoFocus
						aria-label={t('agent.renameLabel')}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
								workspace.rename(tab.id, draft);
								setRename(false);
							}
						}}
					/>
					<DialogFooter>
						<Button
							onClick={() => {
								workspace.rename(tab.id, draft);
								setRename(false);
							}}
						>
							{t('common.save')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function needsAttention(session: ManagedSessionSummary): boolean {
	const activity = session.runtime?.activityDetail;
	return !!(
		activity?.unreadCompletion ||
		activity?.blocking.state === 'blocked' ||
		activity?.lastFact?.blocking.state === 'blocked' ||
		activity?.sources.some((source) => source.lastFact?.blocking.state === 'blocked') ||
		(session.completionHint && session.completionHint.activitySequence > session.completionHint.seenThrough)
	);
}

function ActivityEvidence({ session }: { session: ManagedSessionSummary }) {
	const t = useT(),
		activity = session.runtime?.activityDetail,
		hint = session.completionHint;
	if (!activity && !hint) return null;
	const historical =
		activity?.blocking.state !== 'blocked' &&
		(activity?.lastFact?.blocking.state === 'blocked' ||
			activity?.sources.some((source) => source.lastFact?.blocking.state === 'blocked'));
	return (
		<div className="min-w-0 space-y-1 text-xs text-muted-foreground" data-activity-evidence>
			{activity && (
				<>
					<p className="m-0">
						{t(
							activity.source.health === 'current'
								? 'agent.activityEvidence.sourceCurrent'
								: 'agent.activityEvidence.currentUnknown',
						)}
					</p>
					<p className="m-0">
						{t(
							`agent.activityEvidence.blocking.${activity.blocking.state === 'blocked' ? activity.blocking.reason : activity.blocking.state}`,
						)}
					</p>
					{historical && <p className="m-0">{t('agent.activityEvidence.historicalBlocked')}</p>}
					<p className="m-0">{t('agent.activityEvidence.foregroundUnknown')}</p>
					{activity.source.reason && (
						<p className="m-0">{t(`agent.activityEvidence.reason.${activity.source.reason}`)}</p>
					)}
					{activity.sources.map((source) => (
						<div
							key={source.bindingId}
							className="min-w-0 break-words border-l border-border pl-2"
							data-activity-source={source.bindingId}
						>
							<p className="m-0">
								{source.meta.provider} ·{' '}
								{source.meta.observedVersion || t('agent.activityEvidence.unknownVersion')} ·{' '}
								{source.meta.adapterRevision}
							</p>
							<p className="m-0">
								{t(
									source.health === 'current'
										? 'agent.activityEvidence.sourceCurrent'
										: source.health === 'unavailable'
											? 'agent.activityEvidence.sourceUnavailable'
											: 'agent.activityEvidence.sourceUnknown',
								)}
								{source.reason ? ` · ${t(`agent.activityEvidence.reason.${source.reason}`)}` : ''}
							</p>
							{source.lastFact && (
								<p className="m-0">
									{t('agent.activityEvidence.lastObserved')}: {source.lastFact.event} ·{' '}
									{source.lastFact.blocking.state === 'blocked'
										? t(`agent.activityEvidence.blocking.${source.lastFact.blocking.reason}`)
										: t(`agent.activityEvidence.blocking.${source.lastFact.blocking.state}`)}{' '}
									·{' '}
									<time dateTime={new Date(source.lastFact.observedAt).toISOString()}>
										{new Date(source.lastFact.observedAt).toLocaleString()}
									</time>
								</p>
							)}
						</div>
					))}
				</>
			)}
			{activity?.unreadCompletion && (
				<p className="m-0 font-medium">{t('agent.activityEvidence.unreadCompletion')}</p>
			)}
			{hint &&
				hint.activitySequence > hint.seenThrough &&
				(!activity || hint.runtimeId !== activity.at.runtimeId) && (
					<p className="m-0">
						{t('agent.activityEvidence.previousCompletion')} · {hint.runtimeId}
					</p>
				)}
		</div>
	);
}

function AttentionSessions({ snapshot, query }: { snapshot: ManagedSnapshot; query: string }) {
	const t = useT(),
		id = useId();
	const rows = snapshot.sessions.filter(
		(session) =>
			needsAttention(session) &&
			[session.title, session.spaceId, session.sessionId, session.runtime?.runtimeId]
				.join(' ')
				.toLocaleLowerCase()
				.includes(query.toLocaleLowerCase()),
	);
	if (!rows.length) return null;
	return (
		<section
			aria-labelledby={id}
			className="space-y-1 pb-2"
			onKeyDown={(event) => {
				const element = event.target as HTMLElement;
				if (!element.hasAttribute('data-activity-open')) return;
				const buttons = [
					...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-activity-open]:not(:disabled)'),
				];
				const index = buttons.indexOf(element as HTMLButtonElement);
				const target =
					event.key === 'Home'
						? buttons[0]
						: event.key === 'End'
							? buttons.at(-1)
							: event.key === 'ArrowDown'
								? buttons[(index + 1) % buttons.length]
								: event.key === 'ArrowUp'
									? buttons[(index - 1 + buttons.length) % buttons.length]
									: undefined;
				if (target) {
					event.preventDefault();
					target.focus();
				}
			}}
		>
			<h3 id={id} className="m-0 px-3 py-1 text-xs font-semibold">
				<span>{t('agent.activityEvidence.pending')}</span>
				<span aria-hidden="true"> · {rows.length}</span>
			</h3>
			{rows.map((session) => (
				<ManagedCard
					key={JSON.stringify([session.spaceId, session.sessionId, session.runtime?.runtimeId])}
					session={session}
					attention
				/>
			))}
		</section>
	);
}

function ManagedCard({ session, attention = false }: { session: ManagedSessionSummary; attention?: boolean }) {
	const { controller, confirm } = useWorkspaceUI(),
		t = useT(),
		statusId = useId();
	const lifecycle = useLifecycleAction(controller.workspace, confirm);
	const targetTitle = [
		session.title,
		session.agentId ? controller.agentTitle(session.agentId) : '',
		controller.spaces?.store.getState().records.spaces?.[session.spaceId]?.name,
	]
		.filter(Boolean)
		.join(' · ');
	const ref = session.runtime
		? { spaceId: session.spaceId, sessionId: session.sessionId, runtimeId: session.runtime.runtimeId }
		: undefined;
	const [opening, setOpening] = useState(false),
		[message, setMessage] = useState(''),
		[recordView, setRecordView] = useState(false);
	const busy = useRef(false),
		mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const phase = session.runtime?.phase;
	const phaseLabel = phase ? t(`agent.managed.${phase === 'launch-pending' ? 'starting' : phase}`) : '';
	const stateLabel =
		session.viewState === 'restored'
			? t('agent.managed.restored')
			: [
					session.viewState === 'background' || session.viewState === 'detached'
						? t(`agent.managed.${session.viewState}`)
						: '',
					phaseLabel,
				]
					.filter(Boolean)
					.join(' · ');
	const open = async () => {
		if (busy.current || !mounted.current) return;
		busy.current = true;
		setOpening(true);
		setMessage('');
		const target = { spaceId: session.spaceId, sessionId: session.sessionId };
		try {
			if (!session.runtime || recordView) {
				const result = await controller.workspace.openManagedRecord(target);
				if (mounted.current && result.status === 'failed') setMessage(t(result.error.messageKey));
			} else {
				const result = await controller.workspace.attachManaged(target, {
					expectedRuntimeId: session.runtime.runtimeId,
					focus: true,
				});
				if (!mounted.current) return;
				if (result.status === 'failed') setMessage(t(result.error.messageKey));
				else if (result.status === 'pending') setMessage(t('agent.managed.starting'));
				else if (result.status === 'not-running') {
					setMessage(t('agent.managed.notRunning'));
					setRecordView(true);
				}
			}
		} catch {
			if (mounted.current) setMessage(t('agent.managed.unavailable'));
		} finally {
			busy.current = false;
			if (mounted.current) setOpening(false);
		}
	};
	return (
		<div
			className="mx-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent/60"
			data-managed-session={session.sessionId}
			data-managed-runtime={session.runtime?.runtimeId}
			data-activity-session={attention ? session.sessionId : undefined}
		>
			<button
				type="button"
				disabled={opening}
				data-activity-open={attention || undefined}
				aria-label={`${t(attention && session.runtime ? 'agent.activityEvidence.viewTerminal' : 'agent.managed.open')}: ${session.title}`}
				aria-describedby={statusId}
				className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 pointer-coarse:min-h-11"
				onClick={() => {
					void open();
				}}
			>
				<TerminalSquare className="size-3.5 shrink-0" aria-hidden="true" />
				<span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={session.title}>
					{session.title}
				</span>
			</button>
			<p id={statusId} className="m-0 text-xs text-muted-foreground">
				{stateLabel}
			</p>
			<p
				className="m-0 truncate text-2xs text-muted-foreground"
				title={`${targetTitle} · ${session.spaceId} · ${session.sessionId} · ${session.runtime?.runtimeId ?? ''}`}
			>
				{targetTitle} · {session.spaceId} · {session.sessionId} · {session.runtime?.runtimeId}
			</p>
			<ActivityEvidence session={session} />
			{session.runtime?.error && (
				<p className="m-0 text-xs text-destructive">{t(session.runtime.error.messageKey)}</p>
			)}
			{message && (
				<p role="status" className="m-0 text-xs text-muted-foreground">
					{message}
				</p>
			)}
			<ManagedLifecycleStatus session={session} />
			<div className="mt-1 flex flex-wrap gap-1 pointer-coarse:[&_button]:min-h-11">
				{ref && (
					<Button
						variant="ghost"
						size="sm"
						disabled={session.archived}
						aria-disabled={lifecycle.busy || undefined}
						onClick={() => {
							void lifecycle.stop(ref, targetTitle);
						}}
					>
						{t('agent.managed.stop')}
					</Button>
				)}
				{ref && session.runtime?.stop && session.runtime.stop.outcome !== 'confirmed' && (
					<Button
						variant="ghost"
						size="sm"
						disabled={session.archived}
						aria-disabled={lifecycle.busy || undefined}
						onClick={() => {
							void lifecycle.stop(ref, targetTitle, true);
						}}
					>
						{t('agent.managed.forceStop')}
					</Button>
				)}
				{ref && (session.runtime?.stop || session.runtime?.phase === 'disconnected') && (
					<Button
						variant="ghost"
						size="sm"
						aria-disabled={lifecycle.busy || undefined}
						onClick={() => {
							void lifecycle.check(ref);
						}}
					>
						{t('agent.managed.checkStop')}
					</Button>
				)}
				{!session.archived && (
					<Button
						variant="ghost"
						size="sm"
						aria-disabled={lifecycle.busy || undefined}
						onClick={() => {
							void lifecycle.archive(
								{ kind: 'session', spaceId: session.spaceId, sessionId: session.sessionId },
								targetTitle,
							);
						}}
					>
						{t('agent.managed.archive')}
					</Button>
				)}
			</div>
			<LifecycleFeedback action={lifecycle} />
		</div>
	);
}

/** Supplement the retained tab cards with records which have no current visible runtime reference. */
function ManagedSessions({
	spaces,
	state,
	query,
	showShells,
	snapshot,
}: {
	spaces: SpaceService;
	state: WorkspaceState;
	query: string;
	showShells: boolean;
	snapshot: ManagedSnapshot;
}) {
	const spaceId = useStore(spaces.store, (state) => state.records.selectedSpaceId);
	const terminals = Object.values(state.tabs).filter((tab) => tab.kind === 'terminal');
	const attached = new Set(terminals.flatMap((tab) => tab.sessionIds));
	const restored = new Set(
		terminals.flatMap((tab) =>
			Object.values(tab.panes)
				.filter((pane) => pane.spaceId && pane.persistentSessionId)
				.map((pane) => JSON.stringify([pane.spaceId, pane.persistentSessionId])),
		),
	);
	const rows = snapshot.sessions.filter(
		(session) =>
			!needsAttention(session) &&
			session.spaceId === spaceId &&
			(showShells || session.kind !== 'shell') &&
			session.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
			(session.runtime
				? !attached.has(session.runtime.runtimeId)
				: !restored.has(JSON.stringify([session.spaceId, session.sessionId]))),
	);
	return (
		<div>
			{rows.map((session) => (
				<ManagedCard
					key={JSON.stringify([session.spaceId, session.sessionId, session.runtime?.runtimeId])}
					session={session}
				/>
			))}
		</div>
	);
}
export function AgentSidebar({ togglePanel }: { togglePanel?: () => void }) {
	const { controller, chrome, confirm } = useWorkspaceUI(),
		state = useStore(controller.workspace.store),
		t = useT();
	const [query, setQuery] = useState(''),
		[collapsed, setCollapsed] = useState<string[]>([]);
	const [filters, setFilters] = useState({ terminal: true, browser: true, done: true, idle: false }),
		[grouping, setGrouping] = useState<'status' | 'agent' | 'none'>('status');
	const managedSnapshot = useSyncExternalStore(
		controller.workspace.subscribeManaged,
		controller.workspace.getManagedSnapshot,
	);
	const settings = useAgentSettings(controller.settings);
	const shown = state.tabs[state.groups.find((g) => g.id === state.activeGroupId)?.activeTabId ?? ''];
	const activePage = shown?.kind === 'page' ? shown : undefined;
	const grouped: Record<string, Exclude<WorkspaceTab, PageTabData>[]> = {};
	for (const tab of Object.values(state.tabs)) {
		if (tab.kind === 'page') continue;
		if (!(tab.customTitle || tab.title).toLocaleLowerCase().includes(query.toLocaleLowerCase())) continue;
		const bucket = sessionBucket(tab);
		if (bucket in filters && !filters[bucket as keyof typeof filters]) continue;
		const key =
			grouping === 'none'
				? 'all'
				: grouping === 'agent'
					? tab.kind === 'terminal'
						? (tab.agentId ?? 'terminal')
						: 'browser'
					: bucket;
		(grouped[key] ??= []).push(tab);
	}
	const order =
		grouping === 'status'
			? ['attention', 'working', 'done', 'unknown', 'idle', 'terminal', 'browser']
			: Object.keys(grouped);
	return (
		<aside
			className="huhu-ui flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground"
			aria-label={t('workbench.agent')}
		>
			<div className="flex h-9 shrink-0 items-center gap-2 px-3">
				<span className="flex-1 text-sm font-semibold">{t('workbench.agent')}</span>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label={t('agent.workspace.toggleSidebar')}
							onClick={togglePanel}
						>
							<PanelLeftClose className="size-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{t('agent.workspace.toggleSidebar')}</TooltipContent>
				</Tooltip>
			</div>
			{controller.spaces && (
				<SpaceNavigation
					spaces={controller.spaces}
					workspace={controller.workspace}
					confirm={confirm}
					select={(id) => controller.workspace.selectSpace(id)}
				/>
			)}
			<div className="flex flex-col gap-0.5 px-2 pt-2 pb-1">
				<button
					type="button"
					onClick={() => {
						chrome?.view?.setState({ jump: true });
						void controller.historyStore.refresh(false);
					}}
					className="group flex w-full items-center justify-start gap-2 rounded-md bg-foreground/5 px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-foreground/60 hover:bg-foreground/8"
				>
					<Search className="size-4 text-foreground/30" strokeWidth={1.75} />
					<span className="flex-1">{t('agent.search')}</span>
				</button>

				{(
					[
						{ key: 'board', page: 'board' },
						{ key: 'stats', page: 'usage' },
					] as const satisfies readonly { key: string; page: PageKind }[]
				)
					.filter((item) => !settings.hiddenNavigation.includes(item.key))
					.map((item) => {
						const Icon = PAGE_ICONS[item.page];
						const current = activePage?.page === item.page;
						return (
							<ContextMenu key={item.key}>
								<ContextMenuTrigger>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												aria-current={current ? 'page' : undefined}
												data-page-entry={item.page}
												onClick={() => controller.workspace.openPage(item.page)}
												className={cn(
													'flex w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-sidebar-foreground/60 hover:bg-sidebar-foreground/8 aria-disabled:opacity-50',
													current && 'bg-sidebar-accent text-sidebar-foreground',
												)}
											>
												<Icon
													className="size-4 text-sidebar-foreground/30"
													strokeWidth={1.75}
												/>
												{t(`agent.workspace.nav.${item.key}`)}
											</button>
										</TooltipTrigger>
										<TooltipContent>{t(`agent.workspace.nav.${item.key}`)}</TooltipContent>
									</Tooltip>
								</ContextMenuTrigger>
								<ContextMenuContent>
									<ContextMenuItem
										onSelect={() => {
											void controller.settings
												.update((d) => {
													d.hiddenNavigation = [...d.hiddenNavigation, item.key];
												})
												.catch((e) => controller.workspace.report(e));
										}}
									>
										{t('agent.workspace.hideNav')}
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu>
						);
					})}
			</div>
			<div className="flex items-center px-3 pt-3 pb-1">
				<span className="flex-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
					{t('agent.sessions')}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon-xs" aria-label={t('agent.workspace.filters')}>
							<ListFilter className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						{(Object.keys(filters) as (keyof typeof filters)[]).map((key) => (
							<DropdownMenuCheckboxItem
								key={key}
								checked={filters[key]}
								onCheckedChange={(value) => setFilters((f) => ({ ...f, [key]: value }))}
							>
								{t(`agent.workspace.show.${key}`)}
							</DropdownMenuCheckboxItem>
						))}
						{(['status', 'agent', 'none'] as const).map((key) => (
							<DropdownMenuCheckboxItem
								key={key}
								checked={grouping === key}
								onCheckedChange={() => setGrouping(key)}
							>
								{t(`agent.workspace.group.${key}`)}
							</DropdownMenuCheckboxItem>
						))}
						<DropdownMenuItem
							onSelect={() => {
								setFilters({ terminal: true, browser: true, done: true, idle: false });
								setGrouping('status');
								setQuery('');
							}}
						>
							{t('agent.workspace.resetFilters')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<NewTabMenu controller={controller} groupId={state.activeGroupId} />
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto pb-2">
				<AttentionSessions snapshot={managedSnapshot} query={query} />
				{controller.spaces && (
					<ManagedSessions
						spaces={controller.spaces}
						state={state}
						query={query}
						showShells={filters.terminal}
						snapshot={managedSnapshot}
					/>
				)}
				{order.map((key) =>
					grouped[key]?.length ? (
						<section key={key}>
							<button
								type="button"
								aria-expanded={!collapsed.includes(key)}
								className="flex w-full items-center gap-1 px-3 py-1 text-xs text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
								onClick={() =>
									setCollapsed((v) => (v.includes(key) ? v.filter((k) => k !== key) : [...v, key]))
								}
							>
								<ChevronDown className={cn('size-3', collapsed.includes(key) && '-rotate-90')} />
								{grouping === 'agent' && !['terminal', 'browser'].includes(key)
									? grouped[key][0]?.kind === 'terminal' &&
										controller.agentTitle(grouped[key][0].agentId!)
									: t(`agent.workspace.bucket.${key}`)}
								<span className="ml-auto">{grouped[key].length}</span>
							</button>
							{!collapsed.includes(key) &&
								grouped[key].map((tab) => (
									<SessionCard key={tab.id} tab={tab} managedSnapshot={managedSnapshot} />
								))}
						</section>
					) : null,
				)}
			</div>
		</aside>
	);
}
