import { useEffect, useState, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { Bell, Folder, MoreHorizontal, PanelLeft, PanelRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { useT } from '../../../../ui/react/hooks';
import { useWorkspaceUI } from './workspace-context';
import type { AgentController } from '../../services/controller';
import type { InboxMessageSummary, InboxRecipient } from '../../core/inbox/model';
import type { InboxService } from '../../services/inbox/service';

async function collectInboxPages(inbox: Pick<InboxService, 'listMessages'>, target: InboxRecipient): Promise<readonly InboxMessageSummary[]> {
	const rows: InboxMessageSummary[] = [];
	const seen = new Set<string>();
	let afterSequence = 0;
	let highWaterSequence: number | undefined;
	let generation: number | undefined;
	for (let page = 0; page < 4096; page += 1) {
		const result = await inbox.listMessages({ ...target, afterSequence: afterSequence || undefined, ...(highWaterSequence === undefined ? {} : { highWaterSequence, generation }), limit: 100 });
		if (highWaterSequence === undefined) {
			highWaterSequence = result.highWaterSequence;
			generation = result.generation;
		} else if (result.highWaterSequence !== highWaterSequence || result.generation !== generation) throw new Error('inbox-pagination-stale');
		for (const row of result.rows) {
			if (!seen.has(row.messageId)) {
				seen.add(row.messageId);
				rows.push(row);
			}
		}
		const next = result.nextSequence;
		if (next === undefined || next > highWaterSequence) break;
		if (next <= afterSequence) throw new Error('inbox-pagination-stalled');
		afterSequence = next;
	}
	return rows;
}

export function WorkspaceToolbar({ inboxUnread, onOpenTool }: { inboxUnread?: number; onOpenTool?: (tool: 'control' | 'inbox') => void } = {}) {
	const { controller, chrome } = useWorkspaceUI(),
		t = useT();
	const state = useStore(controller.spaces.store);
	const [observedUnread, setObservedUnread] = useState<number | undefined>(inboxUnread);
	useEffect(() => {
		if (typeof inboxUnread === 'number') return;
		const inbox = (controller as AgentController & { inbox?: InboxService }).inbox;
		const records = state.records as typeof state.records & { sessions?: Record<string, { id: string; spaceId: string }> };
		const sessions = Object.values(records.sessions ?? {});
		if (!inbox || !sessions.length) {
			queueMicrotask(() => setObservedUnread(inbox ? 0 : undefined));
			return;
		}
		let active = true;
		void Promise.all(sessions.map((session) => collectInboxPages(inbox, { spaceId: session.spaceId, sessionId: session.id })))
			.then((listed) => { if (active) setObservedUnread(listed.reduce((count, result) => count + result.filter((row) => !row.acked).length, 0)); })
			.catch(() => { if (active) setObservedUnread(undefined); });
		return () => { active = false; };
	}, [controller, inboxUnread, state]);
	const displayUnread = inboxUnread ?? observedUnread;
	const managed = useSyncExternalStore(
		controller.workspace.subscribeManaged,
		controller.workspace.getManagedSnapshot,
	);
	const space = state.records.spaces[state.records.selectedSpaceId ?? ''];
	const background = managed.sessions.filter(
		(row) =>
			!row.archived &&
			row.spaceId === space?.id &&
			(row.viewState === 'background' || row.viewState === 'detached'),
	).length;
	const title = state.loading
		? t('agent.spaces.loading')
		: state.error
			? t('agent.spaces.unavailable')
			: (space?.name ?? t('agent.spaces.noSpaces'));
	return (
		<header
			role="toolbar"
			aria-label={t('agent.workspace.toolbar')}
			data-workspace-toolbar=""
			className="huhu-workspace-toolbar flex min-h-11 min-w-0 shrink-0 items-center gap-1 border-b border-border bg-card px-1"
		>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={t('agent.workspace.toggleSidebar')}
				onClick={() => (chrome?.context.togglePanel ?? chrome?.context.openNavigation)?.()}
			>
				<PanelLeft className="size-4" />
			</Button>
			<Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			<div className="min-w-0 flex-1 px-1" title={space ? `${space.name}\n${space.id}` : title}>
				<p className="m-0 truncate text-xs font-medium" data-workspace-space-name="">
					{title}
				</p>
				{space && (
					<p className="m-0 truncate font-mono text-[10px] text-muted-foreground" data-workspace-space-id="">
						{space.id}
					</p>
				)}
			</div>
			{background > 0 && (
				<span className="huhu-workspace-background shrink-0 text-xs text-muted-foreground">
					{t('agent.workspace.backgroundCount', { count: background })}
				</span>
			)}
			{chrome && (
				<>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={t('agent.coordination.title')}
									aria-pressed={!!chrome.view?.getState().control && !chrome.view?.getState().history && chrome.view?.getState().agentTool === 'control'}
									onClick={() => {
										const state = chrome.view?.getState();
										if (state?.control && state.agentTool === 'control') chrome.view?.setState({ control: false, history: false });
										else chrome.view?.setState({ control: true, history: false, agentTool: 'control' });
										onOpenTool?.('control');
									}}
							>
								<SlidersHorizontal className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t('agent.coordination.title')}</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={t('agent.inbox.title')}
								aria-pressed={!!chrome.view?.getState().control && !chrome.view?.getState().history && chrome.view?.getState().agentTool === 'inbox'}
								onClick={() => {
									chrome.view?.setState({ control: true, history: false, agentTool: 'inbox' });
									onOpenTool?.('inbox');
								}}
							>
								<Bell className="size-4" />
								{typeof displayUnread === 'number' && displayUnread > 0 && <span aria-hidden="true" className="-ml-1 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">{displayUnread > 99 ? '99+' : displayUnread}</span>}
								{typeof displayUnread === 'number' && displayUnread > 0 && <span className="sr-only">{t('agent.inbox.unreadCount', { count: displayUnread })}</span>}
							</Button>
						</TooltipTrigger>
						<TooltipContent>{typeof displayUnread === 'number' && displayUnread > 0 ? t('agent.inbox.unreadCount', { count: displayUnread }) : t('agent.inbox.title')}</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={t('agent.history')}
								aria-pressed={!!chrome.view?.getState().history}
								onClick={() => chrome.view?.setState((s) => ({ history: !s.history, control: false }))}
							>
								<PanelRight className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t('agent.history')}</TooltipContent>
					</Tooltip>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={t('agent.workspace.pageMenu')}
						onClick={(event) => chrome.context.openPageMenu?.(event.nativeEvent)}
					>
						<MoreHorizontal className="size-4" />
					</Button>
				</>
			)}
		</header>
	);
}
