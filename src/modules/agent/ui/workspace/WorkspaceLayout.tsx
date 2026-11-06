// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/tab-group/TabGroupSplitNodeTree.tsx, TabGroupPanel.tsx
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, pointerWithin, rectIntersection } from '@dnd-kit/core';
import type { GroupImperativeHandle } from 'react-resizable-panels';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '../../../../ui/components/resizable';
import { useStore } from 'zustand';
import { TerminalSquare } from 'lucide-react';
import type { GroupLayoutNode } from '../../core/workspace/model';
import { useVisible } from '../../../../ui/react/contexts';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import { cn } from '../../../../ui/lib/utils';
import { TabStrip } from '../tabs/TabStrip';
import { tabTitle } from '../tabs/tab-title';
import { PageTabView } from '../pages/PageTabView';
import { TerminalTabView } from '../terminal/TerminalTabView';
import { HiddenRendererRetention } from '../terminal/hidden-renderer-retention';
import { DropZones } from './DropZones';
import { useWorkspaceUI } from './workspace-context';
import { SpaceEmptyState } from '../create/SpaceEmptyState';
function Tree({
	node,
	path,
	dragging,
	retention,
	narrow,
}: {
	node: GroupLayoutNode;
	path: number[];
	dragging: boolean;
	retention: HiddenRendererRetention;
	narrow: boolean;
}) {
	const { controller } = useWorkspaceUI(),
		workspace = controller.workspace,
		state = useStore(workspace.store),
		visible = useVisible(),
		t = useT();
	const panel = useRef<GroupImperativeHandle>(null);
	useLayoutEffect(() => {
		if (node.kind !== 'split' || !panel.current) return;
		const current = panel.current.getLayout();
		if (node.sizes.some((size, index) => Math.abs(size - (current[`panel-${index}`] ?? 0)) > 0.1))
			panel.current.setLayout(Object.fromEntries(node.sizes.map((size, index) => [`panel-${index}`, size])));
	}, [node, narrow]);
	if (node.kind === 'group') {
		const group = state.groups.find((g) => g.id === node.groupId);
		if (!group) return null;
		return (
			<div
				className={cn(
					'flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden',
					state.groups.length > 1 && state.activeGroupId === group.id && 'ring-1 ring-inset ring-[var(--hu-accent)]/40',
				)}
				data-group-id={group.id}
				onPointerDown={() => {
					if (state.activeGroupId !== group.id && group.activeTabId) workspace.activate(group.activeTabId);
				}}
			>
				{visible && <TabStrip group={group} />}
				<div className="relative min-h-0 flex-1 overflow-hidden">
					{group.tabIds.map((id) => {
						const tab = state.tabs[id];
						if (!tab) return null;
						const active = group.activeTabId === id;
						return (
							<div
								key={id}
								className="absolute inset-0"
								hidden={!active}
								inert={!active}
								data-tab-content={id}
								role="tabpanel"
								aria-label={tabTitle(tab, t)}
							>
								{tab.kind === 'terminal' ? (
									<TerminalTabView tab={tab} active={active && visible} retention={retention} />
								) : (
									<PageTabView tab={tab} active={active && visible} />
								)}
							</div>
						);
					})}
					{dragging && <DropZones groupId={group.id} />}
				</div>
			</div>
		);
	}
	return (
		<ResizablePanelGroup
			groupRef={panel}
			orientation={!narrow && node.direction === 'row' ? 'horizontal' : 'vertical'}
			onLayoutChanged={(layout, meta) => {
				const sizes = node.children.map((_, index) => (meta.requestedLayout ?? layout)[`panel-${index}`] ?? 0);
				if (meta.isUserInteraction && sizes.some((n, i) => Math.abs(n - (node.sizes[i] ?? 0)) > 0.1))
					workspace.resize(path, sizes);
			}}
		>
			{node.children.map((child, i) => (
				<Fragment key={child.kind === 'group' ? child.groupId : `split-${i}`}>
					{i > 0 && (
						<ResizableHandle
							onDoubleClick={() =>
								workspace.resize(
									path,
									node.children.map(() => 100 / node.children.length),
								)
							}
						/>
					)}
					<ResizablePanel id={`panel-${i}`} minSize="15%" defaultSize={`${node.sizes[i]}%`}>
						<Tree
							node={child}
							path={[...path, i]}
							dragging={dragging}
							retention={retention}
							narrow={narrow}
						/>
					</ResizablePanel>
				</Fragment>
			))}
		</ResizablePanelGroup>
	);
}
export function WorkspaceLayout() {
	const t = useT();
	const { controller } = useWorkspaceUI(),
		workspace = controller.workspace,
		state = useStore(workspace.store);
	const [dragging, setDragging] = useState(false),
		[retention] = useState(() => new HiddenRendererRetention(2));
	const root = useRef<HTMLDivElement>(null),
		[narrow, setNarrow] = useState(false);
	const dragOwner = useRef<{ document?: Document; spaceId?: string; groupId?: string }>({});
	useLayoutEffect(() => {
		const el = root.current;
		if (!el) return;
		const update = () => {
			const width = el.getBoundingClientRect().width;
			if (width > 0) setNarrow(width < 600);
		};
		const observer = new (
			el.ownerDocument.defaultView as Window & { ResizeObserver: typeof ResizeObserver }
		).ResizeObserver(update);
		observer.observe(el);
		update();
		return () => observer.disconnect();
	}, []);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
	return (
		<DndContext
			sensors={sensors}
			collisionDetection={(args) => {
				const hits = pointerWithin(args);
				return hits.length ? hits : rectIntersection(args);
			}}
			onDragStart={({ active }) => {
				const id = String(active.id);
				dragOwner.current = {
					document: root.current?.ownerDocument,
					spaceId: controller.spaces?.store.getState().records.selectedSpaceId,
					groupId: workspace.group(id)?.id,
				};
				setDragging(true);
			}}
			onDragCancel={() => setDragging(false)}
			onDragEnd={({ active, over }) => {
				setDragging(false);
				if (!over) return;
				const data = over.data.current as
					{ kind?: string; groupId?: string; edge?: 'left' | 'right' | 'up' | 'down' | 'center' } | undefined;
				const group = state.groups.find((g) => g.id === data?.groupId);
				const tabId = String(active.id);
				if ((root.current?.ownerDocument !== dragOwner.current.document ||
					controller.spaces?.store.getState().records.selectedSpaceId !== dragOwner.current.spaceId ||
					(workspace.group(tabId) && workspace.group(tabId)?.id !== dragOwner.current.groupId))) {
					workspace.reportMoveRejection('target-changed');
					return;
				}
				if (!group) {
					if (data?.groupId) workspace.moveFromUI(tabId, { groupId: data.groupId, index: 0 });
					return;
				}
				workspace.moveFromUI(tabId, data?.edge && data.edge !== 'center'
					? { split: data.edge, ofGroupId: group.id }
					: { groupId: group.id, index: data?.kind === 'tab' ? group.tabIds.indexOf(String(over.id)) : group.tabIds.length });
			}}
		>
			<div ref={root} data-workspace-layout="" className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
				{state.layout ? (
					<Tree node={state.layout} path={[]} dragging={dragging} retention={retention} narrow={narrow} />
				) : (
					<div className="flex h-full w-full min-w-0 flex-col">
						<TabStrip group={{ id: 'empty', tabIds: [], recentTabIds: [] }} />
						{controller.spaces ? (
							<SpaceEmptyState spaces={controller.spaces} workspace={workspace} />
						) : (
							<EmptyState
								className="flex-1"
								icon={<TerminalSquare />}
								title={t('agent.workspace.empty')}
								description={t('agent.workspace.emptyHint')}
								action={
									<Button
										onClick={() => {
											void workspace.newTerminal().catch((error) => workspace.report(error));
										}}
									>
										{t('agent.workspace.newTerminal')}
									</Button>
								}
							/>
						)}
					</div>
				)}
			</div>
		</DndContext>
	);
}
