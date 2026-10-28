// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/tab-bar/SortableTab.tsx
import { useSortable } from '@dnd-kit/sortable';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { Globe, Loader2, X } from 'lucide-react';
import type { BrowserTabData } from '../../core/workspace/model';
import { useWorkspaceUI } from '../workspace/workspace-context';
import { useT } from '../../../../ui/react/hooks';
import { Button } from '../../../../ui/components/button';
import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from '../../../../ui/components/context-menu';
import { cn } from '../../../../ui/lib/utils';
export function BrowserWorkspaceTab({
	tab,
	groupId,
	active,
}: {
	tab: BrowserTabData;
	groupId: string;
	active: boolean;
}) {
	const { controller, close } = useWorkspaceUI(),
		workspace = controller.workspace,
		host = controller.browserWorkspace(),
		t = useT();
	const state = useSyncExternalStore(
		useCallback((listener) => host?.subscribe(listener) ?? (() => undefined), [host]),
		useCallback(() => host?.getState(), [host]),
	);
	const page = state?.spaces.find((space) => space.id === tab.spaceId)?.pages.find((page) => page.id === tab.pageId);
	const node = useRef<HTMLDivElement>(null);

	const {
		attributes,
		listeners,
		setNodeRef,
		isOver,
		active: dragged,
	} = useSortable({ id: tab.id, data: { groupId, kind: 'tab' } });
	const run = (promise: Promise<unknown> | undefined) => {
		void promise?.catch((error) => workspace.report(error));
	};
	const copy = (value: string) => run(node.current?.ownerDocument.defaultView?.navigator.clipboard?.writeText(value));
	const group = workspace.group(tab.id)!;
	const closeScope = (scope: 'others' | 'right') => {
		const index = group.tabIds.indexOf(tab.id);
		for (const [i, id] of group.tabIds.entries())
			if (id !== tab.id && (scope === 'others' || i > index) && !workspace.store.getState().tabs[id]?.pinned)
				close(id);
	};
	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div
						ref={(element) => {
							node.current = element;
							setNodeRef(element);
						}}
						{...attributes}
						{...listeners}
						role="tab"
						aria-selected={active}
						tabIndex={active ? 0 : -1}
						data-tab-id={tab.id}
						data-active={active}
						title={tab.customTitle || page?.title || tab.title || t('browser.newTab')}
						className={cn(
							'group relative flex h-full w-[180px] min-w-[72px] cursor-pointer select-none items-center gap-1.5 border-t border-r border-border px-1.5 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 xl:w-[220px]',
							active
								? 'bg-[color-mix(in_srgb,var(--foreground)_6%,var(--card))] text-foreground'
								: 'bg-card text-muted-foreground hover:text-foreground',
							isOver && dragged?.id !== tab.id && 'border-l-2 border-l-ring',
						)}
						onClick={() => workspace.activate(tab.id)}
						onAuxClick={(e) => {
							if (e.button === 1) {
								e.preventDefault();
								close(tab.id);
							}
						}}
						onMouseDown={(e) => {
							if (e.button === 1) e.preventDefault();
						}}
						onKeyDown={(e) => {
							const index = group.tabIds.indexOf(tab.id);
							if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
								e.preventDefault();
								e.stopPropagation();
								const id =
									group.tabIds[
										e.key === 'Home'
											? 0
											: e.key === 'End'
												? group.tabIds.length - 1
												: (index + (e.key === 'ArrowLeft' ? -1 : 1) + group.tabIds.length) %
													group.tabIds.length
									];
								if (id) {
									workspace.activate(id);
									e.currentTarget.parentElement
										?.querySelector<HTMLElement>(`[data-tab-id="${id}"]`)
										?.focus();
								}
							} else if (e.key === 'Delete') {
								e.preventDefault();
								close(tab.id);
							} else if (e.key === 'Enter') {
								e.preventDefault();
								workspace.activate(tab.id);
							}
						}}
					>
						{page?.status === 'pending' ? (
							<Loader2 className="size-4 shrink-0 animate-spin" />
						) : (
							<Globe className="size-4 shrink-0" />
						)}
						<span className="min-w-0 flex-1 truncate">
							{tab.customTitle || page?.title || tab.title || t('browser.newTab')}
						</span>
						<Button
							variant="ghost"
							size="icon-xs"
							className={cn(
								'size-4 rounded-sm',
								!active && 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
							)}
							aria-label={t('agent.workspace.closeTab')}
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								close(tab.id);
							}}
						>
							<X className="size-3" />
						</Button>
						{active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-foreground" />}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem disabled={!page} onSelect={() => run(controller.openBrowserWorkspace(tab))}>
						{t('agent.workspace.openBrowser')}
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!page?.url}
						onSelect={() => {
							if (page) copy(page.url);
						}}
					>
						{t('browser.copyUrl')}
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!page?.url}
						onSelect={() => {
							if (page) copy(`[${page.title}](${page.url})`);
						}}
					>
						{t('browser.copyMarkdown')}
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!page}
						onSelect={() =>
							run(workspace.newBrowser(undefined, { groupId, spaceId: tab.spaceId, pageId: tab.pageId }))
						}
					>
						{t('browser.duplicateTab')}
					</ContextMenuItem>
					<ContextMenuSeparator />
					{(['right', 'down'] as const).map((edge) => (
						<ContextMenuItem
							key={edge}
							disabled={workspace.store.getState().groups.length >= 4}
							onSelect={() => workspace.move(tab.id, { split: edge, ofGroupId: groupId })}
						>
							{t(`agent.workspace.split.${edge}`)}
						</ContextMenuItem>
					))}
					<ContextMenuSeparator />
					<ContextMenuItem onSelect={() => close(tab.id)}>{t('agent.workspace.closeTab')}</ContextMenuItem>
					{(['others', 'right'] as const).map((scope) => (
						<ContextMenuItem key={scope} onSelect={() => closeScope(scope)}>
							{t(`agent.workspace.close.${scope}`)}
						</ContextMenuItem>
					))}
				</ContextMenuContent>
			</ContextMenu>
		</>
	);
}
