// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/tab-bar/tab-bar-surface.tsx
import { SortableContext } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import type { TabGroup } from '../../core/workspace/model';
import { Button } from '../../../../ui/components/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../../../../ui/components/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { useT } from '../../../../ui/react/hooks';
import { useWorkspaceUI } from '../workspace/workspace-context';
import { WorkspaceTab } from './WorkspaceTab';
import { BrowserWorkspaceTab } from '../browser/BrowserWorkspaceTab';
import { QuickCommandsButton } from '../quick-commands/QuickCommandsButton';
import { NewTabMenu } from '../create/NewTabMenu';
export function TabStrip({ group }: { group: TabGroup }) {
	const { controller, close, chrome } = useWorkspaceUI(),
		state = controller.workspace.store.getState(),
		t = useT();
	const ref = useRef<HTMLDivElement>(null),
		[overflow, setOverflow] = useState(false);
	const { setNodeRef } = useDroppable({ id: `strip:${group.id}`, data: { groupId: group.id, kind: 'strip' } });
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const update = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
		const observer = new (
			el.ownerDocument.defaultView as Window & { ResizeObserver: typeof ResizeObserver }
		).ResizeObserver(update);
		observer.observe(el);
		update();
		return () => observer.disconnect();
	}, [group.tabIds.length]);
	useEffect(() => {
		ref.current
			?.querySelector<HTMLElement>('[data-active="true"]')
			?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}, [group.activeTabId]);
	return (
		<div
			ref={setNodeRef}
			className="@container/strip flex min-h-9 min-w-0 shrink-0 items-stretch border-b border-border bg-card"
			data-group-strip={group.id}
		>
			{overflow && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-xs"
							className="mx-0.5 my-auto"
							aria-label={t('agent.workspace.scrollLeft')}
							data-tab-scroll="left"
							onClick={() => ref.current?.scrollBy({ left: -180 })}
						>
							<ChevronLeft className="size-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{t('agent.workspace.scrollLeft')}</TooltipContent>
				</Tooltip>
			)}
			<SortableContext items={group.tabIds}>
				<div
					ref={ref}
					role="tablist"
					aria-label={t('agent.workspace.tabs')}
					className="terminal-tab-strip flex h-full min-w-0 max-w-full flex-1 items-stretch overflow-x-auto overflow-y-hidden border-r border-border/70"
					onPointerMove={(event) => {
						if (!event.buttons) return;
						const el = event.currentTarget,
							box = el.getBoundingClientRect();
						if (event.clientX < box.left + 24) el.scrollLeft -= 12;
						else if (event.clientX > box.right - 24) el.scrollLeft += 12;
					}}
				>
					{group.tabIds.map((id) => {
						const tab = state.tabs[id];
						return tab?.kind === 'browser' ? (
							<BrowserWorkspaceTab
								key={id}
								tab={tab}
								groupId={group.id}
								active={id === group.activeTabId}
							/>
						) : tab ? (
							<WorkspaceTab key={id} tab={tab} groupId={group.id} active={id === group.activeTabId} />
						) : null;
					})}
				</div>
			</SortableContext>
			{overflow && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-xs"
							className="mx-0.5 my-auto"
							aria-label={t('agent.workspace.scrollRight')}
							data-tab-scroll="right"
							onClick={() => ref.current?.scrollBy({ left: 180 })}
						>
							<ChevronRight className="size-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{t('agent.workspace.scrollRight')}</TooltipContent>
				</Tooltip>
			)}
			<NewTabMenu
				controller={controller}
				groupId={group.id}
				open={chrome ? chrome.menu === group.id : undefined}
				onOpenChange={chrome ? (open) => chrome.setMenu(open ? group.id : undefined) : undefined}
			/>

			<QuickCommandsButton controller={controller} groupId={group.id} />
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-xs"
						className="mx-1 my-auto size-8"
						aria-label={t('agent.workspace.groupMenu')}
					>
						<MoreHorizontal className="size-3.5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem onSelect={() => group.activeTabId && close(group.activeTabId)}>
						{t('agent.workspace.closeTab')}
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => {
							for (const id of group.tabIds) if (!state.tabs[id]?.pinned) close(id);
						}}
					>
						{t('agent.workspace.closeGroup')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
